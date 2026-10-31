// A person's whole money journey against the REAL server with the fake Stripe
// (support/boot/fake-stripe.mjs, reached by the product's real SDK through
// STRIPE_API_BASE) and signed webhooks (support/stripe-events.mjs): sign up,
// verify, pay on the hosted Checkout page, land on the dashboard with the plan;
// upgrade now and downgrade at period end; cancel at period end and resume; a
// failed payment and its fix through the hosted portal; extra hours; invoices.
// Nothing is skipped: an edition that sells no personal plans (saas) checks,
// for each flow, that it is refused.
//
// The server runs with STRIPE_E2E_ENV (Stripe keys and prices, the public URL
// pointing back at the server so Stripe's redirects land here). Other specs
// with the same env may share it, so every Stripe lookup is scoped to this
// test's own account.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { personalAccountsRefused } from '../support/edition-branch.mjs'
import { wrap } from '../support/api.mjs'
import { STRIPE_E2E_ENV, deliverEvent } from '../support/stripe-events.mjs'

test.use({ serverEnv: STRIPE_E2E_ENV })

const sells = (edition) => capsOf(edition).has('individual_plans') && capsOf(edition).has('solo_signup')
const PASSWORD = 'Checkout-Pass-123!'

// Sign up through the real onboarding API in the browser's own cookie jar,
// read the verification code from the dev email sink, pick a plan, then pay
// on the fake Checkout page. Returns the page (signed in, on the dashboard).
async function signUpAndPay({ as, seed, server }, { plan = 'basic', cycle = 'monthly' } = {}) {
  const { context } = await as.context()
  const api = wrap(context.request)
  const email = `${seed.prefix()}@e2e-mail.net`
  const r = await api.post('/api/work/onboarding/signup', { email, password: PASSWORD, acceptTerms: true })
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  const mail = (await server.ctl('emails')).reverse().find((m) => m.type === 'verify_email' && m.to === email)
  expect(mail, 'the verification email reached the sink').toBeTruthy()
  const code = String((mail.data && mail.data.code) || '').trim()
  expect(code).toMatch(/^\d{6}$/)
  expect((await api.post('/api/work/onboarding/verify', { code })).status).toBe(200)
  expect((await api.post('/api/work/onboarding/plan', { plan, cycle })).status).toBe(200)
  const page = await context.newPage()
  await page.goto('/workcopilot/signup/pay')
  await page.getByRole('button', { name: /secure payment/i }).click()
  await page.waitForURL(/\/checkout\/cs_/)
  await expect(page.locator('h1')).toHaveText('Fake Stripe Checkout')
  await page.locator('#fake-pay').click()
  await page.waitForURL(/\/workcopilot\/signup\/(pay\?checkout=success|welcome)/)
  // The server confirms with Stripe (never from the redirect) and welcomes.
  await page.getByRole('button', { name: /get started/i }).click()
  await page.waitForURL(/\/work(\?|$)/)
  // Answer the first-run "Choose your language" question the way the modal
  // would, so it does not sit over the dashboard (a dedicated test drives it).
  await api.post('/api/work/profile/language', { language: 'en' })
  await page.reload()
  await page.waitForLoadState('networkidle')
  const me = await api.get('/api/work/me')
  const user = me.data && (me.data.user || me.data)
  return { page, context, api, email, user }
}

// Every flow runs in every edition: the real journey where personal plans are
// sold, the refusal elsewhere.
function individualTest(title, fn) {
  test(title, async ({ as, seed, edition, server }, testInfo) => {
    test.setTimeout(180_000)   // a real sign-up, a Checkout hop and several dashboard renders
    if (!sells(edition)) return personalAccountsRefused({ as, seed, edition }, { what: `personal billing (${title})` })
    return fn({ as, seed, edition, server }, testInfo)
  })
}

