// Cross-role / cross-tenant authorization closure evidence (audit IP-06).
// These are the STORE-level boundaries that back the HTTP route guards: even if a
// route guard were bypassed, the store still refuses a company admin acting on
// another company, a plain member acting as an admin, or one company's data
// (KB, sessions, productivity, roster) leaking into another's.
// SYNTHETIC users/companies only, in an isolated temp data dir.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const storePath = new URL('./store.js', import.meta.url).href
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-crossrole-'))
process.env.PORT = '0'
const store = await import(storePath)

const is404 = (e) => e && e.status === 404
const is403 = (e) => e && e.status === 403
const PW = 'Passw0rd!x'

// Two companies, each with an admin, an executive, and two members.
const coA = store.createCompany({ name: 'Crossrole Alpha Test', seats: 10, adminSeats: 2 })
const coB = store.createCompany({ name: 'Crossrole Bravo Test', seats: 10, adminSeats: 2 })
const mk = (username, co, role) => store.createManagedUser({ username, password: PW, companyId: co.id, companyRole: role })
const adminA = mk('xr_admin_alpha', coA, 'company_admin')
const execA = mk('xr_exec_alpha', coA, 'executive')
const memberA1 = mk('xr_member_alpha1', coA, 'member')
const memberA2 = mk('xr_member_alpha2', coA, 'member')
const adminB = mk('xr_admin_bravo', coB, 'company_admin')
const execB = mk('xr_exec_bravo', coB, 'executive')
const memberB1 = mk('xr_member_bravo1', coB, 'member')
const memberB2 = mk('xr_member_bravo2', coB, 'member')

// Completed sessions: 1 for A, 3 for B (distinct goals so any leak is detectable).
function finished(user, goal) {
  const s = store.createWorkSession(user.id, { goal })
  store.setWorkSessionSteps(user.id, s.id, [{ do: 'one' }, { do: 'two' }])
  store.endWorkSession(user.id, s.id)
  return s
}
const sessA = finished(memberA1, 'ALPHA-ONLY quarterly close')
const sessB1 = finished(memberB1, 'BRAVO-ONLY payroll audit')
const sessB2 = finished(memberB1, 'BRAVO-ONLY invoice reconcile')
const sessB3 = finished(memberB2, 'BRAVO-ONLY budget review')

test('1. a company-A admin cannot remove a company-B member (and B is untouched)', () => {
  assert.throws(() => store.removeCompanyMember(coA.id, memberB1.id, { reason: 'hostile', byUserId: adminA.id }), is404)
  assert.throws(() => store.removeCompanyMember(coA.id, adminB.id, { reason: 'hostile', byUserId: adminA.id }), is404)
  assert.throws(() => store.removeCompanyMember(coA.id, execB.id, { reason: 'hostile', byUserId: adminA.id }), is404)
  // No company in scope at all is refused outright.
  assert.throws(() => store.removeCompanyMember(null, memberB1.id), is403)
  assert.throws(() => store.removeCompanyMember(undefined, memberA1.id), is403)
  const b = store.getWorkUser(memberB1.id)
  assert.equal(b.companyId, coB.id, 'B member still attached to B')
  assert.equal(b.companyRole, 'member', 'B member role intact')
  // The reverse direction is refused too.
  assert.throws(() => store.removeCompanyMember(coB.id, memberA1.id), is404)
  assert.equal(store.getWorkUser(memberA1.id).companyId, coA.id)
})

test('1b. cross-company role/plan changes are refused', () => {
  assert.throws(() => store.updateCompanyMember(coA.id, memberB1.id, { companyRole: 'company_admin' }), is404)
  assert.throws(() => store.updateCompanyMember(coA.id, memberB1.id, { tier: 'premium' }), is404)
  assert.equal(store.getWorkUser(memberB1.id).companyRole, 'member')
  assert.notEqual(store.getWorkUser(memberB1.id).tier, 'premium')
})

