// Project persistence (store): create with index-based deps remapped to ids, guarded
// task state transitions, next/available resolution, session link, learnings ledger,
// and completed-task outcome/telemetry tagging.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-proj-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)
const user = () => store.createWorkUser({ username: uniq('pj'), password: 'Passw0rd!x' })

test('createWorkProject remaps index-based dependsOn to generated task ids', () => {
  const u = user()
  const p = store.createWorkProject(u.id, {
    customerId: 'acme', name: 'Rollout', goal: 'g', endState: { done: 'live', checks: ['ok'] },
    tasks: [
      { title: 'Setup', doneState: 'instance ready' },
      { title: 'CMDB', doneState: 'cmdb populated', dependsOn: [0] },
      { title: 'Go-live', doneState: 'users live', dependsOn: [0, 1] },
    ],
  })
  assert.equal(p.customerId, 'acme')
  assert.equal(p.tasks.length, 3)
  assert.equal(p.tasks[1].dependsOn[0], p.tasks[0].id)                 // index 0 -> real id
  assert.deepEqual(p.tasks[2].dependsOn, [p.tasks[0].id, p.tasks[1].id])
  assert.equal(store.nextWorkProjectTask(u.id, p.id).id, p.tasks[0].id)  // only Setup actionable
})

test('task state transitions are guarded + next advances by dependency', () => {
  const u = user()
  const p = store.createWorkProject(u.id, { name: 'P', goal: 'g', endState: { done: 'x' }, tasks: [
    { title: 'A', doneState: 'a done' }, { title: 'B', doneState: 'b done', dependsOn: [0] },
  ] })
  const [a, b] = p.tasks
  assert.throws(() => store.setWorkProjectTaskState(u.id, p.id, a.id, 'done'), /cannot move/i)  // pending->done blocked
  store.setWorkProjectTaskState(u.id, p.id, a.id, 'active')
  assert.equal(store.getWorkProject(u.id, p.id).state, 'active')
  store.setWorkProjectTaskState(u.id, p.id, a.id, 'done')
  assert.equal(store.nextWorkProjectTask(u.id, p.id).id, b.id)          // B now actionable
  assert.deepEqual(store.availableWorkProjectTasks(u.id, p.id).map((t) => t.id), [b.id])
})

test('session link, learnings ledger, outcome/telemetry tagging, project done', () => {
  const u = user()
  const p = store.createWorkProject(u.id, { name: 'P', goal: 'g', endState: { done: 'x' }, tasks: [{ title: 'Only', doneState: 'done' }] })
  const t = p.tasks[0]
  store.linkWorkProjectTaskSession(u.id, p.id, t.id, 'ws_demo')
  assert.equal(store.getWorkProject(u.id, p.id).tasks[0].sessionId, 'ws_demo')
  assert.equal(store.getWorkProject(u.id, p.id).tasks[0].expanded, true)
  store.appendWorkProjectLearning(u.id, p.id, 'ServiceNow SLA moved', t.id)
  store.appendWorkProjectLearning(u.id, p.id, 'servicenow sla moved')   // dup ignored
  assert.equal(store.getWorkProject(u.id, p.id).learnings.length, 1)
  store.setWorkProjectTaskState(u.id, p.id, t.id, 'active')
  store.setWorkProjectTaskState(u.id, p.id, t.id, 'done')
  store.recordWorkProjectTaskOutcome(u.id, p.id, t.id, { outcome: 'ok', telemetry: { model: 'x', deepened: true } })
  const done = store.getWorkProject(u.id, p.id)
  assert.equal(done.state, 'done')
  assert.equal(done.tasks[0].outcome, 'ok')
  assert.equal(done.tasks[0].telemetry.deepened, true)
})

test('listWorkProjects is per-user and filterable by customer', () => {
  const u = user()
  store.createWorkProject(u.id, { customerId: 'acme', name: 'P1', goal: 'g', endState: { done: 'x' }, tasks: [{ title: 'T', doneState: 'd' }] })
  store.createWorkProject(u.id, { customerId: 'beta', name: 'P2', goal: 'g', endState: { done: 'x' }, tasks: [{ title: 'T', doneState: 'd' }] })
  assert.equal(store.listWorkProjects(u.id).length, 2)
  assert.equal(store.listWorkProjects(u.id, { customerId: 'acme' }).length, 1)
  assert.equal(store.listWorkProjects(uniq('other')).length, 0)        // isolation: unknown user sees none
})
