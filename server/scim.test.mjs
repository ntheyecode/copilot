// SCIM 2.0 provisioning on the REAL app (saas edition), driven with the
// request shapes Okta and Microsoft Entra ID actually send. Covers the token
// (hashed, company-scoped, revocable), Users (create, filter by userName, get,
// PUT, PATCH including active=false, DELETE) and Groups (create, filter,
// members add / remove in both IdP dialects, rename, delete), and that
// deactivation ends the person's sessions at once.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

const app = await bootEdition('saas')
after(app.close)
const { req, jar, store } = app
const R = await import('./scim_rules.js')

const PASS = 'Passw0rd!scim'
const co = store.createCompany({ name: 'Scim Co', seats: 20, adminSeats: 2 })
const other = store.createCompany({ name: 'Other Co', seats: 5, adminSeats: 2 })
store.createManagedUser({ username: 'scimadmin', password: PASS, companyId: co.id, companyRole: 'company_admin' })
store.createManagedUser({ username: 'otheradmin', password: PASS, companyId: other.id, companyRole: 'company_admin' })

async function signIn(username) {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username, password: PASS })
  assert.equal(r.status, 200, `${username} signs in`)
  return j
}
const adminJar = await signIn('scimadmin')
const tok = await req(adminJar, 'POST', '/api/work/company/scim/tokens', { name: 'Okta' })
assert.equal(tok.status, 200)
const TOKEN = tok.data.secret
const otherTok = (await req(await signIn('otheradmin'), 'POST', '/api/work/company/scim/tokens', { name: 'Entra' })).data.secret

const scim = (method, p, body, token = TOKEN) => req(jar(), method, '/api/work/scim/v2' + p, body, { 'content-type': 'application/scim+json', authorization: `Bearer ${token}` })

test('the token is shown once and stored only as a hash', async () => {
  assert.match(TOKEN, R.TOKEN_RE)
  const list = await req(adminJar, 'GET', '/api/work/company/scim/tokens')
  assert.equal(list.status, 200)
  assert.equal(list.data.tokens.length, 1)
  assert.equal(list.data.tokens[0].secret, undefined)
  assert.match(list.data.baseUrl, /\/api\/work\/scim\/v2$/)
  const raw = JSON.stringify(store.listScimTokens(co.id))
  assert.ok(!raw.includes(TOKEN.split('_').pop()), 'the secret is not in the stored record')
})

test('no token, a wrong token or a malformed token gets 401 in SCIM form', async () => {
  const none = await req(jar(), 'GET', '/api/work/scim/v2/Users', undefined, {})
  assert.equal(none.status, 401)
  assert.deepEqual(none.data.schemas, [R.SCHEMA_ERROR])
  const wrong = TOKEN.slice(0, -4) + (TOKEN.endsWith('AAAA') ? 'BBBB' : 'AAAA')
  assert.equal((await scim('GET', '/Users', undefined, wrong)).status, 401)
  assert.equal((await scim('GET', '/Users', undefined, 'wcp_live_0123456789abcdef_' + 'x'.repeat(43))).status, 401)
})

test('ServiceProviderConfig advertises PATCH and filtering', async () => {
  const r = await scim('GET', '/ServiceProviderConfig')
  assert.equal(r.status, 200)
  assert.equal(r.data.patch.supported, true)
  assert.equal(r.data.filter.supported, true)
})

let oktaUserId = null
test('Okta: filter (no match) -> POST /Users -> filter finds it', async () => {
  const empty = await scim('GET', '/Users?filter=' + encodeURIComponent('userName eq "dana@scim.test"') + '&startIndex=1&count=100')
  assert.equal(empty.status, 200)
  assert.equal(empty.data.totalResults, 0)
  const created = await scim('POST', '/Users', {
    schemas: [R.SCHEMA_USER], userName: 'dana@scim.test', name: { givenName: 'Dana', familyName: 'Ruiz' },
    emails: [{ primary: true, value: 'dana@scim.test', type: 'work' }], displayName: 'Dana Ruiz', locale: 'en-US', externalId: '00u1okta', groups: [], active: true,
  })
  assert.equal(created.status, 201)
  assert.equal(created.data.userName, 'dana@scim.test')
  assert.equal(created.data.active, true)
  assert.equal(created.data.externalId, '00u1okta')
  oktaUserId = created.data.id
  const found = await scim('GET', '/Users?filter=' + encodeURIComponent('userName eq "DANA@scim.test"'))
  assert.equal(found.data.totalResults, 1, 'userName is case-insensitive')
  assert.equal(found.data.Resources[0].id, oktaUserId)
  const dup = await scim('POST', '/Users', { schemas: [R.SCHEMA_USER], userName: 'dana@scim.test', active: true })
  assert.equal(dup.status, 409)
  assert.equal(dup.data.scimType, 'uniqueness')
})

