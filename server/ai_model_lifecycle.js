// ===========================================================================
// AI model lifecycle registry: the ONE place that knows when a provider model
// shuts down and what replaces it (SUPREME RULE II).
//
// Every place that picks a model consults this module: the chat and vision
// ladders (ai_vision_ladder.js, ai.js), transcription (ai_transcribe.js) and
// image generation (work-images.js). The provider's live catalog stays the
// authority for what a key can use; this registry only removes models that are
// past their shutdown date and points at the provider's named replacement.
//
// Each entry: { provider, model | pattern, shutdown, replacement, src } plus
// optional flags:
//   alias:     a moving alias (gemini-flash-latest) or an id the provider now
//              routes to another model (routedTo); never "retired" by date.
//   legacy:    still served but closed to new projects (Gemini 2.5); ladders do
//              not lead with it.
//   reasoning: request facts for the chat call ({ effortNone: true } when the
//              model accepts reasoning_effort 'none'), read by ai_model_params.js.
//
// Dates are YYYY-MM-DD, compared as UTC calendar days. A model is retired ON
// its shutdown day. Google lists the earliest possible date, so a Gemini model
// may in practice live a little longer; we stop choosing it on that date anyway.
//
// To add a model: add the entry here first (with its source), then reference it.
// server/ai_model_lifecycle.test.mjs fails when code names a model that is past
// its shutdown, or names a provider model this registry does not know.
// ===========================================================================

export const LIFECYCLE_SOURCES = Object.freeze({
  openaiDeprecations: Object.freeze({ url: 'https://developers.openai.com/api/docs/deprecations', checked: '2026-10-31' }),
  openaiModels: Object.freeze({ url: 'https://developers.openai.com/api/docs/models', checked: '2026-10-31' }),
  geminiDeprecations: Object.freeze({ url: 'https://ai.google.dev/gemini-api/docs/deprecations', checked: '2026-10-31' }),
  geminiModels: Object.freeze({ url: 'https://ai.google.dev/gemini-api/docs/models', checked: '2026-10-31' }),
  groqDeprecations: Object.freeze({ url: 'https://console.groq.com/docs/deprecations', checked: '2026-10-30' }),
})
const S = LIFECYCLE_SOURCES

// Which ids belong to a provider whose lifecycle we track. A quoted model id in
// server code that matches one of these and is NOT in the registry fails the
// gate, so a new model cannot be named without its lifecycle being recorded.
export const PROVIDER_ID_PATTERNS = Object.freeze({
  openai: /^(gpt-|o\d(?:-|$)|whisper-1$|dall-e-|chatgpt-|text-embedding-)/,
  gemini: /^(gemini-|imagen-)/,
  groq: /^(whisper-large|distil-whisper)/,
})

const E = (provider, model, shutdown, replacement, src, extra = {}) => Object.freeze({ provider, model, shutdown, replacement, src, ...extra })
const P = (provider, pattern, shutdown, replacement, src, extra = {}) => Object.freeze({ provider, pattern, shutdown, replacement, src, ...extra })
const NONE = Object.freeze({ effortNone: true })

