// React hook that drives one "Record a demonstration" run in the Teach studio.
// It WIRES the tested capture logic and never re-implements it:
//   screen share (getDisplayMedia, like Guide mode) -> createCaptureSession
//   ticked on a steady ~400 ms beat (ticker.js) with Guide mode's frameFromVideo /
//   signatureFromVideo / changed -> narration (speechNarration.js) into addVoice
//   -> on Stop: alignCapture on the full in-memory capture, keep only the frames
//   the steps show (recordModel.pruneToStepFrames), finalizeCapture with an
//   EXPLICIT scrub (redactFrame when masking or data protection is on, else the
//   identity) and api.workflowFrameUpload -> toWorkflowSteps with translated
//   seeds -> onSteps(editor rows, summary, warnings).
// Frames live in memory only until finalize; cancel discards them and uploads
// nothing. Every track (screen + microphone) stops on stop, cancel, unmount, and
// when the share is ended from the browser's own bar (that counts as Stop, so the
// work is kept). Errors surface by CODE (recordModel.captureErrorKey).
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { frameFromVideo, signatureFromVideo, changed } from '../lib.js'
import { redactFrame, warmFrameScrub } from '../../../frame_scrub.js'
import { isDlpActive } from '../../../scrub.js'
import { createCaptureSession, finalizeCapture } from './captureSession.js'
import { alignCapture, toWorkflowSteps } from './captureTimeline.js'
import { stepsToForm } from './workflowModel.js'
import { createTicker } from './ticker.js'
import { createNarration } from './speechNarration.js'
import {
  TICK_MS, chooseScrub, keepFrameAsIs, maskingOn, shareErrorKind, pruneToStepFrames, frameRefMap, bindStepRefs,
  distinctFrameCount, captureSummary, warningLines,
} from './recordModel.js'

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

