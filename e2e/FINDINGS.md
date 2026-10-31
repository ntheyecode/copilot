# E2E findings

Bugs the end-to-end suite found, with the root cause and the fix. Each fix is at
the mechanism level and carries its own unit or regression test, so the class
cannot come back unnoticed even when the E2E suite is not run.

## 1. A session in use never expired on the server

- **Scenario:** `specs/auth.spec.mjs` › session lifetime › a session expires 8 hours after sign-in, server side.
- **Symptom:** a user who made one request 7 hours after signing in was still signed in at 8 h 1 min (and would stay signed in indefinitely as long as they made a request at least once every 8 hours). The browser cookie expires at 8 h, but a copied cookie value kept working server side.
- **Root cause:** `FileSessionStore` stored the live `req.session` object in `db.sessions` (`server/store.js` `setSessionRecord`) and handed the same object back on read. express-session calls `req.session.touch()` on every request, which resets the cookie's `expires` to now + 8 h on that shared object, so the stored record's expiry slid forward in memory on every request, contrary to the documented rule "maxAge is fixed at login, not extended on activity".
- **Fix:** the store keeps and returns snapshots (a JSON copy) of a session record, like every serializing session store, so nothing a request does to its session object reaches the stored record unless express-session saves it.
- **Regression gate:** `server/session_store_snapshot.test.mjs` (red before the fix, green after): the stored expiry does not move with activity, a record read from the store cannot change the stored one, and a past expiry signs the session out.
- **Commit:** 07eb80b.

## 2. Raw `**bold**` markup in the Workflow issues inbox and the integration API

- **Scenario:** `specs/run-workflow.spec.mjs` › an employee runs a published workflow, a deviation alerts the right people, the trainer adopts the step.
- **Symptom:** the incident row read "Step 1 · Step 1: Open the Credit notes tab and choose \*\*New\*\*." The same text was returned by `GET /api/v1/incidents`.
- **Root cause:** when a published workflow runs, each session step's text marks the control to use in `**bold**` (Guide's convention, `workflow_playback.stepText`). The watch route recorded that session text as the incident's `stepText` verbatim, and both output shapes passed it through. Four other server modules each kept their own copy of the "strip the markers" regex, so there was no shared rule to reach for.
- **Fix:** one module, `server/guide_markup.js` (`stripGuideMarkup`). The incident is stored with plain step text, and both output shapes (the console list and the v1 `incidents` shape) clean it too, so records saved before the fix read clean. The four hand-rolled copies (`workflow_deviation`, `workflow_playback`, `workflow_step_reader`, `workflows_rules`) now call the shared rule.
- **Regression gate:** `server/workflow_incidents.test.mjs` (stored and listed plain, including a legacy record), `server/guide_markup.test.mjs` (the rule, the v1 shape, and a gate that no other server module hand-rolls the regex).
- **Commit:** c3e2149.

## 3. English left on translated screens (guided step card, buddy picker, company console)

- **Scenario:** `specs/i18n.spec.mjs` › key screens show no raw keys and no English in German, Japanese and Arabic.
- **Symptom:** in de, ja and ar the guided session read "Step 1 of 3", "Mark done" and "Your plan"; the dashboard's buddy picker read "Surprise (a random pet)" and "WorkCoPilot buddy (Dog)"; the company console overview read "AI source not selected yet (choose platform or company keys)."
- **Root cause:** literals typed into components where the build gate (`scripts/check-hardcoded-strings.mjs`) cannot see them: JSX text followed by an expression (`Step {n}`), English default props (`doneLabel = 'Mark done'`, `kicker = 'Your plan'`), a template-literal `aria-label`, label lookups from an English map (`CHARACTER_LABELS`), and an English sentence built on the server (`aiReason`) that the console printed as is.
- **Fix:** keyed every string (`stepCard.stepOf/stepN/confirmed/markDone/yourPlan/collapse`, `buddyPicker.surprise/buddyAria/characters.*`, `companyAdmin.overview.aiReason.*`) and translated them into all 14 full locales (en-GB inherits). The buddy names now come from the catalog only (the English `CHARACTER_LABELS` map is gone). The server sends `aiReasonCode` beside `aiReason`, so the console words it in the reader's language and API readers keep the English text.
- **Regression gate:** the E2E i18n spec itself (renders each key screen in en, de, ja, ar and fails on any identical English phrase or raw key); locale-parity and hardcoded-strings gates green. The wider class (about 45 more literals the gate cannot see) is handled as a separate change that also hardens the gate; see below.

## 4. Dark mode did not reach the standalone consoles

- **Scenario:** `specs/layout.spec.mjs` › no sideways scroll and the theme applies, light and dark, 1280 and 640.
- **Symptom:** with Dark chosen in Preferences, the dashboard was dark but the Teach studio, Workflow issues, executive, company admin and superadmin consoles rendered light (`data-theme="light"`).
- **Root cause:** `setInProduct(true)` (which lets the user's theme mode paint) was called only by the `/work` shell (`WorkAppLayout`). The standalone consoles are sibling routes outside that shell, so they always fell back to the public-site light theme, although their `.wka` styles already support dark.
- **Fix:** one route-level `src/theme/ProductThemeScope.jsx` wraps the `/work` shell and every standalone signed-in console in `src/App.jsx`; the shell no longer makes its own call. The buddy and full-screen guide windows stay outside it (they follow their own surface scheme). Checked by rendering the consoles dark at 1280 and 640.
- **Regression gate:** `src/theme/product_scope.test.mjs` (every signed-in console route sits inside the scope, buddy and guide stay out, and nothing else turns product theming on) plus the E2E layout spec.
- **No sideways scroll** was found on any role's key screen at 1280 or 640, light or dark.
