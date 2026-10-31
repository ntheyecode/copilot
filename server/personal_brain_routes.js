// The personal brain's API (personal accounts: individuals and LinkNotes;
// company users have the company brain). The person teaches it with their own
// documents; only the learnings are kept and shown, never the files.
//
//   GET    /api/work/me/brain                    what it learned, by source
//   POST   /api/work/me/brain/learn              { name, mime, dataBase64 } one document
//   POST   /api/work/me/brain/notes              { notes: [text] } learnings from desktop sessions
//   DELETE /api/work/me/brain/learnings/:id      forget one learning
//   DELETE /api/work/me/brain/sources/:id        forget everything one document taught
//   POST   /api/work/me/brain/clear              forget everything
import { readDocUpload } from './doc_upload.js'

const LEARN_PER_HOUR = 20   // each upload runs AI calls; the cap keeps one account from running up cost

export function registerPersonalBrainRoutes(app, { store, requireWorkAuth, wrap }) {
  if (!app || !store || !requireWorkAuth || !wrap) throw new Error('registerPersonalBrainRoutes: missing deps')
  const uid = (req) => req.workUser.id
  const personalOnly = (req, res, next) => {
    if (req.workUser && req.workUser.companyId) return res.status(403).json({ error: 'Your company keeps its own brain. Ask your company admin to add documents there.', code: 'COMPANY_ACCOUNT' })
    next()
  }
  const recent = new Map()   // uid -> learn timestamps in the last hour
  const learnRateOk = (id) => {
    const now = Date.now()
    const list = (recent.get(id) || []).filter((t) => now - t < 3600_000)
    if (list.length >= LEARN_PER_HOUR) { recent.set(id, list); return false }
    list.push(now); recent.set(id, list)
    return true
  }
  const send = (res, fn) => {
    try { res.json(fn()) } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Server error', ...(e.code ? { code: e.code } : {}) }) }
  }

  app.get('/api/work/me/brain', requireWorkAuth, personalOnly, wrap((req, res) => {
    const tier = store.getWorkTier(uid(req))
    res.json({ ...store.listPersonalBrain(uid(req)), maxDocuments: store.workDocsMax(tier), filesKept: false })
  }))

  app.post('/api/work/me/brain/learn', requireWorkAuth, personalOnly, wrap(async (req, res) => {
    let doc
    try { doc = readDocUpload(req.body) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }
    // The plan's document count is the paid lever (the same one reference documents use).
    const tier = store.getWorkTier(uid(req))
    const max = store.workDocsMax(tier)
    const have = store.listPersonalBrain(uid(req)).sources.filter((s) => s.kind === 'document')
    const isRefresh = have.some((s) => s.name.toLowerCase() === doc.name.toLowerCase())
    if (!isRefresh && have.length >= max) return res.status(403).json({ error: `Your plan learns from up to ${max} document${max === 1 ? '' : 's'}. Forget one, or upgrade to teach it more.`, capReached: true, max, upgrade: true })
    if (!learnRateOk(uid(req))) return res.status(429).json({ error: 'That is a lot of learning for one hour. Try again a little later.' })
    try {
      res.json(await store.learnPersonalBrainDoc(uid(req), doc))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Could not learn from that document.', ...(e.code ? { code: e.code } : {}) })
    }
  }))

  app.post('/api/work/me/brain/notes', requireWorkAuth, personalOnly, wrap((req, res) => send(res, () => store.addPersonalBrainNotes(uid(req), (req.body || {}).notes))))
  app.delete('/api/work/me/brain/learnings/:id', requireWorkAuth, personalOnly, wrap((req, res) => send(res, () => store.forgetPersonalLearning(uid(req), req.params.id))))
  app.delete('/api/work/me/brain/sources/:id', requireWorkAuth, personalOnly, wrap((req, res) => send(res, () => store.forgetPersonalBrainSource(uid(req), req.params.id))))
  app.post('/api/work/me/brain/clear', requireWorkAuth, personalOnly, wrap((req, res) => send(res, () => store.clearPersonalBrain(uid(req)))))
}
