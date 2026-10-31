// ---------------------------------------------------------------------------
// WorkCoPilot - lean AI layer (standalone). Text generation + vision only.
// ---------------------------------------------------------------------------
// WorkCoPilot plans a goal into steps and READS the screen, so it needs a chat
// model (generate) and a VISION model (analyseImages). Three providers are
// offered: Groq, OpenAI, Google Gemini. Transcription / Deepgram / streaming
// (interview-side) are deliberately dropped here.
//
// A runtime (cfg) is { providerId, apiKey, chatModel, visionModel }. The AI
// never silently swaps a working config: a 401/403 key error always surfaces;
// only a retired-MODEL error self-heals against the live catalog, and that is
// logged (SUPREME RULE III). No em dashes, no AI-language in surfaced text.
// ---------------------------------------------------------------------------

import { reportUsage, usageFromResponse, withKeySource } from './ai_usage.js'
import { dropRetired, isRetired, preferredReplacement, retiredModelMessage } from './ai_model_lifecycle.js'
import { chatParamsFor } from './ai_model_params.js'
import { rateFor, isVisionModel, RANK_META, modelRank, isPremiumModel } from './ai_ratecard.js'

export { isVisionModel, RANK_META, modelRank, isPremiumModel }

export const PROVIDERS = {
  groq: {
    id: 'groq',
    label: 'Groq',
    blurb: 'Fast chat. Add an OpenAI or Gemini key alongside it to read the screen.',
    base: 'https://api.groq.com/openai/v1',
    kind: 'openai',                       // OpenAI-compatible chat
    chatModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'groq/compound-mini'],
    keyHint: 'gsk_...',
    keysUrl: 'https://console.groq.com/keys',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    blurb: 'GPT models. Read screens reliably, including code and small text.',
    base: 'https://api.openai.com/v1',
    kind: 'openai',
    // Cheapest dependable first (lifecycle + prices: ai_model_lifecycle.js, model-prices.js).
    chatModels: ['gpt-6-luna', 'gpt-5.6-luna', 'gpt-5.6-terra'],
    keyHint: 'sk-...',
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    blurb: 'Gemini Flash. Fast, and reads screens well on the free tier.',
    base: 'https://generativelanguage.googleapis.com/v1beta',
    kind: 'gemini',                       // native REST (generateContent)
    // Google's picks for new projects (3.5 Flash-Lite, 3.8 Flash), then 3.6 Flash.
    chatModels: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'],
    keyHint: 'AIza...',
    keysUrl: 'https://aistudio.google.com/app/apikey',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    blurb: 'One key, hundreds of models. Reaches the cheapest screen-reading models (Qwen, DeepSeek) at a fraction of the big providers.',
    base: 'https://openrouter.ai/api/v1',
    kind: 'openai',                       // OpenAI-compatible; reasoning is disabled for our calls (see openaiVision/openaiChat)
    chatModels: ['qwen/qwen3.7-flash', 'qwen/qwen3-vl-30b-a3b-instruct', 'deepseek/deepseek-chat'],
    keyHint: 'sk-or-...',
    keysUrl: 'https://openrouter.ai/keys',
  },
  moonshot: {
    id: 'moonshot',
    label: 'Moonshot AI (Kimi)',
    blurb: 'Kimi models over an OpenAI-compatible API. Strong reasoning and long context. Add an OpenAI or Gemini key alongside it if you need the most reliable screen reading.',
    // International region (default). The China region serves the SAME
    // OpenAI-compatible API on a different host - https://api.moonshot.cn/v1 -
    // which is allowlisted via altHosts below so a superadmin can point a
    // Moonshot runtime at .cn (through a custom-provider entry) without the
    // egress guard blocking it. The built-in default stays on .ai.
    base: 'https://api.moonshot.ai/v1',
    kind: 'openai',                       // OpenAI-compatible chat (reuses openaiChat/openaiVision)
    chatModels: ['kimi-k2-0905-preview', 'kimi-latest', 'moonshot-v1-128k', 'moonshot-v1-8k'],
    keyHint: 'sk-...',
    keysUrl: 'https://platform.moonshot.ai/console/api-keys',
    altHosts: ['api.moonshot.cn'],        // China-region host, allowlisted alongside .ai
  },
}
// OpenRouter exposes reasoning ("thinking") models; for WorkCoPilot's structured
// JSON tasks we never want chain-of-thought (it 10-30x's the output tokens for no
// benefit), so we switch it off on every OpenRouter call. Detected by the base.
function isOpenRouter(p) { try { return /(^|\.)openrouter\.ai$/i.test(new URL(p.base).hostname) } catch { return false } }

