// Recommended Practices routes (Depth-2 projects). Thin over the tested pure
// core (work_practices.suggestPractices) and the project store. Gated on
// store.canUseWorkProjects, like the other project routes. Suggestions are
// derived deterministically from the project's current map, so accept re-derives
// and finds by id rather than persisting the offered list. Rope-in goes through
// store.injectWorkProjectTask, which runs the dependency-aware placement and the
// zero-tolerance gate, and now carries the practice's screen-visible done-state.
import { suggestPractices } from './work_practices.js'

export function registerWorkPracticeRoutes(app, { store, requireWorkAuth, wrap }) {
  const denyIfNotDeep = (req, res) => {
    if (store.canUseWorkProjects(req.workUser.id)) return false
    res.status(403).json({ error: 'Recommended practices are part of guided projects, a Premium feature.', needsUpgrade: true })
    return true
  }

  // Grounded practice suggestions for a project's current map (model-free catalog).
  app.post('/api/work/projects/:id/practices', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const p = store.getWorkProject(req.workUser.id, req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    res.json({ suggestions: suggestPractices({ goal: p.goal, tasks: p.tasks || [] }) })
  }))

  // Rope one in: re-derive deterministically, find by id, inject it (keeping its
  // done-state). The injection dedupes and gates, so a practice the plan already
  // covers folds into the existing task rather than duplicating.
  app.post('/api/work/projects/:id/practices/:sid/accept', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const p = store.getWorkProject(req.workUser.id, req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    const sug = suggestPractices({ goal: p.goal, tasks: p.tasks || [] }, { max: 99 }).find((s) => s.id === req.params.sid)
    if (!sug) return res.status(404).json({ error: 'That suggestion is no longer available.' })
    const td = sug.proposed.taskDescriptor
    const out = store.injectWorkProjectTask(req.workUser.id, p.id, { request: td.goal, title: td.title, doneState: td.doneState })
    res.json({ accepted: sug.id, ...out })
  }))
}

export default { registerWorkPracticeRoutes }
