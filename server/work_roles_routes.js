// Enterprise project-management routes (flows, roles, assignment, dashboards,
// risk, reports). Thin over the RBAC-enforcing store ops (every store function
// checks the acting user's companyRole + company, so segregation is server-side).
// The PM project-create reuses the AI map planner + the zero-tolerance gate, then
// persists a COMPANY project managed by the PM.
import { planProjectMap } from './work_project_plan.js'
import { validateBreakdown, shouldBeProject } from './work_project_validate.js'
import { parseAudioPayload, pickTranscribeRuntime, transcribeAudio, AI_NO_TRANSCRIBE } from './ai_transcribe.js'

export function registerWorkRolesRoutes(app, { store, work, ai, requireWorkAuth, requireWorkSubscription, guardUserText, wrap, resolveWorkRuntime, bestPlanningCall, sendWorkError, readLocale }) {
  // ---- PM / Sr PM / admin: projects ----

  // List the projects this user may see (PM: own; Sr PM / GRC / admin: all).
  app.get('/api/work/pm/projects', requireWorkAuth, wrap((req, res) => {
    res.json({ projects: store.listProjectsForUser(req.workUser.id, { managerId: req.query.manager || null }) })
  }))

  // One project (view-scoped) with its tasks + assignees.
  app.get('/api/work/pm/projects/:id', requireWorkAuth, wrap((req, res) => {
    const list = store.listProjectsForUser(req.workUser.id)
    const p = list.find((x) => x.id === req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    res.json({ project: p })
  }))

  // Create a managed company project: plan the map (AI) -> zero-tolerance gate ->
  // persist as a company project the PM manages. A goal is required; a Sr PM may
  // pass a managerId to hand it to another PM.
  app.post('/api/work/pm/projects', requireWorkAuth, requireWorkSubscription, async (req, res) => {
    try {
      // Cheap role gate BEFORE the AI plan call so a member/worker cannot burn
      // the company's AI budget (M2); goal through the OWASP-LLM guard (M3).
      if (!store.userCanManageProjects(req.workUser.id)) return res.status(403).json({ error: 'You do not have permission to create projects.' })
      const goal = String((req.body || {}).goal || '').trim()
      if (!goal) return res.status(400).json({ error: 'Say what the project should achieve.' })
      if (guardUserText && guardUserText(req, res, goal, 'goal') === 'refused') return
      const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
      const bp = await bestPlanningCall(req, rr, false); const call = bp.call
      const map = await planProjectMap(ai, call.rt, { base: store.getSystemPrompt(), goal, strong: call.backup })
      if (map.refusal) return res.json({ refusal: map.refusal })
      const vTasks = map.tasks.map((t, i) => ({ id: String(i), title: t.title, goal: t.goal, doneState: t.doneState, dependsOn: (t.dependsOn || []).map(String) }))
      if (!shouldBeProject(vTasks)) return res.status(422).json({ singleTask: true, error: 'This is really a single task, not a project.' })
      const v = validateBreakdown({ goal, endState: map.endState, tasks: vTasks })
      if (!v.ok) return res.status(422).json({ error: 'The project breakdown did not pass the quality gate.', errors: v.errors })
      const project = store.createCompanyProject(req.workUser.id, {
        customerId: String((req.body || {}).customerId || 'default'),
        name: String((req.body || {}).name || map.name || 'Project'),
        goal, endState: map.endState, tasks: map.tasks,
        managerId: (req.body || {}).managerId || null,
      })
      res.json({ project })
    } catch (e) { sendWorkError(res, e, req) }
  })

  // Assign (or reassign) a task to a company user.
  app.post('/api/work/pm/projects/:id/tasks/:taskId/assign', requireWorkAuth, wrap((req, res) => {
    const assigneeId = String((req.body || {}).assigneeId || '')
    if (!assigneeId) return res.status(400).json({ error: 'Pick a user to assign.' })
    res.json({ task: store.assignProjectTask(req.workUser.id, req.params.id, req.params.taskId, assigneeId) })
  }))

  // Hold / resume a project (PM, with a reason).
  app.post('/api/work/pm/projects/:id/hold', requireWorkAuth, wrap((req, res) => {
    const b = req.body || {}
    res.json({ project: store.holdProject(req.workUser.id, req.params.id, !!b.held, b.reason || '') })
  }))

  // Sr PM / admin: reassign a whole project to another PM.
  app.post('/api/work/pm/projects/:id/reassign', requireWorkAuth, wrap((req, res) => {
    const b = req.body || {}
    const managerId = String(b.managerId || '')
    if (!managerId) return res.status(400).json({ error: 'Pick a project manager.' })
    res.json({ project: store.reassignProject(req.workUser.id, req.params.id, managerId, b.reason || '') })
  }))

  // Per-user productivity (a PM reads an assignee; anyone reads their own).
  app.get('/api/work/pm/users/:uid/productivity', requireWorkAuth, wrap((req, res) => {
    res.json({ productivity: store.userProductivity(req.workUser.id, req.params.uid) })
  }))

  // ---- Worker: the assigned-task queue + running an assigned task ----
  app.get('/api/work/my/assigned', requireWorkAuth, wrap((req, res) => {
    res.json({ assigned: store.listAssignedTasks(req.workUser.id, { includeDone: !!req.query.done }) })
  }))

  // A worker expands THEIR assigned task into steps just-in-time (reuses workPlan,
  // grounded in the project ledger) and runs it as an ordinary guided session owned
  // by the worker. /finalize later closes the task via completeProjectTaskForSession.
  // requireWorkSubscription: this is the worker-flow user's ONLY path to run work
  // (they are 403'd from POST /api/work/sessions), so the legal-consent/plan gate
  // that applies to every role must apply here too (M4).
  app.post('/api/work/my/assigned/:projectId/:taskId/expand', requireWorkAuth, requireWorkSubscription, async (req, res) => {
    try {
      const ctx = store.getAssignedTaskForExpand(req.workUser.id, req.params.projectId, req.params.taskId)
      if (!ctx) return res.status(404).json({ error: 'That task is not assigned to you.' })
      const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
      const bp = await bestPlanningCall(req, rr, false); const call = bp.call
      const plan = await work.workPlan(ai, call.rt, {
        base: store.getSystemPrompt(), mode: 'stepwise', level: 'medium',
        goal: ctx.task.goal || ctx.task.title, learnings: ctx.ledger, strong: call.backup,
        locale: readLocale ? readLocale(req) : 'en',
      })
      if (plan.refusal) return res.json({ refusal: plan.refusal })
      const session = store.createWorkSession(req.workUser.id, { goal: ctx.task.goal || ctx.task.title })
      store.setWorkSessionSteps(req.workUser.id, session.id, plan.steps)
      try { store.setWorkSessionOverview(req.workUser.id, session.id, (ctx.task && ctx.task.overview) || plan.overview) } catch { /* best-effort */ }
      store.linkAssignedTaskSession(req.workUser.id, req.params.projectId, req.params.taskId, session.id)
      res.json({ sessionId: session.id, steps: plan.steps })
    } catch (e) { sendWorkError(res, e, req) }
  })

  // ---- GRC / Sr PM / admin: oversight ----
  app.get('/api/work/grc/risks', requireWorkAuth, wrap((req, res) => {
    res.json({ risks: store.companyRiskRegister(req.workUser.id, { slaDays: Number(req.query.slaDays) || undefined }) })
  }))
  app.get('/api/work/grc/stats', requireWorkAuth, wrap((req, res) => {
    res.json({ stats: store.companyProjectStats(req.workUser.id) })
  }))
  app.get('/api/work/grc/log', requireWorkAuth, wrap((req, res) => {
    res.json({ log: store.listProjectLog(req.workUser.id, { projectId: req.query.project || null, limit: Number(req.query.limit) || 500 }) })
  }))

  // ---- Teach workflows ----
  // Authoring (create / edit / publish / revise / retire / delete) needs the
  // trainer grant or company admin, and edit/delete also ownership; the store
  // enforces all of it. Reads return what the acting user may see (everyone in
  // the company sees published; authors + admins also see drafts).
  app.get('/api/work/workflows', requireWorkAuth, wrap((req, res) => {
    res.json({ workflows: store.listWorkflowsForUser(req.workUser.id, { state: req.query.state || null }) })
  }))
  app.get('/api/work/workflows/:id', requireWorkAuth, wrap((req, res) => {
    res.json({ workflow: store.getWorkflowForUser(req.workUser.id, req.params.id) })
  }))
  app.post('/api/work/workflows', requireWorkAuth, wrap((req, res) => {
    const b = req.body || {}
    res.json({ workflow: store.createWorkflow(req.workUser.id, { meta: b.meta, steps: b.steps }) })
  }))
  app.patch('/api/work/workflows/:id', requireWorkAuth, wrap((req, res) => {
    const b = req.body || {}
    res.json({ workflow: store.updateWorkflow(req.workUser.id, req.params.id, { meta: b.meta, steps: b.steps }) })
  }))
  app.post('/api/work/workflows/:id/publish', requireWorkAuth, wrap((req, res) => {
    res.json({ workflow: store.publishWorkflow(req.workUser.id, req.params.id) })
  }))
  app.post('/api/work/workflows/:id/revise', requireWorkAuth, wrap((req, res) => {
    res.json({ workflow: store.reviseWorkflow(req.workUser.id, req.params.id) })
  }))
  app.post('/api/work/workflows/:id/retire', requireWorkAuth, wrap((req, res) => {
    res.json({ workflow: store.retireWorkflow(req.workUser.id, req.params.id) })
  }))
  app.delete('/api/work/workflows/:id', requireWorkAuth, wrap((req, res) => {
    res.json(store.deleteWorkflow(req.workUser.id, req.params.id))
  }))
  // Wave 2 capture: upload one scrubbed frame (trainer / company admin) and get a
  // ref to put in a step's `shot`; read a frame back (company-scoped). Frames are
  // encrypted at rest and only ever served to the frame's own tenant.
  app.post('/api/work/workflows/frames', requireWorkAuth, wrap((req, res) => {
    res.json(store.uploadWorkflowFrame(req.workUser.id, (req.body || {}).dataUrl))
  }))
  // Wave 2 capture: speech to text for one audio chunk (the trainer's mic, call
  // audio, or a recorded video's soundtrack), on the company's OWN configured AI
  // keys and egress rules. Authors only. Returns the text and chunk-relative
  // segment timings, never the provider or model. A provider that cannot
  // transcribe is switched for one on the permitted ladder (recorded), or fails
  // with an actionable message; it never returns a silent empty.
  app.post('/api/work/transcribe', requireWorkAuth, requireWorkSubscription, async (req, res) => {
    try {
      if (!store.userCanAuthorWorkflows(req.workUser.id)) return res.status(403).json({ error: 'Only a trainer or company admin can record a workflow.' })
      const v = parseAudioPayload(req.body)
      if (!v.ok) return res.status(v.status).json({ error: v.error })
      const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
      const pick = pickTranscribeRuntime(rr.rt)
      if (!pick) {
        return res.status(400).json({
          error: 'Your AI provider cannot turn speech into text, so narration cannot be captured. Add a Groq, OpenAI or Gemini key in Company, AI keys, then try again.',
          code: AI_NO_TRANSCRIBE, needsTranscribeKey: true,
        })
      }
      if (pick.switched && typeof pick.rt.onSwitch === 'function') {
        pick.rt.onSwitch({ scope: 'transcribe', reason: 'unsupported', crossProvider: true, fromProvider: pick.fromProvider, fromModel: rr.rt.chatModel || null, toProvider: pick.rt.providerId, toModel: null })
      }
      const out = await transcribeAudio(pick.rt, { audio: v.buffer, mime: v.mime, language: v.language })
      res.json({ text: out.text, segments: out.segments || null })
    } catch (e) { sendWorkError(res, e, req) }
  })
  app.get('/api/work/workflows/frames/:ref', requireWorkAuth, wrap((req, res) => {
    const f = store.readWorkflowFrame(req.workUser.id, req.params.ref)
    res.setHeader('Content-Type', f.mime)
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(f.buffer)
  }))
}

export default { registerWorkRolesRoutes }
