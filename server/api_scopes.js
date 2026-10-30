// ===========================================================================
// WorkCoPilot integration API: the ONE registry of API key scopes.
//
// Every company API key carries a subset of these ids, and every /api/v1 route
// declares exactly one of them (routes_v1.js reads V1_ROUTES, which references
// these constants, never a string literal). The admin UI and the OpenAPI document
// read the list from here through the API, so a new scope is added in this file
// and nowhere else (SUPREME RULE II).
//
// None of these reach admin powers: there is deliberately no scope for billing,
// user management, key management, brain ingest/export or company settings.
// ===========================================================================

export const SCOPES = Object.freeze([
  { id: 'brain:query', description: 'Search your Company Brain (read only).' },
  { id: 'workflows:read', description: 'List and read your published workflows.' },
  { id: 'workflows:run', description: 'Create a sign-in link that lets a named employee run a published workflow.' },
  { id: 'incidents:read', description: 'Read workflow incidents raised while employees follow your workflows.' },
  { id: 'webhooks:manage', description: 'Register and manage webhook endpoints for your company.' },
].map((s) => Object.freeze(s)))

export const SCOPE_IDS = Object.freeze(SCOPES.map((s) => s.id))
const SCOPE_SET = new Set(SCOPE_IDS)

// Named constants so route declarations never repeat a literal.
export const SCOPE = Object.freeze({
  BRAIN_QUERY: 'brain:query',
  WORKFLOWS_READ: 'workflows:read',
  WORKFLOWS_RUN: 'workflows:run',
  INCIDENTS_READ: 'incidents:read',
  WEBHOOKS_MANAGE: 'webhooks:manage',
})

export function isScope(id) { return typeof id === 'string' && SCOPE_SET.has(id) }

// Normalize a requested scope list: unique, known ids only, registry order.
// Returns { ok, scopes, unknown }.
export function normalizeScopes(list) {
  const arr = Array.isArray(list) ? list.map((s) => String(s || '').trim()) : []
  const unknown = arr.filter((s) => s && !SCOPE_SET.has(s))
  const want = new Set(arr.filter((s) => SCOPE_SET.has(s)))
  const scopes = SCOPE_IDS.filter((s) => want.has(s))
  return { ok: scopes.length > 0 && unknown.length === 0, scopes, unknown }
}

export function publicScopes() { return SCOPES.map((s) => ({ id: s.id, description: s.description })) }

export default { SCOPES, SCOPE_IDS, SCOPE, isScope, normalizeScopes, publicScopes }
