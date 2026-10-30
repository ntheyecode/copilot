// ===========================================================================
// WorkCoPilot - speech to text (Teach capture: the trainer's mic, call audio,
// and recorded video). Transcription was dropped with the old interview product;
// it is re-introduced here on the SAME keys, data boundary, and egress allowlist
// as the rest of the AI layer (ai.js), so a company's voice data only ever goes
// to the AI provider that company configured.
//
// Only providers with a real transcription path are used:
//   groq   -> POST /audio/transcriptions (Whisper), segment timestamps
//   openai -> POST /audio/transcriptions (mini transcribe, or Whisper with timestamps)
//   gemini -> generateContent with inline audio and a verbatim prompt
// Anything else (OpenRouter, Moonshot, a custom provider) is unsupported: the
// caller gets a stated, actionable error, never a silent empty transcript.
//
// The model is chosen from the provider's LIVE catalog by preference, never
// hard-coded, so a retired model self-heals (recorded through the runtime's
// onSwitch, SUPREME RULE III). The provider and model ride back only for the
// trace; the product never shows them. Silence is not an error: it is ''.
// ===========================================================================
import { AI_CODES, aiError, assertAllowedHost, providerOf, looksLikeModelError, listModels } from './ai.js'
import { reportUsage, usageFromResponse, withKeySource } from './ai_usage.js'

export const AI_NO_TRANSCRIBE = 'AI-NO-TRANSCRIBE'
export const TRANSCRIBE_PROVIDERS = new Set(['groq', 'openai', 'gemini'])
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024          // one utterance chunk is far smaller; a defensive backstop
export const AUDIO_MIMES = ['audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4']
const TIMEOUT_MS = 60000

// Cheapest dependable first; the live catalog decides what exists on the key.
const PREFS = {
  groq: [/^whisper-large-v3-turbo$/i, /^whisper-large-v3$/i, /whisper/i],
  openai: [/^gpt-4o-mini-transcribe$/i, /^gpt-transcribe$/i, /^whisper-1$/i, /transcribe/i, /whisper/i],
}
const NEVER = /diariz|tts|speech-to-speech|realtime|preview/i
const FALLBACK = { groq: 'whisper-large-v3-turbo', openai: 'gpt-4o-mini-transcribe' }

const idOf = (rt) => { const p = providerOf(rt); return p ? p.id : null }

// A runtime can transcribe when its provider has a transcription path and a key.
export function canTranscribe(rt) {
  return !!(rt && rt.apiKey && TRANSCRIBE_PROVIDERS.has(idOf(rt)))
}

// From a runtime and its (boundary-filtered) failover ladder, pick the first that
// can transcribe. `switched` says the caller must record the substitution.
export function pickTranscribeRuntime(rt) {
  if (!rt) return null
  if (canTranscribe(rt)) return { rt, switched: false }
  const alt = (Array.isArray(rt.alternates) ? rt.alternates : []).find(canTranscribe)
  if (!alt) return null
  return { rt: { ...alt, onSwitch: rt.onSwitch }, switched: true, fromProvider: idOf(rt) }
}

// Pure: choose a transcription model from a provider's model ids.
export function chooseTranscribeModel(providerId, ids, { avoid = null } = {}) {
  const pool = (Array.isArray(ids) ? ids : []).map(String).filter((x) => x && x !== avoid && !NEVER.test(x))
  for (const re of (PREFS[providerId] || [])) { const hit = pool.find((x) => re.test(x)); if (hit) return hit }
  return null
}
// Whisper models return segment timestamps (verbose_json); the newer transcribe
// models only return text.
export const wantsSegments = (model) => /whisper/i.test(String(model || ''))

