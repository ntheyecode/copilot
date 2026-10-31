// ===========================================================================
// AI image generation: the provider calls behind /api/work/image (moved out of
// server/work-images.js, which keeps only the routes and gates).
//
// Models come from IMAGE_MODELS, preferred first, filtered through the lifecycle
// registry (ai_model_lifecycle.js) so a model past its shutdown is never sent:
//   openai: gpt-image-2.5-sunburst (OpenAI's recommendation for generation and
//           editing), then gpt-image-2.5-flare (the fast alternative, same price).
//           gpt-image-1 was shut down on 2026-10-23.
//   gemini: gemini-3.1-flash-lite-image (Google's named replacement for
//           gemini-2.5-flash-image, the cheapest at $0.25 in / $30 image out),
//           then gemini-nano-banana-2.1 (newest stable), then 3.1 Flash Image.
// A model the provider reports as missing or retired moves to the next one on
// the same key, recorded through rt.onSwitch for the superadmin (SUPREME RULE
// III). Users never see a provider or model name: provider errors are logged
// server-side and the user gets a plain message (imageUserError).
//
// Request shapes (pure, unit-tested):
//   OpenAI  POST /v1/images/generations { model, prompt, n: 1, size: '1024x1024' }.
//           GPT image models always return data[0].b64_json; `response_format`
//           and `style` are not supported for them and are never sent.
//   Gemini  generateContent with responseModalities ['IMAGE']; the image returns
//           inline as base64 in a candidate part.
// ===========================================================================
import { reportUsage, usageFromResponse, withKeySource } from './ai_usage.js'
import { isRetired } from './ai_model_lifecycle.js'
import { looksLikeModelError } from './ai.js'

export const IMAGE_MODELS = Object.freeze({
  openai: Object.freeze(['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare']),
  gemini: Object.freeze(['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image']),
})
// The preferred model per provider (kept for callers that price or log it).
export const OPENAI_IMAGE_MODEL = IMAGE_MODELS.openai[0]
export const GEMINI_IMAGE_MODEL = IMAGE_MODELS.gemini[0]
export const IMAGE_PROVIDERS = new Set(Object.keys(IMAGE_MODELS))

// Crisp codes for the superadmin incident and the client.
export const IMAGE_CODES = Object.freeze({ ORG_VERIFY: 'AI-IMAGE-ORG-VERIFY', NO_MODEL: 'AI-IMAGE-NO-MODEL', FAILED: 'AI-IMAGE-FAILED' })

const IMAGE_TIMEOUT_MS = 60000
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

function err(status, message, extra = {}) { return Object.assign(new Error(message), { status, ...extra }) }

// The models to try for a provider on the day of the call, preferred first.
export function imageModelsFor(providerId, at = Date.now()) {
  return (IMAGE_MODELS[providerId] || []).filter((m) => !isRetired(m, { provider: providerId, at }))
}

// Pure request bodies.
export function openaiImageBody(model, prompt) {
  return { model, prompt, n: 1, size: '1024x1024' }
}
export function geminiImageBody(prompt) {
  return { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'] } }
}

// OpenAI requires Organization Verification for its image models on some
// accounts; that is an account action, not a retry.
export function isOrgVerificationError(message) {
  return /organi[sz]ation (?:must be |is not |has not been )?verified|verify (?:your )?organi[sz]ation|organi[sz]ation verification/i.test(String(message || ''))
}

async function fetchWithTimeout(url, opts) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), IMAGE_TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ac.signal })
  } catch (e) {
    if (e && e.name === 'AbortError') throw err(504, 'Image generation timed out. Try again.', { userSafe: true })
    throw err(502, 'The image service could not be reached. Try again.', { userSafe: true })
  } finally {
    clearTimeout(timer)
  }
}

// A provider error keeps the provider's status and text for the log and the
// incident; imageUserError decides what the user sees.
function providerError(res, data) {
  const msg = (data && data.error && data.error.message) || `request failed (${res.status})`
  return err(res.status, msg, { providerMessage: msg, orgVerification: isOrgVerificationError(msg) })
}

