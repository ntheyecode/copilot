# WorkCoPilot - Dependency Technical Document

Last updated: 2026-10-23. Scope: every third-party dependency in the WorkCoPilot
project (the web app + server, and the desktop shell), where each is used, and
why. This is a deliberately lean dependency set: the fewer moving parts, the
smaller the attack surface and the easier the audit.

The project has two package manifests:
- **Root** (`package.json`) - the web client (React SPA) and the Node/Express
  server that are built and deployed together.
- **Desktop** (`workcopilot/package.json`) - the Electron shell that wraps the
  live web console and adds the on-device features (overlay, screen read, offline
  document reading).

---

## 1. Root - runtime dependencies (client + server)

| Package | Version | Side | Where used | Why |
|---|---|---|---|---|
| `react` | ^18.3.1 | Client | all of `src/` | UI library for the single-page app. |
| `react-dom` | ^18.3.1 | Client | `src/main.jsx` | React's DOM renderer. |
| `react-router-dom` | ^6.26.0 | Client | `src/App.jsx` | Client-side routing for every page (`/work`, `/work/exec`, `/work/admin`, the public marketing pages, etc.). |
| `lucide-react` | ^0.427.0 | Client | across `src/pages/*`, `src/components/*` | Icon set. Tree-shaken, so only the icons actually imported ship. |
| `@fontsource-variable/inter` | ^5.0.18 | Client | `src/main.jsx` | Self-hosted Inter variable font (bundled, so no third-party font CDN call at runtime; good for privacy and offline). |
| `jspdf` | ^4.2.1 | Client | `src/pages/WorkExec.jsx` | Builds the executive dashboard PDF export. Lazy-imported only when the operator clicks Export, so it never weighs down first load. |
| `html2canvas` | ^1.4.1 | Client | `src/pages/WorkExec.jsx` | Captures the live dashboard to an image for the JPG export and as the PDF page image. Also lazy-imported on click. |
| `express` | ^4.19.2 | Server | `server/index.js` | The HTTP server: REST API + serving the built SPA from one origin. |
| `express-session` | ^1.18.0 | Server | `server/index.js`, `server/store.js` | Signed session cookies for sign-in (the only auth the standalone client uses). |
| `bcryptjs` | ^2.4.3 | Server | `server/index.js`, `server/store.js` | One-way password hashing. Pure-JS (no native build step), so it installs cleanly everywhere. |
| `stripe` | ^17.7.0 | Server | `server/billing.js` | Subscriptions, Checkout, Customer Portal and invoices. Card data goes to Stripe directly, never through our server (PCI scope stays with Stripe). Loaded on demand; a missing key returns a clear 503 rather than crashing. |
| `pdfkit` | ^0.19.1 | Server | `server/pdf.js` (session reports), `server/company_invoice.js` (invoices) | Server-side PDF generation for the session report and the billing invoice. |
| `mammoth` | ^1.12.1 | Server | `server/docs.js` | Extracts text from uploaded `.docx` documents so the plan can be grounded in the operator's own material. |
| `pdf-parse` | ^2.4.5 | Server | `server/docs.js` | Extracts text from uploaded PDFs for the same document-grounding path. |

## 2. Root - build-time (dev) dependencies

| Package | Version | Where used | Why |
|---|---|---|---|
| `vite` | ^5.4.0 | build (`npm run build` -> `dist/`) | Bundler/dev server for the React client. Produces the hashed assets in `dist/copilot-assets/`. |
| `@vitejs/plugin-react` | ^4.3.1 | `vite.config.*` | React (JSX + fast refresh) support for Vite. |

Node's built-in test runner (`node --test`) runs the suite in `server/*.test.mjs`
and `server/eval/*.test.mjs`; no third-party test framework is used.

## 3. Desktop shell (`workcopilot/`) - runtime dependencies

The desktop app is a thin Electron wrapper that loads the live web console
(`https://admireveda.com/work`) and adds the native/on-device capabilities.

| Package | Version | Where used | Why |
|---|---|---|---|
| `tesseract.js` | ^5.1.1 | `workcopilot/main.js` (+ the web path, see note) | On-device OCR for the screen-redaction privacy feature and for reading images/diagrams in documents - entirely on the user's machine, offline-capable. |
| `mammoth` | ^1.12.1 | desktop document reading | `.docx` text extraction on the device, so the original file never leaves the machine. |
| `pdf-parse` | ^2.4.5 | desktop document reading | PDF text extraction on the device, same privacy boundary. |
| `electron-updater` | ^6.3.9 | `workcopilot/main.js` | Signed auto-update against the generic update feed. |

## 4. Desktop shell - build-time (dev) dependencies

| Package | Version | Where used | Why |
|---|---|---|---|
| `electron` | ^30.0.0 | `npm start` / packaging | The desktop runtime (Chromium + Node). |
| `electron-builder` | ^24.0.0 | `npm run dist` | Builds the signed Windows NSIS installer (`WorkCoPilot-Setup.exe`). |

---

## Notes

- **On-device OCR, two delivery paths.** In the installed desktop app,
  `tesseract.js` is an npm dependency bundled with the app so OCR works offline.
  In the browser, the same on-device OCR is loaded at runtime from a CDN by
  `src/frame_scrub.js` (so it is not a root `package.json` dependency). Either
  way the recognition runs on the user's device; screen text is redacted locally
  before any frame is sent. This is the single piece of mechanism that is visible
  in client code, and it is the deliberate price of the "nothing leaves your
  device" guarantee (see `docs/business-rules.md`).
- **Privacy-by-dependency.** Document reading (`mammoth`, `pdf-parse`) runs on the
  device in the desktop app; only the governed, redacted text is used to plan,
  and the raw file never leaves the machine.
- **Payments.** `stripe` is the only path card data takes, and it never touches
  our server (PCI scope stays with Stripe). Billing degrades gracefully (a clear
  503) when no Stripe key is configured.
- **Lean by design.** No state-management library, no CSS framework, no chart
  library (the executive dashboard charts are hand-built inline SVG), no ORM (the
  store is a single JSON persistence layer). This keeps the bundle small, the
  audit surface narrow, and the offline story simple.
- **Supply-chain hygiene.** `npm audit` currently reports a small number of
  advisories in the transitive tree (as of 2026-10-23: a few moderate and one
  high, all transitive). None are in a runtime path that handles untrusted input
  on the server; they are tracked for a dependency bump. Run `npm audit` for the
  current list before each release and bump where a fix is available without a
  breaking change.
- **How to regenerate this list.** `node -e "const p=require('./package.json');
  console.log(p.dependencies, p.devDependencies)"` for the root, and the same
  against `workcopilot/package.json` for the desktop shell. Update this document
  whenever a dependency is added, removed, or its purpose changes.
