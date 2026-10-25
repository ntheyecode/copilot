# Company Brain - security and key custody

Status: built and wired (server). This document describes the encryption and the
two key-custody models exactly as they exist in the code, and states the honest
ceiling of each. It deliberately avoids over-claiming. US spelling, no em dashes.

Source of truth: `server/brain_crypto.js`, `server/key_derive.js`,
`server/recovery_phrase.js`, the custody accessors in `server/store.js`
(`getCompanyBrainCustody`, `getCompanyBrainCrypto`, `enablePrivateEncryption`,
`setCompanyBrainPassphrase`, `getCompanyBrainDek`, `setCompanyBrainDek`,
`brainMasterKey`), and the custody routes in `server/index.js`.

---

## 1. The cipher, stated honestly

- Every stored byte (chunk text, vectors, the manifest) is sealed with
  **AES-256-GCM**: a 256-bit key, a 128-bit authentication tag, and a fresh
  random 96-bit (12-byte) IV per seal (IVs are never reused).
- This is **AES-256-GCM**. It is never "512-bit AES" - AES has no 512-bit key,
  and that claim would be wrong. Do not use it anywhere.
- Decryption is authenticated. `open` and `unwrapDek` THROW on any
  authentication failure, bad version byte, or truncation. They never return an
  empty buffer or a zeroed key as a failure signal, so a tampered or wrong-key
  blob surfaces as a loud error, never as a silent empty corpus.
- No post-quantum key wrapping is implemented. SESSION-HANDOFF named ML-KEM-1024
  as an optional future headline; it is not in the code, so it must not be
  claimed.

### Seal layout

Content seal (`seal` / `open`):
`ver(1)=0x01 | iv(12) | authTag(16) | ciphertext`.

DEK wrap (`wrapDek` / `unwrapDek`): the exact `enc:v1:` string format that
`store.js` uses for its own secrets - `enc:v1:` + base64(`iv(12) | authTag(16) |
ciphertext`). Keeping this byte-for-byte identical to the store's secret cipher
is intentional: there is one master-key cipher, one source of truth.

---

## 2. Envelope encryption (KEK -> DEK -> sealed content)

Three layers:

1. **KEK (Key Encryption Key):** the platform master key the server already
   holds at the `store.js` load/persist boundary (`.enc.key`). `brain_crypto`
   does not own it; it is dependency-injected via
   `configureBrainCrypto({ getMasterKey })` so the module is self-contained and
   unit-testable with a 32-byte test key.
2. **DEK (Data Encryption Key):** each company gets its own random 32-byte DEK.
   The DEK is wrapped (encrypted) by the KEK in the `enc:v1:` format and the
   wrapped DEK is stored on the company record (`c.brain.wrappedDek`), together
   with a non-secret `dekId` fingerprint (`sha256(dek).slice(0,10)`).
3. **Sealed content:** every chunk, vector, and manifest blob is sealed under the
   tenant DEK.

Unwrapped DEKs live in a small LRU in `brain_crypto` (`BRAIN_DEK_LRU`, default
32 tenants), separate from the `brain_store` tenant working-set LRU. Evicting a
DEK does a best-effort `buf.fill(0)` over the cached copy. This is best-effort
zeroization only - V8 may have copied the bytes elsewhere - so a guaranteed
memory wipe is not claimed.

`ensureTenantDek(companyId, wrappedDek?)` unwraps an existing wrapped DEK, or
mints and wraps a fresh one when the company has none. `brain_store` persists any
newly minted wrapped DEK back through the injected setter, so the key survives a
restart (never a transient in-memory-only DEK). A tenant-DEK rotation path
(`rotateTenantDek`) exists that mints a new DEK and drives a caller-supplied
re-encryption of each content blob old-to-new.

---

## 3. Two custody models

A company record carries `c.brain.custody`, either `'platform'` (default) or
`'customer'`.

### 3.1 Platform-held custody (default)

