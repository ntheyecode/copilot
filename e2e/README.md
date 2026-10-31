# WorkCoPilot end-to-end suite

Playwright drives the real product: the real server (`server/index.js`), the
built SPA (`dist/`) in Chromium, and the real desktop overlay (`workcopilot/`)
through Electron. Nothing in the product is changed or stubbed for tests; the
fakes sit at the network boundary.

## Run it

```bash
npm run build
```

```bash
npm run e2e
```

Other entry points:

```bash
npm run e2e:web
```

```bash
npm run e2e:floater
```

```bash
npx playwright test -c e2e/playwright.config.mjs --project=saas specs/teach.spec.mjs
```

- The desktop overlay needs its own dependencies once: `npm ci --prefix workcopilot`.
- Browsers: `npx playwright install chromium` once per machine.
- Results: `.e2e-results/` (list output, `results.json`, an HTML report, and a trace for every failure: `npx playwright show-trace <trace.zip>`).
- Parallelism: 6 workers by default (`E2E_WORKERS=n` to change). The floater project always runs one test at a time because it drives real windows.
- `E2E_KEEP_DATA=1` keeps each worker's temp data folder (and its `server.log`) for debugging.
- It is kept out of `npm test`, so unit runs stay fast.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Server per worker | `support/server.mjs`, `support/boot/server-child.mjs` | Forks the real server in a child process with a fresh temp `WORK_DATA_DIR`, `PORT=0` (the OS picks a free port), the edition from the project (`all`, `saas`, `paid`), and the product's own `ai-seed.json` pointing the platform AI at provider `openai`. |
| Fake AI | `support/boot/fake-ai.mjs`, `responders.mjs` | An OpenAI-compatible server. Each call is classified by the product's own prompt markers (plan, watch, ask, result, scope, project map, step read, summary) and answered deterministically. Tests script answers per call (`ai.script`) and read every call back (`ai.calls`) to prove which AI fired. |
| Network boundary | `support/boot/net-fakes.mjs` | In the server process: `fetch` to every provider host (taken from `server/ai.js` PROVIDERS) goes to the fake AI; webhook `https.request` and its c-ares DNS go to a local receiver; anything else is refused and recorded. Every test fails if the server tried to reach a real host. |
| Browser boundary | `pages/browser-egress.mjs` | The SPA's on-demand OCR engine (tesseract.js at the version in `src/shared/ocr_engine.js`, used to mask recorded screenshots; `specs/ocr-masking.spec.mjs` checks on the pixels that a card number is blacked out) is served from the repo's local copy; any other third-party request from the browser fails the test. |
| Webhook receiver | `support/boot/webhook-receiver.mjs` | Records deliveries (headers, body, signature); can be switched "down" (503) to drive retries and dead-lettering. |
| Fake clock | `support/boot/clock.mjs` | Moves the server's `Date` forward (`clock.advance`) to exercise expiry rules for real: the 8 h session, API key grace and expiry, SLA risks, webhook retry backoff. Reset before every test. |
| Seeding | `support/boot/ctl.mjs` | Each test seeds its own tenant through the product's exported store calls: a company with admin, executive, PM, Sr PM, GRC, member (mixed flow), worker and trainer, or a solo user. |
| Edition stamp | `pages/edition-stamp.mjs` | A deployed edition serves an SPA shell stamped with its capabilities; for non-default editions the test browser gets the same `stampShell` transform on every HTML document, so the first paint is the edition's, as in production. |
| Editions | `support/editions.mjs`, `support/edition-branch.mjs`, `support/paid-scenarios.mjs` | Expectations come from `server/edition_registry.js` (one source). Nothing is skipped: a flow an edition does not offer is checked as refused (API 403 with the edition's flag) and hidden (its pages return to `/work`), and on `paid` the invented scenarios run their personal-account version (account disabled mid-session, 100-step plan, double click, wizard Back, cross-account). |
| Synthetic screen | `pages/browser-prep.mjs` | `getDisplayMedia` returns a canvas stream (`captureStream`) of a fake app; `window.__e2eScreen.act()` changes it once, like a person clicking, so the watch loop and the recorder run their real code. |
| Page objects | `pages/*.mjs` | One per surface: login, shell, start task, guiding, PM pages, Teach studio, company admin, legal gate. |
| Desktop overlay | `floater/desktop-app.mjs` | Launches `workcopilot/` with Electron and a throwaway user-data folder; reads Win32 state (WS_EX_TOPMOST, WS_EX_TRANSPARENT, WS_EX_LAYERED, display affinity) through PowerShell P/Invoke. |

## Scenarios

| Spec | Covers |
|---|---|
| `specs/auth.spec.mjs` | edition capabilities; sign-in per role and landing page; language pick on first sign-in; consent gate; wrong password; signed-out visitors sent to sign in; self sign-up and company tenants per edition; sign-out; 8 h server-side expiry; one live session per account |
| `specs/mfa.spec.mjs` | hosted server with MFA: enrollment, code, backup code once, step-up for API key creation and export passphrase replacement, the login page's code gate |
| `specs/guided-task.spec.mjs` | start a task, plan from the shared screen, watch loop advancing, a flag, ask, end, report.txt and report.pdf |
| `specs/projects.spec.mjs` | PM creates and assigns, worker starts from the queue, worker cannot self-start, Sr PM moves project and task, GRC risks (held, idle, SLA after 6 days) and read-only, role matrix |
| `specs/teach.spec.mjs` | wizard authoring, publish, revise, retire, delete; required fields; author matrix; record a demonstration; import a real WebM recording; read steps and use a suggestion |
| `specs/run-workflow.spec.mjs` | an employee runs a published workflow, a deviation raises an incident, alert routing per role, viewers cannot act, the trainer adopts the step into a draft; executive issues card |
| `specs/exec.spec.mjs` | executive dashboard and drill-downs; Company Brain export with the passphrase; admin and PM refused |
| `specs/company-admin.spec.mjs` | trainer grant; API keys created in the console, scopes on /api/v1, revoke; signed webhook delivery; launch link |
| `specs/superadmin.spec.mjs` | companies and users consoles; AI usage ledger; admin routes refused to others |
| `specs/editions.spec.mjs` | saas: every personal plan and sign-up route refused (route lists from `server/edition_route_gates.js`, original and mixed case, signed in and anonymous) and no personal plan, price, sign-up or upgrade wording on any rendered public or member screen; paid: every company route family refused (mixed case too), no company wording on rendered screens, company pages do not open; all: both open, as before |
| `specs/help.spec.mjs` | each role sees exactly its help entries; personal accounts never see Teach, Company workflows, Workflow issues or Executive; company members never read top-up lines; callouts are in the tab order, reachable with Tab and pinned with Enter; no overflow at 1280/640 and no raw keys in en, de, ar |
| `editions-boot/boot.spec.mjs` | onprem and managed: boot as the edition, one company only, no self sign-up, superadmin and member sign in through the login page |
| `specs/i18n.spec.mjs` | key screens in German, Japanese and Arabic: no raw keys, no English left, Arabic right to left |
| `specs/layout.spec.mjs` | every role's key screens at 1280 and 640, light and dark: no sideways scroll, theme applied |
| `specs/invented.spec.mjs` | two tabs on one draft (API and browser); network drop while saving a recording; expired API key; member removed mid-session; workflow deleted while running; a 100-step workflow; double-clicks on Publish and Run; Back in the wizard; webhook endpoint down until dead-letter; cross-tenant attempts by key and by session |
| `floater/floater.spec.mjs` | launch and load, sign-in kept across restarts, content protection, always on top, opacity, click-through, the shell's own screen capture, a guided task in the overlay |

## Not automated, and why

- **A real screen-share picker, a real microphone and real call audio** in the browser: Chromium cannot answer the OS picker or a live microphone from automation. The suite injects a synthetic screen and runs recording without narration; the server-side transcription path is covered by unit tests.
- **The desktop overlay's global hotkeys** (Ctrl+Shift+Alt+W/O/S/T/H): they are registered system-wide; pressing them from a test would act on whatever the person at this PC is doing. The same actions are driven through the overlay's own IPC (what the title-bar buttons call) and verified at the Win32 level.
- **Content protection against a real screen recorder**: verified as the OS state Windows uses for it (`WDA_EXCLUDEFROMCAPTURE`), not by recording the screen.
- **Click-through with a real mouse**: verified as `WS_EX_TRANSPARENT` on the window; the suite does not move the person's cursor.
- **Stripe, email delivery and SSO providers**: Stripe is off (no keys), emails go to the dev sink file, SSO needs a provider tenant.
