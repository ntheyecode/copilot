import test from 'node:test'
import assert from 'node:assert/strict'
import { finalizeRecording } from './finalizeRecording.js'
import { createCaptureSession, SETTLE_TICKS } from './captureSession.js'
import { withVoice } from './transcribePipeline.js'

// A real capture from the real session: A -> B -> C with a mark on B.
function realCapture() {
  let T = 1000
  const v = { sig: 0, frame: 'A' }
  const s = createCaptureSession({ now: () => T, sigOf: (x) => x.sig, frameOf: (x) => x.frame, changed: (a, b, th = 6) => Math.abs(a - b) > th, periodicMs: 500 })
  const settle = () => { for (let i = 0; i <= SETTLE_TICKS; i++) { s.tick(v); T += 100 } }
  s.start(); settle()
  for (let i = 0; i < 12; i++) { s.tick(v); T += 100 }
  v.sig = 50; v.frame = 'B'; settle(); T += 4000
  s.markStep(); T += 200
  v.sig = 100; v.frame = 'C'; settle()
  return s.stop()
}
const base = (over = {}) => {
  let n = 0
  const sent = []
  return {
    sent,
    deps: {
      mask: true, dlp: false,
      redact: async (f) => 'R:' + f,
      upload: async (d) => { sent.push(d); return { ref: `f${++n}.jpg` } },
      label: (k) => k,
      ...over,
    },
  }
}

test('masks then uploads only step frames and returns editor rows with refs', async () => {
  const cap = withVoice(realCapture(), [{ t: 1200, endT: 1800, text: 'Open the orders list', speaker: 'trainer' }])
  const { sent, deps } = base()
  const progress = []
  const out = await finalizeRecording(cap, { ...deps, onProgress: (p) => progress.push(p.stage), voiceLines: 1 })
  assert.ok(out.steps.length >= 2)
  assert.ok(sent.length >= 1 && sent.every((d) => d.startsWith('R:')), 'every upload was masked first')
  assert.ok(out.steps.every((s) => s.shot === '' || /^f\d+\.jpg$/.test(s.shot)))
  assert.equal(out.steps[0].instruction, 'Open the orders list')
  assert.equal(out.masking, true)
  assert.ok(progress.includes('mask') && progress.includes('save'))
  assert.equal(out.summary.voiceLines, 1)
})

test('with masking and data protection off, frames go up as captured (explicit identity)', async () => {
  const { sent, deps } = base({ mask: false, dlp: false })
  const out = await finalizeRecording(realCapture(), deps)
  assert.equal(out.masking, false)
  assert.ok(sent.every((d) => !d.startsWith('R:')))
})

test('an upload failure without a code is a save failure; nothing more is sent', async () => {
  const { deps } = base({ upload: async () => { throw new Error('network') } })
  await assert.rejects(finalizeRecording(realCapture(), deps), (e) => e.code === 'CAPTURE_SAVE_FAILED')
})

test('a closed wizard stops before anything is masked or sent', async () => {
  const { sent, deps } = base({ isOpen: () => false })
  await assert.rejects(finalizeRecording(realCapture(), deps), (e) => e.code === 'CAPTURE_CLOSED')
  assert.equal(sent.length, 0)
})

test('an empty capture returns no steps and the CAPTURE_EMPTY warning', async () => {
  const { sent, deps } = base()
  const out = await finalizeRecording({ t0: 0, events: [], voice: [] }, deps)
  assert.deepEqual(out.steps, [])
  assert.deepEqual(out.warnings.map((w) => w.key), ['teach.capture.warn.empty'])
  assert.equal(sent.length, 0)
})
