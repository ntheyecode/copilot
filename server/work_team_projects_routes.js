// Team projects - Model B (clone-to-many) routes. A PM/admin creates a template
// (a project map planned by AI through the SAME zero-tolerance gate as a project,
// or supplied directly), assigns it to company members (one owned run per person),
// and sees a per-person completion rollup. All RBAC + cloning lives in the store;
// these handlers are thin. Privacy: the rollup returns progress only, never a
// member's session evidence (enforced in work_team_projects.js). US spelling.
import { planProjectMap } from './work_project_plan.js'
import { validateBreakdown, shouldBeProject } from './work_project_validate.js'

export function registerTeamProjectRoutes(app, { store, ai, requireWorkAuth, requireWorkSubscription, guardUserText, wrap, resolveWorkRuntime, bestPlanningCall, sendWorkError }) {
  // Create a template. Provide `tasks` directly, or a `goal` to have the map
  // planned and gated like any project. Gated to PM/admin in the store.
  // requireWorkSubscription enforces the legal-consent/plan gate; the role is
  // re-checked CHEAPLY here BEFORE any AI planning call so a plain member/worker
  // cannot burn the company's AI budget and only get 403 afterwards (M2); the
  // goal passes the OWASP-LLM input guard before it reaches the planner (M3).
  app.post('/api/work/templates', requireWorkAuth, requireWorkSubscription, async (req, res) => {
    try {
      if (!store.userCanManageProjects(req.workUser.id)) return res.status(403).json({ error: 'You do not have permission to create templates.' })
      const body = req.body || {}
      const given = Array.isArray(body.tasks) ? body.tasks : null
      const goal = String(body.goal || '').trim()
      if (!given && !goal) return res.status(400).json({ error: 'Say what the template should achieve, or supply its tasks.' })
      let name = String(body.name || '').trim()
      let endState = body.endState || null
      let tasks = given
      if (!tasks) {
        if (guardUserText && guardUserText(req, res, goal, 'goal') === 'refused') return
        const rr = await resolveWorkRuntime(req, res, { needVision: false }); if (!rr) return
        const bp = await bestPlanningCall(req, rr, false); const call = bp.call
        const map = await planProjectMap(ai, call.rt, { base: store.getSystemPrompt(), goal, strong: call.backup })
        if (map.refusal) return res.json({ refusal: map.refusal })
        const vTasks = map.tasks.map((t, i) => ({ id: String(i), title: t.title, goal: t.goal, doneState: t.doneState, dependsOn: (t.dependsOn || []).map(String) }))
        if (!shouldBeProject(vTasks)) return res.status(422).json({ singleTask: true, error: 'This is really a single task, not a template.' })
        const v = validateBreakdown({ goal, endState: map.endState, tasks: vTasks })
        if (!v.ok) return res.status(422).json({ error: 'The template breakdown did not pass the quality gate.', errors: v.errors })
        tasks = map.tasks; endState = map.endState; name = name || map.name || 'Template'
      }
      const template = store.createProjectTemplate(req.workUser.id, {
        customerId: String(body.customerId || 'default'),
        name: name || 'Template', goal: goal || name, endState, tasks,
      })
      res.json({ template })
    } catch (e) { sendWorkError(res, e, req) }
  })

  // Templates the actor may manage.
  app.get('/api/work/templates', requireWorkAuth, wrap((req, res) => {
    res.json({ templates: store.listProjectTemplates(req.workUser.id) })
  }))

  // Assign a template to members: one owned run per person (idempotent).
  app.post('/api/work/templates/:id/assign', requireWorkAuth, wrap((req, res) => {
    const userIds = (req.body || {}).userIds
    if (!Array.isArray(userIds) || !userIds.length) return res.status(400).json({ error: 'Pick at least one person to assign.' })
    res.json(store.assignTemplate(req.workUser.id, req.params.id, userIds))
  }))

  // Per-person completion rollup for a template (progress only, no evidence).
  app.get('/api/work/templates/:id/rollup', requireWorkAuth, wrap((req, res) => {
    res.json(store.templateRollup(req.workUser.id, req.params.id))
  }))
}

export default { registerTeamProjectRoutes }
