// Webhooks: endpoint state, tenant isolation, events from the store emitter,
// retries -> dead letter -> auto-disable, manual retry, sealed secrets, the
// SSRF-guarded transport and the worker loop.
import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createWebhooks, AUTO_DISABLE_AFTER_DEAD, MAX_PENDING_PER_COMPANY, MAX_IN_FLIGHT_PER_COMPANY } from './webhooks.js'
import { startWebhookWorker } from './webhook_worker.js'
import { deliverWebhook } from './webhook_transport.js'
import { makeGuardedLookup } from './egress_guard.js'
import { verifySignature, MAX_ATTEMPTS } from './webhook_rules.js'

function harness({ resolveHost, companyActive } = {}) {
  const db = {}
  let now = Date.UTC(2026, 9, 30, 12)
  const audits = []
  const listeners = new Set()
  const hooks = createWebhooks({
    db: () => db, persist: () => {}, persistSoon: () => {}, getUser: (id) => ({ id, name: 'Ann' }),
    httpErr: (s, m) => Object.assign(new Error(m), { status: s }),
    seal: (p) => 'sealed:' + Buffer.from(p).toString('base64'), open: (s) => Buffer.from(String(s).slice(7), 'base64').toString(),
    audit: (a) => audits.push(a), clock: () => now, resolveHost, companyActive,
    lookup: {
      workflow: (cid, id) => ({ id, groupId: 'g1', version: 3, companyId: cid, meta: { title: 'Refund flow' }, publishedAt: 't' }),
      incident: (cid, id) => ({ id, kind: 'error', stepIndex: 2, firstAt: 't', workflowRef: { id: 'w1', groupId: 'g1', version: 3, title: 'Refund flow' } }),
    },
  })
  const store = {
    ...hooks, enqueueWebhookEvent: hooks.enqueueStoreEvent,
    onStoreEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    emit: (t, p) => { for (const fn of listeners) fn(t, p) },
  }
  return { db, hooks, store, audits, tick: (ms) => { now += ms } }
}

test('create validates the URL and events, returns the secret once, and seals it at rest', async () => {
  const h = harness()
  await assert.rejects(h.hooks.createWebhook('cA', { userId: 'a1' }, { url: 'http://x.example.org', events: ['workflow.published'] }), (e) => e.code === 'BAD_URL')
  await assert.rejects(h.hooks.createWebhook('cA', { userId: 'a1' }, { url: 'https://10.0.0.1/', events: ['workflow.published'] }), (e) => e.code === 'BAD_URL')
  await assert.rejects(h.hooks.createWebhook('cA', { userId: 'a1' }, { url: 'https://hooks.example.org/', events: ['user.created'] }), (e) => e.code === 'BAD_EVENTS')
  const { endpoint, secret } = await h.hooks.createWebhook('cA', { userId: 'a1' }, { url: 'https://hooks.example.org/a', events: ['workflow.published'], description: 'CRM' })
  assert.match(secret, /^whsec_/)
  assert.equal(endpoint.secretLast4, secret.slice(-4))
  assert.ok(!JSON.stringify(h.db.webhookEndpoints).includes(secret), 'never stored in plaintext')
  assert.ok(!JSON.stringify(h.hooks.listWebhooks('cA')).includes(secret), 'never listed')
  assert.ok(!('secretEnc' in endpoint))
  assert.equal(h.audits.at(-1).action, 'webhook_create')
})

test('a host that resolves privately is refused at registration (SSRF), with an actionable message', async () => {
  const h = harness({ resolveHost: async () => { throw Object.assign(new Error('x'), { code: 'EGRESS_PRIVATE_ADDRESS' }) } })
  await assert.rejects(h.hooks.createWebhook('cA', {}, { url: 'https://rebind.example.org/', events: ['workflow.published'] }), (e) => e.code === 'BAD_URL' && /private or reserved/.test(e.message))
})

