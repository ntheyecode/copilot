# Deployment editions: engineering model

Engineering doc for the deployment-editions model. One codebase ships as
several editions; an edition is a profile (a named set of capabilities), never
a fork. The security and key-custody posture of each configuration is in
`docs/editions.md`; this doc is about how the code is built to serve them.

| Part | Status |
|---|---|
| 1. Capability registry and the first call sites | BUILT |
| 2. Storage drivers (json, postgres) | BUILT (document-per-record first cut) |
| 3. Folder split | PLANNED |
| 4. On-prem and managed first-run setup | PLANNED |

---

## 1. Capability registry (BUILT)

**Single source:** `server/edition_registry.js`. Pure data and pure functions,
no Node or browser APIs. It lives in `server/` because the server deploy
copies `server/` and `dist/` only (`docs/WORKCOPILOT-HANDOFF.md`); a test fails
if any server module imports from outside `server/`.

**Active edition:** `server/edition.js` reads `WORK_EDITION` once at boot.

- Unset or empty means `all`, which turns on exactly what the product does
  today. With no config the server behaves as before.
- An unknown value stops the server with the list of valid editions. A typo
  never runs the server as a different edition.
- Call sites ask `caps.has('<capability>')`. `has()` throws on an id that is not
  in `CAPABILITIES`, so a misspelt capability fails loudly instead of reading as
  "off".
