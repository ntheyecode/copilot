// Recommended Practices: the pure, deterministic suggestion core (model-free).
//
// Given a project map (goal + tasks), this matches the curated catalog by the
// project text, then proposes practices the plan does not already cover. Dedupe
// reuses the project engine's token-set similarity so a practice is dropped when
// a task already does it (never suggest what the plan already has). Each kept
// suggestion carries a real task descriptor (goal + screen-visible doneState) so
// roping it in passes the zero-tolerance breakdown gate unchanged.
//
// This is the launch source (catalog). The brain and the model are layered in at
// the route level later (see docs/recommended-practices-spec.md); keeping this
// module pure and catalog-only makes the floor testable and trustworthy.

import { tokenize, jaccard } from './work_project_inject.js'
import { PRACTICE_CATALOG } from './work_practices_catalog.js'

// A candidate is "already covered" when its text is this similar to a task.
export const PRACTICE_DUP_THRESHOLD = 0.6
export const PRACTICE_DEFAULT_MAX = 3

// Which catalog disciplines the project text matches (goal + every task goal).
export function matchDisciplines(text, catalog = PRACTICE_CATALOG) {
  const s = String(text || '')
  return (catalog || []).filter((d) => Array.isArray(d.match) && d.match.some((re) => { try { return re.test(s) } catch { return false } }))
}

function practiceTokens(p) {
  return tokenize(`${p.title || ''} ${p.task ? p.task.goal : ''}`)
}

// Suggest up to `max` practices for a project map. Deterministic and model-free.
// Returns suggestion descriptors shaped for the route/UI and for rope-in:
//   { id, source, disciplineKey, kind:'add_task', title, rationale, proposed:{ taskDescriptor } }
// A practice is skipped when any task's goal/title is >= the dup threshold similar
// to it, so the plan is never told to do what it already does.
export function suggestPractices({ goal = '', tasks = [] } = {}, { catalog = PRACTICE_CATALOG, max = PRACTICE_DEFAULT_MAX } = {}) {
  const list = Array.isArray(tasks) ? tasks : []
  const hay = [String(goal || ''), ...list.map((t) => `${(t && t.title) || ''} ${(t && t.goal) || ''}`)].join(' ')
  const disciplines = matchDisciplines(hay, catalog)
  const taskToks = list.map((t) => tokenize(`${(t && t.title) || ''} ${(t && t.goal) || ''}`))
  const out = []
  const seen = new Set()
  for (const d of disciplines) {
    for (const p of (d.practices || [])) {
      if (!p || !p.id || seen.has(p.id) || !p.task) continue
      const ptoks = practiceTokens(p)
      const covered = taskToks.some((tt) => jaccard(tt, ptoks) >= PRACTICE_DUP_THRESHOLD)
      if (covered) continue
      seen.add(p.id)
      out.push({
        id: p.id,
        source: 'discipline_catalog',
        disciplineKey: d.key,
        kind: 'add_task',
        title: p.title,
        rationale: p.rationale,
        proposed: { taskDescriptor: { title: p.title, goal: p.task.goal, doneState: p.task.doneState, dependsOn: [] } },
      })
      if (out.length >= max) return out
    }
  }
  return out
}

export default { suggestPractices, matchDisciplines, PRACTICE_DUP_THRESHOLD, PRACTICE_DEFAULT_MAX }
