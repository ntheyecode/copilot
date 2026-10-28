// Project model (pure): constructors, task state transitions, and the dependency-
// aware next / available-task resolver + the forward-learnings ledger.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  newProject, newTask, normalizeEndState, canTransitionTask,
  nextActionableTask, availableTasks, dependenciesMet, isProjectDone,
  deriveProjectState, appendLearning,
} from './work_project.js'

const proj = () => {
  const p = newProject({ id: 'pr1', workUserId: 'u1', customerId: 'acme', name: 'ServiceNow rollout', goal: 'Fresh ITSM rollout', endState: { done: 'all users live', checks: ['SLAs active', 'portal up'] } })
  p.tasks = [
    newTask({ id: 't1', title: 'Instance setup', order: 1 }),
    newTask({ id: 't2', title: 'CMDB', order: 2, dependsOn: ['t1'] }),
    newTask({ id: 't3', title: 'Portal', order: 3, dependsOn: ['t1'] }),      // independent of t2
    newTask({ id: 't4', title: 'Go-live', order: 4, dependsOn: ['t2', 't3'] }),
  ]
  return p
}

test('newProject / newTask / normalizeEndState shapes', () => {
  const p = newProject({ id: 'p', workUserId: 'u', name: '', goal: 'g' })
  assert.equal(p.state, 'planning')
  assert.equal(p.customerId, 'default')
  assert.equal(p.name, 'Untitled project')
  assert.deepEqual(p.learnings, [])
  const es = normalizeEndState({ done: 'x', checks: ['a', '', 'b'] })
  assert.deepEqual(es, { done: 'x', checks: ['a', 'b'] })
  const t = newTask({ id: 't', title: 'Do thing', order: 2 })
  assert.equal(t.state, 'pending'); assert.equal(t.expanded, false); assert.equal(t.goal, 'Do thing')
})

test('task state transitions are guarded', () => {
  assert.ok(canTransitionTask('pending', 'active'))
  assert.ok(canTransitionTask('active', 'done'))
  assert.ok(canTransitionTask('active', 'pending'))   // pause
  assert.ok(canTransitionTask('done', 'rerun'))
  assert.ok(canTransitionTask('rerun', 'active'))
  assert.ok(!canTransitionTask('pending', 'done'))    // cannot skip straight to done
  assert.ok(!canTransitionTask('done', 'active'))     // re-do goes through rerun
  assert.ok(!canTransitionTask('pending', 'garbage'))
})

test('nextActionableTask + availableTasks respect dependencies and order', () => {
  const p = proj()
  // only t1 is actionable at first (t2/t3 depend on t1, t4 on t2+t3)
  assert.equal(nextActionableTask(p).id, 't1')
  assert.deepEqual(availableTasks(p).map((t) => t.id), ['t1'])
  // finish t1 -> t2 and t3 both become available (independent); next = lowest order t2
  p.tasks.find((t) => t.id === 't1').state = 'done'
  assert.equal(nextActionableTask(p).id, 't2')
  assert.deepEqual(availableTasks(p).map((t) => t.id), ['t2', 't3'])
  // t4 still blocked until BOTH t2 and t3 are done
  p.tasks.find((t) => t.id === 't2').state = 'done'
  assert.equal(dependenciesMet(p, p.tasks.find((t) => t.id === 't4')), false)
  assert.equal(nextActionableTask(p).id, 't3')
  p.tasks.find((t) => t.id === 't3').state = 'done'
  assert.equal(nextActionableTask(p).id, 't4')
})

test('project done + derived state', () => {
  const p = proj()
  assert.equal(isProjectDone(p), false)
  assert.equal(deriveProjectState(p), 'planning')
  p.tasks[0].state = 'active'
  assert.equal(deriveProjectState(p), 'active')
  for (const t of p.tasks) t.state = 'done'
  assert.equal(isProjectDone(p), true)
  assert.equal(deriveProjectState(p), 'done')
})

test('forward-learnings ledger dedupes and is bounded', () => {
  const p = proj()
  p.learnings = appendLearning(p, 'In ServiceNow the SLA editor moved under Service Catalog', 't2')
  p.learnings = appendLearning(p, 'in servicenow the sla editor moved under service catalog')  // dup (case)
  assert.equal(p.learnings.length, 1)
  assert.equal(p.learnings[0].source, 't2')
  p.learnings = appendLearning(p, '')   // empty ignored
  assert.equal(p.learnings.length, 1)
})