async function openaiImage(apiKey, model, prompt) {
  const res = await fetchWithTimeout(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(openaiImageBody(model, prompt)),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw providerError(res, data)
  reportUsage({ provider: 'openai', model, usage: usageFromResponse('openai', data), call: 'image' })
  const b64 = data && data.data && data.data[0] && data.data[0].b64_json
  if (!b64) throw err(502, 'No image was returned. Try again.', { userSafe: true })
  return { dataUrl: `data:image/png;base64,${b64}` }
}

async function geminiImage(apiKey, model, prompt) {
  const res = await fetchWithTimeout(`${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiImageBody(prompt)),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw providerError(res, data)
  reportUsage({ provider: 'gemini', model, usage: usageFromResponse('gemini', data), call: 'image' })
  const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || []
  const img = parts.find((pt) => pt && pt.inlineData && pt.inlineData.data)
  if (!img) {
    // A safety block or an empty return comes back as no image part.
    const blocked = data && data.promptFeedback && data.promptFeedback.blockReason
    throw err(502, blocked ? 'That image could not be generated. Try a different description.' : 'No image was returned. Try again.', { userSafe: true })
  }
  return { dataUrl: `data:${img.inlineData.mimeType || 'image/png'};base64,${img.inlineData.data}` }
}

const CALLS = { openai: openaiImage, gemini: geminiImage }

// One image from the resolved runtime. Returns { dataUrl, model } or throws.
export function imageFromRuntime(rt, prompt, { at = Date.now() } = {}) {
  return withKeySource(rt && rt.keySource, () => imageOnKey(rt, prompt, at))
}
async function imageOnKey(rt, prompt, at) {
  if (!rt || !rt.apiKey) throw err(503, 'AI is not configured for image generation.', { userSafe: true })
  const call = CALLS[rt.providerId]
  if (!call) throw err(501, 'Image generation needs an OpenAI or Google Gemini key. The configured AI cannot generate images.', { userSafe: true })
  const notify = typeof rt.onSwitch === 'function' ? rt.onSwitch : () => {}
  const models = imageModelsFor(rt.providerId, at)
  if (!models.length) {
    notify({ scope: 'image', reason: 'retired', fatal: true, code: IMAGE_CODES.NO_MODEL, fromProvider: rt.providerId, fromModel: null, toProvider: null, toModel: null })
    throw err(503, 'Image generation is not available right now.', { userSafe: true, code: IMAGE_CODES.NO_MODEL })
  }
  let last = null
  for (let i = 0; i < models.length; i++) {
    try {
      const out = await call(rt.apiKey, models[i], prompt)
      return { ...out, model: models[i] }
    } catch (e) {
      last = e
      if (e.orgVerification) {
        notify({ scope: 'image', reason: 'org_verification', fatal: true, code: IMAGE_CODES.ORG_VERIFY, fromProvider: rt.providerId, fromModel: models[i], toProvider: null, toModel: null })
        throw e
      }
      const next = models[i + 1]
      if (!next || !looksLikeModelError(e)) break
      notify({ scope: 'image', reason: 'retired', crossProvider: false, fromProvider: rt.providerId, fromModel: models[i], toProvider: rt.providerId, toModel: next })
    }
  }
  throw last
}

// What the user sees for a failed generation: never the provider's text, model
// or provider name. { status, error, code }.
export function imageUserError(e) {
  if (e && e.orgVerification) {
    return { status: 403, code: IMAGE_CODES.ORG_VERIFY, error: 'Image generation is not enabled on this AI account yet. An administrator needs to complete the AI provider\'s organization verification, then try again.' }
  }
  if (e && e.userSafe) return { status: e.status || 502, code: e.code || IMAGE_CODES.FAILED, error: e.message }
  return { status: 502, code: IMAGE_CODES.FAILED, error: 'Image generation failed. Try again in a moment.' }
}

export default {
  IMAGE_MODELS, OPENAI_IMAGE_MODEL, GEMINI_IMAGE_MODEL, IMAGE_PROVIDERS, IMAGE_CODES, imageModelsFor,
  openaiImageBody, geminiImageBody, isOrgVerificationError, imageFromRuntime, imageUserError,
}
