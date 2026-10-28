// Pure rules for the Projects UI (src/pages/work/projects/*). No React, no I/O,
// so every decision the screens make (what a task may do in its state, whether
// it is locked, how a create response is classified, what a telemetry readout
// may show) is unit-tested here once and reused by every component (SUPREME
// RULE II single source, XV small module). Shapes mirror server/work_project.js:
//   project = { id, customerId, name, goal, endState:{done,checks[]}, state, tasks[], learnings[] }
//   task    = { id, title, goal, doneState, order, dependsOn[], state, expanded, sessionId, outcome, telemetry, startedAt, endedAt }

export const TASK_STATES = ['pending', 'active', 'done', 'rerun']
export const PROJECT_STATES = ['planning', 'active', 'done']

const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
export const tasksOf = (p) => (p && Array.isArray(p.tasks) ? p.tasks.filter(Boolean) : [])
export const sortedTasks = (p) => tasksOf(p).slice().sort(byOrder)
export const taskById = (p, id) => tasksOf(p).find((t) => t.id === id) || null

// Progress = done tasks over all tasks (a rerun task is no longer counted done:
// the person asked for a fresh result, so the finish line is open again).
export function progress(p) {
  const all = tasksOf(p)
  const done = all.filter((t) => t.state === 'done').length
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 }
}

// A task is locked while any task it waits for is not done. Done / active /
// rerun tasks are never locked (they already passed the gate).
export function isLocked(p, t) {
  if (!t || t.state !== 'pending') return false
  const deps = Array.isArray(t.dependsOn) ? t.dependsOn : []
  return deps.some((id) => { const d = taskById(p, id); return !d || d.state !== 'done' })
}
export function blockers(p, t) {
  const deps = Array.isArray(t && t.dependsOn) ? t.dependsOn : []
  return deps.map((id) => taskById(p, id)).filter((d) => d && d.state !== 'done')
}

// The visual key for a task: its state, or 'locked' for a pending task whose
// dependencies are not met. One key -> one icon + one color (TaskCard.jsx).
export function visualState(p, t) {
  if (!t) return 'pending'
  if (isLocked(p, t)) return 'locked'
  return TASK_STATES.includes(t.state) ? t.state : 'pending'
}

// What a task may do from its state. `primary` is the one button on the card;
// `menu` the secondary transitions behind "more". Mirrors the store's edges
// (pending<->active, active->done, done->rerun, rerun->active|done) so the UI
// never offers a transition the server would reject.
//   start       -> POST expand (plans the steps, opens the guided session)
//   continue    -> open the linked session
//   open        -> open the linked (finished) session
//   done/pause/rerun -> POST state
export function taskActions(p, t) {
  const v = visualState(p, t)
  if (v === 'locked') return { primary: null, menu: [] }
  if (v === 'pending') return { primary: 'start', menu: [] }
  if (v === 'active') return { primary: t.sessionId ? 'continue' : 'start', menu: ['done', 'pause'] }
  if (v === 'done') return { primary: t.sessionId ? 'open' : null, menu: ['rerun'] }
  if (v === 'rerun') return { primary: 'start', menu: ['done'] }
  return { primary: null, menu: [] }
}
export const ACTION_TO_STATE = { done: 'done', pause: 'pending', rerun: 'rerun' }

// Pick-next prompt: shown once any task is done and the project is not finished.
// `next` is the server's one task to do now; `others` the rest of what is ready.
export function pickNext(p, next, available) {
  const all = tasksOf(p)
  const doneTasks = all.filter((t) => t.state === 'done').sort((a, b) => String(b.endedAt || '').localeCompare(String(a.endedAt || '')))
  const finished = all.length > 0 && doneTasks.length === all.length
  if (finished) return { kind: 'complete', lastDone: doneTasks[0] || null }
  if (!doneTasks.length) return { kind: 'none' }
  const avail = (Array.isArray(available) ? available : []).filter(Boolean)
  const nxt = next || avail[0] || null
  const others = avail.filter((t) => !nxt || t.id !== nxt.id)
  if (!nxt) return { kind: 'blocked', lastDone: doneTasks[0] }
  return { kind: 'next', lastDone: doneTasks[0], next: nxt, others }
}

// Classify the create call's outcome into ONE of the screens the flow renders.
// A thrown api error carries err.status + err.data (src/api.js); a resolved
// body may be { project } | { singleTask } | { refusal }.
//   project   -> open it
//   single    -> "this is really one task", start it as a task (suggestedGoal)
//   refusal   -> the server's plain refusal text
//   upgrade   -> 403 needsUpgrade: upgrade-or-shorten fork
//   quality   -> 422 { errors } quality gate (shown gently)
//   error     -> anything else (generic, no internals leak)
export function classifyCreate(result, err) {
  if (!err && result) {
    if (result.project) return { kind: 'project', project: result.project }
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

// Inject outcome -> one notice. Server shapes: { duplicate:true, task } or
// { duplicate:false, created, placed } with placed = { before:id } | { after:id }
// | { appended:true, cycleAvoided?, reason? }.
export function classifyInject(p, out) {
  if (!out) return { kind: 'error' }
  if (out.duplicate) return { kind: 'duplicate', task: out.task || null }
  const created = out.created || null
  const placed = out.placed || {}
  if (placed.before) return { kind: 'before', task: created, other: taskById(p, placed.before) }
  if (placed.after) return { kind: 'after', task: created, other: taskById(p, placed.after) }
  return { kind: 'appended', task: created, cycleAvoided: !!placed.cycleAvoided }
}

// Telemetry readout: a WHITELIST of safe fields. Free-text values (what planned
// or guided a task) are never passed through, so a model or provider name can
// not reach the screen by any key (owner honesty rule, enforced at the class).
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null }
export function telemetryView(tel) {
  if (!tel || typeof tel !== 'object') return null
  const durationSec = num(tel.durationSec != null ? tel.durationSec : tel.durationSeconds != null ? tel.durationSeconds : tel.duration)
  const steps = num(tel.stepCount != null ? tel.stepCount : tel.steps)
  const reruns = num(tel.reruns)
  const out = {
    durationSec,
    steps: steps != null ? Math.round(steps) : null,
    deepened: tel.deepened === true,
    backup: tel.failover === true || tel.switched === true || (Array.isArray(tel.switches) && tel.switches.length > 0) || num(tel.failovers) > 0,
    success: tel.success === true ? true : tel.success === false ? false : null,
    reruns: reruns != null && reruns > 0 ? Math.round(reruns) : null,
  }
  const any = out.durationSec != null || out.steps != null || out.deepened || out.backup || out.success != null || out.reruns != null
  return any ? out : null
}

// Standalone single tasks = sessions not linked to any project task.
export function standaloneSessions(sessions, projects) {
  const linked = new Set()
  for (const p of (projects || [])) for (const t of tasksOf(p)) if (t.sessionId) linked.add(String(t.sessionId))
  return (Array.isArray(sessions) ? sessions : []).filter((s) => s && !linked.has(String(s.id)))
}

// Compact duration: 45s, 12 min, 1 h 20 min. Unit words come from the caller's
// catalog so the readout is translated.
export function fmtDur(sec, units) {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  const u = units || { h: 'h', min: 'min', s: 's' }
  if (s < 60) return `${s} ${u.s || 's'}`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} ${u.min}`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h} ${u.h} ${r} ${u.min}` : `${h} ${u.h}`
}
