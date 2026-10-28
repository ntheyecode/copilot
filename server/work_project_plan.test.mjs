// Project-map planner: parses a breakdown into { name, endState, tasks[] } with
// backward index deps, keeps a single-workflow goal as ONE task (no false project),
// scrubs text, and surfaces a refusal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planProjectMap, planProjectMapSystem } from './work_project_plan.js'

const aiReturning = (payload) => ({ async generate() { return typeof payload === 'string' ? payload : JSON.stringify(payload) } })

test('the system prompt states the one-workflow-one-task rule and the JSON shape', () => {
  const s = planProjectMapSystem({ base: 'BASE' })
  assert.match(s, /ONE WORKFLOW = ONE TASK/i)
  assert.match(s, /"dependsOn"/)
  assert.match(s, /endState/)
})

test('parses a multi-task project map with backward index dependencies', async () => {
  const ai = aiReturning({
    name: 'ServiceNow rollout',
    endState: { done: 'All users live on ITSM', checks: ['SLAs active', 'portal up', ''] },
    tasks: [
      { title: 'Provision instance', goal: 'Stand up the instance', doneState: 'instance reachable', dependsOn: [] },
      { title: 'Build CMDB', goal: 'Populate the CMDB', doneState: 'CIs loaded', dependsOn: [0] },
      { title: 'Go live', goal: 'Cut over', doneState: 'users on prod', dependsOn: [0, 1, 9] },  // 9 is out of range -> pruned
    ],
  })
  const r = await planProjectMap(ai, {}, { base: 'B', goal: 'Fresh ServiceNow ITSM rollout' })
  assert.equal(r.refusal, null)
  assert.equal(r.name, 'ServiceNow rollout')
  assert.equal(r.endState.done, 'All users live on ITSM')
  assert.deepEqual(r.endState.checks, ['SLAs active', 'portal up'])   // empty dropped
  assert.equal(r.tasks.length, 3)
  assert.deepEqual(r.tasks[1].dependsOn, [0])
  assert.deepEqual(r.tasks[2].dependsOn, [0, 1])                      // out-of-range index 9 pruned
})

test('a single-workflow goal returns ONE task (caller treats it as a single task, not a project)', async () => {
  const ai = aiReturning({ name: 'Rename', endState: { done: 'file renamed' }, tasks: [{ title: 'Rename the file', goal: 'rename', doneState: 'renamed', dependsOn: [] }] })
  const r = await planProjectMap(ai, {}, { base: 'B', goal: 'rename a file' })
  assert.equal(r.tasks.length, 1)
})

test('a refusal is surfaced with no tasks', async () => {
  const ai = aiReturning({ refusal: 'That is outside what WorkCoPilot supports.' })
  const r = await planProjectMap(ai, {}, { base: 'B', goal: 'do something disallowed' })
  assert.match(r.refusal, /outside what/i)
  assert.equal(r.tasks.length, 0)
})
