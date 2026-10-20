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

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

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
    /(does not exist|not found|decommission|invalid model|unknown model|no longer supported)/.test(msg)
}
function pickPreferredModel(models) {
  if (!models || !models.length) return null
  return models.find((x) => /gpt-oss-20b/i.test(x))
    || models.find((x) => /gpt-oss/i.test(x))
    || models.find((x) => /llama/i.test(x))
    || models.find((x) => /instant|8b|flash|mini/i.test(x))
    || models[0]
}

function runChat(p, apiKey, model, system, turns) {
  return p.kind === 'gemini'
    ? geminiChat(p, apiKey, model, system, turns)
    : openaiChat(p, apiKey, model, system, turns)
}

// ---- public API -----------------------------------------------------------
// turns: [{ role: 'user' | 'assistant', content }]. Self-heals a retired model
// id once against the live catalog (logged), never a key error.
export async function chat(cfg, system, turns) {
  const p = PROVIDERS[cfg.providerId]
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  if (!cfg.apiKey) throw httpErr(400, `No API key configured for ${p.label}`)
  const model = cfg.chatModel || p.chatModels[0]
  try {
    return await runChat(p, cfg.apiKey, model, system, turns)
  } catch (e) {
    if (!looksLikeModelError(e)) throw e
    const live = await listModels(cfg).catch(() => [])
    const fallback = pickPreferredModel(live)
    if (!fallback || fallback === model) throw e
    console.warn(`[ai] chat model "${model}" unavailable for ${p.label} (${e.message}) - retrying with "${fallback}"`)
    return runChat(p, cfg.apiKey, fallback, system, turns)
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
  if (!p) throw httpErr(400, `Unknown provider: ${cfg.providerId}`)
  if (!cfg.apiKey || !model) throw httpErr(400, 'No vision-capable key.')
  const imgs = (imageDataUrls || []).filter(Boolean).slice(0, 4)
  if (!imgs.length) return ''
  if (p.kind === 'gemini') {
    const parts = [{ text: prompt }]
    for (const u of imgs) parts.push({ inline_data: { mime_type: 'image/jpeg', data: String(u).replace(/^data:[^;]+;base64,/, '') } })
    return geminiGenerate(p, cfg.apiKey, model, parts)
  }
  return openaiVision(p, cfg.apiKey, model, prompt, imgs)
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