// Pure: validate the request body { audio (base64 or data URL), mime, language? }.
export function parseAudioPayload(body) {
  const b = body || {}
  let mime = String(b.mime || '').toLowerCase().split(';')[0].trim()
  let b64 = typeof b.audio === 'string' ? b.audio : ''
  const m = /^data:([^;,]+)(?:;[^,]*)?,/i.exec(b64)
  if (m) { if (!mime) mime = m[1].toLowerCase(); b64 = b64.slice(m[0].length) }
  if (!b64) return { ok: false, status: 400, error: 'No audio was sent.' }
  if (!AUDIO_MIMES.includes(mime)) return { ok: false, status: 400, error: 'Send audio as WAV, WebM, Ogg, MP3 or MP4.' }
  const buffer = Buffer.from(b64, 'base64')
  if (!buffer.length) return { ok: false, status: 400, error: 'The audio was empty.' }
  if (buffer.length > MAX_AUDIO_BYTES) return { ok: false, status: 413, error: 'That audio chunk is too large. Send shorter chunks.' }
  const lang = String(b.language || '').toLowerCase()
  return { ok: true, mime: mime === 'audio/x-wav' ? 'audio/wav' : mime, buffer, language: /^[a-z]{2}$/.test(lang) ? lang : null }
}

const extOf = (mime) => ({ 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a' }[mime] || 'wav')

async function timed(fn) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try { return await fn(ac.signal) } finally { clearTimeout(timer) }
}

// OpenAI-compatible multipart transcription (Groq, OpenAI).
async function openaiTranscribe(p, apiKey, model, audio, mime, language, retry = 0) {
  assertAllowedHost(p.base)
  const verbose = wantsSegments(model)
  const form = new FormData()
  form.append('file', new Blob([audio], { type: mime }), `chunk.${extOf(mime)}`)
  form.append('model', model)
  form.append('response_format', verbose ? 'verbose_json' : 'json')
  form.append('temperature', '0')
  if (language) form.append('language', language)
  let res, data
  try {
    res = await timed((signal) => fetch(`${p.base}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal }))
    data = await res.json().catch(() => null)
  } catch (e) {
    if (e && e.name === 'AbortError') {
      if (retry < 1) return openaiTranscribe(p, apiKey, model, audio, mime, language, retry + 1)
      throw aiError(504, `${p.label} transcription timed out`)
    }
    throw e
  }
  if (!res.ok) throw aiError(res.status, (data && data.error && data.error.message) || `${p.label} transcription failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('openai', data), call: 'transcribe' })
  const text = String((data && data.text) || '').trim()
  const segments = verbose && Array.isArray(data && data.segments)
    ? data.segments
      .map((s) => ({ startMs: Math.round(Number(s.start) * 1000), endMs: Math.round(Number(s.end) * 1000), text: String(s.text || '').trim() }))
      .filter((s) => s.text && Number.isFinite(s.startMs))
    : null
  return { text, segments }
}

// Gemini: inline audio + a verbatim prompt. No timestamps; the chunk start is used.
async function geminiTranscribe(p, apiKey, model, audio, mime, language, retry = 0) {
  assertAllowedHost(p.base)
  const prompt = `Transcribe the speech in this audio verbatim${language ? ` (the language is "${language}")` : ''}. ` +
    'Return only the spoken words as plain text, with no labels, notes or timestamps. If there is no speech, return nothing.'
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: audio.toString('base64') } }] }], generationConfig: { temperature: 0 } }
  let res, data
  try {
    res = await timed((signal) => fetch(`${p.base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
    }))
    data = await res.json().catch(() => null)
  } catch (e) {
    if (e && e.name === 'AbortError') {
      if (retry < 1) return geminiTranscribe(p, apiKey, model, audio, mime, language, retry + 1)
      throw aiError(504, 'Gemini transcription timed out')
    }
    throw e
  }
  if (!res.ok) throw aiError(res.status, (data && data.error && data.error.message) || `Gemini transcription failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('gemini', data), call: 'transcribe' })
  const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || []
  return { text: parts.map((x) => x && x.text).filter(Boolean).join('').trim(), segments: null }
}

