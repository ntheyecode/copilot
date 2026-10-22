// Enterprise licensing + SSO model tests (node:test). Runs against an ISOLATED
// temp data dir so it never touches dev or prod data (WORK_DATA_DIR is set before
// the store is imported). Run: npm test  (or: node --test server/licensing.test.mjs)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

// Isolate the DB to a throwaway temp dir BEFORE importing the store.
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-licensing-'))
process.env.WORK_DATA_DIR = DIR
process.env.WORK_ADMIN_PASSWORD = 'test-admin-pw'
const store = await import('./store.js')

let seq = 0
const uniq = (p) => `${p}-${Date.now()}-${seq++}`
const throws403or400 = (fn) => assert.throws(fn, (e) => e && (e.status === 403 || e.status === 400 || e.status === 409))

test('separate user and admin seat pools, each capped independently', () => {
  const co = store.createCompany({ name: uniq('Acme'), seats: 2, adminSeats: 1, licenseMode: 'locked', ssoProvisioning: 'explicit' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'a@acme.test', companyRole: 'member' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'b@acme.test', companyRole: 'member' })
  // Third member exceeds the 2 user seats.
  throws403or400(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'c@acme.test', companyRole: 'member' }))
  // Admin pool is separate: one admin fits, a second does not.
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'admin1@acme.test', companyRole: 'company_admin' })
  throws403or400(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'admin2@acme.test', companyRole: 'company_admin' }))

  const s = store.companyLicenseSummary(co.id)
  assert.equal(s.userSeats, 2)
  assert.equal(s.adminSeats, 1)
  assert.equal(s.userSeatsUsed, 2)
  assert.equal(s.adminSeatsUsed, 1)
  assert.equal(s.userSeatsLeft, 0)
  assert.equal(s.adminSeatsLeft, 0)
})

test('a user license and an admin license are confirmed by userCanUseService', () => {
  const co = store.createCompany({ name: uniq('Cov'), seats: 1, adminSeats: 1 })
  const m1 = store.addCompanyMemberByEmail({ companyId: co.id, email: 'm1@cov.test', companyRole: 'member' })
  // m1 holds the single user seat.
  assert.equal(store.userCanUseService(m1.id), true)
  const a1 = store.addCompanyMemberByEmail({ companyId: co.id, email: 'a1@cov.test', companyRole: 'company_admin' })
  // a1 holds the single admin seat; it did NOT consume the user seat.
  assert.equal(store.userCanUseService(a1.id), true)
  assert.equal(store.userCanUseService(m1.id), true)
})

test('explicit provisioning refuses unknown emails; known emails resolve', () => {
  const co = store.createCompany({ name: uniq('Explicit'), seats: 0, ssoProvisioning: 'explicit' })
  // Not pre-provisioned -> refused.
  throws403or400(() => store.resolveSsoLogin({ companyId: co.id, email: 'stranger@x.test' }))
  const added = store.addCompanyMemberByEmail({ companyId: co.id, email: 'known@x.test', companyRole: 'member' })
  const resolved = store.resolveSsoLogin({ companyId: co.id, email: 'KNOWN@x.test' }) // case-insensitive
  assert.equal(resolved.id, added.id)
})

test('auto provisioning creates a member on first sign-in', () => {
  const co = store.createCompany({ name: uniq('Auto'), seats: 0, ssoProvisioning: 'auto' })
  const u = store.resolveSsoLogin({ companyId: co.id, email: 'new@auto.test' })
  assert.equal(u.companyId, co.id)
  assert.equal(u.companyRole, 'member')
  assert.equal(u.ssoEmail, 'new@auto.test')
  // Second time returns the same account (no duplicate).
  const again = store.resolveSsoLogin({ companyId: co.id, email: 'new@auto.test' })
  assert.equal(again.id, u.id)
})

test('duplicate email on a company is refused', () => {
  const co = store.createCompany({ name: uniq('Dup'), seats: 0 })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'dup@x.test' })
  throws403or400(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'DUP@x.test' }))
})

test('tier mix is per-user and reported in the summary', () => {
  const co = store.createCompany({ name: uniq('Tiers'), seats: 3 })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'b@t.test', tier: 'basic' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'a@t.test', tier: 'advanced' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'p@t.test', tier: 'premium' })
  const s = store.companyLicenseSummary(co.id)
  assert.equal(s.tiers.basic, 1)
  assert.equal(s.tiers.advanced, 1)
  assert.equal(s.tiers.premium, 1)
})

