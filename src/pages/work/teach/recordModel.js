// ===========================================================================
// Pure, DOM-free helpers for the Teach "Record a demonstration" UI. The React
// recorder (useDemoRecorder.js + RecordPanel.jsx) composes these with the
// capture logic (captureSession.js / captureTimeline.js), which it never
// rewrites. Everything here is unit-tested in recordModel.test.mjs.
// No imports, no I/O.
// ===========================================================================

// The ~400 ms beat the capture session is ticked on while recording.
export const TICK_MS = 400

// "m:ss" under an hour, "h:mm:ss" past it. Negative / bad input reads 0:00.
export function formatClock(ms) {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// Every coded failure the capture logic or the recorder can raise, mapped to the
// translated message key. The UI shows the message BY CODE, never the module's
// English fallback text. Unknown codes fall back to a generic, actionable line.
export const CAPTURE_ERROR_KEYS = {
  CAPTURE_ALREADY_STARTED: 'teach.capture.err.alreadyStarted',
  CAPTURE_NOT_STARTED: 'teach.capture.err.notStarted',
  CAPTURE_SCRUB_REQUIRED: 'teach.capture.err.scrubRequired',
  CAPTURE_UPLOAD_REQUIRED: 'teach.capture.err.uploadRequired',
  CAPTURE_REDACT_FAILED: 'teach.capture.err.redactFailed',
  CAPTURE_SAVE_FAILED: 'teach.capture.err.saveFailed',
}
export const CAPTURE_ERROR_FALLBACK = 'teach.capture.err.generic'
export function captureErrorKey(code) {
  return Object.prototype.hasOwnProperty.call(CAPTURE_ERROR_KEYS, code) ? CAPTURE_ERROR_KEYS[code] : CAPTURE_ERROR_FALLBACK
}

// The aligner's warnings (alignCapture().warnings), by code.
export const CAPTURE_WARNING_KEYS = {
  CAPTURE_EMPTY: 'teach.capture.warn.empty',
  STEP_NO_FRAME: 'teach.capture.warn.stepNoFrame',
}
export function warningKey(code) {
  return Object.prototype.hasOwnProperty.call(CAPTURE_WARNING_KEYS, code) ? CAPTURE_WARNING_KEYS[code] : null
}

// Collapse the aligner's warnings into what the trainer reads: one line per
// known code, STEP_NO_FRAME grouped into a single line listing the step numbers.
// -> [{ key, vars }]
export function warningLines(warnings) {
  const list = Array.isArray(warnings) ? warnings : []
  const out = []
  if (list.some((w) => w && w.code === 'CAPTURE_EMPTY')) out.push({ key: CAPTURE_WARNING_KEYS.CAPTURE_EMPTY, vars: {} })
  const noFrame = list.filter((w) => w && w.code === 'STEP_NO_FRAME' && Number.isFinite(w.step)).map((w) => w.step)
  if (noFrame.length) out.push({ key: CAPTURE_WARNING_KEYS.STEP_NO_FRAME, vars: { steps: noFrame.join(', '), n: noFrame.length } })
  return out
}

// Can this browser record a demonstration? -> { ok, reason }
// reason: 'mobile' (phones/tablets have no screen share), 'insecure' (screen
// share needs https or localhost), 'unsupported' (no getDisplayMedia).
export function recordSupport({ mobile = false, secure = true, hasDisplayMedia = false } = {}) {
  if (mobile) return { ok: false, reason: 'mobile' }
  if (!secure) return { ok: false, reason: 'insecure' }
  if (!hasDisplayMedia) return { ok: false, reason: 'unsupported' }
  return { ok: true, reason: null }
}

// Why a screen-share request failed, as a recoverable state the UI explains.
// Browsers raise NotAllowedError both when the person cancels the picker and
// when a policy blocks it, so both read as 'denied' (try again, or write steps).
export function shareErrorKind(err) {
  const name = err && err.name
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied'
  if (name === 'AbortError') return 'cancelled'
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') return 'unavailable'
  return 'failed'
}

// The identity scrub, passed EXPLICITLY when masking is off for this workflow
// and data protection is off, so finalizeCapture's "scrub is required" contract
// is always a conscious choice. Named so it is recognizable in a stack trace.
export function keepFrameAsIs(frame) { return frame }

// Mask when the workflow asks for it OR the company's data protection is on.
// redact: the on-device redactor (frame_scrub.redactFrame).
export function chooseScrub({ mask = true, dlp = false } = {}, redact) {
  if ((mask || dlp) && typeof redact === 'function') return redact
  if (mask || dlp) throw Object.assign(new Error('A redactor is required when masking is on.'), { code: 'CAPTURE_SCRUB_REQUIRED' })
  return keepFrameAsIs
}
export function maskingOn({ mask = true, dlp = false } = {}) { return !!(mask || dlp) }

// Only the frames the drafted steps actually show are masked and saved. Aligning
// runs on the FULL in-memory capture (so every step binds to the right screen),
// then this keeps just the frame events whose frame a step references, so
// finalizeCapture redacts + uploads those and nothing else. Order is preserved.
// -> { t0, events, voice }
export function pruneToStepFrames(capture, aligned) {
  const c = capture || {}
  const keep = new Set(((aligned && aligned.steps) || []).map((s) => s && s.frame).filter(Boolean))
  const events = (Array.isArray(c.events) ? c.events : []).filter((e) => e && e.frame && keep.has(e.frame))
  return { t0: c.t0, events, voice: Array.isArray(c.voice) ? c.voice.slice() : [] }
}

// Pair finalizeCapture's input and output events (same order, same length) into
// in-memory frame -> stored ref.
export function frameRefMap(beforeEvents, afterEvents) {
  const map = new Map()
  const a = Array.isArray(beforeEvents) ? beforeEvents : []
  const b = Array.isArray(afterEvents) ? afterEvents : []
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] && a[i].frame && b[i] && b[i].frame) map.set(a[i].frame, b[i].frame)
  }
  return map
}

