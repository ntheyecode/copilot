// ===========================================================================
// WorkCoPilot TEACH recorded-video scan (Wave 2). Drives a capture session over
// a RECORDED video (e.g. a Teams or Zoom recording) by stepping the video's own
// clock: seek, wait for that frame, tick. It is deterministic (the same file
// gives the same steps every time) and runs faster than real time, and because
// the capture clock IS the video time, frames line up exactly with the
// soundtrack's utterances, which are stamped in video time too.
//
// Runs on the trainer's device: the video file never leaves it, only redacted
// frames (finalizeCapture) and short audio clips (the transcription pipeline)
// do. The DOM work is injected (seekTo, makeSession), so this is unit-tested.
// ===========================================================================

export const DEFAULT_STEP_MS = 500

function codedError(code, message) { const e = new Error(message); e.code = code; return e }

// seekTo(ms) -> Promise<video>  resolves once the frame at `ms` is decoded and shown
// makeSession(now) -> a captureSession created with { now, frameOf, sigOf, changed }
// Returns the stopped capture { t0: 0, events, voice } on the video clock.
export async function scanVideo({ durationMs, seekTo, makeSession, stepMs = DEFAULT_STEP_MS, onProgress = null, signal = null } = {}) {
  if (!(durationMs > 0)) throw codedError('SCAN_NO_VIDEO', 'That video has no length to scan.')
  if (typeof seekTo !== 'function' || typeof makeSession !== 'function') throw new Error('scanVideo needs seekTo and makeSession.')
  const step = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : DEFAULT_STEP_MS
  let videoMs = 0
  const session = makeSession(() => videoMs)
  session.start()
  for (let t = 0; t <= durationMs; t += step) {
    if (signal && signal.aborted) { try { session.stop() } catch { /* already stopped */ } throw codedError('SCAN_ABORTED', 'The scan was cancelled.') }
    const video = await seekTo(t)
    videoMs = t
    session.tick(video)
    if (typeof onProgress === 'function') onProgress(Math.min(1, t / durationMs))
  }
  if (typeof onProgress === 'function') onProgress(1)
  return session.stop()
}

export default { DEFAULT_STEP_MS, scanVideo }