test('company minute pool: grant, allocate to a user, and visibility', () => {
  const co = store.createCompany({ name: uniq('Pool'), seats: 0 })
  const u = store.addCompanyMemberByEmail({ companyId: co.id, email: 'pool@p.test', tier: 'basic' })
  const g = store.grantCompanyPoolSeconds(co.id, 3600)
  assert.equal(g.poolSeconds, 3600)
  // The user sees the pool in their usage.
  let usage = store.getWorkUsage(u.id)
  assert.equal(usage.poolSeconds, 3600)
  assert.ok(usage.remainingSeconds >= usage.dailySeconds + 3600)
  // Allocate 600s from the pool to the user's own balance.
  const alloc = store.allocateCompanyPoolToUser(co.id, u.id, 600)
  assert.equal(alloc.poolSeconds, 3000)
  usage = store.getWorkUsage(u.id)
  assert.equal(usage.purchasedSeconds, 600)
  // Cannot allocate more than the pool holds.
  throws403or400(() => store.allocateCompanyPoolToUser(co.id, u.id, 999999))
})

test('usage draws free, then the user purchased balance, then the company pool', () => {
  const co = store.createCompany({ name: uniq('Draw'), seats: 0 })
  const u = store.addCompanyMemberByEmail({ companyId: co.id, email: 'draw@d.test', tier: 'basic' })
  store.grantWorkPurchasedSeconds(u.id, 100)
  store.grantCompanyPoolSeconds(co.id, 200)
  const daily = store.workDailyLimit('basic') // 7200
  const total = daily + 100 + 200
  let n = 0
  for (let acc = 0; acc < total; acc += 60) { store.addWorkUsage(u.id, 60); if (++n > 1000) break }
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.usedSeconds, daily)      // free bucket filled exactly to the daily cap
  assert.equal(usage.purchasedSeconds, 0)     // personal balance drained next
  assert.equal(usage.poolSeconds, 0)          // company pool drained last
})

test('SSO provider allowlist accepts standard providers and rejects junk', () => {
  const co = store.createCompany({ name: uniq('Prov'), seats: 0 })
  for (const provider of ['google', 'microsoft', 'okta', 'auth0', 'onelogin', 'ping', 'keycloak', 'cognito', 'oidc']) {
    const r = store.setCompanySso(co.id, { provider, issuer: 'https://idp.example.com', clientId: 'cid', clientSecret: 'sec', domain: 'prov.test' })
    assert.ok(r) // accepted
  }
  throws403or400(() => store.setCompanySso(co.id, { provider: 'frobnicate', issuer: 'https://idp.example.com', clientId: 'cid', clientSecret: 'sec' }))
})

test('license mode and provisioning are stored and returned on the company', () => {
  const co = store.createCompany({ name: uniq('Mode'), seats: 5, adminSeats: 3, licenseMode: 'flexible', ssoProvisioning: 'auto' })
  assert.equal(co.licenseMode, 'flexible')
  assert.equal(co.ssoProvisioning, 'auto')
  assert.equal(co.adminSeats, 3)
  // Defaults when omitted: locked + explicit + 2 admin seats.
  const d = store.createCompany({ name: uniq('Default'), seats: 1 })
  assert.equal(d.licenseMode, 'locked')
  assert.equal(d.ssoProvisioning, 'explicit')
  assert.equal(d.adminSeats, 2)
})

test('per-tier allocation is a hard cap per tier', () => {
  const co = store.createCompany({ name: uniq('ByTier'), seatsByTier: { basic: 1, advanced: 1, premium: 0 }, licenseMode: 'flexible' })
  assert.equal(co.seats, 2)                 // total = sum of the per-tier allocation
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'b1@bt.test', tier: 'basic' })
  // Second basic exceeds the 1 basic license.
  throws403or400(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'b2@bt.test', tier: 'basic' }))
  // Premium has 0 allocated, so none can be assigned.
  throws403or400(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'p1@bt.test', tier: 'premium' }))
  // Advanced has room.
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'a1@bt.test', tier: 'advanced' })
  const s = store.companyLicenseSummary(co.id)
  assert.equal(s.tierUsage.basic.allocated, 1)
  assert.equal(s.tierUsage.basic.used, 1)
  assert.equal(s.tierUsage.basic.left, 0)
  assert.equal(s.tierUsage.premium.allocated, 0)
  assert.equal(s.tierUsage.advanced.used, 1)
})

test('changing a member tier respects the target tier cap', () => {
  const co = store.createCompany({ name: uniq('ReTier'), seatsByTier: { basic: 1, advanced: 1, premium: 0 }, licenseMode: 'flexible' })
  const a = store.addCompanyMemberByEmail({ companyId: co.id, email: 'a@rt.test', tier: 'basic' })
  const b = store.addCompanyMemberByEmail({ companyId: co.id, email: 'b@rt.test', tier: 'advanced' })
  // Move b to basic: basic is held by a (cap 1) -> refused.
  throws403or400(() => store.updateCompanyMember(co.id, b.id, { tier: 'basic' }))
  // Move a to premium: 0 premium licenses -> refused.
  throws403or400(() => store.updateCompanyMember(co.id, a.id, { tier: 'premium' }))
  // Re-saving a's own tier (basic) is fine (its own seat is excluded).
  const same = store.updateCompanyMember(co.id, a.id, { tier: 'basic' })
  assert.equal(same.tier, 'basic')
})

