# WorkCoPilot — project handoff / onboarding

Paste this as the first message (or copy into `CLAUDE.md`) in a fresh
WorkCoPilot-only project. This project is ONLY WorkCoPilot — ignore any other
product. The GitHub link and a PAT are provided separately.

## What it is
A read-only, screen-aware expert guide. The user gives a goal; it plans an
ordered checklist, then WATCHES their screen (or a phone camera) and tells them
the exact next step, one at a time, confirming each on screen before advancing.
It never clicks/types/runs anything. Works for any task in any field (cloud,
firewalls, DevOps, coding, accounting, legal, etc.) and any app — web, installed
desktop apps, on-prem consoles at a local address, custom tools. Hosted at
**admireveda.com** (routes: `/work` app, `/workcopilot` login, `/demo` +
marketing, `/work/admin` superadmin, `/work/buddy` desktop buddy window).

## Stack & layout
- **Server**: Express (ESM), Node 20, systemd service `workcopilot` on **:4000**,
  root `/opt/workcopilot`, DB `/var/lib/workcopilot/db.json` (JSON file store).
  Key files: `server/index.js` (routes + AI runtime resolution), `server/store.js`
  (all state), `server/work.js` (all the AI prompts: plan/watch/scope/coverage/
  deliverables), `server/work-admin.js`, `server/work-docs.js`, `server/docs.js`
  (pdf/docx/txt extract), `server/model-prices.js`, `server/compliance-presets.js`,
  `server/work-scrub.js` (DLP: scrub + tokenize).
- **Client**: React + Vite SPA in `src/`. Big files: `src/pages/WorkPage.jsx`
  (the `/work` app — Home/dashboard, the `Console` guiding panel, `FloatPanel`
  PiP, `ScopeWizard`, `DocsAttach`, `HelpDocs`), `src/pages/WorkMarketing.jsx`
  (/demo marketing + "Is it covered?" coverage chat), `src/pages/WorkLogin.jsx`,
  `src/pages/WorkTeam.jsx` (company-admin Team), `src/pages/workadmin/*`
  (superadmin console), `src/workShell.jsx` (desktop Fluent title bar),
  `src/api.js`, `src/scrub.js` (client-side governance), `src/theme.jsx`
  (light/dark via `[data-theme]` on documentElement).
- **Desktop app**: `workcopilot/` — Electron, currently **v1.0.3**. Frameless
  always-on-top overlay that LOADS the hosted `/work` (so the whole UI is the
  renderer served from the web build; only `main.js`/`preload.js`/`ocr-lang/`
  ship in the installer). Features: plan↔guide↔buddy window modes, content-
  protection (hidden from screen share), on-device OCR (tesseract.js, eng data
  bundled offline, ships `asar:false`), on-device doc extraction, multi-monitor
  IPC. Signed with the COE Security cert (software cert, SHA1
  71D78BF55B844DCEEC51ED85DD664BD617C5C71D) + **DigiCert** rfc3161 timestamp.

## Repo & deploy (PAT + git link provided separately)
- Repo: **github.com/ntheyecode/copilot**, branch `main`. Deploy is **direct
  tar-over-ssh, NOT git** (push is backup only).
- Server: **admireveda.com = 54.166.40.58**, key `admireveda.pem`, user `ubuntu`.
  Files in `/opt/workcopilot` are root-owned → extract as root.
- **Web deploy**: `npm run build` (vite, ~4s) then:
  `tar -cf - dist | ssh -i KEY ubuntu@54.166.40.58 'cd /opt/workcopilot && sudo tar -xmf - --overwrite'`
  (same for `server/`), then clear stale hashed assets
  (`sudo find /opt/workcopilot/dist/copilot-assets -name 'index-*.js' ! -name '<new>' -delete`)
  and `sudo systemctl restart workcopilot`. `nginx` serves /work,/workcopilot,/demo
  from dist and proxies the rest to :4000.
