// Enterprise project management (store): company-scoped projects, assignment +
// reassignment, worker-flow enforcement, project reassignment, the computed risk
// register, productivity, and server-side segregation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-roles-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

function company() { return store.createCompany({ name: uniq('Co') }) }
function member(co, role, flow) {
  const u = store.createManagedUser({ username: uniq('u'), password: 'Passw0rd!x', companyId: co.id, companyRole: role })
  if (flow) store.updateCompanyMember(co.id, u.id, { workFlow: flow })
  return u
}

test('PM creates a company project, assigns a task; independent flow is refused', () => {
  const co = company()
  const pm = member(co, 'project_manager')
  const worker = member(co, 'member', 'worker')
  const indep = member(co, 'member', 'independent')
  const p = store.createCompanyProject(pm.id, { name: 'Rollout', goal: 'g', tasks: [{ title: 'A', doneState: 'a done' }, { title: 'B', doneState: 'b done' }] })
  assert.equal(p.companyId, co.id)
  assert.equal(p.managerId, pm.id)
  const t0 = p.tasks[0]
  store.assignProjectTask(pm.id, p.id, t0.id, worker.id)
  assert.equal(store.listAssignedTasks(worker.id).length, 1)
  assert.throws(() => store.assignProjectTask(pm.id, p.id, p.tasks[1].id, indep.id), /independent flow/i)  // cannot assign to independent
})

test('worker cannot self-start; independent can', () => {
  const co = company()
  const worker = member(co, 'member', 'worker')
  const indep = member(co, 'member', 'independent')
  const pm = member(co, 'project_manager')
  assert.equal(store.userCanStartOwnTask(worker.id), false)
  assert.equal(store.userCanStartOwnTask(indep.id), true)
  assert.equal(store.userCanStartOwnTask(pm.id), true)       // PM defaults to independent flow
})

test('reassign a task between users moves it and logs it', () => {
  const co = company()
  const pm = member(co, 'project_manager')
  const w1 = member(co, 'member', 'worker'); const w2 = member(co, 'member', 'mixed')
  const p = store.createCompanyProject(pm.id, { name: 'P', goal: 'g', tasks: [{ title: 'A', doneState: 'd' }] })
  const t = p.tasks[0]
  store.assignProjectTask(pm.id, p.id, t.id, w1.id)
  store.reassignProjectTask(pm.id, p.id, t.id, w2.id)
  assert.equal(store.listAssignedTasks(w1.id).length, 0)   // left w1
  assert.equal(store.listAssignedTasks(w2.id).length, 1)   // now w2
  const log = store.listProjectLog(pm.id, { projectId: p.id })
  assert.ok(log.some((e) => e.kind === 'task_reassigned' && e.to === w2.id))
})

test('segregation: a PM sees only own projects; Sr PM/GRC see all; GRC cannot write', () => {
  const co = company()
  const pmA = member(co, 'project_manager'); const pmB = member(co, 'project_manager')
  const srpm = member(co, 'senior_project_manager'); const grc = member(co, 'grc')
  const p = store.createCompanyProject(pmA.id, { name: 'A', goal: 'g', tasks: [{ title: 'T', doneState: 'd' }] })
  assert.equal(store.listProjectsForUser(pmA.id).length, 1)
  assert.equal(store.listProjectsForUser(pmB.id).length, 0)   // another PM does not see it
  assert.equal(store.listProjectsForUser(srpm.id).length, 1)  // Sr PM sees all
  assert.equal(store.listProjectsForUser(grc.id).length, 1)   // GRC sees all
  // GRC cannot assign (read-only): the project is not in its manage scope.
  assert.throws(() => store.assignProjectTask(grc.id, p.id, p.tasks[0].id, pmA.id), /do not manage/i)
})

