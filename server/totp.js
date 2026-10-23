// totp.js - standard TOTP (RFC 6238) for WorkCoPilot MFA, compatible with
// Microsoft Authenticator / Google Authenticator / Authy. Pure Node crypto, no
// dependency. SHA1, 6 digits, 30s period (the authenticator-app defaults).
//
// The secret is base32 (RFC 4648). Enrollment hands the client an otpauth:// URI
// (the app scans it as a QR, or the user types the base32 secret manually).
import crypto from 'node:crypto'

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD = 30
const DIGITS = 6

// ---- base32 (no padding) --------------------------------------------------
export function base32Encode(buf) {
  let bits = 0, value = 0, out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) { out += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}
function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const out = []
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(out)
}

// ---- secret + otpauth URI -------------------------------------------------
export function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes))
}

export function otpauthUri(secret, { label = 'user', issuer = 'WorkCoPilot' } = {}) {
  const lbl = encodeURIComponent(`${issuer}:${label}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(PERIOD) })
  return `otpauth://totp/${lbl}?${params.toString()}`
}

// ---- HOTP / TOTP ----------------------------------------------------------
function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8)
  // 64-bit big-endian counter
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return String(bin % (10 ** DIGITS)).padStart(DIGITS, '0')
}

// The current 6-digit code for a secret (used for round-trip tests; harmless).
export function currentToken(secret, at = Date.now()) {
  const secretBuf = base32Decode(secret)
  return hotp(secretBuf, Math.floor(at / 1000 / PERIOD))
}

// Verify a 6-digit token against the secret, allowing +/- `window` time steps
// (clock drift). Constant-time compare per candidate. Returns true/false.
export function verifyTotp(secret, token, { window = 1, at = Date.now() } = {}) {
  const t = String(token || '').replace(/\D/g, '')
  if (t.length !== DIGITS) return false
  const secretBuf = base32Decode(secret)
  if (!secretBuf.length) return false
  const counter = Math.floor(at / 1000 / PERIOD)
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(secretBuf, counter + w)
    try {
      if (candidate.length === t.length && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(t))) return true
    } catch { /* length mismatch - not equal */ }
  }
  return false
}

// ---- backup / recovery codes ---------------------------------------------
// Human-friendly one-time codes (shown ONCE at enrollment). Stored hashed.
export function generateBackupCodes(n = 10) {
  const codes = []
  for (let i = 0; i < n; i++) {
    const raw = crypto.randomBytes(5).toString('hex') // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`)
  }
  return codes
}
export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(String(code || '').replace(/[^a-z0-9]/gi, '').toLowerCase()).digest('hex')
}

export default { generateSecret, otpauthUri, verifyTotp, generateBackupCodes, hashBackupCode, base32Encode }