- **Since 2026-10-31 admireveda.com runs the `saas` edition** (organizations
  only): `WORK_EDITION=saas` is set in the systemd drop-in
  `/etc/systemd/system/workcopilot.service.d/edition.conf`, and the site must
  be stamped for it before upload (`npm run build:harden && npm run stamp:spa
  -- --edition saas --origin https://admireveda.com`). The release that day
  went: backup (db.json copy beside it + code and node_modules under
  `/opt/wc-rollback/<UTC timestamp>/`), upload to `/opt/wc-stage`, `npm ci
  --omit=dev` there on the server's Node, a boot test on a spare port with a
  temp data dir, then stop, swap server/dist/editions/node_modules/package
  files, start, and check `GET /api/work/edition`. Rollback: copy those folders
  back from `/opt/wc-rollback/<ts>/`, remove the drop-in, daemon-reload, start.
- **Desktop build**: in `workcopilot/`: `npm install` then `npm run dist` →
  signed NSIS installer in `release-workcopilot/` (no PIN — software cert).
  Publish: copy `WorkCoPilot-Setup.exe` + `.blockmap` + `latest.yml` to
  `/opt/workcopilot/work-updates/` (electron-updater feed) and the exe to
  `/opt/workcopilot/downloads/` (dashboard download; `/api/work/app/desktop` is
  login-gated). Bump `workcopilot/package.json` version to push an auto-update;
  verify the deployed exe's sha512 == `latest.yml`.

## DB / seeding discipline (IMPORTANT)
- NEVER `import` `store.js` for ad-hoc DB edits (its import runs load+seed+persist
  and can mutate prod). For one-off edits: `sudo systemctl stop workcopilot`,
  edit `/var/lib/workcopilot/db.json` with a standalone node script (no store.js
  import), `sudo chown refigold:refigold` + `chmod 600` the file, then start.
- There's a seeded premium test user: **`premiumtest` / `Premium#2026`** (comp
  access). The seed landmine class-fix gates seeds on freshInstall.

## Working conventions
- **Build-review-wait**: syntax-check every changed file (`node --check` for
  server; `npx vite build` for the client) BEFORE declaring done; builds are the
  gate. Don't degrade functionality with a fix.
- **Update the marketing site (`WorkMarketing.jsx`) whenever a feature ships** —
  reflect new security/compliance/intelligence capabilities there and in the
  "Is it covered?" coverage chat.
- **Honesty on compliance**: always say "controls and audit evidence that
  support your compliance" — NEVER "makes you HIPAA/SOC 2/… compliant or
  certified". Supported framework chips: GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001,
  CCPA, FedRAMP, NIST 800-53, HITRUST.
- **Privacy model**: desktop reads files/diagrams/screens ON-DEVICE (OCR
  included) — the raw file never leaves; governance (scrub/tokenize) runs
  on-device; only governed text transits to the model (platform keys, per-company
  corporate keys we set, or the company's own keys). The AI itself is remote, so
  never claim "nothing leaves the computer" — claim "the file never leaves; only
  governed, minimized text reaches the model".
- **Commit attribution**: end commit messages with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Current state (as of this handoff)
Web is fully current. Desktop is **1.0.3** (OCR + window modes + monitor-in-
wizard), signed and on the auto-update feed. Guiding panel + title bar are on a
Fluent-blue design. Per-company AI keys + per-company consumption are wired
(superadmin sets corporate keys in Admin→Companies; company admins set their own
in Team→AI keys; runtime prefers company keys). Re-plan is a modal (reason +
keep-progress/from-start), Ask accepts pasted errors/API responses, End shows a
summary modal, Pause/Resume controls everything (no "Watch me"), completed steps
collapse, steps carry done-timestamps, deletion requires a reason (logged to the
company activity log).

Start by reading `server/index.js`, `server/store.js`, and
`src/pages/WorkPage.jsx` to orient. Ask for the git link and PAT, then confirm
the working tree matches the deployed state before changing anything.