test('Sr PM reassigns a whole project PM->PM; a plain PM cannot', () => {
  const co = company()
  const pmA = member(co, 'project_manager'); const pmB = member(co, 'project_manager')
  const srpm = member(co, 'senior_project_manager')
  const p = store.createCompanyProject(pmA.id, { name: 'P', goal: 'g', tasks: [{ title: 'T', doneState: 'd' }] })
  assert.throws(() => store.reassignProject(pmA.id, p.id, pmB.id), /senior project manager/i)  // plain PM cannot
  store.reassignProject(srpm.id, p.id, pmB.id)
  assert.equal(store.listProjectsForUser(pmB.id).length, 1)   // now managed by B
  assert.equal(store.listProjectsForUser(pmA.id).length, 0)   // A no longer manages
})

test('GRC risk register flags a task assigned over 5 days ago; a worker is refused', () => {
  const co = company()
  const pm = member(co, 'project_manager'); const w = member(co, 'member', 'worker'); const grc = member(co, 'grc')
  const p = store.createCompanyProject(pm.id, { name: 'P', goal: 'g', tasks: [{ title: 'T', doneState: 'd' }] })
  store.assignProjectTask(pm.id, p.id, p.tasks[0].id, w.id)
  // backdate the assignment to 10 days ago (the project object is a live reference)
  store.listProjectsForUser(grc.id)[0].tasks[0].assignedAt = new Date(Date.now() - 10 * 86400000).toISOString()
  const risks = store.companyRiskRegister(grc.id)
  assert.ok(risks.some((r) => r.kind === 'sla_breach'))
  assert.throws(() => store.companyRiskRegister(w.id), /not permitted/i)  // a worker cannot see oversight
})

test('productivity: a PM reads an assignee; a worker cannot read another', () => {
  const co = company()
  const pm = member(co, 'project_manager'); const w1 = member(co, 'member', 'worker'); const w2 = member(co, 'member', 'worker')
  const p = store.createCompanyProject(pm.id, { name: 'P', goal: 'g', tasks: [{ title: 'A', doneState: 'd' }, { title: 'B', doneState: 'd' }] })
  store.assignProjectTask(pm.id, p.id, p.tasks[0].id, w1.id)
  store.assignProjectTask(pm.id, p.id, p.tasks[1].id, w1.id)
  const prod = store.userProductivity(pm.id, w1.id)
  assert.equal(prod.counts.assigned, 2)
  assert.equal(prod.counts.notStarted, 2)
  assert.deepEqual(store.userProductivity(w1.id, w1.id).counts.assigned, 2)   // own is allowed
  assert.throws(() => store.userProductivity(w2.id, w1.id), /not permitted/i)  // a worker cannot read another's
})

test('worker runs an assigned company task: link session + finalize closes it', () => {
  const co = company()
  const pm = member(co, 'project_manager'); const w = member(co, 'member', 'worker')
  const p = store.createCompanyProject(pm.id, { name: 'P', goal: 'g', tasks: [{ title: 'A', doneState: 'd' }] })
  store.assignProjectTask(pm.id, p.id, p.tasks[0].id, w.id)
  const ctx = store.getAssignedTaskForExpand(w.id, p.id, p.tasks[0].id)   // worker resolves their own task
  assert.ok(ctx && ctx.task.id === p.tasks[0].id)
  assert.equal(store.getAssignedTaskForExpand(pm.id, p.id, p.tasks[0].id), null)   // PM is not the assignee
  const sess = store.createWorkSession(w.id, { goal: 'A' })
  store.linkAssignedTaskSession(w.id, p.id, p.tasks[0].id, sess.id)
  const active = store.listProjectsForUser(pm.id)[0]
  assert.equal(active.tasks[0].state, 'active')
  assert.equal(active.tasks[0].sessionId, sess.id)
  // finalize as the worker closes the COMPANY task (owner-agnostic completion)
  store.completeProjectTaskForSession(w.id, sess.id, { outcome: { ok: true }, telemetry: { steps: 3 } })
  const done = store.listProjectsForUser(pm.id)[0]
  assert.equal(done.tasks[0].state, 'done')
  assert.equal(done.tasks[0].outcome.ok, true)
})