test('the provisioned person is a member of the company, SSO-bound', () => {
  const u = store.getUser(oktaUserId)
  assert.equal(u.companyId, co.id)
  assert.equal(u.ssoEmail, 'dana@scim.test')
  assert.equal(u.displayName, 'Dana Ruiz')
})

test('Okta: PUT /Users replaces the profile', async () => {
  const r = await scim('PUT', `/Users/${oktaUserId}`, { schemas: [R.SCHEMA_USER], id: oktaUserId, userName: 'dana@scim.test', name: { givenName: 'Dana', familyName: 'Ruiz-Lopez' }, emails: [{ primary: true, value: 'dana@scim.test', type: 'work' }], active: true })
  assert.equal(r.status, 200)
  assert.equal(r.data.name.familyName, 'Ruiz-Lopez')
})

test('Okta: PATCH active=false (value object, no path) deactivates and ends the sessions at once', async () => {
  const before = store.getSessionEpoch(oktaUserId)
  const r = await scim('PATCH', `/Users/${oktaUserId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'replace', value: { active: false } }] })
  assert.equal(r.status, 200)
  assert.equal(r.data.active, false)
  assert.equal(store.getUser(oktaUserId).disabled, true)
  assert.ok(store.getSessionEpoch(oktaUserId) > before, 'every session of the account was invalidated')
  const again = await scim('PATCH', `/Users/${oktaUserId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'replace', value: { active: true } }] })
  assert.equal(again.data.active, true)
  assert.equal(store.getUser(oktaUserId).disabled, false)
})

