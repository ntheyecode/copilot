import test from 'node:test'
import assert from 'node:assert/strict'
import { registerWorkflowIncidentRoutes } from './workflow_incidents_routes.js'
import { makeWrap } from './route_wrap.js'

function setup(store) {
  const routes = new Map()
  const reg = (m) => (p, ...h) => routes.set(`${m} ${p}`, h[h.length - 1])
  const app = { get: reg('GET'), post: reg('POST'), patch: reg('PATCH'), delete: reg('DELETE') }
  const wrap = makeWrap((res, e) => res.status(e.status || 500).json({ error: e.message }))
  registerWorkflowIncidentRoutes(app, { store, requireWorkAuth: (_q, _s, n) => n(), wrap })
  return async (key, { params = {}, query = {}, body = {} } = {}) => {
    const res = { code: 200, body: null, headers: {}, headersSent: false, status(c) { this.code = c; return this }, json(b) { this.body = b; this.headersSent = true; return this }, setHeader(k, v) { this.headers[k] = v }, send(b) { this.body = b; this.headersSent = true } }
    await routes.get(key)({ workUser: { id: 'u1' }, params, query, body }, res)
    return res
  }
}

test('incident routes pass the acting user and filters through, and errors become answers (access rules: workflow_incidents.test.mjs)', async () => {
  const seen = {}
  const call = setup({
    listWorkflowIncidents: (uid, o) => { seen.list = [uid, o]; return { incidents: [], summary: {}, canManage: true } },
    setWorkflowIncidentState: (uid, id, o) => { seen.set = [uid, id, o]; return { id, state: o.state } },
    readWorkflowIncidentFrame: () => { const e = new Error('This incident has no screenshot.'); e.status = 404; throw e },
    adoptWorkflowIncidentStep: (uid, id) => ({ workflow: { id: 'd1' }, incident: { id } }),
    listWorkflowAlerts: (uid) => [{ id: 'n1', uid }], unreadWorkflowAlerts: () => 1,
    markWorkflowAlertsRead: (uid, id) => ({ unread: 0, uid, id }),
  })
  await call('GET /api/work/workflow-incidents', { query: { state: 'active', workflow: 'g1' } })
  assert.deepEqual(seen.list, ['u1', { state: 'active', workflowId: 'g1', limit: 200 }])
  const p = await call('PATCH /api/work/workflow-incidents/:id', { params: { id: 'wi1' }, body: { state: 'resolved', note: 'fixed' } })
  assert.deepEqual(p.body, { incident: { id: 'wi1', state: 'resolved' } })
  const f = await call('GET /api/work/workflow-incidents/:id/frame', { params: { id: 'wi1' } })
  assert.deepEqual([f.code, f.body.error], [404, 'This incident has no screenshot.'])
  const a = await call('POST /api/work/workflow-incidents/:id/adopt', { params: { id: 'wi1' } })
  assert.equal(a.body.workflow.id, 'd1')
  const n = await call('GET /api/work/workflow-incidents-alerts')
  assert.deepEqual(n.body, { alerts: [{ id: 'n1', uid: 'u1' }], unread: 1 })
  const r = await call('POST /api/work/workflow-incidents-alerts/read', { body: {} })
  assert.deepEqual(r.body, { unread: 0, uid: 'u1', id: '*' })
})
