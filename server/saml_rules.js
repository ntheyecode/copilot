// ---------------------------------------------------------------------------
// SAML 2.0 service provider: the PURE rules (no store, no Express, no network).
// ---------------------------------------------------------------------------
//   * parseIdpMetadata(xml)     IdP metadata -> entity id, SSO URL, signing certs
//   * normalizeCerts(text)      one or more PEM / base64 certificates -> checked list
//   * validateSamlConfig(input) the whole company config, or a 400 with the reason
//   * mapAttributes(profile)    email + display name from the assertion attributes
//   * checkRecipient(xml, acs)  the bearer SubjectConfirmation names our ACS
//
// XML safety: every document is refused outright when it carries a DOCTYPE
// (no DTD, so no external entity, no entity expansion, no XXE), is size capped,
// and is parsed by @xmldom/xmldom, which never fetches anything. Signature
// checks are NEVER done here: the response, its signature, audience,
// NotBefore/NotOnOrAfter, InResponseTo and replay are verified by
// @node-saml/node-saml (saml_sso.js); this module only adds the Recipient /
// Destination check that library still leaves to a warning.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'
import { DOMParser } from '@xmldom/xmldom'

export const MAX_METADATA_BYTES = 512 * 1024
export const MAX_RESPONSE_BYTES = 1024 * 1024
export const MAX_CERTS = 4
const NS_MD = 'urn:oasis:names:tc:SAML:2.0:metadata'
const NS_DS = 'http://www.w3.org/2000/09/xmldsig#'
const NS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion'
const BINDING_REDIRECT = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
const BINDING_POST = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'

function bad(message) { const e = new Error(message); e.status = 400; return e }

// Parse XML safely, or throw a 400. A DOCTYPE anywhere is refused before
// parsing (defense in depth on top of a parser that resolves no entities).
export function safeParseXml(xml, { maxBytes = MAX_METADATA_BYTES, what = 'document' } = {}) {
  const text = String(xml == null ? '' : xml)
  if (!text.trim()) throw bad(`The ${what} is empty.`)
  if (Buffer.byteLength(text, 'utf8') > maxBytes) throw bad(`The ${what} is too large.`)
  if (/<!DOCTYPE/i.test(text) || /<!ENTITY/i.test(text)) throw bad(`The ${what} contains a DOCTYPE, which is not accepted.`)
  let failure = null
  let doc = null
  try {
    doc = new DOMParser({ onError: (level, msg) => { if (level !== 'warning') failure = failure || String(msg) } }).parseFromString(text, 'text/xml')
  } catch { failure = failure || 'parse error' }
  if (failure || !doc || !doc.documentElement) throw bad(`The ${what} is not valid XML.`)
  return doc
}

const els = (node, ns, name) => Array.from(node.getElementsByTagNameNS(ns, name) || [])

// One or more certificates (PEM blocks, or bare base64) -> [{ pem, fingerprint,
// subject, notAfter, expired }]. Every entry must parse as an X.509 certificate.
export function normalizeCerts(input, { now = Date.now() } = {}) {
  const text = Array.isArray(input) ? input.join('\n') : String(input || '')
  const blocks = []
  const pemRe = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g
  let m
  while ((m = pemRe.exec(text))) blocks.push(m[1])
  if (!blocks.length && text.trim()) blocks.push(...text.split(/\n\s*\n|,/).map((s) => s.trim()).filter(Boolean))
  const out = []
  for (const raw of blocks) {
    const b64 = raw.replace(/\s+/g, '')
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) throw bad('The signing certificate is not a valid certificate.')
    let x509
    try { x509 = new crypto.X509Certificate(Buffer.from(b64, 'base64')) } catch { throw bad('The signing certificate is not a valid certificate.') }
    const lines = b64.match(/.{1,64}/g) || []
    const notAfter = new Date(x509.validTo)
    out.push({
      pem: `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`,
      fingerprint: x509.fingerprint256,
      subject: String(x509.subject || '').replace(/\n/g, ', ').slice(0, 300),
      notAfter: isNaN(notAfter.getTime()) ? null : notAfter.toISOString(),
      expired: !isNaN(notAfter.getTime()) && notAfter.getTime() < now,
    })
  }
  const seen = new Set()
  const unique = out.filter((c) => (seen.has(c.fingerprint) ? false : (seen.add(c.fingerprint), true)))
  if (unique.length > MAX_CERTS) throw bad(`Paste at most ${MAX_CERTS} signing certificates.`)
  return unique
}

