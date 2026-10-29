import test from 'node:test'
import assert from 'node:assert/strict'
import { execOverview } from './exec_overview.js'

const productivity = {
  tasksCompleted: 7,
  topMembers: [{ id: 'u1', name: 'A', tasks: 5 }],
  membersRanked: [{ id: 'u1', name: 'A', tasks: 5 }, { id: 'u2', name: 'B', tasks: 2 }],
  estimated: { basis: 'hypothetical', timeSavedHours: 3, dollarsSaved: 150 },
}
const members = [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }, { id: 'pm', name: 'PM' }]
const projects = [
  { id: 'p1', name: 'Big', managerId: 'pm', state: 'ongoing', held: false, tasks: [
    { assigneeId: 'u1', state: 'done' }, { assigneeId: 'u1', state: 'done' }, { assigneeId: 'u2', state: 'pending' },
  ] },
  { id: 'p2', name: 'Small', managerId: 'pm', state: 'done', held: false, tasks: [{ assigneeId: 'u1', state: 'done' }] },
  { id: 'p3', name: 'Held', managerId: null, state: 'ongoing', held: true, tasks: [] },
]

test('projects: total, status rollup, and the big-project view by task load', () => {
  const o = execOverview({ productivity, projects, members })
  assert.equal(o.projects.total, 3)
  assert.deepEqual(o.projects.status, { done: 1, ongoing: 1, held: 1 })
  const big = o.projects.topByTasks[0]
  assert.equal(big.id, 'p1')
  assert.equal(big.taskCount, 3)
  assert.equal(big.doneCount, 2)
  assert.equal(big.completionPct, 67)
  assert.equal(big.assigneeCount, 2)
  assert.equal(big.managerName, 'PM')
})

test('performers on both axes', () => {
  const o = execOverview({ productivity, projects, members })
  // task axis = the full ranking from productivity, not just the top 8
  assert.deepEqual(o.performers.byTasks.map((x) => x.id), ['u1', 'u2'])
  // project axis: u1 is in two projects with two done tasks; pm manages two
  const u1 = o.performers.byProjects.find((x) => x.id === 'u1')
  assert.equal(u1.projects, 2)
  assert.equal(u1.tasksDone, 3)   // two done in p1 + one in p2
  assert.equal(o.performers.byProjects[0].id, 'u1')   // most projects first
  const pm = o.performers.byProjects.find((x) => x.id === 'pm')
  assert.equal(pm.manages, 2)
  assert.equal(pm.projects, 0)
})

test('ROI passes through untouched, and nothing names an AI model or cost', () => {
  const o = execOverview({ productivity, projects, members })
  assert.equal(o.productivity.estimated.dollarsSaved, 150)
  assert.equal(JSON.stringify(o).toLowerCase().includes('anthropic'), false)
  assert.equal(JSON.stringify(o).toLowerCase().includes('aicost'), false)
})

test('empty company: no projects, no performers, zeroed status', () => {
  const o = execOverview({ productivity: null, projects: [], members: [] })
  assert.deepEqual(o.projects, { total: 0, status: { done: 0, ongoing: 0, held: 0 }, rollup: [], topByTasks: [] })
  assert.deepEqual(o.performers, { byTasks: [], byProjects: [] })
})
