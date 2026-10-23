// TOTP correctness: RFC 6238 vectors + round-trip + window + backup codes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateSecret, otpauthUri, verifyTotp, currentToken, generateBackupCodes, hashBackupCode, base32Encode } from './totp.js'

// RFC 6238 test secret: ASCII "12345678901234567890" -> base32.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'))

test('RFC 6238 vectors (SHA1, 6-digit truncation of the 8-digit vectors)', () => {
  // 8-digit RFC values truncated to the low 6 digits.
  assert.equal(currentToken(RFC_SECRET, 59 * 1000), '287082')          // 94287082
  assert.equal(currentToken(RFC_SECRET, 1111111109 * 1000), '081804')  // 07081804
  assert.equal(currentToken(RFC_SECRET, 1234567890 * 1000), '005924')  // 89005924
})

test('verifyTotp accepts the current code and rejects a wrong one', () => {
  const at = 1111111109 * 1000
  assert.equal(verifyTotp(RFC_SECRET, '081804', { window: 0, at }), true)
  assert.equal(verifyTotp(RFC_SECRET, '000000', { window: 1, at }), false)
  assert.equal(verifyTotp(RFC_SECRET, '81804', { window: 1, at }), false)  // too short
})

test('verifyTotp tolerates +/- 1 step of clock drift, not more', () => {
  const at = 1111111109 * 1000
  const prev = currentToken(RFC_SECRET, at - 30 * 1000)
  const next = currentToken(RFC_SECRET, at + 30 * 1000)
  const far = currentToken(RFC_SECRET, at + 120 * 1000)
  assert.equal(verifyTotp(RFC_SECRET, prev, { window: 1, at }), true)
  assert.equal(verifyTotp(RFC_SECRET, next, { window: 1, at }), true)
  assert.equal(verifyTotp(RFC_SECRET, far, { window: 1, at }), false)
})

test('round-trip: a freshly generated secret verifies its own current code', () => {
  const s = generateSecret()
  assert.ok(s.length >= 16, 'secret is a reasonable base32 length')
  assert.equal(verifyTotp(s, currentToken(s), { window: 1 }), true)
})

test('otpauth URI has the fields Microsoft Authenticator needs', () => {
  const uri = otpauthUri('ABCDEFGHIJKLMNOP', { label: 'jane', issuer: 'WorkCoPilot' })
  assert.match(uri, /^otpauth:\/\/totp\//)
  assert.match(uri, /secret=ABCDEFGHIJKLMNOP/)
  assert.match(uri, /issuer=WorkCoPilot/)
  assert.match(uri, /algorithm=SHA1/)
  assert.match(uri, /digits=6/)
  assert.match(uri, /period=30/)
})

test('backup codes are unique and hash deterministically (format-insensitive)', () => {
  const codes = generateBackupCodes(10)
  assert.equal(codes.length, 10)
  assert.equal(new Set(codes).size, 10, 'all unique')
  const c = codes[0]
  assert.equal(hashBackupCode(c), hashBackupCode(c.toUpperCase()))
  assert.equal(hashBackupCode(c), hashBackupCode(c.replace('-', '')))
  assert.notEqual(hashBackupCode(codes[0]), hashBackupCode(codes[1]))
})
