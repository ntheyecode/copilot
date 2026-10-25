# WCPX v1 format and the standalone opener

`.wcpx` is WorkCoPilot's password-encrypted company data export. This document
describes the on-disk format and how to open an archive with `scripts/wcpx-open.mjs`,
a self-contained opener that uses Node built-ins only (no server code, no npm
dependencies).

## Opening an archive

```
node scripts/wcpx-open.mjs <archive.wcpx> [--out <file.json>]
```

- Set `WCPX_PASSWORD` in the environment, or you will be prompted (hidden input).
- With `--out`, the decrypted inner JSON is written (pretty-printed) to that file.
  Without `--out`, it is printed to stdout.
- A wrong password or a tampered archive prints a clear error and exits non-zero.
  There is never a silent or partial output.

## Byte layout

| Field      | Size            | Notes                                        |
|------------|-----------------|----------------------------------------------|
| magic      | 6 bytes         | `WCPX1\n`                                     |
| headerLen  | 4 bytes         | `uint32` big-endian, length of the header    |
| header     | `headerLen`     | UTF-8 JSON (see below)                        |
| authTag    | 16 bytes        | AES-256-GCM tag for the body                  |
| body       | remainder       | AES-256-GCM ciphertext of the inner payload   |

### Header JSON

```jsonc
{
  "v": 1,
  "companyId": "...",
  "createdAt": "ISO-8601",
  "kdf":    { "alg": "scrypt", "N": 65536, "r": 8, "p": 1, "dkLen": 32, "archiveSalt": "base64" },
  "cipher": "AES-256-GCM",
  "iv":     "base64 (12 bytes)",
  "brain":  { "present": true, "mode": "envelope", "dekWrap": { "salt": "base64", "wrapped": "base64" } },
  "notes":  [ "..." ],
  "hmac":   { "alg": "HMAC-SHA256", "keyId": "...", "issuedAt": "ISO-8601", "hash": "sha256-hex", "sig": "hmac-hex" }
}
```

### Inner payload JSON (decrypted body)

```jsonc
{ "meta": {...}, "profile": {...}, "sensitivity": {...}, "skills": [...], "learnings": [...], "brain": {...}? }
```

## Cryptography

- **Body key**: `scrypt(password, base64Decode(kdf.archiveSalt), dkLen, { N, r, p, maxmem })`.
  - Params come from `header.kdf`. Defaults when absent: `N = 2^16`, `r = 8`, `p = 1`, `dkLen = 32`.
  - `maxmem = 256 * N * r + (1 << 20)` (mirrors `server/key_derive.js`).
- **Body**: `AES-256-GCM`, 256-bit key, 96-bit IV (`header.iv`), 128-bit tag (`authTag`).
  The **full raw header bytes** are the GCM Additional Authenticated Data (AAD), so
  any header change makes the body tag fail.
- **Brain envelope** (`header.brain.mode === "envelope"`): the Company Brain's Data
  Encryption Key (DEK) is wrapped as `AES-256-GCM(iv(12) | tag(16) | ciphertext)`
  under `scrypt(password, header.brain.dekWrap.salt)` with the same `kdf` params.
  The opener can unwrap it to confirm the brain is present.

## Header attestation — honest scope

The `hmac` block holds a SHA-256 hash of the canonical header (keys sorted, `hmac`
field excluded) plus an HMAC-SHA256 signature over that hash.

- The opener **recomputes `hmac.hash`** from the header and confirms it matches.
  This detects header tampering **without the password**.
- The opener **cannot verify `hmac.sig`**: that signature is an HMAC under a
  **platform-held key** the customer does not have. It attests that the platform
  produced the archive, but it is **not customer-verifiable**, and the tool does
  not claim otherwise. (Origin can be verified by the platform at its verify
  endpoint, not by this offline opener.)

It is AES-256-GCM (256-bit key, 128-bit tag, 96-bit IV, scrypt-stretched). It is
never "512-bit".
