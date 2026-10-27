// The on-demand "Verify this step" verdict (server/work_verify.js): a pure read
// of the engine's navigate result for the current step, never applied.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyVerdict, verifyResponse } from './work_verify.js'

const session = () => ({
  currentStep: 1,
  steps: [
    { text: 'Open the DNS panel', status: 'done' },
    { text: 'Add the **TXT** record', status: 'current', source: 'runbook.md' },
    { text: 'Press **Verify**', status: 'pending' },
  ],
})

test('current step in completed -> done', () => {
  const v = verifyVerdict({ completed: [0, 1], current: 2, done: false }, 1)
  assert.equal(v.stepDone, true)
  assert.equal(v.status, 'done')
})

test('pointer moved past the current step -> done', () => {
  assert.equal(verifyVerdict({ completed: [], current: 2 }, 1).stepDone, true)
})

test('engine says the whole plan is done -> done', () => {
  assert.equal(verifyVerdict({ completed: [], current: null, done: true }, 1).stepDone, true)
})

test('nothing new on screen -> not yet (working)', () => {
  const v = verifyVerdict({ completed: [0], current: 1, done: false, observation: 'The form is still open' }, 1)
  assert.equal(v.stepDone, false)
  assert.equal(v.status, 'working')
})

test('a flag always wins: wrong, never done, even if completed lists the step', () => {
  const v = verifyVerdict({ completed: [1], current: 2, flag: 'The value does not match' }, 1)
  assert.equal(v.stepDone, false)
  assert.equal(v.status, 'wrong')
})

test('tolerates a missing or malformed result', () => {
  assert.deepEqual(verifyVerdict(null, 1), { stepDone: false, status: 'working' })
  assert.deepEqual(verifyVerdict({ completed: 'x', current: 'y' }, 'z'), { stepDone: false, status: 'working' })
})

test('verifyResponse keeps the session position unchanged and carries the read', () => {
  const out = verifyResponse({ completed: [0, 1], current: 2, observation: 'TXT row visible', guidance: 'Press Verify', flag: '' }, session(), { escalated: true })
  assert.equal(out.verify, true)
  assert.equal(out.stepDone, true)
  assert.equal(out.status, 'done')
  assert.equal(out.index, 1)                 // the pointer did NOT move
  assert.equal(out.step.text, 'Add the **TXT** record')
  assert.equal(out.step.source, 'runbook.md')
  assert.equal(out.done, false)              // a verify never ends the task
  assert.equal(out.observation, 'TXT row visible')
  assert.equal(out.guidance, 'Press Verify')
  assert.equal(out.escalated, true)
})

test('verifyResponse with no steps still answers safely', () => {
  const out = verifyResponse({}, { currentStep: 0, steps: [] })
  assert.equal(out.step, null)
  assert.equal(out.stepDone, false)
  assert.equal(out.index, 0)
})
