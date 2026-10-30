// ===========================================================================
// WorkCoPilot webhooks: the ONE registry of public webhook event types.
//
// Each public event names the INTERNAL store event it is derived from (the
// existing emitStoreEvent calls in workflows_store.js / workflow_incidents.js),
// so webhooks never add a parallel hook into the mutations: the worker listens
// on store.onStoreEvent and maps through this table (SUPREME RULE II).
//
// `data(payload, lookup)` builds the event body from the store event payload.
// It carries only what a receiver needs to act (ids, the workflow title, the
// incident kind) and NEVER a person's name, email or user id: a receiver that
// needs detail calls the API with its own scoped key.
// ===========================================================================

export const WEBHOOK_EVENTS = Object.freeze([
  {
    id: 'workflow.published',
    description: 'A workflow version was published and is ready for employees to run.',
    storeEvent: 'workflow_published',
    data(p, lookup) {
      const w = lookup.workflow(p.companyId, p.id)
      return {
        workflow: {
          id: String(p.id), groupId: String(p.groupId || (w && w.groupId) || ''),
          version: w ? Number(w.version) || 1 : null,
          title: w && w.meta ? String(w.meta.title || '') : '',
          publishedAt: (w && w.publishedAt) || null,
        },
      }
    },
  },
  {
    id: 'workflow.incident.created',
    description: 'An employee following a published workflow hit a screen the workflow did not expect.',
    storeEvent: 'workflow_incident',
    data(p, lookup) {
      const inc = lookup.incident(p.companyId, p.id)
      const ref = (inc && inc.workflowRef) || {}
      return {
        incident: {
          id: String(p.id), kind: String(p.kind || (inc && inc.kind) || ''),
          stepIndex: inc && Number.isInteger(inc.stepIndex) ? inc.stepIndex : null,
          createdAt: (inc && inc.firstAt) || null,
          workflow: { id: String(p.workflowId || ref.id || ''), groupId: String(ref.groupId || ''), version: Number(ref.version) || null, title: String(ref.title || '') },
        },
      }
    },
  },
  {
    id: 'ping',
    description: 'A test delivery sent when an administrator presses Send test.',
    storeEvent: null,   // sent on demand only
    data() { return { message: 'This is a test delivery from WorkCoPilot.' } },
  },
].map((e) => Object.freeze(e)))

export const WEBHOOK_EVENT_IDS = Object.freeze(WEBHOOK_EVENTS.map((e) => e.id))
const BY_ID = new Map(WEBHOOK_EVENTS.map((e) => [e.id, e]))
const BY_STORE_EVENT = new Map(WEBHOOK_EVENTS.filter((e) => e.storeEvent).map((e) => [e.storeEvent, e]))

export function eventById(id) { return BY_ID.get(id) || null }
export function eventForStoreEvent(type) { return BY_STORE_EVENT.get(type) || null }

// Subscribable events: everything except `ping`, which every endpoint receives
// on demand. Returns { ok, events, unknown } in registry order.
export function normalizeEvents(list) {
  const arr = Array.isArray(list) ? list.map((s) => String(s || '').trim()) : []
  const subscribable = new Set(WEBHOOK_EVENT_IDS.filter((e) => e !== 'ping'))
  const unknown = arr.filter((s) => s && !subscribable.has(s))
  const want = new Set(arr.filter((s) => subscribable.has(s)))
  const events = WEBHOOK_EVENT_IDS.filter((e) => want.has(e))
  return { ok: events.length > 0 && unknown.length === 0, events, unknown }
}

export function publicEvents() { return WEBHOOK_EVENTS.map((e) => ({ id: e.id, description: e.description })) }

export default { WEBHOOK_EVENTS, WEBHOOK_EVENT_IDS, eventById, eventForStoreEvent, normalizeEvents, publicEvents }
