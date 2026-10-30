import test from 'node:test'
import assert from 'node:assert/strict'
import { alignCapture, toWorkflowSteps, DEFAULT_PERIODIC_MS } from './captureTimeline.js'

test('actions become ordered steps carrying their target and nearest frame', () => {
  const r = alignCapture({
    t0: 1000,
    events: [
      { t: 1000, kind: 'frame', frame: 'f0' },
      { t: 1200, kind: 'click', target: 'Transfers' },
      { t: 1250, kind: 'frame', frame: 'f1' },
      { t: 2000, kind: 'click', target: 'Amount field', frame: 'f2' },
      { t: 2500, kind: 'submit', target: 'Approve', frame: 'f3' },
    ],
    voice: [],
  })
  assert.equal(r.steps.length, 3)
  assert.deepEqual(r.steps.map((s) => s.kind), ['click', 'click', 'submit'])
  assert.deepEqual(r.steps.map((s) => s.target), ['Transfers', 'Amount field', 'Approve'])
  assert.equal(r.steps[0].atMs, 200)         // relative to t0
  assert.equal(r.steps[0].frame, 'f1')       // nearest frame to t=1200 (f1@1250 beats f0@1000)
  assert.equal(r.steps[1].frame, 'f2')
  assert.equal(r.warnings.length, 0)
})

test('narration binds to the step it was spoken over, and a lead binds pre-action narration', () => {
  const r = alignCapture({
    t0: 0,
    events: [
      { t: 1000, kind: 'click', target: 'Transfers', frame: 'a' },
      { t: 5000, kind: 'click', target: 'Approve', frame: 'b' },
    ],
    voice: [
      { t: 300, text: 'open transfers' },      // before the first action -> step 1
      { t: 4200, text: 'then approve it' },     // within lead of the second action -> step 2
      { t: 1500, text: 'this is the list' },    // after step 1, before step 2 -> step 1
    ],
    periodicMs: 10000,
  })
  assert.equal(r.steps.length, 2)
  assert.equal(r.steps[0].narration, 'open transfers this is the list')
  assert.equal(r.steps[1].narration, 'then approve it')
})

test('regression: actions closer than the lead keep their own narration', () => {
  // Three quick clicks 400ms apart (well inside the 1500ms lead). Each line is
  // spoken at its own click and must stay on that click, not slide forward.
  const r = alignCapture({
    t0: 0,
    events: [
      { t: 0, kind: 'click', target: 'A', frame: 'a' },
      { t: 400, kind: 'click', target: 'B', frame: 'b' },
      { t: 800, kind: 'click', target: 'C', frame: 'c' },
    ],
    voice: [{ t: 0, text: 'first' }, { t: 400, text: 'second' }, { t: 800, text: 'third' }],
  })
  assert.deepEqual(r.steps.map((s) => s.narration), ['first', 'second', 'third'])
})

test('regression: narration just before an action in a long gap goes to that action, with no empty review step', () => {
  const r = alignCapture({
    t0: 0,
    events: [{ t: 9000, kind: 'change', frame: 'A' }],
    voice: [{ t: 8200, text: 'open the transfers screen' }],    // 0.8 s before the action, after a long quiet gap
  })
  assert.equal(r.steps.length, 1)
  assert.equal(r.steps[0].kind, 'change')
  assert.equal(r.steps[0].narration, 'open the transfers screen')
})

test('narration at the very start, before any action, becomes a review step of the first screen', () => {
  const r = alignCapture({
    t0: 0,
    events: [{ t: 0, kind: 'frame', frame: 'home' }, { t: 12000, kind: 'change', frame: 'home' }],
    voice: [{ t: 500, text: 'this is the dashboard' }, { t: 11500, text: 'now open transfers' }],
  })
  assert.deepEqual(r.steps.map((s) => [s.kind, s.narration]), [['watch', 'this is the dashboard'], ['change', 'now open transfers']])
})

test('a long narrated gap with no action inserts a watch step', () => {
  const r = alignCapture({
    t0: 0,
    events: [
      { t: 0, kind: 'click', target: 'Start', frame: 'a' },
      { t: 20000, kind: 'click', target: 'Finish', frame: 'z' },
      { t: 10000, kind: 'frame', frame: 'mid' },
    ],
    voice: [{ t: 10000, text: 'now we wait for the batch to finish' }],
    periodicMs: DEFAULT_PERIODIC_MS,
  })
  assert.equal(r.steps.length, 3)
  assert.equal(r.steps[1].kind, 'watch')
  assert.equal(r.steps[1].source, 'periodic')
  assert.equal(r.steps[1].frame, 'mid')
  assert.equal(r.steps[1].narration, 'now we wait for the batch to finish')
})

test('toWorkflowSteps uses narration, falls back to an action line, and carries the frame as shot', () => {
  const aligned = alignCapture({
    t0: 0,
    events: [
      { t: 0, kind: 'click', target: 'Transfers', frame: 'a' },
      { t: 1000, kind: 'nav', url: 'https://zamina/approve', frame: 'b' },
    ],
    voice: [{ t: 0, text: 'open the transfers screen' }],
    periodicMs: 10000,
  })
  const ws = toWorkflowSteps(aligned)
  assert.equal(ws.length, 2)
  assert.equal(ws[0].instruction, 'open the transfers screen')
  assert.equal(ws[0].shot, 'a')
  assert.equal(ws[0].target, 'Transfers')
  assert.equal(ws[1].instruction, 'Go to https://zamina/approve')   // silent -> action line
})

test('nothing captured yields a warning and no steps', () => {
  const r = alignCapture({ t0: 0, events: [], voice: [] })
  assert.equal(r.steps.length, 0)
  assert.ok(r.warnings.some((w) => w.code === 'CAPTURE_EMPTY'))
  assert.deepEqual(toWorkflowSteps(r), [])
})

test('a step with no available frame is flagged with a stable code', () => {
  const r = alignCapture({ t0: 0, events: [{ t: 0, kind: 'click', target: 'X' }], voice: [] })
  assert.equal(r.steps[0].frame, null)
  assert.ok(r.warnings.some((w) => w.code === 'STEP_NO_FRAME' && w.step === 1))
})

test('the seeded instruction goes through the caller label (so it can be translated)', () => {
  const aligned = alignCapture({ t0: 0, events: [{ t: 0, kind: 'click', target: 'Approve', frame: 'a' }, { t: 9000, kind: 'nav', frame: 'b' }], voice: [] })
  const seen = []
  const ws = toWorkflowSteps(aligned, { label: (key, vars) => { seen.push(key); return `[${key}|${(vars && vars.target) || ''}]` } })
  assert.deepEqual(seen, ['teach.capture.step.select', 'teach.capture.step.goNext'])
  assert.equal(ws[0].instruction, '[teach.capture.step.select|Approve]')
})