// Egress allowlist (audit DAT-05 / APP-03). AI calls may only reach a known
// provider host. Bases are fixed constants above; this guard makes the boundary
// explicit and FAILS CLOSED, so a misconfigured or future custom base can never
// redirect a request to an internal address or an unapproved destination.
// Derived from PROVIDERS (single source of truth): every provider's base host,
// plus any altHosts a provider declares (e.g. Moonshot's China-region host), so
// adding a provider to PROVIDERS is the ONLY place a built-in host is registered.
const ALLOWED_AI_HOSTS = new Set(Object.values(PROVIDERS).flatMap((p) => {
  const hosts = []
  try { hosts.push(new URL(p.base).hostname) } catch { /* skip a malformed base */ }
  for (const h of (p.altHosts || [])) if (h) hosts.push(String(h).trim().toLowerCase())
  return hosts
}).filter(Boolean))
export function assertAllowedHost(base) {
  let h
  try { h = new URL(base).hostname } catch { throw Object.assign(new Error('AI endpoint is misconfigured.'), { status: 502 }) }
  if (!ALLOWED_AI_HOSTS.has(h)) throw Object.assign(new Error('AI endpoint host is not on the allowlist.'), { status: 502 })
}

// A superadmin may add a CUSTOM OpenAI-compatible provider (base URL + key). To
// keep the egress boundary from becoming an SSRF hole, a custom base must be a
// PUBLIC https FQDN - never http, never an IP literal, never localhost / a
// private / metadata host. validateCustomBase returns the hostname or throws;
// allowAiHost validates then adds it to the live allowlist. The store re-adds
// every saved custom host on boot, so the allowlist survives a restart.
const PRIVATE_HOST_RE = /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i
export function validateCustomBase(base) {
  let u
  try { u = new URL(String(base || '').trim()) } catch { throw httpErr(400, 'Enter a full https URL, for example https://api.example.com/v1') }
  if (u.protocol !== 'https:') throw httpErr(400, 'The base URL must use https.')
  const h = u.hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')) throw httpErr(400, 'Use a domain name, not an IP address.')
  if (!h.includes('.') || PRIVATE_HOST_RE.test(h)) throw httpErr(400, 'That host is not allowed. Use a public provider domain.')
  return h
}
export function allowAiHost(base) {
  const h = validateCustomBase(base)
  ALLOWED_AI_HOSTS.add(h)
  return h
}
// Resolve a runtime's provider definition. Built-ins come from PROVIDERS; a custom
// provider carries its own definition on cfg.provider ({id,label,base,kind,chatModels}),
// supplied by the store when it builds the runtime.
export function providerOf(cfg) { return (cfg && cfg.provider) || PROVIDERS[cfg && cfg.providerId] || null }

// What each provider is actually good at, so the setup UI can say it plainly
// (vision is the gap people hit: most fast text keys cannot see images at all).
export const CAPABILITIES = {
  groq: {
    chat: { supported: true, quality: 'best', note: 'Answers in well under a second.' },
    vision: { supported: false, note: 'The standard Groq text models cannot see images. Screen reading needs an OpenAI or Gemini key, unless your account has llama-4-scout.' },
  },
  openai: {
    chat: { supported: true, quality: 'good', note: 'Strong on reasoning, a little slower than Groq.' },
    vision: { supported: true, quality: 'best', note: 'Current GPT models read screens reliably. The recommended choice for screen reading.' },
  },
  gemini: {
    chat: { supported: true, quality: 'good', note: 'Gemini Flash is fast and capable.' },
    vision: { supported: true, quality: 'good', note: 'Reads screens well, and the free tier includes vision - the cheapest way to enable screen reading.' },
  },
}

