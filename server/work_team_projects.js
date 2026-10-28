// Team projects - Model B (clone-to-many): the pure helpers (no IO, no store).
//
// A template is an ordinary project map (title / goal / done-state / dependsOn)
// that a PM or admin assigns to many people. Each person gets their OWN run - a
// normal single-user project they own - so the entire existing engine (just-in-
// time expansion, the forward-learnings ledger, mid-run injection, reports)
// carries over with NO ownership refactor. Completion is per person; the admin
// aggregates who is done.
//
// Privacy (firm constraint): a rollup shares ONLY task structure and completion
// state, NEVER one member's raw session evidence (frames, audit, outcome bodies).
// Those stay per person under that person's egress policy. US spelling.

// Convert a template's tasks (whose dependsOn are task IDs) into the SEED shape
// createWorkProject expects, where dependsOn are 0-based indices into the array.
// createWorkProject then mints fresh IDs for the run and remaps the indices, so a
// clone's dependency graph is correct and self-contained (no dangling template
// IDs leak into a run). Order is preserved; an unknown dependency id is dropped.
export function templateSeedTasks(templateTasks) {
  const list = Array.isArray(templateTasks) ? templateTasks : []
  const indexOfId = new Map(list.map((t, i) => [String(t && t.id), i]))
  return list.map((t, i) => ({
    title: (t && t.title) || '',
    goal: (t && t.goal) || '',
    doneState: (t && t.doneState) || '',
    order: t && t.order != null ? t.order : i + 1,
    dependsOn: (Array.isArray(t && t.dependsOn) ? t.dependsOn : [])
      .map((d) => indexOfId.has(String(d)) ? indexOfId.get(String(d)) : null)
      .filter((x) => x != null),
  }))
}

// Progress of one run, structure + completion ONLY (no evidence). Pure.
export function summarizeRun(project) {
  const tasks = (project && Array.isArray(project.tasks)) ? project.tasks : []
  const total = tasks.length
  const done = tasks.filter((t) => t && t.state === 'done').length
  const active = tasks.filter((t) => t && t.state === 'active').length
  const pending = tasks.filter((t) => t && (t.state === 'pending' || t.state === 'rerun')).length
  const percent = total ? Math.round((done / total) * 100) : 0
  // Latest structural timestamp across the run (never a session artifact).
  const stamps = tasks.map((t) => (t && (t.endedAt || t.startedAt)) || '').filter(Boolean)
  const lastActivityAt = stamps.sort().slice(-1)[0] || (project && project.createdAt) || null
  return { total, done, active, pending, percent, state: (project && project.state) || 'planning', lastActivityAt }
}

// Aggregate many runs of one template into an admin rollup. `nameFor(userId)`
// resolves a member's display name; everything returned is progress, never
// evidence. Rows are sorted least-complete first (who needs a nudge).
export function rollupRuns(runs, nameFor = () => null) {
  const rows = (Array.isArray(runs) ? runs : []).map((p) => ({
    userId: p.workUserId,
    name: nameFor(p.workUserId) || null,
    projectId: p.id,
    assignedAt: p.assignedAt || p.createdAt || null,
    ...summarizeRun(p),
  }))
  rows.sort((a, b) => (a.percent - b.percent) || String(a.name || '').localeCompare(String(b.name || '')))
  const n = rows.length
  const completed = rows.filter((r) => r.total > 0 && r.done === r.total).length
  const notStarted = rows.filter((r) => r.done === 0 && r.active === 0).length
  const avgPercent = n ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / n) : 0
  return { assigned: n, completed, inProgress: n - completed - notStarted, notStarted, avgPercent, runs: rows }
}

export default { templateSeedTasks, summarizeRun, rollupRuns }