// phase: 'idle' | 'prompt' | 'recording' | 'paused' | 'finalizing' | 'done' | 'denied' | 'error'
export function useDemoRecorder({ mask, lang, t, onSteps }) {
  const [phase, setPhase] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [live, setLive] = useState({ frames: 0, cuts: 0, lines: 0 })
  const [hearing, setHearing] = useState('')
  const [mic, setMic] = useState('off')                  // off | on | denied | nomic | network
  const [onDevice, setOnDevice] = useState(false)
  const [denied, setDenied] = useState(null)             // shareErrorKind when phase === 'denied'
  const [progress, setProgress] = useState(null)         // { stage: 'mask' | 'save', done, total, masking }
  const [errorCode, setErrorCode] = useState(null)
  const [result, setResult] = useState(null)             // { summary, warnings, mode }
  const [marked, setMarked] = useState(0)                // bumps on each Mark step, for a brief confirmation

  const alive = useRef(true)
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const sessionRef = useRef(null)
  const tickerRef = useRef(null)
  const narrRef = useRef(null)
  const startRef = useRef(0)
  const captureRef = useRef(null)                        // the stopped in-memory capture, kept for a retry
  const linesRef = useRef(0)
  const stoppingRef = useRef(false)
  const runRef = useRef(0)                               // bumps on start / cancel, so a late await never revives a cancelled run
  const onStepsRef = useRef(onSteps)
  onStepsRef.current = onSteps
  const tRef = useRef(t)
  tRef.current = t
  const maskRef = useRef(mask)
  maskRef.current = mask

  const safe = (fn) => (...a) => { if (alive.current) fn(...a) }

  // Stop every live resource: the beat, the narration, and every media track.
  const releaseMedia = useCallback(({ abortVoice = true } = {}) => {
    if (tickerRef.current) { tickerRef.current.stop(); tickerRef.current = null }
    const n = narrRef.current
    narrRef.current = null
    const voiceDone = n ? (abortVoice ? n.abort() : n.stop()) : Promise.resolve()
    const s = streamRef.current
    streamRef.current = null
    if (s) { try { s.getTracks().forEach((tr) => { tr.onended = null; tr.stop() }) } catch { /* already stopped */ } }
    const v = videoRef.current
    if (v) { try { v.pause(); v.srcObject = null } catch { /* ignore */ } }
    return voiceDone
  }, [])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; releaseMedia(); sessionRef.current = null; captureRef.current = null }
  }, [releaseMedia])

  // While a recording is live or being saved, leaving the page asks first.
  const busy = phase === 'prompt' || phase === 'recording' || phase === 'paused' || phase === 'finalizing'
  useEffect(() => {
    if (!busy) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  // Masking + upload + alignment for a stopped capture. Safe to call again with
  // the same in-memory capture after a failure (nothing is re-recorded).
  const finalize = useCallback(async (capture) => {
    const setP = safe(setProgress)
    safe(setPhase)('finalizing'); safe(setErrorCode)(null)
    const run = runRef.current
    let stage = 'mask'
    try {
      const aligned = alignCapture(capture)
      const warnings = warningLines(aligned.warnings)
      if (!aligned.steps.length) {
        captureRef.current = null
        safe(setResult)({ summary: captureSummary({ ...aligned, frameCount: distinctFrameCount(capture) }, linesRef.current), warnings, mode: null })
        safe(setPhase)('done')
        return
      }
      const pruned = pruneToStepFrames(capture, aligned)
      const total = distinctFrameCount(pruned)
      let masked = 0, saved = 0
      const redact = chooseScrub({ mask: maskRef.current, dlp: isDlpActive() }, redactFrame)
      const masking = redact !== keepFrameAsIs
      setP({ stage: masking ? 'mask' : 'save', done: 0, total, masking })
      // Closing the wizard mid-save stops the rest: nothing more is masked or sent.
      const stillOpen = () => { if (!alive.current || runRef.current !== run) throw Object.assign(new Error('closed'), { code: 'CAPTURE_CLOSED' }) }
      const scrub = async (f) => {
        stillOpen()
        const out = await redact(f)
        if (masking) { masked += 1; setP({ stage: 'mask', done: masked, total, masking }) }
        return out
      }
      const upload = async (dataUrl) => {
        stage = 'save'
        stillOpen()
        const r = await api.workflowFrameUpload(dataUrl)
        saved += 1; setP({ stage: 'save', done: saved, total, masking })
        return r
      }
      const done = await finalizeCapture(pruned, { scrub, upload })
      const bound = bindStepRefs(aligned, frameRefMap(pruned.events, done.events))
      const steps = stepsToForm(toWorkflowSteps(bound, { label: (k, v) => tRef.current(k, v) }))
      captureRef.current = null                          // frames are saved; drop the in-memory copies
      if (!alive.current) return
      const mode = onStepsRef.current ? onStepsRef.current(steps) : null
      setResult({ summary: captureSummary({ ...bound, frameCount: distinctFrameCount(capture) }, linesRef.current), warnings, mode })
      setProgress(null)
      setPhase('done')
    } catch (e) {
      // Keep the in-memory capture so Try again re-runs only this part. An upload
      // that failed without a code is still a save failure, so say that.
      const code = (e && e.code) || (stage === 'save' ? 'CAPTURE_SAVE_FAILED' : null)
      safe(setErrorCode)(code || 'UNKNOWN')
      safe(setProgress)(null)
      safe(setPhase)('error')
    }
  }, [])

  const start = useCallback(async ({ narrate }) => {
    setErrorCode(null); setDenied(null); setResult(null); setHearing('')
    setLive({ frames: 0, cuts: 0, lines: 0 }); setElapsed(0); linesRef.current = 0
    if (maskingOn({ mask: maskRef.current, dlp: isDlpActive() })) warmFrameScrub()
    const run = ++runRef.current
    const current = () => alive.current && runRef.current === run
    setPhase('prompt')
    let stream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: false,
        selfBrowserSurface: 'exclude',     // recording this tab would capture the studio, not the app
        surfaceSwitching: 'include',
      })
    } catch (e) {
      if (!current()) return
      setDenied(shareErrorKind(e)); setPhase('denied')
      return
    }
    if (!current()) { try { stream.getTracks().forEach((tr) => tr.stop()) } catch { /* ignore */ } return }
    streamRef.current = stream
    const video = videoRef.current || document.createElement('video')
    video.muted = true; video.playsInline = true
    videoRef.current = video
    video.srcObject = stream
    try { await video.play() } catch { /* frames still decode for a muted capture */ }
    if (!current()) { if (streamRef.current === stream) releaseMedia(); else { try { stream.getTracks().forEach((tr) => tr.stop()) } catch { /* ignore */ } } return }

    const session = createCaptureSession({ now, frameOf: (v) => frameFromVideo(v), sigOf: signatureFromVideo, changed })
    sessionRef.current = session
    session.start()
    startRef.current = session.nowMs()
    stoppingRef.current = false
    // Ending the share from the browser's own bar keeps the work: same as Stop.
    stream.getVideoTracks().forEach((tr) => { tr.onended = () => { stopRef.current() } })

    tickerRef.current = createTicker(() => {
      const s = sessionRef.current
      if (!s) return
      const got = s.tick(videoRef.current)
      if (got && alive.current) setLive((l) => ({ ...l, frames: l.frames + 1, cuts: l.cuts + (got === 'change' ? 1 : 0) }))
      if (s.state === 'recording' && alive.current) setElapsed(s.nowMs() - startRef.current)
    }, TICK_MS)
    setPhase('recording')

    if (narrate) {
      const n = await createNarration({
        lang,
        nowMs: () => (sessionRef.current ? sessionRef.current.nowMs() : 0),
        onLine: ({ text, at, endAt }) => {
          const s = sessionRef.current
          if (s && s.addVoice(text, { at, endAt })) { linesRef.current += 1; if (alive.current) setLive((l) => ({ ...l, lines: l.lines + 1 })) }
        },
        onHearing: safe(setHearing),
        onIssue: safe(setMic),
      })
      if (n && current() && streamRef.current) { narrRef.current = n; setOnDevice(!!n.onDevice); setMic('on'); if (session.state === 'recording') n.start() }
      else if (!n && current()) setMic('unsupported')
    } else setMic('off')
  }, [lang, releaseMedia])

  const markStep = useCallback(() => {
    const s = sessionRef.current
    if (s && s.markStep()) { setLive((l) => ({ ...l, cuts: l.cuts + 1 })); setMarked((m) => m + 1) }
  }, [])

  const pause = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.state !== 'recording') return
    s.pause(); if (narrRef.current) narrRef.current.pause()
    setPhase('paused')
  }, [])
  const resume = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.state !== 'paused') return
    s.resume(); if (narrRef.current) narrRef.current.resume()
    setPhase('recording')
  }, [])

  const stop = useCallback(async () => {
    const s = sessionRef.current
    if (!s || stoppingRef.current || (s.state !== 'recording' && s.state !== 'paused')) return
    stoppingRef.current = true
    setPhase('finalizing'); setProgress(null)
    if (s.state === 'paused') { s.resume() }
    // Let the narration finish the sentence it was on, then close the capture.
    if (tickerRef.current) { tickerRef.current.stop(); tickerRef.current = null }
    await releaseMedia({ abortVoice: false })
    let capture
    try { capture = s.stop() } catch (e) { sessionRef.current = null; safe(setErrorCode)(e.code || 'UNKNOWN'); safe(setPhase)('error'); return }
    sessionRef.current = null
    captureRef.current = capture
    await finalize(capture)
  }, [finalize, releaseMedia])
  const stopRef = useRef(stop)
  stopRef.current = stop

  // Discard everything: no frame was uploaded, the in-memory copies are dropped.
  const cancel = useCallback(() => {
    runRef.current += 1
    releaseMedia()
    sessionRef.current = null; captureRef.current = null; stoppingRef.current = false
    setPhase('idle'); setProgress(null); setErrorCode(null); setHearing(''); setMic('off')
  }, [releaseMedia])

  const retry = useCallback(() => { if (captureRef.current) finalize(captureRef.current) }, [finalize])
  const canRetry = phase === 'error' && !!captureRef.current
  const reset = useCallback(() => { captureRef.current = null; setResult(null); setDenied(null); setErrorCode(null); setPhase('idle') }, [])

  return {
    videoRef, phase, busy, elapsed, live, hearing, mic, onDevice, denied, progress, errorCode, result, marked, canRetry,
    start, markStep, pause, resume, stop, cancel, retry, reset,
  }
}

export default useDemoRecorder
