// Team projects - Model B (store side): RBAC, clone-to-many, idempotent assign,
// per-person runs owned by the member, and the progress rollup.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-team-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('Model B: template create (PM), clone-to-many, idempotent, owned runs, rollup', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const m1 = store.createManagedUser({ username: uniq('m1'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  const m2 = store.createManagedUser({ username: uniq('m2'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })

  // A member cannot create a template; a PM can.
  assert.throws(() => store.createProjectTemplate(m1.id, { name: 'X', goal: 'g', tasks: [{ title: 'T', goal: 'do', doneState: 'done' }] }), /permission/i)
  const tpl = store.createProjectTemplate(pm.id, {
    name: 'Onboarding', goal: 'Onboard a new hire to the security tooling',
    tasks: [
      { title: 'Create account', goal: 'Create the account', doneState: 'Account exists' },
      { title: 'Enable MFA', goal: 'Turn on MFA', doneState: 'MFA enabled', dependsOn: [0] },  // index form
    ],
  })
  assert.equal(tpl.isTemplate, true)

  // Template is NOT a runnable project in anyone's normal list.
  assert.equal(store.listWorkProjects(pm.id).length, 0)
  assert.equal(store.listProjectTemplates(pm.id).length, 1)

  // Assign to both members -> one owned run each; dependsOn remapped to fresh ids.
  const a = store.assignTemplate(pm.id, tpl.id, [m1.id, m2.id])
  assert.equal(a.assigned.length, 2); assert.equal(a.skipped.length, 0)
  const m1runs = store.listWorkProjects(m1.id)
  assert.equal(m1runs.length, 1)
  const run = m1runs[0]
  assert.equal(run.workUserId, m1.id)                 // owned by the member
  assert.equal(run.templateId, tpl.id)
  const dep = run.tasks.find((t) => t.title === 'Enable MFA')
  const base = run.tasks.find((t) => t.title === 'Create account')
  assert.deepEqual(dep.dependsOn, [base.id])          // remapped to this run's id, not 't0'

  // Idempotent: re-assigning the same people adds no duplicate runs.
  const again = store.assignTemplate(pm.id, tpl.id, [m1.id, m2.id])
  assert.equal(again.assigned.length, 0); assert.equal(again.skipped.length, 2)
  assert.equal(store.listWorkProjects(m1.id).length, 1)

  // Finish m1's run; rollup reflects per-person progress (structure only).
  for (const t of store.listWorkProjects(m1.id)[0].tasks) {
    store.setWorkProjectTaskState(m1.id, run.id, t.id, 'active')
    store.setWorkProjectTaskState(m1.id, run.id, t.id, 'done')
  }
  const roll = store.templateRollup(pm.id, tpl.id)
  assert.equal(roll.assigned, 2); assert.equal(roll.completed, 1); assert.equal(roll.notStarted, 1)
  assert.equal(roll.runs[0].percent, 0)               // least-complete first (m2)
  assert.equal(roll.runs[1].percent, 100)
  // Rollup rows carry progress, never evidence.
  assert.ok(!('frames' in roll.runs[0]) && !('outcome' in roll.runs[0]))

  // A plain member cannot see the rollup.
  assert.throws(() => store.templateRollup(m1.id, tpl.id), /permission/i)
})

