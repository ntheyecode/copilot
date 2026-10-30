import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkTaskGate } from './work_task_gate.js'

function fake({ user = { id: 'u', companyId: null }, start = () => {}, trialLeft = 5 } = {}) {
  const log = { consumed: 0 }
  const store = {
    getUser: () => user, startWorkTask: start,
    companyTrialRemaining: () => trialLeft, consumeCompanyTrialSession: () => { log.consumed++ },
  }
  const res = { code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
  return { gate: createWorkTaskGate({ store }), req: { workUser: { id: 'u' } }, res, log }
}

test('allowed: counts the task and, for a company, one trial session', () => {
  const f = fake({ user: { id: 'u', companyId: 'c' } })
  assert.equal(f.gate(f.req, f.res), true)
  assert.equal(f.log.consumed, 1)
})

test('blocked by hours / open tasks: answers with the coded flags', () => {
  const err = Object.assign(new Error('Out of hours'), { status: 402, outOfHours: true, resetLabel: 'Monday' })
  const f = fake({ start: () => { throw err } })
  assert.equal(f.gate(f.req, f.res), false)
  assert.deepEqual([f.res.code, f.res.body.outOfHours, f.res.body.resetLabel], [402, true, 'Monday'])
  const many = Object.assign(new Error('Too many'), { status: 409, tooManyOpen: true, maxOpen: 3, open: 3 })
  const g = fake({ start: () => { throw many } })
  g.gate(g.req, g.res)
  assert.deepEqual([g.res.code, g.res.body.tooManyOpen, g.res.body.maxOpen], [409, true, 3])
})

test('company trial used up: 402 trialExhausted, nothing consumed', () => {
  const f = fake({ user: { id: 'u', companyId: 'c' }, trialLeft: 0 })
  assert.equal(f.gate(f.req, f.res), false)
  assert.equal(f.res.body.trialExhausted, true)
  assert.equal(f.log.consumed, 0)
})

test('the task is counted through startWorkTask, and a task ceiling forwards its fields', () => {
  let started = 0
  const f = fake({ start: () => { started++ } })
  f.gate(f.req, f.res)
  assert.equal(started, 1)
  const cap = Object.assign(new Error('Limit'), { status: 402, taskLimit: true, cap: 20, resetLabel: 'tomorrow', window: 'day' })
  const g = fake({ start: () => { throw cap } })
  assert.equal(g.gate(g.req, g.res), false)
  assert.deepEqual([g.res.body.taskLimit, g.res.body.cap, g.res.body.resetLabel, g.res.body.window], [true, 20, 'tomorrow', 'day'])
})
