// The `onprem` edition on the REAL app: one company only, no self sign-up, and
// Stripe is off even when a Stripe key is present in the environment.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

// A key in the env must NOT turn Stripe on in an edition without stripe_billing.
const app = await bootEdition('onprem', { STRIPE_SECRET_KEY: 'sk_test_edition_should_ignore', STRIPE_WEBHOOK_SECRET: 'whsec_edition_should_ignore' })
after(app.close)
const { req, jar, superadmin } = app
const billing = await import('./billing.js')

test('GET /api/work/edition reports onprem', async () => {
  const r = await req(jar(), 'GET', '/api/work/edition')
  assert.equal(r.data.edition, 'onprem')
  assert.ok(r.data.capabilities.includes('single_company'))
  assert.ok(!r.data.capabilities.includes('stripe_billing'))
})

test('self sign-up is refused on both sign-up paths and creates nothing', async () => {
  const before = app.store.listUsers().length
  const a = await req(jar(), 'POST', '/api/work/signup', { username: 'solo3', password: 'Str0ng-passw0rd', email: 'solo3@example.com', name: 'Solo Three', acceptTerms: true })
  assert.equal(a.status, 403)
  assert.equal(a.data.signupDisabled, true)
  const b = await req(jar(), 'POST', '/api/work/onboarding/signup', { email: 'solo4@example.com', password: 'Str0ng-passw0rd', acceptTerms: true })
  assert.equal(b.status, 403)
  assert.equal(b.data.signupDisabled, true)
  assert.equal(app.store.listUsers().length, before)
})

test('exactly one company: the first is created, a second is refused with 409', async () => {
  const j = await superadmin()
  const first = await req(j, 'POST', '/api/work/admin/companies', { name: 'Fabrikam', plan: 'basic', seats: 10 })
  assert.equal(first.status, 200)
  const second = await req(j, 'POST', '/api/work/admin/companies', { name: 'Fabrikam Two', plan: 'basic', seats: 10 })
  assert.equal(second.status, 409)
  assert.match(second.data.error, /one company/)
  assert.equal(second.data.singleCompany, true)
  assert.equal(app.store.listCompanies().length, 1)
})

test('Stripe is not configured even with env keys, and the webhook does nothing', async () => {
  assert.equal(billing.billingConfigured(app.store), false)
  assert.deepEqual(billing.billingPriceMap(app.store), { lite: '', basic: '', advanced: '', premium: '' })
  assert.equal(await billing.stripeClient(app.store), null)
  // The webhook is refused at the edition gate before it reads anything.
  const r = await req(jar(), 'POST', '/api/work/stripe/webhook', '{}', { 'stripe-signature': 't=1,v1=x' })
  assert.equal(r.status, 403)
  assert.equal(r.data.stripeDisabled, true)
})

test('the superadmin Stripe billing section is not offered: its API is refused (admin_sections.js)', async () => {
  const r = await req(await superadmin(), 'GET', '/api/work/admin/billing')
  assert.equal(r.status, 403)
  assert.equal(r.data.featureDisabled, true)
})
