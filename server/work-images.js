// ---------------------------------------------------------------------------
// WorkCoPilot - Phase 5: on-demand AI image generation (premium only, 5/day)
//
// A premium WorkCoPilot user can ask for one illustrative image (for example a
// diagram-style reference for a step). The daily free allowance is 5 for the
// premium tier; basic and advanced tiers cannot generate at all. Everything is
// enforced SERVER-SIDE - the client is never trusted for the gate or the count.
//
// This module only registers the two routes. The store owns tier + usage
// accounting (getWorkImageUsage / addWorkImageUsage / getWorkTier); the AI layer
// (or the small internal imageFromRuntime below) owns the provider call. Nothing
// here fails silently: every refusal returns a clear 4xx/5xx with a reason
// (SUPREME RULE III / VIII), allowance is consumed only after a real success, and
// the provider/model name is never put in a user-facing message (logged only).
//
// No ai.js image helper exists today (ai.js does transcribe / chat / vision /
// model-discovery only, and its model lists explicitly FILTER OUT image models),
// so imageFromRuntime below implements the minimal image-generation call for the
// providers in this codebase that can do it: OpenAI Images (gpt-image-1) and
// Google Gemini image generation. Groq has no image-generation API and is
// refused with a clear 501.
// ---------------------------------------------------------------------------

// Providers in this codebase that can generate images. Groq cannot.
const IMAGE_PROVIDERS = new Set(['openai', 'gemini'])

// Default image-generation model per provider. These are image-ONLY models, so
// they are not the runtime's chat/vision model - they are named here because the
// resolved runtime never carries an image model. If a provider renames one, the
// provider's own error text is surfaced loudly (no silent swap, SUPREME RULE III).
const OPENAI_IMAGE_MODEL = 'gpt-image-1'
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image'

const IMAGE_TIMEOUT_MS = 60000     // time-box the provider call
const MAX_PROMPT_CHARS = 1000      // keep requests sane; plenty for an illustration

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

// True when the resolved provider can generate images at all.
function providerSupportsImages(providerId) { return IMAGE_PROVIDERS.has(providerId) }

// Run fetch with an abort timeout so a hung provider never sticks the request.
// Returns the Response; throws httpErr(504, ...) on timeout.
async function fetchWithTimeout(url, opts) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), IMAGE_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ac.signal })
  } catch (e) {
    if (e && e.name === 'AbortError') throw httpErr(504, 'Image generation timed out. Try again.')
    throw httpErr(502, 'Image provider could not be reached. Try again.')
  } finally {
    clearTimeout(timer)
  }
}

// OpenAI Images API. gpt-image-1 returns base64 (b64_json) by default. We build a
// PNG data URL from it. The key comes ONLY from the resolved runtime.
async function openaiImage(apiKey, prompt) {
  const res = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, n: 1, size: '1024x1024' }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(502, `Image provider error: ${data?.error?.message || `request failed (${res.status})`}`)
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw httpErr(502, 'Image provider error: no image was returned.')
  return { dataUrl: `data:image/png;base64,${b64}` }
}

// Google Gemini image generation via generateContent with an IMAGE response
// modality. The image comes back inline as base64 in a candidate part.
async function geminiImage(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw httpErr(502, `Image provider error: ${data?.error?.message || `request failed (${res.status})`}`)
  const parts = data?.candidates?.[0]?.content?.parts || []
  const img = parts.find((pt) => pt && pt.inlineData && pt.inlineData.data)
  if (!img) {
    // A safety block or empty return comes back as no image part - say so plainly.
    const block = data?.promptFeedback?.blockReason
    throw httpErr(502, block ? 'Image provider error: the request could not be generated.' : 'Image provider error: no image was returned.')
  }
  const mime = img.inlineData.mimeType || 'image/png'
  return { dataUrl: `data:${mime};base64,${img.inlineData.data}` }
}

// Resolve a runtime (provider + key) to an image. Returns { dataUrl } or throws.
// rt is { providerId, apiKey, chatModel, visionModel } from resolveWorkRuntime.
async function imageFromRuntime(rt, prompt) {
  if (!rt || !rt.apiKey) throw httpErr(503, 'AI is not configured for image generation.')
  if (rt.providerId === 'openai') return openaiImage(rt.apiKey, prompt)
  if (rt.providerId === 'gemini') return geminiImage(rt.apiKey, prompt)
  // Any other provider (for example Groq) has no image-generation API.
  throw httpErr(501, 'Image generation needs an OpenAI or Google Gemini key. The configured AI cannot generate images.')
}

export function registerWorkImageRoutes(app, { store, ai, requireWorkAuth, wrap, resolveWorkRuntime }) {
  if (!app || !store || !requireWorkAuth || !wrap || !resolveWorkRuntime) {
    throw new Error('registerWorkImageRoutes: missing required deps (app, store, requireWorkAuth, wrap, resolveWorkRuntime)')
  }

  // How many images the signed-in work user has left today, with tier + cap.
  app.get('/api/work/image/usage', requireWorkAuth, wrap((req, res) => {
    res.json(store.getWorkImageUsage(req.workUser.id))
  }))

  // Generate one illustrative image on demand. Premium only, 5/day enforced here.
  app.post('/api/work/image', requireWorkAuth, async (req, res) => {
    try {
      const uid = req.workUser.id

      // 1) Tier gate: image generation is a premium-only feature.
      if (store.getWorkTier(uid) !== 'premium') {
        return res.status(403).json({ error: 'Image generation is a Premium feature.' })
      }

      // Validate the prompt before spending anything.
      const prompt = typeof (req.body && req.body.prompt) === 'string' ? req.body.prompt.trim() : ''
      if (!prompt) return res.status(400).json({ error: 'Describe the image you want to generate.' })
      if (prompt.length > MAX_PROMPT_CHARS) {
        return res.status(400).json({ error: `Keep the description under ${MAX_PROMPT_CHARS} characters.` })
      }

      // 2) Allowance gate: do NOT consume on refusal.
      const u = store.getWorkImageUsage(uid)
      if (u.remaining <= 0) {
        return res.status(429).json({ error: 'Daily image limit reached. Resets ' + u.resetLabel + '.' })
      }

      // 3) Resolve a provider (prefers an image-capable one: Gemini, then OpenAI).
      // resolveWorkRuntime writes its own 503/400 and returns null when nothing is
      // ready, so we just bail.
      const rr = await resolveWorkRuntime(req, res, {})
      if (!rr) return
      const rt = rr.rt
      if (!providerSupportsImages(rt && rt.providerId)) {
        return res.status(501).json({
          error: 'Image generation needs an OpenAI or Google Gemini key. The configured AI cannot generate images.',
        })
      }

      // Generate. Allowance is consumed ONLY after this succeeds.
      let out
      try {
        out = await imageFromRuntime(rt, prompt)
      } catch (e) {
        // Log the provider/model server-side; never leak them to the client.
        console.warn(`[work-image] generation failed (provider=${rt && rt.providerId}) - ${e && e.message}`)
        return res.status(e.status || 502).json({ error: e.message || 'Image generation failed.' })
      }

      // 4) Success only: consume one, return the fresh usage shape with the image.
      const usage = store.addWorkImageUsage(uid, 1)
      res.json({ dataUrl: out.dataUrl, usage })
    } catch (e) {
      console.warn(`[work-image] route error - ${e && e.message}`)
      res.status(e.status || 500).json({ error: e.message || 'Server error' })
    }
  })
}

export default { registerWorkImageRoutes }
