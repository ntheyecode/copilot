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
