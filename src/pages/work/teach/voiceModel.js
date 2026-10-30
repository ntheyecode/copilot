// Pure, DOM-free helpers for narration (server-side transcription of the
// trainer's mic, the call's audio, and an imported video's soundtrack) and for
// importing a recording. Composed by liveVoice.js, useDemoRecorder.js and
// useImportRecording.js with the tested logic modules (audioChunker.js,
// transcribePipeline.js, videoScan.js), which they never rewrite.
// Unit-tested in voiceModel.test.mjs. No imports, no I/O.

// The 2-letter language sent with each clip: the workflow's own language when it
// is a usable code ("en", "pt-BR" -> "pt"), else the trainer's interface language.
export function transcribeLanguage(metaLanguage, uiLocale) {
  const two = (s) => { const m = /^([a-z]{2})(?:[-_][A-Za-z0-9]+)*$/i.exec(String(s || '').trim()); return m ? m[1].toLowerCase() : null }
  return two(metaLanguage) || two(uiLocale) || 'en'
}

// One option per language for the narration picker (en and en-GB collapse to en).
// locales: [{ code, name }] (src/i18n/locales.js LOCALES). -> [{ value, name }]
export function narrationLanguages(locales) {
  const seen = new Set(), out = []
  for (const l of (Array.isArray(locales) ? locales : [])) {
    const v = transcribeLanguage(l && l.code, null)
    if (!seen.has(v)) { seen.add(v); out.push({ value: v, name: l.name }) }
  }
  return out
}

// A PCM block arrives just after it was heard: its first sample was captured
// this long before `nowMs` on the capture clock.
export function blockStartMs(nowMs, sampleCount, rate) {
  if (!(rate > 0) || !Number.isFinite(nowMs)) return Number.isFinite(nowMs) ? nowMs : 0
  return nowMs - (Math.max(0, sampleCount | 0) / rate) * 1000
}

// Live captions: the last few lines heard, oldest first.
export const CAPTION_LINES = 3
export function pushCaption(list, line, max = CAPTION_LINES) {
  const text = String((line && line.text) || '').trim()
  if (!text) return Array.isArray(list) ? list : []
  return [...(Array.isArray(list) ? list : []), { speaker: line.speaker === 'presenter' ? 'presenter' : 'trainer', text }].slice(-max)
}
export function speakerKey(speaker) { return speaker === 'presenter' ? 'teach.capture.voice.presenter' : 'teach.capture.voice.trainer' }

// What the trainer reads about the narration after a run, by code, never the
// raw message: [{ key, n? }] (n present -> plural key, read with t.n).
export function voiceWarningLines(drained) {
  const d = drained || {}
  const errors = Array.isArray(d.errors) ? d.errors : []
  const out = []
  if (d.unavailable || errors.some((e) => e && e.code === 'TRANSCRIBE_UNAVAILABLE')) out.push({ key: 'teach.capture.warn.transcribeUnavailable' })
  const failed = errors.filter((e) => e && e.code === 'TRANSCRIBE_FAILED').length
  if (failed) out.push({ key: 'teach.capture.warn.transcribeFailed', n: failed })
  return out
}

// How finely an imported video is stepped: every half second for a normal
// recording, every second past 20 minutes (a long meeting still finishes in a
// reasonable time; three settled ticks still mark a change).
export const LONG_VIDEO_MS = 20 * 60 * 1000
export function scanStepFor(durationMs) { return durationMs > LONG_VIDEO_MS ? 1000 : 500 }

// The soundtrack's utterances as transcription jobs on the video clock.
// mono: Float32Array, plan: planUtterances(mono, rate) -> [{ startMs, endMs, samples, rate }]
export function soundtrackUtterances(mono, rate, plan) {
  // subarray: a view, not a copy, so a long soundtrack is held in memory once.
  return (Array.isArray(plan) ? plan : []).map((u) => ({ startMs: u.startMs, endMs: u.endMs, samples: mono.subarray(u.start, u.end), rate }))
}

// Whether a recording's soundtrack is decoded in the tab. The whole file is read
// into memory and the audio decoded on top of it, so past these bounds the steps
// come from the screens alone (the trainer is told) rather than risking the tab.
export const MAX_SOUNDTRACK_BYTES = 1024 * 1024 * 1024     // 1 GB file
export const MAX_SOUNDTRACK_MS = 3 * 60 * 60 * 1000         // 3 hours
export function soundtrackFits(file, durationMs) {
  const size = file && Number.isFinite(file.size) ? file.size : 0
  return size <= MAX_SOUNDTRACK_BYTES && !(durationMs > MAX_SOUNDTRACK_MS)
}

// The server answers "no AI is set up at all" with 503 { needsKey } (not the
// AI-NO-TRANSCRIBE code it uses when the provider just cannot transcribe). Both
// mean the same to the trainer, and both must stop the pipeline at once instead
// of retrying every clip, so tag the first one with the pipeline's code.
export function asTranscribeError(e) {
  // needsKey is present (true or false) only on the no-AI-runtime answer.
  if (e && !e.code && e.data && (e.data.needsKey || (e.status === 503 && 'needsKey' in e.data))) { e.code = 'AI-NO-TRANSCRIBE' }
  return e
}

// Which videos the picker offers and accepts. Browsers decide what they can
// actually decode; this only filters obvious non-video picks.
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v'
export function looksLikeVideo(file) {
  if (!file) return false
  if (String(file.type || '').startsWith('video/')) return true
  return /\.(mp4|webm|mov|mkv|m4v)$/i.test(String(file.name || ''))
}

export default {
  transcribeLanguage, narrationLanguages, blockStartMs, asTranscribeError, CAPTION_LINES, pushCaption, speakerKey, voiceWarningLines,
  LONG_VIDEO_MS, scanStepFor, soundtrackUtterances, MAX_SOUNDTRACK_BYTES, MAX_SOUNDTRACK_MS, soundtrackFits, VIDEO_ACCEPT, looksLikeVideo,
}
