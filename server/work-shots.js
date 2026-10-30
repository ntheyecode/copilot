// ---------------------------------------------------------------------------
// WorkCoPilot - per-step screenshots
//
// Phase 3 backend: the console POSTs the (client-downscaled) screenshot it
// captured for a step; the store writes it to disk and records it on the
// session so the PDF report can embed it under the matching step.
//
// This module only registers the upload route. The store does the decode +
// disk write + cap (store.addWorkStepShot); pdf.js does the embedding. The
// data-URL rule lives once in image_data_url.js (shared with the Teach workflow
// frames). Nothing here fails silently: a bad or oversize data URL returns a
// clear 4xx with a reason (SUPREME RULE III).
// ---------------------------------------------------------------------------
import { isImageDataUrl, parseImageDataUrl } from './image_data_url.js'

export function registerWorkShotRoutes(app, { store, requireWorkAuth, wrap }) {
  // POST a screenshot for a step. The console calls this once per changed frame
  // while watching a step. Body: { stepIndex:int, dataUrl:string, caption?:string }.
  app.post('/api/work/sessions/:id/shot', requireWorkAuth, wrap((req, res) => {
    const body = req.body || {}
    const dataUrl = body.dataUrl

    // Must be an image data URL.
    if (!isImageDataUrl(dataUrl)) {
      return res.status(400).json({ error: 'dataUrl must be an image data URL (data:image/...).' })
    }

    // stepIndex must be a non-negative integer.
    const stepIndex = Number(body.stepIndex)
    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      return res.status(400).json({ error: 'stepIndex must be a non-negative integer.' })
    }

    // Payload + size guard (same messages and order as before; one shared rule).
    const v = parseImageDataUrl(dataUrl, { decode: false })
    if (!v.ok) return res.status(v.status).json({ error: v.error })

    // The session must exist for this work user.
    if (!store.getWorkSession(req.workUser.id, req.params.id)) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const caption = typeof body.caption === 'string' ? body.caption : ''
    const result = store.addWorkStepShot(req.workUser.id, req.params.id, { stepIndex, dataUrl, caption })
    res.json(result)
  }))
}