// Client-safe provider list for the setup panel. Never returns raw keys.
export function catalog() {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id, label: p.label, blurb: p.blurb, keyHint: p.keyHint,
    keysUrl: p.keysUrl, chatModels: p.chatModels,
    capabilities: CAPABILITIES[p.id] || null,
  }))
}

// Crisp reference codes surfaced to the user (never the raw provider text) and
// stamped on every incident, so support can map "ref AI-NO-MODEL" to a cause in
// one step. Short, stable, human-readable.
export const AI_CODES = {
  PROVIDER: 'AI-NO-PROVIDER',   // provider id not recognised / not configured
  KEY: 'AI-KEY',                // key missing / invalid / unauthorised
  RETIRED: 'AI-MODEL-RETIRED',  // pinned model decommissioned, no current model found
  RATE: 'AI-RATE-LIMIT',        // every candidate model/provider rate-limited or capped
  EXHAUSTED: 'AI-NO-MODEL',     // no working model on this key and no alternate provider left
}

// Mark every AI-layer error as a SYSTEM error (e.ai = true) so the request layer
// shows the user a generic "system busy" message and logs the real cause for the
// superadmin, instead of leaking the provider's raw error (quota, keys, 5xx). A
// crisp `code` (AI_CODES) rides along for the user-facing reference + the incident.
function httpErr(status, message, code = null) {
  const e = new Error(message); e.status = status; e.ai = true; if (code) e.code = code
  return e
}
// Shared with sibling AI modules (ai_transcribe.js) so every AI-layer error has
// the same system-error shape. One definition (SUPREME RULE II).
export const aiError = httpErr

// Model calls occasionally hang or come back EMPTY (Groq does this under load),
// so every call gets an abort timeout, and empty/timeout is retried once.
const CHAT_TIMEOUT_MS = 45000

// ---- OpenAI-compatible (Groq / OpenAI) chat ------------------------------
async function openaiChat(p, apiKey, model, system, turns, _retry = 0) {
  assertAllowedHost(p.base)
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), CHAT_TIMEOUT_MS)
  let res, data
  try {
    const chatPayload = {
      model,
      messages: [
        { role: 'system', content: system },
        ...turns.map((t) => ({ role: t.role, content: t.content })),
      ],
      ...chatParamsFor(p.id, model),
    }
    if (isOpenRouter(p)) chatPayload.reasoning = { enabled: false }
    res = await fetch(`${p.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(chatPayload),
      signal: ac.signal,
    })
    data = await res.json().catch(() => null)
  } catch (e) {
    clearTimeout(timer)
    if (e && e.name === 'AbortError') {
      if (_retry < 1) return openaiChat(p, apiKey, model, system, turns, _retry + 1)
      throw httpErr(504, `${p.label} timed out`)
    }
    throw e
  }
  clearTimeout(timer)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `${p.label} chat failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('openai', data), call: 'chat' })   // billed even if empty
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) {
    if (_retry < 1) return openaiChat(p, apiKey, model, system, turns, _retry + 1)
    throw httpErr(502, `${p.label} returned an empty response`)
  }
  return text
}

