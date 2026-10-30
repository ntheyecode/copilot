// ===========================================================================
// WorkCoPilot webhooks: company endpoints + the durable delivery queue (state).
//
// Created with the store's context (never imports the store). The store owns db
// and persistence and re-exports this API; webhook_worker.js drives delivery
// (timers + network) and calls back in here to record results. Events come only
// from the existing store event emitter, mapped through webhook_events.js.
//
// Guarantees:
//   - A company only ever sees and changes its OWN endpoints and deliveries
//     (every function takes the companyId from the authenticated principal).
//   - Signing secrets are sealed at rest (the platform KEK, same as every other
//     stored secret) and returned in plaintext ONLY from create / rotate.
//   - At-least-once delivery: a delivery is durable in db until it is delivered
//     or dead-lettered after MAX_ATTEMPTS; receivers dedupe on the delivery id.
//   - Bounded: endpoints per company and deliveries kept per company are capped.
//
// ctx: { db, persist, persistSoon, httpErr, getUser, seal(plain), open(sealed),
//        audit({ userId, companyId, action, reason, detail }),
//        lookup: { workflow(companyId, id), incident(companyId, id) },
//        resolveHost?(host) -> Promise (registration-time SSRF check),
//        companyActive?(companyId) -> bool (a disabled company gets no deliveries), clock? }
// ===========================================================================
import crypto from 'node:crypto'
import * as W from './webhook_rules.js'
import { normalizeEvents, eventById, eventForStoreEvent, publicEvents } from './webhook_events.js'
import { checkWebhookUrl } from './egress_guard.js'

export const MAX_ENDPOINTS = 20
export const MAX_DELIVERIES_PER_COMPANY = 500
export const AUTO_DISABLE_AFTER_DEAD = 5
export const MAX_PENDING_PER_COMPANY = 400   // queued (not yet finished) deliveries a company may hold
export const MAX_IN_FLIGHT_PER_COMPANY = 2   // so one tenant's slow endpoints can never take every worker slot
const DROP_AUDIT_MS = 3600 * 1000
const MAX_DESCRIPTION = 200

const rid = (p) => p + crypto.randomBytes(9).toString('hex')

