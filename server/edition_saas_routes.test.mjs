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
