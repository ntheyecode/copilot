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
