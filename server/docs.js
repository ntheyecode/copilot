// ---------------------------------------------------------------------------
// WorkCoPilot - document text extraction for the AI's session knowledge.
// Text/Markdown/code read directly; PDF via pdf-parse; Word (.docx) via mammoth.
// Lean port: file uploads only. No URL fetching (and so no SSRF surface).
// ---------------------------------------------------------------------------
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|log|ya?ml|xml|html?|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|go|rb|rs|php|sh|sql|ini|conf|env|toml)$/i

export async function extractText({ name, mime, base64 }) {
  const buf = Buffer.from(base64 || '', 'base64')
  if (!buf.length) throw httpErr(400, 'Empty file')
  const lower = (name || '').toLowerCase()
  const m = mime || ''

  if (m.startsWith('text/') || m === 'application/json' || TEXT_EXT.test(lower)) {
    return buf.toString('utf8')
  }
  if (m === 'application/pdf' || lower.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buf })
    try {
      const r = await parser.getText()
      return (r?.text || '').trim()
    } finally {
      await parser.destroy?.()
    }
  }
  if (lower.endsWith('.docx') || m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const r = await mammoth.extractRawText({ buffer: buf })
    return (r?.value || '').trim()
  }
  throw httpErr(400, 'Unsupported file type. Upload text, Markdown, code, PDF, or Word (.docx).')
}
