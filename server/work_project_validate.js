// Zero-tolerance breakdown gate for the Customer > Project > Task > Step model
// (see work_project.js for the shape). Pure logic, no I/O. A plan is only allowed
// to become a PROJECT when it is genuinely a multi-task effort, and every task in
// it must be REAL - a verifiable unit of work, not a filler chunk. This gate exists
// so we never manufacture a false project out of one workflow, and never carry a
// task that has no independently-confirmable done-state (SUPREME XV: small single-
// responsibility module; SUPREME II: this is the one authority on "is this a real
// breakdown?", callers consume it rather than re-deriving the rules).
//
// Design notes:
//  - "real" is deliberately strict: a goal/title alone is not enough; without a
//    done-state you cannot confirm the task finished, so it is not a task.
//  - duplicate detection is normalized (case- and whitespace-insensitive) so two
//    restatements of the same work collapse to one and cannot pad a plan into a
//    "project".
//  - softHintTooBig is ONLY a hint to reconsider project-ness; it never auto-splits
//    and never fails the gate (auto-splitting a long single workflow would be a
//    false project - the opposite failure).

// --- normalization helpers -------------------------------------------------

// Collapse a label to a comparison key: lower-cased, trimmed, internal runs of
// whitespace collapsed to one space. Empty when there is nothing meaningful.
function normLabel(s) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// A task's identifying label for duplicate detection: its goal if present, else
// its title. (newTask already falls back title->goal, but a hand-built fixture or
// a partial descriptor may set only one, so we check both independently.)
function taskKey(task) {
  if (!task || typeof task !== 'object') return ''
  const goal = normLabel(task.goal)
  if (goal) return goal
  return normLabel(task.title)
}

// --- predicates ------------------------------------------------------------

// A task is REAL only if it carries a non-empty goal (or title) AND a non-empty
// done-state. The done-state is what makes completion independently verifiable;
// a chunk without one is not a task, it is a filler. Both conditions are required.
export function isRealTask(task) {
  if (!task || typeof task !== 'object') return false
  const hasAim = normLabel(task.goal).length > 0 || normLabel(task.title).length > 0
  const hasDoneState = normLabel(task.doneState).length > 0
  return hasAim && hasDoneState
}

// Should this set of tasks be a PROJECT at all? Only when there are >= 2 REAL tasks
// that are not duplicates of one another. One workflow = one task, NOT a project.
// Filler tasks (not isRealTask) and duplicate restatements never count toward the
// threshold, so a plan cannot be padded into project-hood.
export function shouldBeProject(tasks) {
  if (!Array.isArray(tasks)) return false
  const seen = new Set()
  let distinctReal = 0
  for (const t of tasks) {
    if (!isRealTask(t)) continue
    const key = taskKey(t)
    if (!key || seen.has(key)) continue
    seen.add(key)
    distinctReal += 1
  }
  return distinctReal >= 2
}

// A HINT (never an auto-split, never a gate failure) that a single workflow carries
// enough steps to be worth reconsidering as a project. Deliberately advisory: a long
// linear procedure is still legitimately ONE task, so this only prompts a human/LLM
// to look again - callers must not turn a true return into an automatic breakdown.
export function softHintTooBig(stepCount, threshold = 20) {
  const n = Number(stepCount)
  const t = Number.isFinite(Number(threshold)) ? Number(threshold) : 20
  if (!Number.isFinite(n)) return false
  return n > t
}

// --- cycle detection -------------------------------------------------------

