// Pure rules for the enterprise project-management UI (src/pages/work/pm/*).
// No React, no I/O: every decision the dashboards make (which bucket a task is
// in, a project's status, the counts on a card, the manager roll-up, risk order,
// the fallback people directory, how a log row reads) is decided here once and
// unit-tested in pmModel.test.mjs (SUPREME RULE II single source, XV small
// module). Shapes mirror server/work_roles_routes.js + server/store.js:
//   project = { id, companyId, managerId, name, goal, state, held, heldReason, endState, tasks[], customerId }
//   task    = { id, title, goal, doneState, state(pending|active|done|rerun), assigneeId, assignedBy, assignedAt, order, dependsOn, sessionId }
//   risk    = { kind: sla_breach|project_held|unassigned_idle, projectId, projectName, taskId?, taskTitle?, managerId?, ageDays?, reason? }
//   stats   = { total, status:{done,ongoing,held}, byManager:[{managerId,projects,tasks,done}] }
//   log row = { at, kind, by, projectId, taskId?, from?, to?, reason?, managerId? }
import { tasksOf, sortedTasks, progress, isLocked } from '../projects/projectModel.js'

export { tasksOf, sortedTasks, progress }

export const BUCKETS = ['notStarted', 'inProgress', 'completed']
export const STATUSES = ['ongoing', 'held', 'done']
const DAY_MS = 86400000

// A task's bucket for the PM filters and the counts. A rerun task needs doing
// again, so it sits with the not-started work (the server's productivity report
// still counts rerun separately; see the panel).
export function taskBucket(t) {
  const s = t && t.state
  if (s === 'done') return 'completed'
  if (s === 'active') return 'inProgress'
  return 'notStarted'
}
export function groupTasks(p) {
  const out = { notStarted: [], inProgress: [], completed: [] }
  for (const t of sortedTasks(p)) out[taskBucket(t)].push(t)
  return out
}
export function filterTasks(p, bucket) {
  const all = sortedTasks(p)
  return !bucket || bucket === 'all' ? all : all.filter((t) => taskBucket(t) === bucket)
}

// A project's one status word, exactly as the server's stats count it.
export function projectStatus(p) {
  if (!p) return 'ongoing'
  if (p.held) return 'held'
  return p.state === 'done' ? 'done' : 'ongoing'
}
export function filterProjects(list, status) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : []
  return !status || status === 'all' ? arr : arr.filter((p) => projectStatus(p) === status)
}
export function statusCounts(list) {
  const c = { all: 0, ongoing: 0, held: 0, done: 0 }
  for (const p of (Array.isArray(list) ? list : [])) { if (!p) continue; c.all++; c[projectStatus(p)]++ }
  return c
}

// Card counts: total / done / in progress / not started / assigned / unassigned.
export function projectCounts(p) {
  const all = tasksOf(p)
  const g = groupTasks(p)
  return {
    total: all.length,
    done: g.completed.length,
    inProgress: g.inProgress.length,
    notStarted: g.notStarted.length,
    assigned: all.filter((t) => t.assigneeId).length,
    unassigned: all.filter((t) => !t.assigneeId && t.state !== 'done').length,
    pct: progress(p).pct,
  }
}

// Whole days since an ISO time (0 = today); null when unknown.
export function daysSince(iso, now = Date.now()) {
  if (!iso) return null
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / DAY_MS)
}
// A task waiting past the SLA window since its assignment (not done, not active).
export function taskSlaDays(t, slaDays = 5, now = Date.now()) {
  if (!t || !t.assignedAt || t.state === 'done' || t.state === 'active') return null
  const d = daysSince(t.assignedAt, now)
  return d != null && d > slaDays ? d : null
}

// Merge the server's per-manager stats with the project list into one roll-up,
// one row per manager (plus "unassigned" when a project has no manager), sorted
// by projects managed then name. Names come from the people directory when it is
// readable (nameOf), else the id.
export function rollupByManager(projects, stats, nameOf) {
  const rows = new Map()
  const label = (id) => (nameOf ? nameOf(id) : String(id || ''))
  for (const s of ((stats && stats.byManager) || [])) {
    rows.set(String(s.managerId), { managerId: String(s.managerId), name: label(s.managerId), projects: Number(s.projects) || 0, tasks: Number(s.tasks) || 0, done: Number(s.done) || 0, list: [] })
  }
  for (const p of (Array.isArray(projects) ? projects : [])) {
    if (!p) continue
    const k = String(p.managerId || 'unassigned')
    if (!rows.has(k)) rows.set(k, { managerId: k, name: label(k), projects: 0, tasks: 0, done: 0, list: [] })
    rows.get(k).list.push(p)
  }
  // Without stats (a PM-only reader) derive the numbers from the projects.
  for (const r of rows.values()) {
    if (!r.projects && r.list.length) {
      r.projects = r.list.length
      for (const p of r.list) { for (const t of tasksOf(p)) { r.tasks++; if (t.state === 'done') r.done++ } }
    }
  }
  return [...rows.values()].sort((a, b) => (b.projects - a.projects) || a.name.localeCompare(b.name))
}

