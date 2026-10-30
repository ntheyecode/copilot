import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatClock, captureErrorKey, CAPTURE_ERROR_KEYS, CAPTURE_ERROR_FALLBACK, warningKey, warningLines,
  recordSupport, shareErrorKind, keepFrameAsIs, chooseScrub, maskingOn, pruneToStepFrames, frameRefMap,
  bindStepRefs, distinctFrameCount, mergeRecordedSteps, captureSummary, progressPct,
} from './recordModel.js'
import { createCaptureSession, finalizeCapture, SETTLE_TICKS } from './captureSession.js'
import { alignCapture, toWorkflowSteps, STEP_TEXT } from './captureTimeline.js'
import en from '../../../i18n/locales/en/teach.js'

const dig = (o, key) => key.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o)

test('formatClock reads m:ss, then h:mm:ss, and never goes negative', () => {
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(9500), '0:09')
  assert.equal(formatClock(75000), '1:15')
  assert.equal(formatClock(3600000 + 61000), '1:01:01')
  assert.equal(formatClock(-5), '0:00')
  assert.equal(formatClock(NaN), '0:00')
})

test('every CAPTURE_* / SCAN_* / import error code maps to a translated key that exists in English', () => {
  const codes = ['CAPTURE_ALREADY_STARTED', 'CAPTURE_NOT_STARTED', 'CAPTURE_SCRUB_REQUIRED', 'CAPTURE_UPLOAD_REQUIRED', 'CAPTURE_REDACT_FAILED', 'CAPTURE_SAVE_FAILED', 'SCAN_ABORTED', 'SCAN_NO_VIDEO', 'IMPORT_UNREADABLE']
  assert.deepEqual(Object.keys(CAPTURE_ERROR_KEYS).sort(), codes.slice().sort())
  for (const c of codes) assert.equal(typeof dig(en, captureErrorKey(c)), 'string', c)
  assert.equal(captureErrorKey('NOPE'), CAPTURE_ERROR_FALLBACK)
  assert.equal(captureErrorKey(undefined), CAPTURE_ERROR_FALLBACK)
  assert.equal(typeof dig(en, CAPTURE_ERROR_FALLBACK), 'string')
})

test('the capture logic only throws codes the UI can translate (drift guard)', async () => {
  const s = createCaptureSession({ now: () => 1, frameOf: () => 'F', sigOf: () => 1, changed: () => false })
  const seen = []
  try { s.stop() } catch (e) { seen.push(e.code) }
  s.start()
  try { s.start() } catch (e) { seen.push(e.code) }
  try { await finalizeCapture({ events: [] }, {}) } catch (e) { seen.push(e.code) }
  try { await finalizeCapture({ events: [] }, { scrub: keepFrameAsIs }) } catch (e) { seen.push(e.code) }
  try { await finalizeCapture({ events: [{ t: 1, kind: 'frame', frame: 'F' }] }, { scrub: () => { throw new Error('x') }, upload: async () => ({ ref: 'r' }) }) } catch (e) { seen.push(e.code) }
  try { await finalizeCapture({ events: [{ t: 1, kind: 'frame', frame: 'F' }] }, { scrub: keepFrameAsIs, upload: async () => ({}) }) } catch (e) { seen.push(e.code) }
  assert.equal(seen.length, 6)
  for (const c of seen) assert.notEqual(captureErrorKey(c), CAPTURE_ERROR_FALLBACK, c)
})

test('aligner warnings map by code; STEP_NO_FRAME groups into one line', () => {
  assert.equal(warningKey('CAPTURE_EMPTY'), 'teach.capture.warn.empty')
  assert.equal(warningKey('STEP_NO_FRAME'), 'teach.capture.warn.stepNoFrame')
  assert.equal(warningKey('OTHER'), null)
  assert.equal(typeof dig(en, 'teach.capture.warn.empty'), 'string')
  assert.equal(typeof dig(en, 'teach.capture.warn.stepNoFrame'), 'string')
  const lines = warningLines([{ code: 'STEP_NO_FRAME', step: 2 }, { code: 'STEP_NO_FRAME', step: 5 }, { code: 'X' }])
  assert.deepEqual(lines, [{ key: 'teach.capture.warn.stepNoFrame', vars: { steps: '2, 5', n: 2 } }])
  assert.deepEqual(warningLines([{ code: 'CAPTURE_EMPTY' }]), [{ key: 'teach.capture.warn.empty', vars: {} }])
  assert.deepEqual(warningLines(null), [])
})

test('the silent-step seed keys exist in English with the same placeholders', () => {
  for (const [k, v] of Object.entries(STEP_TEXT)) {
    const s = dig(en, k)
    assert.equal(typeof s, 'string', k)
    const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join()
    assert.equal(ph(s), ph(v), k)
  }
})

test('recordSupport explains why recording is off', () => {
  assert.deepEqual(recordSupport({ mobile: true, hasDisplayMedia: true }), { ok: false, reason: 'mobile' })
  assert.deepEqual(recordSupport({ secure: false, hasDisplayMedia: true }), { ok: false, reason: 'insecure' })
  assert.deepEqual(recordSupport({ hasDisplayMedia: false }), { ok: false, reason: 'unsupported' })
  assert.deepEqual(recordSupport({ hasDisplayMedia: true }), { ok: true, reason: null })
})

