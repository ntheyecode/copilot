// The `saas` edition (companies only) on the REAL app: no self sign-up on any
// path, companies are still created freely, Stripe stays available.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'

// Dynamic imports only AFTER bootEdition: a static import is hoisted and would
// load edition.js before WORK_EDITION is set.
const app = await bootEdition('saas')
const { resolveSocialAccount } = await import('./onboarding.js')
after(app.close)
const { req, jar, superadmin, store } = app

test('GET /api/work/edition reports saas and its capabilities', async () => {
  const r = await req(jar(), 'GET', '/api/work/edition')
  assert.equal(r.status, 200)
  assert.equal(r.data.edition, 'saas')
  assert.ok(r.data.capabilities.includes('saas_companies'))
  assert.ok(!r.data.capabilities.includes('solo_signup'))
})

test('classic sign-up is refused with an actionable message and creates nothing', async () => {
  const before = store.listUsers().length
  const r = await req(jar(), 'POST', '/api/work/signup', { username: 'solo1', password: 'Str0ng-passw0rd', email: 'solo1@example.com', name: 'Solo One', acceptTerms: true })
  assert.equal(r.status, 403)
  assert.equal(r.data.signupDisabled, true)
  assert.match(r.data.error, /company administrator/)
  assert.equal(store.listUsers().length, before)
})

test('subscribe onboarding sign-up is refused the same way', async () => {
  const before = store.listUsers().length
  const r = await req(jar(), 'POST', '/api/work/onboarding/signup', { email: 'solo2@example.com', password: 'Str0ng-passw0rd', acceptTerms: true })
  assert.equal(r.status, 403)
  assert.equal(r.data.signupDisabled, true)
  assert.equal(store.listUsers().length, before)
})

test('a first-time social sign-in does not create an account; an existing one still resolves', () => {
  const refused = resolveSocialAccount(store, { email: 'newsocial@example.com', displayName: 'New', provider: 'google' })
  assert.match(refused.error || '', /company administrator/)
  assert.equal(store.findUserByLogin('newsocial@example.com'), null)
  // An account that already exists (created by an admin, email verified) signs in.
  const u = store.createSocialUser({ email: 'existing@example.com', displayName: 'Existing', provider: 'google' })
  const ok = resolveSocialAccount(store, { email: 'existing@example.com', displayName: 'Existing', provider: 'google' })
  assert.equal(ok.user && ok.user.id, u.id)
  assert.equal(ok.isNew, false)
})

test('the superadmin can create more than one company', async () => {
  const j = await superadmin()
  for (const name of ['Contoso One', 'Contoso Two']) {
    const r = await req(j, 'POST', '/api/work/admin/companies', { name, plan: 'basic', seats: 5 })
    assert.equal(r.status, 200, `${name} is created`)
  }
})

// ---- organizations only: no personal plan is sold on any path ----------------
const PLAN_PATHS = [
  ['POST', '/api/work/checkout', { plan: 'basic' }],
  ['POST', '/api/work/checkout/credits', { kind: 'hours', quantity: 1 }],
  ['POST', '/api/work/subscription/change', { plan: 'premium' }],
  ['POST', '/api/work/onboarding/plan', { plan: 'basic' }],
  ['POST', '/api/work/onboarding/checkout', { plan: 'basic' }],
]

test('every personal-plan purchase path is refused with an actionable "talk to us" message', async () => {
  // A standalone account (created by the superadmin by hand) signed in.
  store.createWorkUser({ username: 'standalone1', password: 'Str0ng-passw0rd', email: 'standalone1@example.com' })
  const j = jar()
  const login = await req(j, 'POST', '/api/work/login', { username: 'standalone1', password: 'Str0ng-passw0rd' })
  assert.equal(login.status, 200)
  for (const [m, p, body] of PLAN_PATHS) {
    for (const who of [jar(), j]) {
      const r = await req(who, m, p, body)
      assert.equal(r.status, 403, `${m} ${p}`)
      assert.equal(r.data.individualPlansDisabled, true, `${m} ${p}`)
      assert.match(r.data.error, /organizations/)
      assert.equal(r.data.contact, '/workcopilot/contact')
    }
  }
  // Changed letter case reaches the same handler in Express, so it meets the same refusal.
  for (const [m, p, body] of [['POST', '/api/work/Checkout/Credits', { kind: 'hours', quantity: 1 }], ['POST', '/API/work/subscription/change', { plan: 'premium' }]]) {
    const r = await req(j, m, p, body)
    assert.equal(r.status, 403, p)
    assert.equal(r.data.individualPlansDisabled, true, p)
  }
  // Reading what the account already has is never refused.
  assert.equal((await req(j, 'GET', '/api/work/subscription')).status, 200)
  assert.equal((await req(j, 'GET', '/api/work/invoices')).data.individualPlansDisabled, undefined)
})

test('the app never offers an upgrade to a personal plan', async () => {
  const j = jar()
  await req(j, 'POST', '/api/work/login', { username: 'standalone1', password: 'Str0ng-passw0rd' })
  const me = await req(j, 'GET', '/api/work/me')
  assert.equal(me.status, 200)
  const u = me.data.user || me.data
  assert.equal(u.canUpgrade, false)
  assert.equal(u.nextTier, null)
})

test('sign-up refusals say who it is for and where to go', async () => {
  const r = await req(jar(), 'POST', '/api/work/signup', { username: 'solo9', password: 'Str0ng-passw0rd', email: 'solo9@example.com', name: 'Solo Nine', acceptTerms: true })
  assert.match(r.data.error, /for organizations/)
  assert.equal(r.data.contact, '/workcopilot/contact')
})

test('company routes stay open (reach their own auth, never the edition refusal)', async () => {
  for (const p of ['/api/work/team/pool', '/api/work/company/users', '/api/work/brain/inventory', '/api/work/exec/overview', '/api/work/my-company']) {
    const r = await req(jar(), 'GET', p)
    assert.notEqual(r.data && r.data.companiesDisabled, true, p)
  }
})
