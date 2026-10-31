// SCIM group -> role mappings on the REAL app (saas edition), driven with the
// group PATCH shapes Okta and Microsoft Entra ID send. A company admin maps a
// group to a registry role or grant in the console; membership then sets the
// person's role and grants, a signed-in session sees the change on its next
// request, the last company admin can never be demoted (SCIM error + audit),
// every change is audited, and the console refuses a manual edit of a managed
// field while every unmanaged field stays editable.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

const app = await bootEdition('saas')
after(app.close)
const { req, jar, store } = app
const R = await import('./scim_rules.js')

const PASS = 'Passw0rd!roles'
const co = store.createCompany({ name: 'Roles Co', seats: 20, adminSeats: 3 })
const other = store.createCompany({ name: 'Other Roles Co', seats: 5, adminSeats: 2 })
const admin = store.createManagedUser({ username: 'rolesadmin', password: PASS, companyId: co.id, companyRole: 'company_admin' })
const pat = store.createManagedUser({ username: 'pat', password: PASS, email: 'pat@roles.test', companyId: co.id, companyRole: 'member' })
const lee = store.createManagedUser({ username: 'lee', password: PASS, email: 'lee@roles.test', companyId: co.id, companyRole: 'grc' })
store.createManagedUser({ username: 'otherrolesadmin', password: PASS, companyId: other.id, companyRole: 'company_admin' })

async function signIn(username) {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/login', { username, password: PASS })
  assert.equal(r.status, 200, `${username} signs in`)
  return j
}
const adminJar = await signIn('rolesadmin')
const patJar = await signIn('pat')
const TOKEN = (await req(adminJar, 'POST', '/api/work/company/scim/tokens', { name: 'Okta' })).data.secret
const otherJar = await signIn('otherrolesadmin')

const scim = (method, p, body) => req(jar(), method, '/api/work/scim/v2' + p, body, { 'content-type': 'application/scim+json', authorization: `Bearer ${TOKEN}` })
const patch = (ops) => ({ schemas: [R.SCHEMA_PATCH], Operations: ops })
const roleOf = (id) => store.getUser(id).companyRole
const grantsOf = (id) => store.listCompanyUsers(co.id).find((u) => u.id === id).grants
const actions = (name) => store.listAdminActions({ limit: 5000 }).filter((a) => a.action === name && a.companyId === co.id)
const addMapping = (group, target, j = adminJar) => req(j, 'POST', '/api/work/company/scim/role-mappings', { group, target })

let pmGroup = null
let trainerGroup = null

test('a mapping can only name a registry company role or grant, never a platform role', async () => {
  for (const target of ['superadmin', 'admin', 'accounting', 'affiliate_admin', 'user', 'pm', '']) {
    const r = await addMapping('Anything', target)
    assert.equal(r.status, 400, `refuses ${target || '(empty)'}`)
  }
  const list = await req(adminJar, 'GET', '/api/work/company/scim/role-mappings')
  assert.equal(list.status, 200)
  assert.deepEqual(list.data.mappings, [])
})

test('Okta: map "Engineering PMs" to project_manager, push the group, then add a member', async () => {
  const g = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'Engineering PMs', members: [] })
  assert.equal(g.status, 201)
  pmGroup = g.data.id
  const m = await addMapping('engineering pms', 'project_manager')
  assert.equal(m.status, 200)
  assert.equal(m.data.mapping.kind, 'role')
  assert.deepEqual(m.data.mapping.matched, { id: pmGroup, displayName: 'Engineering PMs', members: 0 })
  assert.equal(m.data.changed, 0, 'nobody is in the group yet')
  assert.equal(roleOf(pat.id), 'member')

  // Pat is signed in already; the next request sees the new role.
  const before = await req(patJar, 'GET', '/api/work/me')
  assert.equal(before.data.user.companyRole, 'member')
  const r = await scim('PATCH', `/Groups/${pmGroup}`, patch([{ op: 'add', path: 'members', value: [{ value: pat.id, display: 'pat@roles.test' }] }]))
  assert.equal(r.status, 200)
  assert.equal(roleOf(pat.id), 'project_manager')
  const me = await req(patJar, 'GET', '/api/work/me')
  assert.equal(me.status, 200, 'the session survives a role change')
  assert.equal(me.data.user.companyRole, 'project_manager')
  assert.deepEqual(me.data.user.idpManaged, { role: true, grants: [] })
  const pm = await req(patJar, 'GET', '/api/work/pm/projects')
  assert.notEqual(pm.status, 403, 'the PM surfaces open on the next request')
  // The user resource reports the membership (read-only groups).
  const u = await scim('GET', `/Users/${pat.id}`)
  assert.deepEqual(u.data.groups.map((x) => x.display), ['Engineering PMs'])
})

