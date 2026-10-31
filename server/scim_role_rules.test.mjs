// SCIM group -> role mapping rules (pure): targets come only from the role
// registry, several groups resolve to the union of grants and the
// highest-precedence role, unmapped groups change nothing, and the last
// active company admin is never demoted.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as RR from './scim_role_rules.js'
import { COMPANY_ROLES, GRANTS, ROLE_PRECEDENCE, highestRole } from './work_roles.js'

const g = (id, displayName, members) => ({ id, displayName, members })
const map = (group, target) => ({ id: `${group}->${target}`, group, target })

test('precedence lists every company role once, and nothing else', () => {
  assert.deepEqual([...ROLE_PRECEDENCE].sort(), [...COMPANY_ROLES].sort())
  assert.equal(new Set(ROLE_PRECEDENCE).size, ROLE_PRECEDENCE.length)
  assert.equal(highestRole(['member', 'project_manager', 'grc']), 'project_manager')
  assert.equal(highestRole(['executive', 'company_admin']), 'company_admin')
  assert.equal(highestRole(['superadmin']), null, 'a platform role never ranks')
  assert.equal(highestRole([]), null)
})

test('a mapping target is a registry company role or grant, never a platform role', () => {
  for (const r of COMPANY_ROLES) assert.equal(RR.targetKind(r), 'role')
  for (const x of GRANTS) assert.equal(RR.targetKind(x), 'grant')
  for (const bad of ['superadmin', 'admin', 'accounting', 'affiliate_admin', 'user', 'root', 'pm', 'Company_Admin', '', null, undefined, '__proto__']) {
    assert.equal(RR.targetKind(bad), null, String(bad))
    assert.throws(() => RR.validateMapping({ group: 'G', target: bad }), (e) => e.status === 400, `refuses ${bad}`)
  }
  assert.throws(() => RR.validateMapping({ group: '  ', target: 'member' }), (e) => e.status === 400)
  assert.deepEqual(RR.validateMapping({ group: ' Eng PMs ', target: 'project_manager' }), { group: 'Eng PMs', target: 'project_manager', kind: 'role' })
})

test('a stored mapping with a platform role is ignored, never trusted', () => {
  const groups = [g('g1', 'Admins', ['u1'])]
  const r = RR.resolveForUser([map('Admins', 'superadmin')], groups)
  assert.deepEqual([r.role, r.grants], [null, []])
})

test('groups match by display name (any case) or by SCIM id', () => {
  const grp = g('7f0c', 'Engineering PMs', [])
  assert.equal(RR.groupMatches('engineering pms', grp), true)
  assert.equal(RR.groupMatches('7f0c', grp), true)
  assert.equal(RR.groupMatches('Engineering', grp), false)
  assert.equal(RR.groupMatches('', grp), false)
})

test('several groups: highest-precedence role and the union of grants', () => {
  const groups = [g('a', 'PMs', ['u']), g('b', 'GRC', ['u']), g('c', 'Trainers', ['u']), g('d', 'Unmapped', ['u'])]
  const mappings = [map('GRC', 'grc'), map('PMs', 'project_manager'), map('Trainers', 'trainer')]
  const r = RR.resolveForUser(mappings, RR.groupsOfUser('u', groups))
  assert.equal(r.role, 'project_manager')
  assert.equal(r.roleGroup, 'PMs')
  assert.deepEqual(r.grants, ['trainer'])
  const p = RR.planUser({ id: 'u', companyRole: 'member', grants: [] }, r)
  assert.deepEqual([p.toRole, p.toGrants], ['project_manager', ['trainer']])
  assert.deepEqual(p.managed, { role: 'project_manager', grants: ['trainer'] })
})

test('a grant the winning role may not hold is dropped (registry rule)', () => {
  const groups = [g('a', 'Execs', ['u']), g('b', 'Trainers', ['u'])]
  const r = RR.resolveForUser([map('Execs', 'executive'), map('Trainers', 'trainer')], groups)
  const p = RR.planUser({ id: 'u', companyRole: 'member', grants: [] }, r)
  assert.deepEqual([p.toRole, p.toGrants, p.managed.grants], ['executive', [], []])
})

test('unmapped groups change nothing; a hand-set role and grant stay', () => {
  const plan = RR.planCompany({
    users: [{ id: 'u', companyId: 'c', companyRole: 'grc', grants: [] }, { id: 'v', companyId: 'c', companyRole: 'project_manager', grants: ['trainer'] }],
    groups: [g('a', 'Sales', ['u', 'v'])],
    mappings: [map('Engineering', 'project_manager')],
  })
  assert.deepEqual(plan, { changes: [], refused: null })
})

