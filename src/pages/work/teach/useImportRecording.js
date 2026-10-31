// React hook for "Import a recording": build steps from a video the trainer
// already has (a Teams or Zoom recording), entirely on this device until the
// same save path as a live recording. It WIRES the tested logic:
//   openVideoFile (local object URL) -> scanVideo (seek-steps the video's own
//   clock through a capture session made with Guide mode's frameFromVideo /
//   signatureFromVideo / changed) while the soundtrack is decoded (videoSource)
//   -> downmix / planUtterances -> createTranscriber (speaker 'presenter')
//   -> drain -> withVoice -> finalizeRecording (mask per the workflow, save,
//   align, rows). Cancel aborts the scan and sends no further audio.
// If the soundtrack cannot be decoded the steps come from the frames alone, and
// the trainer is told. Errors surface by CODE (SCAN_ABORTED, SCAN_NO_VIDEO,
// IMPORT_UNREADABLE, CAPTURE_*).
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../api.js'
import { frameFromVideo, signatureFromVideo, changed } from '../lib.js'
import { redactFrame, warmFrameScrub } from '../../../frame_scrub.js'
import { isDlpActive } from '../../../scrub.js'
import { createCaptureSession } from './captureSession.js'
import { createTranscriber, withVoice } from './transcribePipeline.js'
import { planUtterances } from './audioChunker.js'
import { scanVideo } from './videoScan.js'
import { openVideoFile, makeSeeker, decodeSoundtrack } from './videoSource.js'
import { finalizeRecording } from './finalizeRecording.js'
import { maskingOn } from './recordModel.js'
import { scanStepFor, soundtrackUtterances, voiceWarningLines, looksLikeVideo, asTranscribeError, soundtrackFits } from './voiceModel.js'

// status 499 on a cancel: the transcriber never retries it (only 429 / 5xx / no status).
const coded = (code) => Object.assign(new Error(code), { code, status: 499 })

