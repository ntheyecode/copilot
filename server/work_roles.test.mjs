// Enterprise RBAC single source: flows, roles, the permission matrix, SLA risk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as R from './work_roles.js'

test('flow governs start vs receive, independent is the safe default', () => {
  assert.equal(R.normalizeFlow('bogus'), 'independent')
  assert.equal(R.canStartOwnTask('worker'), false)   // worker never self-starts
  assert.equal(R.canStartOwnTask('independent'), true)
  assert.equal(R.canStartOwnTask('mixed'), true)
  assert.equal(R.canReceiveAssignment('independent'), false)  // independent is never assigned to
  assert.equal(R.canReceiveAssignment('worker'), true)
  assert.equal(R.canReceiveAssignment('mixed'), true)
})

test('Sr PM is a superset of PM; GRC is read-only', () => {
  assert.equal(R.isPM('project_manager'), true)
  assert.equal(R.isPM('senior_project_manager'), true)   // superset
  assert.equal(R.isPM('grc'), false)
  assert.equal(R.canCreateProject('grc'), false)
  assert.equal(R.canCreateProject('senior_project_manager'), true)
  assert.equal(R.canReassignProject('project_manager'), false)   // only Sr PM / admin
  assert.equal(R.canReassignProject('senior_project_manager'), true)
  assert.equal(R.canAssignProjectManager('project_manager'), false)
  assert.equal(R.canAssignProjectManager('senior_project_manager'), true)
  assert.equal(R.isReadOnlyOversight('grc'), true)
  assert.equal(R.canSetUserFlowAndRole('senior_project_manager'), false)  // only admin sets flow/role
  assert.equal(R.canSetUserFlowAndRole('company_admin'), true)
})

test('trainer is an additive grant, only with member or PM; it authors workflows', () => {
  assert.ok(R.GRANTS.includes('trainer'))
  assert.equal(R.COMPANY_ROLES.includes('trainer'), false)   // NOT a primary role
  // The two permitted combinations, and nothing else.
  assert.equal(R.canGrantTrainer('member'), true)
  assert.equal(R.canGrantTrainer('project_manager'), true)
  assert.equal(R.canGrantTrainer('senior_project_manager'), false)
  assert.equal(R.canGrantTrainer('executive'), false)
  assert.equal(R.canGrantTrainer('grc'), false)
  assert.equal(R.canGrantTrainer('company_admin'), false)
  // sanitizeGrants drops a grant the role may not hold, de-dupes, and rejects junk.
  assert.deepEqual(R.sanitizeGrants('member', ['trainer']), ['trainer'])
  assert.deepEqual(R.sanitizeGrants('project_manager', ['trainer', 'trainer']), ['trainer'])
  assert.deepEqual(R.sanitizeGrants('executive', ['trainer']), [])
  assert.deepEqual(R.sanitizeGrants('member', ['trainer', 'bogus']), ['trainer'])
  assert.deepEqual(R.sanitizeGrants('member', null), [])
  // Authoring: the trainer grant, OR a company admin (superset).
  assert.equal(R.canAuthorWorkflow('member', ['trainer']), true)
  assert.equal(R.canAuthorWorkflow('project_manager', ['trainer']), true)
  assert.equal(R.canAuthorWorkflow('company_admin', []), true)
  assert.equal(R.canAuthorWorkflow('member', []), false)
  assert.equal(R.canAuthorWorkflow('grc', ['trainer']), true)   // grant present → can author
})

test('project visibility and write scope', () => {
  const proj = { id: 'p1', managerId: 'pmA' }
  assert.equal(R.canViewProject('project_manager', 'pmA', proj), true)   // own
  assert.equal(R.canViewProject('project_manager', 'pmB', proj), false)  // another PM
  assert.equal(R.canViewProject('grc', 'anyone', proj), true)            // GRC sees all (read-only)
  assert.equal(R.canSeeAllProjects('senior_project_manager'), true)
  assert.equal(R.canManageProject('grc', 'x', proj), false)              // GRC never writes
  assert.equal(R.canManageProject('project_manager', 'pmA', proj), true)
  assert.equal(R.canManageProject('project_manager', 'pmB', proj), false)
  assert.equal(R.canManageProject('senior_project_manager', 'pmB', proj), true)  // Sr PM any
})

test('SLA risk: a task assigned over 5 days ago, not done, is a breach', () => {
  const now = Date.UTC(2026, 0, 20)
  const old = new Date(Date.UTC(2026, 0, 10)).toISOString()   // 10 days
  const fresh = new Date(Date.UTC(2026, 0, 18)).toISOString() // 2 days
  assert.equal(R.taskSlaRisk({ id: 't1', state: 'pending', assignedAt: old, assigneeId: 'u1' }, now).kind, 'sla_breach')
  assert.equal(R.taskSlaRisk({ id: 't2', state: 'pending', assignedAt: fresh }, now), null)   // within SLA
  assert.equal(R.taskSlaRisk({ id: 't3', state: 'done', assignedAt: old }, now), null)        // done = no risk
  assert.equal(R.taskSlaRisk({ id: 't4', state: 'pending' }, now), null)                      // never assigned
})
