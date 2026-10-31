// On-device screen-frame redaction.
//
// When data protection is on, we OCR the outbound screen frame IN THE BROWSER,
// run the recognized text through the SAME DLP engine used for typed text, and
// black out any line that contains a sensitive value BEFORE the frame is sent.
// The image never leaves the device with readable sensitive text in it.
//
// Honest limits: OCR is imperfect on downscaled frames, so this is a strong
// backstop, not a mathematical guarantee. The person also controls what is on
// screen and (on the installed app) which display is shared. The engine is
// loaded lazily from a CDN only when protection is on, so it costs nothing for
// users who do not use it.
import { scrubSensitive, scrubWithPolicy } from '../server/work-scrub.js'
import { activePolicy } from './scrub.js'
import { OCR_DIST as DIST, OCR_CORE as CORE, OCR_LANG as LANG, OCR_OUTPUT, ocrLines, ocrLostLineBoxes } from './shared/ocr_engine.js'

let workerPromise = null
let unavailable = false   // set once if OCR cannot load, so we stop retrying every frame

async function getWorker() {
  if (unavailable) throw new Error('ocr unavailable')
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    const mod = await import(/* @vite-ignore */ `${DIST}/tesseract.esm.min.js`)
    const createWorker = mod.createWorker || (mod.default && mod.default.createWorker)
    if (!createWorker) throw new Error('no createWorker')
    return createWorker('eng', 1, { workerPath: `${DIST}/worker.min.js`, corePath: CORE, langPath: LANG, logger: () => {} })
  })().catch((e) => { workerPromise = null; unavailable = true; throw e })
  return workerPromise
}

// Warm the engine up front (call when a session with DLP starts) so the first
// real frame is not delayed by the cold download. Safe to call repeatedly.
export function warmFrameScrub() { getWorker().catch(() => {}) }
export function frameScrubAvailable() { return !unavailable }

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = dataUrl
  })
}

// Redact a frame data URL on-device. Returns a new JPEG data URL with sensitive
// lines masked, the original when nothing sensitive was found, or (when OCR is
// unavailable) a heavily downscaled copy as a fail-safe so fine text is not left
// readable. `strict` (default true) controls the fail-safe fallback.
export async function redactFrame(dataUrl, { strict = true } = {}) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return dataUrl
  let img
  try { img = await loadImage(dataUrl) } catch { return dataUrl }
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height
  if (!W || !H) return dataUrl
  try {
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const worker = await getWorker()
    const { data } = await worker.recognize(canvas, {}, OCR_OUTPUT)
    const lines = ocrLines(data)
    // Text but no line boxes means the result shape is not what we can mask
    // with: treat it as OCR failure (the fail-safe below), never as "clean".
    if (ocrLostLineBoxes(data, lines)) throw new Error('ocr returned no line boxes')
    ctx.fillStyle = '#000'
    let masked = 0
    // Use the user's EFFECTIVE governance policy when one is armed, so the SAME
    // custom rules and block words that scrub typed text also mask a sensitive
    // line in the screenshot. Falls back to the built-in detectors otherwise.
    const pol = (() => { try { return activePolicy() } catch { return null } })()
    const hit = (t) => { try { return (pol ? scrubWithPolicy(t, pol) : scrubSensitive(t)).total > 0 } catch { return scrubSensitive(t).total > 0 } }
    for (const ln of lines) {
      const text = String(ln.text || '')
      if (!text.trim()) continue
      // Mask the whole line when it carries ANY sensitive value: safer than
      // trying to pinpoint the word, and robust to values split across words.
      if (hit(text)) {
        const b = ln.bbox || ln
        if (b && Number.isFinite(b.x0)) {
          ctx.fillRect(b.x0 - 3, b.y0 - 3, (b.x1 - b.x0) + 6, (b.y1 - b.y0) + 6)
          masked++
        }
      }
    }
    return masked ? canvas.toDataURL('image/jpeg', 0.6) : dataUrl
  } catch {
    // OCR could not run. Fail safe in strict mode: return a heavily downscaled
    // copy so small text is not legible. Not a guarantee, but better than the
    // full-resolution frame. In non-strict mode, return the original.
    if (!strict) return dataUrl
    try {
      const s = 0.45
      const c2 = document.createElement('canvas')
      c2.width = Math.max(16, Math.round(W * s)); c2.height = Math.max(16, Math.round(H * s))
      c2.getContext('2d').drawImage(img, 0, 0, c2.width, c2.height)
      return c2.toDataURL('image/jpeg', 0.5)
    } catch { return dataUrl }
  }
}
