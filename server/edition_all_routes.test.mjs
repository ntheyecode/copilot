// The `all` edition (the default, today's product) on the REAL app: nothing the
// edition gates added may refuse anything here. Booted with NO WORK_EDITION at
// all, exactly like `node server/index.js` on the current hosted server.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'
import { INDIVIDUAL_PLAN_ROUTES, COMPANY_ROUTE_PREFIXES } from './edition_route_gates.js'

const app = await bootEdition('', {})
after(app.close)
const { req, jar } = app

test('no config reports the all edition with every capability it had, plus individual_plans', async () => {
  const r = await req(jar(), 'GET', '/api/work/edition')
  assert.equal(r.data.edition, 'all')
  assert.deepEqual(r.data.capabilities, ['solo_signup', 'saas_companies', 'individual_plans', 'stripe_billing', 'platform_ai', 'brain_export', 'brain_query', 'public_site', 'social_login'])
})

test('self sign-up works and the account is offered upgrades as before', async () => {
  const j = jar()
  const r = await req(j, 'POST', '/api/work/signup', { username: 'allsolo', password: 'Str0ng-passw0rd', email: 'allsolo@example.com', name: 'All Solo', acceptTerms: true })
  assert.equal(r.status, 200)
  const me = await req(j, 'GET', '/api/work/me')
  const u = me.data.user || me.data
  assert.equal(u.canUpgrade, true)
  assert.ok(u.nextTier)
})

test('no personal-plan path and no company route meets an edition refusal', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/login', { username: 'allsolo', password: 'Str0ng-passw0rd' })
  for (const [m, p] of INDIVIDUAL_PLAN_ROUTES) {
    const r = await req(j, m, p, { plan: 'basic', kind: 'hours', quantity: 1 })
    assert.notEqual(r.data && r.data.individualPlansDisabled, true, `${m} ${p}`)
  }
  for (const pre of COMPANY_ROUTE_PREFIXES) {
    const p = pre.endsWith('/') ? `${pre}x` : pre
    for (const who of [jar(), j]) {
      const r = await req(who, 'GET', p)
      assert.notEqual(r.data && r.data.companiesDisabled, true, p)
    }
  }
})

test('the lead form still asks for a company', async () => {
  const r = await req(jar(), 'POST', '/api/work/leads', { firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com', phone: '+1 555 0100 222', country: 'United States' })
  assert.equal(r.status, 400)
  assert.match(r.data.error, /company/)
})
