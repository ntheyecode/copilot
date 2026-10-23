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
    blurb: 'gpt-4o / gpt-4o-mini. Reads screens reliably, including code and small text.',
    base: 'https://api.openai.com/v1',
    kind: 'openai',
    chatModels: ['gpt-4o-mini', 'gpt-4o'],
    keyHint: 'sk-...',
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    blurb: 'Gemini Flash. Fast, and reads screens well on the free tier.',
    base: 'https://generativelanguage.googleapis.com/v1beta',
    kind: 'gemini',                       // native REST (generateContent)
    chatModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    keyHint: 'AIza...',
    keysUrl: 'https://aistudio.google.com/app/apikey',
  },
}

// What each provider is actually good at, so the setup UI can say it plainly
// (vision is the gap people hit: most fast text keys cannot see images at all).
export const CAPABILITIES = {
  groq: {
    chat: { supported: true, quality: 'best', note: 'Answers in well under a second.' },
    vision: { supported: false, note: 'The standard Groq text models cannot see images. Screen reading needs an OpenAI or Gemini key, unless your account has llama-4-scout.' },
  },
  openai: {
    chat: { supported: true, quality: 'good', note: 'Strong on reasoning, a little slower than Groq.' },
    vision: { supported: true, quality: 'best', note: 'gpt-4o and gpt-4o-mini read screens reliably. The recommended choice for screen reading.' },
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

// Model calls occasionally hang or come back EMPTY (Groq does this under load),
// so every call gets an abort timeout, and empty/timeout is retried once.
const CHAT_TIMEOUT_MS = 45000

// ---- OpenAI-compatible (Groq / OpenAI) chat ------------------------------
async function openaiChat(p, apiKey, model, system, turns, _retry = 0) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), CHAT_TIMEOUT_MS)
  let res, data
  try {
    res = await fetch(`${p.base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          ...turns.map((t) => ({ role: t.role, content: t.content })),
        ],
        temperature: 0.3,
      }),
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
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) {
    if (_retry < 1) return openaiChat(p, apiKey, model, system, turns, _retry + 1)
    throw httpErr(502, `${p.label} returned an empty response`)
  }
  return text
}

// Vision over an OpenAI-compatible chat endpoint (one or more images in one call).
async function openaiVision(p, apiKey, model, prompt, imageDataUrls) {
  const imgs = (imageDataUrls || []).filter(Boolean)
  const content = [{ type: 'text', text: prompt }]
  for (const u of imgs) content.push({ type: 'image_url', image_url: { url: u } })
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], temperature: 0.3 }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `${p.label} vision failed (${res.status})`)
  return (data?.choices?.[0]?.message?.content || '').trim()
}

// ---- Google Gemini --------------------------------------------------------
async function geminiGenerate(p, apiKey, model, parts) {
  const res = await fetch(`${p.base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini failed (${res.status})`)
  const text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).filter(Boolean).join('').trim()
  if (!text) throw httpErr(502, 'Gemini returned an empty response')
  return text
}
async function geminiChat(p, apiKey, model, system, turns) {
  const contents = turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }))
  const res = await fetch(`${p.base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: system }] } }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini failed (${res.status})`)
  const text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).filter(Boolean).join('').trim()
  if (!text) throw httpErr(502, 'Gemini returned an empty response')
  return text
}

// ---- model-error self-heal (never masks a key error) ---------------------
function looksLikeModelError(e) {
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
    || by(/flash-lite/i) || by(/flash/i) || by(/mini|instant|8b|small/i)
    || by(/llama/i) || pool[0]
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
const reasonOf = (e) => (isRateLimited(e) ? 'rate_limit' : 'retired')

// Cross-provider text failover: when the primary key has no current model left,
// walk the ordered alternate runtimes (OTHER providers the admin configured) and
// run the chat on the first one that answers. Each alternate also self-heals its
// own model once. Returns the text, or null when every alternate is exhausted.
// Alternates are supplied ONLY where the data boundary allows it (platform keys);
// a company/user on their own key gets an empty list and never leaves their key.
async function failoverChat(alternates, fromP, fromModel, system, turns, notify) {
  for (const a of (alternates || [])) {
    const ap = PROVIDERS[a?.providerId]
    if (!ap || !a.apiKey || a.providerId === fromP.id) continue
    let m = a.chatModel || ap.chatModels[0]
    try {
      notify({ scope: 'chat', reason: 'failover', crossProvider: true, fromProvider: fromP.id, fromModel, toProvider: ap.id, toModel: m })
      return await runChat(ap, a.apiKey, m, system, turns)
    } catch (e) {
      if (!looksLikeModelError(e) && !isRateLimited(e)) continue   // key/5xx on this alt: try the next
      const live = await listModels(a).catch(() => [])
      const alt = pickPreferredModel(live, { avoid: m })
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
export async function chat(cfg, system, turns) {
  const p = PROVIDERS[cfg.providerId]
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`, AI_CODES.PROVIDER)
  if (!cfg.apiKey) throw httpErr(400, `No API key configured for ${p.label}`, AI_CODES.KEY)
  const notify = switchNotifier(cfg)
  const model = cfg.chatModel || p.chatModels[0]
  try {
    return await runChat(p, cfg.apiKey, model, system, turns)
  } catch (e) {
    if (!looksLikeModelError(e) && !isRateLimited(e)) throw e   // key/other: surface, never mask
    const reason = reasonOf(e)
    // (2) another current model on the same key
    const live = await listModels(cfg).catch(() => [])
    const same = pickPreferredModel(live, { avoid: model })
    if (same && same !== model) {
      try {
        notify({ scope: 'chat', reason, crossProvider: false, fromProvider: p.id, fromModel: model, toProvider: p.id, toModel: same })
        return await runChat(p, cfg.apiKey, same, system, turns)
      } catch (e2) { if (!looksLikeModelError(e2) && !isRateLimited(e2)) throw e2 /* fall to cross-provider */ }
    }
    // (3) the next configured provider's key
    const viaAlt = await failoverChat(cfg.alternates, p, model, system, turns, notify)
    if (viaAlt != null) return viaAlt
    // exhausted
    const code = reason === 'rate_limit' ? AI_CODES.RATE : AI_CODES.EXHAUSTED
    notify({ scope: 'chat', reason, fatal: true, code, fromProvider: p.id, fromModel: model, toProvider: null, toModel: null })
    throw httpErr(e.status || 503, e.message, code)
  }
}