export function createWebhooks(ctx) {
  const { persist, httpErr, getUser } = ctx
  const persistSoon = ctx.persistSoon || persist
  const clock = ctx.clock || Date.now
  const iso = () => new Date(clock()).toISOString()
  const db = () => {
    const d = ctx.db()
    if (!Array.isArray(d.webhookEndpoints)) d.webhookEndpoints = []
    if (!Array.isArray(d.webhookDeliveries)) d.webhookDeliveries = []
    return d
  }
  const endpoints = () => db().webhookEndpoints
  const deliveries = () => db().webhookDeliveries
  const err = (status, message, code) => { const e = httpErr(status, message); e.code = code; return e }
  const same = (a, b) => String(a) === String(b)
  const nameOf = (uid) => { const u = uid ? getUser(uid) : null; return u ? (u.name || u.username || '') : '' }
  const actorDetail = (actor) => (actor && actor.keyId ? ` via API key wcp_live_${actor.keyId}` : '')

  function publicEndpoint(e) {
    return {
      id: e.id, url: e.url, host: e.host, events: [...e.events], description: e.description || '',
      enabled: !!e.enabled, createdAt: e.createdAt,
      createdBy: { id: e.createdBy || null, name: e.createdBy ? nameOf(e.createdBy) : (e.createdByKey ? 'API key' : '') },
      secretLast4: e.secretLast4, lastDeliveryAt: e.lastDeliveryAt || null, lastStatus: e.lastStatus || null,
      consecutiveFailures: e.consecutiveFailures || 0, disabledReason: e.disabledReason || null,
      droppedEvents: e.droppedEvents || 0,
    }
  }
  function publicDelivery(d) {
    return {
      id: d.id, endpointId: d.endpointId, event: d.event, status: d.status, attempts: d.attempts,
      nextAttemptAt: d.nextAttemptAt || null, lastError: d.lastError || null, lastHttpStatus: d.lastHttpStatus || null,
      createdAt: d.createdAt, deliveredAt: d.deliveredAt || null,
    }
  }
  function findEndpoint(companyId, id) {
    const e = endpoints().find((x) => x.id === String(id || '') && same(x.companyId, companyId))
    if (!e) throw err(404, 'Webhook endpoint not found.', 'NOT_FOUND')
    return e
  }

  function listWebhooks(companyId) {
    return {
      endpoints: endpoints().filter((e) => same(e.companyId, companyId))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(publicEndpoint),
      events: publicEvents(),
    }
  }

  function cleanDescription(v) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DESCRIPTION)
  }

  async function createWebhook(companyId, actor, { url, events, description } = {}) {
    const chk = checkWebhookUrl(url)
    if (!chk.ok) throw err(400, chk.reason, 'BAD_URL')
    const ev = normalizeEvents(events)
    if (!ev.ok) throw err(400, ev.unknown.length ? `Unknown event: ${ev.unknown.join(', ')}.` : 'Choose at least one event.', 'BAD_EVENTS')
    if (endpoints().filter((e) => same(e.companyId, companyId)).length >= MAX_ENDPOINTS) {
      throw err(409, `Your company has ${MAX_ENDPOINTS} webhook endpoints. Delete one you no longer use first.`, 'LIMIT_REACHED')
    }
    if (typeof ctx.resolveHost === 'function') {
      try { await ctx.resolveHost(chk.host) } catch (e) {
        throw err(400, e && e.code === 'EGRESS_PRIVATE_ADDRESS' ? 'That host resolves to a private or reserved address. Use a public endpoint.' : 'That host could not be found. Check the URL and try again.', 'BAD_URL')
      }
      // Re-check after the await: concurrent creates must not slip past the cap.
      if (endpoints().filter((e) => same(e.companyId, companyId)).length >= MAX_ENDPOINTS) {
        throw err(409, `Your company has ${MAX_ENDPOINTS} webhook endpoints. Delete one you no longer use first.`, 'LIMIT_REACHED')
      }
    }
    const secret = W.newSigningSecret()
    const rec = {
      id: rid('whe_'), companyId, url: chk.url, host: chk.host, events: ev.events, description: cleanDescription(description),
      enabled: true, secretEnc: ctx.seal(secret), secretLast4: secret.slice(-4),
      createdAt: iso(), createdBy: (actor && actor.userId) || null, createdByKey: (actor && actor.keyId) || null,
      lastDeliveryAt: null, lastStatus: null, consecutiveFailures: 0, consecutiveDead: 0, disabledReason: null,
    }
    endpoints().push(rec)
    persist()
    ctx.audit({ userId: (actor && actor.userId) || null, companyId, action: 'webhook_create', reason: 'webhook endpoint registered', detail: `${rec.host} events ${rec.events.join(' ')}${actorDetail(actor)}` })
    return { endpoint: publicEndpoint(rec), secret }
  }

  function updateWebhook(companyId, actor, id, { events, description, enabled } = {}) {
    const e = findEndpoint(companyId, id)
    if (events !== undefined) {
      const ev = normalizeEvents(events)
      if (!ev.ok) throw err(400, ev.unknown.length ? `Unknown event: ${ev.unknown.join(', ')}.` : 'Choose at least one event.', 'BAD_EVENTS')
      e.events = ev.events
    }
    if (description !== undefined) e.description = cleanDescription(description)
    if (enabled !== undefined) {
      e.enabled = !!enabled
      if (e.enabled) { e.disabledReason = null; e.consecutiveDead = 0; e.consecutiveFailures = 0 }
    }
    persistSoon()
    ctx.audit({ userId: (actor && actor.userId) || null, companyId, action: 'webhook_update', reason: 'webhook endpoint changed', detail: `${e.host} ${e.enabled ? 'on' : 'off'} events ${e.events.join(' ')}${actorDetail(actor)}` })
    return { endpoint: publicEndpoint(e) }
  }

  function rotateWebhookSecret(companyId, actor, id) {
    const e = findEndpoint(companyId, id)
    const secret = W.newSigningSecret()
    e.secretEnc = ctx.seal(secret); e.secretLast4 = secret.slice(-4)
    persist()
    ctx.audit({ userId: (actor && actor.userId) || null, companyId, action: 'webhook_rotate_secret', reason: 'webhook signing secret rotated', detail: `${e.host}${actorDetail(actor)}` })
    return { endpoint: publicEndpoint(e), secret }
  }

  function deleteWebhook(companyId, actor, id) {
    const e = findEndpoint(companyId, id)
    const d = db()
    d.webhookEndpoints = d.webhookEndpoints.filter((x) => x !== e)
    d.webhookDeliveries = d.webhookDeliveries.filter((x) => x.endpointId !== e.id)
    persist()
    ctx.audit({ userId: (actor && actor.userId) || null, companyId, action: 'webhook_delete', reason: 'webhook endpoint deleted', detail: `${e.host}${actorDetail(actor)}` })
    return { ok: true }
  }

  // History cap: only FINISHED deliveries are ever trimmed (oldest first). Pending
  // ones are bounded separately by MAX_PENDING_PER_COMPANY at enqueue time.
  function trimDeliveries(companyId) {
    let extra = deliveries().filter((x) => same(x.companyId, companyId)).length - MAX_DELIVERIES_PER_COMPANY
    if (extra <= 0) return
    const done = deliveries().filter((x) => same(x.companyId, companyId) && x.status !== 'pending')
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    const drop = new Set()
    for (const x of done) { if (extra-- <= 0) break; drop.add(x) }
    if (drop.size) db().webhookDeliveries = deliveries().filter((x) => !drop.has(x))
  }

  // A full queue never drops silently: the event is counted on the endpoint and
  // audited (at most once an hour per endpoint), and the console shows the count.
  function queueFull(e) {
    const full = deliveries().filter((x) => same(x.companyId, e.companyId) && x.status === 'pending').length >= MAX_PENDING_PER_COMPANY
    if (!full) return false
    e.droppedEvents = (e.droppedEvents || 0) + 1
    if (!e.droppedAuditAt || clock() - Date.parse(e.droppedAuditAt) > DROP_AUDIT_MS) {
      e.droppedAuditAt = iso()
      ctx.audit({ userId: null, companyId: e.companyId, action: 'webhook_queue_full', reason: 'webhook queue full, event not queued', detail: `${e.host} (${e.droppedEvents} dropped so far)` })
    }
    return true
  }

  function queue(e, type, data) {
    const t = iso()
    const eventId = rid('evt_')
    const body = JSON.stringify(W.envelope({ eventId, type, createdAt: t, data }))
    const d = {
      id: rid('whd_'), companyId: e.companyId, endpointId: e.id, event: type, eventId, body,
      status: 'pending', attempts: 0, nextAttemptAt: t, lastError: null, lastHttpStatus: null, createdAt: t, deliveredAt: null,
    }
    deliveries().push(d)
    trimDeliveries(e.companyId)
    return d
  }

  function testWebhook(companyId, actor, id) {
    const e = findEndpoint(companyId, id)
    if (queueFull(e)) throw err(429, 'Your company has too many deliveries waiting. Let them finish, then try again.', 'QUEUE_FULL')
    const d = queue(e, 'ping', eventById('ping').data({}, ctx.lookup))
    persistSoon()
    return { delivery: publicDelivery(d) }
  }

  // Called by the worker for every store event. Unknown events and companies
  // without subscribed endpoints are a no-op. Never throws into the emitter.
  function enqueueStoreEvent(type, payload = {}) {
    const def = eventForStoreEvent(type)
    if (!def || !payload || !payload.companyId) return 0
    if (typeof ctx.companyActive === 'function' && !ctx.companyActive(payload.companyId)) return 0
    const targets = endpoints().filter((e) => same(e.companyId, payload.companyId) && e.enabled && e.events.includes(def.id))
    if (!targets.length) return 0
    let data
    try { data = def.data(payload, ctx.lookup) } catch { return 0 }
    let queued = 0
    for (const e of targets) { if (queueFull(e)) continue; queue(e, def.id, data); queued++ }
    persistSoon()
    return queued
  }

  function listWebhookDeliveries(companyId, endpointId) {
    findEndpoint(companyId, endpointId)
    return deliveries().filter((x) => x.endpointId === endpointId && same(x.companyId, companyId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 50).map(publicDelivery)
  }

  function retryWebhookDelivery(companyId, deliveryId) {
    const d = deliveries().find((x) => x.id === String(deliveryId || '') && same(x.companyId, companyId))
    if (!d) throw err(404, 'Delivery not found.', 'NOT_FOUND')
    const e = findEndpoint(companyId, d.endpointId)
    if (!e.enabled) throw err(409, 'Turn the endpoint back on before retrying a delivery.', 'ENDPOINT_DISABLED')
    if (d.status === 'pending') return { delivery: publicDelivery(d) }
    if (d.status === 'delivered') throw err(409, 'This delivery already succeeded.', 'ALREADY_DELIVERED')
    if (deliveries().filter((x) => same(x.companyId, companyId) && x.status === 'pending').length >= MAX_PENDING_PER_COMPANY) {
      throw err(429, 'Your company has too many deliveries waiting. Let them finish, then try again.', 'QUEUE_FULL')
    }
    d.status = 'pending'; d.attempts = 0; d.nextAttemptAt = iso(); d.lastError = null
    persistSoon()
    return { delivery: publicDelivery(d) }
  }

  // ---- Worker interface ------------------------------------------------------
  // Pending deliveries whose time has come, chosen FAIRLY: at most one per endpoint
  // (oldest first within it), companies taken in turn, and never more than
  // MAX_IN_FLIGHT_PER_COMPANY per company counting what is already in flight.
  // busy: { endpoints: Set, companies: Map(companyId -> in-flight count) }
  function dueWebhookDeliveries(limit = 20, busy = {}) {
    const t = clock()
    const busyEp = busy.endpoints || new Set()
    const busyCo = busy.companies || new Map()
    const live = new Set(endpoints().filter((e) => e.enabled).map((e) => e.id))
    const firstPerEndpoint = new Map()
    for (const x of deliveries()) {
      if (x.status !== 'pending' || !live.has(x.endpointId) || busyEp.has(x.endpointId) || Date.parse(x.nextAttemptAt) > t) continue
      const cur = firstPerEndpoint.get(x.endpointId)
      if (!cur || String(x.nextAttemptAt) < String(cur.nextAttemptAt)) firstPerEndpoint.set(x.endpointId, x)
    }
    const byCompany = new Map()
    for (const x of [...firstPerEndpoint.values()].sort((a, b) => String(a.nextAttemptAt).localeCompare(String(b.nextAttemptAt)))) {
      const k = String(x.companyId)
      if (!byCompany.has(k)) byCompany.set(k, [])
      byCompany.get(k).push(x)
    }
    const out = []
    const taken = new Map()
    let progress = true
    while (out.length < limit && progress) {
      progress = false
      for (const [k, list] of byCompany) {
        if (out.length >= limit) break
        const n = (busyCo.get(k) || 0) + (taken.get(k) || 0)
        if (!list.length || n >= MAX_IN_FLIGHT_PER_COMPANY) continue
        out.push(list.shift().id); taken.set(k, (taken.get(k) || 0) + 1); progress = true
      }
    }
    return out
  }

  // What the transport needs for one attempt. The plaintext secret leaves the
  // sealed record only here, in memory, for signing.
  function webhookDeliveryJob(deliveryId) {
    const d = deliveries().find((x) => x.id === deliveryId)
    if (!d || d.status !== 'pending') return null
    const e = endpoints().find((x) => x.id === d.endpointId)
    if (!e || !e.enabled) return null
    return { deliveryId: d.id, endpointId: e.id, companyId: e.companyId, url: e.url, host: e.host, event: d.event, body: d.body, secret: ctx.open(e.secretEnc) }
  }

  function recordWebhookAttempt(deliveryId, { ok, httpStatus = null, error = null } = {}) {
    const d = deliveries().find((x) => x.id === deliveryId)
    if (!d || d.status !== 'pending') return null
    const e = endpoints().find((x) => x.id === d.endpointId)
    const t = clock()
    d.attempts += 1
    d.lastHttpStatus = httpStatus
    if (e) e.lastDeliveryAt = new Date(t).toISOString()
    if (ok) {
      d.status = 'delivered'; d.deliveredAt = new Date(t).toISOString(); d.nextAttemptAt = null; d.lastError = null
      if (e) { e.lastStatus = 'ok'; e.consecutiveFailures = 0; e.consecutiveDead = 0 }
    } else {
      d.lastError = String(error || (httpStatus ? `HTTP ${httpStatus}` : 'delivery failed')).slice(0, 200)
      const next = W.nextAttemptAt(d.attempts, t)
      if (next == null) { d.status = 'dead'; d.nextAttemptAt = null } else { d.nextAttemptAt = new Date(next).toISOString() }
      if (e) {
        e.lastStatus = 'failed'; e.consecutiveFailures = (e.consecutiveFailures || 0) + 1
        if (d.status === 'dead') {
          e.consecutiveDead = (e.consecutiveDead || 0) + 1
          if (e.consecutiveDead >= AUTO_DISABLE_AFTER_DEAD && e.enabled) {
            e.enabled = false
            e.disabledReason = `Turned off after ${AUTO_DISABLE_AFTER_DEAD} deliveries in a row failed every retry. Fix the endpoint, then turn it back on and retry the failed deliveries.`
            ctx.audit({ userId: null, companyId: e.companyId, action: 'webhook_auto_disable', reason: 'webhook endpoint kept failing', detail: e.host })
          }
        }
      }
    }
    persistSoon()
    return publicDelivery(d)
  }

  function purgeCompanyWebhooks(companyId) {
    const d = db()
    d.webhookEndpoints = d.webhookEndpoints.filter((x) => !same(x.companyId, companyId))
    d.webhookDeliveries = d.webhookDeliveries.filter((x) => !same(x.companyId, companyId))
    persist()
  }

  return {
    listWebhooks, createWebhook, updateWebhook, rotateWebhookSecret, deleteWebhook, testWebhook,
    listWebhookDeliveries, retryWebhookDelivery, enqueueStoreEvent,
    dueWebhookDeliveries, webhookDeliveryJob, recordWebhookAttempt, purgeCompanyWebhooks,
  }
}

export default { createWebhooks, MAX_ENDPOINTS, MAX_DELIVERIES_PER_COMPANY, AUTO_DISABLE_AFTER_DEAD, MAX_PENDING_PER_COMPANY, MAX_IN_FLIGHT_PER_COMPANY }
