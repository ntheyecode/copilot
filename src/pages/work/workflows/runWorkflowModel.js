// Pure helpers for "Company workflows" (Wave 3 part B, employee side): the rows,
// search and filter of the published workflows a company member can run, and
// what a refused run means. No React, no I/O; unit-tested in
// runWorkflowModel.test.mjs. The task-start gate flags (hours, open tasks,
// limits) are worded by src/shared/start_gate.js, not here.

const STR = (v) => (v == null ? '' : String(v)).trim()

// How many rows the dashboard shows before "Show all"; search and the category
// filter appear once the list is long enough to need them.
export const COMPACT_LIMIT = 5
export const SEARCH_FROM = 6

// One published workflow -> what its row shows.
export function workflowRow(w) {
  const meta = (w && w.meta) || {}
  const steps = Array.isArray(w && w.steps) ? w.steps.filter((s) => s && STR(s.instruction)).length : 0
  const dur = parseInt(meta.durationMin, 10)
  return {
    id: STR(w && w.id),
    title: STR(meta.title),
    product: STR(meta.productName),
    category: STR(meta.category),
    owner: STR(meta.owner),
    launchTarget: STR(meta.launchTarget),
    prerequisites: STR(meta.prerequisites),
    version: Number(w && w.version) || 1,
    durationMin: Number.isFinite(dur) && dur > 0 ? dur : null,
    steps,
  }
}

// The categories present, for the filter (case-insensitive, first spelling kept, sorted).
export function categoriesOf(rows) {
  const seen = new Map()
  for (const r of (Array.isArray(rows) ? rows : [])) {
    const c = STR(r && r.category)
    if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

// Search title, product, category and owner; every word must match somewhere.
export function filterRows(rows, { q = '', category = '' } = {}) {
  const words = STR(q).toLowerCase().split(/\s+/).filter(Boolean)
  const cat = STR(category).toLowerCase()
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    if (cat && STR(r.category).toLowerCase() !== cat) return false
    if (!words.length) return true
    const hay = [r.title, r.product, r.category, r.owner].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

// A refused run that is about the workflow itself (not the task gate), by code.
export function runErrorKey(err) {
  const code = err && err.data && err.data.code
  if (code === 'WORKFLOW_NOT_PUBLISHED') return 'workDashboard.workflows.err.notPublished'
  if (code === 'WORKFLOW_EMPTY') return 'workDashboard.workflows.err.empty'
  // The server checks visibility before state, so a workflow retired or replaced
  // since the list loaded answers 404 / 403 to everyone but its author and
  // admins: say it is no longer available. A 403 about the ACCOUNT (disabled,
  // agreements, step-up) is not about the workflow and keeps the server's words.
  const d = (err && err.data) || {}
  if (err && err.status === 404) return 'workDashboard.workflows.err.gone'
  if (err && err.status === 403 && !(d.legalRequired || d.locked || d.disabled)) return 'workDashboard.workflows.err.gone'
  return null
}
// After these the list is out of date (replaced, retired, removed): offer a reload.
export function runErrorReloads(err) {
  const code = err && err.data && err.data.code
  return code === 'WORKFLOW_NOT_PUBLISHED' || runErrorKey(err) === 'workDashboard.workflows.err.gone'
}

// Is this step's source the company workflow the session follows? Compared with
// the session's own workflowRef (authoritative), in the exact shape the server
// writes (server/workflow_playback.js: "Title (vN)").
export function isWorkflowSource(source, workflowRef) {
  const s = STR(source)
  const title = STR(workflowRef && workflowRef.title)
  if (!s || !title) return false
  return s === title || s === `${title} (v${Number(workflowRef.version) || 1})`
}
