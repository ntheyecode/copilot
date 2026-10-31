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
// (ai_image.js) owns the provider call, the model choice and its lifecycle.
// Nothing here fails silently: every refusal returns a clear 4xx/5xx with a
// reason (SUPREME RULE III / VIII), allowance is consumed only after a real
// success, and the provider/model name is never put in a user-facing message
// (logged only). Groq has no image-generation API and is refused with a 501.
// ---------------------------------------------------------------------------
import { IMAGE_PROVIDERS, imageFromRuntime, imageUserError } from './ai_image.js'

// The model lists live in the AI layer; re-exported for existing importers.
export { IMAGE_MODELS, OPENAI_IMAGE_MODEL, GEMINI_IMAGE_MODEL } from './ai_image.js'

const MAX_PROMPT_CHARS = 1000      // keep requests sane; plenty for an illustration

// True when the resolved provider can generate images at all.
function providerSupportsImages(providerId) { return IMAGE_PROVIDERS.has(providerId) }

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

      // 1) Tier gate via the SINGLE feature registry (store.tierAllows), not a
      // hardcoded tier string - one source of truth for entitlements.
      if (!store.tierAllows(store.getWorkTier(uid), 'images')) {
        return res.status(403).json({ error: 'Image generation is a Premium feature.' })
      }
      // 1b) Company gate: companies get image generation only once the superadmin
      // enables it for the company (off by default - a cost control).
      if (store.workImageGenAllowed && !store.workImageGenAllowed(uid)) {
        return res.status(403).json({ error: 'Image generation is turned off for your company. Ask your administrator to enable it.' })
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
        // The provider's own text (and the model) go to the server log only; the
        // user gets a plain message and a code (ai_image.js imageUserError).
        console.warn(`[work-image] generation failed (provider=${rt && rt.providerId}) - ${(e && (e.providerMessage || e.message)) || 'unknown error'}`)
        const ue = imageUserError(e)
        return res.status(ue.status).json({ error: ue.error, code: ue.code })
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
