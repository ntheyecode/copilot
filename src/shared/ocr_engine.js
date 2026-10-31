// The on-device OCR engine (tesseract.js): ONE place for its version, where the
// browser loads it from, and how its result is read.
//
// Version: the browser loads this exact version from the CDN; the desktop app
// bundles the same one (workcopilot/package.json), and the E2E suite serves the
// CDN URLs from that bundled copy. ocr_engine.test.mjs fails if they drift.
//
// Reading lines: since tesseract.js 6 a recognize() result has no top-level
// `lines` or `words`; they come only from `blocks`, which must be requested.
// A version bump that silently drops line boxes would leave a sensitive line
// unmasked, so the screen redactor treats "text but no line boxes" as OCR
// failure (see src/frame_scrub.js) and falls back to its fail-safe.
export const OCR_VERSION = '7.0.0'
export const OCR_DIST = `https://cdn.jsdelivr.net/npm/tesseract.js@${OCR_VERSION}/dist`
export const OCR_CORE = `https://cdn.jsdelivr.net/npm/tesseract.js-core@${OCR_VERSION}`
export const OCR_LANG = 'https://tessdata.projectnaptha.com/4.0.0'

// The output to ask recognize() for: plain text plus the block tree.
export const OCR_OUTPUT = { text: true, blocks: true }

// Every recognized line as { text, bbox: { x0, y0, x1, y1 } }, from the block
// tree (tesseract.js 6+) or a legacy top-level `lines` array (5.x).
export function ocrLines(data) {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.blocks)) {
    const out = []
    for (const b of data.blocks) {
      for (const p of (b && Array.isArray(b.paragraphs) ? b.paragraphs : [])) {
        for (const ln of (p && Array.isArray(p.lines) ? p.lines : [])) if (ln) out.push(ln)
      }
    }
    return out
  }
  return Array.isArray(data.lines) ? data.lines.filter(Boolean) : []
}

// True when OCR read text but returned no line boxes to mask it with.
export function ocrLostLineBoxes(data, lines) {
  return !!(data && typeof data.text === 'string' && data.text.trim()) && !(lines && lines.length)
}
