# Deployment editions: engineering model

Engineering doc for the deployment-editions model. One codebase ships as
several editions; an edition is a profile (a named set of capabilities), never
a fork. The security and key-custody posture of each configuration is in
`docs/editions.md`; this doc is about how the code is built to serve them.

| Part | Status |
|---|---|
| 1. Capability registry and the first call sites | BUILT |
| 2. Storage drivers (json, postgres) | BUILT (document-per-record first cut) |
| 3. Folder split | BUILT (minimal: editions/ + build/ composer); full move PLANNED |
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

---

## 3. Folder split (BUILT: minimal version; full move PLANNED)

### What was done

The minimal version: an `editions/` folder and a `build/` composer, with the
shared code left where it is.

```
editions/
  <id>/manifest.json   per edition: { edition, env defaults, notes }. Only what
                       differs and is not a capability (capabilities stay in
                       server/edition_registry.js). Today: onprem and managed
                       default WORK_DB_AUTO_MIGRATE=1, so an upgrade migrates the
                       schema at start; the hosted editions have no defaults.
  profile.js           reads and validates a manifest; the operator's own
                       environment always wins over a manifest default; a
                       WORK_EDITION that disagrees with the edition being started
                       stops the start.
  start.mjs            node editions/start.mjs <edition>: apply the profile, then
                       start server/index.js exactly as node server/index.js does.
build/
  compose.js / .mjs    npm run compose -- --edition <id> --out <folder> [--no-spa]
  import_check.js      the one import scanner (the composer and the deploy gate)
```

`npm run compose` assembles an installable folder for one edition:

- **Server:** the files git tracks under `server/` (so an untracked data copy,
  `.env`, key or model file next to the code never ships), minus tests, test
  helpers, `server/data`, the eval corpus, dotfiles and `db.json*` / `*.env` /
  `*.pem` / `*.key` / `*.log` / `*.tmp` / `ai-seed.json`. (When the license
  check of section 4 needs our public key on disk, embed it in a JS module or
  allow-list it here; a `.pem` would otherwise be left out.) The generated
  `server/eval/results/*-public.json` are added, because the public benchmark
  page reads them.
- **SPA:** the built `dist/` (run `npm run build` first, or `--no-spa`).
- **Edition:** `editions/start.mjs`, `profile.js` and only that edition's folder.
- **Install:** `package.json` + lockfile for `npm ci --omit=dev`.
- **`ship-manifest.json`:** edition, capabilities, commit plus a `dirty` flag
  when the working tree has uncommitted changes, the start command, and every
  file with its size and sha256.

Before anything is written, every relative import of every shipped module
must name a shipped file with exact letter case (a Windows build must also
start on Linux), and every package it imports must be a production
dependency. Imports with a computed name (`import(name)`) and files read at
runtime are not seen by this check; today those are the brain embedder (it
has a fallback), `docs/business-claims-audit.json` (claims report, empty when
absent, as on today's hosted deploy) and `downloads/` (desktop installers,
copied separately as today).

The bundle is built in a staging folder and moved into place only when it is
complete; the previous bundle is moved aside first and moved back if the swap
fails, so a failed run never loses it. `--replace` only replaces a folder that
is an earlier bundle and holds nothing but the files its `ship-manifest.json`
lists (plus `node_modules`). A bundle is a build artifact: a folder holding
anything else, such as the `server/data` of an installed and started server,
is never replaced. Upgrade an installation from a fresh bundle instead. A
filesystem root, the repository or a folder above it, and any repository
folder outside `out/` are refused.

This is the start of replacing the hand-typed tar list in
`docs/WORKCOPILOT-HANDOFF.md`; the hosted deploy itself is unchanged
(`node server/index.js` is the `all` edition).

Gates: every registry edition has exactly one folder with a valid manifest;
`node editions/start.mjs onprem` from the repository, and a composed `onprem`
bundle started from its own folder, must each answer `GET /api/work/edition`
as onprem; each edition composes; the composer's refusals (paths, imports,
packages, missing build or lockfile) each have a test.

### Why not the full `shared/` move in this pass

The target layout moves nearly all code under `shared/` (server core, SPA,
brain, roles, workflows). It was not done now because it is not mechanical and
safe today:

1. **Deploy.** The hosted deploy copies `server/` and `dist/` by hand. A
   `shared/` folder the server imports from would deploy and then fail to
   start (the phase 1 review caught exactly this). The move has to land
   together with switching the deploy to `npm run compose`.
2. **Parallel work.** Two other branches are editing `server/store.js` and
   `server/index.js` right now. Moving the trees (about 250 server modules
   and tests, 440 SPA files) would turn each of their merges into a conflict
   on every touched file.
3. **Paths in code.** `server/index.js` resolves `dist/` and `downloads/`
   relative to the repo root, the brain model lives in `server/models/`, the
   Vite config, the prebuild gates, the test globs and the Electron app
   (`workcopilot/`) all name today's paths.

### Full move plan (one dedicated pass, after those branches merge)

1. Switch the hosted deploy to `npm run compose -- --edition all`, extract the
   bundle on the server, `npm ci --omit=dev`, start with
   `node editions/start.mjs all`. Run one deploy this way with no move, so
   the new path is proven before anything moves.
2. Freeze merges for the move window. `git mv server shared/server` and
   `git mv src shared/web` (history kept); `index.html`, `vite.config.js` and
   `public/` follow the SPA.
3. Update the path constants that point at the repo root
   (`server/index.js` `ROOT`/`DIST`/`downloads`, `brain_model` model path,
   the data-dir default), the npm scripts, the test globs, the prebuild gate
   scripts, and the composer's source paths.
4. Relative imports inside each moved tree do not change. SPA files that
   import `server/` modules (`src/scrub.js`, `src/frame_scrub.js`,
   `src/components/AnswerBody.jsx`, `src/pages/WorkMarketing.jsx`,
   `src/pages/WorkSecurity.jsx`, `src/pages/work/Guiding.jsx` and the
   `src/shared` tests) keep the same relative depth under `shared/`. The
   imports that cross from outside into `server/` DO change:
   `editions/profile.js`, `editions/start.mjs`, `build/compose.js` and its
   test import `../server/...`, and `server/edition.test.mjs` imports
   `../build/import_check.js`.
5. Gates: the full suite, the prebuild gates, `npm run compose` for every
   edition, a boot of each composed bundle, and the import-resolution check.
   Then one hosted deploy through the composer.
6. Edition-only code (routes, pages, config that only one edition has) then
   goes under `editions/<id>/`, registered through a hook the shared server
   calls with the active capabilities. None exists yet.