// Swap each aligned step's in-memory frame for its stored ref (null when it had
// none, or when the frame was not saved). Returns a new aligned object.
export function bindStepRefs(aligned, refOf) {
  const a = aligned || {}
  const steps = (Array.isArray(a.steps) ? a.steps : []).map((s) => {
    const ref = s && s.frame && refOf && refOf.get(s.frame)
    return { ...s, frame: ref || null, hasFrame: !!ref }
  })
  return { ...a, steps }
}

// How many distinct frames a capture carries (what finalize will process).
export function distinctFrameCount(capture) {
  const ev = (capture && Array.isArray(capture.events)) ? capture.events : []
  return new Set(ev.filter((e) => e && e.frame).map((e) => e.frame)).size
}

// Load the recorded steps into the editor. When every existing row is blank
// (a fresh workflow), the recording replaces them; otherwise it is added after
// the trainer's own steps so nothing they wrote is lost.
// existing/recorded are editor rows (stepsToForm shape). -> { steps, mode }
export function mergeRecordedSteps(existing, recorded) {
  const have = Array.isArray(existing) ? existing : []
  const add = Array.isArray(recorded) ? recorded : []
  const blank = (s) => !s || ['instruction', 'target', 'doneWhen', 'docRef', 'shot'].every((k) => !String(s[k] || '').trim())
  if (have.every(blank)) return { steps: add.length ? add : have, mode: 'replace' }
  return { steps: have.concat(add), mode: 'append' }
}

// Narration stamping for a continuous speech recognizer. A transcript arrives
// AFTER the words were spoken, so each result is stamped with the clock reading
// taken when its FIRST (interim) piece came in, i.e. when speech started.
// nowMs: the capture session's clock. Feed every recognizer result event:
//   onResult(results, resultIndex) -> [{ text, at, endAt }] finals ready to add.
// results: array-like of { isFinal, 0: { transcript } } (the Web Speech shape).
export function createVoiceStamper(nowMs) {
  const startOf = new Map()   // result index -> clock when it was first heard
  const done = new Set()      // result indexes already emitted
  function onResult(results, resultIndex = 0) {
    const out = []
    const n = results ? results.length : 0
    for (let i = Math.max(0, resultIndex | 0); i < n; i++) {
      const r = results[i]
      if (!r || done.has(i)) continue
      if (!startOf.has(i)) startOf.set(i, nowMs())
      if (r.isFinal) {
        done.add(i)
        const text = String((r[0] && r[0].transcript) || '').trim()
        if (text) out.push({ text, at: startOf.get(i), endAt: nowMs() })
      }
    }
    return out
  }
  // A recognizer restart (it ends on silence) starts its result list over.
  function reset() { startOf.clear(); done.clear() }
  // The words heard but not final yet (shown live as "hearing ...").
  function pending(results) {
    const n = results ? results.length : 0
    let s = ''
    for (let i = 0; i < n; i++) { const r = results[i]; if (r && !r.isFinal && r[0]) s += r[0].transcript }
    return s.trim()
  }
  return { onResult, reset, pending }
}

// Overall finalize progress, 0..100. With masking on, masking and saving each
// make up half; with it off, saving is the whole bar.
// p: { stage: 'mask' | 'save', done, total, masking }
export function progressPct(p) {
  if (!p || !(p.total > 0)) return 0
  const done = Math.max(0, Math.min(p.total, p.done | 0))
  const units = p.masking ? p.total * 2 : p.total
  const so_far = (p.masking && p.stage === 'save' ? p.total : 0) + done
  return Math.round((so_far / units) * 100)
}

// The reflection the trainer reads after a recording: what was captured.
export function captureSummary(aligned, voiceLines = 0) {
  const a = aligned || {}
  const steps = Array.isArray(a.steps) ? a.steps : []
  return {
    steps: steps.length,
    frames: Number.isFinite(a.frameCount) ? a.frameCount : 0,
    shots: steps.filter((s) => s && s.frame).length,
    narrated: steps.filter((s) => s && String(s.narration || '').trim()).length,
    voiceLines: Number.isFinite(voiceLines) ? voiceLines : 0,
    durationMs: Number.isFinite(a.durationMs) ? a.durationMs : 0,
  }
}

export default {
  TICK_MS, formatClock, CAPTURE_ERROR_KEYS, CAPTURE_ERROR_FALLBACK, captureErrorKey, CAPTURE_WARNING_KEYS,
  warningKey, warningLines, recordSupport, shareErrorKind, keepFrameAsIs, chooseScrub, maskingOn,
  pruneToStepFrames, frameRefMap, bindStepRefs, distinctFrameCount, mergeRecordedSteps, createVoiceStamper, progressPct, captureSummary,
}
