// Stripe webhook idempotency (APP-05): a replayed event.id is processed at most
// once, a bad signature is still rejected, and the dedupe is bounded. Uses the
// REAL stripe signature check (test header generated with the test secret), a
// fake in-memory store, and SYNTHETIC ids only.
import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic_not_a_real_key_0000'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_synthetic_test_secret_0000'
const { workStripeWebhook, createEventDeduper } = await import('./billing.js')
const Stripe = (await import('stripe')).default
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function fakeStore() {
  const calls = []
  return {
    calls,
    getBillingConfig: () => ({}),
    findUserByStripeSubscription: (id) => (id === 'sub_test_1' ? { id: 'u1', subscription: { plan: 'basic' } } : null),
    findUserByStripeCustomer: () => null,
    getUser: () => null,
    setSubscription: (uid, patch) => calls.push({ uid, patch }),
  }
}
function signed(evt, secret = process.env.STRIPE_WEBHOOK_SECRET) {
  const payload = JSON.stringify(evt)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return { body: Buffer.from(payload), headers: { 'stripe-signature': header } }
}
function fakeRes() {
  const r = { code: 200, json(b) { r.body = b; return r }, status(c) { r.code = c; return r } }
  return r
}
const subUpdated = (id) => ({
  id, object: 'event', type: 'customer.subscription.updated',
  data: { object: { id: 'sub_test_1', customer: 'cus_test_1', status: 'active', metadata: {} } },
})

test('a replayed event.id is processed only once', async () => {
  const st = fakeStore()
  const handler = workStripeWebhook({ store: st })
  const evt = subUpdated('evt_test_replay_1')

  const r1 = fakeRes(); await handler(signed(evt), r1)
  assert.equal(r1.code, 200); assert.equal(r1.body.received, true); assert.ok(!r1.body.duplicate)
  assert.equal(st.calls.length, 1, 'first delivery is applied')

  const r2 = fakeRes(); await handler(signed(evt), r2)
  assert.equal(r2.code, 200, 'replay is still acknowledged so Stripe stops retrying')
  assert.equal(r2.body.duplicate, true)
  assert.equal(st.calls.length, 1, 'replay did NOT apply the change again')
})

test('different event ids are each processed', async () => {
  const st = fakeStore()
  const handler = workStripeWebhook({ store: st })
  await handler(signed(subUpdated('evt_test_a')), fakeRes())
  await handler(signed(subUpdated('evt_test_b')), fakeRes())
  assert.equal(st.calls.length, 2)
})

test('signature verification is unchanged: a forged signature is rejected and not recorded', async () => {
  const st = fakeStore()
  const handler = workStripeWebhook({ store: st })
  const evt = subUpdated('evt_test_forged')
  const bad = signed(evt, 'whsec_attacker_guess')
  const r = fakeRes(); await handler(bad, r)
  assert.equal(r.code, 400)
  assert.equal(st.calls.length, 0)
  // The forged attempt must not have burned the id: the genuine event still applies.
  const ok = fakeRes(); await handler(signed(evt), ok)
  assert.equal(ok.code, 200); assert.ok(!ok.body.duplicate)
  assert.equal(st.calls.length, 1)
})

test('a failed handling releases the claim so a resend can be reprocessed', async () => {
  const st = fakeStore()
  let boom = true
  st.setSubscription = (uid, patch) => { if (boom) throw new Error('db down'); st.calls.push({ uid, patch }) }
  const handler = workStripeWebhook({ store: st })
  const evt = subUpdated('evt_test_retry')
  const origWarn = console.warn; console.warn = () => {}
  try {
    const r1 = fakeRes(); await handler(signed(evt), r1)
    assert.equal(r1.code, 200)
    boom = false
    const r2 = fakeRes(); await handler(signed(evt), r2)
    assert.ok(!r2.body.duplicate, 'resend after a failure is reprocessed')
    assert.equal(st.calls.length, 1)
  } finally { console.warn = origWarn }
})

test('createEventDeduper: claim/release/has and bounded size', () => {
  const d = createEventDeduper(3)
  assert.equal(d.claim('e1'), true)
  assert.equal(d.claim('e1'), false)
  assert.equal(d.has('e1'), true)
  d.release('e1')
  assert.equal(d.claim('e1'), true, 'released id can be claimed again')
  d.claim('e2'); d.claim('e3'); d.claim('e4')
  assert.equal(d.size, 3, 'bounded: never grows past the limit')
  assert.equal(d.has('e1'), false, 'oldest id evicted first')
  assert.equal(d.has('e4'), true)
  assert.equal(d.claim(undefined), true, 'no id: never blocks processing')
})