test('every SCIM role change is audited: who, which group, from and to', () => {
  const a = actions('scim_role_change').find((x) => x.detail.startsWith('pat@roles.test'))
  assert.ok(a, 'audited')
  assert.equal(a.detail, 'pat@roles.test: role member -> project_manager; group "Engineering PMs"')
  assert.match(a.reason, /scim token [0-9a-f]{16}/)
  assert.ok(actions('scim_role_mapping_add').some((x) => /"engineering pms" -> project_manager/.test(x.detail)))
})

test('Entra: a grant mapped by group id, "Add" with a capitalized op; the union of grants and the highest role', async () => {
  const g = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'Workflow Trainers', externalId: 'aad-123', members: [] })
  trainerGroup = g.data.id
  assert.equal((await addMapping(trainerGroup, 'trainer')).status, 200)
  const grc = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'Audit', members: [] })
  assert.equal((await addMapping('Audit', 'grc')).status, 200)
  for (const gid of [trainerGroup, grc.data.id]) {
    const r = await scim('PATCH', `/Groups/${gid}`, patch([{ op: 'Add', path: 'members', value: [{ value: pat.id }] }]))
    assert.equal(r.status, 200)
  }
  assert.equal(roleOf(pat.id), 'project_manager', 'project_manager outranks grc')
  assert.deepEqual(grantsOf(pat.id), ['trainer'])
  // Entra removes with a value filter in the path: the grant goes, the role stays.
  const r = await scim('PATCH', `/Groups/${trainerGroup}`, patch([{ op: 'Remove', path: `members[value eq "${pat.id}"]` }]))
  assert.equal(r.status, 200)
  assert.deepEqual(grantsOf(pat.id), [])
  assert.equal(roleOf(pat.id), 'project_manager')
  // Okta removes with a value list: the PM role goes and grc (still mapped) wins.
  const r2 = await scim('PATCH', `/Groups/${pmGroup}`, patch([{ op: 'remove', path: 'members', value: [{ value: pat.id }] }]))
  assert.equal(r2.status, 200)
  assert.equal(roleOf(pat.id), 'grc')
  const me = await req(patJar, 'GET', '/api/work/me')
  assert.equal(me.data.user.companyRole, 'grc')
})

test('unmapped groups change nothing', async () => {
  const before = [roleOf(lee.id), JSON.stringify(grantsOf(lee.id))]
  const g = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'Sales', members: [{ value: lee.id }] })
  assert.equal(g.status, 201)
  assert.deepEqual([roleOf(lee.id), JSON.stringify(grantsOf(lee.id))], before)
  assert.equal(store.getUser(lee.id).scimRoleManaged || null, null)
})

test('the console: a managed field is locked with a clear reason; unmanaged fields stay editable', async () => {
  const locked = await req(adminJar, 'PATCH', `/api/work/company/users/${pat.id}`, { companyRole: 'executive' })
  assert.equal(locked.status, 409)
  assert.equal(locked.data.code, 'IDP_MANAGED')
  assert.match(locked.data.error, /managed by your identity provider/)
  assert.equal(roleOf(pat.id), 'grc')
  const plan = await req(adminJar, 'PATCH', `/api/work/company/users/${pat.id}`, { tier: 'advanced', workFlow: 'mixed' })
  assert.equal(plan.status, 200, 'plan and flow are not managed')
  // Lee is in no mapped group: a manual role edit still works.
  const free = await req(adminJar, 'PATCH', `/api/work/company/users/${lee.id}`, { companyRole: 'project_manager' })
  assert.equal(free.status, 200)
  assert.equal(roleOf(lee.id), 'project_manager')
  const users = await req(adminJar, 'GET', '/api/work/company/users')
  const row = (id) => users.data.users.find((u) => u.id === id)
  assert.deepEqual(row(pat.id).idpManaged, { role: true, grants: [] })
  assert.equal(row(lee.id).idpManaged, null)
})

test('a PATCH on the user\'s own groups applies through the groups and sets the role', async () => {
  const r = await scim('PATCH', `/Users/${lee.id}`, patch([{ op: 'add', path: 'groups', value: [{ value: trainerGroup }] }]))
  assert.equal(r.status, 200)
  assert.ok(r.data.groups.some((x) => x.value === trainerGroup))
  assert.deepEqual(grantsOf(lee.id), ['trainer'], 'project_manager may hold the trainer grant')
  const bad = await scim('PATCH', `/Users/${lee.id}`, patch([{ op: 'add', path: 'groups', value: [{ value: 'not-a-group' }] }]))
  assert.equal(bad.status, 400)
  assert.equal(bad.data.scimType, 'invalidValue')
  const rm = await scim('PATCH', `/Users/${lee.id}`, patch([{ op: 'remove', path: `groups[value eq "${trainerGroup}"]` }]))
  assert.equal(rm.status, 200)
  assert.deepEqual(grantsOf(lee.id), [])
  assert.equal(roleOf(lee.id), 'project_manager', 'a hand-set role is untouched')
})

