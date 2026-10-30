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
