// ---------------------------------------------------------------------------
// WorkCoPilot - SAML 2.0 single sign-on, service provider side.
// ---------------------------------------------------------------------------
// Per company (the company id is in every URL, so an assertion can only ever
// sign someone into the company whose identity provider signed it):
//   GET  /api/work/sso/saml/:companyId/metadata   SP metadata (entity id + ACS)
//   GET  /api/work/sso/saml/:companyId/login      starts sign-in (SP-initiated)
//   POST /api/work/sso/saml/:companyId/acs        the assertion consumer service
//
// Verification is done by @node-saml/node-saml, never by hand: the XML
// signature against the company's IdP certificate(s) (assertion signature
// required), the audience (our entity id), NotBefore / NotOnOrAfter (2 minutes
// of clock skew), the Issuer, InResponseTo against the request we issued
// (`always`: unsolicited responses are refused) and assertion replay
// (rejectReplayedAssertions). On top, saml_rules.js checks what node-saml 5
// only logs: the bearer Recipient and the Response Destination name our ACS.
// No XML with a DOCTYPE is ever parsed (saml_rules.safeParseXml).
//
// Login CSRF: the RelayState is a random value also set in a short-lived,
// httpOnly cookie on /login. The ACS accepts a response only when the two
// match, so a response started in someone else's browser cannot sign a victim
// in. The cookie is SameSite=None (Secure) on HTTPS because the IdP posts to
// the ACS cross-site; over plain local HTTP it is Lax.
//
// After verification the same rules as OIDC apply: resolveSsoLogin (invite-only
// or automatic JIT with the SAML sign-in domain), ssoAccountRefusal (turned-off
// accounts and disabled companies never sign in), then establishSession (the
// single-session epoch). The identity provider owns the second factor, exactly
// as for OIDC.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import express from 'express'
import { SAML, InMemoryCacheProvider } from '@node-saml/node-saml'
import { spValues, mapAttributes, checkRecipient, checkDestination, safeParseXml, MAX_RESPONSE_BYTES } from './saml_rules.js'
import { publicOrigin, sessionIsCompanyAdminOf, SSO_TEST_DONE_PATH } from './sso.js'
import { ssoAccountRefusal } from './sign_in_rules.js'

const REQUEST_TTL_MS = 10 * 60 * 1000
const CLOCK_SKEW_MS = 2 * 60 * 1000
const RELAY_COOKIE = 'wcp_saml_rs'
const RELAY_PATH = '/api/work/sso/saml/'

