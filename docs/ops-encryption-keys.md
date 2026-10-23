# Ops runbook — encryption-at-rest keys

WorkCoPilot encrypts stored secrets and report artifacts at rest (AES-256-GCM).
This is the operator runbook for the master key. Related: SUPREME RULE III
(never silently lose a key) and `server/store.js` (`encKey`, `encSecret`,
`encryptBuffer`, `migrateShotsAtRest`).

## What is encrypted at rest
- In `db.json`: AI provider keys, web-search keys, Stripe secret + webhook
  secret, SSO client secret, the session-signing secret (`enc:v1:` prefix).
- Milestone screenshots on disk under `work-shots/` (`ENCIMG1` magic header).

## The master key
Resolved in this order:
1. **`WORK_ENC_KEY`** env var — 32 bytes as 64 hex chars or base64. Preferred for
   production (you control it, it is not on the data disk).
2. Else an auto-generated **`<DATA_DIR>/.enc.key`** (32 random bytes, mode 0600),
   created on first write.

On prod today: `<DATA_DIR>` is `/var/lib/workcopilot`, so the key file is
`/var/lib/workcopilot/.enc.key` (owned by the service user, 0600).

## CRITICAL — back up the key
- **Lose the key and the encrypted secrets are unrecoverable, and the server
  refuses to start** (it will not silently blank a key). 
- Back up `WORK_ENC_KEY` (store it in your secrets manager) OR back up
  `/var/lib/workcopilot/.enc.key` off-box, alongside the db.json backup
  (see docs / the backup runbook). The key and the db must be restored together.

## Move from the auto key file to a managed `WORK_ENC_KEY` (recommended)
Do this once to get the key off the data disk:
1. Read the current key and print it as hex (as the service user, on the box):
   ```
   sudo xxd -p -c 64 /var/lib/workcopilot/.enc.key
   ```
2. Set that hex value as `WORK_ENC_KEY` in the service environment (systemd
   drop-in / env file), then restart. The server now uses the env key.
3. Keep `.enc.key` as the backup, or remove it after confirming the env key works
   (a boot with the env key set + secrets still readable confirms it).

## Rotate the master key (re-encrypt everything under a new key)
There is no in-place rotation command yet; rotation is a decrypt-then-re-encrypt
under the new key. Safe procedure (low volume, brief maintenance window):
1. **Back up** `db.json` + `.enc.key` (or the current `WORK_ENC_KEY`) and the
   `work-shots/` dir, off-box.
2. Stop the service.
3. With the CURRENT key available, run a one-off that loads the store (which
   decrypts into memory) and forces a persist + shot re-encrypt under the NEW
   key. The simplest form: set the NEW `WORK_ENC_KEY`, delete the
   `.shots-encrypted` sentinel so shots re-migrate, and start once with BOTH the
   old key file removed and the new env key set — the loader will fail to decrypt
   old `enc:v1:` values under a different key, so instead do it deliberately:
   - keep the OLD key, start the server, and (future work) run a `rotate` script
     that reads with the old key and writes with the new. **Until that script
     exists, treat rotation as: restore from a plaintext export, then bring up
     with the new key.** Do not swap keys under a live encrypted db.
4. Verify secrets read correctly (AI config shows keys configured; a test scan
   runs) and reports render (screenshots visible in a PDF).

> Backlog: add `server/scripts/rotate-enc-key.mjs` to make rotation one command.

## If the server refuses to start with a key error
That is the safety behaving correctly: the stored secrets are marked encrypted
but cannot be decrypted with the key present. Restore the correct key (env or
file) and restart. Do NOT delete db.json (that destroys accounts).
