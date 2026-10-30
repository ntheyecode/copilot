// ===========================================================================
// WorkCoPilot integration API v1 (`/api/v1/...`): routes for customer apps.
//
// V1_ROUTES is the ONE table of v1 operations: registerV1Routes mounts exactly
// these (each behind requireApiKey(<its scope>)), and openapi_v1.js documents
// exactly these, so the published OpenAPI document cannot drift from the server
// (a test also compares it with the live router).
//
// Every handler takes the company ONLY from req.apiPrincipal.companyId (the
// authenticated key), never from the URL or the body, so a key from company A
// can never read or change company B.
// ===========================================================================
import { SCOPE } from './api_scopes.js'
import { sendApiError, sendThrown, makeApiWrap } from './api_errors.js'
import { v1WorkflowSummary, v1Workflow, v1Incident } from './api_v1_shapes.js'
import { buildOpenApi } from './openapi_v1.js'

// op: handler name; body/ok: component schema names used by the OpenAPI doc.
export const V1_ROUTES = Object.freeze([
  { method: 'post', path: '/api/v1/brain/query', scope: SCOPE.BRAIN_QUERY, op: 'brainQuery', summary: 'Search your Company Brain', body: 'BrainQueryRequest', ok: 'BrainQueryResult' },
  { method: 'get', path: '/api/v1/workflows', scope: SCOPE.WORKFLOWS_READ, op: 'listWorkflows', summary: 'List published workflows', ok: 'WorkflowList' },
  { method: 'get', path: '/api/v1/workflows/:id', scope: SCOPE.WORKFLOWS_READ, op: 'getWorkflow', summary: 'Read one published workflow with its steps', ok: 'Workflow' },
  { method: 'post', path: '/api/v1/workflows/:id/launch', scope: SCOPE.WORKFLOWS_RUN, op: 'launchWorkflow', summary: 'Create a single-use link for a named employee to run a workflow', body: 'LaunchRequest', ok: 'LaunchLink', status: 201 },
  { method: 'get', path: '/api/v1/incidents', scope: SCOPE.INCIDENTS_READ, op: 'listIncidents', summary: 'List workflow incidents', ok: 'IncidentList', query: ['state', 'workflowId', 'limit'] },
  { method: 'get', path: '/api/v1/incidents/:id', scope: SCOPE.INCIDENTS_READ, op: 'getIncident', summary: 'Read one workflow incident', ok: 'Incident' },
  { method: 'get', path: '/api/v1/webhooks', scope: SCOPE.WEBHOOKS_MANAGE, op: 'listWebhooks', summary: 'List webhook endpoints and the events you can subscribe to', ok: 'WebhookList' },
  { method: 'post', path: '/api/v1/webhooks', scope: SCOPE.WEBHOOKS_MANAGE, op: 'createWebhook', summary: 'Register an HTTPS webhook endpoint (the signing secret is returned once)', body: 'WebhookCreate', ok: 'WebhookWithSecret', status: 201 },
  { method: 'patch', path: '/api/v1/webhooks/:id', scope: SCOPE.WEBHOOKS_MANAGE, op: 'updateWebhook', summary: 'Change events, description or enabled', body: 'WebhookUpdate', ok: 'WebhookEnvelope' },
  { method: 'delete', path: '/api/v1/webhooks/:id', scope: SCOPE.WEBHOOKS_MANAGE, op: 'deleteWebhook', summary: 'Delete a webhook endpoint and its delivery history', ok: 'Ok' },
  { method: 'post', path: '/api/v1/webhooks/:id/rotate-secret', scope: SCOPE.WEBHOOKS_MANAGE, op: 'rotateWebhookSecret', summary: 'Replace the signing secret (the new one is returned once)', ok: 'WebhookWithSecret' },
  { method: 'post', path: '/api/v1/webhooks/:id/test', scope: SCOPE.WEBHOOKS_MANAGE, op: 'testWebhook', summary: 'Queue a ping delivery', ok: 'DeliveryEnvelope' },
  { method: 'get', path: '/api/v1/webhooks/:id/deliveries', scope: SCOPE.WEBHOOKS_MANAGE, op: 'listDeliveries', summary: 'Recent deliveries for an endpoint, including dead-lettered ones', ok: 'DeliveryList' },
  { method: 'post', path: '/api/v1/webhooks/deliveries/:deliveryId/retry', scope: SCOPE.WEBHOOKS_MANAGE, op: 'retryDelivery', summary: 'Re-queue a failed or dead-lettered delivery', ok: 'DeliveryEnvelope' },
])

const MAX_QUERY_CHARS = 2000
const cid = (req) => req.apiPrincipal.companyId
// v1 never names a person: the console shows who registered an endpoint, the API does not.
const noPerson = (e) => (e ? { ...e, createdBy: { id: null, name: '' } } : e)
const scrubWebhookOut = (out) => ({
  ...out,
  ...(out.endpoint ? { endpoint: noPerson(out.endpoint) } : {}),
  ...(out.endpoints ? { endpoints: out.endpoints.map(noPerson) } : {}),
})
const actor = (req) => ({ keyId: req.apiPrincipal.keyId })

