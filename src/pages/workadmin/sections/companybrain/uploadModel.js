// Pure rules for "Add documents" in the company console's Company Brain
// section (no React, no fetch, so they run under node --test): which files the
// server takes (mirrors server/doc_upload.js), the pre-flight a file fails
// before anything is sent, the sentences a server result turns into, and the
// one actionable error key every failure maps to. The server is the authority;
// the pre-flight only saves a round trip for the two things the browser can
// see (type and size). Strings live under companyBrain.add.* (the keys below
// are suffixes of companyBrain.add.result.* and companyBrain.add.errors.*).
export const MAX_BYTES = 10 * 1024 * 1024   // server/doc_upload.js MAX_RAW_BYTES
export const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'

// The order the server does things in; the row shows the phase it is in. The
// browser only knows two for sure: it reads the file itself, then one request
// masks and stores. No percentage, since the server reports none.
export const PHASES = ['reading', 'storing']

// Same classification as server/doc_upload.js classifyDoc (name first, mime second).
export function classifyDoc(name, mime) {
  const lower = String(name || '').toLowerCase()
  const m = String(mime || '').toLowerCase()
  if (m === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) return 'docx'
  if (m === 'text/markdown' || lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md'
  if (m === 'text/plain' || lower.endsWith('.txt')) return 'txt'
  return null
}

// null when the file may be sent; else the error key (companyBrain.add.errors.<key>).
export function preflight(file) {
  if (!file || !file.name) return 'read'
  if (!classifyDoc(file.name, file.type)) return 'type'
  if (Number(file.size) > MAX_BYTES) return 'size'
  if (Number(file.size) === 0) return 'noText'
  return null
}

// Sentences for one server result, in reading order:
//   added / unchanged (exactly one of them), replaced, masked, notKept.
// Each entry is { key, n, vars } for t.n('companyBrain.add.result.<key>', n, vars).
export function resultLines(r, name) {
  const out = []
  if (!r) return out
  const accepted = Number(r.accepted) || 0
  const unchanged = Number(r.unchanged) || 0
  const masked = Number(r.masked) || 0
  const vars = { name: String(name || (r.source && r.source.title) || '') }
  if (accepted > 0) out.push({ key: 'added', n: accepted, vars })
  else out.push({ key: 'unchanged', n: unchanged, vars })
  // "Replaced" only when something new was stored: an identical re-upload is
  // "already up to date", not a replacement, however the source row was renewed.
  if (accepted > 0 && r.source && r.source.replaced) out.push({ key: 'replaced', n: 1, vars })
  if (masked > 0) out.push({ key: 'masked', n: masked, vars })
  out.push({ key: 'notKept', n: 1, vars })
  return out
}

// Map any failure (a pre-flight key, an API error with .status/.data, a thrown
// read error, a network drop) to { key, locked, retry }: the error key
// (companyBrain.add.errors.<key>), whether the brain is locked (the row then
// points at the unlock control), and whether "Try again" makes sense.
export function errorOf(e) {
  if (typeof e === 'string') return { key: e, locked: false, retry: e === 'read' }
  const status = e && Number(e.status)
  const code = e && e.data && e.data.code
  if (code === 'BRAIN_LOCKED' || status === 423) return { key: 'locked', locked: true, retry: true }
  if (status === 415) return { key: 'type', locked: false, retry: false }
  if (status === 413) return { key: 'size', locked: false, retry: false }
  if (status === 422) return { key: 'noText', locked: false, retry: false }
  if (status === 429) return { key: 'rate', locked: false, retry: true }
  if (status === 403) return { key: 'forbidden', locked: false, retry: false }
  if (status === 400) return { key: 'read', locked: false, retry: true }
  return { key: 'server', locked: false, retry: true }
}

// True when the server said retrieval is keyword-based (no meaning-based
// search on this server). Stated to the admin once; never a model name.
export function keywordsOnly(r) { return !!r && r.search === 'keywords' }