// IdP metadata (EntityDescriptor, or the first IdP in an EntitiesDescriptor)
// -> { entityId, ssoUrl, certs:[pem...] }. Prefers the HTTP-Redirect SSO
// binding (what the service provider sends), then HTTP-POST.
export function parseIdpMetadata(xml) {
  const doc = safeParseXml(xml, { what: 'identity provider metadata' })
  const idps = els(doc, NS_MD, 'IDPSSODescriptor')
  if (!idps.length) throw bad('This metadata has no identity provider (IDPSSODescriptor). Paste the metadata of your identity provider, not of an application.')
  const idp = idps[0]
  const ed = idp.parentNode
  const entityId = ed && ed.getAttribute ? String(ed.getAttribute('entityID') || '').trim() : ''
  if (!entityId) throw bad('This metadata has no entity id.')
  const sso = els(idp, NS_MD, 'SingleSignOnService')
  const pick = sso.find((s) => s.getAttribute('Binding') === BINDING_REDIRECT) || sso.find((s) => s.getAttribute('Binding') === BINDING_POST)
  const ssoUrl = pick ? String(pick.getAttribute('Location') || '').trim() : ''
  if (!ssoUrl) throw bad('This metadata has no single sign-on URL for the HTTP-Redirect or HTTP-POST binding.')
  const certs = []
  for (const kd of els(idp, NS_MD, 'KeyDescriptor')) {
    const use = kd.getAttribute('use')
    if (use && use !== 'signing') continue
    for (const c of els(kd, NS_DS, 'X509Certificate')) {
      const v = String(c.textContent || '').replace(/\s+/g, '')
      if (v && !certs.includes(v)) certs.push(v)
    }
  }
  if (!certs.length) throw bad('This metadata has no signing certificate.')
  return { entityId, ssoUrl, certs }
}

const HTTPS_RE = /^https:\/\/[^\s]+$/i