individualTest('sign up, pay through Stripe Checkout, land on the dashboard with the plan and the first invoice', async (fx) => {
  const { page, api, user } = await signUpAndPay(fx)
  const sub = (await api.get('/api/work/subscription')).data.subscription
  expect(sub.status).toBe('active')
  expect(sub.plan).toBe('basic')
  expect(sub.cycle).toBe('monthly')
  expect(sub.cancelAtPeriodEnd).toBe(false)
  expect(sub).not.toHaveProperty('stripeCustomerId')
  // Stripe holds exactly one customer and one live subscription for this person.
  const ids = await fx.server.ctl('user.stripe', { id: user.id })
  const stripe = await fx.server.ctl('stripe.state')
  expect(stripe.customers.filter((c) => c.id === ids.customer).length).toBe(1)
  expect(stripe.subscriptions.filter((s) => s.customer === ids.customer && s.status === 'active').map((s) => s.id)).toEqual([ids.subscription])
  const inv =(await api.get('/api/work/invoices')).data.invoices
  expect(inv.length).toBe(1)
  expect(inv[0].paid).toBe(true)
  expect(inv[0].hostedInvoiceUrl).toMatch(/^http:\/\/127\.0\.0\.1:/)
  // The dashboard shows the plan and the billing panel; the rail has Billing.
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  await expect(page.locator('.wb .wb-plan-name')).toHaveText('Basic')
  await expect(page.locator('.wb .wb-status')).toHaveText('Active')
  await expect(page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Billing' })).toBeVisible()
  // Guiding is allowed: the subscription gate lets a paying person start.
  const usage = await api.get('/api/work/usage')
  expect(usage.status).toBe(200)
  expect(user && user.canUseService).toBe(true)
})

individualTest('upgrade applies now with proration; a downgrade waits for the period end and shows on the dashboard', async (fx) => {
  const { page, api, user } = await signUpAndPay(fx)
  const up = await api.post('/api/work/subscription/change', { plan: 'advanced' })
  expect(up.status, JSON.stringify(up.data)).toBe(200)
  expect(up.data.effective).toBe('now')
  expect(up.data.subscription.plan).toBe('advanced')
  const ids = await fx.server.ctl('user.stripe', { id: user.id })
  const stripe = await fx.server.ctl('stripe.state')
  const call = stripe.calls.find((c) => c.path === `/v1/subscriptions/${ids.subscription}` && c.method === 'POST' && c.form.items)
  expect(call.form.proration_behavior).toBe('create_prorations')
  expect(call.form.items[0].price).toBe('price_advanced_m')
  const down = await api.post('/api/work/subscription/change', { plan: 'basic' })
  expect(down.status, JSON.stringify(down.data)).toBe(200)
  expect(down.data.effective).toBe('period_end')
  expect(down.data.subscription.plan, 'the current plan is kept until the renewal').toBe('advanced')
  expect(down.data.subscription.pendingChange.plan).toBe('basic')
  await page.goto('/work')
  await expect(page.locator('.wba.info')).toContainText(/Switching to Basic on/)
  // Annual is configured, so the switch to annual is offered. Its monthly
  // equivalent is lower (20% off), so the product treats it as a downgrade:
  // scheduled at the period end, the current cycle kept until then.
  const annual = await api.post('/api/work/subscription/change', { plan: 'advanced', cycle: 'annual' })
  expect(annual.status, JSON.stringify(annual.data)).toBe(200)
  expect(annual.data.effective).toBe('period_end')
  expect(annual.data.subscription.cycle).toBe('monthly')
  expect(annual.data.subscription.pendingChange).toMatchObject({ plan: 'advanced', cycle: 'annual' })
})

individualTest('cancel at the period end in the app, read the end date, resume with one click', async (fx) => {
  const { page, api, user } = await signUpAndPay(fx)
  await page.goto('/work/billing')
  await expect(page.getByRole('heading', { level: 1, name: 'Billing' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel plan' }).click()
  const dialog = page.getByRole('dialog', { name: 'Cancel plan' })
  await dialog.locator('textarea').fill('Project finished for now')
  await dialog.getByRole('button', { name: 'Cancel at period end' }).click()
  await expect(dialog).toHaveCount(0)
  // The billing panel states it, with its own Resume; the dashboard strip too.
  await expect(page.locator('.wb-ending')).toContainText(/set to cancel/)
  await expect(page.locator('.wb-ending .wb-resume')).toBeVisible()
  await page.goto('/work')
  await expect(page.locator('.wba.muted')).toContainText(/Your plan ends on/)
  const sub = (await api.get('/api/work/subscription')).data.subscription
  expect(sub.status, 'still active until the period end').toBe('active')
  expect(sub.cancelAtPeriodEnd).toBe(true)
  const ids = await fx.server.ctl('user.stripe', { id: user.id })
  const stripeSub = await fx.server.ctl('stripe.subscription', { id: ids.subscription })
  expect(stripeSub.cancel_at_period_end, 'Stripe was told first').toBe(true)
  expect(stripeSub.cancellation_details.comment).toBe('Project finished for now')
  // A second cancel is refused with the actionable flag.
  const again = await api.post('/api/work/subscription/cancel', {})
  expect([again.status, again.data.alreadyEnding]).toEqual([409, true])
  // Resume from the alert.
  await page.locator('.wba').getByRole('button', { name: 'Resume plan' }).click()
  await expect(page.locator('.wba')).toHaveCount(0)
  expect((await api.get('/api/work/subscription')).data.subscription.cancelAtPeriodEnd).toBe(false)
  expect((await fx.server.ctl('stripe.subscription', { id: ids.subscription })).cancel_at_period_end).toBe(false)
  // The portal's own cancel arrives as a webhook and shows identically.
  const stripeNow = await fx.server.ctl('stripe.subscription', { id: ids.subscription })
  const hook = await deliverEvent(api.ctx,'customer.subscription.updated', { ...stripeNow, cancel_at_period_end: true })
  expect(hook.status).toBe(200)
  expect((await api.get('/api/work/subscription')).data.subscription.cancelAtPeriodEnd).toBe(true)
})

individualTest('a failed payment pauses guiding and shows the fix; the next paid renewal clears it; a replayed event is ignored', async (fx) => {
  const { page, api, user } = await signUpAndPay(fx)
  const ids = await fx.server.ctl('user.stripe', { id: user.id })
  const failed = await deliverEvent(api.ctx, 'invoice.payment_failed', { id: 'in_e2e_failed', object: 'invoice', customer: ids.customer, subscription: ids.subscription, amount_due: 9900, currency: 'usd' }, { id: 'evt_e2e_fail_1' })
  expect(failed.status).toBe(200)
  expect((await api.get('/api/work/subscription')).data.subscription.status).toBe('past_due')
  // The person is told what to do, on the dashboard and on the billing page.
  await page.goto('/work')
  const alert = page.locator('.wba.warn')
  await expect(alert).toContainText(/Your last payment did not go through/)
  await expect(alert.getByRole('button', { name: 'Update payment method' })).toBeVisible()
  // Guiding is blocked while past due (the gate reads the live status).
  const start = await api.post('/api/work/sessions', { title: 'Blocked', goal: 'Anything' })
  expect(start.status, 'no guiding while a payment is outstanding').toBeGreaterThanOrEqual(400)
  // Update payment method opens the (fake) Stripe portal and comes back.
  await alert.getByRole('button', { name: 'Update payment method' }).click()
  await page.waitForURL(/\/portal\/cus_/)
  await page.locator('#fake-portal-back').click()
  await page.waitForURL(/\/work(\?|$)/)
  // The customer paid: Stripe reports the subscription active again.
  const stripeSub = await fx.server.ctl('stripe.subscription', { id: ids.subscription })
  const ok = await deliverEvent(api.ctx, 'customer.subscription.updated', { ...stripeSub, status: 'active' }, { id: 'evt_e2e_ok_1' })
  expect(ok.status).toBe(200)
  expect((await api.get('/api/work/subscription')).data.subscription.status).toBe('active')
  await page.goto('/work')
  await expect(page.locator('.wba.warn')).toHaveCount(0)
  // Replaying the earlier failure (same event id) is acknowledged but not applied.
  const replay = await deliverEvent(api.ctx, 'invoice.payment_failed', { id: 'in_e2e_failed', object: 'invoice', customer: ids.customer, subscription: ids.subscription, amount_due: 9900, currency: 'usd' }, { id: 'evt_e2e_fail_1' })
  expect(replay.data.duplicate).toBe(true)
  expect((await api.get('/api/work/subscription')).data.subscription.status).toBe('active')
  // An unsigned event is refused.
  const bad = await api.ctx.fetch('/api/work/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' }, data: '{}', failOnStatusCode: false })
  expect(bad.status()).toBe(400)
})

individualTest('extra hours: a one-time Checkout, paid on Stripe, credited by the webhook', async (fx) => {
  const { page, api, user } = await signUpAndPay(fx)
  const before = (await api.get('/api/work/usage')).data.purchasedSeconds || 0
  const r = await api.post('/api/work/checkout/credits', { kind: 'hours', quantity: 2 })
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  expect(r.data.quantity).toBe(2)
  await page.goto(r.data.url)
  await page.locator('#fake-pay').click()
  await page.waitForURL(/\/work\?purchase=success/)
  // Stripe tells the server the one-time payment completed.
  const session = (await fx.server.ctl('stripe.state')).sessions.find((s) => s.mode === 'payment' && s.client_reference_id === String(user.id))
  const hook = await deliverEvent(api.ctx, 'checkout.session.completed', { ...session, customer: session.customer || null, client_reference_id: String(user.id) })
  expect(hook.status).toBe(200)
  const after = (await api.get('/api/work/usage')).data.purchasedSeconds || 0
  expect(after - before).toBe(2 * 3600)
  // The hours are on the dashboard's plan meters as top-up time.
  await page.goto('/work')
  await expect(page.locator('.wd-pm')).toContainText(/2 h|2h|2 hours/)
})
