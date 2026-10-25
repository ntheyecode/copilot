// server/key_derive.js - shared password-based key derivation.
//
// ONE source of truth for password -> key derivation, used by BOTH the customer-held-key
// custody model (brain_crypto / the CMK unlock) and the password-encrypted data export
// (customer_export), so the two can never diverge (SUPREME RULE II). scrypt via Node's
// built-in crypto: memory-hard, ZERO native deps (important for the on-prem single-exe
// build). argon2id is a documented future opt-in (native dep; would need SCA vetting per
// SUPREME RULE XIII).
//
// Honest claims: scrypt key stretching + AES-256-GCM downstream. Never "512-bit".

import crypto from 'node:crypto'

// scrypt cost parameters. N=2^16 keeps unlock/export latency reasonable on the target
// hardware (~100-200 ms) while remaining strong against offline cracking. Raise N via
// env for higher-assurance deployments; r=8, p=1 are the standard values. The chosen
// params are stored alongside each wrap/verifier so they can be raised later without
// breaking existing secrets.
export const KDF = {
  alg: 'scrypt',
  N: Math.max(1 << 14, parseInt(process.env.WORK_KDF_N || String(1 << 16), 10) || (1 << 16)),
  r: 8,
  p: 1,
  dkLen: 32,
}

// scrypt requires maxmem >= 128 * N * r; give generous headroom.
function maxmemFor(N, r) { return 256 * N * r + (1 << 20) }

export function randomSalt(bytes = 16) { return crypto.randomBytes(bytes) }

// deriveKey(password, salt, params?) -> Buffer(dkLen). `salt` may be a Buffer or a base64
// string. Deterministic for the same (password, salt, params).
export function deriveKey(password, salt, params = KDF) {
  const p = { ...KDF, ...(params || {}) }
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64')
  if (!saltBuf.length) throw new Error('[key_derive] a non-empty salt is required')
  return crypto.scryptSync(String(password == null ? '' : password), saltBuf, p.dkLen, {
    N: p.N, r: p.r, p: p.p, maxmem: maxmemFor(p.N, p.r),
  })
}

// A constant-time verifier for a password. verifierOf derives and returns the base64 key;
// checkVerifier re-derives and compares in constant time. The stored verifier is useless
// for decrypting anything - it only answers "is this the right password?".
export function verifierOf(password, salt, params = KDF) {
  return deriveKey(password, salt, params).toString('base64')
}
export function checkVerifier(password, salt, verifierB64, params = KDF) {
  try {
    const got = deriveKey(password, salt, params)
    const want = Buffer.from(String(verifierB64 || ''), 'base64')
    return got.length === want.length && crypto.timingSafeEqual(got, want)
  } catch { return false }
}