export const MODEL_LIFECYCLE = Object.freeze([
  // ---- OpenAI: current chat / vision (text + image input, reasoning effort none..max)
  E('openai', 'gpt-6-luna', null, null, S.openaiModels, { reasoning: NONE }),
  E('openai', 'gpt-5.6-luna', null, null, S.openaiModels, { reasoning: NONE }),
  E('openai', 'gpt-5.6-terra', null, null, S.openaiModels, { reasoning: NONE }),
  E('openai', 'gpt-5.6-sol', null, null, S.openaiModels, { reasoning: NONE }),
  E('openai', 'gpt-5.6', null, null, S.openaiModels, { alias: true, routedTo: 'gpt-5.6-sol', reasoning: NONE }),
  // ---- OpenAI: chat models with an announced shutdown
  E('openai', 'gpt-4o', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4o-2024-08-06', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4o-2024-11-20', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4o-2024-05-13', '2026-10-23', 'gpt-5.6-sol', S.openaiDeprecations),
  E('openai', 'gpt-4o-mini', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4o-mini-2024-07-18', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4.1', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4.1-2025-04-14', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4.1-mini', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  E('openai', 'gpt-4.1-mini-2025-04-14', '2027-01-14', 'gpt-6-luna', S.openaiDeprecations),
  P('openai', /^gpt-4\.1-nano(?:-\d{4}-\d{2}-\d{2})?$/, '2026-10-23', 'gpt-5.6-luna', S.openaiDeprecations, { model: 'gpt-4.1-nano' }),
  P('openai', /^o4-mini(?:-\d{4}-\d{2}-\d{2})?$/, '2026-10-23', 'gpt-5.6-terra', S.openaiDeprecations, { model: 'o4-mini' }),
  P('openai', /^gpt-4-turbo(?:-preview|-\d{4}-\d{2}-\d{2})?$/, '2026-10-23', 'gpt-5.6-sol', S.openaiDeprecations, { model: 'gpt-4-turbo' }),
  P('openai', /^o3-mini(?:-\d{4}-\d{2}-\d{2})?$/, '2026-10-23', 'gpt-5.6-sol', S.openaiDeprecations, { model: 'o3-mini' }),
  P('openai', /^o1(?:-\d{4}-\d{2}-\d{2})?$/, '2026-10-23', 'gpt-5.6-sol', S.openaiDeprecations, { model: 'o1' }),
  P('openai', /^o3(?:-\d{4}-\d{2}-\d{2})?$/, '2026-12-11', 'gpt-5.6-sol', S.openaiDeprecations, { model: 'o3' }),
  P('openai', /^gpt-3\.5-turbo(?:-\d+)?$/, '2026-10-23', 'gpt-5.6-terra', S.openaiDeprecations, { model: 'gpt-3.5-turbo' }),
  // ---- OpenAI: image generation
  E('openai', 'gpt-image-2.5-sunburst', null, null, S.openaiModels),
  E('openai', 'gpt-image-2.5-flare', null, null, S.openaiModels),
  E('openai', 'gpt-image-2', null, null, S.openaiDeprecations, { note: 'named only as a replacement on the deprecations page; no shutdown announced' }),
  E('openai', 'gpt-image-1', '2026-10-23', 'gpt-image-2.5-sunburst', S.openaiDeprecations),
  E('openai', 'gpt-image-1-mini', '2026-12-01', 'gpt-image-2.5-sunburst', S.openaiDeprecations),
  E('openai', 'gpt-image-1.5', '2026-12-01', 'gpt-image-2.5-sunburst', S.openaiDeprecations),
  E('openai', 'dall-e-2', '2026-05-12', 'gpt-image-2', S.openaiDeprecations),
  E('openai', 'dall-e-3', '2026-05-12', 'gpt-image-2', S.openaiDeprecations),
  // ---- OpenAI: transcription
  E('openai', 'gpt-transcribe', null, null, S.openaiModels),
  E('openai', 'whisper-1', '2027-02-26', 'gpt-transcribe', S.openaiDeprecations),
  E('openai', 'gpt-4o-transcribe', '2027-02-26', 'gpt-transcribe', S.openaiDeprecations),
  E('openai', 'gpt-4o-mini-transcribe', '2027-02-26', 'gpt-transcribe', S.openaiDeprecations),
  E('openai', 'gpt-4o-transcribe-diarize', '2027-02-26', 'gpt-transcribe', S.openaiDeprecations),
  E('openai', 'gpt-4o-mini-transcribe-2025-03-20', '2027-01-20', 'gpt-transcribe', S.openaiDeprecations),
  // ---- OpenAI: embeddings (no shutdown announced)
  E('openai', 'text-embedding-3-small', null, null, S.openaiDeprecations),
  E('openai', 'text-embedding-3-large', null, null, S.openaiDeprecations),

  // ---- Google Gemini: current text / vision. New projects: 3.8 Flash or 3.5 Flash-Lite.
  E('gemini', 'gemini-3.8-flash', null, null, S.geminiModels),
  E('gemini', 'gemini-3.6-flash', null, null, S.geminiModels),
  E('gemini', 'gemini-3.5-flash-lite', null, null, S.geminiModels),
  E('gemini', 'gemini-3.7-flash', null, null, S.geminiDeprecations, { alias: true, routedTo: 'gemini-3.8-flash' }),
  E('gemini', 'gemini-3.5-flash', null, null, S.geminiDeprecations, { alias: true, routedTo: 'gemini-3.6-flash' }),
  E('gemini', 'gemini-3.1-flash-lite', '2027-05-07', 'gemini-3.5-flash-lite', S.geminiDeprecations),
  E('gemini', 'gemini-3.1-pro-preview', null, null, S.geminiDeprecations),
  E('gemini', 'gemini-3-flash-preview', null, 'gemini-3.6-flash', S.geminiDeprecations),
  E('gemini', 'gemini-3-pro-preview', '2026-03-09', 'gemini-3.1-pro-preview', S.geminiDeprecations),
  E('gemini', 'gemini-3.1-flash-lite-preview', '2026-05-25', 'gemini-3.1-flash-lite', S.geminiDeprecations),
  E('gemini', 'gemini-3.5-transcribe', null, null, S.geminiDeprecations),
  // Hot-swapped aliases: Google gives 2 weeks' notice before a breaking change.
  E('gemini', 'gemini-flash-latest', null, null, S.geminiModels, { alias: true }),
  E('gemini', 'gemini-flash-lite-latest', null, null, S.geminiModels, { alias: true }),
  E('gemini', 'gemini-pro-latest', null, null, S.geminiModels, { alias: true }),
  // Gemini 2.5: no shutdown, but closed to new users; ladders never lead with it.
  E('gemini', 'gemini-2.5-pro', null, 'gemini-3.1-pro-preview', S.geminiDeprecations, { legacy: true }),
  E('gemini', 'gemini-2.5-flash', null, 'gemini-3.8-flash', S.geminiDeprecations, { legacy: true }),
  E('gemini', 'gemini-2.5-flash-lite', null, 'gemini-3.5-flash-lite', S.geminiDeprecations, { legacy: true }),
  // Gemini 2.0 and older: shut down.
  P('gemini', /^gemini-2\.0-flash(?:-001)?$/, '2026-06-01', 'gemini-3.6-flash', S.geminiDeprecations, { model: 'gemini-2.0-flash' }),
  P('gemini', /^gemini-2\.0-flash-lite(?:-001)?$/, '2026-06-01', 'gemini-3.1-flash-lite', S.geminiDeprecations, { model: 'gemini-2.0-flash-lite' }),
  P('gemini', /^gemini-2\.0-flash-lite-preview(?:-02-05)?$/, '2025-12-09', 'gemini-3.1-flash-lite', S.geminiDeprecations, { model: 'gemini-2.0-flash-lite-preview' }),
  // The 1.5 family left the table after it shut down (before the 2.0 family);
  // the last date Google published for it was 2025-09-24.
  P('gemini', /^gemini-1\.5-/, '2025-09-24', 'gemini-3.6-flash', S.geminiDeprecations, { model: 'gemini-1.5-*' }),
  // ---- Google Gemini: image generation (Nano Banana)
  E('gemini', 'gemini-nano-banana-2.1', null, null, S.geminiDeprecations),
  E('gemini', 'gemini-3.1-flash-lite-image', null, null, S.geminiDeprecations),
  E('gemini', 'gemini-3.1-flash-image', null, null, S.geminiDeprecations),
  E('gemini', 'gemini-3-pro-image', null, null, S.geminiDeprecations),
  E('gemini', 'gemini-2.5-flash-image', '2027-03-15', 'gemini-3.1-flash-lite-image', S.geminiDeprecations),
  E('gemini', 'gemini-3.1-flash-image-preview', '2026-06-25', 'gemini-nano-banana-2.1', S.geminiDeprecations),
  E('gemini', 'gemini-3-pro-image-preview', '2026-06-25', 'gemini-3-pro-image', S.geminiDeprecations),
  E('gemini', 'gemini-2.5-flash-image-preview', '2026-01-15', 'gemini-nano-banana-2.1', S.geminiDeprecations),
  E('gemini', 'gemini-2.0-flash-preview-image-generation', '2025-11-14', 'gemini-nano-banana-2.1', S.geminiDeprecations),

  // ---- Groq speech-to-text
  E('groq', 'whisper-large-v3-turbo', null, null, S.groqDeprecations),
  E('groq', 'whisper-large-v3', null, null, S.groqDeprecations),
  E('groq', 'distil-whisper-large-v3-en', '2025-08-23', 'whisper-large-v3-turbo', S.groqDeprecations),
])

// Exact ids first (fast, and an exact entry beats a family pattern).
const BY_ID = new Map(MODEL_LIFECYCLE.filter((e) => typeof e.model === 'string' && !e.pattern).map((e) => [e.model, e]))
const PATTERNS = MODEL_LIFECYCLE.filter((e) => e.pattern)

// Calendar day (UTC) for a ms timestamp, Date, or 'YYYY-MM-DD'.
export function dayOf(at = Date.now()) {
  if (typeof at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(at)) return at
  const ms = at instanceof Date ? at.getTime() : Number(at)
  return new Date(Number.isFinite(ms) ? ms : Date.now()).toISOString().slice(0, 10)
}

// Bare model id: Gemini's models/<id> form loses its prefix. A provider-slugged
// id (openai/<id>) is a router's (OpenRouter's) model with its own lifecycle,
// so it is not governed here (returns null).
function bareId(model) {
  const s = String(model || '').trim().replace(/^models\//, '')
  if (!s || s.includes('/')) return null
  return s
}

// The registry entry for a model id, or null when the registry does not know it.
export function lifecycleEntry(model, { provider = null } = {}) {
  const id = bareId(model)
  if (!id) return null
  const hit = BY_ID.get(id) || PATTERNS.find((e) => e.pattern.test(id)) || null
  if (hit && provider && hit.provider !== provider) return null
  return hit
}

// True when the id matches a provider family this registry tracks.
export function isTrackedProviderId(model) {
  const id = bareId(model)
  return !!id && Object.values(PROVIDER_ID_PATTERNS).some((re) => re.test(id))
}

// Retired = the registry names a shutdown date on or before `at`.
export function isRetired(model, { provider = null, at = Date.now() } = {}) {
  const e = lifecycleEntry(model, { provider })
  return !!(e && e.shutdown && e.shutdown <= dayOf(at))
}

// Days until shutdown (0 on the day, negative after), or null when none is announced.
export function daysToShutdown(model, { at = Date.now() } = {}) {
  const e = lifecycleEntry(model)
  if (!e || !e.shutdown) return null
  return Math.round((Date.parse(`${e.shutdown}T00:00:00Z`) - Date.parse(`${dayOf(at)}T00:00:00Z`)) / 86400000)
}

// The provider's named replacement, followed until a model that is not retired
// on `at` (gpt-4.1-nano -> gpt-5.6-luna). Null when there is none.
export function replacementFor(model, { at = Date.now() } = {}) {
  let cur = lifecycleEntry(model)
  const seen = new Set()
  for (let hops = 0; cur && hops < 6; hops++) {
    const next = cur.replacement || cur.routedTo || null
    if (!next || seen.has(next)) return null
    seen.add(next)
    if (!isRetired(next, { at })) return next
    cur = lifecycleEntry(next)
  }
  return null
}

// One status line per model for a superadmin view or a log.
//   status: 'current' | 'retiring' | 'retired' | 'alias' | 'legacy' | 'unknown'
export function lifecycleStatus(model, { at = Date.now() } = {}) {
  const e = lifecycleEntry(model)
  if (!e) return { model: String(model || ''), status: 'unknown', shutdown: null, replacement: null, src: null }
  const retired = isRetired(model, { at })
  const status = retired ? 'retired' : e.shutdown ? 'retiring' : e.alias ? 'alias' : e.legacy ? 'legacy' : 'current'
  return { model: String(model), status, shutdown: e.shutdown || null, replacement: e.replacement || e.routedTo || null, src: e.src ? e.src.url : null }
}

// Drop every retired id from a live catalog (order kept). Ids the registry does
// not know pass through: the live catalog stays the authority for what exists.
export function dropRetired(ids, { provider = null, at = Date.now() } = {}) {
  return (Array.isArray(ids) ? ids : []).filter((id) => !isRetired(id, { provider, at }))
}

// The first id in a fixed preference list that is not retired on `at`.
export function firstCurrent(list, { at = Date.now() } = {}) {
  return (Array.isArray(list) ? list : []).find((m) => m && !isRetired(m, { at })) || null
}

// When `model` is being replaced, the provider's named replacement if the key's
// live catalog has it (or when no catalog is known), else null.
export function preferredReplacement(model, liveIds = null, { at = Date.now() } = {}) {
  const r = replacementFor(model, { at })
  if (!r) return null
  if (Array.isArray(liveIds) && liveIds.length && !liveIds.includes(r)) return null
  return r
}

// A first pick from a regex preference ladder over a live catalog, skipping
// retired models. `avoid` is a model to pass over (the one that just failed).
export function pickFromLadder(ladder, ids, { avoid = null, at = Date.now() } = {}) {
  const pool = dropRetired(ids, { at }).filter((x) => x !== avoid)
  for (const re of (ladder || [])) {
    const m = pool.find((x) => re.test(String(x)))
    if (m) return m
  }
  return null
}

// The error the AI layer raises for a pinned model the registry says is shut
// down, shaped like the provider's own "model retired" error so the existing
// self-heal ladder (and its onSwitch record) handles it without a wasted call.
export function retiredModelMessage(model, { at = Date.now() } = {}) {
  const e = lifecycleEntry(model)
  return `The model ${model} was retired on ${(e && e.shutdown) || dayOf(at)}`
}

export default {
  LIFECYCLE_SOURCES, PROVIDER_ID_PATTERNS, MODEL_LIFECYCLE, dayOf, lifecycleEntry, isTrackedProviderId, isRetired,
  daysToShutdown, replacementFor, lifecycleStatus, dropRetired, firstCurrent, preferredReplacement, pickFromLadder,
  retiredModelMessage,
}
