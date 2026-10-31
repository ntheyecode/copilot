// SAML 2.0 service provider: signed-assertion validation against a LOCAL test
// identity provider (a generated key pair + self-signed certificate). Every
// security property the SP promises has a case here: a valid assertion signs
// in; a tampered, unsigned, foreign-key, wrong-audience, wrong-recipient,
// wrong-destination, wrong-issuer, expired, not-yet-valid, unsolicited or
// replayed one is refused; a DOCTYPE is never parsed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { InMemoryCacheProvider } from '@node-saml/node-saml'
import { verifySamlResponse, samlFor, spMetadataXml } from './saml_sso.js'
import { validateSamlConfig, parseIdpMetadata, normalizeCerts, mapAttributes, spValues, safeParseXml, checkRecipient } from './saml_rules.js'
import { makeIdp, buildResponse, signAssertion, b64, requestIdFromRedirect, idpMetadata } from './test_saml_idp.mjs'

const idp = makeIdp()
const otherIdp = makeIdp({ cn: 'Attacker IdP' })
const IDP_ENTITY = 'https://idp.acme.test/saml'
const sp = spValues('https://admireveda.test', 'co42')
const cfg = validateSamlConfig({ idpEntityId: IDP_ENTITY, idpSsoUrl: 'https://idp.acme.test/sso', idpCert: idp.certPem })

// A fresh cache per case, with one outstanding AuthnRequest id (what /login stores).
async function issued() {
  const cache = new InMemoryCacheProvider({ keyExpirationPeriodMs: 600000 })
  const id = '_req' + Math.random().toString(16).slice(2)
  await cache.saveAsync(id, new Date().toISOString())
  return { cache, id }
}
const good = (over = {}) => ({ idpEntityId: IDP_ENTITY, audience: sp.entityId, recipient: sp.acsUrl, ...over })

test('a valid signed assertion yields the email and display name', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id })), idp)
  const out = await verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache })
  assert.deepEqual(out, { email: 'alex@acme.test', displayName: 'Alex Doe' })
})

test('the SP redirect carries an AuthnRequest whose id is remembered for InResponseTo', async () => {
  const cache = new InMemoryCacheProvider({ keyExpirationPeriodMs: 600000 })
  const url = await samlFor(cfg, sp, { cacheProvider: cache }).getAuthorizeUrlAsync('relay123', 'admireveda.test', {})
  assert.ok(url.startsWith('https://idp.acme.test/sso?'))
  const req = requestIdFromRedirect(url)
  assert.ok(req.id)
  assert.equal(req.relayState, 'relay123')
  assert.match(req.xml, new RegExp(`AssertionConsumerServiceURL="${sp.acsUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`))
  const xml = signAssertion(buildResponse(good({ inResponseTo: req.id })), idp)
  const out = await verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache })
  assert.equal(out.email, 'alex@acme.test')
})

test('tampered: changing the email after signing is refused', async () => {
  const { cache, id } = await issued()
  const signed = signAssertion(buildResponse(good({ inResponseTo: id })), idp)
  const tampered = signed.replace('>alex@acme.test<', '>ceo@acme.test<')
  assert.notEqual(tampered, signed)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(tampered), { cacheProvider: cache }), /Invalid signature/)
})

test('unsigned assertion is refused', async () => {
  const { cache, id } = await issued()
  await assert.rejects(verifySamlResponse(cfg, sp, b64(buildResponse(good({ inResponseTo: id }))), { cacheProvider: cache }), /Invalid signature/)
})

test('an assertion signed by another key is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id })), otherIdp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /Invalid signature/)
})

test('wrong audience is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, audience: 'https://some-other-app.test/metadata' })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /audience mismatch/)
})

test('expired (NotOnOrAfter in the past, beyond the clock skew) is refused', async () => {
  const { cache, id } = await issued()
  const t = Date.now() - 60 * 60000
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, issueInstant: t, notBefore: t - 60000, notOnOrAfter: t + 5 * 60000 })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /subject confirmation|expired/i)
})

test('not yet valid (NotBefore in the future, beyond the clock skew) is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, notBefore: Date.now() + 30 * 60000, notOnOrAfter: Date.now() + 60 * 60000 })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /not yet valid/)
})

test('replayed: the same response presented twice is refused the second time', async () => {
  const { cache, id } = await issued()
  const xml = b64(signAssertion(buildResponse(good({ inResponseTo: id })), idp))
  await verifySamlResponse(cfg, sp, xml, { cacheProvider: cache })
  await assert.rejects(verifySamlResponse(cfg, sp, xml, { cacheProvider: cache }), /InResponseTo/)
})

test('replayed: the assertion id is remembered even if its request id were issued again', async () => {
  const { cache, id } = await issued()
  const xml = b64(signAssertion(buildResponse(good({ inResponseTo: id })), idp))
  await verifySamlResponse(cfg, sp, xml, { cacheProvider: cache })
  await cache.saveAsync(id, new Date().toISOString())   // the InResponseTo would pass again...
  await assert.rejects(verifySamlResponse(cfg, sp, xml, { cacheProvider: cache }), /already been received|rejected/)   // ...the assertion replay check still refuses
})

