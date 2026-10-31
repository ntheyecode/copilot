// ---------------------------------------------------------------------------
// WorkCoPilot Phase 4 - "upload documents to guide from" (Advanced tier).
//
// WorkCoPilot is a read-only screen-aware guide. Advanced and Premium tier
// users can upload reference documents (a runbook, a spec, a policy) so the
// guidance is grounded in THEIR material. This module ONLY handles the
// upload / list / delete surface. The grounding injection into the planner
// (store.getWorkDocsText) and the console UI live elsewhere.
//
// Wiring (owner does this in server/index.js, do not edit it here):
//   import { registerWorkDocsRoutes } from './work-docs.js'
//   registerWorkDocsRoutes(app, { store, requireWorkAuth, wrap, extractDocText: docs.extractText })
//
// IMPORTANT about extractDocText: the real extractor found in server/index.js
// is docs.extractText and its signature is OBJECT form:
//   docs.extractText({ name, mime, base64 }) -> Promise<string>
// so this module calls deps.extractDocText({ name, mime, base64 }). Wire it as
// `extractDocText: docs.extractText` directly. Do NOT write a positional
// (buffer, mime, name) adapter, it would not match the real helper.
//
// Documents are sent as base64 inside the JSON body (no multipart parser is
// wired on the server, express.json handles the body). Note the express.json
// limit is '12mb' (server/index.js), so a base64 payload above ~12 MB is
// rejected by Express BEFORE this handler runs. The raw-byte cap here is 10 MB,
// whose base64 is about 13.3 MB, so to actually accept a full 10 MB file the
// owner must raise the express.json limit to about 16mb. Until then the
// effective ceiling is roughly 9 MB of raw file. This module still enforces its
// own 10 MB raw cap so an oversize decode never reaches the store.
//
// No em dashes. No AI-language. No model/provider names. Every failure path is
// explicit and distinct (SUPREME RULE III): nothing is stored silently empty.
// ---------------------------------------------------------------------------
import { readDocUpload } from './doc_upload.js'

export function registerWorkDocsRoutes(app, deps = {}) {
  const { store, requireWorkAuth, wrap, extractDocText } = deps
  if (!app || !store || typeof requireWorkAuth !== 'function' || typeof wrap !== 'function' || typeof extractDocText !== 'function') {
    throw new Error('registerWorkDocsRoutes: missing required deps (app, store, requireWorkAuth, wrap, extractDocText)')
  }

  // Document upload is gated by the SINGLE feature registry (store.tierAllows),
  // not a parallel tier list, so the entitlement has one source of truth.
  const workUid = (req) => req.workUser && req.workUser.id

  // Documents-feature gate, runs after requireWorkAuth so req.workUser is set.
  // Grounding is on for every tier now (store.TIER_FEATURES.documents), so this
  // passes for all; it stays as the single-registry gate in case a tier is ever
  // turned off. The per-tier COUNT cap is the paid lever, enforced on upload.
  function gateDocuments(req, res, next) {
    const tier = store.getWorkTier(workUid(req))
    if (!store.tierAllows(tier, 'documents')) {
      return res.status(403).json({ error: 'Document grounding is not available on your plan.', upgrade: true, tier })
    }
    next()
  }

  // POST /api/work/docs - accept one document, extract its text, store the text.
  // Body: { name, mime, dataBase64 }. Returns { ok, doc } where doc is the
  // store.addWorkDoc result ({ id, name, size, chars, at }).
  app.post('/api/work/docs', requireWorkAuth, gateDocuments, async (req, res) => {
    try {
      // Per-tier count cap (the paid lever). Fail fast before any extraction so a
      // person at the cap is told plainly rather than spending the parse.
      const uid = workUid(req)
      const tier = store.getWorkTier(uid)
      const max = store.workDocsMax(tier)
      const used = store.listWorkDocs(uid).length
      if (used >= max) {
        return res.status(403).json({ error: `You can ground a plan with up to ${max} document${max === 1 ? '' : 's'} on your plan. Remove one, or upgrade for more.`, capReached: true, used, max, tier, upgrade: true })
      }
      // Name, type, base64 and size are checked by the one shared reader
      // (doc_upload.js, also used by the personal brain).
      let upload
      try { upload = readDocUpload(req.body) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }
      const { name, mime, base64: clean, size } = upload

      // Extract text through the shared helper (docs.extractText, object form).
      let text
      try {
        text = await extractDocText({ name, mime, base64: clean })
      } catch (e) {
        const detail = e && e.message ? `: ${e.message}` : '.'
        return res.status(422).json({ error: `Could not read that file${detail}` })
      }
      // Never store an empty doc. A scanned-image PDF, a protected file, or a
      // blank document all land here with no usable text.
      if (!text || !String(text).trim()) {
        return res.status(422).json({ error: 'Could not read any text from that file. It may be empty, image-only, or password protected.' })
      }

      const doc = store.addWorkDoc(workUid(req), { name, mime, text: String(text), size })
      return res.json({ ok: true, doc })
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message || 'Server error' })
    }
  })

  // GET /api/work/docs - list the stored docs plus the caller's tier.
  app.get('/api/work/docs', requireWorkAuth, gateDocuments, wrap((req, res) => {
    const uid = workUid(req)
    const tier = store.getWorkTier(uid)
    res.json({ docs: store.listWorkDocs(uid), tier, max: store.workDocsMax(tier) })
  }))

  // DELETE /api/work/docs/:id - remove one stored doc.
  app.delete('/api/work/docs/:id', requireWorkAuth, gateDocuments, wrap((req, res) => {
    // Own content: the user may delete their own doc freely; we don't block on a
    // reason, but we capture one if given and always log the removal.
    const reason = String((req.body && req.body.reason) || (req.query && req.query.reason) || '').trim()
    const result = store.deleteWorkDoc(workUid(req), req.params.id, reason)
    res.json(result || { ok: true })
  }))
}

export default { registerWorkDocsRoutes }