// Risks in the order a reviewer acts on them: the oldest SLA breaches first, then
// ready-but-unassigned tasks, then held projects.
const RISK_RANK = { sla_breach: 0, unassigned_idle: 1, project_held: 2 }
export function sortRisks(risks) {
  return (Array.isArray(risks) ? risks.filter(Boolean) : []).slice().sort((a, b) => {
    const ra = RISK_RANK[a.kind] ?? 9, rb = RISK_RANK[b.kind] ?? 9
    if (ra !== rb) return ra - rb
    return (Number(b.ageDays) || 0) - (Number(a.ageDays) || 0)
  })
}
export function riskCounts(risks) {
  const c = { total: 0, sla_breach: 0, unassigned_idle: 0, project_held: 0 }
  for (const r of (Array.isArray(risks) ? risks : [])) { if (!r) continue; c.total++; if (c[r.kind] != null) c[r.kind]++ }
  return c
}

// People directory. The readable directory (company admin) gives names + flows;
// when the server refuses it (a PM), every id seen in the projects, stats and
// log still gets an entry so the UI can label and pick, just by id. ONE lookup.
// A derived entry also records what the data PROVES about the person: seen as
// a task assignee (so they are on a worker / mixed flow) or as a project
// manager (so they hold a PM role); the pickers use that when no flow is known.
export function peopleIndex(users, { projects, stats, log, me } = {}) {
  const map = new Map()
  const add = (id, extra) => {
    if (!id) return
    const k = String(id)
    const cur = map.get(k) || { id: k, displayName: null, username: null, companyRole: null, workFlow: null, derived: true, seenAsAssignee: false, seenAsManager: false }
    map.set(k, { ...cur, ...(extra || {}) })
  }
  for (const u of (Array.isArray(users) ? users : [])) if (u && u.id) add(u.id, { ...u, id: String(u.id), derived: false })
  if (me && me.id) add(me.id, { displayName: me.displayName || null, username: me.username || null, companyRole: me.companyRole || null, workFlow: me.workFlow || null, derived: false })
  for (const p of (Array.isArray(projects) ? projects : [])) {
    if (!p) continue
    add(p.managerId, { seenAsManager: true })
    for (const t of tasksOf(p)) { add(t.assigneeId, { seenAsAssignee: true }); add(t.assignedBy) }
  }
  for (const s of ((stats && stats.byManager) || [])) if (s.managerId !== 'unassigned') add(s.managerId, { seenAsManager: true })
  for (const e of (Array.isArray(log) ? log : [])) {
    if (!e) continue
    add(e.by)
    if (e.kind === 'task_assigned' || e.kind === 'task_reassigned') { add(e.from, { seenAsAssignee: true }); add(e.to, { seenAsAssignee: true }) }
    else if (e.kind === 'project_reassigned') { add(e.from, { seenAsManager: true }); add(e.to, { seenAsManager: true }) }
    add(e.managerId, { seenAsManager: true })
  }
  return map
}
// Display name for an id: name, else username, else a short "Person <id>" via the caller's formatter.
export function nameFor(index, id, fallback) {
  if (!id) return ''
  const u = index && index.get(String(id))
  if (u && (u.displayName || u.username)) return u.displayName || u.username
  return fallback ? fallback(String(id)) : String(id)
}

// Log rows -> one readable line each. Returns { kind, who, project, detail }
// pieces; the caller translates the kind and composes the sentence.
export const LOG_KINDS = ['project_created', 'task_assigned', 'task_reassigned', 'project_reassigned', 'project_held', 'project_resumed']
export function logKind(e) { return LOG_KINDS.includes(e && e.kind) ? e.kind : 'other' }
export function projectNameOf(projects, id) {
  const p = (Array.isArray(projects) ? projects : []).find((x) => x && x.id === id)
  return p ? p.name : (id ? String(id) : '')
}
export function taskTitleOf(projects, projectId, taskId) {
  const p = (Array.isArray(projects) ? projects : []).find((x) => x && x.id === projectId)
  const t = p ? tasksOf(p).find((x) => x.id === taskId) : null
  return t ? t.title : (taskId ? String(taskId) : '')
}

// The Worker queue item -> what its one button does, mirroring the server's
// transitions (pending -> expand; active with a session -> continue; done -> open).
export function queueAction(item) {
  const t = item && item.task
  if (!t) return null
  if (t.state === 'done') return t.sessionId ? 'open' : null
  if (t.state === 'active') return t.sessionId ? 'continue' : 'start'
  if (t.state === 'rerun') return 'startAgain'
  return 'start'
}
export function sortQueue(items) {
  const rank = { active: 0, rerun: 1, pending: 2, done: 3 }
  return (Array.isArray(items) ? items.filter((i) => i && i.task) : []).slice().sort((a, b) => {
    const ra = rank[a.task.state] ?? 2, rb = rank[b.task.state] ?? 2
    if (ra !== rb) return ra - rb
    return String(a.task.assignedAt || '').localeCompare(String(b.task.assignedAt || ''))
  })
}

// Share of max, 0..100 (honest: no bar when max is 0).
export function pctOf(value, max) {
  const v = Math.max(0, Number(value) || 0), m = Number(max) || 0
  return m > 0 ? Math.min(100, Math.round((v / m) * 100)) : 0
}
export { isLocked }
