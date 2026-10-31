// A person's own cancel-at-period-end and resume (server/billing_lifecycle.js):
// the pure rules, and the routes against a fake Stripe and a fake store.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { lifecyclePatch, lifecycleCheck, registerLifecycleRoutes } from './billing_lifecycle.js'

test('lifecyclePatch mirrors Stripe: ending keeps the reason, resuming clears it', () => {
  const p = lifecyclePatch({ cancel_at_period_end: true, current_period_end: 1800000000 }, { reason: 'Too busy this month' })
  assert.deepEqual(p, { cancelAtPeriodEnd: true, currentPeriodEnd: '2027-01-15T08:00:00.000Z', cancelReason: 'Too busy this month' })
  assert.deepEqual(lifecyclePatch({ cancel_at_period_end: false }), { cancelAtPeriodEnd: false, cancelReason: null })
  assert.equal(lifecyclePatch({ cancel_at_period_end: true }, { reason: 'x'.repeat(400) }).cancelReason.length, 300)
})

test('lifecycleCheck: only a live Stripe subscription can end or resume, each exactly once', () => {
  assert.equal(lifecycleCheck({ status: 'none' }, 'cancel').code, 'noSubscription')
  assert.equal(lifecycleCheck({ status: 'active' }, 'cancel').code, 'noSubscription', 'no Stripe subscription id')
  assert.equal(lifecycleCheck({ status: 'canceled', stripeSubscriptionId: 'sub_1' }, 'resume').code, 'noSubscription', 'an ended plan is bought again, not resumed')
  assert.deepEqual(lifecycleCheck({ status: 'active', stripeSubscriptionId: 'sub_1' }, 'cancel'), { ok: true })
  assert.equal(lifecycleCheck({ status: 'active', stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true }, 'cancel').code, 'alreadyEnding')
  assert.equal(lifecycleCheck({ status: 'active', stripeSubscriptionId: 'sub_1' }, 'resume').code, 'notEnding')
  assert.deepEqual(lifecycleCheck({ status: 'past_due', stripeSubscriptionId: 'sub_1', cancelAtPeriodEnd: true }, 'resume'), { ok: true }, 'a past-due plan can still be resumed once payment is fixed')
})

function harness({ stripe, user }) {
  const users = { u1: user }
  const store = {
    getUser: (id) => users[id] || null,
    setSubscription: (id, patch) => { Object.assign(users[id].subscription, patch); return { ...users[id].subscription, stripeSubscriptionId: undefined } },
    incidents: [],
    recordWorkIncident: (i) => store.incidents.push(i),
  }
  const app = express()
  app.use(express.json())
  const requireWorkAuth = (req, res, next) => { req.workUser = users.u1; next() }
  const hooks = []
  registerLifecycleRoutes(app, { store, requireWorkAuth, getStripe: async () => stripe, cfg: () => ({ secret: stripe ? 'sk' : '' }), onCanceled: (x) => hooks.push(['canceled', x.reason]), onResumed: () => hooks.push(['resumed']) })
  return { app, store, users, hooks }
}
async function call(app, path, body) {
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)) })
  try {
    const res = await fetch(`http://127.0.0.1:${srv.address().port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
    return { status: res.status, data: await res.json() }
  } finally { await new Promise((r) => srv.close(r)) }
}

test('cancel then resume: Stripe is asked first, the store mirrors it, the hooks fire with the reason', async () => {
  const calls = []
  const stripe = { subscriptions: { update: async (id, params) => { calls.push([id, params]); return { id, cancel_at_period_end: !!params.cancel_at_period_end, current_period_end: 1800000000 } } } }
  const h = harness({ stripe, user: { id: 'u1', subscription: { status: 'active', plan: 'basic', stripeSubscriptionId: 'sub_1' } } })
  const c = await call(h.app, '/api/work/subscription/cancel', { reason: 'Project finished' })
  assert.equal(c.status, 200)
  assert.equal(c.data.subscription.cancelAtPeriodEnd, true)
  assert.equal(c.data.subscription.currentPeriodEnd, '2027-01-15T08:00:00.000Z')
  assert.deepEqual(calls[0], ['sub_1', { cancel_at_period_end: true, cancellation_details: { comment: 'Project finished' } }])
  assert.equal(h.users.u1.subscription.cancelReason, 'Project finished')
  const again = await call(h.app, '/api/work/subscription/cancel', {})
  assert.equal(again.status, 409); assert.equal(again.data.alreadyEnding, true)
  const r = await call(h.app, '/api/work/subscription/resume', {})
  assert.equal(r.status, 200)
  assert.equal(r.data.subscription.cancelAtPeriodEnd, false)
  assert.equal(h.users.u1.subscription.cancelReason, null)
  assert.deepEqual(calls[1], ['sub_1', { cancel_at_period_end: false }])
  assert.deepEqual(h.hooks, [['canceled', 'Project finished'], ['resumed']])
  assert.ok(!JSON.stringify(c.data).includes('sub_1'), 'no Stripe id reaches the client')
})

test('no subscription: 409 with the actionable flag; Stripe down: 502 and an incident, store unchanged', async () => {
  const none = harness({ stripe: {}, user: { id: 'u1', subscription: { status: 'none' } } })
  const r = await call(none.app, '/api/work/subscription/cancel', {})
  assert.equal(r.status, 409); assert.equal(r.data.noSubscription, true)
  const down = harness({ stripe: { subscriptions: { update: async () => { throw new Error('stripe unreachable') } } }, user: { id: 'u1', subscription: { status: 'active', stripeSubscriptionId: 'sub_1' } } })
  const d = await call(down.app, '/api/work/subscription/cancel', {})
  assert.equal(d.status, 502)
  assert.equal(down.users.u1.subscription.cancelAtPeriodEnd, undefined, 'the store never records a cancel Stripe did not make')
  assert.equal(down.store.incidents[0].kind, 'billing_cancel_failed')
  const off = harness({ stripe: null, user: { id: 'u1', subscription: { status: 'active', stripeSubscriptionId: 'sub_1' } } })
  assert.equal((await call(off.app, '/api/work/subscription/cancel', {})).status, 503, 'Stripe not configured')
})
