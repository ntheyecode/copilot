// ===========================================================================
// WorkCoPilot integration API v1: the OpenAPI 3.1 document, BUILT from the route
// table (routes_v1.js V1_ROUTES), the scope registry and the webhook event
// registry, so it is never hand-maintained beside them (SUPREME RULE II).
// ===========================================================================
import { SCOPES, SCOPE_IDS } from './api_scopes.js'
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_IDS } from './webhook_events.js'
import { SIGNATURE_HEADER, EVENT_HEADER, DELIVERY_HEADER, DEFAULT_TOLERANCE_SEC, MAX_ATTEMPTS } from './webhook_rules.js'

const str = { type: 'string' }
const strN = { type: ['string', 'null'] }
const int = { type: 'integer' }
const intN = { type: ['integer', 'null'] }
const ref = (n) => ({ $ref: `#/components/schemas/${n}` })
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false })
const arr = (items) => ({ type: 'array', items })

const SCHEMAS = {
  Error: obj({ error: { type: 'string', description: 'A sentence a person can act on.' }, code: { type: 'string', description: 'A stable machine id, for example INVALID_KEY or INSUFFICIENT_SCOPE.' } }),
  Ok: obj({ ok: { type: 'boolean', const: true } }),
  BrainQueryRequest: obj({ q: { type: 'string', minLength: 1 }, topK: { type: 'integer', minimum: 1, maximum: 20, default: 6 } }, ['q']),
  BrainHit: obj({ text: str, score: { type: 'number' }, source: obj({ sourceId: str, title: str, revision: { type: ['integer', 'string', 'null'] } }) }),
  BrainQueryResult: {
    type: 'object', required: ['matched', 'topK', 'semanticSearchReady', 'hits'],
    properties: { matched: { type: 'boolean' }, topK: int, semanticSearchReady: { type: 'boolean' }, hits: arr(ref('BrainHit')), note: str, semanticNote: str },
  },
  WorkflowSummary: obj({
    id: str, groupId: str, version: int, title: str, productName: str, productVersion: str, category: str, language: str,
    durationMin: intN, prerequisites: str, launchTarget: str, webLink: str, publishedAt: strN, updatedAt: strN, stepCount: int,
  }),
  WorkflowStep: obj({ id: str, index: int, instruction: str, target: strN, doneWhen: strN }),
  Workflow: { allOf: [ref('WorkflowSummary'), { type: 'object', properties: { steps: arr(ref('WorkflowStep')) }, required: ['steps'] }] },
  WorkflowList: obj({ workflows: arr(ref('WorkflowSummary')) }),
  WorkflowEnvelope: obj({ workflow: ref('Workflow') }),
  LaunchRequest: obj({
    employee: { type: 'object', description: 'The employee who will run it: their WorkCoPilot user id, or the email they sign in with.', properties: { id: str, email: str }, additionalProperties: false },
    ttlSec: { type: 'integer', minimum: 60, maximum: 3600, default: 600 },
  }, ['employee']),
  LaunchLink: obj({ url: { type: 'string', description: 'Open this in the employee\'s browser. Single use, short lived, and it only works once THAT employee signs in.' }, expiresAt: str, launchId: str, workflowId: str, employeeId: str }),
  Incident: obj({
    id: str, kind: str, state: { type: 'string', enum: ['open', 'acknowledged', 'resolved', 'dismissed'] }, why: str, stepIndex: intN, stepText: str,
    extraStep: strN, count: int, firstAt: strN, lastAt: strN, decidedAt: strN,
    workflow: obj({ id: str, groupId: str, version: intN, title: str }),
  }),
  IncidentList: obj({ incidents: arr(ref('Incident')) }),
  IncidentEnvelope: obj({ incident: ref('Incident') }),
  WebhookEndpoint: obj({
    id: str, url: str, host: str, events: arr({ type: 'string', enum: WEBHOOK_EVENT_IDS.filter((e) => e !== 'ping') }), description: str, enabled: { type: 'boolean' },
    createdAt: str, createdBy: obj({ id: strN, name: str }), secretLast4: str, lastDeliveryAt: strN,
    lastStatus: { type: ['string', 'null'], enum: ['ok', 'failed', null] }, consecutiveFailures: int, disabledReason: strN,
    droppedEvents: { type: 'integer', description: 'Events not queued because your company had too many deliveries waiting.' },
  }),
  WebhookEvent: obj({ id: { type: 'string', enum: WEBHOOK_EVENT_IDS }, description: str }),
  WebhookList: obj({ endpoints: arr(ref('WebhookEndpoint')), events: arr(ref('WebhookEvent')) }),
  WebhookCreate: obj({ url: { type: 'string', format: 'uri', description: 'A public https URL (port 443 or 8443, a domain name, never an IP address).' }, events: arr({ type: 'string', enum: WEBHOOK_EVENT_IDS.filter((e) => e !== 'ping') }), description: str }, ['url', 'events']),
  WebhookUpdate: obj({ events: arr({ type: 'string', enum: WEBHOOK_EVENT_IDS.filter((e) => e !== 'ping') }), description: str, enabled: { type: 'boolean' } }, []),
  WebhookEnvelope: obj({ endpoint: ref('WebhookEndpoint') }),
  WebhookWithSecret: obj({ endpoint: ref('WebhookEndpoint'), secret: { type: 'string', description: 'The signing secret. Shown only in this response: store it now.' } }),
  Delivery: obj({
    id: str, endpointId: str, event: str, status: { type: 'string', enum: ['pending', 'delivered', 'dead'], description: 'pending (queued or retrying), delivered, or dead (every retry failed; retry it by hand).' }, attempts: int,
    nextAttemptAt: strN, lastError: strN, lastHttpStatus: intN, createdAt: str, deliveredAt: strN,
  }),
  DeliveryEnvelope: obj({ delivery: ref('Delivery') }),
  DeliveryList: obj({ deliveries: arr(ref('Delivery')) }),
  EventEnvelope: obj({ id: { type: 'string', description: 'Event id, the same for every endpoint that receives it.' }, type: { type: 'string', enum: WEBHOOK_EVENT_IDS }, createdAt: str, apiVersion: { type: 'string', const: 'v1' }, data: { type: 'object' } }),
}