// phase: 'idle' | 'opening' | 'picked' | 'working' | 'finalizing' | 'done' | 'error'
export function useImportRecording({ mask, t, onSteps }) {
  const [phase, setPhase] = useState('idle')
  const [file, setFile] = useState(null)                 // { name, durationMs }
  const [scan, setScan] = useState(0)                    // 0..1
  const [audio, setAudio] = useState({ state: 'idle', done: 0, total: 0 })   // decoding | transcribing | none | silent | off
  const [progress, setProgress] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [result, setResult] = useState(null)

  const alive = useRef(true)
  const srcRef = useRef(null)                            // { video, durationMs, dispose, file }
  const abortRef = useRef(null)
  const runRef = useRef(0)
  const onStepsRef = useRef(onSteps)
  onStepsRef.current = onSteps
  const tRef = useRef(t)
  tRef.current = t
  const maskRef = useRef(mask)
  maskRef.current = mask

  const dispose = () => { if (srcRef.current) { srcRef.current.dispose(); srcRef.current = null } }
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; runRef.current += 1; if (abortRef.current) abortRef.current.abort(); dispose() }
  }, [])

  const busy = phase === 'opening' || phase === 'working' || phase === 'finalizing'
  useEffect(() => {
    if (!busy) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const fail = (code) => { if (!alive.current) return; setErrorCode(code || 'UNKNOWN'); setProgress(null); setPhase('error') }

  // Open a chosen file locally and read its length; nothing is sent anywhere.
  const pick = useCallback(async (f) => {
    if (!f) return
    dispose(); setFile(null); setResult(null); setErrorCode(null)
    if (!looksLikeVideo(f)) { fail('SCAN_NO_VIDEO'); return }
    setPhase('opening')
    const run = ++runRef.current
    try {
      const src = await openVideoFile(f)
      if (!alive.current || runRef.current !== run) { src.dispose(); return }
      srcRef.current = { ...src, file: f }
      setFile({ name: f.name, durationMs: src.durationMs })
      setPhase('picked')
    } catch (e) { if (runRef.current === run) fail(e && e.code) }
  }, [])

  const build = useCallback(async ({ language }) => {
    const src = srcRef.current
    if (!src) return
    const run = ++runRef.current
    const ctl = new AbortController()
    abortRef.current = ctl
    const current = () => alive.current && runRef.current === run && !ctl.signal.aborted
    setErrorCode(null); setResult(null); setScan(0); setAudio({ state: 'decoding', done: 0, total: 0 }); setProgress(null)
    setPhase('working')
    if (maskingOn({ mask: maskRef.current, dlp: isDlpActive() })) warmFrameScrub()

    const transcriber = createTranscriber({
      language,
      transcribe: ({ audio: a, mime, language: lang }) => (current() ? api.workTranscribe(a, mime, lang).catch((e) => { throw asTranscribeError(e) }) : Promise.reject(coded('SCAN_ABORTED'))),
    })
    // Soundtrack: decode, plan, transcribe, alongside the frame scan.
    const soundtrack = (async () => {
      // A very large recording is read for its screens only: decoding its whole
      // soundtrack in the tab could exhaust memory, which no code can recover from.
      const decoded = soundtrackFits(src.file, src.durationMs) ? await decodeSoundtrack(src.file) : null
      if (!current()) return { lines: [], warnings: [] }
      if (!decoded) { setAudio({ state: 'none', done: 0, total: 0 }); return { lines: [], warnings: [{ key: 'teach.capture.import.noAudio' }] } }
      const jobs = soundtrackUtterances(decoded.mono, decoded.rate, planUtterances(decoded.mono, decoded.rate))
      if (!jobs.length) { setAudio({ state: 'silent', done: 0, total: 0 }); return { lines: [], warnings: [] } }
      let done = 0
      setAudio({ state: 'transcribing', done: 0, total: jobs.length })
      await Promise.all(jobs.map((u) => transcriber.enqueue(u, { speaker: 'presenter' }).then(() => {
        done += 1
        if (alive.current) setAudio((s) => ({ ...s, done, state: transcriber.unavailable ? 'off' : s.state }))
      })))
      const drained = await transcriber.drain()
      return { lines: drained.lines, warnings: voiceWarningLines(drained) }
    })()

    let capture
    try {
      capture = await scanVideo({
        durationMs: src.durationMs,
        seekTo: makeSeeker(src.video),
        makeSession: (nowFn) => createCaptureSession({ now: nowFn, frameOf: (v) => frameFromVideo(v), sigOf: signatureFromVideo, changed }),
        stepMs: scanStepFor(src.durationMs),
        onProgress: (p) => { if (alive.current) setScan(p) },
        signal: ctl.signal,
      })
    } catch (e) {
      soundtrack.catch(() => {})
      if (runRef.current === run) fail((e && e.code) || 'IMPORT_UNREADABLE')
      return
    }
    // Cancel answers at once even while clips are still queued.
    const aborted = new Promise((resolve) => ctl.signal.addEventListener('abort', () => resolve(null), { once: true }))
    let voice
    try { voice = await Promise.race([soundtrack, aborted]) } catch { voice = { lines: [], warnings: [{ key: 'teach.capture.import.noAudio' }] } }
    if (!voice || !current()) { soundtrack.catch(() => {}); if (runRef.current === run && ctl.signal.aborted) fail('SCAN_ABORTED'); return }

    setPhase('finalizing')
    try {
      const out = await finalizeRecording(withVoice(capture, voice.lines), {
        mask: maskRef.current, dlp: isDlpActive(), redact: redactFrame, upload: api.workflowFrameUpload,
        label: (k, v) => tRef.current(k, v), isOpen: () => alive.current && runRef.current === run,
        onProgress: (p) => { if (alive.current) setProgress(p) }, voiceLines: voice.lines.length,
      })
      if (!alive.current) return
      const mode = out.steps.length && onStepsRef.current ? onStepsRef.current(out.steps) : null
      setResult({ summary: out.summary, warnings: [...out.warnings, ...voice.warnings], mode, masking: out.masking })
      setProgress(null)
      setPhase('done')
    } catch (e) {
      if (e && e.code === 'CAPTURE_CLOSED') return
      if (runRef.current === run) fail(e && e.code)
    }
  }, [])

  // Cancel a running import: the scan stops, no further audio or frame is sent.
  const cancel = useCallback(() => { if (abortRef.current) abortRef.current.abort() }, [])
  // Back to the file (same video, nothing re-opened), or start over.
  const again = useCallback(() => { setErrorCode(null); setResult(null); setPhase(srcRef.current ? 'picked' : 'idle') }, [])
  const reset = useCallback(() => { runRef.current += 1; dispose(); setFile(null); setResult(null); setErrorCode(null); setPhase('idle') }, [])

  return { phase, busy, file, scan, audio, progress, errorCode, result, pick, build, cancel, again, reset }
}

export default useImportRecording
