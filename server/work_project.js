// Customer > Project > Task > Step model (Depth-2 / Projects). Pure constructors,
// state transitions, and the dependency-aware next/available-task resolver. The
// store persists these; the engine (plan/expand/inject) and the endpoints build on
// them. A Task is the project MAP unit: it carries its goal + done-state +
// dependencies up front; its micro-steps are expanded just-in-time (expanded flag +
// a work-session id) so later tasks absorb earlier tasks' learnings and stay fresh.
// Pure + unit-tested without db state (SUPREME II single source, XV small module).

export const PROJECT_STATES = ['planning', 'active', 'done', 'archived']
export const TASK_STATES = ['pending', 'active', 'done', 'rerun']

export function normalizeEndState(e) {
  if (!e || typeof e !== 'object') return { done: '', checks: [] }
  return {
    done: String(e.done || '').trim(),
    checks: Array.isArray(e.checks) ? e.checks.map((c) => String(c || '').trim()).filter(Boolean).slice(0, 20) : [],
  }
}

export function newProject({ id, workUserId, customerId = 'default', name, goal, endState = null, companyId = null, managerId = null, now = Date.now() }) {
  return {
    id,
    workUserId,                       // creator (kept for backward-compat with per-user projects)
    companyId: companyId || null,     // owning tenant (null = an individual's personal project)
    managerId: managerId || null,     // the PM who manages this project (company projects)
    customerId: customerId || 'default',
    name: String(name || '').trim() || 'Untitled project',
    goal: String(goal || '').trim(),
    endState: normalizeEndState(endState),
    state: 'planning',
    held: false,                      // a PM may hold a project (with a reason); auto-held when fully blocked
    heldReason: null,
    createdAt: new Date(now).toISOString(),
    tasks: [],        // ordered task descriptors (the map, planned up front)
    learnings: [],    // forward-learnings ledger; each finished task appends
  }
}

// A task descriptor in the project map. Steps are NOT here - they are expanded
// just-in-time into a work session (sessionId) when the task becomes active.
export function newTask({ id, title, goal, doneState = '', order = 0, dependsOn = [], overview = '' }) {
  return {
    id,
    title: String(title || '').trim(),
    goal: String(goal || '').trim() || String(title || '').trim(),
    doneState: String(doneState || '').trim(),
    // A rich, readable "what you'll do in this task" overview (bold/==highlight==/
    // *italic* markers), shown when resuming or scanning. Derived if the planner
    // did not supply one (see store.deriveTaskOverview).
    overview: String(overview || '').trim(),
    order: Number(order) || 0,
    dependsOn: Array.isArray(dependsOn) ? dependsOn.filter(Boolean) : [],
    state: 'pending',
    expanded: false,
    sessionId: null,
    assigneeId: null,   // the company user doing this task (enterprise assignment)
    assignedBy: null,   // the PM/admin who assigned or reassigned it
    assignedAt: null,   // ISO time of the latest (re)assignment; the SLA/risk clock
    outcome: null,
    telemetry: null,   // persisted at all times (what planned/guided it, deepened, failover, duration)
    startedAt: null,
    endedAt: null,
  }
}

// Valid task state transitions (never an invalid jump). pending<->active (start/pause),
// active->done, done->rerun, rerun->active/done.
const TASK_EDGES = {
  pending: ['active'],
  active: ['done', 'pending'],
  done: ['rerun'],
  rerun: ['active', 'done'],
}
export function canTransitionTask(from, to) {
  return TASK_STATES.includes(to) && (from === to || (TASK_EDGES[from] || []).includes(to))
}

const byOrder = (a, b) => (a.order - b.order) || 0
const taskById = (project, id) => (project.tasks || []).find((t) => t && t.id === id) || null
const isDone = (t) => t && t.state === 'done'

// Are all of a task's dependencies satisfied (done)?
export function dependenciesMet(project, task) {
  if (!task || !Array.isArray(task.dependsOn) || !task.dependsOn.length) return true
  return task.dependsOn.every((depId) => isDone(taskById(project, depId)))
}

// The single next task to guide: the lowest-order pending task whose dependencies
// are all done. null when nothing is actionable (all done, or blocked).
export function nextActionableTask(project) {
  const pend = (project.tasks || []).filter((t) => t && t.state === 'pending').sort(byOrder)
  return pend.find((t) => dependenciesMet(project, t)) || null
}

// Every pending task that is ready now (dependencies met) - the "pick the next one,
// or any other independent task" set, lowest order first.
export function availableTasks(project) {
  return (project.tasks || []).filter((t) => t && t.state === 'pending' && dependenciesMet(project, t)).sort(byOrder)
}

export function isProjectDone(project) {
  const tasks = project.tasks || []
  return tasks.length > 0 && tasks.every(isDone)
}

// Project state derived from its tasks: done when all done; active once any task has
// started (left pending); else planning.
export function deriveProjectState(project) {
  const tasks = project.tasks || []
  if (!tasks.length) return 'planning'
  if (tasks.every(isDone)) return 'done'
  if (tasks.some((t) => t.state !== 'pending')) return 'active'
  return 'planning'
}

// Append a generalized learning to the forward ledger (deduped, bounded). The next
// task's just-in-time expansion reads this so task N benefits from tasks 1..N-1.
export function appendLearning(project, fact, source = null) {
  const f = String(fact || '').trim()
  if (!f) return project.learnings || []
  const ledger = Array.isArray(project.learnings) ? project.learnings.slice() : []
  if (ledger.some((l) => l && String(l.fact || l).toLowerCase() === f.toLowerCase())) return ledger
  ledger.push({ fact: f, source: source || null })
  return ledger.slice(-100)
}