test('tenant isolation: company B can never see, change, test, retry or delete company A endpoints', async () => {
  const h = harness()
  const { endpoint } = await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  assert.deepEqual(h.hooks.listWebhooks('cB').endpoints, [])
  for (const fn of [
    () => h.hooks.updateWebhook('cB', {}, endpoint.id, { enabled: false }), () => h.hooks.deleteWebhook('cB', {}, endpoint.id),
    () => h.hooks.rotateWebhookSecret('cB', {}, endpoint.id), () => h.hooks.testWebhook('cB', {}, endpoint.id),
    () => h.hooks.listWebhookDeliveries('cB', endpoint.id),
  ]) assert.throws(fn, (e) => e.status === 404)
  const d = h.hooks.testWebhook('cA', {}, endpoint.id).delivery
  assert.throws(() => h.hooks.retryWebhookDelivery('cB', d.id), (e) => e.status === 404)
  // A's event never reaches B's endpoint
  await h.hooks.createWebhook('cB', {}, { url: 'https://hooks.example.net/b', events: ['workflow.published'] })
  assert.equal(h.hooks.enqueueStoreEvent('workflow_published', { id: 'w1', groupId: 'g1', companyId: 'cA', by: 'u1' }), 1)
  assert.equal(h.db.webhookDeliveries.filter((x) => x.companyId === 'cB').length, 0)
})

test('store events map to public events for subscribed, enabled endpoints only', async () => {
  const h = harness()
  const a = (await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })).endpoint
  const b = (await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/b', events: ['workflow.incident.created'] })).endpoint
  assert.equal(h.hooks.enqueueStoreEvent('workflow_incident', { id: 'wi1', companyId: 'cA', workflowId: 'w1', kind: 'error' }), 1)
  assert.equal(h.hooks.enqueueStoreEvent('workflow_created', { id: 'w1', companyId: 'cA' }), 0, 'unmapped store events are ignored')
  assert.equal(h.hooks.enqueueStoreEvent('workflow_published', {}), 0, 'no company, no delivery')
  h.hooks.updateWebhook('cA', {}, a.id, { enabled: false })
  assert.equal(h.hooks.enqueueStoreEvent('workflow_published', { id: 'w1', companyId: 'cA' }), 0, 'disabled endpoint gets nothing')
  const d = h.db.webhookDeliveries.find((x) => x.endpointId === b.id)
  const body = JSON.parse(d.body)
  assert.equal(body.type, 'workflow.incident.created')
  assert.equal(body.apiVersion, 'v1')
  assert.deepEqual(body.data.incident.workflow, { id: 'w1', groupId: 'g1', version: 3, title: 'Refund flow' })
})

test('failed attempts back off, dead-letter after MAX_ATTEMPTS, auto-disable after repeated dead letters; manual retry works', async () => {
  const h = harness()
  const { endpoint } = await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  const fire = () => h.hooks.enqueueStoreEvent('workflow_published', { id: 'w1', companyId: 'cA' })
  let dead = 0
  for (let n = 0; n < AUTO_DISABLE_AFTER_DEAD; n++) {
    fire()
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      const due = h.hooks.dueWebhookDeliveries(10)
      assert.equal(due.length, 1, `delivery ${n} attempt ${a} is due`)
      const job = h.hooks.webhookDeliveryJob(due[0])
      assert.match(job.secret, /^whsec_/, 'the job opens the sealed secret for signing')
      const r = h.hooks.recordWebhookAttempt(due[0], { ok: false, httpStatus: 500 })
      if (a < MAX_ATTEMPTS - 1) { assert.equal(r.status, 'pending'); assert.equal(h.hooks.dueWebhookDeliveries(10).length, 0, 'not due until the backoff passes'); h.tick(7 * 3600e3) }
      else { assert.equal(r.status, 'dead'); dead++ }
    }
  }
  assert.equal(dead, AUTO_DISABLE_AFTER_DEAD)
  const ep = h.hooks.listWebhooks('cA').endpoints[0]
  assert.equal(ep.enabled, false)
  assert.match(ep.disabledReason, /turn it back on/)
  assert.ok(h.audits.some((x) => x.action === 'webhook_auto_disable'))
  const deadOne = h.hooks.listWebhookDeliveries('cA', endpoint.id)[0]
  assert.throws(() => h.hooks.retryWebhookDelivery('cA', deadOne.id), (e) => e.code === 'ENDPOINT_DISABLED')
  h.hooks.updateWebhook('cA', {}, endpoint.id, { enabled: true })
  assert.equal(h.hooks.retryWebhookDelivery('cA', deadOne.id).delivery.status, 'pending')
  const id = h.hooks.dueWebhookDeliveries(10)[0]
  assert.equal(h.hooks.recordWebhookAttempt(id, { ok: true, httpStatus: 204 }).status, 'delivered')
  assert.throws(() => h.hooks.retryWebhookDelivery('cA', id), (e) => e.code === 'ALREADY_DELIVERED')
  assert.equal(h.hooks.listWebhooks('cA').endpoints[0].lastStatus, 'ok')
})

