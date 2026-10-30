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
