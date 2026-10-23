# WorkCoPilot - IP / Credential Leak Response Playbook

**INTERNAL RUNBOOK. Not a customer document. Do not publish, attach to a
customer response, or link from any public page.**
Audit item: IP-22. Owner: Ravi Yerra. Last updated: 2026-10-23.

This is the process an on-call engineer follows when something that should be
private has appeared somewhere it should not be: a credential, customer data,
source code, a trade secret (see `docs/business-rules.md`: model names, AI cost,
build-enabling detail), or anything else protected. It describes the process to
follow. It does not assert that any particular control, monitor, or alert already
exists; where a step depends on a tool or log we may not have, the step says
"if available" and the gap is recorded in step 8 (Learn).

Companion docs: `docs/ops-encryption-keys.md` (master key handling and backup),
`docs/business-rules.md` (what is protected and why).

Contacts: support@admireveda.com, support@coesecurity.com.

---

## Production facts this playbook relies on

- Deploy is direct tar-over-ssh to `/opt/workcopilot` on admireveda.com. It is
  not git-based, so a leak in the repo history and a leak on the server are two
  separate things to check.
- The app runs as the systemd service `workcopilot` on port 4000.
- Secrets live server-side only: Stripe secret key and webhook signing secret, AI
  provider keys, web-search keys, SSO client secret, and the session-signing
  secret. They are stored encrypted at rest (AES-256-GCM) in `db.json`. The master
  key is `WORK_ENC_KEY` (env) or `<DATA_DIR>/.enc.key` (on prod
  `/var/lib/workcopilot/.enc.key`, mode 0600). The `.enc.key` must be backed up
  off-box; losing it makes the stored secrets unrecoverable and the server will
  refuse to start (see `docs/ops-encryption-keys.md`).
- Public, crawlable surface includes everything under `public/` (for example
  `robots.txt`, `sitemap.xml`, the Security and Privacy PDF, images, video) and
  the built client bundle under `dist/copilot-assets/`. Anything placed there is
  assumed world-readable and indexable.
- The GitHub repo for this product uses a personal access token (PAT) kept in a
  local file that must stay out of git.

---

## Severity at a glance

| Severity | Examples | Target first action |
|---|---|---|
| Critical | Live Stripe secret, AI provider key, `.enc.key` / `WORK_ENC_KEY`, GitHub PAT, customer data exposed publicly | Contain immediately; do not wait to finish classification |
| High | Source code or `db.json` backup in a public location, session-signing secret, SSO client secret | Contain within the hour |
| Medium | Model name, AI cost, or build-enabling detail visible on a customer-facing surface | Remove and purge the same day |
| Low | Already-public information, false positive | Document and close |

When in doubt between two severities, treat it as the higher one until
classification (step 2) proves otherwise.

---

## 1. Detect and preserve

Goal: capture enough to act and to learn, without making the leak bigger.

1. **Open an incident note** (a private file or ticket the team controls, not a
   public issue). Record:
   - Where it appeared (URL, repo path, log line, pasted chat, third-party site).
   - UTC timestamp of discovery, and who or what discovered it (person, scanner,
     customer report, search result).
   - Source: how we think it got there (deploy, commit, support reply, screenshot,
     error message, third-party copy).
   - **Minimal, sanitized evidence**: URL, file path, a screenshot with the secret
     value blacked out, or the first and last 4 characters of a key. Never paste
     the full secret or the customer data into the incident note, chat, or email.
2. **Restrict access.** Share the incident note only with the people who must act.
   Do not forward the leaked material.
3. **Do not delete evidence yet.** If the artifact is on our server, copy it to a
   private location first (or record its hash and path) so the root cause can be
   found, then proceed to step 3. Never preserve a live secret in plaintext;
   record that it existed, not its value.
4. **Check how long it was exposed.** For repo leaks, `git log` on the file for
   the first commit that contained it. For server or public leaks, the deploy time
   (tar-over-ssh timestamp) and any file modification time under `/opt/workcopilot`.
   The exposure window drives the scope of step 7.

