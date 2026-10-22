// ---------------------------------------------------------------------------
// WorkCoPilot - OIDC single sign-on (Authorization Code + PKCE).
// ---------------------------------------------------------------------------
// ONE implementation for Google, Microsoft (Entra) and Okta. The only thing
// that differs per provider is the issuer, which the company admin pastes in:
//   Google:     https://accounts.google.com
//   Microsoft:  https://login.microsoftonline.com/{tenant}/v2.0
//   Okta:       https://{org}.okta.com   (or a custom auth-server issuer)
// Everything else (authorize + token endpoints, the signing keys) is read from
// the issuer's /.well-known/openid-configuration, so adding another standards
// compliant provider needs no new code.
//
// Flow:
//   1. /api/work/sso/:companyId/start  builds the authorize URL (random state +
//      PKCE S256 challenge, both held in the session) and redirects to the IdP.
//   2. /api/work/sso/callback  verifies state, swaps the code for tokens at the
//      token endpoint, verifies the id_token (iss / aud / exp / nonce, and the
//      RS256 signature against the IdP's published JWKS when we can reach it),
//      reads the email, finds-or-creates a member in that company, signs them in
//      and sends them to /work.
//
// No secrets ever leave the server: the config's clientSecret lives only in
// getCompanySsoConfig (server side); publicCompany / getCompany stay secret-free.
// No em dashes in any operator-facing text.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'

