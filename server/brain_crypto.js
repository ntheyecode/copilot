// server/brain_crypto.js - Company Brain per-tenant envelope encryption (Agent B-1)
//
// Threat model + design (per the frozen brain-contract Phase 1a):
//   - The server already holds ONE master key (the KEK) at the store.js load/persist
//     boundary (AES-256-GCM, 'enc:v1:' wrapped secrets). This module does NOT own that
//     key; the lead dependency-injects it via configureBrainCrypto({ getMasterKey }) so
//     this file is self-contained and unit-testable with a 32-byte test key.
//   - Each company (tenant) gets its own 32-byte Data Encryption Key (DEK). The DEK is
//     WRAPPED (encrypted) by the KEK using the EXACT SAME 'enc:v1:' string format as
//     store.js encSecret/decSecret, so the two schemes are interchangeable and there is
//     a single source of truth for the master-key cipher (SUPREME RULE II).
//   - Tenant content (chunk text, vectors, manifest bytes) is SEALED under the tenant DEK
//     with AES-256-GCM, a fresh random 12-byte IV per seal (never reused), and the auth
//     tag stored inline. Layout: ver(1)=0x01 | iv(12) | authTag(16) | ciphertext.
//   - Decrypt THROWS on any auth/format failure. It NEVER returns an empty buffer or a
//     silent fallback (SUPREME RULE III): a tampered or wrong-key blob must surface as an
//     error to the caller, never as an empty corpus.
//   - Unwrapped DEKs are cached in a small LRU (hot tenants only). evictTenant drops a
//     tenant's DEK and makes a best-effort buf.fill(0) over the cached copy. This is
//     best-effort zeroization only: V8 may have copied the bytes elsewhere, so we do NOT
//     claim guaranteed wipe.
//
// Honest crypto claims: AES-256-GCM (256-bit key, 128-bit tag, 96-bit IV). Never "512-bit".
//
// Reuses Node's built-in `crypto` only (zero native deps).

import crypto from 'node:crypto'

// 'enc:v1:' - the SAME wrap format store.js uses for its secrets. Keeping this byte-for-byte
// identical is what makes a wrappedDek produced here decryptable by store's decSecret and
// vice versa (single source of truth for the KEK cipher).
const ENC_PREFIX = 'enc:v1:'

const DEK_BYTES = 32   // AES-256 key
const IV_BYTES = 12    // GCM standard 96-bit nonce
const TAG_BYTES = 16   // GCM 128-bit auth tag
const SEAL_VER = 0x01  // content-seal version byte

// Injected master-key accessor. Set by configureBrainCrypto. Not captured at import time
// so the file loads before the lead wires the real key (and tests inject their own).
let _getMasterKey = null

// LRU of unwrapped tenant DEKs: companyId -> { dek:Buffer(32), wrappedDek:string, dekId:string }
// Map preserves insertion order, so we evict the oldest key on overflow.
const DEK_LRU_MAX = Math.max(1, parseInt(process.env.BRAIN_DEK_LRU || '32', 10) || 32)
const _dekCache = new Map()

/**
 * configureBrainCrypto({ getMasterKey })
 * getMasterKey() -> Buffer(32) : the KEK. Called lazily on each wrap/unwrap so key rotation
 * at the source is honored and the key is never cached in this module.
 */
export function configureBrainCrypto({ getMasterKey } = {}) {
  if (typeof getMasterKey !== 'function') {
    throw new Error('[brain_crypto] configureBrainCrypto requires { getMasterKey: () => Buffer(32) }')
  }
  _getMasterKey = getMasterKey
}

function kek() {
  if (!_getMasterKey) {
    throw new Error('[brain_crypto] not configured: call configureBrainCrypto({ getMasterKey }) first')
  }
  const k = _getMasterKey()
  if (!Buffer.isBuffer(k) || k.length !== DEK_BYTES) {
    throw new Error('[brain_crypto] getMasterKey() must return a 32-byte Buffer (the KEK)')
  }
  return k
}

// ---- KEK wrap/unwrap of a DEK, byte-identical to store.js encSecret/decSecret ----------
// store.js wraps the UTF-8 string value; we wrap dek.toString('base64') the same way, so
// the on-disk form is exactly ENC_PREFIX + base64(iv|tag|ct).
function wrapDek(dek) {
  const plain = dek.toString('base64')
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', kek(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ENC_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')
}