test('2. company knowledge bases are private: A never sees B and vice versa', () => {
  // Facts avoid the word "secret" as a label: learnings now run through the shared
  // scrub chokepoint, whose labelled-secret rule would redact "secret <word>" (the
  // same way it does for goal/doc text). This test is about cross-company privacy,
  // not redaction, so use neutral wording.
  store.addLearning(memberA1.id, { app: 'AlphaPortal', fact: 'ALPHA flow: approvals live under Admin and Workflow' })
  store.addLearning(memberB1.id, { app: 'BravoPortal', fact: 'BRAVO flow: exports live under Reports and Archive' })
  const expA = store.exportCompanyLearnings(coA.id)
  const expB = store.exportCompanyLearnings(coB.id)
  assert.ok(expA.some((l) => /ALPHA flow/.test(l.fact)), 'A has its own entry')
  assert.ok(!expA.some((l) => /BRAVO/.test(l.fact + l.app)), 'A export carries no B entry')
  assert.ok(expB.some((l) => /BRAVO flow/.test(l.fact)), 'B has its own entry')
  assert.ok(!expB.some((l) => /ALPHA/.test(l.fact + l.app)), 'B export carries no A entry')
  // Retrieval for a user is scoped the same way.
  assert.equal(store.getLearningsFor(memberB2.id, { app: 'AlphaPortal', goal: 'approvals workflow' }).length, 0)
  assert.equal(store.getLearningsFor(memberA2.id, { app: 'BravoPortal', goal: 'exports archive' }).length, 0)
  // An unknown company id yields nothing, never someone else's KB.
  assert.deepEqual(store.exportCompanyLearnings('co-does-not-exist'), [])
  assert.deepEqual(store.exportCompanyLearnings(null), [])
})

test('2b. clearing one company KB does not touch the other', () => {
  const beforeB = store.exportCompanyLearnings(coB.id).length
  assert.ok(beforeB > 0)
  store.clearCompanyLearnings(coA.id)
  assert.equal(store.exportCompanyLearnings(coA.id).length, 0)
  assert.equal(store.exportCompanyLearnings(coB.id).length, beforeB, 'B KB unaffected by clearing A')
})

test('3. company admin session access is scoped to their own company', () => {
  // same-company: allowed
  assert.ok(store.getWorkSessionForCompanyAdmin(adminA.id, sessA.id), 'A admin reads A member session')
  assert.ok(store.getWorkSessionForCompanyAdmin(adminB.id, sessB1.id), 'B admin reads B member session')
  // cross-company: denied (null, not an object and not a throw leaking existence)
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, sessB1.id), null)
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, sessB3.id), null)
  assert.equal(store.getWorkSessionForCompanyAdmin(adminB.id, sessA.id), null)
  // nonexistent session / user
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, 'no-such-session'), null)
  assert.equal(store.getWorkSessionForCompanyAdmin('no-such-user', sessA.id), null)
})

test('3b. company oversight listings never mix companies', () => {
  const listA = store.listWorkSessionsForCompany(coA.id).map((s) => s.id)
  const listB = store.listWorkSessionsForCompany(coB.id).map((s) => s.id)
  assert.ok(listA.includes(sessA.id))
  assert.ok(![sessB1.id, sessB2.id, sessB3.id].some((id) => listA.includes(id)), 'no B sessions in A listing')
  assert.ok([sessB1.id, sessB2.id, sessB3.id].every((id) => listB.includes(id)))
  assert.ok(!listB.includes(sessA.id), 'no A session in B listing')
})

test('4. executive productivity is scoped to the exec\'s own company', () => {
  const pa = store.companyProductivity(coA.id)
  const pb = store.companyProductivity(coB.id)
  assert.equal(pa.companyId, coA.id)
  assert.equal(pa.tasksCompleted, 1, 'A sees only its 1 completed task')
  assert.equal(pb.tasksCompleted, 3, 'B sees only its 3 completed tasks')
  assert.equal(pa.members, 4)
  assert.equal(pb.members, 4)
  const jsonA = JSON.stringify(pa)
  const jsonB = JSON.stringify(pb)
  assert.ok(!/xr_\w*bravo|BRAVO/i.test(jsonA), 'no Bravo user or goal text in A productivity')
  assert.ok(!/xr_\w*alpha|ALPHA/i.test(jsonB), 'no Alpha user or goal text in B productivity')
  assert.ok(pa.topMembers.every((m) => /alpha/i.test(m.name)), 'A top members are all A people')
  assert.ok(pb.topMembers.every((m) => /bravo/i.test(m.name)), 'B top members are all B people')
  // Unknown company / null gives an empty rollup, never a global aggregate.
  assert.equal(store.companyProductivity('co-does-not-exist').tasksCompleted, 0)
  assert.equal(store.companyProductivity(null).tasksCompleted, 0)
  assert.equal(store.companyProductivity(null).members, 0)
})