// Live catalog lookup for Groq/OpenAI. ai.listModels() hides speech models (they
// are not chat models), so this reads the raw list. Cached per key.
const modelCache = new Map()
const MODEL_TTL_MS = 10 * 60 * 1000
async function rawModelIds(p, apiKey) {
  assertAllowedHost(p.base)
  const res = await timed((signal) => fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal }))
  const data = await res.json().catch(() => null)
  if (!res.ok) throw aiError(res.status, (data && data.error && data.error.message) || `${p.label} model list failed (${res.status})`)
  return ((data && data.data) || []).map((m) => m && m.id).filter(Boolean)
}
async function pickModel(rt, { avoid = null, fresh = false } = {}) {
  const p = providerOf(rt)
  const key = `${p.id}:${String(rt.apiKey).slice(-6)}`
  if (p.kind === 'gemini') {
    if (!avoid && (rt.chatModel || rt.visionModel)) return rt.chatModel || rt.visionModel
    const ids = await listModels(rt).catch(() => [])
    return ids.find((x) => x !== avoid && /flash/i.test(x) && !/preview|exp|image|tts|live/i.test(x)) || ids.find((x) => x !== avoid) || null
  }
  const hit = modelCache.get(key)
  if (!fresh && !avoid && hit && Date.now() - hit.at < MODEL_TTL_MS && hit.model) return hit.model
  const ids = await rawModelIds(p, rt.apiKey).catch(() => null)
  const model = ids ? chooseTranscribeModel(p.id, ids, { avoid }) : (avoid ? null : FALLBACK[p.id] || null)
  if (!avoid) modelCache.set(key, { model, at: Date.now() })
  return model
}

// Transcribe one audio chunk. Returns { text, segments|null, provider, model }
// (provider/model are for the trace only). `segments` are relative to the chunk.
export function transcribeAudio(rt, opts = {}) {
  return withKeySource(rt && rt.keySource, () => transcribeOnKey(rt, opts))
}
async function transcribeOnKey(rt, { audio, mime = 'audio/wav', language = null } = {}) {
  const p = providerOf(rt)
  if (!p) throw aiError(400, `Unknown provider: ${rt && rt.providerId}`, AI_CODES.PROVIDER)
  if (!canTranscribe(rt)) throw aiError(400, `${p.label} cannot transcribe speech.`, AI_NO_TRANSCRIBE)
  if (!Buffer.isBuffer(audio) || !audio.length) throw aiError(400, 'No audio to transcribe.')
  const run = (m) => (p.kind === 'gemini' ? geminiTranscribe : openaiTranscribe)(p, rt.apiKey, m, audio, mime, language)
  const model = await pickModel(rt)
  if (!model) throw aiError(503, `No transcription model is available on this ${p.label} key.`, AI_CODES.EXHAUSTED)
  try {
    return { ...(await run(model)), provider: p.id, model }
  } catch (e) {
    if (!looksLikeModelError(e)) throw e
    // The model was retired: pick a current one on the SAME key and record it.
    modelCache.delete(`${p.id}:${String(rt.apiKey).slice(-6)}`)
    const alt = await pickModel(rt, { avoid: model, fresh: true })
    if (!alt) {
      if (typeof rt.onSwitch === 'function') rt.onSwitch({ scope: 'transcribe', reason: 'retired', fatal: true, code: AI_CODES.RETIRED, fromProvider: p.id, fromModel: model, toProvider: null, toModel: null })
      throw aiError(e.status || 503, e.message, AI_CODES.RETIRED)
    }
    if (typeof rt.onSwitch === 'function') rt.onSwitch({ scope: 'transcribe', reason: 'retired', crossProvider: false, fromProvider: p.id, fromModel: model, toProvider: p.id, toModel: alt })
    return { ...(await run(alt)), provider: p.id, model: alt }
  }
}

export default {
  AI_NO_TRANSCRIBE, TRANSCRIBE_PROVIDERS, MAX_AUDIO_BYTES, AUDIO_MIMES,
  canTranscribe, pickTranscribeRuntime, chooseTranscribeModel, wantsSegments, parseAudioPayload, transcribeAudio,
}
