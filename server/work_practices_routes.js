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
  // Phase 3: the catalog floor is re-ordered by what this company actually accepts
  // and finishes (platform-wide behaviour as the prior), and each suggestion we
  // return is counted as "offered" so the accept rate has a denominator.
  app.post('/api/work/projects/:id/practices', requireWorkAuth, wrap((req, res) => {
    if (denyIfNotDeep(req, res)) return
    const p = store.getWorkProject(req.workUser.id, req.params.id)
    if (!p) return res.status(404).json({ error: 'Project not found' })
    const suggestions = store.rankPracticeSuggestions(req.workUser.id, suggestPractices({ goal: p.goal, tasks: p.tasks || [] }))
    const companyId = store.companyIdForUser(req.workUser.id)
    for (const s of suggestions) { try { store.recordPracticeStat(companyId, s.id, 'offered') } catch { /* best-effort */ } }
    res.json({ suggestions })
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
    const out = store.injectWorkProjectTask(req.workUser.id, p.id, { request: td.goal, title: td.title, doneState: td.doneState, practiceId: sug.id })
    // Count the rope-in (phase-3 learning). A dedupe fold-in still counts as
    // accepted - the person wanted it; completion is captured when the task finishes.
    try { store.recordPracticeStat(store.companyIdForUser(req.workUser.id), sug.id, 'accepted') } catch { /* best-effort */ }
    res.json({ accepted: sug.id, ...out })
  }))

  // Single-task TIPS (all tiers): grounded improvement tips for a guided session's
  // goal, from the same catalog. Not rope-in (a single task is not a project);
  // informational, with an upgrade nudge to Projects where a deep user could rope
  // them in. `canRopeIn` tells the client whether to offer that.
  app.post('/api/work/sessions/:id/practices', requireWorkAuth, wrap((req, res) => {
    const s = store.getWorkSession(req.workUser.id, req.params.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    // Rank a wider pool by this company's history, then show the best two.
    const pool = store.rankPracticeSuggestions(req.workUser.id, suggestPractices({ goal: s.goal || '', tasks: [] }, { max: 5 }))
    res.json({ tips: pool.slice(0, 2), canRopeIn: store.canUseWorkProjects(req.workUser.id) })
  }))
}

export default { registerWorkPracticeRoutes }
