// ---------------------------------------------------------------------------
// WorkCoPilot - social sign-in for INDIVIDUAL users.
// ---------------------------------------------------------------------------
// Google + Microsoft reuse the OIDC machinery in sso.js (discovery, PKCE, token
// exchange, id_token verification). Facebook is plain OAuth2 (no OIDC), so it has
// a small dedicated path (/dialog/oauth -> /oauth/access_token -> /me).
//
// Flow:
//   1. /api/work/social/:provider/start  builds the authorize URL (state + PKCE
//      for OIDC) and redirects to the provider.
//   2. /api/work/social/callback         verifies state, gets the verified email
//      + name, finds-or-creates an INDIVIDUAL account (no company), and:
//        - existing account -> MFA gate (TOTP required, owner's rule), redirect
//          to the SPA which finishes via the normal /login/mfa endpoints.
//        - new account       -> profile-completion step (collect phone / name the
//          provider did not give), then the same MFA gate.
//   3. /api/work/social/pending   tells the SPA which step to show after the
//      redirect (profile | mfa_setup | mfa_verify).
//   4. /api/work/social/complete  saves the new user's profile, then starts MFA.
//
// Secrets (client ids/secrets) come ONLY from env and never leave the server.
// A provider with no env configured is simply reported as unavailable, and its
// button is shown disabled. No em dashes in operator-facing text.
// ---------------------------------------------------------------------------
import { discover, newPkce, newState, buildAuthorizeUrl, exchangeCode, verifyIdToken, extractEmail } from './sso.js'

const MFA_PENDING_TTL_MS = 15 * 60 * 1000
const FB_VER = 'v19.0'

// A provider is "configured" when it has both a client id and secret in env.
function cfgFor(provider) {
  const P = String(provider || '').toLowerCase()
  const e = process.env
  if (P === 'google') {
    return (e.WORK_GOOGLE_CLIENT_ID && e.WORK_GOOGLE_CLIENT_SECRET)
      ? { kind: 'oidc', issuer: 'https://accounts.google.com', clientId: e.WORK_GOOGLE_CLIENT_ID, clientSecret: e.WORK_GOOGLE_CLIENT_SECRET } : null
  }
  if (P === 'microsoft') {
    const tenant = e.WORK_MICROSOFT_TENANT || 'common'
    return (e.WORK_MICROSOFT_CLIENT_ID && e.WORK_MICROSOFT_CLIENT_SECRET)
      ? { kind: 'oidc', issuer: `https://login.microsoftonline.com/${tenant}/v2.0`, clientId: e.WORK_MICROSOFT_CLIENT_ID, clientSecret: e.WORK_MICROSOFT_CLIENT_SECRET } : null
  }
  if (P === 'facebook') {
    return (e.WORK_FACEBOOK_CLIENT_ID && e.WORK_FACEBOOK_CLIENT_SECRET)
      ? { kind: 'oauth2', clientId: e.WORK_FACEBOOK_CLIENT_ID, clientSecret: e.WORK_FACEBOOK_CLIENT_SECRET } : null
  }
  return null
}
export function socialConfigured() {
  return { google: !!cfgFor('google'), microsoft: !!cfgFor('microsoft'), facebook: !!cfgFor('facebook') }
}