// Vision over an OpenAI-compatible chat endpoint (one or more images in one call).
async function openaiVision(p, apiKey, model, prompt, imageDataUrls, mediaRes = null) {
  assertAllowedHost(p.base)
  const imgs = (imageDataUrls || []).filter(Boolean)
  // OpenAI image detail: 'low' is the cheap fixed-token read (good for the watch
  // loop); medium/high -> 'high' for one-off detailed reads.
  const detail = mediaRes === 'low' || mediaRes === 'medium' ? 'low' : (mediaRes === 'high' ? 'high' : null)
  const content = [{ type: 'text', text: prompt }]
  for (const u of imgs) content.push({ type: 'image_url', image_url: detail ? { url: u, detail } : { url: u } })
  const payload = { model, messages: [{ role: 'user', content }], ...chatParamsFor(p.id, model) }
  if (isOpenRouter(p)) payload.reasoning = { enabled: false }   // no chain-of-thought for a screen read
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `${p.label} vision failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('openai', data), call: 'vision' })
  return (data?.choices?.[0]?.message?.content || '').trim()
}

// ---- Google Gemini --------------------------------------------------------
const GEMINI_MEDIA_RES = { low: 'MEDIA_RESOLUTION_LOW', medium: 'MEDIA_RESOLUTION_MEDIUM', high: 'MEDIA_RESOLUTION_HIGH' }
async function geminiGenerate(p, apiKey, model, parts, mediaRes = null) {
  assertAllowedHost(p.base)
  const body = { contents: [{ role: 'user', parts }] }
  if (mediaRes && GEMINI_MEDIA_RES[mediaRes]) body.generationConfig = { mediaResolution: GEMINI_MEDIA_RES[mediaRes] }
  const res = await fetch(`${p.base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('gemini', data), call: 'vision' })
  const text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).filter(Boolean).join('').trim()
  if (!text) throw httpErr(502, 'Gemini returned an empty response')
  return text
}
async function geminiChat(p, apiKey, model, system, turns) {
  assertAllowedHost(p.base)
  const contents = turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }))
  const res = await fetch(`${p.base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] } }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini failed (${res.status})`)
  reportUsage({ provider: p.id, model, usage: usageFromResponse('gemini', data), call: 'chat' })
  const text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).filter(Boolean).join('').trim()
  if (!text) throw httpErr(502, 'Gemini returned an empty response')
  return text
}

// ---- model-error self-heal (never masks a key error) ---------------------
export function looksLikeModelError(e) {
  const status = e?.status
  const msg = (e?.message || '').toLowerCase()
  return (status === 400 || status === 404) && /model/.test(msg) &&
    /(does not exist|not found|decommission|invalid model|unknown model|no longer (?:supported|available)|not available|unavailable|update your code|deprecated|retired)/.test(msg)
}
// Rate limit / quota / overload: at enterprise scale this is the common failure.
// We recover by routing to a model that has headroom, not by giving up.
function isRateLimited(e) {
  const status = e?.status
  const msg = (e?.message || '').toLowerCase()
  return status === 429 || status === 503 || /rate.?limit|quota|resource exhausted|overloaded|too many requests|try again later/.test(msg)
}
// EMPTY / blank model response: openaiChat (after its one in-call retry) and the
// gemini paths throw httpErr(502, '<provider> returned an empty response'). That
// is neither a model-error nor a rate-limit, yet it is just as RETRIABLE - a
// different model or provider will usually answer (gpt-oss-20b is known to return
// empty on hard/long prompts). Treated as a first-class failover trigger so an
// empty primary never leaves the user with nothing (SUPREME III/VI). Matched by
// the crisp 502 + the stable "empty response" phrase these call sites emit, so it
// never catches the other 502s (misconfigured base / off-allowlist host).
function isEmptyResponse(e) {
  return e?.status === 502 && /empty response/i.test(e?.message || '')
}
// Pick a dependable current model from the live catalog. Prefers the provider's
// STABLE "-latest" alias (which never goes stale as models are retired), then a
// current flash/mini, and avoids previews, dated snapshots, and non-chat models.
function pickPreferredModel(models, { avoid = null } = {}) {
  if (!models || !models.length) return null
  const bad = /embedding|tts|speech|audio|image|guard|moderation|rerank|aqa|thinking|exp(?:erimental)?|preview|\d{4}-\d{2}-\d{2}|-\d{3,}$/i
  let pool = models.filter((x) => !bad.test(String(x)) && String(x) !== avoid)
  if (!pool.length) pool = models.filter((x) => String(x) !== avoid)
  if (!pool.length) pool = models
  const by = (re) => pool.find((x) => re.test(String(x)))
  return by(/flash-latest/i) || by(/pro-latest/i) || by(/-latest$/i)
    || by(/gpt-oss-20b/i) || by(/gpt-oss/i)
    || by(/flash-lite/i) || by(/flash/i) || by(/luna/i) || by(/mini|instant|8b|small/i)
    || by(/llama/i) || pool[0]
}

