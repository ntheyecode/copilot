// ===========================================================================
// WorkCoPilot company console routes for the integration API (browser session):
//   - API keys: list / create / rotate / revoke / usage (company admin only);
//   - webhooks: the same operations the v1 API offers, for the admin console;
//   - launch links: the employee-side redeem for a link a customer app created.
//
// Session auth only (requireWorkAuth + requireCompanyAdmin); an API key can never
// reach these routes, so a key can never mint, rotate or revoke keys. Creating
// or rotating a key, or registering a webhook / rotating its secret, while a
// superadmin is impersonating the admin is refused: a support session must never
// leave a working credential or a new data destination behind.
// Errors answer `{ error, code }` (api_errors.js).
// ===========================================================================
import { makeApiWrap, sendApiError } from './api_errors.js'
import { publicScopes } from './api_scopes.js'

// deps: { store, requireWorkAuth, requireCompanyAdmin, onInternal(e, req) }
export function registerApiAdminRoutes(app, { store, requireWorkAuth, requireCompanyAdmin, onInternal = () => {} }) {
  const wrap = makeApiWrap(onInternal)
  // No response here may be cached: create / rotate answers carry a show-once secret.
  const noStore = (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next() }
  const admin = [noStore, requireWorkAuth, requireCompanyAdmin]
  const uid = (req) => req.workUser.id
  const cid = (req) => req.workUser.companyId
  const me = (req) => ({ userId: req.workUser.id })
  const noCompany = (req, res) => {
    if (cid(req)) return false
    sendApiError(res, 403, 'FORBIDDEN', 'API keys and webhooks belong to a company account.')
    return true
  }
  const impersonating = (req, res) => {
    if (!req.impersonating) return false
    sendApiError(res, 403, 'IMPERSONATION_BLOCKED', 'Keys and webhook secrets cannot be created or rotated during a support session. The company admin must do this themselves.')
    return true
  }

  // ---- API keys ----
  app.get('/api/work/company/api-keys', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json({ keys: store.listApiKeys(uid(req)), scopes: publicScopes(), stepUp: { required: store.apiKeyStepUpRequired(uid(req)) } })
  }))
  app.post('/api/work/company/api-keys', ...admin, wrap((req, res) => {
    if (noCompany(req, res) || impersonating(req, res)) return
    const b = req.body || {}
    res.status(201).json(store.createApiKey(uid(req), { name: b.name, scopes: b.scopes, expiresInDays: b.expiresInDays, ipAllowlist: b.ipAllowlist, mfaToken: b.mfaToken }))
  }))
  app.post('/api/work/company/api-keys/:id/rotate', ...admin, wrap((req, res) => {
    if (noCompany(req, res) || impersonating(req, res)) return
    const b = req.body || {}
    res.json(store.rotateApiKey(uid(req), req.params.id, { mfaToken: b.mfaToken, graceMinutes: b.graceMinutes }))
  }))
  app.delete('/api/work/company/api-keys/:id', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.revokeApiKey(uid(req), req.params.id))
  }))
  app.get('/api/work/company/api-keys/:id/usage', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json({ usage: store.listApiKeyUsage(uid(req), req.params.id) })
  }))

  // ---- Webhooks (same store API the v1 routes use) ----
  app.get('/api/work/company/webhooks', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.listWebhooks(cid(req)))
  }))
  app.post('/api/work/company/webhooks', ...admin, wrap(async (req, res) => {
    if (noCompany(req, res) || impersonating(req, res)) return
    res.status(201).json(await store.createWebhook(cid(req), me(req), req.body || {}))
  }))
  app.patch('/api/work/company/webhooks/:id', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.updateWebhook(cid(req), me(req), req.params.id, req.body || {}))
  }))
  app.delete('/api/work/company/webhooks/:id', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.deleteWebhook(cid(req), me(req), req.params.id))
  }))
  app.post('/api/work/company/webhooks/:id/rotate-secret', ...admin, wrap((req, res) => {
    if (noCompany(req, res) || impersonating(req, res)) return
    res.json(store.rotateWebhookSecret(cid(req), me(req), req.params.id))
  }))
  app.post('/api/work/company/webhooks/:id/test', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.testWebhook(cid(req), me(req), req.params.id))
  }))
  app.get('/api/work/company/webhooks/:id/deliveries', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json({ deliveries: store.listWebhookDeliveries(cid(req), req.params.id) })
  }))
  app.post('/api/work/company/webhooks/deliveries/:deliveryId/retry', ...admin, wrap((req, res) => {
    if (noCompany(req, res)) return
    res.json(store.retryWebhookDelivery(cid(req), req.params.deliveryId))
  }))

  // ---- Launch link redeem (the employee, in their OWN session) ----
  // Returns the workflow to start; the client then calls the normal
  // /api/work/workflows/:id/start, so every usage gate still applies.
  app.post('/api/work/launch/redeem', requireWorkAuth, wrap((req, res) => {
    if (req.impersonating) return sendApiError(res, 403, 'IMPERSONATION_BLOCKED', 'Launch links cannot be opened during a support session.')
    res.json(store.redeemLaunchLink(req.workUser.id, (req.body || {}).token))
  }))
}

export default { registerApiAdminRoutes }
