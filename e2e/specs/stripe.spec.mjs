// Stripe, end to end, for an individual: checkout, the signed webhook that
// activates the plan, the billing portal, a refund and a cancellation.
//
// The product's own Stripe code runs unchanged: the real stripe SDK in the
// server is pointed at a local fake Stripe API (support/boot/fake-stripe.mjs,
// through STRIPE_API_BASE, loopback only), and webhook events are signed with
// a test signing secret exactly as Stripe signs them (support/stripe-webhook.mjs)
// and checked by the SDK's constructEvent. This file runs on its own server
// (a distinct serverEnv), so no other spec sees Stripe configured.
//
// Editions: where personal plans are sold (individual_plans) the whole flow
// runs; elsewhere it is checked as refused (no skips).
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { stripeEvent, sendStripeEvent, E2E_WEBHOOK_SECRET } from '../support/stripe-webhook.mjs'

const PRICES = { STRIPE_PRICE_LITE: 'price_e2e_lite', STRIPE_PRICE_BASIC: 'price_e2e_basic', STRIPE_PRICE_ADVANCED: 'price_e2e_advanced', STRIPE_PRICE_PREMIUM: 'price_e2e_premium' }
test.use({ serverEnv: { E2E_FAKE_STRIPE: '1', STRIPE_SECRET_KEY: 'sk_test_e2e_fake_key', STRIPE_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET, ...PRICES, OWNER_ALERT_EMAILS: 'owner.alerts@e2e-mail.net' } })

const sells = (edition) => capsOf(edition).has('individual_plans') && capsOf(edition).has('stripe_billing')
const startTask = (api) => api.post('/api/work/sessions', { title: 'Billing check', goal: 'Reconcile the monthly expense report' })

