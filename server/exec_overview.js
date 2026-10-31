// ===========================================================================
// WorkCoPilot EXECUTIVE OVERVIEW: pure aggregation for the executive dashboard.
// Composes the task/session productivity (companyProductivity) with the PROJECT
// dimension the executives asked for: performers on BOTH axes (many tasks, and
// many projects), projects with the most/largest tasks, a status rollup, and
// per-project detail. No db, no I/O, fully unit-tested; the store feeds it the
// already company-scoped data and this module only crunches it.
//
// Business rule (same as companyProductivity): NO AI model and NO AI cost ever
// appears here. The only money figure is the customer's HYPOTHETICAL ROI, which
// lives inside `productivity.estimated` and is passed through untouched.
// ===========================================================================

export function execOverview({ productivity = null, projects = [], members = [], topN = 10 } = {}) {
  const projs = Array.isArray(projects) ? projects : []
  const mem = Array.isArray(members) ? members : []
  const nameOf = new Map(mem.map((u) => [String(u.id), u.name || u.displayName || u.username || String(u.id)]))
  const name = (id) => nameOf.get(String(id)) || 'Unknown'

  // Per-project rollup: task load, completion, assignees, manager, status.
  const rollup = projs.map((p) => {
    const tasks = Array.isArray(p.tasks) ? p.tasks : []
    const done = tasks.filter((t) => t && t.state === 'done').length
    const assignees = new Set(tasks.map((t) => t && t.assigneeId).filter(Boolean))
    const status = p.held ? 'held' : (p.state === 'done' ? 'done' : 'ongoing')
    return {
      id: p.id, name: p.name || 'Project', status,
      managerId: p.managerId || null, managerName: p.managerId ? name(p.managerId) : null,
      taskCount: tasks.length, doneCount: done,
      completionPct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      assigneeCount: assignees.size,
    }
  })
  // Projects with the most / largest tasks (the big-project views).
  const topByTasks = [...rollup].sort((a, b) => (b.taskCount - a.taskCount) || (b.doneCount - a.doneCount)).slice(0, topN)
  const status = { done: 0, ongoing: 0, held: 0 }
  for (const r of rollup) status[r.status]++

  // Performers, PROJECT axis: distinct projects a person has a task in, projects
  // they manage, and their project-task counts.
  const projectsOf = new Map()      // id -> Set(projectId) they have a task in
  const manages = new Map()         // id -> # projects managed
  const tasksAssigned = new Map()
  const tasksDone = new Map()
  for (const p of projs) {
    if (p.managerId) manages.set(String(p.managerId), (manages.get(String(p.managerId)) || 0) + 1)
    for (const t of (p.tasks || [])) {
      if (!t || !t.assigneeId) continue
      const k = String(t.assigneeId)
      if (!projectsOf.has(k)) projectsOf.set(k, new Set())
      projectsOf.get(k).add(p.id)
      tasksAssigned.set(k, (tasksAssigned.get(k) || 0) + 1)
      if (t.state === 'done') tasksDone.set(k, (tasksDone.get(k) || 0) + 1)
    }
  }
  const everyone = new Set([...projectsOf.keys(), ...manages.keys()])
  const byProjects = [...everyone].map((k) => ({
    id: k, name: name(k),
    projects: (projectsOf.get(k) || new Set()).size,
    manages: manages.get(k) || 0,
    tasksAssigned: tasksAssigned.get(k) || 0,
    tasksDone: tasksDone.get(k) || 0,
  })).sort((a, b) => (b.projects - a.projects) || (b.manages - a.manages) || (b.tasksDone - a.tasksDone)).slice(0, topN)

  // Performers, TASK axis: the full guided-task ranking from the session
  // productivity (not just the dashboard's top 8).
  const byTasks = (productivity && Array.isArray(productivity.membersRanked))
    ? productivity.membersRanked.slice(0, topN)
    : ((productivity && productivity.topMembers) || [])

  return {
    generatedAt: new Date().toISOString(),
    productivity,                                   // the existing task/session metrics + ROI, passed through
    projects: { total: projs.length, status, rollup, topByTasks },
    performers: { byTasks, byProjects },
  }
}

export default { execOverview }
