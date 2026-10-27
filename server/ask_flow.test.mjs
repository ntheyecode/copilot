// The mid-task ASK flow state machine + the engine-reply normalizer
// (src/pages/work/askFlow.js). Pure module, so it runs under node --test with
// the rest of the server suite. Guards the contract the engine agent is
// building to: { answer, planChanged, steps?, resumeAt }.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askReducer, initialAsk, normalizeAskResponse, applyResume, askFocused, isStuck, STUCK_MS, ASK_ASKING, ASK_ANSWERED, ASK_RESUMING, ASK_IDLE, ASK_OFFER } from '../src/pages/work/askFlow.js'

const plan = () => [
  { text: 'Open the DNS panel', status: 'done' },
  { text: 'Add the **TXT** record', status: 'current' },
  { text: 'Press **Verify**', status: 'pending' },
  { text: 'Wait for the green check', status: 'pending' },
]

test('begin -> receive -> resume -> done walks the phases and clears', () => {
  let s = askReducer(initialAsk, { type: 'begin', question: 'what is a TXT record?' })
  assert.equal(s.phase, ASK_ASKING)
  assert.ok(askFocused(s))
  s = askReducer(s, { type: 'receive', answer: 'A text record.', planChanged: false, resumeAt: 1 })
  assert.equal(s.phase, ASK_ANSWERED)
  assert.equal(s.answer, 'A text record.')
  assert.equal(s.steps, null)
  s = askReducer(s, { type: 'resume' })
  assert.equal(s.phase, ASK_RESUMING)
  s = askReducer(s, { type: 'done' })
  assert.equal(s.phase, ASK_IDLE)
  assert.ok(!askFocused(s))
})

test('fail drops back to guiding with the error kept for the host', () => {
  const s = askReducer(askReducer(initialAsk, { type: 'begin', question: 'x' }), { type: 'fail', error: 'Could not answer' })
  assert.equal(s.phase, ASK_IDLE)
  assert.equal(s.error, 'Could not answer')
})

test('resume is only valid from answered', () => {
  const s = askReducer(initialAsk, { type: 'begin', question: 'x' })
  assert.equal(askReducer(s, { type: 'resume' }).phase, ASK_ASKING)
})

test('normalize: the new contract passes through, resumeAt clamped to the plan', () => {
  const n = normalizeAskResponse({ answer: 'ok', planChanged: true, steps: [{ text: 'a' }, { text: 'b' }], resumeAt: 9 }, { steps: plan(), current: 1 })
  assert.equal(n.planChanged, true)
  assert.equal(n.steps.length, 2)
  assert.equal(n.resumeAt, 1)
})

test('normalize: planChanged false ignores any steps and resumes where the user was', () => {
  const n = normalizeAskResponse({ answer: 'ok', planChanged: false, steps: [{ text: 'a' }] }, { steps: plan(), current: 2 })
  assert.equal(n.planChanged, false)
  assert.equal(n.steps, null)
  assert.equal(n.resumeAt, 2)
})

test('normalize: the older { answer, steps, index } reply maps onto the contract', () => {
  const n = normalizeAskResponse({ answer: 'ok', steps: plan(), index: 2 }, { steps: plan(), current: 1 })
  assert.equal(n.planChanged, true)
  assert.equal(n.resumeAt, 2)
  const m = normalizeAskResponse({ answer: 'plain' }, { steps: plan(), current: 1 })
  assert.equal(m.planChanged, false)
  assert.equal(m.resumeAt, 1)
})

test('applyResume: unchanged plan only re-marks the current step', () => {
  const sess = { steps: plan(), currentStep: 1 }
  const out = applyResume(sess, { planChanged: false, resumeAt: 1 })
  assert.equal(out.currentStep, 1)
  assert.equal(out.steps[1].status, 'current')
  assert.equal(out.steps[0].status, 'done')
  assert.notEqual(out.steps, sess.steps)   // never mutates
})

test('applyResume: forward steps splice after the kept prefix and the first becomes current', () => {
  const sess = { steps: plan(), currentStep: 1 }
  const out = applyResume(sess, { planChanged: true, resumeAt: 1, steps: [{ text: 'Add the **TXT** record in the **Host** field' }, { text: 'Press **Verify**' }] })
  assert.equal(out.steps.length, 3)
  assert.equal(out.steps[0].status, 'done')
  assert.equal(out.steps[1].status, 'current')
  assert.equal(out.steps[2].status, 'pending')
  assert.equal(out.currentStep, 1)
})

test('applyResume: a full plan replaces the list and keeps its done marks', () => {
  const full = plan().map((s, i) => ({ ...s, status: i === 0 ? 'done' : 'pending' }))
  const out = applyResume({ steps: plan(), currentStep: 1 }, { planChanged: true, resumeAt: 2, steps: full })
  assert.equal(out.steps.length, 4)
  assert.equal(out.steps[0].status, 'done')
  assert.equal(out.steps[2].status, 'current')
  assert.equal(out.currentStep, 2)
})

test('stuck offer: only from idle, begin from it is kind stuck, dismiss returns to guiding', () => {
  let s = askReducer(initialAsk, { type: 'offer' })
  assert.equal(s.phase, ASK_OFFER)
  assert.ok(askFocused(s))
  assert.equal(askReducer(askReducer(initialAsk, { type: 'begin', question: 'x' }), { type: 'offer' }).phase, ASK_ASKING)
  const b = askReducer(s, { type: 'begin', question: 'the Verify button is grey' })
  assert.equal(b.phase, ASK_ASKING)
  assert.equal(b.kind, 'stuck')
  assert.equal(askReducer(s, { type: 'dismiss' }).phase, ASK_IDLE)
})

test('isStuck: five minutes on one step, unless snoozed', () => {
  assert.equal(isStuck(STUCK_MS - 1), false)
  assert.equal(isStuck(STUCK_MS), true)
  assert.equal(isStuck(STUCK_MS * 2, Date.now() + 1000), false)
  assert.equal(isStuck(NaN), false)
})
