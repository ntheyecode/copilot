// Stripe, end to end, for an individual at the API level: checkout, payment on
// the hosted Checkout page, the signed webhook that activates the plan, the
// paid invoice booked, the billing portal, a refund and a cancellation.
// (specs/individual-billing.spec.mjs drives the same fake through the browser.)
//
// The product's own Stripe code runs unchanged: the real stripe SDK in the
// server is pointed at the fake Stripe (support/boot/fake-stripe.mjs, through
// STRIPE_API_BASE, loopback only), and webhook events are signed with the test
// signing secret exactly as Stripe signs them (support/stripe-events.mjs) and
// checked by the SDK's constructEvent. Stripe keys come from STRIPE_E2E_ENV, so
// only servers booted with that env see Stripe configured.
//
// Editions: where personal plans are sold (individual_plans) the whole flow
// runs; elsewhere it is checked as refused (no skips).
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { STRIPE_E2E_ENV, deliverEvent } from '../support/stripe-events.mjs'

test.use({ serverEnv: STRIPE_E2E_ENV })

const sells = (edition) => capsOf(edition).has('individual_plans') && capsOf(edition).has('stripe_billing')
const startTask = (api) => api.post('/api/work/sessions', { title: 'Billing check', goal: 'Reconcile the monthly expense report' })
const stripeState = (server) => server.ctl('stripe.state')