// A model the lifecycle registry says is shut down is never sent to the provider
// (that call can only fail or, worse, be silently re-routed by the provider). It
// raises the same "model retired" error the provider itself would, so the
// self-heal ladder substitutes a current model and records the switch through
// cfg.onSwitch for the superadmin (SUPREME RULE III: a pinned choice that cannot
// be honored is surfaced, never silently swapped).
function assertNotRetired(p, model) {
  if (isRetired(model, { provider: p.id })) throw httpErr(404, retiredModelMessage(model), AI_CODES.RETIRED)
}
// The model to heal to on the same key: the provider's named replacement when
// the key has it, else the dependable pick from the live catalog.
function healModel(model, live) {
  return preferredReplacement(model, live) || pickPreferredModel(live, { avoid: model })
}

function runChat(p, apiKey, model, system, turns) {
  return p.kind === 'gemini'
    ? geminiChat(p, apiKey, model, system, turns)
    : openaiChat(p, apiKey, model, system, turns)
}
// A no-op if the caller passes nothing, so onSwitch is always safe to call.
function switchNotifier(cfg) {
  return typeof cfg.onSwitch === 'function' ? cfg.onSwitch : () => {}
}
const reasonOf = (e) => (isEmptyResponse(e) ? 'empty' : isRateLimited(e) ? 'rate_limit' : 'retired')

// Cross-provider text failover: when the primary key has no current model left,
// walk the ordered alternate runtimes (OTHER providers the admin configured) and
// run the chat on the first one that answers. Each alternate also self-heals its
// own model once. Returns the text, or null when every alternate is exhausted.
// Alternates are supplied ONLY where the data boundary allows it (platform keys);
// a company/user on their own key gets an empty list and never leaves their key.
async function failoverChat(alternates, fromP, fromModel, system, turns, notify) {
  for (const a of (alternates || [])) {
    const ap = providerOf(a)
    if (!ap || !a.apiKey || a.providerId === fromP.id) continue
    let m = a.chatModel || ap.chatModels[0]
    try {
      assertNotRetired(ap, m)
      notify({ scope: 'chat', reason: 'failover', crossProvider: true, fromProvider: fromP.id, fromModel, toProvider: ap.id, toModel: m })
      return await runChat(ap, a.apiKey, m, system, turns)
    } catch (e) {
      if (!looksLikeModelError(e) && !isRateLimited(e) && !isEmptyResponse(e)) continue   // key/5xx on this alt: try the next; empty heals on-key like retired/rate
      const live = await listModels(a).catch(() => [])
      const alt = healModel(m, live)
      if (alt && alt !== m) {
        try {
          notify({ scope: 'chat', reason: reasonOf(e), crossProvider: true, fromProvider: fromP.id, fromModel, toProvider: ap.id, toModel: alt })
          return await runChat(ap, a.apiKey, alt, system, turns)
        } catch { /* next alt */ }
      }
    }
  }
  return null
}

