// Mid-journey task injection: the DETERMINISTIC dedupe + placement half of the
// inject path. When a new request arrives mid-project, the caller (AI) decides the
// SEMANTIC question "is this the same work, fold it, or is it genuinely new"; this
// module decides, with no judgement and no I/O, (1) whether a planned task already
// covers the request (findSimilarTask) and (2) where a genuinely-new task belongs in
// the dependency-ordered map (placeInjectedTask). Pure functions over the
// work_project.js Project/Task shapes - no db, no mutation of the inputs, and never a
// dependency cycle (SUPREME II single-source, VI no-degrade, XV small module).
//
// work_project.js is imported by the TEST read-only to build fixtures (newTask /
// newProject); the logic here is shape-only so it stays trivially unit-testable.

// --- text normalization + similarity (deterministic, locale-light) ------------

// Lowercase, strip punctuation to spaces (unicode letters/numbers survive), split on
// whitespace -> a Set of word tokens. Empty/garbage in -> empty Set.
export function tokenize(text) {
  const words = String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  return new Set(words)
}

// Jaccard similarity of two token Sets: |A n B| / |A u B|. Either side empty -> 0
// (no false "0/0 = match"); identical token sets -> 1.
export function jaccard(a, b) {
  if (!(a instanceof Set) || !(b instanceof Set) || a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

const SIMILARITY_THRESHOLD = 0.6

// Dedupe guard: return the EXISTING task whose goal (or title) is a near-duplicate of
// `goal`, else null. "Near-duplicate" = normalized word-token Jaccard >= 0.6 against
// the better of the task's goal or title. Best match only. The caller uses a non-null
// return to FOLD into the existing task instead of creating a duplicate.
export function findSimilarTask(project, goal) {
  const gTokens = tokenize(goal)
  if (gTokens.size === 0) return null
  const tasks = (project && Array.isArray(project.tasks)) ? project.tasks : []
  let best = null
  let bestSim = 0
  for (const t of tasks) {
    if (!t) continue
    const sim = Math.max(jaccard(gTokens, tokenize(t.goal)), jaccard(gTokens, tokenize(t.title)))
    if (sim > bestSim) {
      bestSim = sim
      best = t
    }
  }
  return bestSim >= SIMILARITY_THRESHOLD ? best : null
}

// --- placement ----------------------------------------------------------------

const uniq = (arr) => [...new Set(arr)]
const byOrder = (a, b) => (a.order - b.order) || 0

// Cycle detector over [{ id, dependsOn }]. Deps pointing outside the set are ignored
// (they cannot close a cycle inside it). DFS 3-colour; true when any back-edge exists.
function hasCycle(tasks) {
  const adj = new Map()
  for (const t of tasks) adj.set(t.id, Array.isArray(t.dependsOn) ? t.dependsOn.filter(Boolean) : [])
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map()
  for (const t of tasks) color.set(t.id, WHITE)
  let cyclic = false
  const visit = (id) => {
    color.set(id, GRAY)
    for (const dep of (adj.get(id) || [])) {
      if (!adj.has(dep)) continue
      const c = color.get(dep)
      if (c === GRAY) { cyclic = true; return }
      if (c === WHITE) { visit(dep); if (cyclic) return }
    }
    color.set(id, BLACK)
  }
  for (const t of tasks) {
    if (color.get(t.id) === WHITE) visit(t.id)
    if (cyclic) break
  }
  return cyclic
}

// Insert a genuinely-new task into the project map at the RIGHT position and return a
// NEW ordered tasks array + a `placed` descriptor. The input project/tasks are never
// mutated. Orders are always recomputed to a clean monotonic 1..N.
//
// opts:
//  - blocksTaskId: the new task is a PREREQUISITE of that task -> insert immediately
//    BEFORE it and add the new task's id to that task's dependsOn (the blocker now
//    waits for it). The blocker's own upstream deps are carried over to the new task
//    (so the prerequisite still runs after them), when that does not self-reference.
//  - dependsOn (array, and no blocksTaskId): the new task depends on those ids ->
//    place it AFTER the latest of them (highest order); dependents stay after it.
//  - neither: append after the current frontier (max order among not-done tasks).
//
// If the requested placement would create a dependency cycle, it falls back to append
// and OMITS the offending dependency edge, noting cycleAvoided in `placed`.
export function placeInjectedTask(project, task, opts = {}) {
  // Clone every task (and its dependsOn array) so inputs are never mutated.
  const work = ((project && Array.isArray(project.tasks)) ? project.tasks : [])
    .filter(Boolean)
    .map((t) => ({ ...t, dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.slice() : [] }))
    .sort(byOrder)

  const selfId = task ? task.id : undefined
  const origDeps = (task && Array.isArray(task.dependsOn)) ? task.dependsOn.filter((d) => d && d !== selfId) : []
  const neu = { ...task, dependsOn: origDeps.slice() }

  const cloneById = (id) => work.find((t) => t.id === id) || null

  let placed = null
  let insertAt = work.length // default: end

  // Append after the frontier = the last not-done task in order; if none, at the end.
  const appendAtFrontier = (extra = {}) => {
    let idx = -1
    for (let i = 0; i < work.length; i++) if (work[i].state !== 'done') idx = i
    insertAt = idx >= 0 ? idx + 1 : work.length
    placed = { appended: true, ...extra }
  }

  const blockerId = opts && opts.blocksTaskId
  const wantDeps = (opts && Array.isArray(opts.dependsOn)) ? opts.dependsOn.filter(Boolean) : []

  if (blockerId) {
    const blocker = cloneById(blockerId)
    if (!blocker) {
      appendAtFrontier({ reason: 'blocker-not-found' })
    } else {
      // Carry over the blocker's upstream deps to the prerequisite (never itself / the
      // blocker), then gate the blocker on the new task.
      const carried = blocker.dependsOn.filter((d) => d !== neu.id && d !== blocker.id)
      neu.dependsOn = uniq([...neu.dependsOn, ...carried])
      const proposedBlockerDeps = uniq([...blocker.dependsOn, neu.id])
      const probe = work
        .map((t) => (t.id === blocker.id ? { id: t.id, dependsOn: proposedBlockerDeps } : { id: t.id, dependsOn: t.dependsOn }))
        .concat([{ id: neu.id, dependsOn: neu.dependsOn }])
      if (hasCycle(probe)) {
        // Offending edge is blocker -> new task; drop it and fall back to append,
        // keeping only the new task's originally-requested deps (still acyclic).
        neu.dependsOn = origDeps.slice()
        if (hasCycle(work.concat([{ id: neu.id, dependsOn: neu.dependsOn }]))) neu.dependsOn = []
        appendAtFrontier({ cycleAvoided: true, blocksTaskId: blockerId })
      } else {
        blocker.dependsOn = proposedBlockerDeps
        insertAt = work.indexOf(blocker)
        placed = { before: blocker.id }
      }
    }
  } else if (wantDeps.length) {
    neu.dependsOn = uniq([...neu.dependsOn, ...wantDeps.filter((d) => d !== neu.id)])
    if (hasCycle(work.concat([{ id: neu.id, dependsOn: neu.dependsOn }]))) {
      neu.dependsOn = origDeps.slice()
      if (hasCycle(work.concat([{ id: neu.id, dependsOn: neu.dependsOn }]))) neu.dependsOn = []
      appendAtFrontier({ cycleAvoided: true, omittedDeps: wantDeps })
    } else {
      // Place immediately after the latest (highest-order) dependency present.
      let maxIdx = -1
      let latest = null
      for (const d of wantDeps) {
        const idx = work.findIndex((t) => t.id === d)
        if (idx > maxIdx) { maxIdx = idx; latest = d }
      }
      if (maxIdx >= 0) {
        insertAt = maxIdx + 1
        placed = { after: latest }
      } else {
        appendAtFrontier()
      }
    }
  } else {
    appendAtFrontier()
  }

  const out = work.slice()
  out.splice(insertAt, 0, neu)
  out.forEach((t, i) => { t.order = i + 1 })
  return { tasks: out, placed }
}