test('rotate changes the signing secret; delete removes the endpoint and its deliveries', async () => {
  const h = harness()
  const c = await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  const r = h.hooks.rotateWebhookSecret('cA', {}, c.endpoint.id)
  assert.notEqual(r.secret, c.secret)
  h.hooks.testWebhook('cA', {}, c.endpoint.id)
  assert.equal(h.hooks.webhookDeliveryJob(h.hooks.dueWebhookDeliveries()[0]).secret, r.secret)
  h.hooks.deleteWebhook('cA', {}, c.endpoint.id)
  assert.deepEqual([h.db.webhookEndpoints.length, h.db.webhookDeliveries.length], [0, 0])
})

test('transport signs every attempt so the receiver can verify it, and never follows a redirect', async () => {
  const sent = []
  const fakeRequest = (status) => (url, opts, onRes) => {
    const req = new EventEmitter()
    req.destroy = () => {}
    req.end = (body) => {
      sent.push({ url, headers: opts.headers, body, lookup: opts.lookup })
      const res = new EventEmitter(); res.statusCode = status; res.resume = () => {}; res.destroy = () => {}
      onRes(res); setImmediate(() => res.emit('close'))
    }
    return req
  }
  const job = { deliveryId: 'whd_1', url: 'https://hooks.example.org/a', event: 'ping', body: '{"id":"evt_1"}', secret: 'whsec_test' }
  const ok = await deliverWebhook(job, { request: fakeRequest(204), nowSec: () => 1_800_000_000 })
  assert.deepEqual(ok, { ok: true, httpStatus: 204, error: null })
  const h = sent[0].headers
  assert.equal(h['X-WorkCoPilot-Event'], 'ping'); assert.equal(h['X-WorkCoPilot-Delivery'], 'whd_1')
  assert.deepEqual(verifySignature('whsec_test', h['X-WorkCoPilot-Signature'], sent[0].body, { nowSec: 1_800_000_000 }), { ok: true })
  assert.equal(typeof sent[0].lookup, 'function', 'the SSRF-guarded lookup is always passed')
  const redirect = await deliverWebhook(job, { request: fakeRequest(302) })
  assert.equal(redirect.ok, false); assert.match(redirect.error, /redirects are not followed/)
})

test('transport refuses to dial a host that resolves to a private address (real https.request, no socket opened)', async () => {
  const lookup = makeGuardedLookup({ resolve: (h, cb) => cb(null, [{ address: '127.0.0.1', family: 4 }]) })
  const r = await deliverWebhook({ deliveryId: 'whd_2', url: 'https://hooks.example.org/a', event: 'ping', body: '{}', secret: 's' }, { lookup, timeoutMs: 3000 })
  assert.equal(r.ok, false)
  assert.match(r.error, /private or reserved/)
})

test('worker: a store event becomes a delivery, is sent once, and the result is recorded', async () => {
  const h = harness()
  await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  const sent = []
  const w = startWebhookWorker({ store: h.store, deliver: async (job) => { sent.push(job.deliveryId); return { ok: true, httpStatus: 200 } }, intervalMs: 60000 })
  try {
    h.store.emit('workflow_published', { id: 'w1', groupId: 'g1', companyId: 'cA' })
    await new Promise((r) => setTimeout(r, 30))
    await w.tick()
    assert.equal(sent.length, 1, 'sent exactly once')
    assert.equal(h.db.webhookDeliveries[0].status, 'delivered')
    h.store.emit('some_other_event', { companyId: 'cA' })
    assert.equal(await w.tick(), 0)
  } finally { w.stop() }
  h.store.emit('workflow_published', { id: 'w2', companyId: 'cA' })
  assert.equal(h.db.webhookDeliveries.length, 1, 'stopped worker no longer listens')
})

