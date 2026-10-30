// ===========================================================================
// WorkCoPilot TEACH transcription pipeline (Wave 2). Sends each utterance from
// the chunker to the server (which uses the company's own AI provider) with
// bounded concurrency and a retry on transient failures, and turns the results
// into voice lines on the capture clock:
//   { t, endT, text, speaker }      speaker: 'trainer' | 'presenter'
// Segment timestamps, when the provider returns them, refine WHEN each sentence
// was said inside an utterance.
//
// Nothing is dropped silently: a chunk that still fails is recorded with a
// stable code, and if the provider cannot transcribe at all the pipeline stops
// sending (every chunk would fail the same way) and reports that once. The
// `transcribe` call is injected, so the policy is unit-tested.
// ===========================================================================
import { utteranceWav } from './audioChunker.js'

export const SPEAKERS = ['trainer', 'presenter']

const codeOf = (e) => (e && (e.code || (e.data && e.data.code))) || null
const isUnavailable = (e) => !!e && (codeOf(e) === 'AI-NO-TRANSCRIBE' || !!(e.data && e.data.needsTranscribeKey) || e.status === 403)
const isRetriable = (e) => !e || !e.status || e.status === 429 || e.status >= 500

export function bytesToBase64(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || [])
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000))
  return btoa(s)
}

// Pure: one transcription result -> voice lines on the capture clock.
export function toLines(utt, result, speaker) {
  const segs = result && Array.isArray(result.segments) && result.segments.length ? result.segments : null
  if (segs) {
    return segs
      .filter((s) => s && String(s.text || '').trim() && Number.isFinite(s.startMs))
      .map((s) => ({ t: utt.startMs + s.startMs, endT: utt.startMs + (Number.isFinite(s.endMs) ? s.endMs : s.startMs), text: String(s.text).trim(), speaker }))
  }
  const text = String((result && result.text) || '').trim()
  return text ? [{ t: utt.startMs, endT: utt.endMs, text, speaker }] : []
}

// Pure: merge voice lines into a stopped capture (sorted, exact duplicates removed).
export function withVoice(capture, lines) {
  const seen = new Set()
  const voice = [...((capture && capture.voice) || []), ...(Array.isArray(lines) ? lines : [])]
    .filter((v) => {
      const k = `${v.t}|${v.speaker || ''}|${v.text}`
      if (seen.has(k)) return false
      seen.add(k); return true
    })
    .sort((a, b) => a.t - b.t)
  return { ...(capture || {}), voice }
}

// transcribe({ audio: base64, mime, language }) -> Promise<{ text, segments|null }>
// onLine(line) fires as each line arrives (live captions in the recorder).
export function createTranscriber({ transcribe, concurrency = 2, retries = 1, language = null, delayMs = 800, sleep = null, onLine = null } = {}) {
  if (typeof transcribe !== 'function') throw new Error('createTranscriber needs a transcribe function.')
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)))
  const queue = []
  const lines = []
  const errors = []
  let active = 0, unavailable = false, skipped = 0
  let idle = []

  function settleIdle() {
    if (active === 0 && queue.length === 0) { const r = idle; idle = []; for (const f of r) f() }
  }
  async function run(job) {
    const { utt, speaker } = job
    const wav = utt.wav || utteranceWav(utt.samples, utt.rate)
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (unavailable) { skipped++; return }
      try {
        const result = await transcribe({ audio: bytesToBase64(wav), mime: 'audio/wav', language })
        for (const line of toLines(utt, result, speaker)) { lines.push(line); if (typeof onLine === 'function') onLine(line) }
        return
      } catch (e) {
        if (isUnavailable(e)) {
          if (!unavailable) errors.push({ code: 'TRANSCRIBE_UNAVAILABLE', startMs: utt.startMs, status: e.status || null })
          unavailable = true
          return
        }
        if (!isRetriable(e) || attempt === retries) { errors.push({ code: 'TRANSCRIBE_FAILED', startMs: utt.startMs, endMs: utt.endMs, speaker, status: e.status || null }); return }
        await wait(delayMs * (attempt + 1))
      }
    }
  }
  function pump() {
    while (active < concurrency && queue.length) {
      const job = queue.shift()
      if (unavailable) { skipped++; job.done(); continue }
      active++
      run(job).finally(() => { active--; job.done(); pump(); settleIdle() })
    }
    settleIdle()
  }

  return {
    // utt: { startMs, endMs, samples, rate } from the chunker, or { startMs, endMs, wav }.
    enqueue(utt, { speaker = 'trainer' } = {}) {
      return new Promise((done) => {
        queue.push({ utt, speaker: SPEAKERS.includes(speaker) ? speaker : 'trainer', done })
        pump()
      })
    },
    // Wait for everything queued so far; returns all lines (sorted) and any errors.
    drain() {
      return new Promise((resolve) => {
        idle.push(() => resolve({ lines: lines.slice().sort((a, b) => a.t - b.t), errors: errors.slice(), unavailable, skipped }))
        settleIdle()
      })
    },
    get unavailable() { return unavailable },
  }
}

export default { SPEAKERS, bytesToBase64, toLines, withVoice, createTranscriber }