function unwrapDek(wrappedDek) {
  const s = wrappedDek == null ? '' : String(wrappedDek)
  if (!s.startsWith(ENC_PREFIX)) {
    throw new Error('[brain_crypto] wrappedDek is not in enc:v1: format')
  }
  const raw = Buffer.from(s.slice(ENC_PREFIX.length), 'base64')
  if (raw.length < IV_BYTES + TAG_BYTES) {
    throw new Error('[brain_crypto] wrappedDek is truncated')
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', kek(), raw.subarray(0, IV_BYTES))
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
  // THROWS on auth failure - a bad wrap must never silently yield an empty/zero DEK.
  const plain = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8')
  const dek = Buffer.from(plain, 'base64')
  if (dek.length !== DEK_BYTES) {
    throw new Error('[brain_crypto] unwrapped DEK is not 32 bytes')
  }
  return dek
}

function dekIdOf(dek) {
  return crypto.createHash('sha256').update(dek).digest('hex').slice(0, 10)
}

function cachePut(companyId, entry) {
  if (_dekCache.has(companyId)) _dekCache.delete(companyId)
  _dekCache.set(companyId, entry)
  while (_dekCache.size > DEK_LRU_MAX) {
    const oldest = _dekCache.keys().next().value
    const ev = _dekCache.get(oldest)
    _dekCache.delete(oldest)
    try { ev && ev.dek && ev.dek.fill(0) } catch { /* best-effort only */ }
  }
}

function cacheTouch(companyId) {
  const entry = _dekCache.get(companyId)
  if (entry) { _dekCache.delete(companyId); _dekCache.set(companyId, entry) }
  return entry || null
}

/**
 * ensureTenantDek(companyId, wrappedDek?)
 *   -> { dek:Buffer(32), wrappedDek:string, dekId:string }
 * Returns the cached DEK when hot. Otherwise:
 *   - wrappedDek present -> unwrap it (throws if the KEK cannot open it).
 *   - wrappedDek absent   -> generate a fresh random DEK and wrap it under the KEK.
 * dekId = sha256(dek).slice(0,10).
 */
export function ensureTenantDek(companyId, wrappedDek) {
  if (!companyId) throw new Error('[brain_crypto] ensureTenantDek requires a companyId')
  const hot = cacheTouch(companyId)
  // Reuse the cached DEK only when the caller is not presenting a DIFFERENT wrapped DEK
  // (a rotation/foreign wrap must be honored, not shadowed by a stale cache entry).
  if (hot && (!wrappedDek || wrappedDek === hot.wrappedDek)) return hot

  let dek, wrapped
  if (wrappedDek) {
    dek = unwrapDek(wrappedDek)
    wrapped = String(wrappedDek)
  } else {
    dek = crypto.randomBytes(DEK_BYTES)
    wrapped = wrapDek(dek)
  }
  const entry = { dek, wrappedDek: wrapped, dekId: dekIdOf(dek) }
  cachePut(companyId, entry)
  return entry
}

function resolveDek(companyId) {
  const hot = cacheTouch(companyId)
  if (!hot) {
    throw new Error(`[brain_crypto] no DEK resident for tenant ${companyId}; call ensureTenantDek(companyId, wrappedDek) first`)
  }
  return hot.dek
}

// ---- Content seal/open under a tenant DEK (AES-256-GCM) --------------------------------
/**
 * seal(buf, dek) -> Buffer: ver(1)=0x01 | iv(12) | authTag(16) | ciphertext
 * Fresh random IV per seal (never reused).
 */
export function seal(buf, dek) {
  if (!Buffer.isBuffer(dek) || dek.length !== DEK_BYTES) throw new Error('[brain_crypto] seal requires a 32-byte DEK')
  const plain = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv)
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([Buffer.from([SEAL_VER]), iv, cipher.getAuthTag(), ct])
}

/**
 * open(sealed, dek) -> Buffer. THROWS on auth failure, bad version, or truncation.
 * Never returns an empty buffer as a failure signal.
 */
export function open(sealed, dek) {
  if (!Buffer.isBuffer(dek) || dek.length !== DEK_BYTES) throw new Error('[brain_crypto] open requires a 32-byte DEK')
  if (!Buffer.isBuffer(sealed) || sealed.length < 1 + IV_BYTES + TAG_BYTES) {
    throw new Error('[brain_crypto] sealed blob is truncated')
  }
  if (sealed[0] !== SEAL_VER) {
    throw new Error(`[brain_crypto] unsupported seal version 0x${sealed[0].toString(16)}`)
  }
  const iv = sealed.subarray(1, 1 + IV_BYTES)
  const tag = sealed.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES)
  const ct = sealed.subarray(1 + IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv)
  decipher.setAuthTag(tag)
  // final() throws if the tag does not verify - that error propagates to the caller.
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

