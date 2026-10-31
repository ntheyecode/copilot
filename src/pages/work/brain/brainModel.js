// Pure rules for the "Your brain" page (src/pages/work/brain/): which files
// the page accepts before anything is sent, how the API's sources and
// learnings are grouped into rows, how a learn result is read, and which
// message key an API error maps to. No React, no I/O, no network; the page
// and its hook consume this and brainModel.test.mjs gates it.
//
// The server is the authority on every limit (server/doc_upload.js,
// personal_brain_routes.js); the checks here only spare a person a round trip
// for a file that can never be read. The same type list and size cap are
// mirrored, never widened.

export const MAX_BYTES = 10 * 1024 * 1024
// Accepted on the picker (the server's classifyDoc list).
export const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'
const TYPE_RE = /\.(pdf|docx|txt|md|markdown)$/i
const MIME_OK = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'])

// The source every cleanly finished guided task writes to (personal_brain.js).
export const SESSIONS_SOURCE = 'sessions'
export const KINDS = ['fact', 'procedure', 'preference', 'term', 'warning']

// { ok: true } or { ok: false, reason: 'type' | 'size' | 'empty' }.
export function checkFile(file) {
  if (!file) return { ok: false, reason: 'empty' }
  const name = String(file.name || '')
  const mime = String(file.type || '').toLowerCase()
  if (!TYPE_RE.test(name) && !MIME_OK.has(mime)) return { ok: false, reason: 'type' }
  if (Number(file.size) > MAX_BYTES) return { ok: false, reason: 'size' }
  if (!(Number(file.size) > 0)) return { ok: false, reason: 'empty' }
  return { ok: true }
}

// The kind chip for a learning; anything unknown reads as a fact.
export function kindOf(l) { return KINDS.includes(l && l.kind) ? l.kind : 'fact' }

// Rows for the page: one per source, newest first, each with ITS learnings
// (newest first). "Your sessions" is always a row, even before the first
// finished task wrote to it, so the page can explain how it fills up; it is
// listed last when empty and never counts as a document.
export function groupBySource(data) {
  const sources = Array.isArray(data && data.sources) ? data.sources : []
  const learnings = Array.isArray(data && data.learnings) ? data.learnings : []
  const rows = sources.map((s) => ({
    id: s.id, name: s.name, kind: s.kind === 'sessions' ? 'sessions' : 'document', learnedAt: s.learnedAt,
    learnings: learnings.filter((l) => Array.isArray(l.sources) && l.sources.includes(s.id)),
  }))
  if (!rows.some((r) => r.kind === 'sessions')) rows.push({ id: SESSIONS_SOURCE, name: '', kind: 'sessions', learnedAt: null, learnings: [], placeholder: true })
  return rows
}

export function documentCount(data) {
  return (Array.isArray(data && data.sources) ? data.sources : []).filter((s) => s.kind === 'document').length
}

// What the plan allows, as the meter reads it.
export function docMeter(data) {
  const used = documentCount(data)
  const max = Number(data && data.maxDocuments) || 0
  return { used, max, reached: max > 0 && used >= max }
}

// Everything the page says after a document was learned, as message keys with
// their variables (the page translates). `refreshed` = the same document came
// again and replaced what it taught before.
export function resultLines(r) {
  if (!r) return []
  const name = (r.source && r.source.name) || ''
  // What the document taught = new learnings + the ones it already knew (the
  // server attributes both to the source, so this is the row's count too).
  const n = (Number(r.added) || 0) + (Number(r.merged) || 0)
  const lines = []
  if (r.source && r.source.refreshed) lines.push({ key: 'refreshed', n, vars: { name, n } })
  else lines.push({ key: 'learned', n, vars: { name, n } })
  if (Number(r.merged) > 0) lines.push({ key: 'merged', n: Number(r.merged), vars: { n: Number(r.merged) } })
  if (Number(r.masked) > 0) lines.push({ key: 'masked', n: Number(r.masked), vars: { n: Number(r.masked) } })
  if (r.truncated) lines.push({ key: 'truncated', n: 0, vars: {} })
  return lines
}

// An API failure to the message the person reads (brainPage.errors.<key>) and
// whether the upgrade path belongs next to it. Every status the API documents
// has its own actionable line; anything else collapses to the generic one.
export function errorKey(err) {
  const status = err && err.status
  const code = (err && err.data && err.data.code) || (err && err.code) || ''
  const data = (err && err.data) || {}
  if (code === 'COMPANY_ACCOUNT') return { key: 'company', upgrade: false }
  if (code === 'AI_NOT_CONFIGURED' || status === 503) return { key: 'notReady', upgrade: false }
  if (status === 403 && (data.capReached || data.upgrade)) return { key: 'cap', upgrade: true, max: Number(data.max) || 0 }
  if (status === 413) return { key: 'tooLarge', upgrade: false }
  if (status === 415) return { key: 'type', upgrade: false }
  if (status === 422) return { key: code === 'NOTHING_LEARNED' ? 'nothingLearned' : 'unreadable', upgrade: false }
  if (status === 429) return { key: 'hourly', upgrade: false }
  if (status === 400) return { key: 'badFile', upgrade: false }
  if (status === 401) return { key: 'signedOut', upgrade: false }
  return { key: 'generic', upgrade: false }
}

// A local file check failure to its message key.
export function fileErrorKey(reason) {
  return reason === 'size' ? 'tooLarge' : reason === 'type' ? 'type' : 'badFile'
}