// ---- public API -----------------------------------------------------------
// turns: [{ role: 'user' | 'assistant', content }]. Reliability ladder, in order
// and never masking a key error: (1) pinned model, (2) another CURRENT model on
// the SAME key (retired/quota heal), (3) the next configured PROVIDER's key, and
// only when all are exhausted a crisp coded error. Every switch is reported via
// cfg.onSwitch so the superadmin sees exactly what happened.
// Every AI call carries whose key it runs on, so the usage ledger can tell our
// spend from a customer's own (ai_usage.js withKeySource).
export function chat(cfg, system, turns, tele = null) {
  return withKeySource(cfg && cfg.keySource, () => chatOnKey(cfg, system, turns, tele))
}
async function chatOnKey(cfg, system, turns, tele = null) {
  const p = providerOf(cfg)
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`, AI_CODES.PROVIDER)
  if (!cfg.apiKey) throw httpErr(400, `No API key configured for ${p.label}`, AI_CODES.KEY)
  const notify = switchNotifier(cfg)
  const model = cfg.chatModel || p.chatModels[0]
  // Per-call telemetry (out-param; additive, never changes the string return).
  // `tele` lets a session-bound caller record which model actually served the
  // call and whether a failover/round-robin happened, without the provider layer
  // importing the store. Single writer: store.recordSessionCall consumes this.
  const mark = (usedProvider, usedModel, roundRobin) => {
    if (tele && typeof tele === 'object') { tele.provider = usedProvider; tele.model = usedModel; tele.roundRobin = !!roundRobin }
  }
  try {
    assertNotRetired(p, model)
    const out = await runChat(p, cfg.apiKey, model, system, turns)
    mark(p.id, model, false)
    return out
  } catch (e) {
    if (!looksLikeModelError(e) && !isRateLimited(e) && !isEmptyResponse(e)) throw e   // key/other: surface, never mask (empty flows through the ladder)
    const reason = reasonOf(e)
    // (2) another current model on the same key (the named replacement first)
    const live = await listModels(cfg).catch(() => [])
    const same = healModel(model, live)
    if (same && same !== model) {
      try {
        notify({ scope: 'chat', reason, crossProvider: false, fromProvider: p.id, fromModel: model, toProvider: p.id, toModel: same })
        const out = await runChat(p, cfg.apiKey, same, system, turns)
        mark(p.id, same, true)
        return out
      } catch (e2) { if (!looksLikeModelError(e2) && !isRateLimited(e2) && !isEmptyResponse(e2)) throw e2 /* fall to cross-provider */ }
    }
    // (3) the next configured provider's key
    const viaAlt = await failoverChat(cfg.alternates, p, model, system, turns, notify)
    if (viaAlt != null) { mark(p.id, model, true); return viaAlt }
    // exhausted
    const code = reason === 'rate_limit' ? AI_CODES.RATE : AI_CODES.EXHAUSTED
    notify({ scope: 'chat', reason, fatal: true, code, fromProvider: p.id, fromModel: model, toProvider: null, toModel: null })
    throw httpErr(e.status || 503, e.message, code)
  }
}

// One-shot generation: given a system prompt and one user message, return text.
// `tele` is an optional out-param populated with { provider, model, roundRobin }.
export async function generate(cfg, system, userText, tele = null) {
  return chat(cfg, String(system || ''), [{ role: 'user', content: String(userText || '') }], tele)
}

const GEMINI_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'])
export function geminiImageMime(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'image/jpg') return 'image/jpeg'
  return GEMINI_IMAGE_MIMES.has(t) ? t : 'image/jpeg'
}

// Several images in ONE vision call (WorkCoPilot's screen read). model is the
// vision-capable model resolved by findVisionModel; a missing one is a clear 400.
export function analyseImages(cfg, prompt, imageDataUrls, model, opts = {}, tele = null) {
  return withKeySource(cfg && cfg.keySource, () => analyseImagesOnKey(cfg, prompt, imageDataUrls, model, opts, tele))
}
async function analyseImagesOnKey(cfg, prompt, imageDataUrls, model, opts = {}, tele = null) {
  const p = providerOf(cfg)
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`, AI_CODES.PROVIDER)
  if (!cfg.apiKey || !model) throw httpErr(400, 'No vision-capable key.', AI_CODES.KEY)
  const notify = switchNotifier(cfg)
  const mark = (usedModel, roundRobin) => {
    if (tele && typeof tele === 'object') { tele.provider = p.id; tele.model = usedModel; tele.roundRobin = !!roundRobin; tele.vision = true }
  }
  const imgs = (imageDataUrls || []).filter(Boolean).slice(0, 4)
  if (!imgs.length) return ''
  // mediaRes: 'low'|'medium'|'high' - how many tokens the model spends reading the
  // image. The continuous watch loop runs 100s of times an hour, so it reads at a
  // lower resolution (fewer image tokens, big cost saver) while one-off reads keep
  // the default. Mapped per provider.
  const mediaRes = opts && opts.mediaRes ? String(opts.mediaRes).toLowerCase() : null
  const run = (m) => {
    if (p.kind === 'gemini') {
      const parts = [{ text: prompt }]
      // The data URL's own type when Gemini accepts it (PNG/WebP workflow frames as
      // well as JPEG screen grabs); anything else (GIF/BMP attachments) keeps the
      // long-standing JPEG label rather than a type Gemini rejects.
      for (const u of imgs) {
        const mt = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(String(u))
        parts.push({ inline_data: { mime_type: geminiImageMime(mt && mt[1]), data: String(u).replace(/^data:[^;]+;base64,/, '') } })
      }
      return geminiGenerate(p, cfg.apiKey, m, parts, mediaRes)
    }
    return openaiVision(p, cfg.apiKey, m, prompt, imgs, mediaRes)
  }
  try {
    // NOTE: a single empty/blank read is NOT treated as a failure here. The watch
    // loop reads many frames over a non-instant task, so an occasional unreadable
    // frame (blur, transition, loading) is normal and the next frame recovers -
    // forcing a model failover on one empty read would switch models on noise.
    // Transient-empty tolerance (e.g. <=2 of 5) is a stateful WATCH-LOOP policy
    // (see the mid-journey resilience work); one-off reads escalate an empty result
    // to the strong backup via escalateVision's weak-result check.
    assertNotRetired(p, model)
    const out = await run(model)
    mark(model, false)
    return out
  } catch (e) {
    // Screen reading must stay up too: a retired or rate-limited vision model
    // routes to a current vision model on the SAME key. Cross-provider vision
    // failover is handled one layer up (escalateVision's strong backup), which is
    // why this does not walk cfg.alternates - it keeps frames on the chosen key.
    if (!looksLikeModelError(e) && !isRateLimited(e) && !isEmptyResponse(e)) throw e
    const reason = reasonOf(e)
    const live = await listModels(cfg).catch(() => [])
    const vis = live.filter((x) => isVisionModel(p.id, x))
    const named = preferredReplacement(model, vis)
    const alt = (named && isVisionModel(p.id, named) ? named : null) || pickPreferredModel(vis, { avoid: model }) || vis.find((x) => x !== model) || null
    if (!alt || alt === model) {
      const code = reason === 'rate_limit' ? AI_CODES.RATE : AI_CODES.EXHAUSTED
      notify({ scope: 'vision', reason, fatal: true, code, fromProvider: p.id, fromModel: model, toProvider: null, toModel: null })
      throw httpErr(e.status || 503, e.message, code)
    }
    notify({ scope: 'vision', reason, crossProvider: false, fromProvider: p.id, fromModel: model, toProvider: p.id, toModel: alt })
    try { visionCache.delete(`${cfg.providerId}:${String(cfg.apiKey).slice(-6)}`) } catch { /* ignore */ }
    const out = await run(alt)
    mark(alt, true)
    return out
  }
}

