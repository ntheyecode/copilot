// Team projects - Model B: the pure clone/rollup helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { templateSeedTasks, summarizeRun, rollupRuns } from './work_team_projects.js'

test('templateSeedTasks: dependsOn ids -> indices, order kept, unknown dropped', () => {
  const tpl = [
    { id: 'pt10', title: 'A', goal: 'a', doneState: 'da', dependsOn: [] },
    { id: 'pt11', title: 'B', goal: 'b', doneState: 'db', dependsOn: ['pt10', 'pt999'] },
    { id: 'pt12', title: 'C', goal: 'c', doneState: 'dc', dependsOn: ['pt11'] },
  ]
  const seed = templateSeedTasks(tpl)
  assert.deepEqual(seed.map((t) => t.title), ['A', 'B', 'C'])
  assert.deepEqual(seed[1].dependsOn, [0])        // pt10 -> index 0; pt999 dropped
  assert.deepEqual(seed[2].dependsOn, [1])        // pt11 -> index 1
  assert.equal(seed[0].order, 1)
})

test('summarizeRun: counts + percent, no evidence fields', () => {
  const s = summarizeRun({ state: 'active', createdAt: '2026-01-01', tasks: [
    { state: 'done', endedAt: '2026-01-03' }, { state: 'done', endedAt: '2026-01-04' },
    { state: 'active', startedAt: '2026-01-05' }, { state: 'pending' },
  ] })
  assert.equal(s.total, 4); assert.equal(s.done, 2); assert.equal(s.active, 1); assert.equal(s.pending, 1)
  assert.equal(s.percent, 50)
  assert.equal(s.lastActivityAt, '2026-01-05')
  // Structure/completion only - no evidence keys (frames, audit, outcome) leak.
  assert.deepEqual(Object.keys(s).sort(), ['active', 'done', 'lastActivityAt', 'pending', 'percent', 'state', 'total'])
})

test('rollupRuns: aggregates, sorts least-complete first, resolves names', () => {
  const runs = [
    { id: 'pr1', workUserId: 'u1', tasks: [{ state: 'done' }, { state: 'done' }] },               // 100%
    { id: 'pr2', workUserId: 'u2', tasks: [{ state: 'pending' }, { state: 'pending' }] },          // 0% not started
    { id: 'pr3', workUserId: 'u3', tasks: [{ state: 'done' }, { state: 'active' }] },              // 50% in progress
  ]
  const names = { u1: 'Ann', u2: 'Bob', u3: 'Cal' }
  const r = rollupRuns(runs, (id) => names[id])
  assert.equal(r.assigned, 3); assert.equal(r.completed, 1); assert.equal(r.notStarted, 1); assert.equal(r.inProgress, 1)
  assert.equal(r.avgPercent, 50)
  assert.deepEqual(r.runs.map((x) => x.name), ['Bob', 'Cal', 'Ann'])   // 0 -> 50 -> 100
})