// The `ok` name in the route table may be a list/item name; map item names to the
// envelope the handler actually returns.
const RESPONSE_OF = { Workflow: 'WorkflowEnvelope', Incident: 'IncidentEnvelope' }

const ERRORS = {
  400: 'The request is not valid (see code).', 401: 'Missing, invalid, revoked or expired API key.',
  403: 'The key lacks the scope, the caller IP is not allowed, or the company is disabled.', 404: 'Not found in your company.',
  409: 'The request conflicts with the current state.', 429: 'Rate limit reached. Wait for the Retry-After seconds.',
  500: 'Something went wrong on our side.',
}

function toOpenApiPath(p) { return p.replace(/:([A-Za-z_]+)/g, '{$1}') }
function paramsOf(p) { return [...p.matchAll(/:([A-Za-z_]+)/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: str })) }

const QUERY = {
  state: { name: 'state', in: 'query', required: false, schema: { type: 'string', enum: ['active', 'open', 'acknowledged', 'resolved', 'dismissed'] } },
  workflowId: { name: 'workflowId', in: 'query', required: false, schema: str, description: 'A workflow id or group id.' },
  limit: { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 } },
}

export function buildOpenApi({ routes, serverUrl }) {
  const paths = {}
  for (const r of routes) {
    const p = toOpenApiPath(r.path)
    const okStatus = String(r.status || 200)
    const op = {
      operationId: r.op, summary: r.summary,
      description: `Requires an API key with the \`${r.scope}\` scope.`,
      security: [{ apiKey: [] }], 'x-required-scope': r.scope,
      parameters: [...paramsOf(r.path), ...(r.query || []).map((q) => QUERY[q])],
      responses: {
        [okStatus]: { description: 'Success', content: { 'application/json': { schema: ref(RESPONSE_OF[r.ok] || r.ok) } } },
        ...Object.fromEntries(Object.entries(ERRORS).map(([s, d]) => [s, { $ref: `#/components/responses/E${s}`, description: d }])),
      },
    }
    if (!op.parameters.length) delete op.parameters
    if (r.body) op.requestBody = { required: true, content: { 'application/json': { schema: ref(r.body) } } }
    ;(paths[p] = paths[p] || {})[r.method] = op
  }
  const responses = Object.fromEntries(Object.entries(ERRORS).map(([s, d]) => [`E${s}`, {
    description: d, content: { 'application/json': { schema: ref('Error') } },
    ...(s === '429' ? { headers: { 'Retry-After': { description: 'Seconds to wait before retrying.', schema: int } } } : {}),
  }]))
  const webhooks = Object.fromEntries(WEBHOOK_EVENTS.map((e) => [e.id, {
    post: {
      summary: e.description,
      description: `Sent to your endpoint as a JSON POST. Verify ${SIGNATURE_HEADER}: \`t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with your signing secret>\`, and reject a t more than ${DEFAULT_TOLERANCE_SEC} seconds from now. Answer 2xx within 10 seconds. Failed deliveries retry with backoff, ${MAX_ATTEMPTS} attempts in total, then wait in the dead-letter list for a manual retry. Delivery is at least once: dedupe on ${DELIVERY_HEADER}. Redirects are not followed.`,
      parameters: [
        { name: SIGNATURE_HEADER, in: 'header', required: true, schema: str },
        { name: EVENT_HEADER, in: 'header', required: true, schema: { type: 'string', const: e.id } },
        { name: DELIVERY_HEADER, in: 'header', required: true, schema: str },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: ref('EventEnvelope') } } },
      responses: { 200: { description: 'Any 2xx acknowledges the delivery.' } },
    },
  }]))
  return {
    openapi: '3.1.0',
    info: {
      title: 'WorkCoPilot Integration API', version: '1.0.0',
      description: 'Let your own apps work with WorkCoPilot. Authenticate with a company API key created by your company admin: `Authorization: Bearer wcp_live_...`. Keep keys on your servers, never in a browser or mobile app. Every key acts for your company only, with exactly the scopes it was given. Errors are `{ error, code }`.',
    },
    servers: [{ url: serverUrl }],
    tags: [{ name: 'v1' }],
    'x-scopes': SCOPES.map((s) => ({ id: s.id, description: s.description })),
    paths,
    webhooks,
    components: {
      securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'wcp_live_<id>_<secret>', description: `Company API key. Scopes: ${SCOPE_IDS.join(', ')}.` } },
      schemas: SCHEMAS,
      responses,
    },
  }
}

export default { buildOpenApi }