// ONE cache for every company: the AuthnRequest ids we issued (InResponseTo)
// and the assertion ids already accepted (replay), each expiring on its own.
export const samlCache = new InMemoryCacheProvider({ keyExpirationPeriodMs: REQUEST_TTL_MS })
// RelayState -> { companyId, test, at } (one-time, in memory).
const relays = new Map()
function putRelay(value, rec) {
  relays.set(value, rec)
  const cutoff = Date.now() - REQUEST_TTL_MS
  for (const [k, v] of relays) { if (v.at < cutoff) relays.delete(k); else break }
  if (relays.size > 20000) relays.delete(relays.keys().next().value)
}
function takeRelay(value) {
  const rec = relays.get(value)
  relays.delete(value)
  if (!rec || Date.now() - rec.at > REQUEST_TTL_MS) return null
  return rec
}

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// The SP metadata a company pastes (or points) its identity provider at.
export function spMetadataXml(sp) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${xmlEsc(sp.entityId)}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${xmlEsc(sp.acsUrl)}" index="1" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>
`
}

// node-saml for one company's configuration.
export function samlFor(cfg, sp, { cacheProvider = samlCache } = {}) {
  return new SAML({
    entryPoint: cfg.idpSsoUrl,
    issuer: sp.entityId,
    audience: sp.entityId,
    callbackUrl: sp.acsUrl,
    idpIssuer: cfg.idpEntityId,
    idpCert: cfg.certs.map((c) => c.pem),
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    validateInResponseTo: 'always',
    rejectReplayedAssertions: true,
    cacheProvider,
    requestIdExpirationPeriodMs: REQUEST_TTL_MS,
    acceptedClockSkewMs: CLOCK_SKEW_MS,
    identifierFormat: null,
    disableRequestedAuthnContext: true,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
  })
}

// Verify one posted SAMLResponse for a company. Returns { email, displayName }
// or throws with an operator-facing message. Pure of Express (tests call it).
export async function verifySamlResponse(cfg, sp, samlResponseB64, { cacheProvider = samlCache } = {}) {
  const b64 = String(samlResponseB64 || '')
  if (!b64) throw new Error('The identity provider sent no SAML response.')
  if (b64.length > Math.ceil(MAX_RESPONSE_BYTES * 4 / 3) + 4) throw new Error('The SAML response is too large.')
  const xml = Buffer.from(b64, 'base64').toString('utf8')
  safeParseXml(xml, { maxBytes: MAX_RESPONSE_BYTES, what: 'SAML response' })   // DOCTYPE / malformed refused before node-saml sees it
  if (!checkDestination(xml, sp.acsUrl)) throw new Error('The SAML response was sent to a different address.')
  const saml = samlFor(cfg, sp, { cacheProvider })
  let result
  try { result = await saml.validatePostResponseAsync({ SAMLResponse: b64 }) } catch (e) { throw new Error(`The SAML response was rejected: ${String((e && e.message) || 'invalid').slice(0, 200)}`) }
  const profile = result && result.profile
  if (!profile) throw new Error('The SAML response carried no sign-in.')
  const assertionXml = typeof profile.getAssertionXml === 'function' ? profile.getAssertionXml() : ''
  if (!assertionXml || !checkRecipient(assertionXml, sp.acsUrl)) throw new Error('The SAML assertion is not addressed to this service (Recipient).')
  const { email, displayName } = mapAttributes(profile, cfg)
  if (!email) throw new Error('The identity provider did not share an email address. Map an email attribute in your identity provider.')
  return { email, displayName }
}

export function registerSamlRoutes(app, deps = {}) {
  const { store, establishSession, wrap, hosted = false } = deps
  if (!app || !store || !establishSession || !wrap) throw new Error('registerSamlRoutes: missing required deps')
  const loginError = (res, msg) => res.redirect('/workcopilot/login?sso_error=' + encodeURIComponent(msg || 'Single sign-on could not be completed.'))
  const spFor = (req, companyId) => spValues(publicOrigin(req), companyId)
  // The IdP posts to the ACS cross-site, so the RelayState cookie must be
  // SameSite=None, which browsers accept only with Secure: on HTTPS, and on a
  // loopback host (browsers treat http://localhost and 127.0.0.1 as a secure
  // context), which is how local development and the E2E suite run.
  const loopback = (req) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(String(req.headers.host || ''))
  const secureCookie = (req) => hosted || /^https:/i.test(publicOrigin(req)) || loopback(req)
  const cookieOpts = (req) => ({ httpOnly: true, secure: secureCookie(req), sameSite: secureCookie(req) ? 'none' : 'lax', path: RELAY_PATH, maxAge: REQUEST_TTL_MS })

  app.get('/api/work/sso/saml/:companyId/metadata', wrap((req, res) => {
    if (!store.getCompany(req.params.companyId)) return res.status(404).json({ error: 'Company not found.' })
    res.type('application/samlmetadata+xml').send(spMetadataXml(spFor(req, req.params.companyId)))
  }))

  app.get('/api/work/sso/saml/:companyId/login', async (req, res) => {
    const companyId = req.params.companyId
    try {
      const cfg = store.getCompanySamlConfig(companyId)
      if (!cfg || !cfg.connected) return loginError(res, 'SAML single sign-on is not set up for this company yet.')
      const test = req.query.test === '1'
      if (test && !sessionIsCompanyAdminOf(store, req, companyId)) return loginError(res, 'Only a company admin of this company can run a test sign-in.')
      const relay = crypto.randomBytes(24).toString('base64url')
      putRelay(relay, { companyId, test, at: Date.now() })
      const url = await samlFor(cfg, spFor(req, companyId)).getAuthorizeUrlAsync(relay, req.headers.host, {})
      res.cookie(RELAY_COOKIE, relay, cookieOpts(req))
      res.redirect(url)
    } catch (e) {
      loginError(res, (e && e.message) || 'Could not start single sign-on.')
    }
  })

  const acsBody = express.urlencoded({ extended: false, limit: '2mb' })
  app.post('/api/work/sso/saml/:companyId/acs', acsBody, async (req, res) => {
    const companyId = req.params.companyId
    const relay = String((req.body && req.body.RelayState) || '')
    const cookieRelay = readCookie(req, RELAY_COOKIE)
    res.clearCookie(RELAY_COOKIE, { ...cookieOpts(req), maxAge: undefined })
    const sameRelay = relay && cookieRelay && relay.length === cookieRelay.length && crypto.timingSafeEqual(Buffer.from(relay), Buffer.from(cookieRelay))
    const pending = sameRelay ? takeRelay(relay) : null
    if (!pending || pending.companyId !== companyId) return loginError(res, 'Your sign-in request expired. Start single sign-on from the sign-in page again.')
    try {
      const cfg = store.getCompanySamlConfig(companyId)
      if (!cfg || !cfg.connected) throw new Error('SAML single sign-on is no longer set up for this company.')
      const { email, displayName } = await verifySamlResponse(cfg, spFor(req, companyId), req.body && req.body.SAMLResponse)
      if (pending.test) {
        store.recordSsoTest(companyId, { protocol: 'saml', ok: true, ...store.previewSsoSignIn({ companyId, email, displayName, via: 'saml' }) })
        return res.redirect(SSO_TEST_DONE_PATH)
      }
      const user = store.resolveSsoLogin({ companyId, email, displayName: displayName || null, via: 'saml' })
      const refused = ssoAccountRefusal(user, store.getCompany(companyId))
      if (refused) return loginError(res, refused)
      // A fresh session (the old one, if any, is not carried across a cross-site POST).
      req.session.regenerate((err) => {
        if (err) return loginError(res, 'Single sign-on could not be completed.')
        establishSession(req, user)
        req.session.save(() => res.redirect('/work'))
      })
    } catch (e) {
      const msg = (e && e.message) || 'Single sign-on could not be completed.'
      if (pending.test) {
        store.recordSsoTest(companyId, { protocol: 'saml', ok: false, outcome: 'failed', reason: msg })
        return res.redirect(SSO_TEST_DONE_PATH)
      }
      loginError(res, msg)
    }
  })
}

function readCookie(req, name) {
  const raw = req.headers && req.headers.cookie
  if (!raw) return ''
  for (const part of String(raw).split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) { try { return decodeURIComponent(part.slice(i + 1).trim()) } catch { return '' } }
  }
  return ''
}

export default { registerSamlRoutes, verifySamlResponse, spMetadataXml }
