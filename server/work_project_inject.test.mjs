// Unit tests for the deterministic inject half (dedupe + dependency-aware placement).
// Pure, no db, no I/O. Fixtures are built with the real work_project.js constructors
// (imported read-only) so the tested shapes match production exactly.

import test from 'node:test'
import assert from 'node:assert/strict'

import { newProject, newTask } from './work_project.js'
import { findSimilarTask, placeInjectedTask, tokenize, jaccard } from './work_project_inject.js'

// Build a planning project with an ordered A -> B -> C chain (B needs A, C needs B).
function chainProject() {
  const p = newProject({ id: 'p1', workUserId: 'u1', name: 'Offboarding', goal: 'Offboard a leaver' })
  p.tasks = [
    newTask({ id: 'A', title: 'Revoke VPN', goal: 'Revoke the VPN certificate', order: 1 }),
    newTask({ id: 'B', title: 'Rotate secrets', goal: 'Rotate the shared service secrets', order: 2, dependsOn: ['A'] }),
    newTask({ id: 'C', title: 'Close laptop ticket', goal: 'File the laptop return ticket', order: 3, dependsOn: ['B'] }),
  ]
  return p
}

const orders = (tasks) => tasks.map((t) => t.order)
const ids = (tasks) => tasks.map((t) => t.id)
const get = (tasks, id) => tasks.find((t) => t.id === id)

// Independent cycle check used only by the tests to assert "falls back safely".
function graphHasCycle(tasks) {
  const adj = new Map(tasks.map((t) => [t.id, (t.dependsOn || [])]))
  const color = new Map(tasks.map((t) => [t.id, 0]))
  let cyclic = false
  const visit = (id) => {
    color.set(id, 1)
    for (const d of (adj.get(id) || [])) {
      if (!adj.has(d)) continue
      if (color.get(d) === 1) { cyclic = true; return }
      if (color.get(d) === 0) { visit(d); if (cyclic) return }
    }
    color.set(id, 2)
  }
  for (const t of tasks) { if (color.get(t.id) === 0) visit(t.id); if (cyclic) break }
  return cyclic
}

// --- tokenize / jaccard sanity -------------------------------------------------

test('tokenize lowercases, strips punctuation, splits on whitespace', () => {
  assert.deepEqual([...tokenize('Deactivate the Okta account!')], ['deactivate', 'the', 'okta', 'account'])
  assert.equal(tokenize('').size, 0)
  assert.equal(tokenize(null).size, 0)
})

test('jaccard is 0 when either side is empty and 1 on identical token sets', () => {
  assert.equal(jaccard(tokenize('alpha beta'), new Set()), 0)
  assert.equal(jaccard(tokenize('alpha beta'), tokenize('beta alpha')), 1)
})

// --- findSimilarTask -----------------------------------------------------------

test('findSimilarTask hits a near-duplicate goal (case/punctuation/stopword insensitive)', () => {
  const p = newProject({ id: 'p2', workUserId: 'u1', name: 'IT', goal: 'IT tasks' })
  p.tasks = [
    newTask({ id: 't1', title: 'Deactivate Okta', goal: 'Deactivate the Okta account', order: 1 }),
    newTask({ id: 't2', title: 'Order chair', goal: 'Order a new ergonomic office chair', order: 2 }),
  ]
  const hit = findSimilarTask(p, 'deactivate okta account')
  assert.ok(hit, 'expected a match')
  assert.equal(hit.id, 't1')
})

test('findSimilarTask returns null for an unrelated goal', () => {
  const p = newProject({ id: 'p3', workUserId: 'u1', name: 'IT', goal: 'IT tasks' })
  p.tasks = [
    newTask({ id: 't1', title: 'Deactivate Okta', goal: 'Deactivate the Okta account', order: 1 }),
    newTask({ id: 't2', title: 'Order chair', goal: 'Order a new ergonomic office chair', order: 2 }),
  ]
  assert.equal(findSimilarTask(p, 'Book the Q3 strategy offsite in Lisbon'), null)
})

test('findSimilarTask returns null on empty project or empty goal', () => {
  assert.equal(findSimilarTask({ tasks: [] }, 'anything'), null)
  assert.equal(findSimilarTask(chainProject(), ''), null)
})

// --- placeInjectedTask: prerequisite via blocksTaskId --------------------------

