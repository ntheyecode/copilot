// ===========================================================================
// Company single sign-on state beyond OIDC: the SAML 2.0 connection, the
// "single sign-on required" policy, and the sign-in domain shared by both
// protocols. Orchestration only; the decisions (metadata parsing, certificate
// checks, config validation) are the pure rules in saml_rules.js.
//
// Created by the store with its context (it never imports the store, so there
// is no circular import); the store stays the single owner of db + persist and
// re-exports this API (owner rule: no monolith files).
//
// One sign-in domain per company per protocol, and a domain belongs to exactly
// ONE company across BOTH protocols: otherwise a second tenant could claim
// another tenant's domain and have its people routed to the wrong identity
// provider (domainOwnedByOther is the one check every writer calls).
//
// ctx: { db: () => object, persist, httpErr, normalizeDomain, isDomain(d), audit({...}) }
// ===========================================================================
import { validateSamlConfig } from './saml_rules.js'
import { SAML_PROVIDER_IDS } from './idp_catalog.js'

export function createSsoState(ctx) {
  const { persist, httpErr, normalizeDomain, isDomain } = ctx
  const companies = () => (ctx.db().companies || [])
  const find = (companyId) => companies().find((c) => c.id === companyId) || null
  const must = (companyId) => { const c = find(companyId); if (!c) throw httpErr(404, 'Company not found.'); return c }
  const oidcConnected = (c) => !!(c && c.sso && c.sso.connected)
  const samlConnected = (c) => !!(c && c.saml && c.saml.connected)

  function domainOwnedByOther(domain, companyId) {
    const d = normalizeDomain(domain)
    if (!d) return false
    return companies().some((x) => x.id !== companyId && (
      (x.sso && normalizeDomain(x.sso.domain) === d) || (x.saml && normalizeDomain(x.saml.domain) === d)))
  }

  // The company (raw) a typed email domain signs in with, and how. SAML wins
  // when both protocols claim the same domain (the enterprise default).
  function companyForSignInDomain(domain) {
    const d = normalizeDomain(domain)
    if (!d) return null
    for (const c of companies()) {
      if (samlConnected(c) && c.saml.domain && normalizeDomain(c.saml.domain) === d) return { company: c, protocol: 'saml' }
    }
    for (const c of companies()) {
      if (oidcConnected(c) && c.sso.domain && normalizeDomain(c.sso.domain) === d) return { company: c, protocol: 'oidc' }
    }
    return null
  }

  function signInDomainOf(c, via) {
    if (!c) return ''
    if (via === 'saml') return c.saml ? normalizeDomain(c.saml.domain) : ''
    return c.sso ? normalizeDomain(c.sso.domain) : ''
  }

  function setCompanySaml(companyId, input = {}, { by = '' } = {}) {
    const c = must(companyId)
    const prior = c.saml || null
    const v = validateSamlConfig(input, prior)
    const provider = String(input.provider || (prior && prior.provider) || 'saml').trim().toLowerCase()
    if (!SAML_PROVIDER_IDS.includes(provider)) throw httpErr(400, 'Pick a supported identity provider, or "Other (any SAML 2.0)".')
    const domain = normalizeDomain(input.domain != null ? input.domain : (prior && prior.domain))
    if (domain && !isDomain(domain)) throw httpErr(400, 'The email domain must look like example.com (no @, no https://, no path).')
    if (domain && domainOwnedByOther(domain, c.id)) throw httpErr(409, 'That email domain is already connected to another company. Ask the AdmireVeda team if you believe this is a mistake.')
    c.saml = { provider, ...v, domain, connected: true, updatedAt: new Date().toISOString() }
    persist()
    try { ctx.audit({ userId: null, companyId: c.id, action: 'saml_configured', reason: 'SAML single sign-on saved', detail: `by ${by || 'unknown'}; IdP ${v.idpEntityId}` }) } catch { /* audit never blocks */ }
    return samlStatus(c.id)
  }

  function clearCompanySaml(companyId, { by = '' } = {}) {
    const c = must(companyId)
    if (c.ssoRequired && !oidcConnected(c)) throw httpErr(409, 'Single sign-on is required for this company. Ask AdmireVeda to turn that off before removing the last connection.')
    c.saml = null
    persist()
    try { ctx.audit({ userId: null, companyId: c.id, action: 'saml_removed', reason: 'SAML single sign-on removed', detail: `by ${by || 'unknown'}` }) } catch { /* audit never blocks */ }
    return { saml: null }
  }

  // Server-only: the raw config (certificates included; nothing in it is secret).
  function getCompanySamlConfig(companyId) {
    const c = find(companyId)
    return (c && c.saml) ? { ...c.saml, certs: (c.saml.certs || []).map((x) => ({ ...x })) } : null
  }

  // What the company admin and the superadmin see. Certificates are public
  // material; only their fingerprint, subject and expiry are shown.
  function samlStatus(companyId) {
    const c = find(companyId)
    if (!c || !c.saml) return null
    const s = c.saml
    const now = Date.now()
    return {
      provider: s.provider || 'saml', connected: !!s.connected, domain: s.domain || '',
      idpEntityId: s.idpEntityId || '', idpSsoUrl: s.idpSsoUrl || '',
      emailAttribute: s.emailAttribute || '', nameAttribute: s.nameAttribute || '',
      certs: (s.certs || []).map((x) => ({ fingerprint: x.fingerprint, subject: x.subject, notAfter: x.notAfter, expired: !!(x.notAfter && Date.parse(x.notAfter) < now) })),
      updatedAt: s.updatedAt || null,
    }
  }

  // Superadmin: require single sign-on for every account of this company
  // (password sign-in is then refused; sign_in_rules.js). Only with a live
  // connection, or nobody could sign in at all.
  function setCompanySsoRequired(companyId, required, { by = '', reason = '' } = {}) {
    const c = must(companyId)
    const want = !!required
    if (want && !oidcConnected(c) && !samlConnected(c)) throw httpErr(409, 'Connect single sign-on (OIDC or SAML) for this company first, then require it.')
    c.ssoRequired = want
    persist()
    try { ctx.audit({ userId: null, companyId: c.id, action: want ? 'sso_required_on' : 'sso_required_off', reason: String(reason || (want ? 'single sign-on required' : 'single sign-on no longer required')).slice(0, 300), detail: `by ${by || 'unknown'}` }) } catch { /* audit never blocks */ }
    return { ssoRequired: c.ssoRequired }
  }

  // ---- Test sign-in (company console) --------------------------------------
  // What a real sign-in with this email WOULD do, without doing it: the same
  // rules as resolveSsoLogin (invite-only vs automatic, the sign-in domain),
  // read-only. outcome: 'existing' | 'would_create' | 'refused'.
  function previewSsoSignIn({ companyId, email, displayName = null, via = 'oidc' } = {}) {
    const c = must(companyId)
    const mail = String(email || '').trim().toLowerCase()
    const base = { email: mail, displayName: displayName || null }
    const existing = ctx.findMember(companyId, mail)
    if (existing) {
      if (existing.disabled || existing.scimDeletedAt) return { ...base, outcome: 'refused', reason: 'This account has been turned off.' }
      return { ...base, outcome: 'existing', account: existing.username }
    }
    if (c.ssoProvisioning !== 'auto') return { ...base, outcome: 'refused', reason: 'This email is not on the company yet (invite-only). Add the person first, or provision them with SCIM.' }
    const want = signInDomainOf(c, via)
    if (want && mail.slice(mail.lastIndexOf('@') + 1) !== want) return { ...base, outcome: 'refused', reason: `Only ${want} email addresses can join through single sign-on.` }
    return { ...base, outcome: 'would_create' }
  }
  // The last test result per company, in memory only (a diagnostic, never a
  // record): the console reads it after the identity provider redirects back.
  const tests = new Map()
  function recordSsoTest(companyId, result) {
    tests.set(String(companyId), { ...result, at: new Date().toISOString() })
    if (tests.size > 5000) tests.delete(tests.keys().next().value)
  }
  function lastSsoTest(companyId) { return tests.get(String(companyId)) || null }

  return { domainOwnedByOther, companyForSignInDomain, signInDomainOf, setCompanySaml, clearCompanySaml, getCompanySamlConfig, samlStatus, setCompanySsoRequired, samlConnected, oidcConnected, previewSsoSignIn, recordSsoTest, lastSsoTest }
}

export default { createSsoState }