let entraUserId = null
test('Entra: POST with the enterprise extension, then PATCH "Replace" active "False" (string)', async () => {
  const created = await scim('POST', '/Users', {
    schemas: [R.SCHEMA_USER, R.SCHEMA_ENTERPRISE], externalId: 'f3b1-entra', userName: 'lee@scim.test', active: true,
    displayName: 'Lee Park', emails: [{ primary: true, type: 'work', value: 'lee@scim.test' }], name: { formatted: 'Lee Park', familyName: 'Park', givenName: 'Lee' },
    [R.SCHEMA_ENTERPRISE]: { department: 'Ops' },
  })
  assert.equal(created.status, 201)
  entraUserId = created.data.id
  const byExt = await scim('GET', '/Users?filter=' + encodeURIComponent('externalId eq "f3b1-entra"'))
  assert.equal(byExt.data.totalResults, 1)
  const patch = await scim('PATCH', `/Users/${entraUserId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'Replace', path: 'active', value: 'False' }, { op: 'Add', path: 'name.givenName', value: 'Leandra' }, { op: 'Replace', path: 'emails[type eq "work"].value', value: 'leandra@scim.test' }] })
  assert.equal(patch.status, 200)
  assert.equal(patch.data.active, false)
  assert.equal(patch.data.userName, 'leandra@scim.test')
  assert.equal(store.getUser(entraUserId).ssoEmail, 'leandra@scim.test')
})

test('a token never reaches another company', async () => {
  assert.equal((await scim('GET', `/Users/${oktaUserId}`, undefined, otherTok)).status, 404)
  assert.equal((await scim('PATCH', `/Users/${oktaUserId}`, { Operations: [{ op: 'replace', value: { active: false } }] }, otherTok)).status, 404)
  const list = await scim('GET', '/Users', undefined, otherTok)
  assert.ok(!list.data.Resources.some((u) => u.id === oktaUserId))
})

let groupId = null
test('Groups: create (Okta), add and remove members in both dialects, rename', async () => {
  const g = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'Engineering', members: [] })
  assert.equal(g.status, 201)
  groupId = g.data.id
  const byName = await scim('GET', '/Groups?filter=' + encodeURIComponent('displayName eq "Engineering"'))
  assert.equal(byName.data.totalResults, 1)
  // Okta: add members
  let r = await scim('PATCH', `/Groups/${groupId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'add', path: 'members', value: [{ value: oktaUserId, display: 'dana@scim.test' }, { value: entraUserId }] }] })
  assert.equal(r.status, 200)
  assert.equal(r.data.members.length, 2)
  // Entra: remove one with a value filter in the path
  r = await scim('PATCH', `/Groups/${groupId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'Remove', path: `members[value eq "${entraUserId}"]` }] })
  assert.deepEqual(r.data.members.map((m) => m.value), [oktaUserId])
  // Okta: remove with a value list; rename
  r = await scim('PATCH', `/Groups/${groupId}`, { schemas: [R.SCHEMA_PATCH], Operations: [{ op: 'remove', path: 'members', value: [{ value: oktaUserId }] }, { op: 'replace', path: 'displayName', value: 'Platform Engineering' }] })
  assert.equal(r.data.members.length, 0)
  assert.equal(r.data.displayName, 'Platform Engineering')
  // Entra: excludedAttributes=members
  const ex = await scim('GET', `/Groups/${groupId}?excludedAttributes=members`)
  assert.equal(ex.data.members, undefined)
  // an unknown member is refused
  const bad = await scim('PATCH', `/Groups/${groupId}`, { Operations: [{ op: 'add', path: 'members', value: [{ value: 'nobody' }] }] })
  assert.equal(bad.status, 400)
})

test('DELETE /Users deprovisions: turned off, hidden from SCIM, work kept; re-creating brings the account back', async () => {
  const r = await scim('DELETE', `/Users/${oktaUserId}`)
  assert.equal(r.status, 204)
  assert.equal((await scim('GET', `/Users/${oktaUserId}`)).status, 404)
  const u = store.getUser(oktaUserId)
  assert.ok(u, 'the account and its work are kept')
  assert.equal(u.disabled, true)
  const back = await scim('POST', '/Users', { schemas: [R.SCHEMA_USER], userName: 'dana@scim.test', active: true })
  assert.equal(back.status, 201)
  assert.equal(back.data.id, oktaUserId)
  assert.equal(store.getUser(oktaUserId).disabled, false)
})

test('DELETE /Groups removes the group', async () => {
  assert.equal((await scim('DELETE', `/Groups/${groupId}`)).status, 204)
  assert.equal((await scim('GET', `/Groups/${groupId}`)).status, 404)
})

test('unsupported filters are refused, never broadened', async () => {
  const r = await scim('GET', '/Users?filter=' + encodeURIComponent('userName co "a"'))
  assert.equal(r.status, 400)
  assert.equal(r.data.scimType, 'invalidFilter')
})

test('a revoked token stops working at once', async () => {
  const t2 = await req(adminJar, 'POST', '/api/work/company/scim/tokens', { name: 'temp' })
  assert.equal((await scim('GET', '/Users', undefined, t2.data.secret)).status, 200)
  await req(adminJar, 'DELETE', `/api/work/company/scim/tokens/${t2.data.token.id}`)
  assert.equal((await scim('GET', '/Users', undefined, t2.data.secret)).status, 401)
})

test('seats are enforced through SCIM like every other path', async () => {
  const small = store.createCompany({ name: 'Tiny Co', seats: 1, adminSeats: 1 })
  const t = store.createScimToken(small.id, null, { name: 'x' }).secret
  assert.equal((await scim('POST', '/Users', { userName: 'one@tiny.test' }, t)).status, 201)
  const full = await scim('POST', '/Users', { userName: 'two@tiny.test' }, t)
  assert.equal(full.status, 403)
  assert.match(full.data.detail, /licenses/)
})
