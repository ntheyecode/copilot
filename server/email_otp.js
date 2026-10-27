// ---------------------------------------------------------------------------
// WorkCoPilot - email verification codes: the PURE rules.
// ---------------------------------------------------------------------------
// Six-digit one-time codes sent by email to prove ownership of the sign-up
// address. This module owns the policy (length, lifetime, attempt cap, resend
// cadence) and the arithmetic (generate, hash, check). It never touches the
// store, the clock is always passed in, so every rule is unit-testable.
//
// Security properties:
//   * only a SHA-256 of (salt:code) is ever persisted, never the code
//   * a random per-record salt, so equal codes never share a hash
//   * constant-time comparison of hashes
//   * a hard attempt cap per code (brute force of a 6-digit space is 1e6
//     guesses; 5 tries is ~0.0005% per code lifetime)
//   * resend cooldown + hourly cap per account (mail-bombing)
// No em dashes in any copy.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'

export const OTP_LENGTH = 6
export const OTP_TTL_MS = 10 * 60 * 1000          // a code is valid for 10 minutes
export const OTP_MAX_ATTEMPTS = 5                 // wrong guesses before the code is burned
export const OTP_RESEND_MIN_MS = 45 * 1000        // minimum gap between two sends
export const OTP_MAX_SENDS_PER_HOUR = 6           // sends per rolling hour per account

export function generateCode() {
  // crypto.randomInt is uniform over [0, 1e6): no modulo bias, zero-padded.
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
}

export function normalizeCode(input) {
  return String(input || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
}

export function hashCode(code, salt) {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex')
}

// A fresh record for a just-issued code. `sends` keeps the timestamps of every
// send in the current rolling hour (carried over from the previous record so a
// re-issue cannot reset the hourly budget).
export function newOtpRecord(code, { now = Date.now(), priorSends = [] } = {}) {
  const salt = crypto.randomBytes(12).toString('hex')
  return {
    hash: hashCode(code, salt),
    salt,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    sends: [...priorSends.filter((t) => now - t < 3600 * 1000), now],
  }
}

// May another code be sent now? { ok:true } or { ok:false, waitMs, reason }.
// ignoreCooldown: a CHANGED address may send once right away (the person just
// fixed a typo), but the hourly budget always applies, so an address switch
// can never turn into unlimited mail.
export function canResend(rec, now = Date.now(), { ignoreCooldown = false } = {}) {
  if (!rec) return { ok: true, waitMs: 0 }
  const sends = Array.isArray(rec.sends) ? rec.sends.filter((t) => now - t < 3600 * 1000) : []
  if (!sends.length) return { ok: true, waitMs: 0 }
  const last = Math.max(...sends)   // never a truthiness check: a timestamp can legitimately be 0
  if (!ignoreCooldown && now - last < OTP_RESEND_MIN_MS) return { ok: false, waitMs: OTP_RESEND_MIN_MS - (now - last), reason: 'cooldown' }
  if (sends.length >= OTP_MAX_SENDS_PER_HOUR) {
    const oldest = Math.min(...sends)
    return { ok: false, waitMs: Math.max(1000, 3600 * 1000 - (now - oldest)), reason: 'hourly' }
  }
  return { ok: true, waitMs: 0 }
}

// How long until a resend is allowed (0 when allowed now). For the UI countdown.
export function resendWaitMs(rec, now = Date.now()) {
  const r = canResend(rec, now)
  return r.ok ? 0 : r.waitMs
}

// Check a submitted code against the record. Pure: returns a verdict, the caller
// persists the attempt counter. Verdicts:
//   'ok'       matched (caller clears the record)
//   'missing'  no code was issued
//   'expired'  past its lifetime
//   'locked'   attempt cap reached (caller must issue a new code)
//   'invalid'  did not match (caller increments attempts)
export function checkCode(rec, input, now = Date.now()) {
  if (!rec || !rec.hash) return 'missing'
  if (now > rec.expiresAt) return 'expired'
  if ((rec.attempts || 0) >= OTP_MAX_ATTEMPTS) return 'locked'
  const code = normalizeCode(input)
  if (code.length !== OTP_LENGTH) return 'invalid'
  const a = Buffer.from(hashCode(code, rec.salt), 'hex')
  const b = Buffer.from(String(rec.hash), 'hex')
  if (a.length !== b.length) return 'invalid'
  return crypto.timingSafeEqual(a, b) ? 'ok' : 'invalid'
}
