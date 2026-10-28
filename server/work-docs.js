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

export function registerWorkDocsRoutes(app, deps = {}) {
  const { store, requireWorkAuth, wrap, extractDocText } = deps
  if (!app || !store || typeof requireWorkAuth !== 'function' || typeof wrap !== 'function' || typeof extractDocText !== 'function') {
    throw new Error('registerWorkDocsRoutes: missing required deps (app, store, requireWorkAuth, wrap, extractDocText)')
  }

  // Raw byte ceiling for an uploaded file (before base64 inflation).
  const MAX_RAW_BYTES = 10 * 1024 * 1024
  // Document upload is gated by the SINGLE feature registry (store.tierAllows),
  // not a parallel tier list, so the entitlement has one source of truth.
  const workUid = (req) => req.workUser && req.workUser.id

  // Classify by mime first, then by filename extension. Returns a short type id
  // or null. The allowed set (pdf, docx, txt, md) is a strict subset of what the
  // shared extractor handles, so an allowed type never trips its own 415.
  function classify(name, mime) {
    const lower = String(name || '').toLowerCase()
    const m = String(mime || '').toLowerCase()
    if (m === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
    if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) return 'docx'
    if (m === 'text/markdown' || lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
    if (m === 'text/plain' || lower.endsWith('.txt')) return 'txt'
    return null
  }

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
      const body = req.body || {}
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const mime = typeof body.mime === 'string' ? body.mime.trim() : ''
      let data = body.dataBase64

      if (!name) return res.status(400).json({ error: 'Missing document name.' })
      if (typeof data !== 'string' || !data.trim()) return res.status(400).json({ error: 'No file data received.' })

      // Accept a data URL prefix (data:<mime>;base64,....) by stripping it, then
      // drop any whitespace the client may have wrapped the base64 in.
      data = data.trim()
      if (data.startsWith('data:')) {
        const comma = data.indexOf(',')
        if (comma !== -1) data = data.slice(comma + 1)
      }
      const clean = data.replace(/\s+/g, '')
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
        return res.status(400).json({ error: 'The file data is not valid base64.' })
      }

      // Supported types only: pdf, docx, txt, md. Anything else is a clear 415.
      const type = classify(name, mime)
      if (!type) {
        return res.status(415).json({ error: 'Unsupported file type. Upload a PDF, Word (.docx), text (.txt), or Markdown (.md) file.' })
      }

      // Size cap. Estimate from the base64 length first so an absurd payload is
      // rejected without decoding, then confirm against the real byte length.
      const approxBytes = Math.floor((clean.length * 3) / 4)
      if (approxBytes > MAX_RAW_BYTES) {
        return res.status(413).json({ error: 'That file is too large. The limit is 10 MB.' })
      }
      const buffer = Buffer.from(clean, 'base64')
      if (!buffer.length) return res.status(400).json({ error: 'The file data decoded to nothing.' })
      if (buffer.length > MAX_RAW_BYTES) {
        return res.status(413).json({ error: 'That file is too large. The limit is 10 MB.' })
      }

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

      const doc = store.addWorkDoc(workUid(req), { name, mime, text: String(text), size: buffer.length })
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
