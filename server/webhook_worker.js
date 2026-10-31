// ===========================================================================
// WorkCoPilot webhooks: the delivery worker (timers + concurrency only).
//
// Subscribes to the EXISTING store event emitter (store.onStoreEvent), turns each
// mapped event into durable deliveries (store.enqueueWebhookEvent), and sends due
// deliveries through the transport, recording each attempt back in the store
// (which owns retry scheduling and dead-lettering). Deliveries survive a restart
// because the queue lives in the store.
//
// Fairness: slots refill as soon as any attempt finishes (never wait for a whole
// batch), one attempt per endpoint at a time, and the store caps how many slots
// one company may hold, so a tenant with hanging endpoints cannot delay anyone
// else's deliveries.
// ===========================================================================
import { deliverWebhook } from './webhook_transport.js'

// deps: { store: { onStoreEvent, enqueueWebhookEvent, dueWebhookDeliveries, webhookDeliveryJob, recordWebhookAttempt },
//         deliver?(job) -> Promise<{ok,httpStatus,error}>, intervalMs?, concurrency?, log? }
export function startWebhookWorker({ store, deliver = deliverWebhook, intervalMs = 5000, concurrency = 8, log = () => {} } = {}) {
  const inFlight = new Map()   // deliveryId -> { endpointId, companyId, promise }
  let stopped = false
  let completed = 0

  function busy() {
    const endpoints = new Set()
    const companies = new Map()
    for (const j of inFlight.values()) {
      endpoints.add(j.endpointId)
      companies.set(String(j.companyId), (companies.get(String(j.companyId)) || 0) + 1)
    }
    return { endpoints, companies }
  }

  function startOne(id) {
    let job
    try { job = store.webhookDeliveryJob(id) } catch (e) {
      // A sealed secret that cannot be opened (key mismatch, corrupt record) is a
      // recorded failed attempt with an action, never a silent stall.
      store.recordWebhookAttempt(id, { ok: false, error: 'The signing secret could not be read. Rotate the endpoint secret.' })
      log('webhook secret unreadable', e && e.message)
      return false
    }
    if (!job) return false
    const promise = Promise.resolve()
      .then(() => deliver(job))
      .then((r) => store.recordWebhookAttempt(id, r), (e) => { log('webhook delivery error', e && e.message); store.recordWebhookAttempt(id, { ok: false, error: 'Delivery failed unexpectedly.' }) })
      .catch(() => {})
      .finally(() => { inFlight.delete(id); completed++; if (!stopped) setImmediate(pump) })
    inFlight.set(id, { endpointId: job.endpointId, companyId: job.companyId, promise })
    return true
  }

  // Fill free slots with fairly chosen due deliveries.
  function pump() {
    if (stopped) return
    try {
      while (inFlight.size < concurrency) {
        const ids = store.dueWebhookDeliveries(concurrency - inFlight.size, busy()).filter((id) => !inFlight.has(id))
        if (!ids.length) break
        let started = 0
        for (const id of ids) if (startOne(id)) started++
        if (!started) break
      }
    } catch (e) { log('webhook pump error', e && e.message) }
  }

  // Test hook: pump, then wait for everything in flight; returns attempts finished.
  async function tick() {
    const before = completed
    for (;;) {
      pump()
      if (!inFlight.size) break
      await Promise.all([...inFlight.values()].map((j) => j.promise))
    }
    return completed - before
  }

  const unsubscribe = store.onStoreEvent((type, payload) => {
    try {
      if (store.enqueueWebhookEvent(type, payload) > 0) setImmediate(pump)
    } catch { /* a webhook must never break the action that emitted the event */ }
  })
  const timer = setInterval(pump, intervalMs)
  if (timer.unref) timer.unref()

  return {
    tick,
    stop() { stopped = true; clearInterval(timer); unsubscribe() },
  }
}

export default { startWebhookWorker }