test('leaving every mapped group returns an IdP-set role to member and removes an IdP-set grant; hand-set grants stay', () => {
  const user = { id: 'u', companyRole: 'project_manager', grants: ['trainer'], scimRoleManaged: { role: 'project_manager', grants: [] } }
  const p = RR.planUser(user, RR.resolveForUser([map('PMs', 'project_manager')], []))
  assert.equal(p.toRole, 'member')
  assert.deepEqual(p.toGrants, ['trainer'], 'the trainer grant was set by hand, so it stays')
  assert.equal(p.managed, null)
  const user2 = { id: 'u', companyRole: 'member', grants: ['trainer'], scimRoleManaged: { role: null, grants: ['trainer'] } }
  const p2 = RR.planUser(user2, RR.resolveForUser([map('Trainers', 'trainer')], []))
  assert.deepEqual([p2.toRole, p2.toGrants, p2.grantsChanged], ['member', [], true])
})

test('the last active company admin is never demoted; another active admin makes it allowed', () => {
  const users = [
    { id: 'a1', companyId: 'c', companyRole: 'company_admin', grants: [], scimRoleManaged: { role: 'company_admin', grants: [] } },
    { id: 'a2', companyId: 'c', companyRole: 'company_admin', grants: [], disabled: true },
    { id: 'm', companyId: 'c', companyRole: 'member', grants: [] },
  ]
  // a1 left the Admins group: the only ACTIVE admin would go (a2 is turned off).
  const refused = RR.planCompany({ users, groups: [g('x', 'Admins', [])], mappings: [map('Admins', 'company_admin')] })
  assert.deepEqual(refused.refused, { reason: 'last_admin', userIds: ['a1'] })
  // With m promoted in the same change, a1 may go.
  const ok = RR.planCompany({ users, groups: [g('x', 'Admins', ['m'])], mappings: [map('Admins', 'company_admin')] })
  assert.equal(ok.refused, null)
  assert.deepEqual(ok.changes.map((c) => [c.userId, c.toRole]).sort(), [['a1', 'member'], ['m', 'company_admin']])
  // A second active admin: demoting one is fine.
  const users2 = users.map((u) => (u.id === 'a2' ? { ...u, disabled: false } : u))
  assert.equal(RR.planCompany({ users: users2, groups: [g('x', 'Admins', [])], mappings: [map('Admins', 'company_admin')] }).refused, null)
})

test('a deprovisioned account is not recomputed and does not count as an admin', () => {
  const users = [
    { id: 'a1', companyId: 'c', companyRole: 'company_admin', grants: [], scimRoleManaged: { role: 'company_admin', grants: [] } },
    { id: 'gone', companyId: 'c', companyRole: 'company_admin', grants: [], scimDeletedAt: '2026-01-01' },
  ]
  const r = RR.planCompany({ users, groups: [], mappings: [map('Admins', 'company_admin')] })
  assert.deepEqual(r.refused, { reason: 'last_admin', userIds: ['a1'] })
})

test('the console guard: managed role and managed grants are locked, the rest stays editable', () => {
  const u = { id: 'u', companyId: 'c', companyRole: 'project_manager', grants: ['trainer'], scimRoleManaged: { role: 'project_manager', grants: ['trainer'] } }
  assert.equal(RR.manualEditConflict(u, { finalRole: 'grc', finalGrants: [] }), 'role')
  assert.equal(RR.manualEditConflict(u, { finalRole: 'project_manager', finalGrants: [] }), 'grants')
  assert.equal(RR.manualEditConflict(u, { finalRole: 'project_manager', finalGrants: ['trainer'] }), null, 'a plan or flow edit passes')
  const g2 = { id: 'u', companyId: 'c', companyRole: 'member', grants: ['trainer'], scimRoleManaged: { role: null, grants: ['trainer'] } }
  assert.equal(RR.manualEditConflict(g2, { finalRole: 'executive', finalGrants: [] }), 'grants', 'a role change that drops a managed grant is refused')
  assert.equal(RR.manualEditConflict({ id: 'x', companyRole: 'member', grants: [] }, { finalRole: 'grc', finalGrants: [] }), null, 'no mapping covers this person')
  assert.deepEqual(RR.managedView(u), { role: true, grants: ['trainer'] })
  assert.equal(RR.managedView({ id: 'x', companyId: 'c' }), null)
})

test('the audit line names the person, from, to and the group', () => {
  const line = RR.describeChange({ userId: 'u', fromRole: 'member', toRole: 'project_manager', fromGrants: [], toGrants: ['trainer'], grantsChanged: true, group: 'Eng PMs' }, 'jo@x.test')
  assert.equal(line, 'jo@x.test: role member -> project_manager; grants none -> trainer; group "Eng PMs"')
  assert.ok(!/—/.test(line))
})