Useful starting points (all run by an authorized engineer, none of these print
secrets by default):

```bash
# Is a suspect string in the shipped bundle or public files?
grep -rIl "<fragment>" dist/ public/
# Was it ever committed? (search history for the fragment)
git log -S"<fragment>" --oneline --all
# What is on the server right now?
ssh <deploy-user>@admireveda.com "sudo ls -la /opt/workcopilot /var/lib/workcopilot"
```

---

## 2. Classify

Decide which bucket this is. One incident can be in more than one.

| Class | What it is | Typical next move |
|---|---|---|
| Active credential | Stripe key, webhook secret, AI provider key, `.enc.key`, session secret, SSO secret, GitHub PAT, SSH key | Revoke and rotate now (step 3). Assume it is already abused. |
| Customer data | Sessions, documents, reports, screenshots, member lists, billing details | Contain, scope who is affected, then check notification obligations (step 8). |
| Source code | Repo contents, server code, a source map, a `db.json` backup | Remove, then judge what secrets or logic it exposes. |
| Trade secret / protected IP | Model names, AI cost, prompts, failover logic, engine mechanism, benchmark internals (see `docs/business-rules.md` sections 1 to 3) | Remove from the surface, purge caches, review for a pattern. |
| Intentionally public | Marketing copy, the published Security and Privacy paper, `robots.txt` | No incident. Record the decision and close. |
| False positive | A detector pattern (for example the regex strings in docs or the scanner), a test fixture, a placeholder | Record why, close. Consider improving the check so it stops firing. |

Then answer three questions and write them in the note:
- **Was it a real secret or real data?** Test it carefully. For a credential,
  check it against the provider's dashboard (is that key still active?), do not
  "try it" against production systems.
- **Who could have seen it?** Public internet, a private channel, one customer,
  a contractor.
- **Is it still reachable right now?**

---

## 3. Contain

Do the fastest effective action first. Revocation does not wait for the full
write-up.

1. **Revoke exposed credentials immediately** (see the Key rotation table below).
   Revoke at the provider first, then issue the replacement and set it on the
   server. Revoke before you finish investigating; a leaked live key is assumed
   used.
2. **Disable accidental public access.** Remove or lock down the URL, bucket,
   share link, public repo, pastebin, or paste in a chat that is visible to others.
3. **Remove the published artifact.** If it is under `public/` or in the built
   `dist/`, remove it from `/opt/workcopilot` on the server and redeploy a clean
   build; do not rely on "it is just an unlinked file", because crawlers and the
   `sitemap.xml` may already list it.
4. **Correct misconfigured storage or permissions.** For example, a data or backup
   directory readable by the wrong user, a backup in a web-served path, or a
   repo that was made public by mistake.
5. **Stop affected jobs.** If a leaked key allows spend or access (an AI provider
   key, Stripe), stop or throttle the jobs that use it while the key is rotated,
   and consider pausing the affected feature rather than serving errors silently.
6. **If `.enc.key` / `WORK_ENC_KEY` or the `db.json` file is involved, treat it as
   Critical.** The stored provider keys, Stripe keys, SSO secret, and session
   secret are all exposed together, so every one of them must be rotated, and the
   session-signing secret rotation will sign out all users (acceptable in this
   situation).

Record every containment action with a UTC timestamp in the incident note.

---

## 4. Eradicate

Remove the cause, not just the symptom.

1. **Fix the source.** Find how it got out: a commit, a deploy that included a
   file it should not have (the tar-over-ssh deploy ships whatever is in the
   archive), a source map, a verbose error message, a support reply, or a
   screenshot. Fix that path.
2. **Fix deployment and authorization.** If the deploy archive was too broad,
   tighten what is packed. If a route returned data it should not have (see the
   defense-in-depth rule in `docs/business-rules.md`: the UI must not render it
   and the server must not send it), fix the route and its authorization check.
3. **Rotate downstream dependencies.** Anything that used the exposed secret, or
   that the secret could reach, gets new credentials. Example: a leaked GitHub PAT
   means rotating the PAT and checking what else was stored alongside it.
