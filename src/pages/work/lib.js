// Shared utilities for the WorkCoPilot signed-in app (src/pages/work/*).
// Moved verbatim from WorkPage.jsx during the Step-1 shell/route split: the
// on-device capture + file-parse helpers (used by the guiding console) and the
// shell style objects. Behavior unchanged.
import { isDlpActive } from '../../scrub.js'
import { redactFrame } from '../../frame_scrub.js'

export const linkHost = (u) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return 'link' } }

// Read a file the user attaches MID-TASK into a context payload for the engine.
// An image (screenshot or phone photo) is returned as a data URL, on-device
// redacted first when DLP is on (so sensitive pixels never leave). A text-readable
// file is returned as plain text. A binary doc (PDF/Word) the browser cannot read
// is flagged unsupported with a clear message - the desktop app extracts those,
// and on the web the user can paste the text instead. Never throws.
const CONTEXT_TEXT_RE = /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|ini|conf|cfg|xml|html?|rtf)$/i
export async function readContextFile(file) {
  if (!file) return {}
  const name = String(file.name || '')
  const isImg = String(file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(name)
  if (isImg) {
    try {
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('read failed')); fr.readAsDataURL(file) })
      const image = isDlpActive() ? await redactFrame(dataUrl).catch(() => dataUrl) : dataUrl
      return { image }
    } catch { return { error: 'That image could not be read. Try another.' } }
  }
  if (CONTEXT_TEXT_RE.test(name) || String(file.type || '').startsWith('text/')) {
    try { const text = await file.text(); return { docsText: String(text || '').slice(0, 8000) } }
    catch { return { error: 'That file could not be read.' } }
  }
  return { error: 'On the web you can attach an image or a text file, or paste the text. The desktop app also reads PDFs and Word files.' }
}

// ===========================================================================
// On-device data parsing for "Compute from a file". The WHOLE point is privacy:
// the attached CSV / Excel file is read ENTIRELY here in the browser. The raw
// rows never leave the machine - only a derived schema (column names + types)
// and the row count are ever sent, to plan a safe computation that is then run
// locally. Nothing here touches the network.
// ===========================================================================

// A small, robust CSV parser. Handles quoted fields, embedded commas, escaped
// quotes (""), and CRLF / LF line endings. Returns an array of string rows.
// Newlines inside a quoted field are preserved. No dependency.
function parseCsv(text) {
  const s = String(text == null ? '' : text)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === ',') { row.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }         // CR is dropped; LF ends the row
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Infer a column's type from its (non-empty) values. 'number' when every value
// is numeric once $ , % and spaces are stripped; 'date' when the values parse as
// dates and look date-shaped (so plain integers are not mistaken for dates);
// otherwise 'string'.
function looksNumeric(v) {
  const n = String(v).replace(/[$,%\s]/g, '')
  return n !== '' && /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(n)
}
function looksDate(v) {
  const s = String(v).trim()
  if (!s || looksNumeric(s)) return false
  if (!/[-/:]|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(s)) return false
  return !Number.isNaN(Date.parse(s))
}
function inferType(values) {
  const vals = values.map((v) => String(v == null ? '' : v).trim()).filter((v) => v !== '')
  if (!vals.length) return 'string'
  if (vals.every(looksNumeric)) return 'number'
  if (vals.every(looksDate)) return 'date'
  return 'string'
}

// Turn a matrix (array of string rows) into a table: unique column names, row
// objects keyed by column name, an inferred schema, and the row count. Blank rows
// are dropped. The first non-empty row is the header. Returns { name, rows,
// schema, rowCount } or { error }.
function matrixToTable(matrix, name) {
  const grid = (matrix || []).map((r) => (Array.isArray(r) ? r : [r]))
    .filter((r) => r.some((c) => String(c == null ? '' : c).trim() !== ''))
  if (!grid.length) return { error: 'That file has no data in it. Check it has a header row and at least one row of values.' }
  const rawHead = grid[0]
  const names = []
  const seen = Object.create(null)
  rawHead.forEach((h, i) => {
    let nm = String(h == null ? '' : h).trim() || `Column ${i + 1}`
    if (seen[nm] != null) { seen[nm] += 1; nm = `${nm} (${seen[nm]})` } else { seen[nm] = 0 }
    names.push(nm)
  })
  const dataRows = grid.slice(1)
  const rows = dataRows.map((r) => {
    const o = {}
    names.forEach((nm, i) => { o[nm] = r[i] == null ? '' : r[i] })
    return o
  })
  const schema = names.map((nm) => ({ name: nm, type: inferType(rows.map((r) => r[nm])) }))
  return { name: String(name || 'file'), rows, schema, rowCount: rows.length }
}

