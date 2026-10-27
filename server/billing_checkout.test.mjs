// The shared activation path (billing_checkout.js): webhook and the onboarding
// confirm both call applyCheckoutSession, so it must be idempotent and the
// new-subscription signal must fire exactly once however many times it runs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyCheckoutSession, checkoutSessionPaid, subscriptionCheckoutParams, mapStatus } from './billing_checkout.js'

function fakeStore() {
  const users = { u1: { id: 'u1', username: 'a@example.com', subscription: { status: 'none', plan: null } } }
  const calls = []
  return {
    calls,
    getUser: (id) => users[id] || null,
    setSubscription: (uid, patch) => { calls.push({ uid, patch }); Object.assign(users[uid].subscription, patch) },
    markAnnualBenefitUsed: () => {},
  }
}
const session = (over = {}) => ({
  id: 'cs_test_1', mode: 'subscription', status: 'complete', payment_status: 'paid',
  client_reference_id: 'u1', customer: 'cus_1', subscription: 'sub_1',
  metadata: { workUserId: 'u1', plan: 'advanced', cycle: 'annual', affiliateBenefit: '' }, ...over,
})
const stripe = { subscriptions: { retrieve: async () => ({ id: 'sub_1', status: 'active', current_period_end: 1800000000, items: { data: [{ price: { id: 'price_adv', recurring: { interval: 'year' } } }] } }) } }

test('applyCheckoutSession activates once; a replay is a no-op for the alert', async () => {
  const store = fakeStore()
  let alerts = 0
  const r1 = await applyCheckoutSession(stripe, store, session(), { price: { advanced: 'price_adv' }, onNew: () => { alerts++ } })
  assert.equal(r1.activated, true)
  assert.equal(r1.plan, 'advanced'); assert.equal(r1.cycle, 'annual'); assert.equal(r1.status, 'active')
  assert.equal(store.calls[0].patch.stripeCustomerId, 'cus_1')
  assert.equal(store.calls[0].patch.stripeSubscriptionId, 'sub_1')
  const r2 = await applyCheckoutSession(stripe, store, session(), { price: { advanced: 'price_adv' }, onNew: () => { alerts++ } })
  assert.equal(r2.activated, false, 'second application sees the account already live')
  assert.equal(alerts, 1, 'owner alert fired exactly once')
  assert.equal(store.calls.length, 2, 'state setter ran twice with the same state (idempotent)')
  assert.deepEqual(store.calls[0].patch, store.calls[1].patch)
})

test('an expanded subscription needs no extra Stripe call, and a missing user reference is ignored', async () => {
  const store = fakeStore()
  const noStripe = { subscriptions: { retrieve: async () => { throw new Error('must not be called') } } }
  const r = await applyCheckoutSession(noStripe, store, session({ subscription: { id: 'sub_1', status: 'trialing', current_period_end: 1800000000, items: { data: [{ price: { id: 'price_adv', recurring: { interval: 'month' } } }] } } }), { price: { advanced: 'price_adv' } })
  assert.equal(r.status, 'trialing')
  assert.equal(r.cycle, 'monthly', 'the subscription interval is authoritative over the metadata cycle')
  assert.equal(await applyCheckoutSession(stripe, store, session({ client_reference_id: null, metadata: {} }), {}), null)
})

test('checkoutSessionPaid trusts Stripe fields only', () => {
  assert.equal(checkoutSessionPaid(session()), true)
  assert.equal(checkoutSessionPaid(session({ payment_status: 'no_payment_required' })), true, 'trial start')
  assert.equal(checkoutSessionPaid(session({ payment_status: 'unpaid' })), false, 'async payment still settling')
  assert.equal(checkoutSessionPaid(session({ status: 'open' })), false)
  assert.equal(checkoutSessionPaid(session({ mode: 'payment' })), false)
  assert.equal(checkoutSessionPaid(null), false)
})

test('subscriptionCheckoutParams: same metadata for every caller, customer reuse, promo codes on', () => {
  const p = subscriptionCheckoutParams({ user: { id: 'u1', subscription: { stripeCustomerId: 'cus_9' } }, plan: 'basic', cycle: 'monthly', priceId: 'price_b', successUrl: 'https://x/s', cancelUrl: 'https://x/c', customerEmail: 'a@example.com' })
  assert.equal(p.mode, 'subscription'); assert.equal(p.customer, 'cus_9'); assert.equal(p.customer_email, undefined)
  assert.equal(p.allow_promotion_codes, true); assert.equal(p.metadata.plan, 'basic'); assert.equal(p.subscription_data.metadata.cycle, 'monthly')
  const q = subscriptionCheckoutParams({ user: { id: 'u2', subscription: {} }, plan: 'basic', cycle: 'annual', priceId: 'price_b', benefitDays: 30, successUrl: 'https://x/s', cancelUrl: 'https://x/c', customerEmail: 'b@example.com' })
  assert.equal(q.customer_email, 'b@example.com'); assert.equal(q.subscription_data.trial_period_days, 30); assert.equal(q.metadata.affiliateBenefit, 'annual_free_30d')
  assert.equal(mapStatus('incomplete'), 'none'); assert.equal(mapStatus('paused'), 'past_due')
})