- The SPA learns the active edition from `GET /api/work/edition` (public,
  `{ edition, label, capabilities }`). No SPA code reads it yet (see "Not wired
  yet").

**Gates** (`server/edition.test.mjs`):

- Outside the two registry files and the tests, no line in `server/`, `src/`,
  `scripts/` or `workcopilot/` may mention `WORK_EDITION`, read `caps.edition`,
  call `makeCaps(`, or put the word "edition" next to a quoted edition id. The
  test also checks that the gate catches the shapes it exists for. It is a line
  scan, so code spread over several lines can still slip past it; review
  remains the second line of defense.
- The edition table below must match the registry.
- Server modules import nothing outside `server/`.

### Editions

| Edition | Who | Capabilities on |
|---|---|---|
| `all` (default) | solo users + SaaS companies, hosted | solo_signup, saas_companies, stripe_billing, platform_ai, brain_export, brain_query, public_site |
| `saas` | SaaS companies only, hosted | saas_companies, stripe_billing, platform_ai, brain_export, brain_query, public_site |
| `paid` | paying individuals only, hosted | solo_signup, paid_only, stripe_billing, platform_ai, public_site |
| `onprem` | the customer's own servers | single_company, offline_licensing, onprem_setup, ai_custody_customer, brain_export, brain_query, external_db |
| `managed` | a dedicated install we operate in the customer's cloud | single_company, onprem_setup, platform_ai, ai_custody_customer, brain_export, brain_query, external_db |

Mutually exclusive pairs, checked when the registry loads: `saas_companies` with
`single_company`, and `stripe_billing` with `offline_licensing`.

**Why `managed` is its own edition and not `onprem`.** Two real differences:
our cloud AI serves a managed install (`platform_ai`, billed at usage, matching
the "Managed $149 flat + AI at usage" price), while on-prem uses the customer's
own provider keys; and a managed install is invoiced by us, while on-prem is
activated by an offline license (`offline_licensing`). Both are single-company,
both run the first-run setup, both can sit on the customer's database.

**For the owner to confirm.**

- "Paying users only" is read as individual accounts on a paid plan, with no
  company tenants and no free tier. If it should also allow paying companies,
  add `saas_companies` to `paid` (one line).
- `solo_signup` gates SELF-service sign-up only. A superadmin can still create a
  standalone individual account by hand in every edition, and company admins
  still add their own users. Say if `saas` / `onprem` should refuse that too.

### Wired call sites (enforced today)

| Capability | Where | Behavior when off |
|---|---|---|
| `solo_signup` | `POST /api/work/signup` (index.js), `POST /api/work/onboarding/signup` (onboarding.js), first-time social sign-in (`resolveSocialAccount`, onboarding.js) | 403 `{ error, signupDisabled: true }` from `soloSignupRefusal()`, nothing created. Existing accounts still sign in. |
| `saas_companies` / `single_company` | `POST /api/work/admin/companies` (work-admin.js) via `companyCreationRefusal()` | `single_company`: the first company is created, a second gets 409 `{ singleCompany: true }`. Neither: 403 `{ companiesDisabled: true }`. |
| `stripe_billing` | `cfg()` in billing.js; `GET /api/work/admin/billing` | Every Stripe path takes its existing "not configured" branch and no Stripe call is made, even with keys in the env or the store. The superadmin billing panel response carries `offByEdition: true` and an `offReason`. |

### Not wired yet (defined in the registry, not enforced)

These capabilities exist so editions can be described completely, but setting
`WORK_EDITION=paid` or `onprem` today does not yet change these behaviors:

1. **SPA**: read `GET /api/work/edition` once at boot; hide Sign up, pricing and
   checkout when `solo_signup` / `stripe_billing` are off; hide the marketing
   routes when `public_site` is off; show `offReason` in the billing panel. The
   server already refuses sign-up and company creation, so for those this is
   presentation; for `public_site` the server side is item 3.
2. **`paid_only`**: the subscription gate (`requireWorkSubscription`) enforces a
   plan only once Stripe is configured, so `paid` still has the free tier.
   Under `paid_only` it should always enforce it, with an actionable "billing
   is not set up yet" message for the operator.
3. **`public_site`**: the "validate it live" lead endpoints and the prerendered
   marketing pages are still served in every edition.
4. **`platform_ai`** (refuse platform AI providers where it is off) and
   **`ai_custody_customer`** (default new companies to company AI and
   customer-held brain custody): part of the first-run setup (planned).
5. **`brain_export` / `brain_query`**: the brain is company-only, so editions
   without companies cannot reach these routes anyway. Gate them explicitly
   when an edition first needs them off with companies on.
6. **`offline_licensing`**: no license check exists yet; `onprem` has no
   subscription or license gate today (planned with the first-run setup).
7. `store.getBillingPublic().annualReady` reads `db.billing` directly; route it
   through billing.js `cfg()` so it reads false where `stripe_billing` is off.

---

## 2. Storage drivers (BUILT, first cut)

The store keeps its in-memory `db` object exactly as before. Only the step that
turns it into bytes goes through a driver (`server/storage/`), at the two places
`server/store.js` already had: `load()` at boot and `persist()` after a change.
Every module that receives `db` through a factory is untouched.

### Driver contract

Every driver implements `load()` (the stored snapshot, or null when nothing is
stored yet; throws, never reseeds, when stored data cannot be read),
`save(snapshot)` (atomic; returns once durable, or throws), `migrate()`,
`status()` (nothing secret) and `close()`. One contract test
(`server/storage/driver_contract.test.mjs`) runs the same assertions against
every driver.

| Driver | Select with | Where the data lives | Atomic save |
|---|---|---|---|
| `json` (default) | nothing, or `WORK_DB_DRIVER=json` | `<WORK_DATA_DIR>/db.json`, the same bytes as before | temp file + fsync + rename (the original code, moved) |
| `postgres` | `WORK_DB_DRIVER=postgres` + `WORK_DB_URL` | the `workcopilot` schema (or `WORK_DB_SCHEMA`) of any PostgreSQL | one transaction per save |

The postgres driver serves all three customer choices; only the connection
string differs: PostgreSQL installed on their own box, a database we provision
in the cloud for them, or their own external database.

### Why PostgreSQL via `pg`, and no SQLite driver

- `pg` 8.23.1 (latest stable on 2026-10-30, `npm view pg version`), the standard
  maintained Node client, pure JavaScript (no native build on Windows or
  Linux). `npm audit`: 0 vulnerabilities, production and full tree.
- One SQL dialect, one migration set and one test path for local, provisioned
  and external databases.
- SQLite was weighed for the local case. `node:sqlite` is built in but still
  experimental in Node 24 (it prints an ExperimentalWarning), and
  `better-sqlite3` is a native addon to build on every target. The local case
  is served by PostgreSQL on the customer's box instead; the driver contract
  leaves room for an embedded driver once `node:sqlite` is stable.
- Test only: `@electric-sql/pglite` 0.5.13 and `@electric-sql/pglite-socket`
  0.2.16 (devDependencies, latest on 2026-10-30). PGlite is PostgreSQL compiled
  to WebAssembly, served over the normal wire protocol, so the tests run the
  production `pg` client against a real PostgreSQL with nothing to install.
  PGlite is one backend shared by every connection, so the advisory-lock
  refusal of a second server is tested only when `WORK_TEST_PG_URL` points at a
  real PostgreSQL (the whole contract suite then also runs there).
- `pg` is loaded only by the postgres worker, on demand. A json-driver server
  never loads it.

### How it stays synchronous

`persist()` is synchronous and every caller relies on "returned means durable".
The pg client is asynchronous, so it runs in a worker thread
(`postgres_worker.js`) and the main thread waits on a shared flag
(`sync_bridge.js`, the technique synckit and esbuild use). The cost: the event
loop pauses for each database round trip, as it pauses today for the db.json
write and fsync. A timed-out call poisons the bridge so nothing writes on top of
an unknown state; the server must be restarted.

### Layout: document per record (first cut)

`doc_layout.js` stores each top-level collection as a row in `wcp_collections`
and each member as a row in `wcp_records (collection, rid, pos, doc json)`:
one row per array element (keyed by its `id`), per object key, or per value.
`pos` keeps order, so a load returns exactly the object that was saved, key
order included. `doc` is `json`, not `jsonb`, because `json` keeps the text as
written (jsonb reorders keys and rejects `\u0000`). Each save writes only the
rows that changed since the last load or save. A key that a text column cannot
hold (U+0000, a lone surrogate) is stored as `~json:` plus its JSON encoding,
and an own `__proto__` key stays an own key.

What a normalized schema would add later (not built): typed columns and foreign
keys per entity (users, companies, sessions), indexes for reporting queries,
row-level writes instead of a whole-snapshot diff, and several server processes
writing at once. This first cut keeps the single-writer model the store
already has.

### Safety

- **Single writer.** The server's connection holds a session advisory lock on
  the schema for its whole life; a second server, or a `db:migrate` /
  `db:import` run, against the same schema is refused. Every save also checks
  and bumps a revision in `wcp_meta`, so even without the lock (a dropped
  connection, a pooler in transaction mode) a stale writer gets
  `WCP_REVISION_CONFLICT` and writes nothing.
- **A lost commit answer heals itself.** Each save records this process's
  writer id. If the connection drops after COMMIT reached the database but
  before the answer came back, the next save sees its own writer id, re-reads
  what the database holds and diffs again, instead of reporting "another
  writer" until a restart.
- **No silent fallback.** If the database is unreachable, the TLS settings are
  wrong, or the schema is not deployed, the server refuses to start with the
  reason and the fix. It never falls back to db.json.
- **The URL cannot override what was configured.** The pg client copies every
  `?parameter` over the connection (`?host=` changes the server, `?ssl=0` turns
  TLS off), so only `sslmode` and `application_name` are accepted and anything
  else is refused. TLS is set with `WORK_DB_SSL` and `WORK_DB_SSL_CA`;
  `sslmode` in the URL is read in any letter case (`prefer` and `allow` count
  as `require`: no plaintext fallback).
- **No secrets in messages.** Every message shows the connection string with
  the password masked. A password the URL parser would split (an unencoded
  `#`, `?` or `/`) is refused with how to percent-encode it.
- **Least privilege at runtime.** Only `db:migrate` runs DDL. The server, and
  `db:status` / `db:export`, only read and write the three tables, so the
  runtime database role needs no CREATE right.
- **A crashed database worker is reported at once,** with its reason, not
  after the operation timeout.
- **Encryption at rest is unchanged.** The store encrypts secrets
  (`enc:v1:`) on a disk-only clone before any driver sees it, so the database
  holds ciphertext, exactly like db.json. The master key stays
  `WORK_ENC_KEY` or `<WORK_DATA_DIR>/.enc.key`, for both drivers. An unchanged
  secret keeps its stored ciphertext across saves (the value already stored is
  written back, never a new encryption under a reused IV), so a save does not
  rewrite every record that holds a key. Each stored ciphertext serves one
  field only, so two fields with the same secret still differ on disk. This is
  the one byte-level difference in db.json for the default driver: unchanged
  secrets no longer get a fresh ciphertext on every save. The format is the
  same.
- **Files stay on disk.** Screenshots, workflow frames, reference docs and the
  Company Brain store remain under `WORK_DATA_DIR` (already encrypted with the
  same key). The postgres driver moves the store document only; a blob storage
  adapter is a separate later step.

### Settings

| Variable | Meaning | Default |
|---|---|---|
| `WORK_DB_DRIVER` | `json` or `postgres` | `json` |
| `WORK_DB_URL` | `postgres://user:password@host:5432/dbname` | none (required for postgres) |
| `WORK_DB_SSL` | `disable`, `require` (encrypt, no certificate check) or `verify-full` | the URL's `sslmode`, else `disable` for localhost and `verify-full` for any other host |
| `WORK_DB_SSL_CA` | path to a PEM CA bundle for `verify-full` | system CAs |
| `WORK_DB_SCHEMA` | schema holding the tables | `workcopilot` |
| `WORK_DB_TIMEOUT_MS` / `WORK_DB_CONNECT_TIMEOUT_MS` | per-operation / connect timeout | 30000 / 15000 |
| `WORK_DB_AUTO_MIGRATE` | `1` = apply pending migrations at start | off: the server refuses and says to run `db:migrate` |

There is one connection, not a pool: writes are serialized by design and that
connection holds the single-writer lock. A pool comes with the first concurrent
read path (for example reporting queries). A save that changed something costs
up to seven round trips on that connection (BEGIN, revision check, up to five
writes, COMMIT); a save that changed nothing sends nothing. Positions that
shift (an insert at the front of a list) are updated without re-sending the
documents.

### Operations

```
npm run db:migrate                          deploy or upgrade all tables (idempotent)
npm run db:status                           driver, target, schema version, row counts
npm run db:import -- --from <db.json>       one-time move of an existing store; refuses a non-empty target without --replace
npm run db:export -- --to <db.json>         write the database back out as db.json (rollback or portability)
```

`db:migrate` and `db:import` need the server stopped (they take the
single-writer lock); `db:status` and `db:export` only read one consistent
snapshot and work while it runs. The CLI lives in `server/storage/cli.js` so it
ships with the server. Import
reads the database back and compares it with the file before reporting success;
an export of an import is byte-identical to the source. Secrets are copied as
ciphertext, so the server that reads the database needs the same master key as
the server that wrote the db.json.

**Moving an existing server to PostgreSQL:** stop the server, set the
`WORK_DB_*` variables, `npm run db:migrate`, `npm run db:import -- --from
<data dir>/db.json`, start the server. Rollback: stop, `npm run db:export`,
unset `WORK_DB_DRIVER`, start.

