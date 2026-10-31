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

## 5. A signed-out visitor to the Teach studio was told to ask for the trainer grant

- **Scenario:** `specs/invented.spec.mjs` › a member removed from the company mid-session is signed out at once; `specs/auth.spec.mjs` › a signed-out visitor to any console is sent to sign in.
- **Symptom:** after a member was removed from their company (session ended server side), opening `/work/teach` showed "The Teach studio is for trainers ... Ask them to add it" instead of the sign-in page. The `/work` shell redirected correctly; the standalone consoles did not.
- **Root cause:** every standalone console (Teach studio, Workflow issues, executive, company, admin) re-checked `/api/work/me` on its own and treated "nobody signed in" like "signed in without access", each in its own way. Only the `/work` shell redirected to sign-in.
- **Fix:** one route-level `src/components/RequireSignIn.jsx` (reads the app-wide auth context) wraps the `/work` shell and every standalone console in `src/App.jsx` and sends a signed-out visitor to `/workcopilot`. `/work/launch` stays outside on purpose (it parks the launch token first), as do the desktop buddy and full-guide windows (they say "sign in on the main window").
- **Regression gate:** `src/theme/product_scope.test.mjs` (every console inside `RequireSignIn`, launch/buddy/guide outside) and the two E2E tests above.

## 6. Two tabs on one workflow draft: the stale save silently erased the newer one

- **Scenario:** `specs/invented.spec.mjs` › two tabs editing the same draft (API) and two tabs in the browser.
- **Symptom:** tab A saved a rewritten step; tab B, still showing the older copy, saved an unrelated change and the server applied B's whole (stale) step list over A's work, with no warning. Same for a co-author, or an incident step adopted into the draft while the trainer had it open.
- **Root cause:** `PATCH /api/work/workflows/:id` replaced the step list with no version check (last write wins). `version` is the release number inside a workflow group, not a lock.
- **Fix:** the editor sends `baseUpdatedAt` (the `updatedAt` it loaded); `workflows_store.updateWorkflow` refuses a save whose base is not the current version with 409 and the code `WORKFLOW_CHANGED`, and the wizard says so in the reader's language (`teach.wizard.errChanged`, 14 locales) and keeps the trainer's form. The wizard moves its base forward after each of its own saves and after each step-read response (a read stores its suggestion on the draft), so its own reader never trips the check. A caller that sends no base (integration use) keeps the old behaviour. `sendWorkError` now passes a deliberate 4xx error's machine `code` to the client (it used to drop it, which sibling sessions had flagged too).
- **Regression gate:** `server/workflows_store.test.mjs` (stale refused, current applies, no base unchanged) and the two E2E tests; the record + read-steps E2E still passes.

## 7. About 120 more English strings the build gate could not see

- **Scenario:** follow-up of #3: a probe of the gate's blind spots across `src/`.
- **Symptom:** English on translated screens in the guided console's answer card ("Continue guiding", "Continue with the updated plan", "Back to step 2."), the destructive-command warning, the reading strip, compose and result cards (Copy, Download, confidence bands), the download menu, guide level options, policy and security notes, the full-screen guide, the overlay title bar, the sign-up agreement sentence and others.
- **Root cause:** `scripts/check-hardcoded-strings.mjs` only saw JSX text between two tags and literal `title`/`aria-label`/`placeholder`/`alt` attributes.
- **Fix:** the gate gained four rules (JSX text next to an expression, template-literal attributes, English defaults or literals for label-like props and fields, English prose in strings) that skip code by shape, never by allowlisting text, with a built-in self-test fixture; no allowlist entry was added. Every literal it found was keyed (122 keys) and translated into the 14 full locales; agreement lists use `Intl.ListFormat`. Planner context text that is data, not copy, moved to `src/pages/work/plannerContext.js` unchanged.
- **Left as is (needs a server change):** `DestructiveGate` wraps a free-text reason from `server/work.js` (11 fixed English phrases); the sentence around it is keyed. Sending a reason code would let those phrases be translated too.
- **Regression gate:** the hardened gate in `npm run prebuild` (with its self-test), plus `specs/i18n.spec.mjs`.

## 8. A unit test that failed on the 31st of the month