// Where the IdP sends the browser back. It MUST match a redirect URI registered
// with the provider, so it is pinned by env in production and only derived from
// the request as a local-dev fallback. See SSO-NOTES.md.
//   WORK_SSO_REDIRECT_URI   full URL, wins outright
//   WORK_PUBLIC_ORIGIN      e.g. https://admireveda.com  (path is appended)
export function callbackUrl(req) {
  if (process.env.WORK_SSO_REDIRECT_URI) return process.env.WORK_SSO_REDIRECT_URI
  // WORK_PUBLIC_ORIGIN is the documented name; the hosted service actually sets
  // WORK_PUBLIC_URL to the same value, so honor both. This pins the redirect URI
  // deterministically in production instead of trusting forwarded headers (the
  // URI MUST match what is registered at the IdP exactly, or sign-in is refused).
  const origin = process.env.WORK_PUBLIC_ORIGIN || process.env.WORK_PUBLIC_URL
  if (origin) return origin.replace(/\/+$/, '') + '/api/work/sso/callback'
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim()
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}/api/work/sso/callback`
}

// --- small helpers ---------------------------------------------------------
function b64urlToBuf(s) {
  let t = String(s || '').replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  return Buffer.from(t, 'base64')
}
function decodeJwtPart(part) { return JSON.parse(b64urlToBuf(part).toString('utf8')) }
function asArray(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]) }

// --- discovery (cached per issuer) -----------------------------------------
// The well-known document is stable; cache it for an hour so a sign-in burst
// does not re-fetch it every time. A fetch failure is surfaced to the caller
// (never a silent fallback to a guessed endpoint).
const _discoCache = new Map() // issuer -> { doc, at }
const DISCO_TTL_MS = 60 * 60 * 1000

export async function discover(issuer) {
  const iss = String(issuer || '').replace(/\/+$/, '')
  if (!iss) throw httpish(400, 'This company has no SSO issuer configured.')
  const hit = _discoCache.get(iss)
  if (hit && (Date.now() - hit.at) < DISCO_TTL_MS) return hit.doc
  const url = iss + '/.well-known/openid-configuration'
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw httpish(502, `Could not read the identity provider settings (${res.status}).`)
  const doc = await res.json()
  if (!doc || !doc.authorization_endpoint || !doc.token_endpoint) {
    throw httpish(502, 'The identity provider settings are incomplete.')
  }
  _discoCache.set(iss, { doc, at: Date.now() })
  return doc
}

function httpish(status, message) { const e = new Error(message); e.status = status; return e }

// --- PKCE + state ----------------------------------------------------------
export function newPkce() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}
export function newState() { return crypto.randomBytes(24).toString('base64url') }

// --- authorize URL ----------------------------------------------------------
export function buildAuthorizeUrl(disco, cfg, { state, challenge, nonce, redirectUri }) {
  const u = new URL(disco.authorization_endpoint)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', cfg.clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('scope', 'openid email profile')
  u.searchParams.set('state', state)
  u.searchParams.set('nonce', nonce)
  u.searchParams.set('code_challenge', challenge)
  u.searchParams.set('code_challenge_method', 'S256')
  // Microsoft only returns a refresh token / behaves well with this; harmless
  // elsewhere. We do not request offline_access (no long-lived tokens kept).
  return u.toString()
}

// --- token exchange ---------------------------------------------------------
export async function exchangeCode(disco, cfg, { code, verifier, redirectUri }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    code_verifier: verifier,
  })
  // Most providers accept the secret in the body; this keeps one code path.
  if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret)
  const res = await fetch(disco.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: body.toString(),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || !data.id_token) {
    const why = (data && (data.error_description || data.error)) || `token request failed (${res.status})`
    throw httpish(502, `The identity provider rejected the sign-in: ${why}`)
  }
  return data // { id_token, access_token, ... }
}

// --- JWKS signature verification (a plus on top of claim checks) ------------
const _jwksCache = new Map() // jwks_uri -> { keys, at }
async function getJwks(disco) {
  if (!disco.jwks_uri) return null
  const hit = _jwksCache.get(disco.jwks_uri)
  if (hit && (Date.now() - hit.at) < DISCO_TTL_MS) return hit.keys
  const res = await fetch(disco.jwks_uri, { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  const doc = await res.json().catch(() => null)
  const keys = (doc && Array.isArray(doc.keys)) ? doc.keys : null
  if (keys) _jwksCache.set(disco.jwks_uri, { keys, at: Date.now() })
  return keys
}

// Verify the RS256 signature of a JWT against the IdP's JWKS. Returns:
//   true  -> signature checked and valid
//   false -> we could NOT verify (unknown alg, key not found, JWKS unreachable)
//   throws-> signature was present and DID NOT match (reject the token)
function verifySignature(disco, header, signingInput, signatureB64u) {
  if (header.alg !== 'RS256') return false
  return getJwks(disco).then((keys) => {
    if (!keys) return false
    const jwk = keys.find((k) => k.kid === header.kid) || keys.find((k) => k.kty === 'RSA')
    if (!jwk) return false
    let pub
    try { pub = crypto.createPublicKey({ key: jwk, format: 'jwk' }) } catch { return false }
    const ok = crypto.verify('RSA-SHA256', Buffer.from(signingInput), pub, b64urlToBuf(signatureB64u))
    if (!ok) throw httpish(401, 'The sign-in token could not be verified.')
    return true
  })
}

// Decode + verify the id_token. Always checks iss / aud / exp (and nonce when we
// issued one). Adds JWKS signature verification when the provider publishes keys
// and we can reach them; a signature MISMATCH always rejects, an unreachable
// JWKS degrades to claim-only checks rather than locking everyone out.
export async function verifyIdToken(idToken, cfg, disco, { nonce } = {}) {
  const parts = String(idToken || '').split('.')
  if (parts.length !== 3) throw httpish(401, 'The identity provider returned a malformed token.')
  const header = decodeJwtPart(parts[0])
  const claims = decodeJwtPart(parts[1])

  const expectIss = String(disco.issuer || cfg.issuer || '').replace(/\/+$/, '')
  const gotIss = String(claims.iss || '').replace(/\/+$/, '')
  if (expectIss && gotIss && gotIss !== expectIss) throw httpish(401, 'The sign-in token came from an unexpected source.')

  const auds = asArray(claims.aud)
  if (cfg.clientId && !auds.includes(cfg.clientId)) throw httpish(401, 'The sign-in token was issued for a different application.')

  const now = Math.floor(Date.now() / 1000)
  if (claims.exp && now > Number(claims.exp) + 60) throw httpish(401, 'The sign-in token has expired. Please try again.')
  if (claims.nbf && now + 60 < Number(claims.nbf)) throw httpish(401, 'The sign-in token is not valid yet.')
  if (nonce && claims.nonce && claims.nonce !== nonce) throw httpish(401, 'The sign-in could not be matched to your request.')

  try {
    await verifySignature(disco, header, `${parts[0]}.${parts[1]}`, parts[2])
  } catch (e) {
    if (e && e.status === 401) throw e           // a real signature mismatch: reject
    // any other failure (network, parse) degrades to the claim checks above
  }
  return claims
}

export function extractEmail(claims) {
  const email = claims && (claims.email || claims.preferred_username || claims.upn)
  const s = String(email || '').trim().toLowerCase()
  return s.includes('@') ? s : ''
}

// ---------------------------------------------------------------------------
// Routes. Registered from server/index.js with the gates it already defines.
// ---------------------------------------------------------------------------
export function registerSsoRoutes(app, deps = {}) {
  const { store, establishSession, requireAuth, requireWorkAuth, requireSuperAdmin, requireCompanyAdmin, wrap } = deps
  if (!app || !store || !establishSession || !requireAuth || !requireWorkAuth || !requireSuperAdmin || !requireCompanyAdmin || !wrap) {
    throw new Error('registerSsoRoutes: missing required deps')
  }
  const loginError = (res, msg) => res.redirect('/workcopilot/login?sso_error=' + encodeURIComponent(msg || 'Single sign-on could not be completed.'))

  // Public: resolve a company domain to its id so the login page can start SSO
  // without the user knowing their company id. Non-secret (id + provider only).
  app.get('/api/work/sso/resolve', wrap((req, res) => {
    const domain = String(req.query.domain || '').trim().toLowerCase()
    if (!domain) return res.status(400).json({ error: 'Enter your company domain.' })
    const c = store.findCompanyBySsoDomain(domain)
    if (!c) return res.status(404).json({ error: 'No company is set up for single sign-on with that domain.' })
    res.json({ companyId: c.id, provider: c.sso ? c.sso.provider : null, name: c.name })
  }))

  // Start: build the authorize URL and redirect to the IdP.
  app.get('/api/work/sso/:companyId/start', async (req, res) => {
    try {
      const cfg = store.getCompanySsoConfig(req.params.companyId)
      if (!cfg || !cfg.connected) return loginError(res, 'Single sign-on is not set up for this company yet.')
      const disco = await discover(cfg.issuer)
      const { verifier, challenge } = newPkce()
      const state = newState()
      const nonce = newState()
      req.session.sso = { state, verifier, nonce, companyId: req.params.companyId }
      const url = buildAuthorizeUrl(disco, cfg, { state, challenge, nonce, redirectUri: callbackUrl(req) })
      req.session.save(() => res.redirect(url))
    } catch (e) {
      loginError(res, e.message || 'Could not start single sign-on.')
    }
  })

  // Callback: verify state, swap the code, verify the token, sign the user in.
  app.get('/api/work/sso/callback', async (req, res) => {
    try {
      if (req.query.error) return loginError(res, String(req.query.error_description || req.query.error))
      const sess = req.session.sso || null
      const { code, state } = req.query
      if (!sess || !code || !state || state !== sess.state) {
        return loginError(res, 'Your sign-in request expired. Please try again.')
      }
      req.session.sso = null // one-time use
      const cfg = store.getCompanySsoConfig(sess.companyId)
      if (!cfg || !cfg.connected) return loginError(res, 'Single sign-on is no longer set up for this company.')
      const disco = await discover(cfg.issuer)
      const tokens = await exchangeCode(disco, cfg, { code: String(code), verifier: sess.verifier, redirectUri: callbackUrl(req) })
      const claims = await verifyIdToken(tokens.id_token, cfg, disco, { nonce: sess.nonce })
      const email = extractEmail(claims)
      if (!email) return loginError(res, 'The identity provider did not share an email address.')
      // Defense in depth: never trust an unverified email (the email -> company
      // mapping is the whole identity, so an unverified address could be spoofed
      // to match someone else's pre-provisioned seat). Only reject when the
      // provider explicitly says false (many providers omit the claim).
      if (claims.email_verified === false) return loginError(res, 'Your email is not verified with your identity provider. Verify it, then sign in again.')
      // Invite-only by default: the email must already be pre-provisioned on the
      // company (resolveSsoLogin refuses an unknown email in explicit mode, or
      // creates a member in auto mode). This is what caps the licenses.
      const user = store.resolveSsoLogin({ companyId: sess.companyId, email })
      establishSession(req, user)
      req.session.save(() => res.redirect('/work'))
    } catch (e) {
      loginError(res, e.message || 'Single sign-on could not be completed.')
    }
  })

  // Everything a config form needs to prefill, with the client SECRET removed.
  // Issuer and client id are not secrets, so they are safe to show the admin who
  // owns the company; the secret is never returned (write-only).
  const ssoStatus = (companyId) => {
    const cfg = store.getCompanySsoConfig(companyId)
    if (!cfg) return null
    return { provider: cfg.provider || null, connected: !!cfg.connected, domain: cfg.domain || '', issuer: cfg.issuer || '', clientId: cfg.clientId || '', hasSecret: !!cfg.clientSecret }
  }

  // Superadmin: set / read a company's SSO config (secret write-only).
  app.post('/api/work/admin/companies/:id/sso', requireAuth, requireSuperAdmin, wrap((req, res) => {
    res.json(store.setCompanySso(req.params.id, req.body || {}))
  }))
  app.get('/api/work/admin/companies/:id/sso', requireAuth, requireSuperAdmin, wrap((req, res) => {
    if (!store.getCompany(req.params.id)) return res.status(404).json({ error: 'Company not found.' })
    res.json({ sso: ssoStatus(req.params.id) })
  }))

  // Company admin: set / read SSO for their OWN company.
  app.post('/api/work/company/sso', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.setCompanySso(req.workUser.companyId, req.body || {}))
  }))
  app.get('/api/work/company/sso', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ sso: ssoStatus(req.workUser.companyId) })
  }))
}

export default { registerSsoRoutes }