The DEK is wrapped under the platform KEK. The platform can open it. This is the
zero-configuration default and is how the brain works until a company opts into
customer-held custody. At-rest the data is AES-256-GCM encrypted under a
per-tenant DEK; the platform holds the key material needed to decrypt it.

### 3.2 Customer-held-key custody (opt-in)

A company admin can opt into customer-held encryption. In this model the DEK is
re-wrapped under a **Customer Master Key (CMK) that the platform never stores.**

- The CMK is a random 32-byte key minted at enable time.
- The customer holds the CMK through two independent factors, either of which can
  unlock:
  - a **passphrase** (minimum 8 characters). A key is derived from it with
    **scrypt** (`key_derive.js`: N = 2^16 by default, r = 8, p = 1, 32-byte
    output, memory-hard, zero native dependencies) over a random 16-byte salt,
    and that derived key seals (wraps) the CMK. The stored artifacts are the salt,
    the sealed CMK (`wrapPass`), and the KDF parameters - none of which is the
    passphrase.
  - a **24-word BIP39 recovery phrase** (`recovery_phrase.js`): the CMK encoded
    as a standard BIP39 English mnemonic WITH the BIP39 checksum, so a mistyped
    word or wrong word order is detected on decode (never a silent wrong key).
    The recovery phrase is returned to the admin exactly ONCE at enable time and
    is NEVER stored by the platform.
- What the platform persists for a customer-custody company: `custody:'customer'`,
  the `salt`, the passphrase-sealed CMK (`wrapPass`), the CMK-wrapped DEK
  (`wrappedDek`), the `dekId`, and the `kdf` parameters. None of these is a
  secret the platform can turn into the CMK or the DEK without the customer's
  passphrase or recovery phrase. They are deliberately NOT listed in the store's
  `mapSecrets` (the KEK does not and must not open them) - that is the whole
  point.

#### Enable re-parents the DEK in place (no content re-encryption)

`enableCustomerCustody` takes the company's EXISTING platform-wrapped DEK,
unwraps it under the KEK one last time, and re-wraps that SAME DEK under the new
CMK. The content on disk is sealed under the DEK, and the DEK is unchanged, so no
chunk, vector, or manifest is re-encrypted. Only the DEK's wrap is re-parented
from KEK to CMK. The store then overwrites `c.brain` with the customer-custody
record, which destroys the platform wrap. If the company had no DEK yet, a fresh
DEK is born customer-held.

After enable, the DEK is left resident for the enabling session (the brain is
unlocked), and the one-time recovery phrase is returned.

#### Lock and unlock

- **Unlock** (`unlockWithPassphrase` or `unlockWithRecovery`): re-derives or
  decodes the CMK, opens the CMK-wrapped DEK, and puts the DEK resident. A wrong
  passphrase or a non-matching recovery phrase THROWS (surfaced to the admin as
  "that passphrase or recovery phrase is not correct").
- **Lock** (`lock` == `evictTenant`): drops the resident DEK and best-effort
  zeroes it.
- **A locked brain serves nothing.** When custody is `'customer'` and the tenant
  is not unlocked, `brain_store` throws a `BRAIN_LOCKED` error on both the prime
  path and the load path, and drops any decrypted working set from memory so
  vectors and text do not linger in RAM after lock. Retrieval during a locked
  window returns no grounding, and the plan handler surfaces a "your Company
  Brain is locked" flag to the user.
- **Idle auto-lock:** while unlocked the DEK is resident only for a time-boxed
  window (`WORK_BRAIN_UNLOCK_WINDOW_MS`, default 30 minutes). A background timer
  locks any customer-custody brain whose window has elapsed.

#### Change passphrase

`changePassphrase` re-wraps the CMK under a new passphrase (authenticated by the
current passphrase OR the recovery phrase). The CMK, the DEK, and the content are
untouched; only the salt and `wrapPass` change.

#### Lose both factors = unrecoverable (wallet model)