// The company's SAML config, validated. `prior` keeps fields the admin did
// not re-send. Throws a 400 with the operator-facing reason.
export function validateSamlConfig(input = {}, prior = null, { now = Date.now() } = {}) {
  const b = input || {}
  let entityId = String(b.idpEntityId != null ? b.idpEntityId : '').trim()
  let ssoUrl = String(b.idpSsoUrl != null ? b.idpSsoUrl : '').trim()
  let certText = b.idpCert != null ? String(b.idpCert) : ''
  if (b.metadataXml && String(b.metadataXml).trim()) {
    const md = parseIdpMetadata(b.metadataXml)
    entityId = entityId || md.entityId
    ssoUrl = ssoUrl || md.ssoUrl
    certText = certText.trim() ? certText : md.certs.join('\n\n')
  }
  if (!entityId && prior) entityId = prior.idpEntityId || ''
  if (!ssoUrl && prior) ssoUrl = prior.idpSsoUrl || ''
  if (!entityId) throw bad('Enter the identity provider entity id (the Issuer), or paste its metadata.')
  if (entityId.length > 1024) throw bad('The entity id is too long.')
  if (!ssoUrl) throw bad('Enter the identity provider single sign-on URL, or paste its metadata.')
  if (ssoUrl.length > 2048 || !HTTPS_RE.test(ssoUrl)) throw bad('The single sign-on URL must be a full https URL.')
  let certs
  if (certText.trim()) certs = normalizeCerts(certText, { now })
  else if (prior && Array.isArray(prior.certs) && prior.certs.length) certs = prior.certs
  else throw bad('Paste the identity provider signing certificate, or its metadata.')
  if (!certs.length) throw bad('Paste the identity provider signing certificate, or its metadata.')
  const attr = (v, fallback) => {
    const s = String(v == null ? '' : v).trim()
    if (!s) return fallback
    if (s.length > 256 || /[<>"\s]/.test(s)) throw bad('An attribute name must be a single word or URI, with no spaces.')
    return s
  }
  return {
    idpEntityId: entityId,
    idpSsoUrl: ssoUrl,
    certs,
    emailAttribute: attr(b.emailAttribute, (prior && prior.emailAttribute) || ''),
    nameAttribute: attr(b.nameAttribute, (prior && prior.nameAttribute) || ''),
  }
}

// Attribute names IdPs commonly use (Entra, Okta, Google, AD FS, OneLogin, Ping,
// JumpCloud, Keycloak, Shibboleth). The admin's own names win when set.
const EMAIL_ATTRS = ['email', 'mail', 'emailaddress', 'emailAddress', 'Email', 'User.email', 'user.email',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'urn:oid:0.9.2342.19200300.100.1.3',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
const NAME_ATTRS = ['displayName', 'displayname', 'name', 'cn', 'http://schemas.microsoft.com/identity/claims/displayname', 'urn:oid:2.16.840.1.113730.3.1.241', 'urn:oid:2.5.4.3']
const GIVEN_ATTRS = ['firstName', 'givenName', 'given_name', 'FirstName', 'User.FirstName', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname', 'urn:oid:2.5.4.42']
const FAMILY_ATTRS = ['lastName', 'surname', 'sn', 'family_name', 'LastName', 'User.LastName', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname', 'urn:oid:2.5.4.4']

const first = (v) => (Array.isArray(v) ? v[0] : v)
const looksEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)

// node-saml profile -> { email, displayName }. Email: the mapped attribute,
// then the common names, then a NameID that is an email address.
export function mapAttributes(profile, { emailAttribute = '', nameAttribute = '' } = {}) {
  const p = profile || {}
  const read = (names) => {
    for (const n of names) {
      if (!n) continue
      const v = first(p[n])
      if (v != null && String(v).trim()) return String(v).trim()
    }
    return ''
  }
  let email = read([emailAttribute, ...EMAIL_ATTRS])
  if (!looksEmail(email)) email = ''
  if (!email && p.nameID && looksEmail(String(p.nameID).trim())) email = String(p.nameID).trim()
  let displayName = read([nameAttribute, ...NAME_ATTRS])
  if (!displayName || looksEmail(displayName)) {
    const g = read(GIVEN_ATTRS), f = read(FAMILY_ATTRS)
    displayName = [g, f].filter(Boolean).join(' ')
  }
  return { email: email.toLowerCase(), displayName: displayName.slice(0, 80) }
}

// The assertion must be addressed to US: at least one bearer
// SubjectConfirmationData whose Recipient is our ACS URL. (node-saml 5 only
// logs this; SAML profiles 4.1.4.2 require it.) `assertionXml` is the
// VERIFIED assertion node-saml returns.
export function checkRecipient(assertionXml, acsUrl) {
  const doc = safeParseXml(assertionXml, { maxBytes: MAX_RESPONSE_BYTES, what: 'assertion' })
  const confirmations = els(doc, NS_SAML, 'SubjectConfirmation').filter((sc) => sc.getAttribute('Method') === 'urn:oasis:names:tc:SAML:2.0:cm:bearer')
  const recipients = confirmations.flatMap((sc) => els(sc, NS_SAML, 'SubjectConfirmationData').map((d) => d.getAttribute('Recipient')))
  return recipients.some((r) => sameUrl(r, acsUrl))
}

// The Response's Destination, when present, must be our ACS URL.
export function checkDestination(responseXml, acsUrl) {
  const doc = safeParseXml(responseXml, { maxBytes: MAX_RESPONSE_BYTES, what: 'response' })
  const dest = doc.documentElement.getAttribute('Destination')
  return !dest || sameUrl(dest, acsUrl)
}

export function sameUrl(a, b) {
  try {
    const x = new URL(String(a)), y = new URL(String(b))
    return x.protocol === y.protocol && x.host.toLowerCase() === y.host.toLowerCase() && x.pathname.replace(/\/+$/, '') === y.pathname.replace(/\/+$/, '') && x.search === y.search
  } catch { return false }
}

// The SP values a company pastes into its identity provider.
export function spValues(origin, companyId) {
  const base = String(origin || '').replace(/\/+$/, '') + `/api/work/sso/saml/${encodeURIComponent(companyId)}`
  return { entityId: `${base}/metadata`, acsUrl: `${base}/acs`, metadataUrl: `${base}/metadata`, loginUrl: `${base}/login` }
}
