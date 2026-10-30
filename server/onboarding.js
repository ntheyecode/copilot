// ---------------------------------------------------------------------------
// WorkCoPilot - subscribe onboarding: create account -> verify email -> pay ->
// welcome -> into the app.
// ---------------------------------------------------------------------------
// Every step runs on a SERVER-VERIFIED identity, never on anything the browser
// asserts:
//   * a full signed-in session (resolveWorkIdentity), or
//   * the onboarding marker (session.onboardingUid) the server itself sets only
//     when it created the account in this session, or a social provider
//     returned a verified email for it (social.js -> finishSocialOnboarding).
// The marker is NOT a sign-in: it allows the account's own onboarding actions
// (read its step, verify its email, start/confirm its own checkout) and nothing
// else. Entering the app goes through the SAME MFA gate every login uses
// (owner rule: authenticator on first login), via POST /enter.
//
// Payment truth comes from Stripe, twice over: the signed webhook
// (checkout.session.completed) and POST /confirm, which RETRIEVES the Checkout
// Session from Stripe and applies it through the same applyCheckoutSession the
// webhook uses. Whichever lands first activates; the other is a no-op. The
// browser's success redirect is only a hint to start confirming.
//
// Routes (all JSON, same-origin cookie session):
//   GET  /api/work/onboarding/state        where am I (step + plan + email ...)
//   POST /api/work/onboarding/signup       { email, password, plan, cycle, acceptTerms }
//   POST /api/work/onboarding/verify       { code }
//   POST /api/work/onboarding/resend
//   POST /api/work/onboarding/email        { email }   change the unverified address
//   POST /api/work/onboarding/plan         { plan, cycle }
//   POST /api/work/onboarding/checkout     { plan?, cycle? } -> { url }
//   POST /api/work/onboarding/confirm      { sessionId } -> { status }
//   POST /api/work/onboarding/enter        -> { user } | { mfaSetup, enroll } | { mfaRequired }
// Error copy is operator-facing English (the client maps statuses to its
// localized strings). No em dashes. No secret or Stripe id ever leaves.
// ---------------------------------------------------------------------------
import { sendTemplateAsync, sendOwnerSubscriptionAlertAsync } from './emails.js'
import * as billingDefault from './billing.js'
import { applyCheckoutSession, checkoutSessionPaid, PLANS } from './billing_checkout.js'
import { OTP_TTL_MS } from './email_otp.js'
import { soloSignupRefusal } from './edition.js'