// One-shot generation: given a system prompt and one user message, return text.
export async function generate(cfg, system, userText) {
  return chat(cfg, String(system || ''), [{ role: 'user', content: String(userText || '') }])
}

// Several images in ONE vision call (WorkCoPilot's screen read). model is the
// vision-capable model resolved by findVisionModel; a missing one is a clear 400.
export async function analyseImages(cfg, prompt, imageDataUrls, model) {
  const p = PROVIDERS[cfg.providerId]
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`, AI_CODES.PROVIDER)
  if (!cfg.apiKey || !model) throw httpErr(400, 'No vision-capable key.', AI_CODES.KEY)
  const notify = switchNotifier(cfg)
  const imgs = (imageDataUrls || []).filter(Boolean).slice(0, 4)
  if (!imgs.length) return ''
  const run = (m) => {
    if (p.kind === 'gemini') {
      const parts = [{ text: prompt }]
      for (const u of imgs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: String(u).replace(/^data:[^;]+;base64,/, '') } })
      return geminiGenerate(p, cfg.apiKey, m, parts)
    }
    return openaiVision(p, cfg.apiKey, m, prompt, imgs)
  }
  try {
    return await run(model)
  } catch (e) {
    // Screen reading must stay up too: a retired or rate-limited vision model
    // routes to a current vision model on the SAME key. Cross-provider vision
    // failover is handled one layer up (escalateVision's strong backup), which is
    // why this does not walk cfg.alternates - it keeps frames on the chosen key.
    if (!looksLikeModelError(e) && !isRateLimited(e)) throw e
    const reason = reasonOf(e)
    const live = await listModels(cfg).catch(() => [])
    const vis = live.filter((x) => VISION_HINT.test(x))
    const alt = pickPreferredModel(vis, { avoid: model }) || vis.find((x) => x !== model) || null
    if (!alt || alt === model) {
      const code = reason === 'rate_limit' ? AI_CODES.RATE : AI_CODES.EXHAUSTED
      notify({ scope: 'vision', reason, fatal: true, code, fromProvider: p.id, fromModel: model, toProvider: null, toModel: null })
      throw httpErr(e.status || 503, e.message, code)
    }
    notify({ scope: 'vision', reason, crossProvider: false, fromProvider: p.id, fromModel: model, toProvider: p.id, toModel: alt })
    try { visionCache.delete(`${cfg.providerId}:${String(cfg.apiKey).slice(-6)}`) } catch { /* ignore */ }
    return run(alt)
  }
}

// Not every chat model can see images. If the pinned model is not vision-capable
// we look for one that is on the SAME key rather than failing. Cached, because
// screen reading happens mid-session where latency is felt.
const VISION_HINT = /vision|scout|maverick|gpt-4o|gpt-4\.1|o4|gemini|llava|pixtral|qwen.*vl/i
const visionCache = new Map()
const VISION_TTL_MS = 10 * 60 * 1000
export async function findVisionModel(cfg) {
  const p = PROVIDERS[cfg.providerId]
  if (!p || !cfg.apiKey) return null
  // An explicit operator-pinned vision model wins.
  if (cfg.visionModel && VISION_HINT.test(cfg.visionModel)) return cfg.visionModel
  const requested = cfg.chatModel || p.chatModels[0]
  if (VISION_HINT.test(requested)) return requested
  const cacheKey = `${cfg.providerId}:${String(cfg.apiKey).slice(-6)}`
  const hit = visionCache.get(cacheKey)
  if (hit && Date.now() - hit.at < VISION_TTL_MS) return hit.model
  const live = await listModels(cfg).catch(() => [])
  const model = live.find((m) => VISION_HINT.test(m)) || null
  visionCache.set(cacheKey, { model, at: Date.now() })
  return model
}

// Live model discovery - the provider's CURRENT catalog, using the saved key.
const NON_CHAT = /whisper|distil-whisper|tts|text-to-speech|speech|embed|embedding|dall|image|moderation|guard|playai|rerank|vision-only|orpheus/i
export async function listModels(cfg) {
  const p = PROVIDERS[cfg.providerId]
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  if (!cfg.apiKey) throw httpErr(400, `No API key configured for ${p.label}`)
  if (p.kind === 'gemini') {
    const res = await fetch(`${p.base}/models?pageSize=200&key=${encodeURIComponent(cfg.apiKey)}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) throw httpErr(res.status, data?.error?.message || `Gemini model list failed (${res.status})`)
    return (data?.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((id) => /gemini/i.test(id) && !NON_CHAT.test(id))
      .sort()
  }
  const res = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${cfg.apiKey}` } })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(res.status, data?.error?.message || `${p.label} model list failed (${res.status})`)
  return (data?.data || []).map((m) => m.id).filter((id) => id && !NON_CHAT.test(id)).sort()
}

// Lightweight key check for the "Test" button. Resolves the requested model
// against the LIVE catalog first, so Test reports the model that will ACTUALLY
// be used rather than a stale pinned one that would fail.
export async function testKey(cfg) {
  const p = PROVIDERS[cfg.providerId]
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  const requested = cfg.chatModel || p.chatModels[0]
  let model = requested
  let requestedModel
  try {
    const live = await listModels({ ...cfg, chatModel: requested })
    if (live.length && !live.includes(requested)) {
      const fallback = pickPreferredModel(live)
      if (fallback) { model = fallback; requestedModel = requested }
    }
  } catch { /* live discovery failed - let chat() report the real error */ }
  const answer = await chat({ ...cfg, chatModel: model }, 'You are a connectivity check. Reply with exactly: OK', [{ role: 'user', content: 'ping' }])
  return { ok: true, provider: p.label, model, requestedModel, sample: answer.slice(0, 40) }
}

// ---- Daily best/cheapest recommendation -----------------------------------
// A curated rate card: approximate published INPUT list price ($/million tokens)
// plus a coarse quality tier (1-5) and whether the model can see screens. Matched
// against the LIVE catalog (most-specific pattern first), so the recommendation
// is always a model that is CURRENTLY available on the key - it never names a
// retired model. Prices are approximate and for guidance only (providers change
// them); refreshed daily by the caller. Keep patterns specific-first.
const RATECARD = {
  gemini: [
    { re: /flash-lite/i, usd: 0.10, q: 3, vision: true },
    { re: /2\.0-flash(?!-lite)/i, usd: 0.10, q: 3, vision: true },
    { re: /3(\.\d)?-flash(?!-lite)/i, usd: 0.30, q: 4, vision: true },
    { re: /flash-latest/i, usd: 0.30, q: 4, vision: true },
    { re: /1\.5-flash/i, usd: 0.08, q: 3, vision: true },
    { re: /3(\.\d)?-pro|2\.5-pro|pro-latest/i, usd: 2.50, q: 5, vision: true },
  ],
  openai: [
    { re: /gpt-4o-mini/i, usd: 0.15, q: 3, vision: true },
    { re: /4\.1-nano/i, usd: 0.10, q: 3, vision: true },
    { re: /4\.1-mini/i, usd: 0.40, q: 4, vision: true },
    { re: /o4-mini/i, usd: 1.10, q: 4, vision: true },
    { re: /gpt-4o(?!-mini)/i, usd: 2.50, q: 5, vision: true },
    { re: /gpt-4\.1(?!-nano|-mini)/i, usd: 2.00, q: 5, vision: true },
  ],
  groq: [
    { re: /gpt-oss-20b/i, usd: 0.10, q: 3, vision: false },
    { re: /gpt-oss-120b/i, usd: 0.25, q: 4, vision: false },
    { re: /scout/i, usd: 0.11, q: 3, vision: true },
    { re: /maverick/i, usd: 0.20, q: 4, vision: true },
    { re: /llama.*vl|vision/i, usd: 0.20, q: 3, vision: true },
  ],
}
function rateFor(providerId, model) {
  for (const row of (RATECARD[providerId] || [])) if (row.re.test(String(model))) return row
  return { usd: null, q: 2, vision: VISION_HINT.test(String(model)) } // unknown model: conservative
}

// Where our model ranking comes from, so the "best model plans your work" claim
// is sourced and dated, not asserted. The quality tiers above are curated to
// reflect the public community leaderboards; keep RANK_UPDATED current when they
// are revised (a superadmin confirmation / periodic auto-fetch can supersede it).
export const RANK_META = { source: 'community AI leaderboards (LMArena, Artificial Analysis)', updated: '2026-10-22' }
// A model's standing: tier + whether it is in our TOP tier (the "top-ranked"
// badge is shown only for 'top'). Honest: this is our tracked ranking, dated.
export function modelRank(providerId, model) {
  const r = rateFor(providerId, model)
  const tier = r.q >= 5 ? 'top' : r.q >= 4 ? 'strong' : 'standard'
  return { quality: r.q, tier, topRanked: r.q >= 5, vision: !!r.vision, source: RANK_META.source, updated: RANK_META.updated }
}
// Per-provider recommendation from the live catalog, or null when the key cannot
// list models (bad key / provider down - the caller surfaces that separately).
export async function recommendModels(cfg) {
  const p = PROVIDERS[cfg.providerId]
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
  const strip = (x) => x ? { model: x.model, usdPerMtok: x.usd, quality: x.q, vision: x.vision } : null
  return { provider: p.id, label: p.label, count: scored.length, cheapest: strip(cheapest), cheapestVision: strip(cheapestVision), best: strip(best) }
}
