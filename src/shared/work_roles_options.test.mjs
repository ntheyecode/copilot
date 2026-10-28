// The client role/flow registry must agree with the server's permission matrix
// (server/work_roles.js) on every predicate it mirrors, and roleViewOf must gate
// each surface exactly once. Runs in `npm test` (src/shared/*.test.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import * as client from './work_roles_options.js'
import * as server from '../../server/work_roles.js'

const ROLES = ['member', 'executive', 'company_admin', 'project_manager', 'senior_project_manager', 'grc']
const FLOWS = ['worker', 'independent', 'mixed', 'bogus', '', null]

test('flow predicates match the server for every flow value', () => {
  for (const f of FLOWS) {
    assert.equal(client.normalizeFlow(f), server.normalizeFlow(f), `normalizeFlow(${f})`)
    assert.equal(client.canStartOwnTask(f), server.canStartOwnTask(f), `canStartOwnTask(${f})`)
    assert.equal(client.canReceiveAssignment(f), server.canReceiveAssignment(f), `canReceiveAssignment(${f})`)
  }
})

test('role predicates match the server for every role', () => {
  for (const r of ROLES) {
    for (const fn of ['isSrPM', 'isGRC', 'isPM', 'isCompanyAdmin', 'canCreateProject', 'canAssignTask', 'canReassignProject', 'canAssignProjectManager', 'canSeeAllProjects']) {
      assert.equal(client[fn](r), server[fn](r), `${fn}(${r})`)
    }
    const own = { managerId: 'me' }, other = { managerId: 'them' }
    assert.equal(client.canManageProject(r, 'me', own), server.canManageProject(r, 'me', own), `canManageProject own (${r})`)
    assert.equal(client.canManageProject(r, 'me', other), server.canManageProject(r, 'me', other), `canManageProject other (${r})`)
  }
})

test('the option registries cover every role and flow exactly once', () => {
  assert.deepEqual(client.COMPANY_ROLE_OPTIONS.map((o) => o.id).sort(), [...client.COMPANY_ROLES].sort())
  assert.deepEqual(client.WORK_FLOW_OPTIONS.map((o) => o.id).sort(), [...client.WORK_FLOWS].sort())
  assert.deepEqual([...client.COMPANY_ROLES].sort(), [...ROLES].sort())
  assert.equal(client.roleLabelKey('grc'), 'companyAdmin.roles.grc')
  assert.equal(client.roleLabelKey('nope'), 'companyAdmin.roles.member')
  assert.equal(client.flowLabelKey('worker'), 'companyAdmin.flows.worker')
  assert.equal(client.flowLabelKey(undefined), 'companyAdmin.flows.independent')
})

test('roleViewOf: a worker has the queue and no Start; an independent has Start and no queue; mixed has both', () => {
  const w = client.roleViewOf({ companyId: 'c', companyRole: 'member', workFlow: 'worker' })
  assert.equal(w.isWorker, true); assert.equal(w.canStart, false); assert.equal(w.showQueue, true)
  const i = client.roleViewOf({ companyId: 'c', companyRole: 'member', workFlow: 'independent' })
  assert.equal(i.canStart, true); assert.equal(i.showQueue, false)
  const m = client.roleViewOf({ companyId: 'c', companyRole: 'member', workFlow: 'mixed' })
  assert.equal(m.canStart, true); assert.equal(m.showQueue, true); assert.equal(m.isMixed, true)
})

test('roleViewOf: management surfaces per role', () => {
  const pm = client.roleViewOf({ companyId: 'c', companyRole: 'project_manager', workFlow: 'mixed' })
  assert.deepEqual([pm.showPm, pm.showSrPm, pm.showGrc, pm.canCreate, pm.canReassignProject, pm.readOnly], [true, false, false, true, false, false])
  const sr = client.roleViewOf({ companyId: 'c', companyRole: 'senior_project_manager', workFlow: 'independent' })
  assert.deepEqual([sr.showPm, sr.showSrPm, sr.showGrc, sr.canCreate, sr.canReassignProject, sr.canAssignManager, sr.seesAll], [true, true, true, true, true, true, true])
  const grc = client.roleViewOf({ companyId: 'c', companyRole: 'grc', workFlow: 'independent' })
  assert.deepEqual([grc.showPm, grc.showSrPm, grc.showGrc, grc.canCreate, grc.canAssign, grc.readOnly, grc.seesAll], [false, false, true, false, false, true, true])
  const adm = client.roleViewOf({ companyId: 'c', companyRole: 'company_admin', workFlow: 'independent' })
  assert.deepEqual([adm.showPm, adm.showSrPm, adm.showGrc, adm.canCreate], [true, true, true, true])
  const member = client.roleViewOf({ companyId: 'c', companyRole: 'member', workFlow: 'independent' })
  assert.deepEqual([member.showPm, member.showSrPm, member.showGrc], [false, false, false])
  // Templates: managers + admin manage, GRC only reads, a member sees nothing.
  assert.deepEqual([pm.showTemplates, pm.canManageTemplates], [true, true])
  assert.deepEqual([sr.showTemplates, sr.canManageTemplates], [true, true])
  assert.deepEqual([adm.showTemplates, adm.canManageTemplates], [true, true])
  assert.deepEqual([grc.showTemplates, grc.canManageTemplates], [true, false])
  assert.deepEqual([member.showTemplates, member.canManageTemplates], [false, false])
})

test('roleViewOf: an individual (no company) is plain self-serve with nothing enterprise', () => {
  const v = client.roleViewOf({ id: 'u', companyId: null, workFlow: null })
  assert.equal(v.company, false); assert.equal(v.canStart, true); assert.equal(v.showQueue, false)
  assert.equal(v.showPm || v.showSrPm || v.showGrc, false)
  assert.equal(client.roleViewOf(null).canStart, true)
})

test('assignablePeople / managerCandidates filter by flow and role', () => {
  const people = [
    { id: 'a', workFlow: 'worker', companyRole: 'member' },
    { id: 'b', workFlow: 'independent', companyRole: 'project_manager' },
    { id: 'c', workFlow: 'mixed', companyRole: 'senior_project_manager' },
    { id: 'd', workFlow: 'independent', companyRole: 'grc' },
  ]
  assert.deepEqual(client.assignablePeople(people).map((p) => p.id), ['a', 'c'])
  assert.deepEqual(client.managerCandidates(people).map((p) => p.id), ['b', 'c'])
  assert.deepEqual(client.assignablePeople(null), [])
  // Directory denied: flow / role unknown, the data's evidence decides.
  const derived = [
    { id: 'x', workFlow: null, companyRole: null, seenAsAssignee: true, seenAsManager: false },
    { id: 'y', workFlow: null, companyRole: null, seenAsAssignee: false, seenAsManager: true },
    { id: 'z', workFlow: null, companyRole: null, seenAsAssignee: false, seenAsManager: false },
  ]
  assert.deepEqual(client.assignablePeople(derived).map((p) => p.id), ['x'])
  assert.deepEqual(client.managerCandidates(derived).map((p) => p.id), ['y'])
})
