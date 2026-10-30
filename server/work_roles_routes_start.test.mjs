import test from 'node:test'
import assert from 'node:assert/strict'
import { registerWorkRolesRoutes } from './work_roles_routes.js'
import * as work from './work.js'

const A = 'a'.repeat(32) + '.jpg'
const PUB = { id: 'w1', groupId: 'g1', version: 2, state: 'published', meta: { title: 'Raise a transfer', productName: 'Zamina' }, steps: [{ id: 's1', instruction: 'Open Transfers', target: 'Transfers', doneWhen: 'List shows', shot: A }] }

function setup({ workflow = PUB, allow = true, getErr = null } = {}) {
  const routes = new Map()
  const app = { get() {}, patch() {}, delete() {}, post: (p, ...h) => routes.set(p, h[h.length - 1]) }
  const calls = { gate: 0, steps: null, ref: null, events: [], sessions: 0, policyText: null }
  const store = {
    getWorkflowForUser: () => { if (getErr) throw getErr; return workflow },
    createWorkSession: (_u, o) => { calls.sessions++; calls.goal = o.goal; return { id: 'ws1' } },
    setWorkSessionSteps: (_u, _s, steps) => { calls.steps = steps },
    setWorkSessionOverview: () => {},
    setWorkSessionWorkflowRef: (_u, _s, r) => { calls.ref = r },
    appendWorkEvent: (_u, _s, e) => calls.events.push(e),
    getWorkSession: () => ({ id: 'ws1', steps: calls.steps }),
    getWorkTaskUsage: () => ({ used: 1 }),
  }
  const beginWorkTask = (_q, res) => { calls.gate++; if (!allow) { res.status(402).json({ error: 'Out of hours', outOfHours: true }); return false } return true }
  const pass = (_q, _s, n) => n && n()
  const wrap = (f) => async (req, res) => { try { await f(req, res) } catch (e) { res.status(e.status || 500).json({ error: e.message }) } }
  registerWorkRolesRoutes(app, { store, work, ai: {}, requireWorkAuth: pass, requireWorkSubscription: pass, guardUserText: () => {}, wrap, resolveWorkRuntime: async () => null, bestPlanningCall: async () => ({}), sendWorkError: (res, e) => res.status(e.status || 500).json({ error: e.message }), beginWorkTask,
    runPolicyGate: async (_u, _s, text) => { calls.policyText = text; return { findings: [], counts: { forbid: 0, require: 0 }, rulesChecked: 2 } } })
  const handler = routes.get('/api/work/workflows/:id/start')
  const run = async () => {
    const res = { code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this } }
    await handler({ workUser: { id: 'm' }, params: { id: 'w1' } }, res)
    return res
  }
  return { run, calls }
}

test('start: a published workflow becomes a guided session with its own steps, linked to the workflow', async () => {
  const { run, calls } = setup()
  const res = await run()
  assert.equal(res.code, 200)
  assert.equal(res.body.sessionId, 'ws1')
  assert.equal(calls.gate, 1)
  assert.equal(calls.goal, 'Raise a transfer (Zamina)')
  assert.equal(calls.steps[0].text, 'Open **Transfers**')
  assert.equal(calls.steps[0].validate, 'List shows')
  assert.equal(calls.steps[0].shot, A)
  assert.deepEqual(calls.ref, { id: 'w1', groupId: 'g1', version: 2, title: 'Raise a transfer' })
  assert.match(calls.events[0].text, /Following the "Raise a transfer" workflow/)
})

test('start: drafts and empty workflows are refused before any usage is counted', async () => {
  const d = setup({ workflow: { ...PUB, state: 'draft' } })
  const r1 = await d.run()
  assert.deepEqual([r1.code, r1.body.code, d.calls.gate], [409, 'WORKFLOW_NOT_PUBLISHED', 0])
  const e = setup({ workflow: { ...PUB, steps: [{ id: 's1', instruction: ' ' }] } })
  const r2 = await e.run()
  assert.deepEqual([r2.code, r2.body.code, e.calls.gate], [409, 'WORKFLOW_EMPTY', 0])
})

test('start: the usage gate answers and no session is created when it says no', async () => {
  const { run, calls } = setup({ allow: false })
  const res = await run()
  assert.equal(res.code, 402)
  assert.equal(res.body.outOfHours, true)
  assert.equal(calls.sessions, 0)
})

test('start: a workflow the user cannot see stays invisible (store visibility rule)', async () => {
  const { run, calls } = setup({ getErr: Object.assign(new Error('Workflow not found.'), { status: 404 }) })
  const res = await run()
  assert.equal(res.code, 404)
  assert.equal(calls.gate, 0)
})

test('start: the steps go through the company-policy gate and its result is returned', async () => {
  const { run, calls } = setup()
  const res = await run()
  assert.ok(calls.policyText.includes('Open **Transfers**'))
  assert.equal(res.body.policy.rulesChecked, 2)
})