// ---- Tenant-scoped convenience wrappers (use the resident DEK) --------------------------
export function encryptForTenant(companyId, buf) {
  return seal(buf, resolveDek(companyId))
}

export function decryptForTenant(companyId, sealed) {
  return open(sealed, resolveDek(companyId))
}

/**
 * encryptVectorForTenant(companyId, f32) -> sealed Buffer (little-endian float32 bytes).
 * Accepts a Float32Array; seals its raw byte view.
 */
export function encryptVectorForTenant(companyId, f32) {
  if (!(f32 instanceof Float32Array)) throw new Error('[brain_crypto] encryptVectorForTenant requires a Float32Array')
  // Node is little-endian on all supported platforms; a Buffer view over the array's bytes
  // is exactly the LE float32 representation. Copy so we seal only this vector's bytes
  // (the backing ArrayBuffer may be larger / shared).
  const bytes = Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength)
  return seal(Buffer.from(bytes), resolveDek(companyId))
}

/**
 * decryptVectorForTenant(companyId, sealed, dim) -> Float32Array(dim).
 * Asserts plain.length === dim*4, then returns a correctly-aligned Float32Array copy.
 */
export function decryptVectorForTenant(companyId, sealed, dim) {
  const plain = open(sealed, resolveDek(companyId))
  if (plain.length !== dim * 4) {
    throw new Error(`[brain_crypto] decrypted vector is ${plain.length} bytes, expected ${dim * 4} (dim=${dim})`)
  }
  // Copy into a fresh, 4-byte-aligned ArrayBuffer before the Float32Array view (a Buffer
  // from a pool may start at an unaligned byteOffset).
  const out = new Float32Array(dim)
  Buffer.from(out.buffer).set(plain)
  return out
}

/**
 * evictTenant(companyId): drop the cached DEK and best-effort zero its bytes.
 * Best-effort only - we do not claim a guaranteed memory wipe.
 */
export function evictTenant(companyId) {
  const entry = _dekCache.get(companyId)
  if (!entry) return false
  _dekCache.delete(companyId)
  try { entry.dek && entry.dek.fill(0) } catch { /* best-effort only */ }
  return true
}

/**
 * rotateTenantDek(companyId, wrappedDek)
 *   -> { wrappedDek, dekId, reEncrypt:(cb)=>n }
 * Generates a NEW DEK (wrapped under the current KEK) and makes it the resident DEK for the
 * tenant. The OLD DEK (unwrapped from the supplied wrappedDek) is retained only for the
 * duration of reEncrypt, which the caller drives to re-seal each content blob from old->new.
 * reEncrypt(cb) calls cb(open, seal) where open(sealed)->Buffer uses the OLD DEK and
 * seal(buf)->Buffer uses the NEW DEK; it returns the count cb reports (or the number of
 * blobs cb processed if cb returns a number).
 */
export function rotateTenantDek(companyId, wrappedDek) {
  if (!companyId) throw new Error('[brain_crypto] rotateTenantDek requires a companyId')
  if (!wrappedDek) throw new Error('[brain_crypto] rotateTenantDek requires the current wrappedDek')
  const oldDek = unwrapDek(wrappedDek)       // throws if the KEK cannot open it
  const newDek = crypto.randomBytes(DEK_BYTES)
  const newWrapped = wrapDek(newDek)
  const newDekId = dekIdOf(newDek)

  const reEncrypt = (cb) => {
    if (typeof cb !== 'function') throw new Error('[brain_crypto] reEncrypt requires a callback (open, seal) => count')
    const openOld = (sealed) => open(sealed, oldDek)
    const sealNew = (buf) => seal(buf, newDek)
    const n = cb(openOld, sealNew)
    // Old DEK is no longer needed once re-encryption is done.
    try { oldDek.fill(0) } catch { /* best-effort only */ }
    return typeof n === 'number' ? n : 0
  }

  // Make the new DEK resident immediately so subsequent encryptForTenant uses it.
  cachePut(companyId, { dek: newDek, wrappedDek: newWrapped, dekId: newDekId })
  return { wrappedDek: newWrapped, dekId: newDekId, reEncrypt }
}