- **Scenario:** `npm test` run at UTC midnight into Oct 31.
- **Symptom:** `server/plan_allowance.test.mjs` › month end: carry forward ... failed only on the 31st.
- **Root cause:** the test built "last month" with `setUTCMonth(month - 1)` on today's date; on the 31st that overflows into the current month. The product's own period math starts from day 1 and is not affected.
- **Fix:** the test sets day 1 before stepping back a month.

## 9. Two unit tests that failed by chance

- **Scenario:** repeated `npm test` runs during this work.
- **Symptom:** `server/api_v1_http.test.mjs` failed now and then: "secret never listed" and the tenant-isolation leak check ("14").
- **Root cause:** both checked a short fragment as a raw substring of a JSON body. The API key secret is base64url and can contain `_`, so `split('_').pop()` sometimes returned a 1 to 3 character tail; company B's workflow id is a short number ("14") that a timestamp can contain.
- **Fix:** the test extracts the whole secret with the key's format, and matches B's id as an `"id":"..."` value. 8 of 8 repeated runs green.

## 10. The organizations site told company members to buy top-up time

- **Scenario:** `specs/editions.spec.mjs` › saas: no personal plan, price, sign-up or upgrade path on any public or member screen (after merging the editions branch).
- **Symptom:** on the saas (organizations only) edition, a company member's Help page read "Purchased top-up time never expires ..." and "Need more now? Use Add time ...", although no personal plan or top-up is sold there. Company members on the `all` edition read the same lines although their hours come from the company.
- **Root cause:** the build gate's audience scan listed `helpPage.time` as hidden for organizations ("help section for personal accounts"), but `Help.jsx` renders that section for every viewer. The exemption described an intent the page did not implement, so the gate passed while the screen showed the copy.
- **Fix:** the two purchase lines moved to their own key, `helpPage.time.buyItems` (each locale's existing translations reused, 14 locales), which `Help.jsx` appends only for a personal account where personal plans are sold (`useEditionView().individualPlans`); the pause and reset lines stay for everyone. The scan's exemption now names exactly `helpPage.time.buyItems`, so the rest of the section is scanned again.
- **Regression gate:** `specs/editions.spec.mjs` scans the RENDERED public and member screens with the same audience rules the build gate applies to the catalogs, so an exemption that does not match what renders fails; `specs/help.spec.mjs` checks company members never read the top-up lines and personal accounts still do.

## 11. A step lost its screenshot reading when two steps shared one screenshot

- **Scenario:** `specs/teach.spec.mjs` › record a demonstration, read each step against its screenshot, use a suggestion (failed once in a full run; the recording's timing decides whether two steps share a frame). The test now marks one step with no screen change, so the case happens on every run.
- **Symptom:** after "Read steps" and "Use suggestion", saving the draft returned step 1 with `reading: null` (the trainer's suggestion vanished), or with the next step's reading.
- **Root cause:** `server/workflows_rules.js` `carryReadings` kept readings in a map keyed by screenshot only. A recording can give two steps the same screenshot; the second step's reading overwrote the first's in the map, so the first step either lost its reading (the after-screen check failed) or received the wrong one.
- **Fix:** a reading belongs to its step: matched by step id with the same screenshot; the screenshot alone is used only for a step whose id is new and whose screenshot no previous step shared.
- **Regression gate:** `server/workflows_rules.test.mjs` (shared screenshot keeps both readings; a step never borrows another step's reading; a unique screenshot still carries for a re-keyed step), red before the fix; and the E2E recording test asserts no reading is lost and that the recording really has two steps on one screenshot.

## No skipped tests

Every test runs in every edition. Where an edition does not offer a flow, the same test checks that edition's contract instead (`support/edition-branch.mjs`): company features on `paid` are refused by the API (403 `companiesDisabled`) and their pages return to `/work`; personal accounts on `saas` cannot be created or bought. Where the scenario exists for a person, `paid` runs it for real (`support/paid-scenarios.mjs`): an account disabled mid-session, a 100-step plan, a double click on Begin guiding, Back in the start wizard, one personal account against another's sessions. Each such run carries an `edition` annotation in the report saying what it checked.
