import test from 'node:test'
import assert from 'node:assert/strict'
import * as m from './pmModel.js'

const DAY = 86400000
const now = Date.parse('2026-10-28T12:00:00Z')
const iso = (daysAgo) => new Date(now - daysAgo * DAY).toISOString()
const task = (id, state, extra) => ({ id, title: 'T' + id, order: Number(id), state, dependsOn: [], ...(extra || {}) })
const P = {
  id: 'p1', managerId: 'pm1', name: 'Alpha', state: 'active', held: false,
  tasks: [task('1', 'done', { assigneeId: 'w1' }), task('2', 'active', { assigneeId: 'w1', sessionId: 's1' }), task('3', 'pending', { assigneeId: 'w2', assignedAt: iso(7) }), task('4', 'rerun'), task('5', 'pending')],
}

test('taskBucket / groupTasks / filterTasks: rerun sits with not started', () => {
  assert.equal(m.taskBucket({ state: 'done' }), 'completed')
  assert.equal(m.taskBucket({ state: 'active' }), 'inProgress')
  assert.equal(m.taskBucket({ state: 'rerun' }), 'notStarted')
  assert.equal(m.taskBucket({ state: 'pending' }), 'notStarted')
  const g = m.groupTasks(P)
  assert.deepEqual(g.completed.map((t) => t.id), ['1'])
  assert.deepEqual(g.inProgress.map((t) => t.id), ['2'])
  assert.deepEqual(g.notStarted.map((t) => t.id), ['3', '4', '5'])
  assert.equal(m.filterTasks(P, 'all').length, 5)
  assert.equal(m.filterTasks(P, 'completed').length, 1)
})

test('projectStatus / filterProjects / statusCounts match the server stats rule (held wins)', () => {
  assert.equal(m.projectStatus({ state: 'done', held: true }), 'held')
  assert.equal(m.projectStatus({ state: 'done' }), 'done')
  assert.equal(m.projectStatus({ state: 'planning' }), 'ongoing')
  const list = [P, { ...P, id: 'p2', held: true }, { ...P, id: 'p3', state: 'done' }, null]
  assert.deepEqual(m.statusCounts(list), { all: 3, ongoing: 1, held: 1, done: 1 })
  assert.deepEqual(m.filterProjects(list, 'held').map((p) => p.id), ['p2'])
  assert.equal(m.filterProjects(list, 'all').length, 3)
})

test('projectCounts: totals, assigned and unassigned (a done task is never "unassigned work")', () => {
  const c = m.projectCounts(P)
  assert.equal(c.total, 5); assert.equal(c.done, 1); assert.equal(c.inProgress, 1); assert.equal(c.notStarted, 3)
  assert.equal(c.assigned, 3); assert.equal(c.unassigned, 2); assert.equal(c.pct, 20)
  assert.deepEqual(m.projectCounts(null), { total: 0, done: 0, inProgress: 0, notStarted: 0, assigned: 0, unassigned: 0, pct: 0 })
})

test('daysSince / taskSlaDays: only a waiting task past the window is a breach', () => {
  assert.equal(m.daysSince(iso(3), now), 3)
  assert.equal(m.daysSince(null), null)
  assert.equal(m.daysSince(new Date(now + DAY).toISOString(), now), 0)
  assert.equal(m.taskSlaDays(P.tasks[2], 5, now), 7)
  assert.equal(m.taskSlaDays({ state: 'pending', assignedAt: iso(2) }, 5, now), null)
  assert.equal(m.taskSlaDays({ state: 'active', assignedAt: iso(20) }, 5, now), null)
  assert.equal(m.taskSlaDays({ state: 'done', assignedAt: iso(20) }, 5, now), null)
  assert.equal(m.taskSlaDays({ state: 'pending' }, 5, now), null)
})

test('rollupByManager: merges stats + projects, derives numbers without stats, sorts by load', () => {
  const projects = [P, { ...P, id: 'p2', managerId: 'pm2' }, { ...P, id: 'p3', managerId: 'pm2' }, { ...P, id: 'p4', managerId: null }]
  const stats = { byManager: [{ managerId: 'pm1', projects: 1, tasks: 5, done: 1 }, { managerId: 'pm2', projects: 2, tasks: 10, done: 2 }, { managerId: 'unassigned', projects: 1, tasks: 5, done: 1 }] }
  const names = { pm1: 'Priya', pm2: 'Marco' }
  const rows = m.rollupByManager(projects, stats, (id) => names[id] || id)
  assert.deepEqual(rows.map((r) => r.managerId), ['pm2', 'pm1', 'unassigned'])
  assert.equal(rows[0].name, 'Marco'); assert.equal(rows[0].list.length, 2); assert.equal(rows[0].tasks, 10)
  const derived = m.rollupByManager(projects, null, null)
  const pm2 = derived.find((r) => r.managerId === 'pm2')
  assert.equal(pm2.projects, 2); assert.equal(pm2.tasks, 10); assert.equal(pm2.done, 2)
})