test('an individual subscribes: checkout, signed webhook activates the plan, portal, refund, cancel', async ({ as, seed, edition, server }) => {
  const solo = await seed.solo({ paid: false })
  const me = await as.api(solo)
  if (!sells(edition)) {
    test.info().annotations.push({ type: 'edition', description: `${edition} sells no personal plans: checked that checkout and plan changes are refused and no Stripe call is made.` })
    const r = await me.post('/api/work/checkout', { plan: 'basic' })
    expect([r.status, r.data.individualPlansDisabled]).toEqual([403, true])
    const c = await me.post('/api/work/subscription/change', { plan: 'premium' })
    expect([c.status, c.data.individualPlansDisabled]).toEqual([403, true])
    expect((await stripeState(server)).calls.filter((x) => x.path === '/v1/checkout/sessions')).toEqual([])
    return
  }

  // Billing is configured, so a personal account needs a plan before guiding.
  const before = await startTask(me)
  expect([before.status, before.data.needsSubscription]).toEqual([402, true])

  // 1. Checkout: the server creates a Stripe Checkout Session for the plan's price.
  const co = await me.post('/api/work/checkout', { plan: 'basic' })
  expect(co.status, JSON.stringify(co.data)).toBe(200)
  const opened = (await stripeState(server)).sessions.find((s) => s.client_reference_id === String(solo.id))
  expect(opened, 'a Checkout Session was created for this person').toBeTruthy()
  expect(co.data.url).toBe(opened.url)
  expect([opened.mode, opened.status, opened.line_items[0].price, opened.metadata.plan, opened.metadata.workUserId]).toEqual(['subscription', 'open', STRIPE_E2E_ENV.STRIPE_PRICE_BASIC, 'basic', String(solo.id)])

  // The person pays on the hosted Checkout page (its Pay button posts here);
  // Stripe sends them back to the product's success URL on this server.
  const anon = await as.anon()
  const paid = await anon.ctx.fetch(`${opened.url}/pay`, { method: 'POST', maxRedirects: 0, failOnStatusCode: false })
  expect(paid.status()).toBe(302)
  expect(paid.headers().location).toBe(`${server.baseURL}/work?checkout=success`)
  const session = (await stripeState(server)).sessions.find((s) => s.id === opened.id)
  expect([session.status, session.payment_status]).toEqual(['complete', 'paid'])
  expect(session.subscription).toMatch(/^sub_/)
  // Paying is not activation: only Stripe's signed event (or the server's own
  // read-back) turns the plan on, never the redirect.
  expect((await me.get('/api/work/subscription')).data.subscription.status).not.toBe('active')

  // 2. The webhook: a forged signature is refused and changes nothing.
  const eventId = `evt_e2e_completed_${session.id}`
  const forged = await deliverEvent(anon.ctx, 'checkout.session.completed', session, { id: eventId, secret: 'whsec_not_the_real_secret' })
  expect(forged.status).toBe(400)
  expect((await me.get('/api/work/subscription')).data.subscription.status).not.toBe('active')

  // A correctly signed event activates the plan (the server reads the
  // subscription back from Stripe), and a replay is acknowledged once only.
  const ok = await deliverEvent(anon.ctx, 'checkout.session.completed', session, { id: eventId })
  expect([ok.status, ok.data.received]).toEqual([200, true])
  await expect.poll(async () => (await me.get('/api/work/subscription')).data.subscription).toMatchObject({ status: 'active', plan: 'basic' })
  expect((await stripeState(server)).calls.some((c) => c.method === 'GET' && c.path === `/v1/subscriptions/${session.subscription}`)).toBe(true)
  const replay = await deliverEvent(anon.ctx, 'checkout.session.completed', session, { id: eventId })
  expect(replay.data.duplicate).toBe(true)
  const after = await startTask(me)
  expect(after.status, JSON.stringify(after.data)).toBe(200)

  // The paid invoice Stripe raised for the first period is the money event:
  // booked to the finance ledger at its amount.
  const invoice = (await stripeState(server)).invoices.find((i) => i.subscription === session.subscription)
  expect([invoice.status, invoice.amount_paid > 0]).toEqual(['paid', true])
  expect((await deliverEvent(anon.ctx, 'invoice.paid', invoice)).status).toBe(200)
  const admin = await as.api(SUPERADMIN)
  await expect.poll(async () => ((await admin.get('/api/work/admin/finance/transactions')).data.transactions || []).filter((t) => t.stripeId === invoice.id).map((t) => [t.kind, t.amount]))
    .toEqual([['subscription', invoice.amount_paid / 100]])

  // 3. The billing portal opens for the person's own Stripe customer.
  const portal = await me.post('/api/work/billing/portal')
  expect(portal.status, JSON.stringify(portal.data)).toBe(200)
  expect(portal.data.url).toContain(`/portal/${session.customer}?return_url=`)
  const portalCall = (await stripeState(server)).calls.filter((c) => c.path === '/v1/billing_portal/sessions').pop()
  expect(portalCall.form.customer).toBe(session.customer)

  // 4. Refund (superadmin): the latest charge is refunded in Stripe, and the
  // charge.refunded webhook books the refund.
  const charge = (await stripeState(server)).charges.find((c) => c.invoice === invoice.id)
  expect(charge.amount).toBe(invoice.amount_paid)
  const refund = await admin.post(`/api/work/admin/users/${solo.id}/refund`, {})
  expect(refund.status, JSON.stringify(refund.data)).toBe(200)
  expect([refund.data.ok, refund.data.refund.amount, refund.data.refund.status]).toEqual([true, charge.amount, 'succeeded'])
  const refundedCharge = (await stripeState(server)).charges.find((c) => c.id === charge.id)
  expect([refundedCharge.refunded, refundedCharge.amount_refunded, refundedCharge.refunds.data[0].id]).toEqual([true, charge.amount, refund.data.refund.id])
  expect((await deliverEvent(anon.ctx, 'charge.refunded', refundedCharge)).status).toBe(200)
  await expect.poll(async () => ((await admin.get('/api/work/admin/finance/transactions')).data.transactions || []).filter((t) => t.stripeId === refund.data.refund.id).map((t) => t.kind))
    .toEqual(['refund'])

  // 5. Cancel (superadmin, immediately): Stripe cancels the subscription, the
  // account loses guiding at once, and the later webhook keeps it canceled.
  const cancel = await admin.post(`/api/work/admin/users/${solo.id}/cancel-subscription`, { reason: 'E2E cancellation check' })
  expect(cancel.status, JSON.stringify(cancel.data)).toBe(200)
  expect(cancel.data.subscription.status).toBe('canceled')
  const canceled = await server.ctl('stripe.subscription', { id: session.subscription })
  expect(canceled.status).toBe('canceled')
  expect((await deliverEvent(anon.ctx, 'customer.subscription.deleted', canceled)).status).toBe(200)
  expect((await me.get('/api/work/subscription')).data.subscription.status).toBe('canceled')
  const blocked = await startTask(me)
  expect([blocked.status, blocked.data.needsSubscription]).toEqual([402, true])

  // Every Stripe call went to the fake with a test key, and each was one the
  // fake implements (an unexpected endpoint would be marked unhandled).
  const calls = (await stripeState(server)).calls
  expect(calls.filter((c) => !c.auth)).toEqual([])
  expect(calls.filter((c) => c.unhandled)).toEqual([])
  expect(calls.filter((c) => !/^\/v1\/(checkout\/sessions|subscriptions\/|subscription_schedules|billing_portal\/|charges|refunds|invoices|prices\/|products\/|customers\/)/.test(c.path))).toEqual([])
})
