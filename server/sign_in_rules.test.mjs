// Sign-in methods by ACCOUNT TYPE, in the `all` edition (where social sign-in
// is on): individuals keep social sign-in; a company account never uses it,
// neither to sign in nor to sign up with an email on a company's SSO domain.
// The edition rule (social routes refused on saas) is in the route-gate tests.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'
import { socialSignInRefusal, socialSignUpRefusal, passwordSignInRefusal, ssoAccountRefusal, COMPANY_SOCIAL_REFUSAL } from './sign_in_rules.js'

const app = await bootEdition('all')
after(app.close)
const { store, req, jar } = app
const { resolveSocialAccount } = await import('./onboarding.js')

test('pure rules', () => {
  assert.equal(socialSignInRefusal({ id: 'u1' }), null)
  assert.equal(socialSignInRefusal({ id: 'u1', companyId: 'co1' }), COMPANY_SOCIAL_REFUSAL)
  assert.equal(socialSignInRefusal({ id: 'u1', ssoEmail: 'a@b.test' }), COMPANY_SOCIAL_REFUSAL)
  assert.equal(socialSignUpRefusal('a@acme.test', (d) => (d === 'acme.test' ? { id: 'co1' } : null)) != null, true)
  assert.equal(socialSignUpRefusal('a@gmail.test', () => null), null)
  assert.equal(passwordSignInRefusal({ companyId: 'co1' }, { ssoRequired: true }).status, 403)
  assert.equal(passwordSignInRefusal({ companyId: 'co1' }, { ssoRequired: false }), null)
  assert.equal(passwordSignInRefusal({}, null), null)
  assert.match(ssoAccountRefusal({ disabled: true }, {}), /turned off/)
  assert.match(ssoAccountRefusal({ scimDeletedAt: 'x' }, {}), /turned off/)
  assert.match(ssoAccountRefusal({}, { disabled: true }), /disabled/)
  assert.equal(ssoAccountRefusal({}, {}), null)
})

test('all edition: social sign-in is offered (routes open)', async () => {
  const r = await req(jar(), 'GET', '/api/work/social/providers')
  assert.equal(r.status, 200)
})

test('an individual with a verified email keeps social sign-in', () => {
  const first = resolveSocialAccount(store, { email: 'solo.person@gmail.test', displayName: 'Solo', provider: 'google' })
  assert.ok(first.user && first.isNew, JSON.stringify(first))
  const again = resolveSocialAccount(store, { email: 'solo.person@gmail.test', displayName: 'Solo', provider: 'google' })
  assert.ok(again.user && !again.isNew)
})

test('a company member (password account with a verified email) is refused social sign-in in every edition', () => {
  const co = store.createCompany({ name: 'Social Block Co', seats: 5 })
  const m = store.createManagedUser({ username: 'compmember1', password: 'Passw0rd!x1', email: 'member1@socialblock.test', companyId: co.id })
  store.markEmailVerified(m.id)
  const r = resolveSocialAccount(store, { email: 'member1@socialblock.test', displayName: 'M', provider: 'google' })
  assert.equal(r.error, COMPANY_SOCIAL_REFUSAL)
  // an individual later moved into a company is a company account from then on
  const solo = resolveSocialAccount(store, { email: 'mover@gmail.test', provider: 'microsoft' }).user
  store.setUserCompany(solo.id, co.id, 'member')
  assert.equal(resolveSocialAccount(store, { email: 'mover@gmail.test', provider: 'microsoft' }).error, COMPANY_SOCIAL_REFUSAL)
})

test('a first-time social sign-up with an email on a company SSO domain is refused and creates nothing', () => {
  const co = store.createCompany({ name: 'Domain Co', seats: 5 })
  store.setCompanySso(co.id, { provider: 'okta', issuer: 'https://domainco.okta.test', clientId: 'cid', clientSecret: 'secret', domain: 'domainco.test' })
  const before = store.listUsers().length
  const r = resolveSocialAccount(store, { email: 'someone@domainco.test', provider: 'google' })
  assert.match(r.error, /single sign-on/)
  assert.equal(store.listUsers().length, before)
})