test('fair scheduling: one attempt per endpoint, a company capped in flight, companies taken in turn', async () => {
  const h = harness()
  const a = []
  for (let i = 0; i < 4; i++) a.push((await h.hooks.createWebhook('cA', {}, { url: `https://h${i}.example.org/`, events: ['workflow.published'] })).endpoint)
  const b = (await h.hooks.createWebhook('cB', {}, { url: 'https://b.example.org/', events: ['workflow.published'] })).endpoint
  for (let i = 0; i < 3; i++) h.hooks.enqueueStoreEvent('workflow_published', { id: 'w' + i, companyId: 'cA' })
  h.hooks.enqueueStoreEvent('workflow_published', { id: 'wb', companyId: 'cB' })
  const due = h.hooks.dueWebhookDeliveries(10)
  const owner = (id) => h.db.webhookDeliveries.find((x) => x.id === id)
  assert.equal(due.filter((id) => owner(id).companyId === 'cA').length, MAX_IN_FLIGHT_PER_COMPANY, 'company A is capped')
  assert.ok(due.some((id) => owner(id).endpointId === b.id), 'company B is served despite the backlog of A')
  assert.equal(new Set(due.map((id) => owner(id).endpointId)).size, due.length, 'never two attempts to one endpoint')
  const busy = { endpoints: new Set([a[0].id]), companies: new Map([['cA', 2]]) }
  assert.deepEqual(h.hooks.dueWebhookDeliveries(10, busy).map((id) => owner(id).companyId), ['cB'], 'in-flight work counts toward the cap')
})

test('a full queue never drops silently, and a disabled company gets no deliveries', async () => {
  const h = harness()
  const { endpoint } = await h.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  for (let i = 0; i < MAX_PENDING_PER_COMPANY; i++) h.hooks.enqueueStoreEvent('workflow_published', { id: 'w' + i, companyId: 'cA' })
  assert.equal(h.hooks.enqueueStoreEvent('workflow_published', { id: 'over', companyId: 'cA' }), 0)
  assert.equal(h.hooks.listWebhooks('cA').endpoints[0].droppedEvents, 1)
  assert.equal(h.audits.filter((x) => x.action === 'webhook_queue_full').length, 1)
  h.hooks.enqueueStoreEvent('workflow_published', { id: 'over2', companyId: 'cA' })
  assert.equal(h.audits.filter((x) => x.action === 'webhook_queue_full').length, 1, 'audited at most hourly')
  assert.throws(() => h.hooks.testWebhook('cA', {}, endpoint.id), (e) => e.code === 'QUEUE_FULL')
  assert.equal(h.db.webhookDeliveries.filter((x) => x.status === 'pending').length, MAX_PENDING_PER_COMPANY, 'pending work is never trimmed')

  const off = harness({ companyActive: (cid) => cid !== 'cA' })
  await off.hooks.createWebhook('cA', {}, { url: 'https://hooks.example.org/a', events: ['workflow.published'] })
  assert.equal(off.hooks.enqueueStoreEvent('workflow_published', { id: 'w1', companyId: 'cA' }), 0)
})

test('worker refills slots as attempts finish, and an unreadable secret is a recorded failure, not a stall', async () => {
  const h = harness()
  for (let i = 0; i < 3; i++) await h.hooks.createWebhook('cA', {}, { url: `https://h${i}.example.org/`, events: ['workflow.published'] })
  h.hooks.enqueueStoreEvent('workflow_published', { id: 'w1', companyId: 'cA' })
  let concurrent = 0
  let peak = 0
  const w = startWebhookWorker({ store: h.store, intervalMs: 60000, deliver: async () => { concurrent++; peak = Math.max(peak, concurrent); await new Promise((r) => setTimeout(r, 5)); concurrent--; return { ok: true, httpStatus: 200 } } })
  try {
    assert.equal(await w.tick(), 3, 'all three endpoints delivered in one pass')
    assert.ok(peak <= MAX_IN_FLIGHT_PER_COMPANY, 'never more than the company cap at once')
  } finally { w.stop() }
  const brokenStore = { ...h.store, webhookDeliveryJob: () => { throw new Error('bad key') } }
  h.hooks.enqueueStoreEvent('workflow_published', { id: 'w2', companyId: 'cA' })
  const w2 = startWebhookWorker({ store: brokenStore, intervalMs: 60000, deliver: async () => ({ ok: true }) })
  try { await w2.tick() } finally { w2.stop() }
  assert.ok(h.db.webhookDeliveries.some((x) => x.lastError && /signing secret could not be read/.test(x.lastError)))
})
