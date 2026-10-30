// Pure rules for the Workflow issues inbox (Wave 3 part C UI). No React, no
// fetch: everything here is unit-tested (incidentsModel.test.mjs) and shared by
// the inbox page, its rows, the Teach studio link, the shell badge and the
// executive card, so a label, a filter or an error mapping lives in ONE place.
//
// The server sends structured fields only (kind, state, stepIndex, titles); the
// UI words every label in the reader's language from these keys and never shows
// a raw code. An incident is about the WORKFLOW (what the guide noticed on
// screen), never about a person's performance, and the wording keeps it so.

// The deviation kinds the server raises (server/workflow_deviation.js
// DEVIATION_KINDS). An unknown future kind reads as the neutral `other`.
export const INCIDENT_KINDS = ['ui_changed', 'error', 'blocked', 'untrained_path', 'skipped']
export const INCIDENT_STATES = ['open', 'acknowledged', 'resolved', 'dismissed']
const ACTIVE = new Set(['open', 'acknowledged'])

// Inbox filters, in display order, and the `state` each sends to the API
// (`all` sends none).
export const STATE_FILTERS = ['active', 'resolved', 'dismissed', 'all']
export function stateParam(filter) {
  return STATE_FILTERS.includes(filter) && filter !== 'all' ? filter : undefined
}
export function normalizeFilter(v) { return STATE_FILTERS.includes(v) ? v : 'active' }

export function kindKey(kind) {
  return INCIDENT_KINDS.includes(kind) ? kind : 'other'
}
export const kindLabelKey = (kind) => `wfIssues.kind.${kindKey(kind)}`
// Calm tints: only an error reads warm; a changed screen or a new path is
// information for the trainer, not an alarm.
const KIND_TINT = { ui_changed: 'blue', error: 'red', blocked: 'amber', untrained_path: 'green', skipped: 'neutral', other: 'neutral' }
export const kindTint = (kind) => KIND_TINT[kindKey(kind)]

export const isActive = (inc) => !!inc && ACTIVE.has(inc.state)
export const isAdopted = (inc) => !!inc && inc.resolution === 'adopted'

// The state badge: an adopted step reads "Added to draft", not just "Resolved".
export function stateLabelKey(inc) {
  if (isAdopted(inc)) return 'wfIssues.state.adopted'
  return INCIDENT_STATES.includes(inc && inc.state) ? `wfIssues.state.${inc.state}` : 'wfIssues.state.open'
}
const STATE_TINT = { open: 'amber', acknowledged: 'blue', resolved: 'green', dismissed: 'neutral' }
export function stateTint(inc) {
  if (isAdopted(inc)) return 'green'
  return STATE_TINT[inc && inc.state] || 'neutral'
}

// 1-based step number for people, or null (plan-mode incidents carry no index).
export function stepNumber(stepIndex) {
  return Number.isInteger(stepIndex) && stepIndex >= 0 ? stepIndex + 1 : null
}

// The state changes a manager may make from the incident's current state.
// Each is { action, to } where `action` names the button/i18n key.
export function stateActions(inc, canManage) {
  if (!canManage || !inc) return []
  if (inc.state === 'open') return [{ action: 'acknowledge', to: 'acknowledged' }, { action: 'resolve', to: 'resolved' }, { action: 'dismiss', to: 'dismissed' }]
  if (inc.state === 'acknowledged') return [{ action: 'resolve', to: 'resolved' }, { action: 'dismiss', to: 'dismissed' }]
  if (inc.state === 'resolved' || inc.state === 'dismissed') return [{ action: 'reopen', to: 'open' }]
  return []
}

// Where an adopted step can be reviewed: the draft, opened in the Teach studio.
export function draftHref(draftId) {
  return draftId ? `/work/teach?draft=${encodeURIComponent(draftId)}` : null
}
export const INBOX_PATH = '/work/workflow-issues'

// Summary chips: the active states, then the active count per kind (kinds with
// none are left out so the row stays calm). Each chip is { key, n, kind? }.
export function summaryChips(summary) {
  const s = summary || {}
  const out = [
    { key: 'wfIssues.summary.open', n: Number(s.open) || 0, tint: 'amber' },
    { key: 'wfIssues.summary.acknowledged', n: Number(s.acknowledged) || 0, tint: 'blue' },
  ]
  const by = s.byKind || {}
  for (const kind of INCIDENT_KINDS) {
    const n = Number(by[kind]) || 0
    if (n > 0) out.push({ key: kindLabelKey(kind), n, kind, tint: kindTint(kind) })
  }
  return out
}
// Active incident count per kind, every kind present (the executive card shows
// all five so a zero reads as "fine", not as missing).
export function activeByKind(summary) {
  const by = (summary && summary.byKind) || {}
  return INCIDENT_KINDS.map((kind) => ({ kind, n: Number(by[kind]) || 0 }))
}
export function activeTotal(summary) {
  const s = summary || {}
  return (Number(s.open) || 0) + (Number(s.acknowledged) || 0)
}

