// React hook that drives one "Record a demonstration" run in the Teach studio.
// It WIRES the tested logic and never re-implements it:
//   screen share (getDisplayMedia, like Guide mode; with the call's audio when
//   asked) -> createCaptureSession ticked on a steady ~400 ms beat (ticker.js)
//   with Guide mode's frameFromVideo / signatureFromVideo / changed.
//   Narration is server-side: the trainer's mic and, when present, the call audio
//   each run as a live voice channel (liveVoice.js: PCM -> createLiveChunker ->
//   createTranscriber, speakers 'trainer' / 'presenter'); live captions come from
//   the transcriber's onLine.
//   On Stop: stop the session, flush every channel, drain the transcriber, merge
//   the lines (withVoice), then finalizeRecording (align -> mask -> save -> rows).
// Frames live in memory only until finalize; cancel discards them, uploads
// nothing and sends no further audio. Every track (screen, call audio, mic) stops
// on stop, cancel, unmount, and when the share is ended from the browser's own
// bar (that counts as Stop, so the work is kept). Errors surface by CODE.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { frameFromVideo, signatureFromVideo, changed } from '../lib.js'
import { redactFrame, warmFrameScrub } from '../../../frame_scrub.js'
import { isDlpActive } from '../../../scrub.js'
import { createCaptureSession } from './captureSession.js'
import { createTranscriber, withVoice } from './transcribePipeline.js'
import { createTicker } from './ticker.js'
import { startVoiceChannel } from './liveVoice.js'
import { finalizeRecording } from './finalizeRecording.js'
import { TICK_MS, maskingOn, shareErrorKind } from './recordModel.js'
import { pushCaption, voiceWarningLines, asTranscribeError } from './voiceModel.js'

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
// status 499: never retried by the transcriber (only 429 / 5xx / no status are).
const closed = () => Object.assign(new Error('closed'), { code: 'CAPTURE_CLOSED', status: 499 })

