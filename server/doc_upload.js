// One uploaded document, checked the same way everywhere a person sends a file
// as base64 JSON (the reference documents in work-docs.js and the personal
// brain): name present, supported type (pdf, docx, txt, md), valid base64,
// under the size cap. Returns { name, mime, type, base64, size } or throws an
// error carrying the HTTP status and the person-facing message.
export const MAX_RAW_BYTES = 10 * 1024 * 1024

export function classifyDoc(name, mime) {
  const lower = String(name || '').toLowerCase()
  const m = String(mime || '').toLowerCase()
  if (m === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) return 'docx'
  if (m === 'text/markdown' || lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
  if (m === 'text/plain' || lower.endsWith('.txt')) return 'txt'
  return null
}

const fail = (status, error) => Object.assign(new Error(error), { status })

export function readDocUpload(body) {
  const b = body || {}
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const mime = typeof b.mime === 'string' ? b.mime.trim() : ''
  let data = b.dataBase64
  if (!name) throw fail(400, 'Missing document name.')
  if (typeof data !== 'string' || !data.trim()) throw fail(400, 'No file data received.')
  // Accept a data URL prefix (data:<mime>;base64,...) and any wrapping whitespace.
  data = data.trim()
  if (data.startsWith('data:')) { const comma = data.indexOf(','); if (comma !== -1) data = data.slice(comma + 1) }
  const clean = data.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw fail(400, 'The file data is not valid base64.')
  const type = classifyDoc(name, mime)
  if (!type) throw fail(415, 'Unsupported file type. Upload a PDF, Word (.docx), text (.txt), or Markdown (.md) file.')
  // Estimate from the base64 length first, then confirm with the real bytes.
  if (Math.floor((clean.length * 3) / 4) > MAX_RAW_BYTES) throw fail(413, 'That file is too large. The limit is 10 MB.')
  const size = Buffer.from(clean, 'base64').length
  if (!size) throw fail(400, 'The file data decoded to nothing.')
  if (size > MAX_RAW_BYTES) throw fail(413, 'That file is too large. The limit is 10 MB.')
  return { name, mime, type, base64: clean, size }
}
