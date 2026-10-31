// Company Brain: a company admin adds the company's own documents (SOPs,
// playbooks, runbooks, policies). The file is decoded and its text extracted
// IN MEMORY, then handed to the one ingest path (brain_ingest.ingestSource):
// every chunk is masked under the company's policy before it is embedded or
// stored, and only masked passages land in the company's sealed brain. The file
// itself is never written anywhere. The same document name again replaces its
// earlier version (supersede), so a revised SOP never sits beside a stale one.
// Listing and removal are the existing inventory routes (index.js).
//
//   POST /api/work/brain/documents   { name, mime, dataBase64 }   company admin
import { readDocUpload } from './doc_upload.js'
import { ingestSource } from './brain_ingest.js'
import { embedderStatus } from './brain_embed.js'
import { EMBED } from './brain_model.js'

const ADDS_PER_HOUR = 30

// One stable id per document name, so a re-upload supersedes, never duplicates.
export function documentSourceId(name) {
  const base = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return 'doc:' + base.slice(0, 160)
}

export function registerCompanyBrainDocumentRoutes(app, { store, requireWorkAuth, requireCompanyAdmin, wrap, extractText }) {
  if (!app || !store || !requireWorkAuth || !requireCompanyAdmin || !wrap || !extractText) throw new Error('registerCompanyBrainDocumentRoutes: missing deps')
  const recent = new Map()   // admin id -> add timestamps in the last hour
  const rateOk = (id) => {
    const now = Date.now()
    const list = (recent.get(id) || []).filter((t) => now - t < 3600_000)
    if (list.length >= ADDS_PER_HOUR) { recent.set(id, list); return false }
    list.push(now); recent.set(id, list)
    return true
  }

  app.post('/api/work/brain/documents', requireWorkAuth, requireCompanyAdmin, wrap(async (req, res) => {
    const cid = req.workUser.companyId
    if (!cid) return res.status(403).json({ error: 'No company in scope.' })
    let doc
    try { doc = readDocUpload(req.body) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }
    if (!rateOk(req.workUser.id)) return res.status(429).json({ error: 'That is a lot of documents for one hour. Try again a little later.' })
    let text
    try { text = await extractText({ name: doc.name, mime: doc.mime, base64: doc.base64 }) }   // in memory only
    catch (e) { return res.status(422).json({ error: `Could not read that file${e && e.message ? `: ${e.message}` : '.'}` }) }
    doc.base64 = null
    if (!text || !String(text).trim()) return res.status(422).json({ error: 'Could not read any text from that file. It may be empty, image-only, or password protected.' })
    const policy = store.getEffectiveWorkPolicy(req.workUser.id)
    const source = { id: documentSourceId(doc.name), title: doc.name, kind: 'document' }
    const version = new Date().toISOString()
    let r
    try {
      r = await ingestSource(cid, {
        source, version, extractedText: String(text), policy,
        sourceMeta: { title: doc.name, kind: 'document', revision: version, version, embeddingModelVersion: `${EMBED.id}@${EMBED.rev}` },
      })
    } catch (e) {
      if (e && e.code === 'BRAIN_LOCKED') return res.status(423).json({ error: 'Your Company Brain is locked. Unlock it with your passphrase, then add the document again.', code: 'BRAIN_LOCKED' })
      throw e
    } finally { text = null }
    if (r.redacted > 0) store.recordPiiAlert(req.workUser.id, { call: 'brain', counts: { document: r.redacted }, total: r.redacted })
    store.recordAdminAction({ userId: req.workUser.id, companyId: cid, action: 'brain_document_add', reason: 'added a company document', detail: `${doc.name}: ${r.accepted} passage(s) stored, ${r.skipped} unchanged, ${r.redacted} value(s) masked${r.superseded ? ', replaced the earlier version' : ''}` })
    // The embedder mode is reported as a plain flag (never a model name): in
    // fallback mode retrieval is keyword-only, which the console states.
    res.json({ source: { id: source.id, title: doc.name, replaced: r.superseded > 0 }, accepted: r.accepted, unchanged: r.skipped, masked: r.redacted, fileKept: false, search: embedderStatus().mode === 'model' ? 'meaning' : 'keywords' })
  }))
}