// The redirect URI MUST match what is registered at each provider. Pinned by env
// in production; derived from the request only as a local-dev fallback.
function socialCallbackUrl(req) {
  if (process.env.WORK_SOCIAL_REDIRECT_URI) return process.env.WORK_SOCIAL_REDIRECT_URI
  const origin = process.env.WORK_PUBLIC_ORIGIN || process.env.WORK_PUBLIC_URL
  if (origin) return origin.replace(/\/+$/, '') + '/api/work/social/callback'
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim()
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}/api/work/social/callback`
}

export function registerSocialRoutes(app, deps = {}) {
  const { store, establishSession, wrap } = deps
  if (!app || !store || !establishSession || !wrap) throw new Error('registerSocialRoutes: missing required deps')
  const loginError = (res, msg) => res.redirect('/workcopilot/login?social_error=' + encodeURIComponent(msg || 'Sign-in could not be completed.'))

  // Which providers are actually configured, so the UI shows/disables buttons.
  app.get('/api/work/social/providers', wrap((req, res) => res.json({ providers: socialConfigured() })))

  // Start: build the authorize URL and redirect to the provider.
  app.get('/api/work/social/:provider/start', async (req, res) => {
    try {
      const provider = String(req.params.provider || '').toLowerCase()
      const cfg = cfgFor(provider)
      if (!cfg) return loginError(res, 'That sign-in method is not set up yet.')
      const state = newState()
      const redirectUri = socialCallbackUrl(req)
      if (cfg.kind === 'oidc') {
        const disco = await discover(cfg.issuer)
        const { verifier, challenge } = newPkce()
        const nonce = newState()
        req.session.social = { provider, state, verifier, nonce, issuer: cfg.issuer }
        const url = buildAuthorizeUrl(disco, cfg, { state, challenge, nonce, redirectUri })
        req.session.save(() => res.redirect(url))
      } else {
        req.session.social = { provider, state }
        const u = new URL(`https://www.facebook.com/${FB_VER}/dialog/oauth`)
        u.searchParams.set('client_id', cfg.clientId)
        u.searchParams.set('redirect_uri', redirectUri)
        u.searchParams.set('state', state)
        u.searchParams.set('scope', 'email,public_profile')
        u.searchParams.set('response_type', 'code')
        req.session.save(() => res.redirect(u.toString()))
      }
    } catch (e) { loginError(res, e.message || 'Could not start sign-in.') }
  })

  // Callback: verify, get the verified email + name, find-or-create the account.
  app.get('/api/work/social/callback', async (req, res) => {
    try {
      if (req.query.error) return loginError(res, String(req.query.error_description || req.query.error))
      const sess = req.session.social || null
      const { code, state } = req.query
      if (!sess || !code || !state || state !== sess.state) return loginError(res, 'Your sign-in request expired. Please try again.')
      req.session.social = null
      const provider = sess.provider
      const cfg = cfgFor(provider)
      if (!cfg) return loginError(res, 'That sign-in method is no longer available.')
      const redirectUri = socialCallbackUrl(req)
      let email = '', name = ''
      if (cfg.kind === 'oidc') {
        const disco = await discover(cfg.issuer)
        const tokens = await exchangeCode(disco, cfg, { code: String(code), verifier: sess.verifier, redirectUri })
        const claims = await verifyIdToken(tokens.id_token, cfg, disco, { nonce: sess.nonce })
        if (claims.email_verified === false) return loginError(res, 'Your email is not verified with your provider. Verify it, then sign in again.')
        email = extractEmail(claims)
        name = String(claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || '').trim()
      } else {
        const tu = new URL(`https://graph.facebook.com/${FB_VER}/oauth/access_token`)
        tu.searchParams.set('client_id', cfg.clientId)
        tu.searchParams.set('client_secret', cfg.clientSecret)
        tu.searchParams.set('redirect_uri', redirectUri)
        tu.searchParams.set('code', String(code))
        const tr = await fetch(tu.toString(), { headers: { accept: 'application/json' } }).then((r) => r.json()).catch(() => null)
        if (!tr || !tr.access_token) return loginError(res, 'Facebook rejected the sign-in.')
        const me = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tr.access_token)}`, { headers: { accept: 'application/json' } }).then((r) => r.json()).catch(() => null)
        email = String((me && me.email) || '').trim().toLowerCase()
        name = String((me && me.name) || '').trim()
      }
      if (!email || !email.includes('@')) return loginError(res, 'Your provider did not share an email address. Please use email sign-up instead.')

      const existing = store.findUserByLogin(email)
      if (existing) {
        if (existing.disabled) return loginError(res, 'This account has been disabled. Please contact your administrator.')
        if (!store.mfaGloballyEnabled()) { establishSession(req, existing); return req.session.save(() => res.redirect('/work')) }
        req.session.pendingMfaUid = existing.id
        req.session.pendingMfaAt = Date.now()
        return req.session.save(() => res.redirect('/workcopilot/login?social=1'))
      }
      // New account: create it (no password; social-linked), then collect profile.
      const u = store.createSocialUser({ email, displayName: name, provider })
      req.session.pendingSocialUid = u.id
      req.session.pendingSocialAt = Date.now()
      req.session.save(() => res.redirect('/workcopilot/login?social=complete'))
    } catch (e) { loginError(res, e.message || 'Sign-in could not be completed.') }
  })

  // The SPA asks what to do after the provider redirect: finish the profile for a
  // brand-new user, or go straight to the MFA gate for an existing one.
  app.get('/api/work/social/pending', wrap((req, res) => {
    const now = Date.now()
    const sUid = req.session && req.session.pendingSocialUid
    const sAt = req.session && req.session.pendingSocialAt
    if (sUid && sAt && (now - sAt) <= MFA_PENDING_TTL_MS) {
      const u = store.getUser(sUid)
      if (u) return res.json({ step: 'profile', name: u.displayName || '', email: u.email || '' })
    }
    const mUid = req.session && req.session.pendingMfaUid
    const mAt = req.session && req.session.pendingMfaAt
    if (mUid && mAt && (now - mAt) <= MFA_PENDING_TTL_MS) {
      const u = store.getUser(mUid)
      if (u) {
        return store.mfaSetupNeeded(u.id)
          ? res.json({ step: 'mfa_setup', username: u.username, enroll: store.startMfaEnrollment(u.id) })
          : res.json({ step: 'mfa_verify', username: u.username })
      }
    }
    res.status(440).json({ error: 'Your sign-in session expired. Please sign in again.', restart: true })
  }))

  // New social user completes name/phone, then MFA setup (TOTP required).
  app.post('/api/work/social/complete', wrap((req, res) => {
    const now = Date.now()
    const uid = req.session && req.session.pendingSocialUid
    const at = req.session && req.session.pendingSocialAt
    if (!uid || !at || (now - at) > MFA_PENDING_TTL_MS) return res.status(440).json({ error: 'Your sign-in session expired. Please sign in again.', restart: true })
    const b = req.body || {}
    const name = String(b.name || b.displayName || '').trim()
    if (!name) return res.status(400).json({ error: 'Enter your full name.' })
    store.completeSocialProfile(uid, { displayName: name, phone: b.phone, email: b.email })
    delete req.session.pendingSocialUid
    delete req.session.pendingSocialAt
    const u = store.getUser(uid)
    if (!store.mfaGloballyEnabled()) { establishSession(req, u); return req.session.save(() => res.json({ user: store.publicWorkUser(u) })) }
    req.session.pendingMfaUid = uid
    req.session.pendingMfaAt = Date.now()
    req.session.save(() => res.json({ mfaSetup: true, username: u.username, enroll: store.startMfaEnrollment(uid) }))
  }))
}

export default { registerSocialRoutes, socialConfigured }