test('shareErrorKind classifies a refused or failed screen share', () => {
  assert.equal(shareErrorKind({ name: 'NotAllowedError' }), 'denied')
  assert.equal(shareErrorKind({ name: 'AbortError' }), 'cancelled')
  assert.equal(shareErrorKind({ name: 'NotReadableError' }), 'unavailable')
  assert.equal(shareErrorKind(new Error('boom')), 'failed')
  assert.equal(shareErrorKind(null), 'failed')
})

test('chooseScrub masks when the workflow or data protection asks, and is explicit otherwise', () => {
  const redact = (f) => 'R:' + f
  assert.equal(chooseScrub({ mask: true, dlp: false }, redact), redact)
  assert.equal(chooseScrub({ mask: false, dlp: true }, redact), redact)
  assert.equal(chooseScrub({ mask: false, dlp: false }, redact), keepFrameAsIs)
  assert.equal(keepFrameAsIs('x'), 'x')
  assert.throws(() => chooseScrub({ mask: true }, null), (e) => e.code === 'CAPTURE_SCRUB_REQUIRED')
  assert.equal(maskingOn({ mask: false, dlp: true }), true)
  assert.equal(maskingOn({ mask: false, dlp: false }), false)
})

// Build a real capture with the real session: A -> B -> C with a mark on B.
function realCapture() {
  let T = 1000
  const v = { sig: 0, frame: 'A' }
  const s = createCaptureSession({ now: () => T, sigOf: (x) => x.sig, frameOf: (x) => x.frame, changed: (a, b, th = 6) => Math.abs(a - b) > th, periodicMs: 500 })
  const settle = () => { for (let i = 0; i <= SETTLE_TICKS; i++) { s.tick(v); T += 100 } }
  s.start(); settle()
  for (let i = 0; i < 12; i++) { s.tick(v); T += 100 }  // periodic frames of A
  v.sig = 50; v.frame = 'B'; settle(); T += 4000
  s.markStep(); T += 200
  v.sig = 100; v.frame = 'C'; settle()
  return s.stop()
}

test('only frames a step shows are finalized; refs bind back onto the aligned steps', async () => {
  const cap = realCapture()
  const aligned = alignCapture(cap)
  assert.ok(aligned.steps.length >= 2)
  const pruned = pruneToStepFrames(cap, aligned)
  const stepFrames = new Set(aligned.steps.map((s) => s.frame).filter(Boolean))
  assert.ok(distinctFrameCount(pruned) <= distinctFrameCount(cap))
  assert.equal(distinctFrameCount(pruned), stepFrames.size)
  const scrubbed = [], uploaded = []
  let n = 0
  const done = await finalizeCapture(pruned, {
    scrub: async (f) => { scrubbed.push(f); return 'S:' + f },
    upload: async (d) => { uploaded.push(d); return { ref: `ref${++n}.jpg` } },
  })
  assert.equal(scrubbed.length, stepFrames.size)
  assert.ok(uploaded.every((d) => d.startsWith('S:')), 'every upload is the scrubbed frame')
  const refOf = frameRefMap(pruned.events, done.events)
  const bound = bindStepRefs(aligned, refOf)
  for (const s of bound.steps) if (s.hasFrame) assert.match(s.frame, /^ref\d+\.jpg$/)
  const wf = toWorkflowSteps(bound, { label: (k) => k })
  assert.equal(wf.length, aligned.steps.length)
  assert.ok(wf.every((s) => s.shot == null || /^ref\d+\.jpg$/.test(s.shot)))
})

test('bindStepRefs drops a frame that was not saved', () => {
  const out = bindStepRefs({ steps: [{ frame: 'X' }, { frame: null }] }, new Map())
  assert.deepEqual(out.steps.map((s) => [s.frame, s.hasFrame]), [[null, false], [null, false]])
})

test('mergeRecordedSteps replaces a blank editor and appends after real steps', () => {
  const rec = [{ instruction: 'R1', shot: 'a.jpg' }]
  assert.deepEqual(mergeRecordedSteps([{ instruction: '', target: '' }], rec), { steps: rec, mode: 'replace' })
  const mine = [{ instruction: 'Mine' }]
  assert.deepEqual(mergeRecordedSteps(mine, rec), { steps: [...mine, ...rec], mode: 'append' })
  assert.deepEqual(mergeRecordedSteps([], []), { steps: [], mode: 'replace' })
})

test('progressPct splits masking and saving, or is all saving when masking is off', () => {
  assert.equal(progressPct(null), 0)
  assert.equal(progressPct({ stage: 'mask', done: 0, total: 0, masking: true }), 0)
  assert.equal(progressPct({ stage: 'mask', done: 2, total: 4, masking: true }), 25)
  assert.equal(progressPct({ stage: 'save', done: 2, total: 4, masking: true }), 75)
  assert.equal(progressPct({ stage: 'save', done: 4, total: 4, masking: true }), 100)
  assert.equal(progressPct({ stage: 'save', done: 1, total: 4, masking: false }), 25)
  assert.equal(progressPct({ stage: 'save', done: 9, total: 4, masking: false }), 100)
})

test('captureSummary reflects what was captured', () => {
  const s = captureSummary({ durationMs: 5000, frameCount: 9, steps: [{ frame: 'a', narration: 'hi' }, { frame: null, narration: '' }] }, 3)
  assert.deepEqual(s, { steps: 2, frames: 9, shots: 1, narrated: 1, voiceLines: 3, durationMs: 5000 })
  assert.deepEqual(captureSummary(null), { steps: 0, frames: 0, shots: 0, narrated: 0, voiceLines: 0, durationMs: 0 })
})
