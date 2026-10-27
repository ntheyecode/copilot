# feat-app-plan-wow: progress (2026-10-27, Fable 5.1, UI/UX pass)

Branch: feat-app-plan-wow (worktree D:\RadarOps\wt-app), already merged with main at d13fca6.
Commits on top: 38a9167 (retire credits + wire WOW dashboard), a02d832 (render-verify
fixes), plus the final EN / notes commit. NOT pushed, NOT merged (Opus owns merges).

## What changed (signed-in app only; public marketing + workadmin untouched)
- src/pages/work/Dashboard.jsx: rewritten on the plan model. Sections, in order:
  co-brand strip, hello + plan line, admin note, PlanMeters ("Your plan at a
  glance", hidden while needsSub), TaskFlow on a first run (no session yet) else
  the Start-a-task hero, AI / add-time / gate notes, needsSub plan chooser
  (pricing.hoursMonthly + pricing.tasks, no hardcoded hours), MonthGraph (once
  there is a session), Resume list (not on first run), Outcomes (renders nothing
  until a task is ended), buddy + data protection, billing, delete modal.
- src/pages/work/WorkAppLayout.jsx: useT import restored (ReferenceError on every
  page before); comments de-credited.
- src/pages/work/workApp.css.js: old pill/popover/trade CSS deleted (planPill.css.js
  is the one owner); the 860px rule that hid the new ring removed; Buy hours
  short label from 1100px; at 480 the Windows-app link + Add time hide so Sign
  out never clips; list rows wrap at 480.
- src/pages/work/dash.css.js: metrics row + trade CSS removed (hero kept).
- src/pages/work/MonthGraph.jsx + monthGraph.css.js: measure effect runs once the
  plot mounts (SVG was stuck at 600px, CSS-scaled); svg sizing scoped to the plot.
- src/pages/work/PlanMeters.jsx + planMeters.css.js: sub lines wrap, never clip;
  pool-based member's second tile = "Used today" (was the pool twice).
- src/pages/work/PlanPill.jsx: face reads used/cap (matches pips + tile).
- src/pages/work/usageCopy.js (new): plan-model copy for the untranslated console
  + full guide (time left, tasks today, out-of-hours, low note) from planView.
- src/pages/work/Guiding.jsx: "out of minutes for today" / "Nm left" -> usageCopy.
- src/pages/WorkFullGuide.jsx: CreditChip, credits state, GET /api/work/credits,
  POST /api/work/credits/trade removed; top bar = plan hours left + tasks today.
- src/components/WorkBilling.jsx: pricing.hoursMonthly, "hours / month".
- EN (source of truth, finalized): en/workShell.js (plan.*, top.*, buy.*),
  en/workDashboard.js (meters.*, month.*, outcomes.*, flow.*, monthly plan /
  sub / buy copy; metrics.* retired), en/workStart.js (continueHint, parkedNote,
  setupAiLink). Key list for Opus: app-plan-wow-en-changes.json; raw parity
  output: app-plan-wow-i18n-gaps.txt.

## Credits economy: gone from the signed-in app
grep -rn "credits|trade|tasksPerExtraHour|dailyHours|minsLeft|taskCredits|CreditChip" src/
(excluding locales, public marketing pages, workadmin) leaves only: src/api.js
workBuyCredits (the top-up checkout endpoint /api/work/checkout/credits, still live
server-side) and the company credit-allocation API used by workadmin, plus comments
that say the mechanic is retired.

## Render-verify (SUPREME RULE XIV), live against api-seeded :4444 via vite dev :5195
Sign-in: curl login (password read from the seed env, never printed) -> session
cookie set on http://localhost:5195 (127.0.0.1 holds a stale HttpOnly cookie that
JS cannot replace; localhost is a separate cookie jar). Port 5193 is held by the
wt-site agent's vite, so this branch verifies on 5195 (launch.json entry
app-wow-5195 in D:\RadarOps\.claude\launch.json).
- solo_dev (individual, Basic, one active session): /work, /work/start,
  /work/session/ws10, /work/guide at 1280, 640, 375: scrollWidth <= innerWidth,
  no wrapped top-bar controls, no clipped (ellipsis) labels in the top bar, meters,
  month view, hero or session list. Screenshots: scratchpad render-verify/
  dashboard-1280-top.jpg + dashboard-1280-bottom.jpg.
- nw_admin (company admin, pool-based, no session): first-run TaskFlow + company
  pool meters at 1280, clean.
- DE spot-check at 640: layout clean; new keys fall back to English until Opus
  translates (expected).

## For Opus (after EN is final)
1. Translate the keys in app-plan-wow-en-changes.json into the 14 locales
   (scripts/i18n-apply-patch.mjs, one patch per locale, as on feat-admin-plan-wow).
2. Delete the retired keys listed there from every locale (workDashboard.metrics.*,
   plan.company/covered/free, sub.lead, buy.body).
3. Gates: check-jsx-imports (PASS now), locale-integrity (OK now), parity for
   workDashboard / workShell / workStart (fails until translated), npm run build.
4. Merge to main (no push here).

## Lessons captured (SUPREME RULE V)
- A missing named import of a hook (useT) is invisible to check-jsx-imports (it
  only covers JSX components) and to vite build; it is a runtime ReferenceError on
  every page. Gate idea for the next pass: an ESLint no-undef run over src/ in
  prebuild (no eslint config exists in this repo today).
- i18n keys referenced by new components were never added to EN; t() returns the
  raw key, so the wip "looked" built. The scratchpad script missing-keys.mjs
  (greps t('...') calls against the merged EN) caught 158 of them in seconds;
  worth promoting to scripts/ as a gate alongside check-locale-parity.
- Browser verification sign-in without handling the password: curl logs in from
  the shell (the secret stays in the env file), the session cookie is set on a
  host with an empty cookie jar (localhost, not 127.0.0.1, which held a stale
  HttpOnly cookie JS cannot replace). Port 5193 was taken by the wt-site agent's
  vite, so the app verified on 5195.
- A month-graph measure effect with [] deps ran before its element mounted and
  never re-ran: the SVG stayed at its default width and CSS scaled the text. Any
  measure effect must depend on the element's mount condition.
