// Webhook signing, replay window, retry schedule, rate limiter, and the two
// single-source registries (scopes, events).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as W from './webhook_rules.js'
import { createRateLimiter } from './api_rate_limit.js'
import { SCOPE_IDS, SCOPE, normalizeScopes } from './api_scopes.js'
import { WEBHOOK_EVENTS, normalizeEvents, eventForStoreEvent } from './webhook_events.js'

test('signature round-trips, and a tampered body, wrong secret or stale timestamp fails', () => {
  const secret = W.newSigningSecret()
  assert.match(secret, /^whsec_[A-Za-z0-9_-]{43}$/)
  const body = JSON.stringify({ id: 'evt_1', type: 'ping' })
  const t = 1_800_000_000
  const h = W.signatureHeader(secret, t, body)
  assert.match(h, /^t=1800000000,v1=[a-f0-9]{64}$/)
  assert.deepEqual(W.verifySignature(secret, h, body, { nowSec: t + 10 }), { ok: true })
  assert.equal(W.verifySignature(secret, h, body + ' ', { nowSec: t }).ok, false)
  assert.equal(W.verifySignature(W.newSigningSecret(), h, body, { nowSec: t }).ok, false)
  assert.deepEqual(W.verifySignature(secret, h, body, { nowSec: t + 301 }), { ok: false, reason: 'timestamp outside tolerance' }, 'a replay after the window is refused')
  assert.equal(W.verifySignature(secret, h.replace('t=1800000000', 't=1800000100'), body, { nowSec: t + 100 }).ok, false, 'moving t breaks the signature')
  assert.equal(W.verifySignature(secret, 'v1=abc', body, { nowSec: t }).ok, false)
})

test('retry schedule: 7 attempts with growing, jittered delays, then dead', () => {
  assert.equal(W.MAX_ATTEMPTS, 7)
  let prev = 0
  for (let a = 1; a < W.MAX_ATTEMPTS; a++) {
    const d = W.nextAttemptAt(a, 0, 0.5)
    assert.ok(d > prev, `attempt ${a}`); prev = d
    assert.ok(W.nextAttemptAt(a, 0, 0) >= W.RETRY_DELAYS_MS[a - 1] * 0.9 && W.nextAttemptAt(a, 0, 1) <= W.RETRY_DELAYS_MS[a - 1] * 1.1)
  }
  assert.equal(W.nextAttemptAt(W.MAX_ATTEMPTS, 0), null)
})

test('rate limiter: burst then 429 with Retry-After, refills over time, bounded memory', () => {
  let now = 0
  const rl = createRateLimiter({ perMinute: 60, clock: () => now, maxBuckets: 3 })
  for (let i = 0; i < 60; i++) assert.equal(rl.take('k').ok, true)
  const r = rl.take('k')
  assert.equal(r.ok, false); assert.equal(r.retryAfterSec, 1)
  now += 1000
  assert.equal(rl.take('k').ok, true, 'one token per second refilled')
  for (const k of ['a', 'b', 'c', 'd', 'e']) rl.take(k)
  assert.ok(rl.size() <= 3)
})

test('scopes and events are closed sets in one registry each', () => {
  assert.deepEqual(SCOPE_IDS, ['brain:query', 'workflows:read', 'workflows:run', 'incidents:read', 'webhooks:manage'])
  assert.deepEqual(Object.values(SCOPE).sort(), [...SCOPE_IDS].sort())
  assert.deepEqual(normalizeScopes(['workflows:read', 'brain:query', 'brain:query']), { ok: true, scopes: ['brain:query', 'workflows:read'], unknown: [] })
  assert.equal(normalizeScopes(['admin:all']).ok, false)
  assert.equal(normalizeScopes([]).ok, false)
  assert.equal(normalizeEvents(['ping']).ok, false, 'ping is on-demand only')
  assert.deepEqual(normalizeEvents(['workflow.incident.created', 'workflow.published']).events, ['workflow.published', 'workflow.incident.created'])
  // Each mapped store event is a REAL emit in the store modules (no parallel hooks).
  const src = fs.readFileSync(new URL('./workflows_store.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('./workflow_incidents.js', import.meta.url), 'utf8')
  for (const e of WEBHOOK_EVENTS.filter((x) => x.storeEvent)) {
    assert.match(src, new RegExp(`emit\\('${e.storeEvent}'`), `${e.id} maps to an existing emit('${e.storeEvent}')`)
    assert.equal(eventForStoreEvent(e.storeEvent), e)
  }
})

test('event payloads carry no person data', () => {
  const lookup = {
    workflow: () => ({ id: 'w1', groupId: 'g1', version: 2, authorId: 'u9', meta: { title: 'Close a ticket', owner: 'Pat Doe', supportEmail: 'pat@x.test' }, publishedAt: 't' }),
    incident: () => ({ id: 'wi1', kind: 'error', stepIndex: 1, firstAt: 't', occurrences: [{ userId: 'u9', name: 'Pat Doe' }], sessionIds: ['s1'], workflowRef: { id: 'w1', groupId: 'g1', version: 2, title: 'Close a ticket' } }),
  }
  for (const e of WEBHOOK_EVENTS) {
    const json = JSON.stringify(e.data({ id: 'x', companyId: 'c1', workflowId: 'w1', kind: 'error', by: 'u9' }, lookup))
    for (const leak of ['u9', 'Pat Doe', 'pat@x.test', 's1', 'c1']) assert.ok(!json.includes(leak), `${e.id} leaks ${leak}`)
  }
})