let adminsGroup = null
test('the last company admin cannot be demoted through SCIM: SCIM error, nothing changes, audited', async () => {
  const g = await scim('POST', '/Groups', { schemas: [R.SCHEMA_GROUP], displayName: 'WCP Admins', members: [{ value: admin.id }] })
  adminsGroup = g.data.id
  assert.equal((await addMapping('WCP Admins', 'company_admin')).status, 200)
  assert.equal(roleOf(admin.id), 'company_admin')
  const refusedBefore = actions('scim_role_refused').length
  // Entra "Remove" with a value list, and Okta's remove-by-filter: both refused.
  for (const ops of [[{ op: 'Remove', path: 'members', value: [{ value: admin.id }] }], [{ op: 'remove', path: `members[value eq "${admin.id}"]` }]]) {
    const r = await scim('PATCH', `/Groups/${adminsGroup}`, patch(ops))
    assert.equal(r.status, 409)
    assert.deepEqual(r.data.schemas, [R.SCHEMA_ERROR])
    assert.match(r.data.detail, /no active company admin/)
  }
  const after = await scim('GET', `/Groups/${adminsGroup}`)
  assert.deepEqual(after.data.members.map((m) => m.value), [admin.id], 'the membership change was undone')
  assert.equal(roleOf(admin.id), 'company_admin')
  // A whole-group delete and a PUT that drops the admin are refused the same way.
  assert.equal((await scim('DELETE', `/Groups/${adminsGroup}`)).status, 409)
  assert.equal((await scim('PUT', `/Groups/${adminsGroup}`, { schemas: [R.SCHEMA_GROUP], displayName: 'WCP Admins', members: [] })).status, 409)
  assert.equal((await scim('GET', `/Groups/${adminsGroup}`)).status, 200)
  const refused = actions('scim_role_refused')
  assert.equal(refused.length, refusedBefore + 4)
  assert.match(refused[refused.length - 1].detail, /last_admin: rolesadmin/)
})

test('with a second admin in the group, the first may leave; removing the mapping cannot demote the acting admin', async () => {
  const r = await scim('PATCH', `/Groups/${adminsGroup}`, patch([{ op: 'add', path: 'members', value: [{ value: lee.id }] }]))
  assert.equal(r.status, 200)
  assert.equal(roleOf(lee.id), 'company_admin')
  // Removing the mapping would return both IdP-set admins to member: refused
  // (it would demote the acting admin, and leave no admin).
  const list = (await req(adminJar, 'GET', '/api/work/company/scim/role-mappings')).data
  const m = list.mappings.find((x) => x.target === 'company_admin')
  const del = await req(adminJar, 'DELETE', `/api/work/company/scim/role-mappings/${m.id}`)
  assert.equal(del.status, 409)
  assert.equal(roleOf(admin.id), 'company_admin')
  assert.ok((await req(adminJar, 'GET', '/api/work/company/scim/role-mappings')).data.mappings.some((x) => x.id === m.id), 'the mapping stays')
  // Lee leaves the admins group: allowed, the acting admin remains.
  const r2 = await scim('PATCH', `/Groups/${adminsGroup}`, patch([{ op: 'remove', path: `members[value eq "${lee.id}"]` }]))
  assert.equal(r2.status, 200)
  assert.equal(roleOf(lee.id), 'member', 'an IdP-set role returns to member')
})

test('removing a mapping releases the people it managed', async () => {
  const list = (await req(adminJar, 'GET', '/api/work/company/scim/role-mappings')).data
  const m = list.mappings.find((x) => x.target === 'grc')
  const del = await req(adminJar, 'DELETE', `/api/work/company/scim/role-mappings/${m.id}`)
  assert.equal(del.status, 200)
  assert.equal(del.data.changed, 1)
  assert.equal(roleOf(pat.id), 'member')
  assert.equal(store.getUser(pat.id).scimRoleManaged, null)
  const edit = await req(adminJar, 'PATCH', `/api/work/company/users/${pat.id}`, { companyRole: 'executive' })
  assert.equal(edit.status, 200, 'no longer managed, so editable again')
})

test('mappings are company-scoped', async () => {
  const mine = (await req(adminJar, 'GET', '/api/work/company/scim/role-mappings')).data
  const theirs = await req(otherJar, 'GET', '/api/work/company/scim/role-mappings')
  assert.equal(theirs.status, 200)
  assert.deepEqual(theirs.data.mappings, [])
  const id = mine.mappings[0].id
  assert.equal((await req(otherJar, 'DELETE', `/api/work/company/scim/role-mappings/${id}`)).status, 404)
  assert.equal((await req(patJar, 'GET', '/api/work/company/scim/role-mappings')).status, 403, 'company admins only')
})
