# Public Content Classification Register (audit IP-10)

This is the IP-10 publication-classification register for WorkCoPilot. It lists every page, route and file that can be reached without signing in, plus the signed-in application routes for contrast, and assigns each a classification, an owner and a review cadence.

Rules:

1. Anything not listed here is not approved for public exposure.
2. Any NEW public page, route or file MUST be added to this register BEFORE launch, with sign-off from both **Product** (purpose, accuracy, wording) and **Legal** (rights, third-party content, and any compliance, security or accuracy claims).
3. Public content must follow `docs/business-rules.md`: no build-enabling or implementation detail, no model or provider names, no cost information, and no claims of certification or guarantees we cannot substantiate. State what the product guarantees, not how it is built.
4. Review each row at its stated cadence and on any material product change. Update the Notes column when a review changes the wording or claims.

Classification key:

- **Public marketing** - promotional or explanatory content for prospects.
- **Public legal** - terms, policies and notices that carry legal weight.
- **Public media** - images, video and other static assets served to anonymous visitors.
- **Authenticated-only** - requires a signed-in account; must never be reachable anonymously.
- **Internal** - not for publication; must not be served publicly.

Owner is a placeholder ("Product") until named owners are assigned.

## Register

| Path | Classification | Owner | Review cadence | Notes |
|---|---|---|---|---|
| `/` (homepage) | Public marketing | Product | Quarterly | Signed-out visitors see the marketing home page; signed-in users are redirected to their console, so the redirect targets are Authenticated-only. Hero copy is superadmin-editable (`GET /api/work/hero`), so edits need the same review. |
| `/demo` | Public marketing | Product | Quarterly | Scripted demo. No login, no AI, all canned content. Must not show real customer data. |
| `/workcopilot` | Public marketing | Product | Quarterly | Branded sign-in entry page. Same component as `/workcopilot/login`. |
| `/workcopilot/login` | Public marketing | Product | Quarterly | Sign-in page. Must not reveal whether an account exists. Excluded from sitemap by design. |
| `/workcopilot/use-cases` | Public marketing | Product | Quarterly | Use-case claims must match shipped capability. |
| `/workcopilot/security` | Public marketing | Product | Quarterly (and after any security change) | Security claims need Legal review. Describe guarantees only, no certification claims unless actually held, no build-enabling detail. |
| `/workcopilot/privacy` | Public legal | Product | Semi-annual (Legal co-owner) | Privacy policy. Update on any change to data collection, retention or sub-processors. |
| `/workcopilot/disclaimer` | Public legal | Product | Semi-annual (Legal co-owner) | "Not professional advice" disclaimer. |
| `/workcopilot/terms` | Public legal | Product | Semi-annual (Legal co-owner) | Terms of service. |
| `/workcopilot/acceptable-use` | Public legal | Product | Semi-annual (Legal co-owner) | Acceptable use policy. |
| `/workcopilot/dpa` | Public legal | Product | Semi-annual (Legal co-owner) | Data processing addendum. Keep consistent with privacy policy and security paper. |
| `/workcopilot/refund` | Public legal | Product | Semi-annual (Legal co-owner) | Refund policy. Keep consistent with billing behavior. |
| `/workcopilot/benchmark` | Public marketing | Product | Quarterly (and on every benchmark run) | Accuracy scoreboard. Publish only operator-measured results; no unverified figures. Not currently in `sitemap.xml`. |
| `/workcopilot/how-it-works` | Public marketing | Product | Quarterly | Capability overview. Describe outcomes, not internals. |
| `/workcopilot/fields` | Public marketing | Product | Quarterly | Professions and disciplines supported. Must match the shipped discipline list. |
| `/workcopilot/pricing` | Public marketing | Product | Monthly | Prices, plans, daily limits and overage must match billing configuration. No cost-of-AI or margin information. |
| `/workcopilot/faq` | Public marketing | Product | Quarterly | Answers must stay consistent with the legal pages and security page. |
| `/api/work/security-paper.pdf` | Public legal | Product | Quarterly (and after any security change) | Public route that streams the security and privacy paper inline. Registered ahead of the `/api` catch-all. Legal review required. |
| `/WorkCoPilot-Security-and-Privacy.pdf` | Public legal | Product | Quarterly (and after any security change) | Static copy of the same paper shipped in `public/`. Must stay byte-identical to the file served by the API route. |
| `/robots.txt` | Public marketing | Product | Annual | Allows `/`; disallows `/api/`, `/work/`, `/app/`, `/meet/`, `/viva/`, `/solver/`, `/floater/`. Not an access control, only crawler guidance. |
| `/sitemap.xml` | Public marketing | Product | Per release | Must list every indexable public page above. Currently omits `/demo` and `/workcopilot/benchmark`; confirm intent at next review. |
| `/og-image.png` | Public media | Product | Annual | Social share image. Confirm image rights. |
| `/hero-aurora.jpg` | Public media | Product | Annual | Hero background. Confirm image rights. |
| `/hero-aurora.mp4` | Public media | Product | Annual | Hero background video. Confirm media rights. |
| `/people-focus.jpg` | Public media | Product | Annual | People imagery. Confirm model and image rights; no identifiable real customers without written consent. |
| `/people-done.jpg` | Public media | Product | Annual | People imagery. Same rights note as above. |
| `/people-focus.mp4` | Public media | Product | Annual | People video. Same rights note as above. |
| `/ent-focus.webp` | Public media | Product | Annual | Enterprise section imagery. Confirm image rights. |
| `/ent-team.webp` | Public media | Product | Annual | Enterprise section imagery. Confirm image rights. |
| `/card-texture-dark.png` | Public media | Product | Annual | Decorative texture. |
| `/card-wash-light.jpg` | Public media | Product | Annual | Decorative background. |
| `/buddies/bot.jpg` | Public media | Product | Annual | Buddy avatar (default, neutral). Avatars follow the standing inclusive-character rule: identical dignified rendering, representative spread. |
| `/buddies/cat.jpg` | Public media | Product | Annual | Buddy avatar. |
| `/buddies/dog.jpg` | Public media | Product | Annual | Buddy avatar. |
| `/buddies/fox.jpg` | Public media | Product | Annual | Buddy avatar. |
| `/buddies/man.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/buddies/woman.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/buddies/mateo.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/buddies/maya.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/buddies/ria.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/buddies/sami.jpg` | Public media | Product | Annual | Buddy avatar (person). Confirm image rights. |
| `/work` | Authenticated-only | Product | Per release | The application console. Requires a signed-in account. |
| `/work/buddy` | Authenticated-only | Product | Per release | Desktop buddy overlay window. Requires a signed-in account. |
| `/work/guide` | Authenticated-only | Product | Per release | Full-screen read-only guide (second monitor). Requires a signed-in account. |
| `/work/exec` | Authenticated-only | Product | Per release | Executive productivity dashboard. Requires the executive role, scoped to the user's own company. |
| `/work/company` | Authenticated-only | Product | Per release | Company admin console. Requires the company admin role, scoped to the admin's own company. |
| `/work/admin` | Authenticated-only | Product | Per release | Platform admin console. Requires admin or superadmin. Never publish screenshots containing customer data. |
| `/api/*` (all other routes) | Authenticated-only | Product | Per release | Data API. Each route enforces its own session and role checks; unknown routes return a JSON 404. Pre-login endpoints that the public pages call (sign-in, sign-up, the hero text and benchmark data) are anonymous by necessity and carry no private data; any NEW anonymous API route must be added to this register before launch, like any other public item. |
| `*` (any unknown path) | Public marketing | Product | Annual | Redirects to `/`. Adds no content of its own. |
| `docs/` (source documents, audits, playbooks, specs) | Internal | Product | Per release | Repository documentation. Not served by the web app. Only the generated security paper PDF is published, via the two rows above. |

## Change log

| Date | Change | Approved by (Product / Legal) |
|---|---|---|
| 2026-10-23 | Initial register created from `src/App.jsx` routes and the `public/` directory. | Pending |
