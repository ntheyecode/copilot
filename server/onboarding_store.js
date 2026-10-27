// ---------------------------------------------------------------------------
// WorkCoPilot - onboarding state on the account (module of store.js).
// ---------------------------------------------------------------------------
// Owns the per-account record for the subscribe flow:
//   u.emailVerified / u.emailVerifiedAt   proof of ownership of the sign-up email
//   u.onboarding { plan, cycle, startedAt, checkoutSessionId, completedAt }
//   db.emailOtps[userId]                  the hashed verification code (email_otp.js)
// Created by store.js with the store's own primitives (db getter, persist,
// account helpers), exactly like enterprise_billing.js, so store.js keeps only
// the wiring and this concern lives in one small file (SUPREME RULE XV).
//
// Rules the routes rely on:
//   * an account created here uses the EMAIL as its sign-in name (one identity,
//     no separate username to invent) and starts unverified
//   * the plan intent is kept on the account, so a closed browser, a social
//     redirect or a failed payment never loses the chosen plan (recovery G/E)
//   * the email can only be changed while it is still unverified and only to
//     an address no other account uses (never merge on an unverified email, J)
//   * markEmailVerified is also called when a password-reset link is consumed
//     (a link delivered to the mailbox proves ownership), which is the
//     verification recovery path that never reveals account status (D)
// No em dashes in any copy.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import { PLANS } from './billing_checkout.js'
import * as otp from './email_otp.js'