test('unsolicited (no InResponseTo) and an unknown InResponseTo are refused', async () => {
  const { cache } = await issued()
  await assert.rejects(verifySamlResponse(cfg, sp, b64(signAssertion(buildResponse(good()), idp)), { cacheProvider: cache }), /InResponseTo is missing/)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(signAssertion(buildResponse(good({ inResponseTo: '_never_issued' })), idp)), { cacheProvider: cache }), /InResponseTo/)
})

test('wrong Recipient (addressed to another service) is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, recipient: 'https://evil.test/acs', destination: null })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /Recipient/)
})

test('wrong Destination is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, destination: 'https://evil.test/acs' })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /different address/)
})

test('wrong issuer is refused', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, idpEntityId: 'https://other-idp.test' })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /Unknown SAML issuer/)
})

test('a DOCTYPE (XXE / entity expansion) is refused before any XML library parses it', async () => {
  const { cache, id } = await issued()
  const evil = '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + signAssertion(buildResponse(good({ inResponseTo: id })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(evil), { cacheProvider: cache }), /DOCTYPE/)
  assert.throws(() => safeParseXml('<!DOCTYPE a [<!ENTITY b "c">]><a>&b;</a>'), /DOCTYPE/)
  assert.throws(() => parseIdpMetadata('<!DOCTYPE x SYSTEM "http://evil.test/x.dtd"><x/>'), /DOCTYPE/)
})

test('an assertion without an email is refused with an actionable message', async () => {
  const { cache, id } = await issued()
  const xml = signAssertion(buildResponse(good({ inResponseTo: id, nameId: 'opaque-123', attributes: { displayName: 'No Mail' } })), idp)
  await assert.rejects(verifySamlResponse(cfg, sp, b64(xml), { cacheProvider: cache }), /email attribute/)
})

test('certificate rotation: a config with two certificates accepts either', async () => {
  const both = validateSamlConfig({ idpEntityId: IDP_ENTITY, idpSsoUrl: 'https://idp.acme.test/sso', idpCert: `${otherIdp.certPem}\n${idp.certPem}` })
  assert.equal(both.certs.length, 2)
  const { cache, id } = await issued()
  const out = await verifySamlResponse(both, sp, b64(signAssertion(buildResponse(good({ inResponseTo: id })), idp)), { cacheProvider: cache })
  assert.equal(out.email, 'alex@acme.test')
})

test('IdP metadata import: entity id, the HTTP-Redirect SSO URL and the signing certificate', () => {
  const md = parseIdpMetadata(idpMetadata({ entityId: IDP_ENTITY, ssoUrl: 'https://idp.acme.test/sso', certB64: idp.certB64 }))
  assert.equal(md.entityId, IDP_ENTITY)
  assert.equal(md.ssoUrl, 'https://idp.acme.test/sso')
  assert.equal(md.certs.length, 1)
  const v = validateSamlConfig({ metadataXml: idpMetadata({ entityId: IDP_ENTITY, ssoUrl: 'https://idp.acme.test/sso', certB64: idp.certB64 }) })
  assert.equal(v.idpEntityId, IDP_ENTITY)
  assert.equal(v.certs[0].fingerprint, normalizeCerts(idp.certPem)[0].fingerprint)
  assert.throws(() => parseIdpMetadata('<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="x"/>'), /no identity provider/)
})

test('config validation: https SSO URL, a real certificate, sane attribute names', () => {
  assert.throws(() => validateSamlConfig({ idpEntityId: 'x', idpSsoUrl: 'http://idp/sso', idpCert: idp.certPem }), /https/)
  assert.throws(() => validateSamlConfig({ idpEntityId: 'x', idpSsoUrl: 'https://idp/sso', idpCert: 'not a cert' }), /certificate/)
  assert.throws(() => validateSamlConfig({ idpEntityId: 'x', idpSsoUrl: 'https://idp/sso', idpCert: idp.certPem, emailAttribute: 'a b' }), /attribute/)
  assert.throws(() => validateSamlConfig({ idpSsoUrl: 'https://idp/sso', idpCert: idp.certPem }), /entity id/)
})

test('attribute mapping: admin-chosen names, then common IdP claim names, then an email NameID', () => {
  assert.deepEqual(mapAttributes({ 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'Kim@Acme.test', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Kim', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Lee' }), { email: 'kim@acme.test', displayName: 'Kim Lee' })
  assert.equal(mapAttributes({ workmail: 'a@b.test', email: 'x@y.test' }, { emailAttribute: 'workmail' }).email, 'a@b.test')
  assert.equal(mapAttributes({ nameID: 'n@acme.test' }).email, 'n@acme.test')
  assert.equal(mapAttributes({ nameID: 'opaque' }).email, '')
})

test('SP metadata names our entity id and ACS, and is safe XML', () => {
  const xml = spMetadataXml(sp)
  assert.match(xml, new RegExp(`entityID="${sp.entityId}"`))
  assert.match(xml, new RegExp(`Location="${sp.acsUrl}"`))
  assert.match(xml, /WantAssertionsSigned="true"/)
  safeParseXml(xml)
  assert.equal(checkRecipient('<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"/>', sp.acsUrl), false)
})