// phase: 'idle' | 'prompt' | 'recording' | 'paused' | 'finalizing' | 'done' | 'denied' | 'error'
export function useDemoRecorder({ mask, t, onSteps }) {
  const [phase, setPhase] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [live, setLive] = useState({ frames: 0, cuts: 0, lines: 0 })
  const [captions, setCaptions] = useState([])
  const [mic, setMic] = useState('off')                  // off | on | denied | nomic
  const [call, setCall] = useState('off')                // off | on | none (asked for, but the share carried no audio)
  const [voiceOff, setVoiceOff] = useState(false)        // speech to text is not set up for this company
  const [denied, setDenied] = useState(null)             // shareErrorKind when phase === 'denied'
  const [progress, setProgress] = useState(null)         // { stage: 'voice' | 'mask' | 'save', done, total, masking }
  const [errorCode, setErrorCode] = useState(null)
  const [result, setResult] = useState(null)             // { summary, warnings, mode, masking }
  const [marked, setMarked] = useState(0)                // bumps on each Mark step, for a brief confirmation

  const alive = useRef(true)
  const streamsRef = useRef([])                          // every live MediaStream (screen, mic)
  const videoRef = useRef(null)
  const sessionRef = useRef(null)
  const tickerRef = useRef(null)
  const channelsRef = useRef([])                         // live voice channels
  const transcriberRef = useRef(null)
  const startRef = useRef(0)
  const storedRef = useRef(null)                         // { capture, voiceWarnings, lines } after Stop, kept for a retry
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

  // Stop every live resource: the beat, every voice channel, every media track.
  const releaseMedia = useCallback(() => {
    if (tickerRef.current) { tickerRef.current.stop(); tickerRef.current = null }
    for (const c of channelsRef.current) { try { c.stop() } catch { /* already stopped */ } }
    channelsRef.current = []
    for (const s of streamsRef.current) { try { s.getTracks().forEach((tr) => { tr.onended = null; tr.stop() }) } catch { /* already stopped */ } }
    streamsRef.current = []
    const v = videoRef.current
    if (v) { try { v.pause(); v.srcObject = null } catch { /* ignore */ } }
  }, [])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; runRef.current += 1; releaseMedia(); sessionRef.current = null; storedRef.current = null }
  }, [releaseMedia])

  // While a recording is live or being saved, leaving the page asks first.
  const busy = phase === 'prompt' || phase === 'recording' || phase === 'paused' || phase === 'finalizing'
  useEffect(() => {
    if (!busy) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  // Masking + saving for a stopped capture whose narration is already merged.
  // Safe to call again after a failure (nothing is re-recorded or re-transcribed).
  const finalize = useCallback(async (stored) => {
    const run = runRef.current
    safe(setPhase)('finalizing'); safe(setErrorCode)(null)
    try {
      const out = await finalizeRecording(stored.capture, {
        mask: maskRef.current, dlp: isDlpActive(), redact: redactFrame, upload: api.workflowFrameUpload,
        label: (k, v) => tRef.current(k, v), isOpen: () => alive.current && runRef.current === run,
        onProgress: safe(setProgress), voiceLines: stored.lines,
      })
      storedRef.current = null                           // frames are saved; drop the in-memory copies
      if (!alive.current) return
      const mode = out.steps.length && onStepsRef.current ? onStepsRef.current(out.steps) : null
      setResult({ summary: out.summary, warnings: [...out.warnings, ...stored.voiceWarnings], mode, masking: out.masking })
      setProgress(null)
      setPhase('done')
    } catch (e) {
      if (e && e.code === 'CAPTURE_CLOSED') return       // closed or cancelled on purpose: nothing to report
      safe(setErrorCode)((e && e.code) || 'UNKNOWN')
      safe(setProgress)(null)
      safe(setPhase)('error')
    }
  }, [])

  // start({ narrate, callAudio, language }): callAudio only when the trainer
  // confirmed everyone on the call knows it is being recorded.
  const start = useCallback(async ({ narrate, callAudio, language }) => {
    setErrorCode(null); setDenied(null); setResult(null); setCaptions([]); setVoiceOff(false)
    setLive({ frames: 0, cuts: 0, lines: 0 }); setElapsed(0); linesRef.current = 0
    setMic('off'); setCall('off')
    if (maskingOn({ mask: maskRef.current, dlp: isDlpActive() })) warmFrameScrub()
    const run = ++runRef.current
    const current = () => alive.current && runRef.current === run
    setPhase('prompt')
    let stream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: !!callAudio,
        selfBrowserSurface: 'exclude',     // recording this tab would capture the studio, not the app
        surfaceSwitching: 'include',
        ...(callAudio ? { systemAudio: 'include' } : {}),
      })
    } catch (e) {
      if (!current()) return
      setDenied(shareErrorKind(e)); setPhase('denied')
      return
    }
    if (!current()) { try { stream.getTracks().forEach((tr) => tr.stop()) } catch { /* ignore */ } return }
    streamsRef.current.push(stream)
    const video = videoRef.current || document.createElement('video')
    video.muted = true; video.playsInline = true
    videoRef.current = video
    video.srcObject = new MediaStream(stream.getVideoTracks())
    try { await video.play() } catch { /* frames still decode for a muted capture */ }
    if (!current()) { releaseMedia(); return }

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
      const tr = transcriberRef.current
      if (tr && tr.unavailable && alive.current) setVoiceOff(true)
    }, TICK_MS)
    setPhase('recording')
    // Voice set-up below awaits permission prompts; a Stop meanwhile must not leave
    // a mic or audio graph running, so it counts as no longer current.
    const liveNow = () => current() && sessionRef.current === session && !stoppingRef.current

    // Narration: one transcriber shared by the mic and the call audio. A clip of a
    // cancelled run is never sent.
    const callTrack = callAudio ? stream.getAudioTracks()[0] : null
    if (callAudio && !callTrack) setCall('none')
    if (!narrate && !callTrack) { transcriberRef.current = null; return }
    const transcriber = createTranscriber({
      language,
      transcribe: ({ audio, mime, language: lang }) => (runRef.current === run ? api.workTranscribe(audio, mime, lang).catch((e) => { throw asTranscribeError(e) }) : Promise.reject(closed())),
      onLine: (line) => {
        if (!current()) return
        linesRef.current += 1
        setLive((l) => ({ ...l, lines: l.lines + 1 }))
        setCaptions((c) => pushCaption(c, line))
      },
    })
    transcriberRef.current = transcriber
    const channel = (s, speaker) => startVoiceChannel({
      stream: s, speaker, transcriber,
      nowMs: () => session.nowMs(),
      isRecording: () => sessionRef.current === session && session.state === 'recording',
    })
    if (callTrack) {
      try {
        const c = await channel(new MediaStream([callTrack]), 'presenter')
        if (liveNow()) { channelsRef.current.push(c); setCall('on') } else c.stop()
      } catch { if (liveNow()) setCall('none') }
    }
    if (narrate && liveNow()) {
      let micStream
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      } catch (e) {
        if (liveNow()) setMic(e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') ? 'nomic' : 'denied')
        return
      }
      if (!liveNow()) { micStream.getTracks().forEach((tr) => tr.stop()); return }
      streamsRef.current.push(micStream)
      try {
        const c = await channel(micStream, 'trainer')
        if (liveNow()) { channelsRef.current.push(c); setMic('on') } else { c.stop(); micStream.getTracks().forEach((tr) => tr.stop()) }
      } catch { micStream.getTracks().forEach((tr) => tr.stop()); if (liveNow()) setMic('denied') }
    }
  }, [releaseMedia])

  const markStep = useCallback(() => {
    const s = sessionRef.current
    if (s && s.markStep()) { setLive((l) => ({ ...l, cuts: l.cuts + 1 })); setMarked((m) => m + 1) }
  }, [])

  const pause = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.state !== 'recording') return
    s.pause()
    for (const c of channelsRef.current) c.flush()       // a paused gap never sits inside one utterance
    setPhase('paused')
  }, [])
  const resume = useCallback(() => {
    const s = sessionRef.current
    if (!s || s.state !== 'paused') return
    s.resume()
    setPhase('recording')
  }, [])

  const stop = useCallback(async () => {
    const s = sessionRef.current
    if (!s || stoppingRef.current || (s.state !== 'recording' && s.state !== 'paused')) return
    stoppingRef.current = true
    const run = runRef.current
    setPhase('finalizing'); setProgress(null)
    if (tickerRef.current) { tickerRef.current.stop(); tickerRef.current = null }
    let capture
    try { capture = s.stop() } catch (e) { sessionRef.current = null; releaseMedia(); safe(setErrorCode)(e.code || 'UNKNOWN'); safe(setPhase)('error'); return }
    sessionRef.current = null
    releaseMedia()                                       // flushes every channel, then stops every track
    let voiceWarnings = [], lines = []
    const tr = transcriberRef.current
    transcriberRef.current = null
    if (tr) {
      safe(setProgress)({ stage: 'voice', done: 0, total: 0, masking: false })
      const drained = await tr.drain()
      if (!alive.current || runRef.current !== run) return
      lines = drained.lines
      voiceWarnings = voiceWarningLines(drained)
    }
    const stored = { capture: withVoice(capture, lines), voiceWarnings, lines: lines.length }
    storedRef.current = stored
    await finalize(stored)
  }, [finalize, releaseMedia])
  const stopRef = useRef(stop)
  stopRef.current = stop

  // Discard everything: no frame was uploaded, no further audio is sent, the
  // in-memory copies are dropped.
  const cancel = useCallback(() => {
    runRef.current += 1
    releaseMedia()
    transcriberRef.current = null
    sessionRef.current = null; storedRef.current = null; stoppingRef.current = false
    setPhase('idle'); setProgress(null); setErrorCode(null); setCaptions([]); setMic('off'); setCall('off'); setVoiceOff(false)
  }, [releaseMedia])

  const retry = useCallback(() => { if (storedRef.current) finalize(storedRef.current) }, [finalize])
  const canRetry = phase === 'error' && !!storedRef.current
  const reset = useCallback(() => { storedRef.current = null; setResult(null); setDenied(null); setErrorCode(null); setPhase('idle') }, [])

  return {
    videoRef, phase, busy, elapsed, live, captions, mic, call, voiceOff, denied, progress, errorCode, result, marked, canRetry,
    start, markStep, pause, resume, stop, cancel, retry, reset,
  }
}

export default useDemoRecorder