// The workflow a record belongs to, across versions (group id first).
export const workflowKeyOf = (inc) => (inc && inc.workflowRef && (inc.workflowRef.groupId || inc.workflowRef.id)) || ''

// Workflow filter options from the loaded list (newest title wins), sorted by
// title; a selected key that is not in the list is kept so the select never
// silently drops the reader's choice.
export function workflowOptions(incidents, selected) {
  const map = new Map()
  for (const inc of Array.isArray(incidents) ? incidents : []) {
    const key = workflowKeyOf(inc)
    if (!key || map.has(key)) continue
    map.set(key, { key, title: (inc.workflowRef && inc.workflowRef.title) || '' })
  }
  if (selected && !map.has(selected)) map.set(selected, { key: selected, title: '' })
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
}
export function matchesWorkflow(inc, key) {
  if (!key) return true
  const r = (inc && inc.workflowRef) || {}
  return r.groupId === key || r.id === key
}

// Newest first by last occurrence (the server sorts the same way; a local state
// change keeps the order stable).
export function newestFirst(list) {
  return (Array.isArray(list) ? list.slice() : []).sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')))
}
export function visibleIncidents(incidents, workflowKey) {
  return newestFirst((Array.isArray(incidents) ? incidents : []).filter((x) => matchesWorkflow(x, workflowKey)))
}

// Replace one incident in the list with the server's updated shape.
export function replaceIncident(list, updated) {
  if (!updated || !updated.id) return list
  return (Array.isArray(list) ? list : []).map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
}

// A workflow alert, worded from its structured fields: { key, vars }.
export function alertTitle(alert) {
  const a = alert || {}
  const step = stepNumber(a.stepIndex)
  const kind = kindKey(a.kind)
  const workflow = String(a.workflowTitle || '').trim()
  const base = step != null ? 'wfIssues.alert.withStep' : 'wfIssues.alert.noStep'
  return { key: `${base}.${kind}`, vars: { workflow, step }, untitled: !workflow }
}
export const unreadAlerts = (alerts) => (Array.isArray(alerts) ? alerts : []).filter((a) => a && !a.read)

// Every API failure mapped to a reader-facing i18n key (the server's English
// text is never shown). `op` is the operation: load | state | adopt | frame.
// 409 carries several meanings without a code, so its message picks the key;
// anything unrecognised falls back to a friendly generic.
export function errorKey(err, op) {
  const status = Number(err && err.status) || 0
  const msg = String((err && err.message) || '').toLowerCase()
  if (status === 403) {
    if (op === 'state') return 'wfIssues.err.cannotManage'
    if (op === 'adopt') return 'wfIssues.err.notAuthor'
    return 'wfIssues.err.notRecipient'
  }
  if (status === 404) return op === 'load' ? 'wfIssues.err.load' : 'wfIssues.err.notFound'
  if (status === 409) {
    if (msg.includes('already closed')) return 'wfIssues.err.closed'
    if (msg.includes('waiting for review')) return 'wfIssues.err.inDraft'
    if (msg.includes('no longer live')) return 'wfIssues.err.notLive'
    if (msg.includes('no step to add')) return 'wfIssues.err.noStep'
    return 'wfIssues.err.conflict'
  }
  if (op === 'load') return 'wfIssues.err.load'
  if (op === 'adopt') return 'wfIssues.err.adopt'
  return 'wfIssues.err.save'
}
// After these the list on screen is stale, so the page reloads it.
export function shouldReload(err) {
  const status = Number(err && err.status) || 0
  return status === 404 || status === 409
}

// "3 hours ago" in the reader's locale (Intl, no translation needed), or ''.
const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
export function relTime(iso, nowMs, locale) {
  const ts = Date.parse(iso || '')
  if (!Number.isFinite(ts)) return ''
  const diff = Math.round((ts - (Number.isFinite(nowMs) ? nowMs : Date.now())) / 1000)
  let rtf
  try { rtf = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' }) } catch { rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) }
  const abs = Math.abs(diff)
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.trunc(diff / secs), unit)
  }
  return rtf.format(0, 'second')
}
export function absTime(iso, locale) {
  const ts = Date.parse(iso || '')
  if (!Number.isFinite(ts)) return ''
  try { return new Date(ts).toLocaleString(locale || 'en', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return new Date(ts).toISOString() }
}

// The note a manager adds to a state change: trimmed, bounded like the server.
export const NOTE_MAX = 500
export function cleanNote(v) { return String(v == null ? '' : v).trim().slice(0, NOTE_MAX) }