test('blocksTaskId: prerequisite lands BEFORE the blocker and the blocker now depends on it', () => {
  const p = chainProject()
  const before = JSON.parse(JSON.stringify(p.tasks)) // snapshot for no-mutation check
  const prereq = newTask({ id: 'P', title: 'Snapshot laptop', goal: 'Image the laptop before return' })

  const { tasks, placed } = placeInjectedTask(p, prereq, { blocksTaskId: 'C' })

  assert.deepEqual(placed, { before: 'C' })
  const P = get(tasks, 'P')
  const C = get(tasks, 'C')
  assert.ok(P.order < C.order, 'prereq must come before the blocker')
  assert.ok(C.dependsOn.includes('P'), "blocker's dependsOn must include the new id")
  // Blocker's own upstream dep (B) carried over to the prerequisite.
  assert.ok(P.dependsOn.includes('B'), "prereq should carry the blocker's upstream dep")
  assert.ok(get(tasks, 'B').order < P.order, 'prereq must run after the carried-over dep')
  // Clean 1..N and input untouched.
  assert.deepEqual(orders(tasks), [1, 2, 3, 4])
  assert.deepEqual(p.tasks, before, 'input project.tasks must not be mutated')
  assert.ok(!graphHasCycle(tasks))
})

// --- placeInjectedTask: downstream via dependsOn -------------------------------

test('dependsOn: downstream task lands after the latest of its deps', () => {
  const p = chainProject()
  const down = newTask({ id: 'D', title: 'Verify rotation', goal: 'Verify the secret rotation took effect' })

  const { tasks, placed } = placeInjectedTask(p, down, { dependsOn: ['A', 'B'] })

  assert.deepEqual(placed, { after: 'B' }) // B is the latest-order dep
  const D = get(tasks, 'D')
  assert.ok(D.order > get(tasks, 'A').order && D.order > get(tasks, 'B').order, 'must sit after both deps')
  assert.ok(D.order < get(tasks, 'C').order, 'and before the pre-existing downstream task')
  assert.deepEqual(D.dependsOn.sort(), ['A', 'B'])
  assert.deepEqual(orders(tasks), [1, 2, 3, 4])
  assert.ok(!graphHasCycle(tasks))
})

// --- placeInjectedTask: independent append -------------------------------------

test('no opts: an independent task appends after the frontier', () => {
  const p = chainProject()
  const extra = newTask({ id: 'E', title: 'Notify payroll', goal: 'Notify payroll of the final date' })

  const { tasks, placed } = placeInjectedTask(p, extra, {})

  assert.deepEqual(placed, { appended: true })
  assert.equal(ids(tasks)[tasks.length - 1], 'E', 'appended last')
  assert.equal(get(tasks, 'E').order, 4)
  assert.deepEqual(orders(tasks), [1, 2, 3, 4])
})

test('append targets the frontier (last not-done), not past a trailing done task', () => {
  const p = chainProject()
  // Mark C done; frontier is B (order 2) -> new task should land right after B.
  get(p.tasks, 'C').state = 'done'
  const extra = newTask({ id: 'E', title: 'Notify payroll', goal: 'Notify payroll of the final date' })

  const { tasks, placed } = placeInjectedTask(p, extra, {})

  assert.equal(placed.appended, true)
  assert.ok(get(tasks, 'E').order <= get(tasks, 'C').order, 'frontier append sits at/ before the trailing done task')
  assert.deepEqual(orders(tasks), [1, 2, 3, 4])
})

// --- placeInjectedTask: cycle fallback -----------------------------------------

test('a placement that would cycle falls back to append and omits the offending edge', () => {
  const p = newProject({ id: 'p4', workUserId: 'u1', name: 'Deploy', goal: 'Ship it' })
  p.tasks = [
    newTask({ id: 'A', title: 'Build', goal: 'Build the artifact', order: 1 }),
    newTask({ id: 'B', title: 'Deploy', goal: 'Deploy the artifact', order: 2, dependsOn: ['A'] }),
  ]
  const beforeB = p.tasks[1].dependsOn.slice()
  // The new task already depends on B, yet we ask it to BLOCK B -> B->P and P->B: a cycle.
  const bad = newTask({ id: 'P', title: 'Gate', goal: 'Gate on deploy', dependsOn: ['B'] })

  const { tasks, placed } = placeInjectedTask(p, bad, { blocksTaskId: 'B' })

  assert.equal(placed.cycleAvoided, true)
  assert.equal(placed.appended, true)
  // Offending edge omitted: B must NOT have gained a dependency on P.
  assert.deepEqual(get(tasks, 'B').dependsOn, beforeB)
  assert.ok(!get(tasks, 'B').dependsOn.includes('P'))
  assert.equal(ids(tasks)[tasks.length - 1], 'P', 'falls back to append')
  assert.deepEqual(orders(tasks), [1, 2, 3])
  assert.ok(!graphHasCycle(tasks), 'result graph must be acyclic')
})
