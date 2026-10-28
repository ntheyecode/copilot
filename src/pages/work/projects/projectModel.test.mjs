// Gate for the Projects UI rules (src/pages/work/projects/projectModel.js).
// Run: node --test src/pages/work/projects/*.test.mjs (wired into `npm test`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  progress, isLocked, blockers, visualState, taskActions, pickNext, classifyCreate,
  classifyInject, telemetryView, standaloneSessions, fmtDur,
} from './projectModel.js'

const mk = (id, state, extra = {}) => ({ id, title: id.toUpperCase(), goal: id, doneState: '', order: Number(id.slice(1)), dependsOn: [], state, expanded: false, sessionId: null, outcome: null, telemetry: null, ...extra })
const project = (tasks) => ({ id: 'pr1', customerId: 'default', name: 'P', goal: 'g', endState: { done: 'd', checks: [] }, state: 'active', tasks, learnings: [] })

test('progress counts done over total; a rerun reopens the finish line', () => {
  const p = project([mk('t1', 'done'), mk('t2', 'rerun'), mk('t3', 'pending')])
  assert.deepEqual(progress(p), { done: 1, total: 3, pct: 33 })
  assert.deepEqual(progress(project([])), { done: 0, total: 0, pct: 0 })
})

test('a pending task is locked while a dependency is not done; other states never are', () => {
  const p = project([mk('t1', 'active'), mk('t2', 'pending', { dependsOn: ['t1'] }), mk('t3', 'pending', { dependsOn: ['t9'] }), mk('t4', 'done', { dependsOn: ['t1'] })])
  assert.equal(isLocked(p, p.tasks[1]), true)
  assert.equal(isLocked(p, p.tasks[2]), true, 'a missing dependency reads as not done')
  assert.equal(isLocked(p, p.tasks[3]), false)
  assert.equal(blockers(p, p.tasks[1])[0].id, 't1')
  p.tasks[0].state = 'done'
  assert.equal(isLocked(p, p.tasks[1]), false)
})

test('visual state is the task state, or locked', () => {
  const p = project([mk('t1', 'pending'), mk('t2', 'pending', { dependsOn: ['t1'] }), mk('t3', 'active'), mk('t4', 'done'), mk('t5', 'rerun')])
  assert.deepEqual(p.tasks.map((x) => visualState(p, x)), ['pending', 'locked', 'active', 'done', 'rerun'])
})

test('task actions mirror the store transitions', () => {
  const p = project([mk('t1', 'pending'), mk('t2', 'pending', { dependsOn: ['t1'] }), mk('t3', 'active', { sessionId: 's1' }), mk('t4', 'done', { sessionId: 's2' }), mk('t5', 'rerun'), mk('t6', 'active')])
  assert.deepEqual(taskActions(p, p.tasks[0]), { primary: 'start', menu: [] })
  assert.deepEqual(taskActions(p, p.tasks[1]), { primary: null, menu: [] })
  assert.deepEqual(taskActions(p, p.tasks[2]), { primary: 'continue', menu: ['done', 'pause'] })
  assert.deepEqual(taskActions(p, p.tasks[3]), { primary: 'open', menu: ['rerun'] })
  assert.deepEqual(taskActions(p, p.tasks[4]), { primary: 'start', menu: ['done'] })
  assert.deepEqual(taskActions(p, p.tasks[5]), { primary: 'start', menu: ['done', 'pause'] })
})

test('pick-next: none / next + others / blocked / complete', () => {
  const none = project([mk('t1', 'active'), mk('t2', 'pending')])
  assert.equal(pickNext(none, none.tasks[1], [none.tasks[1]]).kind, 'none')
  const mid = project([mk('t1', 'done', { endedAt: '2026-10-27T10:00:00Z' }), mk('t2', 'pending'), mk('t3', 'pending'), mk('t4', 'pending', { dependsOn: ['t2'] })])
  const r = pickNext(mid, mid.tasks[1], [mid.tasks[1], mid.tasks[2]])
  assert.equal(r.kind, 'next'); assert.equal(r.next.id, 't2'); assert.deepEqual(r.others.map((x) => x.id), ['t3']); assert.equal(r.lastDone.id, 't1')
  assert.equal(pickNext(project([mk('t1', 'done'), mk('t2', 'active'), mk('t3', 'pending', { dependsOn: ['t2'] })]), null, []).kind, 'blocked')
  assert.equal(pickNext(project([mk('t1', 'done'), mk('t2', 'done')]), null, []).kind, 'complete')
})

