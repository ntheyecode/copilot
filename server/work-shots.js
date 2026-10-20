// ---------------------------------------------------------------------------
// WorkCoPilot - per-step screenshots
//
// Phase 3 backend: the console POSTs the (client-downscaled) screenshot it
// captured for a step; the store writes it to disk and records it on the
// session so the PDF report can embed it under the matching step.
//
// This module only registers the upload route. The store does the decode +
// disk write + cap (store.addWorkStepShot); pdf.js does the embedding. Nothing
// here fails silently: a bad or oversize data URL returns a clear 4xx with a
// reason (SUPREME RULE III).
// ---------------------------------------------------------------------------

// Guard the decoded payload well under the 12mb JSON body limit. Frames are
// downscaled client-side; this is a defensive backstop, not the primary limit.
const MAX_DECODED_BYTES = 3 * 1024 * 1024 // ~3MB

// Decoded byte length of a base64 string, without allocating a Buffer.
function base64DecodedBytes(b64) {
  const len = b64.length
  if (!len) return 0
  let pad = 0
  if (b64.charCodeAt(len - 1) === 61) pad++ // '='
  if (b64.charCodeAt(len - 2) === 61) pad++
  return Math.floor((len * 3) / 4) - pad
}

export function registerWorkShotRoutes(app, { store, requireWorkAuth, wrap }) {
  // POST a screenshot for a step. The console calls this once per changed frame
  // while watching a step. Body: { stepIndex:int, dataUrl:string, caption?:string }.
  app.post('/api/work/sessions/:id/shot', requireWorkAuth, wrap((req, res) => {
    const body = req.body || {}
    const dataUrl = body.dataUrl

    // Must be an image data URL.
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'dataUrl must be an image data URL (data:image/...).' })
    }

    // stepIndex must be a non-negative integer.
    const stepIndex = Number(body.stepIndex)
    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      return res.status(400).json({ error: 'stepIndex must be a non-negative integer.' })
    }

    // Size guard: reject if the decoded image is too large.
    const comma = dataUrl.indexOf(',')
    if (comma < 0) {
      return res.status(400).json({ error: 'dataUrl is malformed (no base64 payload).' })
    }
    const b64 = dataUrl.slice(comma + 1)
    const decoded = base64DecodedBytes(b64)
    if (decoded <= 0) {
      return res.status(400).json({ error: 'dataUrl has no image payload.' })
    }
    if (decoded > MAX_DECODED_BYTES) {
      return res.status(413).json({ error: 'Screenshot too large; downscale before upload (max ~3MB).' })
    }

    // The session must exist for this work user.
    if (!store.getWorkSession(req.workUser.id, req.params.id)) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const caption = typeof body.caption === 'string' ? body.caption : ''
    const result = store.addWorkStepShot(req.workUser.id, req.params.id, { stepIndex, dataUrl, caption })
    res.json(result)
  }))
}