test('an individual subscribes: checkout, signed webhook activates the plan, portal, refund, cancel', async ({ as, seed, edition, server }) => {
  const solo = await seed.solo({ paid: false })
  const me = await as.api(solo)
  if (!sells(edition)) {
    test.info().annotations.push({ type: 'edition', description: `${edition} sells no personal plans: checked that checkout and plan changes are refused and no Stripe call is made.` })
    const r = await me.post('/api/work/checkout', { plan: 'basic' })
    expect([r.status, r.data.individualPlansDisabled]).toEqual([403, true])
    const c = await me.post('/api/work/subscription/change', { plan: 'premium' })
    expect([c.status, c.data.individualPlansDisabled]).toEqual([403, true])
    expect((await server.ctl('stripe.calls')).filter((x) => x.path === '/v1/checkout/sessions')).toEqual([])
    return
  }

  // Billing is configured, so a personal account needs a plan before guiding.
  const before = await startTask(me)
  expect([before.status, before.data.needsSubscription]).toEqual([402, true])

  // 1. Checkout: the server creates a Stripe Checkout Session for the plan's price.
  const co = await me.post('/api/work/checkout', { plan: 'basic' })
  expect(co.status, JSON.stringify(co.data)).toBe(200)
  const session = (await server.ctl('stripe.sessions')).find((s) => s.client_reference_id === String(solo.id))
  expect(session, 'a Checkout Session was created for this person').toBeTruthy()
  expect(co.data.url).toBe(session.url)
  expect([session.mode, session.priceId, session.metadata.plan, session.metadata.workUserId]).toEqual(['subscription', 'price_e2e_basic', 'basic', String(solo.id)])

  // 2. The webhook: a forged signature is refused and changes nothing.
  const anon = await as.anon()
  const completed = stripeEvent('checkout.session.completed', { ...session, status: 'complete', payment_status: 'paid' })
  const forged = await sendStripeEvent(anon, completed, { secret: 'whsec_not_the_real_secret' })
  expect(forged.status).toBe(400)
  expect((await me.get('/api/work/subscription')).data.subscription.status).not.toBe('active')

  // A correctly signed event activates the plan (the server reads the
  // subscription back from Stripe), and a replay is acknowledged once only.
  const ok = await sendStripeEvent(anon, completed)
  expect([ok.status, ok.data.received]).toEqual([200, true])
  await expect.poll(async () => (await me.get('/api/work/subscription')).data.subscription).toMatchObject({ status: 'active', plan: 'basic' })
  expect((await server.ctl('stripe.calls')).some((c) => c.method === 'GET' && c.path === `/v1/subscriptions/${session.subscription}`)).toBe(true)
  const replay = await sendStripeEvent(anon, completed)
  expect(replay.data.duplicate).toBe(true)
  const after = await startTask(me)
  expect(after.status, JSON.stringify(after.data)).toBe(200)

  // The paid invoice is the money event: booked to the finance ledger.
  const invoice = { id: `in_e2e_${session.id.slice(-6)}`, object: 'invoice', customer: session.customer, subscription: session.subscription, amount_paid: 1900, currency: 'usd', number: 'E2E-0001', status: 'paid', paid: true }
  expect((await sendStripeEvent(anon, stripeEvent('invoice.paid', invoice))).status).toBe(200)
  const admin = await as.api(SUPERADMIN)
  await expect.poll(async () => ((await admin.get('/api/work/admin/finance/transactions')).data.transactions || []).filter((t) => t.stripeId === invoice.id).map((t) => [t.kind, t.amount]))
    .toEqual([['subscription', 19]])

  // 3. The billing portal opens for the person's own Stripe customer.
  const portal = await me.post('/api/work/billing/portal')
  expect(portal.status, JSON.stringify(portal.data)).toBe(200)
  expect(portal.data.url).toMatch(/\/portal\/bps_/)
  const portalCall = (await server.ctl('stripe.calls')).filter((c) => c.path === '/v1/billing_portal/sessions').pop()
  expect(portalCall.params.customer).toBe(session.customer)

  // 4. Refund (superadmin): the latest charge is refunded in Stripe, and the
  // charge.refunded webhook books the refund.
  const refund = await admin.post(`/api/work/admin/users/${solo.id}/refund`, {})
  expect(refund.status, JSON.stringify(refund.data)).toBe(200)
  expect([refund.data.ok, refund.data.refund.amount, refund.data.refund.status]).toEqual([true, 1900, 'succeeded'])
  const [charge] = await server.ctl('stripe.charges', { customer: session.customer })
  expect(charge.refunded).toBe(true)
  const refunded = stripeEvent('charge.refunded', { id: charge.id, object: 'charge', customer: session.customer, amount_refunded: 1900, currency: 'usd', refunds: { data: [{ id: refund.data.refund.id, amount: 1900, currency: 'usd' }] } })
  expect((await sendStripeEvent(anon, refunded)).status).toBe(200)
  await expect.poll(async () => ((await admin.get('/api/work/admin/finance/transactions')).data.transactions || []).filter((t) => t.stripeId === refund.data.refund.id).map((t) => t.kind))
    .toEqual(['refund'])

  // 5. Cancel (superadmin, immediately): Stripe cancels the subscription, the
  // account loses guiding at once, and the later webhook keeps it canceled.
  const cancel = await admin.post(`/api/work/admin/users/${solo.id}/cancel-subscription`, { reason: 'E2E cancellation check' })
  expect(cancel.status, JSON.stringify(cancel.data)).toBe(200)
  expect(cancel.data.subscription.status).toBe('canceled')
  expect((await server.ctl('stripe.subscription', { id: session.subscription })).status).toBe('canceled')
  const deleted = stripeEvent('customer.subscription.deleted', await server.ctl('stripe.subscription', { id: session.subscription }))
  expect((await sendStripeEvent(anon, deleted)).status).toBe(200)
  expect((await me.get('/api/work/subscription')).data.subscription.status).toBe('canceled')
  const blocked = await startTask(me)
  expect([blocked.status, blocked.data.needsSubscription]).toEqual([402, true])

  // Every Stripe call went to the fake with a test key; nothing else was called.
  const calls = await server.ctl('stripe.calls')
  expect(calls.every((c) => c.auth)).toBe(true)
  expect(calls.filter((c) => !/^\/v1\/(checkout\/sessions|subscriptions\/|billing_portal\/|charges|refunds)/.test(c.path))).toEqual([])
})