// ctx: { db: () => object, persist, getUser, findUserByLogin, createWorkUser, normalizeEmail, httpErr, now }
export function createOnboarding(ctx) {
  const { persist, getUser, findUserByLogin, createWorkUser, normalizeEmail, httpErr, now } = ctx
  const db = () => ctx.db()

  const CYCLES = ['monthly', 'annual']
  const cleanPlan = (p) => { const v = String(p || '').trim().toLowerCase(); return PLANS.includes(v) ? v : null }
  const cleanCycle = (c) => (String(c || '').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly')

  function otps() {
    const d = db()
    if (!d.emailOtps || typeof d.emailOtps !== 'object') d.emailOtps = {}
    return d.emailOtps
  }

  // ---- account creation --------------------------------------------------
  // Sign-in name = the email (same convention createSocialUser already uses), so
  // the person signs in with the one thing they typed. Refuses an address any
  // existing account uses (username, contact email or SSO email): duplicates are
  // prevented at creation, never merged later.
  function createOnboardingUser({ email, password }) {
    const mail = normalizeEmail(email)
    if (!mail) throw httpErr(400, 'Enter a valid email address.')
    if (findUserByLogin(mail)) throw httpErr(409, 'An account with this email already exists.')
    const uname = mail.length <= 64 ? mail : ('user_' + crypto.randomBytes(6).toString('hex'))
    const u = createWorkUser({ username: uname, password, email: mail })
    u.emailVerified = false
    u.emailVerifiedAt = null
    u.onboarding = { plan: null, cycle: 'monthly', startedAt: now(), checkoutSessionId: null, completedAt: null }
    persist()
    return u
  }

  // ---- email verification state ------------------------------------------
  function isEmailVerified(userOrId) {
    const u = (userOrId && typeof userOrId === 'object') ? userOrId : getUser(userOrId)
    return !!(u && u.emailVerified === true)
  }
  function markEmailVerified(userId) {
    const u = getUser(userId); if (!u) return false
    if (u.emailVerified !== true) { u.emailVerified = true; u.emailVerifiedAt = now() }
    delete otps()[u.id]
    persist()
    return true
  }

  // ---- the plan intent -----------------------------------------------------
  function getOnboarding(userId) {
    const u = getUser(userId); if (!u) return null
    const o = (u.onboarding && typeof u.onboarding === 'object') ? u.onboarding : {}
    return {
      plan: cleanPlan(o.plan),
      cycle: CYCLES.includes(o.cycle) ? o.cycle : 'monthly',
      startedAt: o.startedAt || null,
      checkoutSessionId: o.checkoutSessionId || null,
      completedAt: o.completedAt || null,
    }
  }
  function ensureOnboarding(u) {
    if (!u.onboarding || typeof u.onboarding !== 'object') u.onboarding = { plan: null, cycle: 'monthly', startedAt: now(), checkoutSessionId: null, completedAt: null }
    return u.onboarding
  }
  function setOnboardingIntent(userId, { plan, cycle } = {}) {
    const u = getUser(userId); if (!u) throw httpErr(404, 'Account not found')
    const o = ensureOnboarding(u)
    const p = cleanPlan(plan)
    if (plan != null && !p) throw httpErr(400, 'Pick a plan: lite, basic, advanced or premium.')
    if (p) o.plan = p
    if (cycle != null) o.cycle = cleanCycle(cycle)
    if (!o.startedAt) o.startedAt = now()
    // A new intent means any earlier Checkout Session is stale (different price).
    if (p || cycle != null) o.checkoutSessionId = null
    persist()
    return getOnboarding(userId)
  }
  function setOnboardingCheckout(userId, sessionId) {
    const u = getUser(userId); if (!u) throw httpErr(404, 'Account not found')
    ensureOnboarding(u).checkoutSessionId = sessionId ? String(sessionId) : null
    persist()
  }
  function completeOnboarding(userId) {
    const u = getUser(userId); if (!u) return null
    const o = ensureOnboarding(u)
    if (!o.completedAt) o.completedAt = now()
    o.checkoutSessionId = null
    persist()
    return getOnboarding(userId)
  }

  // ---- change the sign-up email (unverified accounts only) -----------------
  function changeOnboardingEmail(userId, newEmail) {
    const u = getUser(userId); if (!u) throw httpErr(404, 'Account not found')
    if (u.emailVerified === true) throw httpErr(409, 'This email is already verified. Change it from your account settings.')
    const mail = normalizeEmail(newEmail)
    if (!mail) throw httpErr(400, 'Enter a valid email address.')
    if (mail === String(u.email || '').toLowerCase()) return mail
    const other = findUserByLogin(mail)
    if (other && other.id !== u.id) throw httpErr(409, 'An account with this email already exists.')
    const oldMail = String(u.email || '').toLowerCase()
    u.email = mail
    if (String(u.username || '').toLowerCase() === oldMail && mail.length <= 64) u.username = mail
    delete otps()[u.id]   // the old code was for the old address
    persist()
    return mail
  }

  // ---- codes ----------------------------------------------------------------
  // Issue a code. Enforces the resend policy (cooldown + hourly cap) and returns
  // the PLAINTEXT code to the caller for delivery (it is never stored).
  function issueEmailOtp(userId, at = Date.now()) {
    const u = getUser(userId); if (!u) throw httpErr(404, 'Account not found')
    const all = otps()
    const prior = all[u.id] || null
    const gate = otp.canResend(prior, at)
    if (!gate.ok) {
      const e = httpErr(429, gate.reason === 'hourly' ? 'Too many codes were requested. Please try again later.' : 'A code was just sent. Please wait a moment before requesting another.')
      e.body = { resendInMs: gate.waitMs }
      throw e
    }
    const code = otp.generateCode()
    all[u.id] = otp.newOtpRecord(code, { now: at, priorSends: (prior && prior.sends) || [] })
    persist()
    return { code, expiresAt: all[u.id].expiresAt, resendInMs: otp.OTP_RESEND_MIN_MS }
  }
  // Verify a code. On success the account is marked verified and the record is
  // dropped. On failure the attempt is counted (a locked code must be re-issued).
  function verifyEmailOtp(userId, input, at = Date.now()) {
    const u = getUser(userId); if (!u) throw httpErr(404, 'Account not found')
    const all = otps()
    const rec = all[u.id] || null
    const verdict = otp.checkCode(rec, input, at)
    if (verdict === 'ok') { markEmailVerified(u.id); return { ok: true } }
    if (verdict === 'invalid' && rec) { rec.attempts = (rec.attempts || 0) + 1; persist() }
    const attemptsLeft = rec ? Math.max(0, otp.OTP_MAX_ATTEMPTS - (rec.attempts || 0)) : 0
    // A burned code (no attempts left) reads as locked from here on.
    return { ok: false, reason: (verdict === 'invalid' && attemptsLeft === 0) ? 'locked' : verdict, attemptsLeft }
  }
  // For the UI: is a code outstanding, and how long until a resend is allowed.
  function emailOtpStatus(userId, at = Date.now()) {
    const rec = otps()[userId] || null
    return {
      pending: !!(rec && at <= rec.expiresAt && (rec.attempts || 0) < otp.OTP_MAX_ATTEMPTS),
      expiresAt: rec ? rec.expiresAt : null,
      resendInMs: otp.resendWaitMs(rec, at),
    }
  }

  return {
    createOnboardingUser, isEmailVerified, markEmailVerified,
    getOnboarding, setOnboardingIntent, setOnboardingCheckout, completeOnboarding,
    changeOnboardingEmail, issueEmailOtp, verifyEmailOtp, emailOtpStatus,
  }
}
