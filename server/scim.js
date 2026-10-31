// ---------------------------------------------------------------------------
// WorkCoPilot - SCIM 2.0 provisioning endpoint (RFC 7643 / 7644 subset).
// ---------------------------------------------------------------------------
// Base URL a company pastes into Okta or Microsoft Entra ID:
//   https://<host>/api/work/scim/v2
// Auth: `Authorization: Bearer wcp_scim_...`, a company-scoped token created in
// the company console (scim_store.js: hashed, constant-time compare). Every
// request reaches ONLY that token's company. Responses use
// application/scim+json and SCIM error bodies.
//
// Its own router with its own body parser: SCIM clients send
// application/scim+json, which the app-wide JSON parser does not read.
// ---------------------------------------------------------------------------
import express from 'express'
import { publicOrigin } from './sso.js'
import * as R from './scim_rules.js'
import { bearerFrom } from './api_key_rules.js'

export const SCIM_BASE_PATH = '/api/work/scim/v2'

// Wrong-token attempts per client address: after LIMIT in WINDOW the address
// gets 429 until the window passes (a token cannot be guessed, but the attempt
// still costs an HMAC, so it is bounded).
const WINDOW_MS = 15 * 60 * 1000
const LIMIT = 50
const fails = new Map()
function blocked(ip) {
  const f = fails.get(ip)
  if (!f) return false
  if (Date.now() - f.first > WINDOW_MS) { fails.delete(ip); return false }
  return f.count >= LIMIT
}
function fail(ip) {
  const f = fails.get(ip)
  if (!f || Date.now() - f.first > WINDOW_MS) fails.set(ip, { count: 1, first: Date.now() })
  else f.count += 1
  if (fails.size > 10000) fails.delete(fails.keys().next().value)
}

export function registerScimRoutes(app, deps = {}) {
  const { store } = deps
  if (!app || !store) throw new Error('registerScimRoutes: missing required deps')
  const router = express.Router()
  router.use(express.json({ limit: '1mb', type: ['application/scim+json', 'application/json'] }))

  const send = (res, r) => {
    res.status(r.status).type('application/scim+json')
    if (r.body == null) return res.end()
    res.send(JSON.stringify(r.body))
  }

  // Authenticate every request; never reveal anything without a valid token.
  router.use((req, res, next) => {
    const ip = String(req.ip || req.socket?.remoteAddress || '')
    if (blocked(ip)) return send(res, R.scimError(429, 'Too many failed attempts. Try again later.'))
    const raw = bearerFrom(req.headers.authorization)
    const who = store.resolveScimToken(raw)
    if (!who.ok) { fail(ip); res.set('WWW-Authenticate', 'Bearer'); return send(res, R.scimError(who.status, who.detail)) }
    req.scim = { companyId: who.companyId, tokenId: who.tokenId, base: publicOrigin(req) + SCIM_BASE_PATH }
    next()
  })

  router.get('/ServiceProviderConfig', (req, res) => send(res, { status: 200, body: R.serviceProviderConfig(req.scim.base) }))
  router.get('/ResourceTypes', (req, res) => send(res, { status: 200, body: R.resourceTypes(req.scim.base) }))
  router.get('/Schemas', (req, res) => send(res, { status: 200, body: R.listResponse([
    { id: R.SCHEMA_USER, name: 'User', description: 'User account' },
    { id: R.SCHEMA_GROUP, name: 'Group', description: 'Group' },
  ], 2, 1) }))

  const U = store.scimUsers
  const G = store.scimGroups
  router.get('/Users', (req, res) => send(res, U.list(req.scim.companyId, req.query, req.scim.base)))
  router.post('/Users', (req, res) => send(res, U.create(req.scim.companyId, req.body, req.scim.base, req.scim.tokenId)))
  router.get('/Users/:id', (req, res) => send(res, U.get(req.scim.companyId, req.params.id, req.scim.base)))
  router.put('/Users/:id', (req, res) => send(res, U.replace(req.scim.companyId, req.params.id, req.body, req.scim.base, req.scim.tokenId)))
  router.patch('/Users/:id', (req, res) => send(res, U.patch(req.scim.companyId, req.params.id, req.body, req.scim.base, req.scim.tokenId)))
  router.delete('/Users/:id', (req, res) => send(res, U.remove(req.scim.companyId, req.params.id, req.scim.tokenId)))

  router.get('/Groups', (req, res) => send(res, G.list(req.scim.companyId, req.query, req.scim.base)))
  router.post('/Groups', (req, res) => send(res, G.create(req.scim.companyId, req.body, req.scim.base, req.scim.tokenId)))
  router.get('/Groups/:id', (req, res) => send(res, G.get(req.scim.companyId, req.params.id, req.scim.base, req.query)))
  router.put('/Groups/:id', (req, res) => send(res, G.replace(req.scim.companyId, req.params.id, req.body, req.scim.base, req.scim.tokenId)))
  router.patch('/Groups/:id', (req, res) => send(res, G.patch(req.scim.companyId, req.params.id, req.body, req.scim.base, req.scim.tokenId)))
  router.delete('/Groups/:id', (req, res) => send(res, G.remove(req.scim.companyId, req.params.id, req.scim.tokenId)))

  router.use((req, res) => send(res, R.scimError(404, 'Not found.')))
  // A malformed JSON body (or any thrown error) still answers in SCIM form.
  router.use((err, req, res, next) => { void next; send(res, R.scimError(err && err.status === 413 ? 413 : 400, err && err.type === 'entity.parse.failed' ? 'The request body is not valid JSON.' : 'The request could not be processed.', 'invalidSyntax')) })

  app.use(SCIM_BASE_PATH, router)
}

export default { registerScimRoutes, SCIM_BASE_PATH }
