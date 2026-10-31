// ===========================================================================
// WorkCoPilot webhooks: PURE rules (signing, verification, retry schedule).
//
// Signature (Stripe-style, so receivers know the pattern):
//   X-WorkCoPilot-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
// The timestamp is inside the signed string, so a captured delivery cannot be
// replayed later: receivers reject a `t` outside their tolerance (5 minutes by
// default) and may dedupe on X-WorkCoPilot-Delivery. Every attempt is signed
// afresh with the current time; the body (and its event id) stay the same.
// ===========================================================================
import crypto from 'node:crypto'

export const SIGNATURE_HEADER = 'X-WorkCoPilot-Signature'
export const EVENT_HEADER = 'X-WorkCoPilot-Event'
export const DELIVERY_HEADER = 'X-WorkCoPilot-Delivery'
export const DEFAULT_TOLERANCE_SEC = 300
export const SECRET_PREFIX = 'whsec_'

// Delay before attempt N+1 (attempt 1 is immediate). 7 attempts over about 9
// hours, then the delivery is dead-lettered and kept for a manual retry.
export const RETRY_DELAYS_MS = Object.freeze([30e3, 2 * 60e3, 10 * 60e3, 30 * 60e3, 2 * 3600e3, 6 * 3600e3])
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1

export function newSigningSecret() { return SECRET_PREFIX + crypto.randomBytes(32).toString('base64url') }

export function signPayload(secret, timestampSec, body) {
  return crypto.createHmac('sha256', String(secret)).update(`${timestampSec}.${body}`).digest('hex')
}
export function signatureHeader(secret, timestampSec, body) {
  return `t=${timestampSec},v1=${signPayload(secret, timestampSec, body)}`
}

// Receiver-side verification (shipped so tests prove the contract and so the
// docs can point at a reference). Returns { ok, reason }.
export function verifySignature(secret, header, body, { toleranceSec = DEFAULT_TOLERANCE_SEC, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const parts = Object.create(null)
  for (const kv of String(header || '').split(',')) {
    const i = kv.indexOf('=')
    if (i > 0) { const k = kv.slice(0, i).trim(); (parts[k] = parts[k] || []).push(kv.slice(i + 1).trim()) }
  }
  const t = Number(parts.t && parts.t[0])
  if (!Number.isInteger(t)) return { ok: false, reason: 'missing timestamp' }
  if (Math.abs(nowSec - t) > toleranceSec) return { ok: false, reason: 'timestamp outside tolerance' }
  const want = Buffer.from(signPayload(secret, t, body), 'hex')
  for (const v of (parts.v1 || [])) {
    const got = Buffer.from(String(v), 'hex')
    if (got.length === want.length && crypto.timingSafeEqual(got, want)) return { ok: true }
  }
  return { ok: false, reason: 'signature mismatch' }
}

// Next attempt time after `attempts` failed attempts, or null when exhausted.
// `jitter` (0..1) spreads retries so many endpoints never retry in lockstep.
export function nextAttemptAt(attempts, nowMs, jitter = Math.random()) {
  if (attempts >= MAX_ATTEMPTS) return null
  const base = RETRY_DELAYS_MS[Math.max(0, attempts - 1)]
  return nowMs + Math.round(base * (0.9 + 0.2 * Math.max(0, Math.min(1, jitter))))
}

// The JSON envelope every receiver gets. `data` comes from the event registry.
export function envelope({ eventId, type, createdAt, data }) {
  return { id: eventId, type, createdAt, apiVersion: 'v1', data }
}

export default { SIGNATURE_HEADER, EVENT_HEADER, DELIVERY_HEADER, DEFAULT_TOLERANCE_SEC, SECRET_PREFIX, RETRY_DELAYS_MS, MAX_ATTEMPTS, newSigningSecret, signPayload, signatureHeader, verifySignature, nextAttemptAt, envelope }
