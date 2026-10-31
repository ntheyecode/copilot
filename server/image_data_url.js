// ---------------------------------------------------------------------------
// WorkCoPilot - shared validator for uploaded image data URLs.
//
// ONE copy of the rule (SUPREME RULE II), used by every route that accepts a
// client-captured image: the per-step session screenshot (work-shots.js) and
// the Teach workflow frame (workflows_store.js). Nothing fails silently: a bad
// or oversize payload comes back as { ok:false, status, error } with a clear
// reason the route returns as-is (SUPREME RULE III).
// ---------------------------------------------------------------------------

// Guard the decoded payload well under the 12mb JSON body limit. Frames are
// downscaled client-side; this is a defensive backstop, not the primary limit.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // ~3MB

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Decoded byte length of a base64 string, without allocating a Buffer.
export function base64DecodedBytes(b64) {
  const len = b64.length
  if (!len) return 0
  let pad = 0
  if (b64.charCodeAt(len - 1) === 61) pad++ // '='
  if (b64.charCodeAt(len - 2) === 61) pad++
  return Math.floor((len * 3) / 4) - pad
}

export function isImageDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')
}

// Validate an image data URL. On success: { ok:true, mime, ext, decodedBytes,
// buffer } where `ext` is 'jpg'|'png'|'webp' (null for any other image type,
// which a caller may still accept, as the session-shot route does) and `buffer`
// is the decoded bytes unless { decode:false }.
export function parseImageDataUrl(dataUrl, { maxBytes = MAX_IMAGE_BYTES, decode = true } = {}) {
  if (!isImageDataUrl(dataUrl)) return { ok: false, status: 400, error: 'dataUrl must be an image data URL (data:image/...).' }
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return { ok: false, status: 400, error: 'dataUrl is malformed (no base64 payload).' }
  const b64 = dataUrl.slice(comma + 1)
  const decodedBytes = base64DecodedBytes(b64)
  if (decodedBytes <= 0) return { ok: false, status: 400, error: 'dataUrl has no image payload.' }
  if (decodedBytes > maxBytes) return { ok: false, status: 413, error: 'Screenshot too large; downscale before upload (max ~3MB).' }
  const m = /^data:(image\/[a-z0-9.+-]+)/i.exec(dataUrl)
  const mime = m ? m[1].toLowerCase() : null
  return { ok: true, mime, ext: EXT_BY_MIME[mime] || null, decodedBytes, buffer: decode ? Buffer.from(b64, 'base64') : null }
}

export default { MAX_IMAGE_BYTES, base64DecodedBytes, isImageDataUrl, parseImageDataUrl }
