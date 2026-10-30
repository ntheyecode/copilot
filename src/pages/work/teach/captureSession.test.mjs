import test from 'node:test'
import assert from 'node:assert/strict'
import { createCaptureSession, finalizeCapture, SETTLE_TICKS } from './captureSession.js'
import { alignCapture, toWorkflowSteps } from './captureTimeline.js'

// A controllable clock + a fake screen "video" whose signature and frame the
// test sets. Signatures are plain numbers; a change is a big enough difference.
function rig({ periodicMs = 60000 } = {}) {
  let T = 1000
  const v = { sig: 0, frame: 'F0' }
  const s = createCaptureSession({
    now: () => T,
    sigOf: (video) => video.sig,
    frameOf: (video) => video.frame,
    changed: (a, b, th = 6) => Math.abs(a - b) > th,
    periodicMs,
  })
  return {
    s, v,
    advance: (ms) => { T += ms },
    setScreen: (sig, frame) => { v.sig = sig; v.frame = frame },
  }
}
// One tick to register the new screen, then enough still ticks to settle.
const settle = (r) => { for (let i = 0; i <= SETTLE_TICKS; i++) { r.s.tick(r.v); r.advance(100) } }

test('the first screen is a plain frame; a settled significant change is a step on the BEFORE screen', () => {
  const r = rig(); r.s.start()
  r.setScreen(0, 'A'); settle(r)
  r.setScreen(50, 'B'); settle(r)
  const { events } = r.s.stop()
  assert.deepEqual(events.map((e) => `${e.kind}:${e.frame}`), ['frame:A', 'change:A', 'frame:B'])
})

test('jitter (typing, a blinking cursor) never makes a step', () => {
  const r = rig(); r.s.start()
  r.setScreen(0, 'A'); settle(r)
  r.setScreen(3, 'A-typing'); settle(r)
  r.setScreen(5, 'A-cursor'); settle(r)
  const { events } = r.s.stop()
  assert.deepEqual(events.map((e) => e.kind), ['frame'])
})

test('a still screen still gets a periodic frame, which is not a step', () => {
  const r = rig({ periodicMs: 1000 }); r.s.start()
  r.setScreen(0, 'A'); settle(r)
  r.advance(1500); r.s.tick(r.v)
  const { events } = r.s.stop()
  assert.equal(events.filter((e) => e.kind === 'frame').length, 2)
  assert.equal(events.some((e) => e.kind === 'change'), false)
})

test('paused time is excluded from the clock, and nothing is captured while paused', () => {
  const r = rig(); r.s.start()
  r.advance(500); r.s.pause()
  r.advance(10000)
  assert.equal(r.s.tick(r.v), null)
  assert.equal(r.s.action('click', { target: 'X' }), false)
  assert.equal(r.s.addVoice('ignored'), false)          // no `at` while paused
  r.s.resume(); r.advance(100); r.s.markStep()
  const { t0, events } = r.s.stop()
  assert.equal(events.length, 1)
  assert.equal(events[0].kind, 'mark')
  assert.equal(events[0].t - t0, 600)                    // 500 + 100; the 10s pause is not counted
})

test('an agent-reported click is not double-counted by the screen change it causes', () => {
  const r = rig(); r.s.start()
  r.setScreen(0, 'A'); settle(r)
  r.s.action('click', { target: 'Transfers' })
  r.setScreen(50, 'B'); settle(r)
  const { events } = r.s.stop()
  assert.deepEqual(events.map((e) => e.kind), ['frame', 'click', 'frame'])
  assert.equal(events[1].frame, 'A')                     // the click carries the screen it happened on
  assert.equal(events[1].target, 'Transfers')
})

test('lifecycle guards', () => {
  const r = rig()
  assert.throws(() => r.s.stop(), /Nothing is being captured/)
  r.s.start()
  assert.throws(() => r.s.start(), /already started/)
  assert.equal(r.s.state, 'recording')
  r.s.stop()
  assert.equal(r.s.state, 'stopped')
  assert.equal(r.s.addVoice('late'), false)
})

test('finalize redacts every frame BEFORE upload, uploads each once, and swaps in refs', async () => {
  const raw = {
    t0: 0,
    events: [{ t: 0, kind: 'frame', frame: 'RAW1' }, { t: 1, kind: 'change', frame: 'RAW1' }, { t: 2, kind: 'frame', frame: 'RAW2' }],
    voice: [{ t: 0, text: 'hi' }],
  }
  const uploaded = []
  const out = await finalizeCapture(raw, {
    scrub: async (f) => `CLEAN(${f})`,
    upload: async (f) => { uploaded.push(f); return { ref: `ref-${uploaded.length}` } },
  })
  assert.deepEqual(uploaded, ['CLEAN(RAW1)', 'CLEAN(RAW2)'])   // redacted, de-duplicated; raw never sent
  assert.deepEqual(out.events.map((e) => e.frame), ['ref-1', 'ref-1', 'ref-2'])
  assert.deepEqual(out.voice, raw.voice)
})

test('finalize fails closed: one failed redaction means nothing is uploaded', async () => {
  const raw = { t0: 0, events: [{ t: 0, kind: 'frame', frame: 'A' }, { t: 1, kind: 'frame', frame: 'B' }], voice: [] }
  const sent = []
  const okThenFail = async (f) => { if (f === 'B') throw new Error('redaction failed'); return f }
  await assert.rejects(finalizeCapture(raw, { scrub: okThenFail, upload: async (f) => { sent.push(f); return { ref: 'x' } } }), (e) => e.code === 'CAPTURE_REDACT_FAILED')
  assert.equal(sent.length, 0)
  await assert.rejects(finalizeCapture(raw, { upload: async () => ({ ref: 'x' }) }), /scrub function is required/)
})

test('end to end: capture -> align -> workflow steps, narration on the step it was spoken over', () => {
  const r = rig(); r.s.start()
  r.setScreen(0, 'A'); settle(r)
  r.s.addVoice('open transfers', { at: r.s.nowMs() })
  r.setScreen(50, 'B'); settle(r)
  const aligned = alignCapture(r.s.stop())
  assert.equal(aligned.steps.length, 1)
  assert.equal(aligned.steps[0].kind, 'change')
  assert.equal(aligned.steps[0].frame, 'A')
  assert.equal(aligned.steps[0].narration, 'open transfers')
  assert.equal(toWorkflowSteps(aligned)[0].instruction, 'open transfers')
})

test('a silent change step falls back to a plain instruction', () => {
  const aligned = alignCapture({ t0: 0, events: [{ t: 0, kind: 'change', frame: 'A' }], voice: [] })
  assert.equal(toWorkflowSteps(aligned)[0].instruction, 'Move to the next screen')
})