If the customer loses BOTH the passphrase and the 24-word recovery phrase, the
CMK cannot be reconstructed, the DEK cannot be unwrapped, and the data cannot be
recovered. There is no platform backdoor - that is the design, not a defect. The
enable route requires the admin to acknowledge this explicitly
(`acknowledge: true`) before customer custody is turned on.

---

## 4. The honest security ceiling

State these precisely. Do not round them up.

- **At-rest zero-access (customer custody) is real.** Nothing on disk opens
  without the customer's secret. The platform stores only the salt, the
  passphrase-sealed CMK, the CMK-wrapped DEK and the KDF parameters; none of
  these yields the CMK or DEK without the customer passphrase or recovery phrase.
- **Runtime access on a running managed instance is NOT eliminated.** On a
  managed (platform-operated) server, during an unlock window the DEK is resident
  in the server's memory so the brain can serve retrieval. An operator with root
  on that box could in principle reach decrypted memory during that window.
  Customer custody removes at-rest platform access; it does not remove the
  operator's runtime reach on a box the operator runs.
- **Absolute runtime zero-access is only true on-prem**, where the customer runs
  the server and the platform has no root. (The on-prem editions are designed in
  SESSION-HANDOFF; this document covers the key custody that is built today.)
- **Never call the managed model "zero-knowledge."** It is not. The accurate
  phrasing is "customer-held key, at-rest zero-access; the platform cannot
  decrypt your data at rest." On-prem is where the stronger claim holds.
- **No "certified."** Describe the mechanism and its limits; do not claim any
  certification.
- The IP/anti-reverse-engineering ceiling for the on-prem editions (not built
  here) is "practically and economically infeasible, not mathematically
  impossible," per SESSION-HANDOFF decision 10 - keep that visible too.

---

## 5. Custody routes (`server/index.js`)

All under `requireWorkAuth` + `requireCompanyAdmin` (a platform superadmin passes
the gate). Reason-gated actions are recorded as audit admin actions.

| Method + path | Purpose |
|---|---|
| `GET /api/work/brain/security` | Report `custody`, `enabled`, `locked`, `dekId`, and the unlock-window minutes. |
| `POST /api/work/brain/enable-private` | Enable customer custody. Requires a passphrase (>= 8 chars) and `acknowledge: true` (the unrecoverable acknowledgement). Returns the 24-word recovery phrase ONCE. 409 if already enabled. |
| `POST /api/work/brain/unlock` | Unlock with `{ passphrase }` or `{ recoveryPhrase }`. 401 on a wrong factor. |
| `POST /api/work/brain/lock` | Lock immediately (evict the resident DEK). |
| `POST /api/work/brain/rotate-passphrase` | Change the passphrase, authenticated by the current passphrase or the recovery phrase. |

### A note on who holds the key

In the built model the **company admin** drives enable / unlock / lock / rotate,
and the company (customer) holds the passphrase and recovery phrase. This differs
from SESSION-HANDOFF decision 3, which described key custody as superadmin-only,
manual and out-of-band (a compliance control against company-admin misuse). The
report accompanying this documentation flags that divergence for the lead to
reconcile: decision 3's superadmin-issued-key model (and the on-prem activation
key flow) is a separate, not-yet-built track from the customer-held-key custody
that ships today.

---

## 6. What a reviewer should take away

- Encryption: AES-256-GCM, authenticated, per-tenant DEK under an envelope. Not
  "512-bit," no post-quantum wrapping claim.
- Two custody models: platform-held (default, platform can decrypt) and
  customer-held (passphrase + 24-word recovery phrase; platform never stores the
  customer secret; at-rest zero-access).
- Failure is loud, never silent: a bad key or tampered blob throws; a locked
  brain serves nothing; the embedder states its mode.
- The ceiling is honest: at-rest zero-access is real on the managed model;
  runtime zero-access during an unlock window is not; only on-prem is runtime
  access absolute; the managed model is not "zero-knowledge"; losing both factors
  is unrecoverable by design.
