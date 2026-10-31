// Test helper (not a test file): a local SAML identity provider for the tests.
// Generates an RSA key pair and a self-signed X.509 certificate with Node's
// crypto only (a minimal DER encoder, no openssl), and signs SAML responses
// with xml-crypto (a dev dependency) exactly as a real IdP does: an enveloped
// RSA-SHA256 signature over the Assertion.
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { SignedXml } from 'xml-crypto'

// ---- minimal DER ------------------------------------------------------------
const len = (n) => {
  if (n < 0x80) return Buffer.from([n])
  const bytes = []
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8 }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}
const tlv = (tag, content) => Buffer.concat([Buffer.from([tag]), len(content.length), content])
const seq = (...parts) => tlv(0x30, Buffer.concat(parts))
const set = (...parts) => tlv(0x31, Buffer.concat(parts))
const int = (buf) => tlv(0x02, buf[0] & 0x80 ? Buffer.concat([Buffer.from([0]), buf]) : buf)
const nul = () => Buffer.from([0x05, 0x00])
const utf8 = (s) => tlv(0x0c, Buffer.from(s, 'utf8'))
const utc = (d) => tlv(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'))
const bits = (buf) => tlv(0x03, Buffer.concat([Buffer.from([0]), buf]))
const explicit = (n, content) => tlv(0xa0 + n, content)
function oid(dotted) {
  const p = dotted.split('.').map(Number)
  const out = [40 * p[0] + p[1]]
  for (const v of p.slice(2)) {
    const stack = [v & 0x7f]
    let x = v >> 7
    while (x > 0) { stack.unshift((x & 0x7f) | 0x80); x >>= 7 }
    out.push(...stack)
  }
  return tlv(0x06, Buffer.from(out))
}

// A self-signed certificate for `cn`, valid from now-1d to now+days.
export function makeIdp({ cn = 'WorkCoPilot Test IdP', days = 365 } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const alg = seq(oid('1.2.840.113549.1.1.11'), nul())
  const name = seq(set(seq(oid('2.5.4.3'), utf8(cn))))
  const now = Date.now()
  const tbs = seq(
    explicit(0, int(Buffer.from([2]))),
    int(crypto.randomBytes(8)),
    alg, name,
    seq(utc(new Date(now - 86400000)), utc(new Date(now + days * 86400000))),
    name,
    publicKey.export({ type: 'spki', format: 'der' }),
  )
  const signature = crypto.sign('sha256', tbs, privateKey)
  const der = seq(tbs, alg, bits(signature))
  const b64 = der.toString('base64')
  const certPem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`
  return { privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }), certPem, certB64: b64 }
}

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A SAML Response (string XML) with one Assertion. Every field can be bent by a
// test to produce the case it checks.
export function buildResponse({
  idpEntityId, audience, recipient, destination = recipient, inResponseTo = null,
  email = 'alex@acme.test', name = 'Alex Doe', nameId = email,
  notBefore = Date.now() - 60000, notOnOrAfter = Date.now() + 5 * 60000, issueInstant = Date.now(),
  assertionId = '_a' + crypto.randomBytes(12).toString('hex'), responseId = '_r' + crypto.randomBytes(12).toString('hex'),
  attributes = null,
} = {}) {
  const irt = inResponseTo ? ` InResponseTo="${esc(inResponseTo)}"` : ''
  const attrs = attributes || { email, displayName: name }
  const attrXml = Object.entries(attrs).map(([k, v]) => `<saml:Attribute Name="${esc(k)}"><saml:AttributeValue>${esc(v)}</saml:AttributeValue></saml:Attribute>`).join('')
  return `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${iso(issueInstant)}"${destination ? ` Destination="${esc(destination)}"` : ''}${irt}>` +
    `<saml:Issuer>${esc(idpEntityId)}</saml:Issuer>` +
    '<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>' +
    `<saml:Assertion ID="${assertionId}" Version="2.0" IssueInstant="${iso(issueInstant)}">` +
    `<saml:Issuer>${esc(idpEntityId)}</saml:Issuer>` +
    `<saml:Subject><saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${esc(nameId)}</saml:NameID>` +
    `<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData NotOnOrAfter="${iso(notOnOrAfter)}" Recipient="${esc(recipient)}"${irt}/></saml:SubjectConfirmation></saml:Subject>` +
    `<saml:Conditions NotBefore="${iso(notBefore)}" NotOnOrAfter="${iso(notOnOrAfter)}"><saml:AudienceRestriction><saml:Audience>${esc(audience)}</saml:Audience></saml:AudienceRestriction></saml:Conditions>` +
    `<saml:AuthnStatement AuthnInstant="${iso(issueInstant)}" SessionIndex="${assertionId}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>` +
    `<saml:AttributeStatement>${attrXml}</saml:AttributeStatement>` +
    '</saml:Assertion></samlp:Response>'
}

// Sign the Assertion (enveloped, RSA-SHA256, exclusive C14N), as Okta / Entra do.
export function signAssertion(xml, idp) {
  const sig = new SignedXml({
    privateKey: idp.privateKeyPem,
    publicCert: idp.certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  })
  sig.addReference({
    xpath: "//*[local-name(.)='Assertion']",
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
  })
  sig.computeSignature(xml, { location: { reference: "//*[local-name(.)='Assertion']/*[local-name(.)='Issuer']", action: 'after' } })
  return sig.getSignedXml()
}

export const b64 = (xml) => Buffer.from(xml, 'utf8').toString('base64')

// The AuthnRequest ID inside an SP redirect URL (?SAMLRequest=deflated base64).
export function requestIdFromRedirect(url) {
  const u = new URL(url)
  const raw = zlib.inflateRawSync(Buffer.from(u.searchParams.get('SAMLRequest'), 'base64')).toString('utf8')
  const m = /\sID="([^"]+)"/.exec(raw)
  return { id: m && m[1], relayState: u.searchParams.get('RelayState'), xml: raw }
}

// IdP metadata for the import path.
export function idpMetadata({ entityId, ssoUrl, certB64 }) {
  return `<?xml version="1.0"?><md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="${esc(entityId)}">` +
    '<md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">' +
    `<md:KeyDescriptor use="signing"><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certB64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor>` +
    `<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${esc(ssoUrl)}/post"/>` +
    `<md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${esc(ssoUrl)}"/>` +
    '</md:IDPSSODescriptor></md:EntityDescriptor>'
}
