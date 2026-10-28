// Zero-tolerance breakdown gate: a clean multi-real-task project passes; every
// error case (false project, filler task, duplicate, unknown dep, cycle, no end
// state) fails with a matching message; plus predicate boundaries. Fixtures are
// built with the real newTask so the shape stays honest.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newTask } from './work_project.js'
import {
  isRealTask, shouldBeProject, softHintTooBig, validateBreakdown,
} from './work_project_validate.js'

// A real task = goal/title + a done-state. Helper to keep fixtures terse.
const real = (id, title, extra = {}) =>
  newTask({ id, title, doneState: `${title} verified`, ...extra })

// A clean 3-real-task project with deps + a defined end state.
const cleanPlan = () => ({
  goal: 'Stand up the new billing service',
  endState: { done: 'billing live for all tenants', checks: ['invoices send', 'webhooks ok'] },
  tasks: [
    real('t1', 'Provision database', { order: 1 }),
    real('t2', 'Build invoice engine', { order: 2, dependsOn: ['t1'] }),
    real('t3', 'Wire Stripe webhooks', { order: 3, dependsOn: ['t1', 't2'] }),
  ],
})

// --- happy path ------------------------------------------------------------

test('clean 3-real-task project with deps + endState passes (ok:true)', () => {
  const res = validateBreakdown(cleanPlan())
  assert.equal(res.ok, true)
  assert.deepEqual(res.errors, [])
})

// --- error: false project (fewer than 2 real tasks) ------------------------

test('1-task "project" fails -> should be a single task', () => {
  const res = validateBreakdown({
    goal: 'Rotate the API key',
    endState: { done: 'new key live, old revoked' },
    tasks: [real('t1', 'Rotate API key')],
  })
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e === 'should be a single task, not a project'),
    `expected single-task error, got ${JSON.stringify(res.errors)}`)
})

// --- error: filler task (no done-state) ------------------------------------

test('a task with no doneState fails -> false/filler task named', () => {
  const plan = cleanPlan()
  plan.tasks[1] = newTask({ id: 't2', title: 'Build invoice engine', order: 2, dependsOn: ['t1'] }) // no doneState
  const res = validateBreakdown(plan)
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e.startsWith('false/filler task "t2"') && e.includes('missing done-state')),
    `expected filler-task error naming t2, got ${JSON.stringify(res.errors)}`)
})

test('a task with no goal AND no title fails -> missing goal', () => {
  const plan = cleanPlan()
  plan.tasks.push({ id: 't4', title: '', goal: '', doneState: 'something', order: 4, dependsOn: [] })
  const res = validateBreakdown(plan)
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e.startsWith('false/filler task "t4"') && e.includes('missing goal')),
    `expected missing-goal error for t4, got ${JSON.stringify(res.errors)}`)
})

// --- error: duplicate tasks ------------------------------------------------

test('duplicate tasks (same normalized title) fail -> duplicate task', () => {
  const res = validateBreakdown({
    goal: 'g',
    endState: { done: 'd' },
    tasks: [
      real('t1', 'Provision Database'),
      real('t2', '  provision   database  '), // same key, case/space-insensitive
    ],
  })
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e === 'duplicate task "t2"'),
    `expected duplicate-task error, got ${JSON.stringify(res.errors)}`)
})

// --- error: dependsOn to a missing id --------------------------------------

test('dependsOn to a missing id fails -> depends on unknown task', () => {
  const plan = cleanPlan()
  plan.tasks[2] = real('t3', 'Wire Stripe webhooks', { order: 3, dependsOn: ['t1', 'tX'] })
  const res = validateBreakdown(plan)
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e.includes('depends on unknown task "tX"')),
    `expected unknown-task error, got ${JSON.stringify(res.errors)}`)
})

// --- error: dependency cycle (a -> b -> a) ---------------------------------