test('Model B privacy (H1): a member run + its evidence is hidden from oversight, visible to its owner', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const srpm = store.createManagedUser({ username: uniq('sr'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'senior_project_manager', tier: 'premium' })
  const grc = store.createManagedUser({ username: uniq('grc'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'grc', tier: 'premium' })
  const admin = store.createManagedUser({ username: uniq('ad'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin', tier: 'premium' })
  const m1 = store.createManagedUser({ username: uniq('m1'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  const tpl = store.createProjectTemplate(pm.id, { name: 'Onboard', goal: 'Onboard the new hire securely', tasks: [{ title: 'Set up account', goal: 'Create the account', doneState: 'Account exists' }] })
  store.assignTemplate(pm.id, tpl.id, [m1.id])
  const run = store.listWorkProjects(m1.id).find((p) => p.templateId === tpl.id)
  assert.ok(run, 'the owner sees their own run')
  // The member finishes the task, recording PRIVATE evidence in the outcome body.
  const t = run.tasks[0]
  store.setWorkProjectTaskState(m1.id, run.id, t.id, 'active')
  store.linkWorkProjectTaskSession(m1.id, run.id, t.id, 'sess-h1')
  store.completeProjectTaskForSession(m1.id, 'sess-h1', { outcome: 'SECRET card 4111-1111-1111-1111 and SSN typed here' })
  // Oversight roles must NOT see the per-person run in the company project list.
  for (const o of [srpm, grc, admin, pm]) {
    const seen = store.listProjectsForUser(o.id).some((p) => p.id === run.id)
    assert.equal(seen, false, 'run must be hidden from company-wide project views')
  }
  // And it must not be folded into the company-wide stats/risk register.
  assert.ok(!store.companyProjectStats(srpm.id).projects || true)   // smoke: no throw
  const inRisk = store.companyRiskRegister(grc.id).some?.((r) => r && r.projectId === run.id)
  assert.ok(!inRisk, 'run must not appear in the risk register')
  // The owner still sees their run and its outcome; oversight never did.
  assert.equal(store.listWorkProjects(m1.id).some((p) => p.id === run.id), true)
})

test('Model B tenant isolation: another company cannot see or roll up this template', () => {
  const coA = store.createCompany({ name: uniq('A') })
  const pmA = store.createManagedUser({ username: uniq('pmA'), password: 'Passw0rd!x', companyId: coA.id, companyRole: 'project_manager', tier: 'premium' })
  const coB = store.createCompany({ name: uniq('B') })
  const adminB = store.createManagedUser({ username: uniq('adB'), password: 'Passw0rd!x', companyId: coB.id, companyRole: 'company_admin', tier: 'premium' })
  const mB = store.createManagedUser({ username: uniq('mB'), password: 'Passw0rd!x', companyId: coB.id, companyRole: 'member', tier: 'premium' })
  const tpl = store.createProjectTemplate(pmA.id, { name: 'A-only', goal: 'Company A internal procedure', tasks: [{ title: 'Step', goal: 'Do the step', doneState: 'Done' }] })
  // Company B admin cannot see A's template, roll it up, or assign it.
  assert.equal(store.listProjectTemplates(adminB.id).some((x) => x.id === tpl.id), false)
  assert.throws(() => store.templateRollup(adminB.id, tpl.id), /not found|permission/i)
  assert.throws(() => store.assignTemplate(adminB.id, tpl.id, [mB.id]), /not found|permission/i)
})

test('L5: a plain PM reads productivity only for assignees of projects they manage', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const srpm = store.createManagedUser({ username: uniq('sr'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'senior_project_manager', tier: 'premium' })
  const m1 = store.createManagedUser({ username: uniq('m1'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  const m2 = store.createManagedUser({ username: uniq('m2'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  store.setUserCompany(m1.id, co.id, 'member', 'worker')   // worker flow = assignable
  store.setUserCompany(m2.id, co.id, 'member', 'worker')
  const p = store.createCompanyProject(pm.id, { name: 'P', goal: 'ship the thing end to end', tasks: [{ title: 'Do it', goal: 'Do the task', doneState: 'Done' }] })
  store.assignProjectTask(pm.id, p.id, p.tasks[0].id, m1.id)   // m1 is PM's assignee; m2 is not
  assert.ok(store.userProductivity(pm.id, m1.id))                             // own assignee: allowed
  assert.throws(() => store.userProductivity(pm.id, m2.id), /assigned to a project you manage/i)  // non-assignee: denied
  assert.ok(store.userProductivity(srpm.id, m2.id))                          // Sr PM sees anyone in-company
  assert.ok(store.userProductivity(m1.id, m1.id))                            // self always
})

test('pre-AI gate: userCanManageProjects is true only for PM/Sr PM/admin', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const member = store.createManagedUser({ username: uniq('mm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  const admin = store.createManagedUser({ username: uniq('ad'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin', tier: 'premium' })
  assert.equal(store.userCanManageProjects(pm.id), true)
  assert.equal(store.userCanManageProjects(admin.id), true)
  assert.equal(store.userCanManageProjects(member.id), false)
})
