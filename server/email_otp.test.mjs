// Email verification codes: the pure policy (email_otp.js). Lifetime, attempt
// cap, resend cooldown + hourly cap, constant-time match, no plaintext at rest.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as otp from './email_otp.js'

test('generateCode is six zero-padded digits', () => {
  for (let i = 0; i < 200; i++) assert.match(otp.generateCode(), /^\d{6}$/)
})

test('a record stores only a salted hash, and the right code matches', () => {
  const code = '004213'
  const rec = otp.newOtpRecord(code, { now: 1000 })
  assert.equal(rec.hash.length, 64)
  assert.ok(!JSON.stringify(rec).includes(code), 'plaintext never persisted')
  assert.equal(otp.checkCode(rec, code, 2000), 'ok')
  assert.equal(otp.checkCode(rec, ' 004-213 ', 2000), 'ok', 'separators and spaces are ignored')
  assert.equal(otp.checkCode(rec, '004214', 2000), 'invalid')
  assert.equal(otp.checkCode(rec, '4213', 2000), 'invalid', 'short input never matches')
})

test('expiry and attempt cap', () => {
  const rec = otp.newOtpRecord('123456', { now: 0 })
  assert.equal(otp.checkCode(rec, '123456', otp.OTP_TTL_MS + 1), 'expired')
  rec.attempts = otp.OTP_MAX_ATTEMPTS
  assert.equal(otp.checkCode(rec, '123456', 10), 'locked', 'even the right code is refused once burned')
  assert.equal(otp.checkCode(null, '123456', 10), 'missing')
})

test('resend policy: cooldown, then an hourly cap that a re-issue cannot reset', () => {
  let now = 0
  let rec = otp.newOtpRecord('111111', { now })
  assert.equal(otp.canResend(rec, now + 1000).ok, false, 'inside the cooldown')
  assert.equal(otp.canResend(rec, now + otp.OTP_RESEND_MIN_MS).ok, true)
  // Issue up to the hourly cap, each one carrying the prior send timestamps.
  for (let i = 1; i < otp.OTP_MAX_SENDS_PER_HOUR; i++) {
    now += otp.OTP_RESEND_MIN_MS
    assert.equal(otp.canResend(rec, now).ok, true)
    rec = otp.newOtpRecord('222222', { now, priorSends: rec.sends })
  }
  now += otp.OTP_RESEND_MIN_MS
  const r = otp.canResend(rec, now)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'hourly')
  assert.ok(r.waitMs > 0)
  assert.equal(otp.canResend(rec, now + 3600 * 1000 + 1).ok, true, 'the window rolls')
})