test('sortRisks / riskCounts: oldest SLA breaches first, then idle, then held', () => {
  const risks = [
    { kind: 'project_held', projectId: 'p1' },
    { kind: 'sla_breach', projectId: 'p1', ageDays: 6 },
    { kind: 'unassigned_idle', projectId: 'p1' },
    { kind: 'sla_breach', projectId: 'p2', ageDays: 12 },
    null,
  ]
  assert.deepEqual(m.sortRisks(risks).map((r) => r.kind + (r.ageDays || '')), ['sla_breach12', 'sla_breach6', 'unassigned_idle', 'project_held'])
  assert.deepEqual(m.riskCounts(risks), { total: 4, sla_breach: 2, unassigned_idle: 1, project_held: 1 })
})

test('peopleIndex / nameFor: directory names win; ids seen anywhere get a derived entry', () => {
  const users = [{ id: 'w1', displayName: 'Jordan Lee', workFlow: 'worker', companyRole: 'member' }]
  const log = [{ kind: 'task_reassigned', by: 'pm1', from: 'w1', to: 'w9' }, { kind: 'project_held', by: 'pm1', reason: 'budget' }]
  const idx = m.peopleIndex(users, { projects: [P], stats: { byManager: [{ managerId: 'pm7' }, { managerId: 'unassigned' }] }, log, me: { id: 'pm1', displayName: 'Priya' } })
  assert.equal(idx.get('w1').derived, false)
  assert.equal(m.nameFor(idx, 'w1'), 'Jordan Lee')
  assert.equal(m.nameFor(idx, 'pm1'), 'Priya')
  assert.equal(idx.get('w2').derived, true)
  assert.equal(idx.get('w2').seenAsAssignee, true)
  assert.equal(idx.get('w9').derived, true)
  assert.equal(idx.get('w9').seenAsAssignee, true)
  assert.equal(idx.get('pm7').derived, true)
  assert.equal(idx.get('pm7').seenAsManager, true)
  assert.equal(idx.get('pm1').seenAsManager, true)
  assert.equal(idx.get('pm1').seenAsAssignee, false)
  assert.equal(idx.has('unassigned'), false)
  assert.equal(idx.has('budget'), false)
  assert.equal(m.nameFor(idx, 'w2', (id) => 'Person ' + id), 'Person w2')
  assert.equal(m.nameFor(idx, null), '')
})

test('log helpers', () => {
  assert.equal(m.logKind({ kind: 'task_assigned' }), 'task_assigned')
  assert.equal(m.logKind({ kind: 'weird' }), 'other')
  assert.equal(m.projectNameOf([P], 'p1'), 'Alpha')
  assert.equal(m.projectNameOf([P], 'zz'), 'zz')
  assert.equal(m.taskTitleOf([P], 'p1', '3'), 'T3')
})

test('queueAction / sortQueue mirror the task transitions', () => {
  assert.equal(m.queueAction({ task: { state: 'pending' } }), 'start')
  assert.equal(m.queueAction({ task: { state: 'active', sessionId: 's' } }), 'continue')
  assert.equal(m.queueAction({ task: { state: 'active' } }), 'start')
  assert.equal(m.queueAction({ task: { state: 'rerun' } }), 'startAgain')
  assert.equal(m.queueAction({ task: { state: 'done', sessionId: 's' } }), 'open')
  assert.equal(m.queueAction({ task: { state: 'done' } }), null)
  const q = m.sortQueue([{ task: { state: 'pending', assignedAt: iso(1) } }, { task: { state: 'done' } }, { task: { state: 'active' } }, { task: { state: 'pending', assignedAt: iso(5) } }])
  assert.deepEqual(q.map((i) => i.task.state), ['active', 'pending', 'pending', 'done'])
  assert.equal(m.daysSince(q[1].task.assignedAt, now), 5)
})

test('pctOf is honest at zero', () => {
  assert.equal(m.pctOf(3, 0), 0); assert.equal(m.pctOf(1, 4), 25); assert.equal(m.pctOf(9, 4), 100)
})