test('classifyCreate covers every server answer, resolved or thrown', () => {
  assert.equal(classifyCreate({ project: { id: 'x' } }).kind, 'project')
  assert.deepEqual(classifyCreate({ singleTask: true, suggestedGoal: 'do x' }), { kind: 'single', suggestedGoal: 'do x' })
  assert.deepEqual(classifyCreate({ refusal: 'no' }), { kind: 'refusal', text: 'no' })
  assert.equal(classifyCreate(null, { status: 403, data: { needsUpgrade: true, error: 'x' } }).kind, 'upgrade')
  assert.deepEqual(classifyCreate(null, { status: 422, data: { singleTask: true, suggestedGoal: 'g' } }), { kind: 'single', suggestedGoal: 'g' })
  assert.deepEqual(classifyCreate(null, { status: 422, data: { errors: ['a', 'b'] } }), { kind: 'quality', errors: ['a', 'b'] })
  assert.deepEqual(classifyCreate(null, { status: 400, data: { error: 'Say what' } }), { kind: 'invalid', text: 'Say what' })
  assert.equal(classifyCreate(null, { status: 500, data: { error: 'internal detail' } }).kind, 'error')
  assert.equal(classifyCreate(null, new Error('network')).kind, 'error')
})

test('classifyInject maps duplicate / before / after / appended', () => {
  const p = project([mk('t1', 'pending'), mk('t2', 'pending')])
  assert.equal(classifyInject(p, { duplicate: true, task: p.tasks[0] }).kind, 'duplicate')
  const b = classifyInject(p, { duplicate: false, created: mk('t9', 'pending'), placed: { before: 't2' } })
  assert.equal(b.kind, 'before'); assert.equal(b.other.id, 't2')
  assert.equal(classifyInject(p, { duplicate: false, created: mk('t9', 'pending'), placed: { after: 't1' } }).kind, 'after')
  const a = classifyInject(p, { duplicate: false, created: mk('t9', 'pending'), placed: { appended: true, cycleAvoided: true } })
  assert.equal(a.kind, 'appended'); assert.equal(a.cycleAvoided, true)
  assert.equal(classifyInject(p, null).kind, 'error')
})

test('telemetryView whitelists numbers and flags; free text never passes through', () => {
  const v = telemetryView({ plannedBy: 'some-vendor-model', guidedBy: 'another', durationSec: 95, stepCount: 7, deepened: true, failover: true, success: true, reruns: 1 })
  assert.deepEqual(v, { durationSec: 95, steps: 7, deepened: true, backup: true, success: true, reruns: 1 })
  assert.equal(JSON.stringify(v).includes('vendor'), false)
  assert.equal(telemetryView({ plannedBy: 'x' }), null, 'only free text -> nothing to show')
  assert.equal(telemetryView(null), null)
  assert.equal(telemetryView({ duration: 30 }).durationSec, 30)
})

test('standaloneSessions excludes sessions linked to a project task', () => {
  const p = project([mk('t1', 'active', { sessionId: 's1' })])
  const out = standaloneSessions([{ id: 's1' }, { id: 's2' }, null], [p])
  assert.deepEqual(out.map((s) => s.id), ['s2'])
})

test('fmtDur reads compact', () => {
  const u = { h: 'h', min: 'min', s: 's' }
  assert.equal(fmtDur(45, u), '45 s')
  assert.equal(fmtDur(720, u), '12 min')
  assert.equal(fmtDur(4800, u), '1 h 20 min')
  assert.equal(fmtDur(7200, u), '2 h')
})