const XLSX_RE = /\.(xlsx|xlsm|xls)$/i
// Parse an attached file on the device. CSV / text is read directly; a spreadsheet
// lazily loads SheetJS from a pinned CDN (the same pattern the app already uses
// for tesseract.js) ONLY when a spreadsheet is picked, and reads its first sheet.
// Never throws; a failure comes back as { error } with a clear, actionable message.
export async function parseDataFile(file) {
  if (!file) return { error: 'No file was selected.' }
  const name = String(file.name || '')
  const isXlsx = XLSX_RE.test(name) || /spreadsheetml|ms-excel/i.test(String(file.type || ''))
  if (isXlsx) {
    let XLSX
    try {
      XLSX = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')
    } catch {
      return { error: 'The spreadsheet reader could not load (you may be offline). Save the sheet as CSV and attach that instead.' }
    }
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const first = (wb.SheetNames || [])[0]
      const ws = first ? wb.Sheets[first] : null
      if (!ws) return { error: 'That workbook has no readable sheet. Save the first sheet as CSV and attach that.' }
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: false })
      return matrixToTable(aoa, name)
    } catch {
      return { error: 'That spreadsheet could not be read. Save the first sheet as CSV and attach that instead.' }
    }
  }
  try {
    const text = await file.text()
    return matrixToTable(parseCsv(text), name)
  } catch {
    return { error: 'That file could not be read. Attach a .csv, .xlsx or .xls file.' }
  }
}

export const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }
export const shell = { minHeight: '100vh', background: 'var(--bg)' }

// ---- frame pipeline (cost discipline) -------------------------------------
// Downscale any capture to <=1280px wide JPEG. This is THE cost lever: the model
// is billed per image token, which scales with resolution, so a 4K screen is
// shrunk before it ever leaves the machine.
const MAX_W = 1280
// The continuous watch loop runs many times an hour, and the image is the bulk of
// each call's cost, so its frames are smaller (still readable for UI state). The
// one-off plan / "what is this" reads keep the full 1280 for detail.
export const WATCH_MAX_W = 1024
export function frameFromVideo(video, maxW = MAX_W) {
  if (!video || !video.videoWidth) return null
  const scale = Math.min(1, maxW / video.videoWidth)
  const w = Math.round(video.videoWidth * scale)
  const h = Math.round(video.videoHeight * scale)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, w, h)
  return c.toDataURL('image/jpeg', 0.6)
}
// A tiny grayscale signature for change detection, so an unchanged screen costs
// nothing (no frame is sent). Returns a Uint8 array of ~48x30 luma.
export function signatureFromVideo(video) {
  if (!video || !video.videoWidth) return null
  const w = 48, h = 30
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); ctx.drawImage(video, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const out = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) out[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0
  return out
}
export function changed(a, b, threshold = 6) {
  if (!a || !b || a.length !== b.length) return true
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return (sum / a.length) > threshold
}
// True on phones and tablets, where getDisplayMedia (screen share) is not
// available, so the camera "Photo" capture is the primary way to show
// WorkCoPilot a screen, a device or paper.
export function isMobileUA() {
  try { return /Android|iPhone|iPad|iPod|Mobile/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '') } catch { return false }
}
// Build a downscaled JPEG frame from a chosen image file (the mobile Photo
// path). Same <=1280px, quality 0.6 budget as frameFromVideo, so a photo costs
// the same as a live frame. Dependency-free: decodes via an Image onto a canvas.
export function frameFromImageFile(file, maxW = MAX_W) {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        try {
          const iw = img.naturalWidth || img.width || maxW
          const ih = img.naturalHeight || img.height || maxW
          const scale = Math.min(1, maxW / iw)
          const w = Math.round(iw * scale), h = Math.round(ih * scale)
          const c = document.createElement('canvas'); c.width = w; c.height = h
          c.getContext('2d').drawImage(img, 0, 0, w, h)
          resolve(c.toDataURL('image/jpeg', 0.6))
        } catch (e2) { reject(e2) } finally { try { URL.revokeObjectURL(url) } catch {} }
      }
      img.onerror = () => { try { URL.revokeObjectURL(url) } catch {}; reject(new Error('decode failed')) }
      img.src = url
    } catch (e) { reject(e) }
  })
}
