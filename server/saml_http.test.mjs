// SAML sign-in end to end on the REAL app (saas edition): the company admin
// connects SAML from the console API, the sign-in page resolves the domain to
// SAML, /login issues an AuthnRequest, a locally signed assertion posted to the
// ACS signs the person in (JIT in automatic mode), and the refusal paths hold:
// replay, a RelayState from another browser, a test sign-in that signs nobody
// in, and "single sign-on required" refusing password sign-in.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'
import { makeIdp, buildResponse, signAssertion, b64, requestIdFromRedirect, idpMetadata } from './test_saml_idp.mjs'

const app = await bootEdition('saas')
after(app.close)
const { req, jar, store, base, superadmin } = app

const PASS = 'Passw0rd!saml'
const idp = makeIdp()
const IDP_ENTITY = 'https://idp.acme.test/saml'
const co = store.createCompany({ name: 'Saml Co', seats: 20, adminSeats: 2, ssoProvisioning: 'auto' })
store.createManagedUser({ username: 'samladmin', password: PASS, companyId: co.id, companyRole: 'company_admin' })
store.createManagedUser({ username: 'pwmember', password: PASS, companyId: co.id, companyRole: 'member' })

// fetch without following redirects, with a cookie jar.
async function raw(j, method, p, { body, form } = {}) {
  const h = {}
  const cookie = Object.entries(j.map).map(([k, v]) => `${k}=${v}`).join('; ')
  if (cookie) h.cookie = cookie
  let payload
  if (form) { h['content-type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString() }
  else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body) }
  const res = await fetch(base + p, { method, headers: h, body: payload, redirect: 'manual' })
  for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) { const nv = c.split(';')[0]; const i = nv.indexOf('='); if (i > 0) j.map[nv.slice(0, i)] = nv.slice(i + 1) }
  return { status: res.status, location: res.headers.get('location') || '', text: await res.text() }
}
async function signIn(username) {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username, password: PASS })
  assert.equal(r.status, 200)
  return j
}
const adminJar = await signIn('samladmin')
let sp = null

test('the company admin connects SAML by pasting the IdP metadata; the overview shows copy-ready SP values', async () => {
  const parsed = await req(adminJar, 'POST', '/api/work/company/sso/saml/parse', { metadataXml: idpMetadata({ entityId: IDP_ENTITY, ssoUrl: 'https://idp.acme.test/sso', certB64: idp.certB64 }) })
  assert.equal(parsed.status, 200)
  assert.equal(parsed.data.idpEntityId, IDP_ENTITY)
  assert.equal(parsed.data.certs.length, 1)
  const saved = await req(adminJar, 'POST', '/api/work/company/sso/saml', { provider: 'okta', domain: 'acme.test', metadataXml: idpMetadata({ entityId: IDP_ENTITY, ssoUrl: 'https://idp.acme.test/sso', certB64: idp.certB64 }) })
  assert.equal(saved.status, 200, JSON.stringify(saved.data))
  assert.equal(saved.data.saml.connected, true)
  const ov = await req(adminJar, 'GET', '/api/work/company/sso/overview')
  assert.equal(ov.status, 200)
  sp = ov.data.saml.sp
  assert.equal(sp.acsUrl, `${base}/api/work/sso/saml/${co.id}/acs`)
  assert.equal(sp.entityId, `${base}/api/work/sso/saml/${co.id}/metadata`)
  assert.match(ov.data.scim.baseUrl, /\/api\/work\/scim\/v2$/)
  assert.ok(ov.data.oidc.redirectUri.endsWith('/api/work/sso/callback'))
  const md = await raw(jar(), 'GET', `/api/work/sso/saml/${co.id}/metadata`)
  assert.equal(md.status, 200)
  assert.match(md.text, /AssertionConsumerService/)
})

test('another company cannot claim the same sign-in domain', async () => {
  const c2 = store.createCompany({ name: 'Copycat Co', seats: 5 })
  assert.throws(() => store.setCompanySaml(c2.id, { idpEntityId: 'x', idpSsoUrl: 'https://x.test/sso', idpCert: idp.certPem, domain: 'acme.test' }), /already connected/)
})

test('the sign-in page resolves the domain to SAML and its start URL', async () => {
  const r = await req(jar(), 'GET', '/api/work/sso/resolve?domain=acme.test')
  assert.equal(r.status, 200)
  assert.equal(r.data.protocol, 'saml')
  assert.equal(r.data.startUrl, `/api/work/sso/saml/${co.id}/login`)
})

async function startLogin(j, query = '') {
  const start = await raw(j, 'GET', `/api/work/sso/saml/${co.id}/login${query}`)
  assert.equal(start.status, 302)
  assert.ok(start.location.startsWith('https://idp.acme.test/sso?'), start.location)
  assert.ok(j.map.wcp_saml_rs, 'the RelayState cookie is set')
  return requestIdFromRedirect(start.location)
}
const assertionFor = (id, over = {}) => b64(signAssertion(buildResponse({ idpEntityId: IDP_ENTITY, audience: sp.entityId, recipient: sp.acsUrl, inResponseTo: id, email: 'newhire@acme.test', name: 'New Hire', ...over }), idp))