// Not every chat model can see images. If the pinned model is not vision-capable
// we look for one that is on the SAME key rather than failing. Cached, because
// screen reading happens mid-session where latency is felt. Vision-capability is
// decided by isVisionModel (one source: the curated ratecard), NOT a second
// regex here - a separate VISION_HINT list used to drift from the ratecard and
// dropped qwen*-flash screen readers the ratecard already priced as vision.
const visionCache = new Map()
const VISION_TTL_MS = 10 * 60 * 1000
export async function findVisionModel(cfg) {
  const p = providerOf(cfg)
  if (!p || !cfg.apiKey) return null
  // An explicit operator-pinned vision model wins.
  if (cfg.visionModel && isVisionModel(cfg.providerId, cfg.visionModel)) return cfg.visionModel
  const requested = cfg.chatModel || p.chatModels[0]
  if (isVisionModel(cfg.providerId, requested)) return requested
  const cacheKey = `${cfg.providerId}:${String(cfg.apiKey).slice(-6)}`
  const hit = visionCache.get(cacheKey)
  if (hit && Date.now() - hit.at < VISION_TTL_MS) return hit.model
  const live = await listModels(cfg).catch(() => [])
  const model = live.find((m) => isVisionModel(cfg.providerId, m)) || null
  visionCache.set(cacheKey, { model, at: Date.now() })
  return model
}