// deps: { store, requireApiKey, queryBrain, BrainQueryError, publicBase, onInternal(e, req) }
export function registerV1Routes(app, deps) {
  const { store, requireApiKey, queryBrain, BrainQueryError, publicBase } = deps
  const wrap = makeApiWrap(deps.onInternal || (() => {}))

  const handlers = {
    async brainQuery(req, res) {
      const b = req.body || {}
      if (typeof b.q === 'string' && b.q.length > MAX_QUERY_CHARS) return sendApiError(res, 400, 'BAD_QUERY', `Keep the query under ${MAX_QUERY_CHARS} characters.`)
      try {
        res.json(await queryBrain(cid(req), { q: b.q, topK: b.topK }))
      } catch (e) {
        if (e instanceof BrainQueryError) return sendApiError(res, e.status || 400, e.code, e.message)
        throw e
      }
    },
    listWorkflows(req, res) {
      res.json({ workflows: store.listPublishedWorkflowsForCompany(cid(req)).map(v1WorkflowSummary) })
    },
    getWorkflow(req, res) {
      const w = store.getPublishedWorkflowForCompany(cid(req), req.params.id)
      if (!w) return sendApiError(res, 404, 'NOT_FOUND', 'No published workflow with that id in your company.')
      res.json({ workflow: v1Workflow(w) })
    },
    launchWorkflow(req, res) {
      const b = req.body || {}
      const out = store.createLaunchLink(cid(req), { workflowId: req.params.id, employee: b.employee, ttlSec: b.ttlSec, keyId: req.apiPrincipal.keyId })
      res.status(201).json({
        url: `${publicBase}/work/launch#${out.token}`, expiresAt: out.expiresAt,
        launchId: out.launchId, workflowId: out.workflowId, employeeId: out.employeeId,
      })
    },
    listIncidents(req, res) {
      const q = req.query || {}
      const list = store.listIncidentsForCompany(cid(req), { state: q.state ? String(q.state) : null, workflowId: q.workflowId ? String(q.workflowId) : null, limit: q.limit })
      res.json({ incidents: list.map(v1Incident) })
    },
    getIncident(req, res) {
      const x = store.getIncidentForCompany(cid(req), req.params.id)
      if (!x) return sendApiError(res, 404, 'NOT_FOUND', 'No incident with that id in your company.')
      res.json({ incident: v1Incident(x) })
    },
    listWebhooks(req, res) { res.json(scrubWebhookOut(store.listWebhooks(cid(req)))) },
    async createWebhook(req, res) { res.status(201).json(scrubWebhookOut(await store.createWebhook(cid(req), actor(req), req.body || {}))) },
    updateWebhook(req, res) { res.json(scrubWebhookOut(store.updateWebhook(cid(req), actor(req), req.params.id, req.body || {}))) },
    deleteWebhook(req, res) { res.json(store.deleteWebhook(cid(req), actor(req), req.params.id)) },
    rotateWebhookSecret(req, res) { res.json(scrubWebhookOut(store.rotateWebhookSecret(cid(req), actor(req), req.params.id))) },
    testWebhook(req, res) { res.json(store.testWebhook(cid(req), actor(req), req.params.id)) },
    listDeliveries(req, res) { res.json({ deliveries: store.listWebhookDeliveries(cid(req), req.params.id) }) },
    retryDelivery(req, res) { res.json(store.retryWebhookDelivery(cid(req), req.params.deliveryId)) },
  }

  for (const r of V1_ROUTES) {
    const h = handlers[r.op]
    if (typeof h !== 'function') throw new Error(`[routes_v1] no handler for ${r.op}`)
    app[r.method](r.path, requireApiKey(r.scope), wrap(h))
  }

  // The contract, public (no key): it documents the API, it holds no data.
  const doc = buildOpenApi({ routes: V1_ROUTES, serverUrl: publicBase })
  app.get('/api/v1/openapi.json', (req, res) => { res.setHeader('Cache-Control', 'public, max-age=300'); res.json(doc) })

  // Unknown v1 path or method: the v1 error shape, never the app's HTML or { error } only.
  app.use('/api/v1', (req, res) => sendApiError(res, 404, 'NOT_FOUND', `No such API route: ${req.method} ${String(req.baseUrl + req.path).slice(0, 200)}`))
  // Errors raised before a handler (bad JSON, body too large) also answer in the
  // v1 shape. Registered here, ahead of any app-wide error handler.
  // eslint-disable-next-line no-unused-vars
  app.use('/api/v1', (e, req, res, _next) => sendThrown(res, e, (x) => (deps.onInternal || (() => {}))(x, req)))
}

export default { V1_ROUTES, registerV1Routes }
