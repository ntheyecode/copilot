import test from 'node:test'
import assert from 'node:assert/strict'
import * as m from './templatesModel.js'

const run = (userId, done, total, extra) => ({ userId, name: 'U' + userId, projectId: 'p' + userId, done, total, percent: total ? Math.round((done / total) * 100) : 0, active: 0, pending: total - done, assignedAt: '2026-10-20T10:00:00Z', ...(extra || {}) })

test('templateCounts / sortTemplates: numbers never NaN, newest first, missing date last', () => {
  assert.deepEqual(m.templateCounts({ taskCount: '5', assignedCount: null }), { taskCount: 5, assignedCount: 0 })
  assert.deepEqual(m.templateCounts(null), { taskCount: 0, assignedCount: 0 })
  const list = [{ id: 'a', name: 'A', createdAt: '2026-10-01' }, { id: 'b', name: 'B', createdAt: '2026-10-20' }, { id: 'c', name: 'C' }, null]
  assert.deepEqual(m.sortTemplates(list).map((x) => x.id), ['b', 'a', 'c'])
})

test('classifyTemplateCreate: every server answer lands in one outcome', () => {
  assert.equal(m.classifyTemplateCreate({ template: { id: 't1' } }).kind, 'template')
  assert.deepEqual(m.classifyTemplateCreate({ refusal: 'No.' }), { kind: 'refusal', text: 'No.' })
  assert.deepEqual(m.classifyTemplateCreate(null, { status: 422, data: { singleTask: true, suggestedGoal: 'Do X' } }), { kind: 'single', suggestedGoal: 'Do X' })
  assert.deepEqual(m.classifyTemplateCreate(null, { status: 422, data: { errors: ['too vague', 7] } }), { kind: 'quality', errors: ['too vague', '7'] })
  assert.deepEqual(m.classifyTemplateCreate(null, { status: 400, data: { error: 'Goal is required' } }), { kind: 'invalid', text: 'Goal is required' })
  assert.equal(m.classifyTemplateCreate(null, { status: 403, data: { needsUpgrade: true } }).kind, 'upgrade')
  assert.equal(m.classifyTemplateCreate(null, { status: 500 }).kind, 'error')
  assert.equal(m.classifyTemplateCreate({}).kind, 'error')
})

test('skipReasonKey / splitAssignOutcome: known reasons keyed, unknown shown as other, nobody vanishes', () => {
  assert.equal(m.skipReasonKey('already_assigned'), 'already_assigned')
  assert.equal(m.skipReasonKey('Not In Company'), 'not_in_company')
  assert.equal(m.skipReasonKey('weird'), 'other')
  const out = m.splitAssignOutcome({ assigned: [{ userId: 1, projectId: 9 }], skipped: [{ userId: '2', reason: 'already_assigned' }] }, ['1', '2', '3'])
  assert.deepEqual(out.assigned, [{ userId: '1', projectId: '9' }])
  assert.deepEqual(out.skipped, [{ userId: '2', reason: 'already_assigned' }, { userId: '3', reason: 'other' }])
  assert.deepEqual(m.splitAssignOutcome(null, []), { assigned: [], skipped: [] })
})

test('runPercent / runState: the server state wins, derived only when missing; percent clamped', () => {
  assert.equal(m.runPercent(run('a', 2, 4)), 50)
  assert.equal(m.runPercent({ percent: 140 }), 100)
  assert.equal(m.runPercent({ done: 1, total: 3 }), 33)
  assert.equal(m.runPercent({}), 0)
  assert.equal(m.runState({ state: 'completed', done: 0, total: 5 }), 'completed')
  assert.equal(m.runState({ done: 5, total: 5 }), 'completed')
  assert.equal(m.runState({ done: 0, total: 5, active: 1 }), 'inProgress')
  assert.equal(m.runState({ done: 2, total: 5 }), 'inProgress')
  assert.equal(m.runState({ done: 0, total: 5 }), 'notStarted')
  assert.equal(m.runState({ state: 'bogus', done: 0, total: 0 }), 'notStarted')
})

test('sortRuns: least complete first, ties by name; rollupSummary derives what the server left out', () => {
  const runs = [run('b', 4, 4), run('a', 0, 4), run('c', 2, 4), run('d', 0, 4), run('e', 3, 4, { active: 1 })]
  assert.deepEqual(m.sortRuns(runs).map((r) => r.userId), ['a', 'd', 'c', 'e', 'b'])
  const s = m.rollupSummary({ runs })
  assert.deepEqual(s, { assigned: 5, completed: 1, inProgress: 2, notStarted: 2, avgPercent: 45 })
  // the server's numbers win when present
  assert.equal(m.rollupSummary({ runs, avgPercent: 41, completed: 2 }).avgPercent, 41)
  assert.equal(m.rollupSummary({ runs, completed: 2 }).completed, 2)
  assert.deepEqual(m.rollupSummary(null), { assigned: 0, completed: 0, inProgress: 0, notStarted: 0, avgPercent: 0 })
})

test('fmtShortDate: empty for missing or unparsable, a string otherwise', () => {
  assert.equal(m.fmtShortDate(''), '')
  assert.equal(m.fmtShortDate('nope'), '')
  assert.ok(m.fmtShortDate('2026-10-20T10:00:00Z', 'en-US').includes('2026'))
})