test('a 2-cycle (a->b->a) fails -> circular dependency', () => {
  const res = validateBreakdown({
    goal: 'g',
    endState: { done: 'd' },
    tasks: [
      real('a', 'Alpha', { dependsOn: ['b'] }),
      real('b', 'Beta', { dependsOn: ['a'] }),
    ],
  })
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e.startsWith('circular dependency')),
    `expected circular-dependency error, got ${JSON.stringify(res.errors)}`)
})

test('a self-dependency (a->a) is a cycle', () => {
  const res = validateBreakdown({
    goal: 'g',
    endState: { done: 'd' },
    tasks: [real('a', 'Alpha', { dependsOn: ['a'] }), real('b', 'Beta')],
  })
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e.startsWith('circular dependency')),
    `expected circular-dependency error, got ${JSON.stringify(res.errors)}`)
})

// --- error: empty endState.done --------------------------------------------

test('empty endState.done fails -> no defined end state', () => {
  const plan = cleanPlan()
  plan.endState = { done: '   ', checks: [] }
  const res = validateBreakdown(plan)
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e === 'no defined end state (cannot confirm completion)'),
    `expected no-end-state error, got ${JSON.stringify(res.errors)}`)
})

test('missing endState entirely fails -> no defined end state', () => {
  const plan = cleanPlan()
  delete plan.endState
  const res = validateBreakdown(plan)
  assert.equal(res.ok, false)
  assert.ok(res.errors.some((e) => e === 'no defined end state (cannot confirm completion)'))
})

// --- isRealTask boundaries -------------------------------------------------

test('isRealTask boundaries', () => {
  assert.equal(isRealTask(real('t', 'Do thing')), true)
  assert.equal(isRealTask(newTask({ id: 't', title: 'Do thing' })), false) // no doneState
  assert.equal(isRealTask({ id: 't', title: '', goal: '', doneState: 'x' }), false) // no aim
  assert.equal(isRealTask({ id: 't', goal: 'has goal', doneState: 'done' }), true) // goal, no title
  assert.equal(isRealTask(null), false)
  assert.equal(isRealTask('nope'), false)
})

// --- shouldBeProject boundaries --------------------------------------------

test('shouldBeProject boundaries', () => {
  assert.equal(shouldBeProject([real('a', 'A'), real('b', 'B')]), true) // 2 distinct real
  assert.equal(shouldBeProject([real('a', 'A')]), false)                // 1 real
  assert.equal(shouldBeProject([]), false)
  assert.equal(shouldBeProject(null), false)
  // 2 tasks but one is filler -> only 1 real -> not a project
  assert.equal(shouldBeProject([real('a', 'A'), newTask({ id: 'b', title: 'B' })]), false)
  // 2 real but duplicates of each other -> 1 distinct -> not a project
  assert.equal(shouldBeProject([real('a', 'Same thing'), real('b', 'same   THING')]), false)
})

// --- softHintTooBig boundaries ---------------------------------------------

test('softHintTooBig boundaries (hint only, default threshold 20)', () => {
  assert.equal(softHintTooBig(21), true)
  assert.equal(softHintTooBig(20), false) // strictly greater than
  assert.equal(softHintTooBig(0), false)
  assert.equal(softHintTooBig(5, 3), true)
  assert.equal(softHintTooBig(3, 3), false)
  assert.equal(softHintTooBig('nope'), false)
})

// --- multiple errors reported together -------------------------------------

test('a plan with several problems reports them all at once', () => {
  const res = validateBreakdown({
    goal: '',
    endState: { done: '' },
    tasks: [newTask({ id: 't1', title: 'Only one, no done-state' })],
  })
  assert.equal(res.ok, false)
  // single task (false project) + filler + no end state, all surfaced
  assert.ok(res.errors.some((e) => e === 'should be a single task, not a project'))
  assert.ok(res.errors.some((e) => e.startsWith('false/filler task "t1"')))
  assert.ok(res.errors.some((e) => e === 'no defined end state (cannot confirm completion)'))
  assert.ok(res.warnings.some((w) => w === 'project has no stated goal'))
})
