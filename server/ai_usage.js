// ===========================================================================
// AI usage at ACTUALS: the token (or audio-second) counts each AI provider
// reports on its own response, captured where the response is read, and priced
// from the list-price table.
//
// Before this, cost was only ESTIMATED from text length (4 chars per token) and a
// flat 1,200 tokens per image, and some calls (step reading, transcription,
// image generation) were never metered at all. Billing a Managed customer "at
// actuals" needs what the provider actually charged for.
//
// Mechanism (one place, no call-site churn): a USAGE SCOPE per request, held in
// Node's AsyncLocalStorage. The provider call sites (ai.js, ai_transcribe.js,
// work-images.js) call reportUsage() with the response's own usage block; the
// cost meter drains the scope after each metered call; whatever no meter drained
// (unmetered calls) is flushed to the company ledger when the request ends. A
// call with no usage block is recorded as ESTIMATED, never silently as zero.
// ===========================================================================
import { AsyncLocalStorage } from 'node:async_hooks'
import { MODEL_PRICES } from './model-prices.js'
import { AUDIO_PRICES_PER_MIN, AUDIO_MIN_SECONDS, CALL_TOKEN_PRICES, priceAt, audioPerMinute } from './ai_call_prices.js'

const als = new AsyncLocalStorage()
// Whose key the call in progress runs on ('platform' | 'company' | 'user'), set by
// the AI entry points from the runtime's keySource (store.js tags every runtime).
const keyAls = new AsyncLocalStorage()
export function withKeySource(keySource, fn) { return keyAls.run(keySource || 'unknown', fn) }

// ---- Normalize a provider response's own usage block -----------------------
// OpenAI-compatible (OpenAI, Groq, OpenRouter, Moonshot): usage.prompt_tokens /
// completion_tokens (+ prompt_tokens_details.cached_tokens), or for
// transcription usage.input_tokens / output_tokens or { type:'duration', seconds }.
// Gemini: usageMetadata.promptTokenCount / candidatesTokenCount (+ thoughts,
// cachedContentTokenCount). Returns null when the response carries none.
export function usageFromResponse(kind, data) {
  if (!data || typeof data !== 'object') return null
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0)
  if (kind === 'gemini') {
    const u = data.usageMetadata
    if (!u || typeof u !== 'object') return null
    return {
      inTokens: n(u.promptTokenCount),
      // Thinking tokens are billed as output.
      outTokens: n(u.candidatesTokenCount) + n(u.thoughtsTokenCount),
      cachedTokens: n(u.cachedContentTokenCount),
    }
  }
  const u = data.usage
  if (u && typeof u === 'object') {
    if (u.type === 'duration' && Number.isFinite(Number(u.seconds))) return { audioSeconds: Number(u.seconds) }
    const inT = u.prompt_tokens != null ? u.prompt_tokens : u.input_tokens
    const outT = u.completion_tokens != null ? u.completion_tokens : u.output_tokens
    if (inT == null && outT == null) return null
    return {
      inTokens: n(inT),
      outTokens: n(outT),
      cachedTokens: n((u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || (u.input_token_details && u.input_token_details.cached_tokens)),
    }
  }
  // Whisper verbose_json reports the audio length it processed.
  if (Number.isFinite(Number(data.duration))) return { audioSeconds: Number(data.duration) }
  return null
}

// ---- Transcription and image list prices ------------------------------------
// One table, with the official source and the date checked on every entry:
// server/ai_call_prices.js. Unknown models are "unpriced" (counted, never
// silently $0 and never priced at the text rate).
export { AUDIO_PRICES_PER_MIN, CALL_TOKEN_PRICES }

const priceOf = (model) => {
  const key = String(model || '')
  return MODEL_PRICES[key] || MODEL_PRICES[key.split('/').pop()] || null
}

// One usage entry -> { usd, priced }. Cached input tokens are priced at the
// normal input rate (the table has no cached rates yet), so the figure is never
// lower than what was charged: a conservative ceiling, stated, not hidden.
export function costOfEntry(e) {
  if (!e) return { usd: 0, priced: false }
  if (e.audioSeconds != null) {
    const per = audioPerMinute(e.model)
    if (per == null) return { usd: 0, priced: false }
    const secs = Math.max(Number(e.audioSeconds) || 0, AUDIO_MIN_SECONDS[e.provider] || 0)
    return { usd: (secs / 60) * per, priced: true }
  }
  const special = CALL_TOKEN_PRICES[e.call]
  const p = special ? priceAt(special[String(e.model || '').split('/').pop()] || null, e.at) : priceOf(e.model)
  if (!p) return { usd: 0, priced: false }
  return { usd: ((e.inTokens || 0) / 1e6) * (p.input || 0) + ((e.outTokens || 0) / 1e6) * (p.output || 0), priced: true }
}

// ---- The per-request scope --------------------------------------------------
// meta: { companyId, userId } (who the AI spend belongs to).
export function createUsageScope(meta = {}) {
  return { meta: { companyId: meta.companyId || null, userId: meta.userId || null }, entries: [], flushed: false }
}
export function runInUsageScope(scope, fn) { return als.run(scope, fn) }
export function currentUsageScope() { return als.getStore() || null }