test('5. removing a member does not leak into or affect another company', () => {
  const rosterB = store.listCompanyUsers(coB.id).map((u) => u.id).sort()
  const prodBBefore = store.companyProductivity(coB.id)
  const listBBefore = store.listWorkSessionsForCompany(coB.id).length
  // Legit same-company removal inside A.
  const res = store.removeCompanyMember(coA.id, memberA2.id, { reason: 'left the team', byUserId: adminA.id })
  assert.equal(res.ok, true)
  const detached = store.getWorkUser(memberA2.id)
  assert.equal(detached.companyId, null, 'removed user is detached from A')
  assert.equal(detached.companyRole, null)
  assert.ok(!store.listCompanyUsers(coA.id).some((u) => u.id === memberA2.id), 'gone from A roster')
  // B is byte-for-byte unaffected.
  assert.deepEqual(store.listCompanyUsers(coB.id).map((u) => u.id).sort(), rosterB, 'B roster unchanged')
  assert.equal(store.companyProductivity(coB.id).members, prodBBefore.members, 'B member count unchanged')
  assert.equal(store.companyProductivity(coB.id).tasksCompleted, prodBBefore.tasksCompleted)
  assert.equal(store.listWorkSessionsForCompany(coB.id).length, listBBefore, 'B session list unchanged')
  // The detached user is not in B either, and no longer reachable by A's admin.
  assert.ok(!store.listCompanyUsers(coB.id).some((u) => u.id === memberA2.id))
  assert.throws(() => store.removeCompanyMember(coA.id, memberA2.id), is404, 'already detached: not in your company')
  assert.throws(() => store.removeCompanyMember(coB.id, memberA2.id), is404)
  // Detached user's session is no longer readable via A's admin path.
  const s = store.createWorkSession(memberA2.id, { goal: 'solo after leaving' })
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, s.id), null)
})

test('6. a plain member (and an executive) is never treated as an admin', () => {
  // Only role 'company_admin' passes the admin-scoped session gate.
  assert.equal(store.getWorkSessionForCompanyAdmin(memberA1.id, sessA.id), null, 'member denied on own company session')
  assert.equal(store.getWorkSessionForCompanyAdmin(execA.id, sessA.id), null, 'executive is not a company admin')
  assert.equal(store.getWorkSessionForCompanyAdmin(memberB1.id, sessA.id), null)
  assert.equal(store.getWorkSessionForCompanyAdmin(adminA.id, sessA.id)?.id, sessA.id, 'sanity: the real admin passes')
  // Public shape exposes the role faithfully (the HTTP guards read this).
  assert.equal(store.publicWorkUser(store.getWorkUser(memberA1.id)).companyRole, 'member')
  assert.equal(store.publicWorkUser(store.getWorkUser(execA.id)).companyRole, 'executive')
  assert.equal(store.publicWorkUser(store.getWorkUser(adminA.id)).companyRole, 'company_admin')
  // A standalone user has no company role at all.
  const solo = store.createWorkUser({ username: 'xr_solo', password: PW })
  assert.equal(store.publicWorkUser(solo.id ? store.getWorkUser(solo.id) : solo).companyRole, null)
})

test('6b. role input is validated strictly: a typo or escalation string never becomes admin', () => {
  // A typo like 'admin' must be a 400, never silently read as member or admin.
  assert.throws(() => store.updateCompanyMember(coA.id, memberA1.id, { companyRole: 'admin' }), (e) => e.status === 400)
  assert.throws(() => store.updateCompanyMember(coA.id, memberA1.id, { companyRole: 'superadmin' }), (e) => e.status === 400)
  assert.throws(() => store.createManagedUser({ username: 'xr_bad_role', password: PW, companyId: coA.id, companyRole: 'root' }), (e) => e.status === 400)
  assert.equal(store.getWorkUser(memberA1.id).companyRole, 'member', 'role unchanged after refused escalation')
  assert.equal(store.findWorkUser('xr_bad_role') || null, null, 'refused add left no stray account')
})
