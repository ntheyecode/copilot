import test from 'node:test'
import assert from 'node:assert/strict'
import { scanVideo } from './videoScan.js'
import { createCaptureSession } from './captureSession.js'
import { alignCapture, toWorkflowSteps } from './captureTimeline.js'
import { withVoice } from './transcribePipeline.js'

// A fake recorded video: screen A until 6 s, screen B until 14 s, then C.
const screenAt = (ms) => (ms < 6000 ? { sig: 0, frame: 'A' } : ms < 14000 ? { sig: 50, frame: 'B' } : { sig: 100, frame: 'C' })
const makeSession = (now) => createCaptureSession({
  now,
  sigOf: (v) => v.sig,
  frameOf: (v) => v.frame,
  changed: (a, b, th = 6) => Math.abs(a - b) > th,
  periodicMs: 60000,
})
const seekTo = async (ms) => screenAt(ms)

test('scans the video on its own clock: each settled screen change is a step on the BEFORE screen', async () => {
  const cap = await scanVideo({ durationMs: 20000, seekTo, makeSession })
  assert.equal(cap.t0, 0)
  const changes = cap.events.filter((e) => e.kind === 'change')
  assert.deepEqual(changes.map((e) => e.frame), ['A', 'B'])
  assert.ok(changes[0].t >= 6000 && changes[0].t <= 8000)          // settles shortly after the cut at 6 s
  assert.ok(changes[1].t >= 14000 && changes[1].t <= 16000)
})

test('deterministic: the same file gives the same capture', async () => {
  const a = await scanVideo({ durationMs: 20000, seekTo, makeSession })
  const b = await scanVideo({ durationMs: 20000, seekTo, makeSession })
  assert.deepEqual(a, b)
})

test('soundtrack lines (video time) bind to the right steps, presenter voice kept', async () => {
  const cap = await scanVideo({ durationMs: 20000, seekTo, makeSession })
  const lines = [
    { t: 5200, endT: 5900, text: 'open the transfers screen', speaker: 'presenter' },
    { t: 13300, endT: 13900, text: 'now approve it', speaker: 'presenter' },
  ]
  const aligned = alignCapture(withVoice(cap, lines))
  assert.equal(aligned.steps.length, 2)
  assert.equal(aligned.steps[0].frame, 'A')
  assert.equal(aligned.steps[0].narration, 'open the transfers screen')
  assert.deepEqual(aligned.steps[0].voices, [{ speaker: 'presenter', text: 'open the transfers screen' }])
  assert.equal(toWorkflowSteps(aligned)[1].instruction, 'now approve it')
})

test('progress is reported and reaches 100%', async () => {
  const seen = []
  await scanVideo({ durationMs: 2000, seekTo, makeSession, stepMs: 500, onProgress: (p) => seen.push(p) })
  assert.equal(seen[seen.length - 1], 1)
  assert.ok(seen.every((p, i) => i === 0 || p >= seen[i - 1]))
})

test('cancel stops the scan with a stable code; a video with no length is refused', async () => {
  const ac = new AbortController()
  let n = 0
  const slowSeek = async (ms) => { if (++n === 3) ac.abort(); return screenAt(ms) }
  await assert.rejects(scanVideo({ durationMs: 20000, seekTo: slowSeek, makeSession, signal: ac.signal }), (e) => e.code === 'SCAN_ABORTED')
  await assert.rejects(scanVideo({ durationMs: 0, seekTo, makeSession }), (e) => e.code === 'SCAN_NO_VIDEO')
})
