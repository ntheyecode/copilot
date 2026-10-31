// The `paid` edition (paying individuals, no company tenants) on the REAL app:
// self sign-up still works, company creation is refused, Stripe stays on.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

const app = await bootEdition('paid')
after(app.close)
const { req, jar, superadmin } = app

test('self sign-up is allowed', async () => {
  const r = await req(jar(), 'POST', '/api/work/signup', { username: 'payer1', password: 'Str0ng-passw0rd', email: 'payer1@example.com', name: 'Payer One', acceptTerms: true })
  assert.equal(r.status, 200)
  assert.ok(app.store.findUserByLogin('payer1@example.com') || app.store.findUser('payer1'))
})

test('company creation is refused with 403 and creates nothing', async () => {
  const r = await req(await superadmin(), 'POST', '/api/work/admin/companies', { name: 'Not Here', plan: 'basic', seats: 3 })
  assert.equal(r.status, 403)
  assert.equal(r.data.companiesDisabled, true)
  assert.equal(app.store.listCompanies().length, 0)
})

test('the billing panel carries no Stripe-off flag', async () => {
  const r = await req(await superadmin(), 'GET', '/api/work/admin/billing')
  assert.equal(r.status, 200)
  assert.equal(r.data.offByEdition, undefined)
})

// ---- individuals only: every company route family is refused ------------------
const COMPANY_PATHS = [
  ['GET', '/api/work/company/users'], ['POST', '/api/work/company/users', { username: 'x' }], ['GET', '/api/work/company/api-keys'],
  ['POST', '/api/work/company/webhooks', {}], ['GET', '/api/work/company/sso'], ['GET', '/api/work/team/pool'],
  ['POST', '/api/work/team/allocation', {}], ['GET', '/api/work/my-company'], ['GET', '/api/work/exec/overview'],
  ['GET', '/api/work/pm/projects'], ['GET', '/api/work/grc/risks'], ['POST', '/api/work/brain/query', { q: 'x' }],
  ['POST', '/api/work/brain/export', {}], ['GET', '/api/work/workflows'], ['POST', '/api/work/workflows', {}],
  ['GET', '/api/work/workflow-incidents'], ['GET', '/api/work/templates'], ['GET', '/api/work/kb-spaces'],
  ['POST', '/api/work/launch/redeem', { token: 'x' }], ['GET', '/api/work/sso/resolve?domain=example.com'],
  ['GET', '/api/v1/openapi.json'], ['GET', '/api/work/my/assigned'], ['GET', '/api/work/customers'],
  ['GET', '/api/work/Company/users'], ['GET', '/api/V1/openapi.json'], ['GET', '/api/work/My-Company'],
]

test('every company route family is refused with neutral wording, signed in or not', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/signup', { username: 'payer2', password: 'Str0ng-passw0rd', email: 'payer2@example.com', name: 'Payer Two', acceptTerms: true })
  for (const [m, p, body] of COMPANY_PATHS) {
    for (const who of [jar(), j]) {
      const r = await req(who, m, p, body)
      assert.equal(r.status, 403, `${m} ${p}`)
      assert.equal(r.data.companiesDisabled, true, `${m} ${p}`)
      assert.doesNotMatch(r.data.error, /compan|team|enterprise|organi[sz]ation/i)
    }
  }
})

test('personal routes and personal-plan purchase are never refused by the edition', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/login', { username: 'payer2', password: 'Str0ng-passw0rd' })
  for (const p of ['/api/work/me', '/api/work/subscription', '/api/work/projects', '/api/work/policy', '/api/work/pricing']) {
    const r = await req(j, 'GET', p)
    assert.notEqual(r.data && r.data.companiesDisabled, true, p)
  }
  // Checkout reaches billing (Stripe is not configured in the test, so 503), never an edition 403.
  const c = await req(j, 'POST', '/api/work/checkout', { plan: 'basic' })
  assert.notEqual(c.data && c.data.individualPlansDisabled, true)
  assert.equal(c.status, 503)
})

test('the lead form does not ask an individual for a company', async () => {
  const r = await req(jar(), 'POST', '/api/work/leads', { firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com', phone: '+1 555 0100 222', country: 'United States' })
  assert.notEqual(r.status, 400, JSON.stringify(r.data))
})

test('paid_only: with Stripe not configured, guiding does not start for free', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/login', { username: 'payer2', password: 'Str0ng-passw0rd' })
  await req(j, 'POST', '/api/work/legal/accept', {})
  const r = await req(j, 'POST', '/api/work/sessions', { goal: 'Set up a firewall rule' })
  assert.equal(r.status, 503, JSON.stringify(r.data))
  assert.equal(r.data.billingNotConfigured, true)
})
