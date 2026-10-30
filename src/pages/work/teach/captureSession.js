// ===========================================================================
// WorkCoPilot TEACH capture SESSION controller (Wave 2, renderer side). Owns
// the recording state machine (start / pause / resume / stop) and produces the
// one-clock { t0, events, voice } that captureTimeline.alignCapture consumes.
// Every DOM/capture call is INJECTED (now, frameOf, sigOf, changed), so the
// whole policy is unit-tested with fakes; the Teach studio UI wires the real
// screen <video> (Guide mode's frameFromVideo / signatureFromVideo / changed),
// the microphone transcript, and the desktop agent's click / hotkey events.
//
// A web page cannot see clicks made inside ANOTHER application, so the step
// signal that works everywhere is the screen itself: a step-worthy 'change' is
// emitted only when the screen SETTLES after a significant change (Guide mode's
// "new page" snap), so typing, a blinking cursor, or a spinner never makes a
// step. The step carries the screen the action happened ON, not the aftermath.
// A periodic frame runs on a steady beat so a silent stretch is still captured.
// When the desktop agent does report a real click / navigation / mark, the
// screen change it causes is not double-counted. Paused time is excluded.
// Every thrown error carries a stable `code` (CAPTURE_*) so the UI shows a
// translated message by code rather than this module's English fallback.
// ===========================================================================

function codedError(code, message) { const e = new Error(message); e.code = code; return e }

export const SETTLE_TICKS = 3          // the screen must hold still this many ticks after changing
export const CHANGE_THRESHOLD = 10     // a significant change (same scale as Guide's new-page snap)
export const ACTION_MERGE_MS = 3000    // a screen change this soon after a reported action belongs to that action
export const DEFAULT_PERIODIC_MS = 4000

const ACTIONS = new Set(['click', 'nav', 'submit', 'mark'])

// deps: { now()->ms, frameOf(video)->dataUrl|null, sigOf(video)->sig|null,
//         changed(a, b, threshold?)->bool, periodicMs? }
export function createCaptureSession(deps) {
  const { now, frameOf, sigOf, changed } = deps
  const periodicMs = Number.isFinite(deps.periodicMs) && deps.periodicMs > 0 ? deps.periodicMs : DEFAULT_PERIODIC_MS
  let state = 'idle'                                   // idle | recording | paused | stopped
  let t0 = 0, pausedAt = 0, pausedTotal = 0
  const events = []
  const voice = []
  let lastSig = null, stable = 0, settledSig = null
  let lastFrame = null, lastFrameT = 0, lastActionT = -Infinity

  const clock = () => now() - pausedTotal             // the recording clock excludes paused time

  function start() {
    if (state !== 'idle') throw codedError('CAPTURE_ALREADY_STARTED', 'This capture has already started.')
    t0 = now(); lastFrameT = t0; state = 'recording'
  }
  function pause() { if (state === 'recording') { pausedAt = now(); state = 'paused' } }
  function resume() { if (state === 'paused') { pausedTotal += now() - pausedAt; state = 'recording' } }

  // Call on a steady interval while recording. Returns what this tick captured:
  // 'frame' (first or new screen), 'change' (a step boundary), 'periodic', or null.
  function tick(video) {
    if (state !== 'recording') return null
    const t = clock()
    const sig = sigOf(video)
    if (sig != null) {
      stable = (lastSig != null && changed(lastSig, sig)) ? 0 : stable + 1
      lastSig = sig
      if (stable === SETTLE_TICKS && (settledSig == null || changed(settledSig, sig, CHANGE_THRESHOLD))) {
        const frame = frameOf(video)
        if (frame) {
          const isChange = settledSig != null && !!lastFrame && (t - lastActionT > ACTION_MERGE_MS)
          if (isChange) events.push({ t, kind: 'change', frame: lastFrame })   // the screen the action happened on
          events.push({ t, kind: 'frame', frame })                             // the new screen
          settledSig = sig; lastFrame = frame; lastFrameT = t
          return isChange ? 'change' : 'frame'
        }
      }
    }
    if (t - lastFrameT >= periodicMs) {
      const frame = frameOf(video)
      if (frame) { events.push({ t, kind: 'frame', frame }); lastFrame = frame; lastFrameT = t; return 'periodic' }
    }
    return null
  }

  // A real action reported by the desktop agent (click / nav / submit) or the
  // trainer's mark-step hotkey. Carries the screen it happened on.
  function action(kind, { target = null, url = null } = {}) {
    if (state !== 'recording' || !ACTIONS.has(kind)) return false
    const t = clock()
    events.push({ t, kind, target, url, frame: lastFrame })
    lastActionT = t
    return true
  }
  const markStep = () => action('mark')

  // A narration line. Pass `at` = nowMs() taken when the speech STARTED (the
  // transcript arrives later); without it the line is stamped now.
  function addVoice(text, { at, endAt } = {}) {
    const s = String(text == null ? '' : text).trim()
    if (!s || state === 'idle' || state === 'stopped') return false
    if (!Number.isFinite(at) && state !== 'recording') return false
    voice.push({ t: Number.isFinite(at) ? at : clock(), ...(Number.isFinite(endAt) ? { endT: endAt } : {}), text: s })
    return true
  }

  function stop() {
    if (state === 'idle') throw codedError('CAPTURE_NOT_STARTED', 'Nothing is being captured yet.')
    if (state === 'paused') resume()
    state = 'stopped'
    return { t0, events: events.slice(), voice: voice.slice() }
  }

  return {
    start, pause, resume, tick, action, markStep, addVoice, stop,
    nowMs: clock,
    get state() { return state },
  }
}

// Turn a stopped capture's in-memory frames into stored refs. EVERY distinct
// frame is redacted first and only then uploaded, once each: if any redaction
// fails, nothing is uploaded (fail closed). `scrub` is required so masking is
// always a conscious choice (pass the identity when redaction is off for this
// workflow); upload(dataUrl) -> { ref }.
export async function finalizeCapture({ t0, events = [], voice = [] } = {}, { scrub, upload } = {}) {
  if (typeof scrub !== 'function') throw codedError('CAPTURE_SCRUB_REQUIRED', 'A scrub function is required (pass the identity when redaction is off).')
  if (typeof upload !== 'function') throw codedError('CAPTURE_UPLOAD_REQUIRED', 'An upload function is required.')
  const distinct = [...new Set(events.filter((e) => e && e.frame).map((e) => e.frame))]
  const cleaned = new Map()
  for (const f of distinct) {
    try { cleaned.set(f, await scrub(f)) } catch { throw codedError('CAPTURE_REDACT_FAILED', 'A frame could not be redacted, so nothing was uploaded. Try again.') }
  }
  const refOf = new Map()
  for (const f of distinct) {
    const res = await upload(cleaned.get(f))
    if (!res || !res.ref) throw codedError('CAPTURE_SAVE_FAILED', 'A frame could not be saved. Try again.')
    refOf.set(f, res.ref)
  }
  return { t0, events: events.map((e) => (e && e.frame ? { ...e, frame: refOf.get(e.frame) } : e)), voice: voice.slice() }
}

export default { SETTLE_TICKS, CHANGE_THRESHOLD, ACTION_MERGE_MS, DEFAULT_PERIODIC_MS, createCaptureSession, finalizeCapture }