const MARKER_TTL_MS = 24 * 3600 * 1000      // the onboarding marker's own life (the cookie is shorter)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MIN_PASSWORD = 8
const OTP_TTL_LABEL = `${Math.round(OTP_TTL_MS / 60000)} minutes`
const cleanCycle = (c) => (String(c || '').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly')
const cleanPlan = (p) => { const v = String(p || '').trim().toLowerCase(); return PLANS.includes(v) ? v : null }

// The two return URLs Stripe sends the browser to. {CHECKOUT_SESSION_ID} is a
// Stripe placeholder (filled by Stripe), so the confirm step knows which session
// to look up. Both land on the pay step, which never activates anything itself.
export const ONBOARDING_SUCCESS_URL = `${billingDefault.PUBLIC_SITE}/workcopilot/signup/pay?checkout=success&session_id={CHECKOUT_SESSION_ID}`
export const ONBOARDING_CANCEL_URL = `${billingDefault.PUBLIC_SITE}/workcopilot/signup/pay?checkout=cancel`

// deps: { store, establishSession, resolveWorkIdentity, authBlocked, authFail,
//         authOk, ipOf, ipRateOk?, bindReferralOnSignup?, LEGAL_VERSION,
//         socialConfigured?, billing? }  ipRateOk(ip) = the host's per-IP
//         submission limiter (index.js coverageRateOk) for the mail-sending routes  billing = { createSubscriptionCheckout, stripeClient,
//         billingConfigured, billingPriceMap } (defaults to billing.js; tests
//         inject a fake Stripe without touching the network)
export function registerOnboardingRoutes(app, deps = {}) {
  const { store, establishSession, resolveWorkIdentity, authBlocked, authFail, authOk, ipOf, bindReferralOnSignup, LEGAL_VERSION } = deps
  for (const k of ['store', 'establishSession', 'resolveWorkIdentity', 'authBlocked', 'authFail', 'authOk', 'ipOf']) {
    if (!deps[k]) throw new Error(`registerOnboardingRoutes: missing dep ${k}`)
  }
  const { createSubscriptionCheckout, stripeClient, billingConfigured, billingPriceMap } = { ...billingDefault, ...(deps.billing || {}) }
  const socialConfigured = deps.socialConfigured || (() => ({ google: false, microsoft: false, facebook: false }))
  const ipRateOk = typeof deps.ipRateOk === 'function' ? deps.ipRateOk : () => true
  const mailRateBlocked = (req, res) => {
    if (ipRateOk(ipOf(req))) return false
    res.status(429).json({ error: 'Too many requests just now. Please try again in a little while.' })
    return true
  }

  // ---- identity ------------------------------------------------------------
  function identity(req) {
    const id = resolveWorkIdentity(req)
    if (id && id.ok) return { user: id.user, full: true }
    const uid = req.session && req.session.onboardingUid
    const at = req.session && req.session.onboardingAt
    if (uid && at && (Date.now() - at) <= MARKER_TTL_MS) {
      const u = store.getUser(uid)
      if (u && !u.disabled) return { user: u, full: false }
    }
    return null
  }
  function setMarker(req, userId) {
    req.session.onboardingUid = userId
    req.session.onboardingAt = Date.now()
  }
  const clearMarker = (req) => { if (req.session) { delete req.session.onboardingUid; delete req.session.onboardingAt } }
  const hasAccess = (u) => !!(u && (u.companyId || store.userCanUseService(u.id)))
  const reply = (res, e, fallback) => {
    if (e && e.status) return res.status(e.status).json({ error: e.message, ...(e.body || {}) })
    console.warn('[onboarding] ' + (fallback || 'error') + ': ' + (e && e.message))
    return res.status(500).json({ error: fallback || 'Something went wrong. Please try again.' })
  }

  // ---- the state the client renders ---------------------------------------
  // step: 'account' (no identity yet) | 'verify' | 'pay' | 'active'
  // Keeps the plan intent on the account the moment one is known (URL -> store),
  // so no later screen depends on the URL still carrying it.
  function stateFor(req, idn, urlIntent = {}) {
    const pricing = store.getWorkPricing()
    let annualReady = false
    try { annualReady = !!store.getBillingPublic().annualReady } catch { annualReady = false }
    const base = {
      signedIn: !!(idn && idn.full),
      billingConfigured: billingConfigured(store),
      annualReady,
      pricing: { currency: pricing.currency || 'usd', plans: pricing.plans || {} },
      providers: socialConfigured(),
      plan: cleanPlan(urlIntent.plan),
      cycle: cleanCycle(urlIntent.cycle),
    }
    if (!idn) return { ...base, step: 'account', email: null, emailVerified: false }
    const u = idn.user
    // A URL intent is recorded on the account (setOnboardingIntent writes only
    // when the plan or cycle actually CHANGES, so a reload is a pure read).
    if (base.plan || urlIntent.cycle) {
      try { store.setOnboardingIntent(u.id, { plan: base.plan || undefined, cycle: urlIntent.cycle ? base.cycle : undefined }) } catch { /* keep going on a bad intent */ }
    }
    const ob = store.getOnboarding(u.id) || {}
    const verified = store.isEmailVerified(u) || !!u.ssoEmail || !!u.social
    const sub = store.getSubscription(u.id)
    let step
    if (hasAccess(u)) step = 'active'
    else if (!verified) step = 'verify'
    else if (!base.billingConfigured) step = 'active'   // nothing to pay for in this deployment: straight in
    else step = 'pay'
    return {
      ...base,
      step,
      email: store.effectiveUserEmail(u.id),
      emailVerified: verified,
      plan: ob.plan || null,
      cycle: ob.cycle || base.cycle,
      fresh: !ob.completedAt,                   // welcome copy vs "you already have a plan"
      subscription: { status: sub.status, plan: sub.plan, cycle: sub.cycle },
      otp: verified ? null : store.emailOtpStatus(u.id),
      mfaEnabled: store.mfaGloballyEnabled(),
    }
  }
  const intentFrom = (src) => ({ plan: src && src.plan, cycle: src && src.cycle })

  // Send (or re-send) the verification code. Returns the resend wait for the UI.
  function sendCode(u, opts) {
    const { code, resendInMs } = store.issueEmailOtp(u.id, Date.now(), opts || {})
    const to = store.effectiveUserEmail(u.id)
    if (to) sendTemplateAsync('verify_email', to, { name: u.displayName || '', code, expiresLabel: OTP_TTL_LABEL })
    return resendInMs
  }

  // ---- GET state -------------------------------------------------------------
  app.get('/api/work/onboarding/state', (req, res) => {
    try { res.json(stateFor(req, identity(req), intentFrom(req.query))) }
    catch (e) { reply(res, e, 'Could not load your sign-up.') }
  })

  // ---- signup -----------------------------------------------------------------
  app.post('/api/work/onboarding/signup', (req, res) => {
    try {
      if (authBlocked(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
      const noSignup = soloSignupRefusal()
      if (noSignup) return res.status(noSignup.status).json(noSignup.body)
      if (mailRateBlocked(req, res)) return
      const b = req.body || {}
      const email = String(b.email || '').trim().toLowerCase()
      const password = String(b.password || '')
      if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' })
      if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Choose a password of at least ${MIN_PASSWORD} characters.`, field: 'password' })
      if (password.length > 256) return res.status(400).json({ error: 'That password is too long (256 characters at most).', field: 'password' })
      if (password.toLowerCase() === email) return res.status(400).json({ error: 'Your password cannot be your email address.', field: 'password' })
      // CLICKWRAP: no account without an explicit acceptance (same rule as the
      // classic sign-up; the version comes from the server, never the client).
      if (b.acceptTerms !== true) return res.status(400).json({ error: 'Please accept the Terms of Service and Privacy Policy to create your account.', legalRequired: true, version: LEGAL_VERSION })
      const intent = intentFrom(b)

      const existing = store.findUserByLogin(email)
      if (existing) {
        // RESUME (recovery B/G): the same person came back before verifying. Only
        // the matching password resumes; anything else is "an account exists" and
        // the way forward is Sign in (never a silent merge or takeover, J).
        const unverified = existing.emailVerified !== true && !existing.ssoEmail && !existing.social
        if (unverified && store.verifyPassword(existing, password) && !existing.disabled) {
          authOk(req)
          setMarker(req, existing.id)
          let resendInMs = 0
          try { resendInMs = sendCode(existing) } catch (e) { resendInMs = (e && e.body && e.body.resendInMs) || 0 }   // inside the cooldown: keep the last code
          return req.session.save(() => res.json({ ...stateFor(req, { user: existing, full: false }, intent), resumed: true, resendInMs }))
        }
        authFail(req)   // slows down address probing
        return res.status(409).json({ error: 'An account with this email already exists. Sign in to continue.', accountExists: true })
      }

      const u = store.createOnboardingUser({ email, password })
      store.recordLegalAcceptance(u.id, { ip: ipOf(req), userAgent: req.headers['user-agent'], method: 'signup' })
      if (typeof bindReferralOnSignup === 'function') { try { bindReferralOnSignup(store, req, u.id) } catch { /* never blocks signup */ } }
      if (intent.plan || intent.cycle) { try { store.setOnboardingIntent(u.id, intent) } catch { /* bad plan in the URL: ignore */ } }
      authOk(req)
      setMarker(req, u.id)
      const resendInMs = sendCode(u)
      req.session.save(() => res.json({ ...stateFor(req, { user: u, full: false }, intent), resendInMs }))
    } catch (e) { reply(res, e, 'Could not create your account. Please try again.') }
  })

  // ---- verify / resend / change email --------------------------------------
  app.post('/api/work/onboarding/verify', (req, res) => {
    try {
      if (authBlocked(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      const u = idn.user
      if (store.isEmailVerified(u)) return res.json(stateFor(req, idn))
      const r = store.verifyEmailOtp(u.id, (req.body || {}).code)
      if (!r.ok) {
        authFail(req)
        const msg = r.reason === 'expired' ? 'That code has expired. Request a new one.'
          : r.reason === 'locked' ? 'Too many incorrect codes. Request a new one.'
            : r.reason === 'missing' ? 'No code is active. Request a new one.'
              : 'That code did not match. Check the email and try again.'
        return res.status(400).json({ error: msg, reason: r.reason, attemptsLeft: r.attemptsLeft })
      }
      authOk(req)
      const to = store.effectiveUserEmail(u.id)
      if (to) sendTemplateAsync('welcome', to, { name: u.displayName || '' })
      res.json(stateFor(req, idn))
    } catch (e) { reply(res, e, 'Could not verify the code. Please try again.') }
  })

  app.post('/api/work/onboarding/resend', (req, res) => {
    try {
      if (authBlocked(req) || mailRateBlocked(req, res)) return authBlocked(req) ? res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' }) : undefined
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      if (store.isEmailVerified(idn.user)) return res.status(409).json({ error: 'This email is already verified.', verified: true })
      const resendInMs = sendCode(idn.user)
      res.json({ ok: true, resendInMs, email: store.effectiveUserEmail(idn.user.id) })
    } catch (e) { reply(res, e, 'Could not send a new code. Please try again.') }
  })

  app.post('/api/work/onboarding/email', (req, res) => {
    try {
      if (authBlocked(req)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' })
      if (mailRateBlocked(req, res)) return
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      const email = store.changeOnboardingEmail(idn.user.id, (req.body || {}).email)
      // The corrected address gets its code right away (cooldown waived once);
      // the hourly budget still applies and is carried across the change.
      let resendInMs = 0, codeSent = true
      try { resendInMs = sendCode(idn.user, { ignoreCooldown: true }) }
      catch (e) { if (!(e && e.status === 429)) throw e; codeSent = false; resendInMs = (e.body && e.body.resendInMs) || 0 }   // hourly budget spent: address saved, no mail
      res.json({ ...stateFor(req, idn), email, resendInMs, codeSent })
    } catch (e) { reply(res, e, 'Could not change the email. Please try again.') }
  })

  // ---- plan intent -----------------------------------------------------------
  app.post('/api/work/onboarding/plan', (req, res) => {
    try {
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      store.setOnboardingIntent(idn.user.id, intentFrom(req.body))
      res.json(stateFor(req, idn))
    } catch (e) { reply(res, e, 'Could not save the plan.') }
  })

  // ---- checkout ----------------------------------------------------------------
  app.post('/api/work/onboarding/checkout', async (req, res) => {
    try {
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      const u = idn.user
      const b = req.body || {}
      if (b.plan || b.cycle) store.setOnboardingIntent(u.id, intentFrom(b))
      // Never charge an account that already has access (recovery H): the client
      // sends them into the app or to subscription management instead.
      if (hasAccess(u)) return res.status(409).json({ error: 'This account already has an active plan.', alreadySubscribed: true })
      // Only a proven identity pays: a verified email, a provider-verified
      // social account, or a full sign-in.
      if (!idn.full && !(store.isEmailVerified(u) || u.social || u.ssoEmail)) return res.status(403).json({ error: 'Verify your email first.', needsVerification: true })
      const ob = store.getOnboarding(u.id) || {}
      if (!ob.plan) return res.status(400).json({ error: 'Choose a plan to continue.', needsPlan: true })
      // One open Checkout Session at a time (no duplicate sessions from a double
      // click or a refresh): reuse the last one while Stripe still has it open.
      if (ob.checkoutSessionId) {
        try {
          const s = await stripeClient(store)
          const prev = s ? await s.checkout.sessions.retrieve(ob.checkoutSessionId) : null
          if (prev && prev.status === 'open' && prev.url && (prev.metadata || {}).plan === ob.plan && (prev.metadata || {}).cycle === ob.cycle) return res.json({ url: prev.url, reused: true })
        } catch { /* stale id: create a fresh session below */ }
      }
      // A session this account can no longer use (plan changed, or stale) is
      // EXPIRED at Stripe before a replacement exists, so at most one payable
      // Checkout Session is ever open for the account (no double subscription
      // from a second tab or the back button). Best-effort: an already-expired
      // or unknown id just logs.
      for (const oldId of [ob.staleCheckoutSessionId, ob.checkoutSessionId].filter(Boolean)) {
        try { const s = await stripeClient(store); if (s) await s.checkout.sessions.expire(oldId) }
        catch (e) { console.log(`[onboarding] could not expire checkout ${oldId}: ${(e && e.message) || e}`) }
      }
      const r = await createSubscriptionCheckout(store, u, { plan: ob.plan, cycle: ob.cycle, successUrl: ONBOARDING_SUCCESS_URL, cancelUrl: ONBOARDING_CANCEL_URL })
      store.setOnboardingCheckout(u.id, r.id)
      res.json({ url: r.url })
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.message, ...(e.body || {}) })
      console.warn('[onboarding] checkout create failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not start checkout. Please try again.' })
    }
  })

  // ---- confirm (server-side, from Stripe, never from the redirect) ---------
  app.post('/api/work/onboarding/confirm', async (req, res) => {
    try {
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please start again.', restart: true })
      const u = idn.user
      const done = () => res.json({ status: 'active', ...stateFor(req, idn) })
      if (hasAccess(u)) return done()   // the webhook got here first
      const sessionId = String((req.body || {}).sessionId || '').trim()
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Missing checkout reference.' })
      const s = await stripeClient(store)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      let sess
      try { sess = await s.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] }) }
      catch (e) { console.warn('[onboarding] confirm retrieve failed: ' + (e && e.message)); return res.status(502).json({ error: 'Could not reach the payment provider. Please try again in a moment.', retry: true }) }
      // Ownership: the session must reference THIS account. A guessed or foreign
      // session id can never activate anyone.
      const owner = sess && (sess.client_reference_id || (sess.metadata && sess.metadata.workUserId))
      if (!sess || String(owner) !== String(u.id)) return res.status(403).json({ error: 'That checkout does not belong to this account.' })
      if (checkoutSessionPaid(sess)) {
        const r = await applyCheckoutSession(s, store, sess, {
          price: billingPriceMap(store),
          onNew: ({ user, plan, status, cycle, subId }) => sendOwnerSubscriptionAlertAsync('new_subscription', { user, plan, status, cycle, stripeId: subId }),
        })
        // "active" only when the account can actually use the service now; a paid
        // session whose subscription Stripe still reports as incomplete/past_due
        // is honest about it (the client keeps checking).
        if (hasAccess(u)) { console.log(`[onboarding] confirm -> user ${u.id} activated from ${sessionId}`); return done() }
        console.warn(`[onboarding] confirm -> user ${u.id} paid session ${sessionId} but subscription status ${r && r.status}`)
        return res.json({ status: 'processing', ...stateFor(req, idn) })
      }
      // Not (yet) paid: say which, so the client can wait, retry or re-open.
      const st = sess.status === 'expired' ? 'expired'
        : sess.status === 'open' ? 'open'
          : 'processing'   // complete but payment_status unpaid: an async payment method is settling
      res.json({ status: st, ...stateFor(req, idn) })
    } catch (e) { reply(res, e, 'Could not confirm the payment. Please try again.') }
  })

  // ---- enter the app -----------------------------------------------------------
  // The same gate every login path uses: with MFA on, an authenticator step
  // (setup on a brand-new account, verify on an existing one) through the
  // existing /api/work/login/mfa endpoints; with MFA off, the session is
  // established right here. Never grants access without entitlement.
  app.post('/api/work/onboarding/enter', (req, res) => {
    try {
      const idn = identity(req)
      if (!idn) return res.status(440).json({ error: 'Your sign-up session expired. Please sign in to continue.', restart: true })
      const u = idn.user
      if (u.disabled) return res.status(403).json({ error: 'This account has been disabled. Please contact your administrator.' })
      // Only a proven identity enters: a full sign-in, a verified email, or a
      // provider/IdP identity. (Billing being off never waives verification.)
      if (!idn.full && !(store.isEmailVerified(u) || u.social || u.ssoEmail)) return res.status(403).json({ error: 'Verify your email first.', needsVerification: true })
      if (!(hasAccess(u) || !billingConfigured(store))) return res.status(402).json({ error: 'A subscription is needed to start.', needsSubscription: true })
      store.completeOnboarding(u.id)
      if (idn.full) return res.json({ user: store.publicWorkUser(u) })
      if (!store.mfaGloballyEnabled()) {
        clearMarker(req)
        establishSession(req, u)
        return req.session.save(() => res.json({ user: store.publicWorkUser(u) }))
      }
      req.session.pendingMfaUid = u.id
      req.session.pendingMfaAt = Date.now()
      const body = store.mfaSetupNeeded(u.id)
        ? { mfaSetup: true, username: u.username, enroll: store.startMfaEnrollment(u.id) }
        : { mfaRequired: true, username: u.username }
      req.session.save(() => res.json(body))
    } catch (e) { reply(res, e, 'Could not open WorkCoPilot. Please try again.') }
  })
}

// ---- social sign-in hooks (called by social.js) ------------------------------
// The start URL may carry ?flow=onboarding&plan=&cycle=. social.js stashes what
// this returns on its own session record and hands it back on the callback.
export function socialOnboardingIntent(query = {}) {
  if (String(query.flow || '') !== 'onboarding') return null
  return { plan: cleanPlan(query.plan), cycle: cleanCycle(query.cycle) }
}
// Which account does a provider-VERIFIED email belong to? ONE rule for the plain
// social login and the subscribe flow (SUPREME RULE II):
//   * an account that PROVED this address (emailVerified) or an IdP identity
//     that is NOT company-SSO-bound -> that account
//   * a company SSO account (ssoEmail) -> refused: it signs in through its IdP
//     only (the password route enforces the same)
//   * an account that merely TYPED this address (unverified classic sign-up) ->
//     refused: never linked, never shadowed; its owner signs in or resets
//   * nobody -> create the social account (verified by the provider)
// Returns { user, isNew } or { error } (operator-facing English; social.js
// redirects with it).
export function resolveSocialAccount(store, { email, displayName = '', provider = '' }) {
  const existing = store.findUserByVerifiedLogin(email)
  if (existing) {
    if (existing.disabled) return { error: 'This account has been disabled. Please contact your administrator.' }
    if (existing.ssoEmail) return { error: "This is a company single sign-on account. Use 'Sign in with your company (SSO)' and enter your company email domain." }
    return { user: existing, isNew: false }
  }
  if (store.findUserByLogin(email)) return { error: 'An account with this email already exists. Sign in with your password, or reset it, to continue.' }
  // A first-time social sign-in CREATES an individual account, so it obeys the
  // same edition rule as email sign-up. Existing accounts still sign in above.
  const noSignup = soloSignupRefusal()
  if (noSignup) return { error: noSignup.body.error }
  try { return { user: store.createSocialUser({ email, displayName, provider }), isNew: true } }
  catch (e) { return { error: (e && e.message) || 'Sign-in could not be completed.' } }
}
// After a VERIFIED provider email resolved to `user` (new or existing): keep the
// plan, mark the marker, and land on the pay step. A brand-new social account is
// email-verified by the provider, so it skips the code; it also needs no profile
// form (the provider gave the name; nothing else is asked at sign-up).
export function finishSocialOnboarding(req, res, { store, user, isNew, intent }) {
  if (isNew) {
    user.needsProfile = false           // nothing else is asked at sign-up (the provider gave the name)
    store.markEmailVerified(user.id)   // persists (createSocialUser already set it; this also drops any code)
  }
  try { store.setOnboardingIntent(user.id, intent || {}) } catch { /* no plan yet: the pay step offers the picker */ }
  req.session.onboardingUid = user.id
  req.session.onboardingAt = Date.now()
  req.session.save(() => res.redirect('/workcopilot/signup/pay'))
}
