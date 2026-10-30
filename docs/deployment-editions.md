# Deployment editions: engineering model

Engineering doc for the deployment-editions model. One codebase ships as
several editions; an edition is a profile (a named set of capabilities), never
a fork. The security and key-custody posture of each configuration is in
`docs/editions.md`; this doc is about how the code is built to serve them.

| Part | Status |
|---|---|
| 1. Capability registry and the first call sites | BUILT |
| 2. Storage drivers (json, postgres) | PLANNED (next phase) |
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