// Live model discovery - the provider's CURRENT catalog, using the saved key.
// Speech-to-text ids (gpt-transcribe, gpt-4o-mini-transcribe) and realtime
// models are not chat models either: without `transcri` here a heal could pick
// a transcription model for a chat call because its name says "mini".
const NON_CHAT = /whisper|distil-whisper|tts|text-to-speech|speech|transcri|realtime|embed|embedding|dall|image|moderation|guard|playai|rerank|vision-only|orpheus/i
export async function listModels(cfg) {
  const p = providerOf(cfg)
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  if (!cfg.apiKey) throw httpErr(400, `No API key configured for ${p.label}`)
  if (p.kind === 'gemini') {
    const res = await fetch(`${p.base}/models?pageSize=200&key=${encodeURIComponent(cfg.apiKey)}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini model list failed (${res.status})`)
    return dropRetired((data?.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((id) => /gemini/i.test(id) && !NON_CHAT.test(id))
      .sort(), { provider: p.id })
  }
  const res = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${cfg.apiKey}` } })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `${p.label} model list failed (${res.status})`)
  // A provider can keep listing a model after its shutdown date; every picker
  // reads this list, so removing retired ids here covers them all.
  return dropRetired((data?.data || []).map((m) => m.id).filter((id) => id && !NON_CHAT.test(id)).sort(), { provider: p.id })
}

// Lightweight key check for the "Test" button. Resolves the requested model
// against the LIVE catalog first, so Test reports the model that will ACTUALLY
// be used rather than a stale pinned one that would fail.
export async function testKey(cfg) {
  const p = providerOf(cfg)
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  const requested = cfg.chatModel || p.chatModels[0]
  let model = requested
  let requestedModel
  try {
    const live = await listModels({ ...cfg, chatModel: requested })
    if (live.length && !live.includes(requested)) {
      const fallback = healModel(requested, live)
      if (fallback) { model = fallback; requestedModel = requested }
    }
  } catch { /* live discovery failed - let chat() report the real error */ }
  const answer = await chat({ ...cfg, chatModel: model }, 'You are a connectivity check. Reply with exactly: OK', [{ role: 'user', content: 'ping' }])
  return { ok: true, provider: p.label, model, requestedModel, sample: answer.slice(0, 40) }
}

// ---- Daily best/cheapest recommendation -----------------------------------
// The curated rate card (price, quality tier, vision flag) lives in
// ai_ratecard.js; its helpers are re-exported here so callers keep using ai.*.
// Per-provider recommendation from the live catalog, or null when the key cannot
// list models (bad key / provider down - the caller surfaces that separately).
export async function recommendModels(cfg) {
  const p = providerOf(cfg)
  if (!p) return null
  const live = await listModels(cfg).catch(() => null)
  if (!live || !live.length) return null
  const bad = /preview|exp(?:erimental)?|\d{4}-\d{2}-\d{2}|-\d{3,}$/i
  const scored = live.filter((m) => !bad.test(m)).map((m) => ({ model: m, ...rateFor(cfg.providerId, m) }))
  if (!scored.length) return null
  const priced = scored.filter((x) => x.usd != null)
  const byCheap = (a, b) => (a.usd - b.usd) || (b.q - a.q)
  const byBest = (a, b) => (b.q - a.q) || ((a.usd ?? 99) - (b.usd ?? 99))
  const cheapest = (priced.length ? priced : scored).slice().sort(byCheap)[0] || null
  const cheapestVision = (priced.filter((x) => x.vision).length ? priced.filter((x) => x.vision) : scored.filter((x) => x.vision)).slice().sort(byCheap)[0] || null
  const best = scored.slice().sort(byBest)[0] || null
  const strip = (x) => x ? { provider: p.id, model: x.model, usdPerMtok: x.usd, quality: x.q, vision: x.vision, speed: x.speed } : null
  return { provider: p.id, label: p.label, count: scored.length, cheapest: strip(cheapest), cheapestVision: strip(cheapestVision), best: strip(best), models: scored.map(strip) }
}
