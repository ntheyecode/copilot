// Pure rules for the project-templates UI (src/pages/work/pm/Templates*.jsx):
// how a template's counts read, how a create answer is classified, how an
// assign answer splits into assigned / skipped with a known reason key, and
// how one person's run on a template reads (state, percent, order). No React,
// no I/O; unit-tested in templatesModel.test.mjs (SUPREME II single source, XV
// small module). Shapes mirror the live server:
//   template = { id, name, goal, taskCount, createdAt, assignedCount }
//   rollup   = { template:{id,name,goal,taskCount}, assigned, completed, inProgress,
//                notStarted, avgPercent, runs:[run] }
//   run      = { userId, name, projectId, percent, done, total, active, pending,
//                state, assignedAt }
//   assign   = { assigned:[{userId,projectId}], skipped:[{userId,reason}] }
import { pctOf } from './pmModel.js'

export const RUN_STATES = ['notStarted', 'inProgress', 'completed']
export const SKIP_REASONS = ['already_assigned', 'not_in_company']

const n0 = (v) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : 0 }

// One template's numbers for its card.
export function templateCounts(tpl) {
  return { taskCount: n0(tpl && tpl.taskCount), assignedCount: n0(tpl && tpl.assignedCount) }
}
// Newest first; a missing date sorts last.
export function sortTemplates(list) {
  return (Array.isArray(list) ? list.filter(Boolean) : []).slice().sort((a, b) => {
    const ta = Date.parse(a.createdAt || '') || 0, tb = Date.parse(b.createdAt || '') || 0
    if (ta !== tb) return tb - ta
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}

// Create answer -> one outcome, the same vocabulary as the project engine
// (projectModel.classifyCreate) with `template` as the success shape:
//   { template } -> template | { refusal } -> refusal | 422 { singleTask } ->
//   single | 422 { errors } -> quality | 400 { error } -> invalid | else error
export function classifyTemplateCreate(result, err) {
  if (!err && result) {
    if (result.template) return { kind: 'template', template: result.template }
    if (result.singleTask) return { kind: 'single', suggestedGoal: String(result.suggestedGoal || '') }
    if (result.refusal) return { kind: 'refusal', text: String(result.refusal) }
    return { kind: 'error' }
  }
  const data = (err && err.data) || {}
  const status = err && err.status
  if (status === 403 && data.needsUpgrade) return { kind: 'upgrade' }
  if (data.singleTask) return { kind: 'single', suggestedGoal: String(data.suggestedGoal || '') }
  if (data.refusal) return { kind: 'refusal', text: String(data.refusal) }
  if (status === 422) return { kind: 'quality', errors: Array.isArray(data.errors) ? data.errors.map(String) : [] }
  if (status === 400 && data.error) return { kind: 'invalid', text: String(data.error) }
  return { kind: 'error' }
}

// A skip reason the server sends -> the i18n key the UI knows ('other' for any
// new vocabulary, shown honestly rather than hidden).
export function skipReasonKey(reason) {
  const r = String(reason || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return SKIP_REASONS.includes(r) ? r : 'other'
}
// Assign answer -> { assigned:[{userId,projectId}], skipped:[{userId,reason}] },
// every id a string, every reason a known key. A person asked for but absent
// from both lists is reported as skipped ('other') so nobody silently vanishes.
export function splitAssignOutcome(res, userIds) {
  const assigned = (Array.isArray(res && res.assigned) ? res.assigned : []).filter((x) => x && x.userId != null)
    .map((x) => ({ userId: String(x.userId), projectId: x.projectId != null ? String(x.projectId) : '' }))
  const skipped = (Array.isArray(res && res.skipped) ? res.skipped : []).filter((x) => x && x.userId != null)
    .map((x) => ({ userId: String(x.userId), reason: skipReasonKey(x.reason) }))
  const seen = new Set([...assigned.map((x) => x.userId), ...skipped.map((x) => x.userId)])
  for (const id of (Array.isArray(userIds) ? userIds : [])) { const k = String(id); if (!seen.has(k)) { skipped.push({ userId: k, reason: 'other' }); seen.add(k) } }
  return { assigned, skipped }
}

// ---- One person's run ----
export function runPercent(run) {
  const p = Number(run && run.percent)
  if (Number.isFinite(p)) return Math.max(0, Math.min(100, Math.round(p)))
  return pctOf(run && run.done, run && run.total)
}
// The server's state word wins; derive it only when missing.
export function runState(run) {
  const s = run && run.state
  if (RUN_STATES.includes(s)) return s
  const done = n0(run && run.done), total = n0(run && run.total), active = n0(run && run.active)
  if (total > 0 && done >= total) return 'completed'
  if (done > 0 || active > 0) return 'inProgress'
  return 'notStarted'
}
// Least complete first (the API already sorts; this keeps the order stable
// after a client-side re-read), ties by name.
export function sortRuns(runs) {
  return (Array.isArray(runs) ? runs.filter(Boolean) : []).slice().sort((a, b) => {
    const d = runPercent(a) - runPercent(b)
    if (d !== 0) return d
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}
// The summary numbers: the server's, with every missing one derived from the runs.
export function rollupSummary(r) {
  const runs = Array.isArray(r && r.runs) ? r.runs.filter(Boolean) : []
  const by = { notStarted: 0, inProgress: 0, completed: 0 }
  for (const run of runs) by[runState(run)]++
  const pick = (key, derived) => { const v = Number(r && r[key]); return Number.isFinite(v) && v >= 0 ? Math.round(v) : derived }
  const avg = runs.length ? Math.round(runs.reduce((s, run) => s + runPercent(run), 0) / runs.length) : 0
  return {
    assigned: pick('assigned', runs.length),
    completed: pick('completed', by.completed),
    inProgress: pick('inProgress', by.inProgress),
    notStarted: pick('notStarted', by.notStarted),
    avgPercent: Math.max(0, Math.min(100, pick('avgPercent', avg))),
  }
}

// Short date for cards and table cells ('' when unknown / unparsable).
export function fmtShortDate(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try { return d.toLocaleDateString(locale || undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d.toISOString().slice(0, 10) }
}