4. **Inspect duplicate locations.** The same secret or file often exists in more
   than one place:
   - Other files in the repo and its full history (`git log -S`).
   - Previous builds and old deploy archives on the server and on developer
     machines.
   - Backups of `db.json` and `.enc.key`.
   - The built bundle in `dist/copilot-assets/` and any `.map` files (there
     should be none).
   - Chat logs, tickets, email threads, and docs where it was pasted.
5. **If it was committed, removing it from the latest commit is not enough.** The
   value remains in history. The credential must still be treated as burned. Only
   rewrite history if there is a real reason and the owner approves; rotation is
   the actual fix.

---

## 5. Limit persistence

Once something has been public, copies can outlive the original. Reduce what you
can and be honest about what you cannot.

1. **Purge caches.** CDN and origin caches, any reverse-proxy cache, and the
   browser-facing static assets. Confirm the old URL now returns 404 or a clean
   file, from outside our network.
2. **Request search-engine deindexing** for any URL that was crawlable (use the
   search engines' URL-removal tools). Check `public/robots.txt` and
   `public/sitemap.xml`: remove the leaked path from the sitemap and confirm
   `robots.txt` is not accidentally advertising it. Note that `robots.txt` hides
   nothing; it is a hint, not access control.
3. **Contact partners or third parties** hosting copies (paste sites, code hosts,
   forks, archives, a customer who received the file, a vendor). Ask for removal
   in writing; keep the request in the incident note.
4. **Recognize private copies may persist.** Anyone who downloaded the material
   before removal may still have it, and web archives may have captured it.
   Removal reduces exposure; it does not guarantee erasure. This is why credentials
   are rotated in step 3 regardless of removal, and why the decision in step 8
   about notification is made on the assumption that the material was seen.

---

## 6. Recover

Bring the service back to a known-good state before declaring the incident
contained.

1. **Rebuild and redeploy from a clean tree** (clean working copy, no stray files
   in the archive), using the normal release gates. Run the verification block in
   `docs/business-rules.md` ("How to verify before shipping"): model-name grep,
   AI-cost grep, secrets/source-map grep, no `.map` files.
2. **Run the regression checks:**
   - **Smoke:** service starts under systemd, `workcopilot` is healthy on port
     4000, the homepage and `/api` respond.
   - **Auth:** sign-in works for a normal user, company admin, and superadmin;
     previously issued sessions behave as intended (invalid if the session secret
     was rotated).
   - **Content:** the removed artifact is gone from the live site; pages that
     legitimately reference public files still render.
   - **Security:** re-run the secrets grep over `dist/` and `public/`; confirm the
     new keys work (AI config shows keys configured, a test guidance session runs,
     Stripe test or live ping succeeds, webhook signature verifies).
3. **Confirm backups still pair correctly.** After any `.enc.key` / `WORK_ENC_KEY`
   change, the `db.json` backup and the key must be taken and stored together
   (see `docs/ops-encryption-keys.md`).
4. **Re-enable paused features and jobs** only after the new credentials are in
   place and verified.

---

## 7. Monitor

Watch for abuse of the leaked material for as long as the exposure window and the
credential's lifetime justify, not just for a day.

- **Access logs** on the server and any reverse proxy: requests for the removed
  path, unusual sign-in patterns, requests carrying the old key or token (where
  the log captures that), odd IP ranges.
- **Provider dashboards:** AI provider usage and spend (unexpected spikes or
  unfamiliar models, which would indicate use of a leaked key), Stripe events and
  failed or unusual API calls, GitHub audit log for the PAT.
- **Model usage in the superadmin console:** the Incidents feed and consumption
  views are superadmin-only (see `docs/business-rules.md`); check them for
  anomalies after rotation.
- **Public mirrors:** periodically search for the leaked string or file name on
  code hosts and search engines until results are clean.
- **Set a review date** in the incident note (for example 7, 30, and 90 days) and
  actually check on it. If no log or alert exists for something worth watching,
  record that as a gap.

---

## 8. Learn

Close the loop. An incident is not closed until this is written down.

Record in the incident note (and a short summary in `docs/engineering-log.md` if
it changes how we work):
- **Root cause**: the specific mechanism, not "human error".
- **Owner**: who is responsible for each follow-up.
- **Dates**: discovery, containment, eradication, recovery, and when each
  monitoring check happened.
- **Permanent preventive test or gate**: a check that would have caught this
  class of mistake (for example an additional grep in the pre-ship verification,
  a deploy-archive allowlist, a pre-commit secret check). If the same class of
  incident occurs twice, the fix was surgical; replace the mechanism.
- **Notification and legal obligations**: decide with the owner, and with counsel
  where appropriate, whether customers, affected individuals, or regulators must
  be told, and by when. Jurisdiction and contract terms determine this, and it
  depends on what data was actually exposed. Do not assume either way. Customer
  communication goes through support@admireveda.com or support@coesecurity.com,
  is reviewed by the owner, states only verified facts, and never claims more
  than we actually did or know.
- **Gaps found**: any step above where the tool, log, or alert did not exist.
  Each gap becomes a tracked item.

---

## Key rotation quick-reference

Rotate means revoke the old value at the source, create a new one, set it on the
server, and verify. After rotation, confirm in step 6 that the product works.

| What to rotate | Where it is set | Owner | Notes |
|---|---|---|---|
| AI provider keys | Superadmin AI configuration (stored encrypted at rest; the provider or model is never shown outside the superadmin console) | Ravi Yerra (superadmin) | Revoke the old key in the provider's own dashboard first, then enter the new key in the superadmin AI config. Check provider usage for abuse before and after. |
| Web-search keys | Superadmin configuration (stored encrypted at rest) | Ravi Yerra (superadmin) | Same procedure as AI provider keys. |
| Stripe secret key | Superadmin Billing (write-only field) | Ravi Yerra (superadmin) | Roll the key in the Stripe dashboard, then paste the new key. Review Stripe events for unauthorized activity. |
| Stripe webhook signing secret | Superadmin Billing (write-only field) | Ravi Yerra (superadmin) | Roll the signing secret in the Stripe dashboard (or create a new endpoint secret), update it in Billing, confirm webhook deliveries verify. |
| At-rest encryption key (`.enc.key` / `WORK_ENC_KEY`) | On the server: `WORK_ENC_KEY` in the service environment, or `/var/lib/workcopilot/.enc.key` (0600) | Ravi Yerra (operator) | Highest impact. There is no one-command rotation yet; follow "Rotate the master key" in `docs/ops-encryption-keys.md`. Back up the key off-box and restore it together with `db.json`. Do not swap keys under a live encrypted db. A compromise of this key also means rotating every secret it protects. |
| Session-signing secret and SSO client secret | Stored encrypted at rest in `db.json` (SSO client secret via the superadmin SSO configuration) | Ravi Yerra (superadmin) | Rotating the session secret signs everyone out. Rotate the SSO client secret at the identity provider as well. |
| GitHub PAT | GitHub account settings (token) and the local ignored token file used for pushes | Ravi Yerra | Revoke the token on GitHub, create a new one with the least scope needed, update the local file, and confirm the file is not tracked by git. |
| SSH deploy key / access to admireveda.com | The deploy user's authorized keys on the server, and the key on the deploying machine | Ravi Yerra (operator) | If a deploy key or the host key file might be exposed, remove it from authorized keys, create a new keypair, and review recent logins on the server. |

---

## Quick on-call checklist

1. Note where, when (UTC), and what. Sanitize. Restrict access.
2. Classify. If it is a live credential, go straight to step 3 now.
3. Revoke, remove, lock down, stop affected jobs.
4. Fix the cause; rotate downstream; search every duplicate location and history.
5. Purge caches, deindex, ask hosts to remove; assume private copies exist.
6. Redeploy clean, run the verification block, test auth and the new keys.
7. Watch logs and provider dashboards; set review dates.
8. Write root cause, owner, dates, a permanent preventive check, and the
   notification decision. Close the gaps found.