// Walk the dependsOn graph; return the set of task ids that participate in any
// dependency cycle (including a self-dependency a->a). Ids referenced in dependsOn
// that do not exist in the set are simply not followed here (they are reported
// separately as "unknown task" references).
function findCycleNodes(tasks) {
  const ids = new Map() // id -> deps[] (only deps that resolve to a known task)
  for (const t of tasks) {
    if (!t || t.id == null) continue
    ids.set(String(t.id), null)
  }
  for (const t of tasks) {
    if (!t || t.id == null) continue
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn.map(String).filter((d) => ids.has(d)) : []
    ids.set(String(t.id), deps)
  }
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map([...ids.keys()].map((id) => [id, WHITE]))
  const inCycle = new Set()
  const stack = []
  const onStack = new Set()

  const visit = (id) => {
    color.set(id, GRAY)
    stack.push(id)
    onStack.add(id)
    for (const dep of ids.get(id) || []) {
      if (color.get(dep) === GRAY) {
        // back-edge: everything from dep up the stack is in a cycle
        let i = stack.length - 1
        while (i >= 0) {
          inCycle.add(stack[i])
          if (stack[i] === dep) break
          i -= 1
        }
      } else if (color.get(dep) === WHITE) {
        visit(dep)
      }
    }
    stack.pop()
    onStack.delete(id)
    color.set(id, BLACK)
  }

  for (const id of ids.keys()) {
    if (color.get(id) === WHITE) visit(id)
  }
  return inCycle
}

// --- the gate --------------------------------------------------------------

// Validate a proposed breakdown. Returns { ok, errors[], warnings[] }. ok is true
// iff errors is empty. Every condition below is an ERROR (zero tolerance) - a plan
// that trips any of them is not allowed through as a project. The checks are run
// in full (not short-circuited) so the caller sees every problem at once.
export function validateBreakdown({ goal, endState, tasks } = {}) {
  const errors = []
  const warnings = []
  const list = Array.isArray(tasks) ? tasks : []

  // 1) False project: a "project" with fewer than 2 real tasks is really one task.
  if (!shouldBeProject(list)) {
    errors.push('should be a single task, not a project')
  }

  // 2) False / filler tasks: name each task that is not a real, verifiable unit.
  list.forEach((t, i) => {
    if (!isRealTask(t)) {
      const label = (t && (normLabel(t.title) || normLabel(t.goal))) || ''
      const who = (t && t.id != null && String(t.id)) || label || `#${i + 1}`
      const why = !t || typeof t !== 'object'
        ? 'not a task'
        : (normLabel(t.doneState).length === 0 ? 'missing done-state' : 'missing goal')
      errors.push(`false/filler task "${who}" (${why})`)
    }
  })

  // 3) Duplicate tasks: same normalized goal/title (case/space-insensitive).
  const seen = new Map() // key -> first id/label seen
  list.forEach((t, i) => {
    const key = taskKey(t)
    if (!key) return // empty-label tasks are already caught as filler above
    if (seen.has(key)) {
      const who = (t && t.id != null && String(t.id)) || key || `#${i + 1}`
      errors.push(`duplicate task "${who}"`)
    } else {
      seen.set(key, (t && t.id != null && String(t.id)) || key)
    }
  })

  // 4) dependsOn referencing a task not in the set.
  const knownIds = new Set(list.filter((t) => t && t.id != null).map((t) => String(t.id)))
  list.forEach((t, i) => {
    if (!t || !Array.isArray(t.dependsOn)) return
    for (const dep of t.dependsOn) {
      if (!knownIds.has(String(dep))) {
        const who = (t && t.id != null && String(t.id)) || `#${i + 1}`
        errors.push(`task "${who}" depends on unknown task "${String(dep)}"`)
      }
    }
  })

  // 5) Dependency cycle (walk the dependsOn graph).
  const cycleNodes = findCycleNodes(list)
  if (cycleNodes.size > 0) {
    const names = [...cycleNodes].sort().join(', ')
    errors.push(`circular dependency (${names})`)
  }

  // 6) No defined end state -> cannot confirm completion.
  const doneText = endState && typeof endState === 'object' ? normLabel(endState.done) : normLabel(endState)
  if (!doneText) {
    errors.push('no defined end state (cannot confirm completion)')
  }

  // A sparse goal is advisory, not a hard failure (the project may still be valid).
  if (!normLabel(goal)) {
    warnings.push('project has no stated goal')
  }

  return { ok: errors.length === 0, errors, warnings }
}
