// Project engine routes (Depth-2). Gated on store.canUseWorkProjects (Premium /
// company-deep); a non-deep user gets the upgrade-or-shorten fork, never a project.
// Create = plan the map (AI) -> zero-tolerance validate -> persist. Expand = reuse
// workPlan for ONE task's steps, grounded in the project's forward-learnings ledger,
// into a work session linked to the task. Inject = dedupe + place by dependency.
// Self-contained register (SUPREME XV); thin over the tested modules + store.
import { planProjectMap } from './work_project_plan.js'
import { validateBreakdown, shouldBeProject } from './work_project_validate.js'
import { buildProjectReport } from './work_project_report.js'

export function registerWorkProjectRoutes(app, { store, work, ai, requireWorkAuth, wrap, resolveWorkRuntime, bestPlanningCall, sendWorkError, readLocale }) {
  const denyIfNotDeep = (req, res) => {
    if (store.canUseWorkProjects(req.workUser.id)) return false
    res.status(403).json({ error: 'Projects are a Premium feature. Upgrade to run this as a guided project, or shorten it to a single task you can start now.', needsUpgrade: true })
    return true
  }

  // List the user's projects (optionally for one customer).
  app.get('/api/work/projects', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    res.json({ projects: store.listWorkProjects(req.workUser.id, { customerId: req.query.customer || null }) })
  }))

  // One project + what to do next / which tasks are pickable now.
  app.get('/api/work/projects/:id', requireWorkAuth, wrap((req, res) => {
    const p = store.getWorkProject(req.workUser.id, req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    res.json({
      project: p,
      next: store.nextWorkProjectTask(req.workUser.id, p.id),
      available: store.availableWorkProjectTasks(req.workUser.id, p.id),
    })
  }))

  // Create: plan the map with the best model, run the zero-tolerance gate, persist.
  app.post('/api/work/projects', requireWorkAuth, async (req, res) => {
    try {
      if (denyIfNotDeep(req, res)) return
      const goal = String((req.body || {}).goal || '').trim()
      if (!goal) return res.status(400).json({ error: 'Say what the project should achieve.' })
      const customerId = String((req.body || {}).customerId || 'default')
      const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
      const bp = await bestPlanningCall(req, rr, false); const call = bp.call
      const map = await planProjectMap(ai, call.rt, { base: store.getSystemPrompt(), goal, strong: call.backup })
      if (map.refusal) return res.json({ refusal: map.refusal })
      // Zero-tolerance gate: a single workflow is NOT a project; a project must pass
      // validateBreakdown (no filler/duplicate task, valid acyclic deps, end state set).
      const vTasks = map.tasks.map((t, i) => ({ id: String(i), title: t.title, goal: t.goal, doneState: t.doneState, dependsOn: (t.dependsOn || []).map(String) }))
      if (!shouldBeProject(vTasks)) {
        return res.status(422).json({ singleTask: true, error: 'This is really a single task, not a project. Start it as a task.', suggestedGoal: (map.tasks[0] && map.tasks[0].goal) || goal })
      }
      const v = validateBreakdown({ goal, endState: map.endState, tasks: vTasks })
      if (!v.ok) return res.status(422).json({ error: 'The project breakdown did not pass the quality gate.', errors: v.errors })
      const name = String((req.body || {}).name || map.name || 'Project')
      const project = store.createWorkProject(req.workUser.id, { customerId, name, goal, endState: map.endState, tasks: map.tasks })
      res.json({ project })
    } catch (e) { sendWorkError(res, e, req) }
  })

  // Expand ONE task into steps just-in-time (reuses workPlan), grounded in the
  // forward-learnings ledger; lands in a work session linked to the task.
  app.post('/api/work/projects/:id/tasks/:taskId/expand', requireWorkAuth, async (req, res) => {
    try {
      if (denyIfNotDeep(req, res)) return
      const p = store.getWorkProject(req.workUser.id, req.params.id)
      if (!p) return res.status(404).json({ error: 'Project not found' })
      const task = (p.tasks || []).find((t) => t.id === req.params.taskId)
      if (!task) return res.status(404).json({ error: 'Task not found' })
      const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
      const bp = await bestPlanningCall(req, rr, false); const call = bp.call
      const ledger = (p.learnings || []).map((l) => `- ${(l && l.fact) || l}`).join('\n')
      const plan = await work.workPlan(ai, call.rt, {
        base: store.getSystemPrompt(), mode: 'stepwise', level: 'medium',
        goal: task.goal || task.title, learnings: ledger, strong: call.backup, locale: readLocale(req),
      })
      if (plan.refusal) return res.json({ refusal: plan.refusal })
      const session = store.createWorkSession(req.workUser.id, { goal: task.goal || task.title })
      store.setWorkSessionSteps(req.workUser.id, session.id, plan.steps)
      store.linkWorkProjectTaskSession(req.workUser.id, p.id, task.id, session.id)
      store.setWorkProjectTaskState(req.workUser.id, p.id, task.id, 'active', { sessionId: session.id })
      const fresh = store.getWorkProject(req.workUser.id, p.id)
      res.json({ sessionId: session.id, steps: plan.steps, task: (fresh.tasks || []).find((t) => t.id === task.id) })
    } catch (e) { sendWorkError(res, e, req) }
  })

  // Mid-journey: add a new request. Dedupe against planned tasks, else create + place.
  app.post('/api/work/projects/:id/inject', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const out = store.injectWorkProjectTask(req.workUser.id, req.params.id, {
      request: (req.body || {}).request, blocksTaskId: (req.body || {}).blocksTaskId || null, dependsOn: (req.body || {}).dependsOn || null,
    })
    res.json(out)
  }))

  // Set a task's state (pause/done/rerun). Guarded by the store transition rules.
  app.post('/api/work/projects/:id/tasks/:taskId/state', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const t = store.setWorkProjectTaskState(req.workUser.id, req.params.id, req.params.taskId, String((req.body || {}).state || ''))
    res.json({ task: t })
  }))

  // Generate a project report on demand: success (all completed tasks' outcomes +
  // steps + end state), security, or error. Aggregates each task's guided session.
  app.post('/api/work/projects/:id/report', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const p = store.getWorkProject(req.workUser.id, req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    const sessionsByTaskId = {}
    for (const t of (p.tasks || [])) {
      if (!t.sessionId) continue
      const s = store.getWorkSession(req.workUser.id, t.sessionId)
      if (s) sessionsByTaskId[t.id] = s
    }
    res.json({ report: buildProjectReport(p, sessionsByTaskId, String((req.body || {}).kind || 'success')) })
  }))
}