test('promoting a member to admin respects the admin seat pool', () => {
  const co = store.createCompany({ name: uniq('Promote'), seats: 5, adminSeats: 1 })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'admin@pr.test', companyRole: 'company_admin' })
  const m = store.addCompanyMemberByEmail({ companyId: co.id, email: 'member@pr.test', companyRole: 'member' })
  // Admin pool is full (1/1), so promotion is refused.
  throws403or400(() => store.updateCompanyMember(co.id, m.id, { companyRole: 'company_admin' }))
})

test('per-company pricing overrides layer over the global prices', () => {
  const co = store.createCompany({ name: uniq('Price'), seats: 3 })
  store.updateCompany(co.id, { pricing: { hour: { premium: 5 }, plans: { premium: 500 } } })
  const p = store.effectiveCompanyPricing(co.id)
  assert.equal(p.hour.premium, 5)      // overridden
  assert.equal(p.plans.premium, 500)   // overridden
  assert.ok(p.plans.basic > 0)         // global basic retained
  assert.ok(p.hour.basic > 0)
})

test('company billing: computed seat charges plus ledger items', () => {
  const co = store.createCompany({ name: uniq('Bill'), seats: 3 })
  store.updateCompany(co.id, { pricing: { plans: { premium: 400, basic: 100 } } })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'p1@b.test', tier: 'premium' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'p2@b.test', tier: 'premium' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'b1@b.test', tier: 'basic' })
  let bill = store.companyBilling(co.id)
  // Recurring = 2 premium x 400 + 1 basic x 100 = 900.
  assert.equal(bill.recurringTotal, 900)
  assert.equal(bill.extrasTotal, 0)
  assert.equal(bill.total, 900)
  const item = store.addCompanyBillingItem(co.id, { type: 'hours', description: 'Extra 10 hours', qty: 10, unitAmount: 10 })
  assert.equal(item.amount, 100)
  bill = store.companyBilling(co.id)
  assert.equal(bill.extrasTotal, 100)
  assert.equal(bill.total, 1000)
  store.removeCompanyBillingItem(co.id, item.id)
  bill = store.companyBilling(co.id)
  assert.equal(bill.extrasTotal, 0)
  assert.equal(bill.total, 900)
})

test('company profile fields are captured and returned', () => {
  const co = store.createCompany({ name: uniq('Profile'), seats: 1, profile: { contactPerson: 'Pat Lee', email: 'pat@x.test', phone: '+1 555 0100', address: '1 Main St', city: 'Austin', state: 'TX', country: 'USA', postalCode: '78701' } })
  assert.equal(co.profile.contactPerson, 'Pat Lee')
  assert.equal(co.profile.city, 'Austin')
  assert.equal(co.profile.country, 'USA')
  const u = store.updateCompany(co.id, { profile: { phone: '+1 555 0200' } })
  assert.equal(u.profile.phone, '+1 555 0200')
  assert.equal(u.profile.city, 'Austin')   // merge, not replace
})

test('company AI-key requirement: own keys must be set, no silent fallback', () => {
  const co = store.createCompany({ name: uniq('AiReq'), seats: 1 })
  const u = store.addCompanyMemberByEmail({ companyId: co.id, email: 'u@aireq.test' })
  // Not selected yet.
  assert.equal(store.getCompany(co.id).aiReady, false)
  // Choose own keys, none set -> not ready, requirement not satisfied.
  store.setCompanyAiSource(co.id, 'company')
  let req = store.companyAiRequirement(u.id)
  assert.equal(req.source, 'company')
  assert.equal(req.ready, false)
  assert.ok(req.reason && /own AI keys/i.test(req.reason))
  assert.equal(store.getCompany(co.id).aiReady, false)
  // Set the company's own keys -> ready.
  store.setCompanyAiKeys(co.id, { providerId: 'gemini', apiKey: 'test-key-123', chatModel: 'gemini-2.0', visionModel: 'gemini-2.0' }, 'company')
  req = store.companyAiRequirement(u.id)
  assert.equal(req.ready, true)
  assert.equal(store.getCompany(co.id).aiReady, true)
  // Platform source is ready without company keys.
  const co2 = store.createCompany({ name: uniq('AiPlat'), seats: 1 })
  store.setCompanyAiSource(co2.id, 'platform')
  assert.equal(store.getCompany(co2.id).aiReady, true)
})

test.after(() => { try { fs.rmSync(DIR, { recursive: true, force: true }) } catch { /* best effort */ } })
