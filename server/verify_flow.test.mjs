// The on-demand "Verify on my screen" verdict mapping (src/pages/work/verifyFlow.js).
// Pure module, so it runs under node --test with the rest of the server suite.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdictFromWatch, verdictForStep, VERIFY_DONE, VERIFY_NOT_YET } from '../src/pages/work/verifyFlow.js'

test('verify reply with stepDone -> done, carrying the one-line observation', () => {
  const v = verdictFromWatch({ verify: true, stepDone: true, status: 'done', observation: ' The TXT row shows in the list. ', guidance: 'Press Verify' })
  assert.equal(v.kind, VERIFY_DONE)
  assert.equal(v.observation, 'The TXT row shows in the list.')
})

test('not done: the flag is the detail (what is wrong)', () => {
  const v = verdictFromWatch({ verify: true, stepDone: false, status: 'wrong', observation: 'The Add record form is open', flag: 'The Host field still says www, it must be @', guidance: 'Change Host to @' })
  assert.equal(v.kind, VERIFY_NOT_YET)
  assert.equal(v.detail, 'The Host field still says www, it must be @')
  assert.equal(v.observation, 'The Add record form is open')
})

test('not done without a flag: the guidance is the detail (what to do next)', () => {
  const v = verdictFromWatch({ verify: true, stepDone: false, status: 'working', observation: 'The form is open', guidance: 'Paste the value and press Save record' })
  assert.equal(v.kind, VERIFY_NOT_YET)
  assert.equal(v.detail, 'Paste the value and press Save record')
})

test('not done with nothing but an observation: detail is empty (the UI shows its default)', () => {
  const v = verdictFromWatch({ verify: true, stepDone: false, observation: 'The form is open' })
  assert.equal(v.kind, VERIFY_NOT_YET)
  assert.equal(v.detail, '')
})

test('a flag always means not yet, even if stepDone is set', () => {
  assert.equal(verdictFromWatch({ stepDone: true, flag: 'Wrong page' }).kind, VERIFY_NOT_YET)
})

test('a plain (older) watch reply still maps from its status', () => {
  assert.equal(verdictFromWatch({ status: 'done', observation: 'ok' }).kind, VERIFY_DONE)
  assert.equal(verdictFromWatch({ status: 'working', observation: 'ok' }).kind, VERIFY_NOT_YET)
  assert.equal(verdictFromWatch(null).kind, VERIFY_NOT_YET)
})

test('verdictForStep hides a verdict read for another step', () => {
  const v = { kind: VERIFY_DONE, observation: 'x', stepIndex: 1 }
  assert.equal(verdictForStep(v, 1), v)
  assert.equal(verdictForStep(v, 2), null)
  assert.equal(verdictForStep({ kind: VERIFY_DONE }, 1), null)
  assert.equal(verdictForStep(null, 1), null)
})