let firstPost = null
test('a valid assertion signs the person in; automatic mode creates the member (JIT)', async () => {
  const browser = jar()
  const r = await startLogin(browser)
  firstPost = { SAMLResponse: assertionFor(r.id), RelayState: r.relayState }
  const acs = await raw(browser, 'POST', `/api/work/sso/saml/${co.id}/acs`, { form: firstPost })
  assert.equal(acs.status, 302, acs.text)
  assert.equal(acs.location, '/work')
  const me = await req(browser, 'GET', '/api/work/me')
  assert.equal(me.status, 200)
  const u = store.findUserByVerifiedLogin('newhire@acme.test')
  assert.ok(u && u.companyId === co.id, 'created in the company')
  assert.equal(u.displayName, 'New Hire')
})

test('replaying the same response is refused', async () => {
  const browser = jar()
  const r = await startLogin(browser)
  const acs = await raw(browser, 'POST', `/api/work/sso/saml/${co.id}/acs`, { form: { SAMLResponse: firstPost.SAMLResponse, RelayState: r.relayState } })
  assert.equal(acs.status, 302)
  assert.match(acs.location, /sso_error=/)
})

test('a response started in another browser (login CSRF) is refused', async () => {
  const attacker = jar(), victim = jar()
  const r = await startLogin(attacker)
  const acs = await raw(victim, 'POST', `/api/work/sso/saml/${co.id}/acs`, { form: { SAMLResponse: assertionFor(r.id, { email: 'attacker@acme.test' }), RelayState: r.relayState } })
  assert.match(acs.location, /sso_error=/)
  assert.equal(store.findUserByVerifiedLogin('attacker@acme.test'), null)
})

test('a test sign-in (company admin) records the outcome and signs nobody in', async () => {
  const r = await startLogin(adminJar, '?test=1')
  const acs = await raw(adminJar, 'POST', `/api/work/sso/saml/${co.id}/acs`, { form: { SAMLResponse: assertionFor(r.id, { email: 'trial@acme.test' }), RelayState: r.relayState } })
  assert.equal(acs.location, '/work/company?section=sso&ssoTest=done')
  const res = await req(adminJar, 'GET', '/api/work/company/sso/test-result')
  assert.equal(res.data.result.ok, true)
  assert.equal(res.data.result.protocol, 'saml')
  assert.equal(res.data.result.outcome, 'would_create')
  assert.equal(store.findUserByVerifiedLogin('trial@acme.test'), null, 'nothing was created')
  // only a company admin of this company may start one
  const anon = await raw(jar(), 'GET', `/api/work/sso/saml/${co.id}/login?test=1`)
  assert.match(anon.location, /sso_error=/)
})

test('a turned-off account cannot sign in with SAML', async () => {
  const u = store.findUserByVerifiedLogin('newhire@acme.test')
  store.setUserDisabled(u.id, true, { reason: 'left the company', by: 'test' })
  const browser = jar()
  const r = await startLogin(browser)
  const acs = await raw(browser, 'POST', `/api/work/sso/saml/${co.id}/acs`, { form: { SAMLResponse: assertionFor(r.id), RelayState: r.relayState } })
  assert.match(acs.location, /sso_error=/)
})

test('"single sign-on required" (superadmin) refuses password sign-in for the company, and only with a live connection', async () => {
  const sa = await superadmin()
  const bare = store.createCompany({ name: 'No Sso Co', seats: 5 })
  const refused = await req(sa, 'POST', `/api/work/admin/companies/${bare.id}/sso-required`, { required: true })
  assert.equal(refused.status, 409)
  const on = await req(sa, 'POST', `/api/work/admin/companies/${co.id}/sso-required`, { required: true, reason: 'policy' })
  assert.equal(on.status, 200)
  assert.equal(on.data.ssoRequired, true)
  const pw = await req(jar(), 'POST', '/api/work/login', { username: 'pwmember', password: PASS })
  assert.equal(pw.status, 403)
  assert.equal(pw.data.ssoRequired, true)
  // a wrong password still answers "invalid", never revealing the policy
  const wrong = await req(jar(), 'POST', '/api/work/login', { username: 'pwmember', password: 'nope-nope' })
  assert.equal(wrong.status, 401)
  // removing the last connection while required is refused
  assert.equal((await req(adminJar, 'DELETE', '/api/work/company/sso/saml')).status, 409)
  await req(sa, 'POST', `/api/work/admin/companies/${co.id}/sso-required`, { required: false })
  assert.equal((await req(jar(), 'POST', '/api/work/login', { username: 'pwmember', password: PASS })).status, 200)
})