// Provider call sites: report what the response said. `usage` null means the
// provider sent no usage block, kept as an explicit "estimated" marker.
export function reportUsage({ provider, model, usage, call = null }) {
  const s = als.getStore()
  if (!s) return null
  const e = { provider: String(provider || ''), model: String(model || ''), call, keySource: keyAls.getStore() || 'unknown', at: Date.now(), actual: !!usage, ...(usage || {}) }
  // A call that finishes after its request was answered (and the scope flushed)
  // goes straight to the ledger instead of being lost.
  if (s.flushed && typeof s.onLate === 'function') { try { s.onLate([e]) } catch { /* never break a call over metering */ } return e }
  s.entries.push(e)
  return e
}

// The cost meter takes the entries reported since the last drain (the call it is
// metering). Returns [] outside a scope.
export function drainUsage() {
  const s = als.getStore()
  if (!s || !s.entries.length) return []
  return s.entries.splice(0, s.entries.length)
}

// Sum entries: { calls, actualCalls, estimatedCalls, unpricedCalls, inTokens,
// outTokens, cachedTokens, audioSeconds, usd, byModel }.
export function summarizeUsage(entries) {
  const out = { calls: 0, actualCalls: 0, estimatedCalls: 0, unpricedCalls: 0, inTokens: 0, outTokens: 0, cachedTokens: 0, audioSeconds: 0, usd: 0, byModel: {}, byKeySource: {} }
  for (const e of entries || []) {
    out.calls++
    if (e.actual) out.actualCalls++; else out.estimatedCalls++
    const c = e.actual ? costOfEntry(e) : { usd: 0, priced: true }
    if (e.actual && !c.priced) out.unpricedCalls++
    out.inTokens += e.inTokens || 0
    out.outTokens += e.outTokens || 0
    out.cachedTokens += e.cachedTokens || 0
    out.audioSeconds += e.audioSeconds || 0
    out.usd += c.usd
    const k = `${e.provider}:${e.model}`
    const m = out.byModel[k] || (out.byModel[k] = { provider: e.provider, model: e.model, calls: 0, inTokens: 0, outTokens: 0, audioSeconds: 0, usd: 0 })
    m.calls++; m.inTokens += e.inTokens || 0; m.outTokens += e.outTokens || 0; m.audioSeconds += e.audioSeconds || 0; m.usd += c.usd
    const ks = e.keySource || 'unknown'
    const b = out.byKeySource[ks] || (out.byKeySource[ks] = { calls: 0, usd: 0 })
    b.calls++; b.usd += c.usd
  }
  return out
}

// One metered call: the cost of what the provider reported, plus the text-length
// estimate ONLY when some call reported no usage (or nothing was reported at all,
// for example outside a request scope). estimate() is called lazily.
//   -> { usd, estimatedUsd }
export function costForCall(entries, estimate) {
  const list = Array.isArray(entries) ? entries : []
  const missing = list.filter((e) => !e.actual)
  // Only the share of the operation that reported nothing is estimated: one
  // usage-less retry inside an otherwise measured call is not billed twice.
  const share = !list.length ? 1 : missing.length / list.length
  const estimatedUsd = share > 0 && typeof estimate === 'function' ? Math.max(0, Number(estimate()) || 0) * share : 0
  const estimateKeySource = (missing[0] && missing[0].keySource) || 'unknown'
  return { usd: summarizeUsage(list.filter((e) => e.actual)).usd + estimatedUsd, estimatedUsd, estimateKeySource }
}


// A sink the server registers once (store.recordAiUsage), for work that runs
// outside any request: background jobs and fire-and-forget calls.
let sink = null
export function setUsageSink(fn) { sink = typeof fn === 'function' ? fn : null }
// Run fn in a scope that books every reported call straight to the sink under
// meta { companyId, userId, kind }.
export function runInBackgroundUsage(meta, fn) {
  const scope = createUsageScope(meta)
  scope.flushed = true
  scope.onLate = (entries) => { if (sink) sink({ ...scope.meta, kind: (meta && meta.kind) || 'background', entries }) }
  return als.run(scope, fn)
}

// Express middleware: one scope per request. book(req, entries) receives what no
// meter drained, once, when the response finishes OR the client disconnects, and
// any call landing after that, as it lands.
export function usageScopeMiddleware(book) {
  return (req, res, next) => {
    const scope = createUsageScope()
    const flush = (entries) => { if (entries.length) { try { book(req, entries) } catch { /* never break a response over metering */ } } }
    scope.req = req
    scope.onLate = flush
    const end = () => { if (scope.flushed) return; scope.flushed = true; flush(scope.entries.splice(0, scope.entries.length)) }
    res.on('finish', end)
    res.on('close', end)
    als.run(scope, next)
  }
}

export default {
  withKeySource, setUsageSink, runInBackgroundUsage, usageScopeMiddleware, CALL_TOKEN_PRICES,
  costForCall, usageFromResponse, AUDIO_PRICES_PER_MIN, costOfEntry, createUsageScope, runInUsageScope,
  currentUsageScope, reportUsage, drainUsage, summarizeUsage,
}
