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

// ===========================================================================
// Security + correctness audit regressions (2026-10-22). Each test pins a
// defect that was found and fixed; if it fails, the defect is back.
// ===========================================================================
const { buildCompanyInvoice, money } = await import('./company_invoice.js')
const status = (fn, code) => assert.throws(fn, (e) => { assert.equal(e && e.status, code, `expected HTTP ${code}, got ${e && e.status}: ${e && e.message}`); return true })

test('tenant isolation: a company admin cannot touch a user in another company', () => {
  const a = store.createCompany({ name: uniq('IsoA'), seats: 0, licenseMode: 'flexible' })
  const b = store.createCompany({ name: uniq('IsoB'), seats: 0, licenseMode: 'flexible' })
  const victim = store.addCompanyMemberByEmail({ companyId: b.id, email: 'victim@isob.test', tier: 'basic' })
  store.grantCompanyPoolSeconds(a.id, 3600)
  // Every store mutation that takes the ADMIN's company id refuses a target elsewhere.
  status(() => store.updateCompanyMember(a.id, victim.id, { tier: 'premium' }), 404)
  status(() => store.updateCompanyMember(a.id, victim.id, { companyRole: 'company_admin' }), 404)
  status(() => store.removeCompanyMember(a.id, victim.id), 404)
  status(() => store.allocateCompanyPoolToUser(a.id, victim.id, 600), 404)
  // Nothing changed on the victim.
  const v = store.getWorkUser(victim.id)
  assert.equal(v.companyId, b.id)
  assert.equal(v.companyRole, 'member')
  assert.equal(v.tier, 'basic')
  assert.equal(v.purchasedSeconds, 0)
  assert.equal(store.companyLicenseSummary(a.id).poolSeconds, 3600)
  // No company in scope is refused outright.
  status(() => store.updateCompanyMember(null, victim.id, { tier: 'premium' }), 403)
  status(() => store.removeCompanyMember(undefined, victim.id), 403)
})

test('seat caps apply to the username+password path too (no bypass by entry point)', () => {
  const co = store.createCompany({ name: uniq('PwCap'), seats: 1, adminSeats: 1, licenseMode: 'flexible' })
  store.createManagedUser({ username: uniq('pw1'), password: 'secret1', companyId: co.id, companyRole: 'member' })
  const before = store.listCompanyUsers(co.id).length
  const strayName = uniq('pw2')
  status(() => store.createManagedUser({ username: strayName, password: 'secret1', companyId: co.id, companyRole: 'member' }), 403)
  // The refused add left NO stray account behind.
  assert.equal(store.findUser(strayName), null)
  assert.equal(store.listCompanyUsers(co.id).length, before)
  // Admin pool is enforced on this path as well.
  store.createManagedUser({ username: uniq('pwadm1'), password: 'secret1', companyId: co.id, companyRole: 'company_admin' })
  status(() => store.createManagedUser({ username: uniq('pwadm2'), password: 'secret1', companyId: co.id, companyRole: 'company_admin' }), 403)
})

test('seat caps apply when a superadmin moves a user into a company or sets a tier', () => {
  const co = store.createCompany({ name: uniq('MoveCap'), seatsByTier: { basic: 1, advanced: 0, premium: 0 } })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'first@movecap.test', tier: 'basic' })
  const loose = store.createWorkUser({ username: uniq('loose'), password: 'secret1' })
  // The one basic license is taken, so moving a basic user in is refused.
  status(() => store.setUserCompany(loose.id, co.id, 'member'), 403)
  assert.equal(store.getWorkUser(loose.id).companyId, undefined)
  // The superadmin tier route respects the per-tier allocation (0 premium bought).
  const m = store.listCompanyUsers(co.id)[0]
  status(() => store.setWorkTier(m.id, 'premium'), 403)
  assert.equal(store.getWorkTier(m.id), 'basic')
  // Re-saving the same tier is fine (own seat excluded).
  store.setWorkTier(m.id, 'basic')
})

test('auto provisioning only admits emails on the company sign-in domain', () => {
  const co = store.createCompany({ name: uniq('AutoDom'), seats: 0, ssoProvisioning: 'auto' })
  store.setCompanySso(co.id, { provider: 'google', issuer: 'https://accounts.google.com', clientId: 'cid', clientSecret: 'sec', domain: 'autodom.test' })
  // Google's issuer is shared by every tenant: a random gmail account must NOT be created.
  status(() => store.resolveSsoLogin({ companyId: co.id, email: 'attacker@gmail.com' }), 403)
  assert.equal(store.listCompanyUsers(co.id).length, 0)
  // A subdomain is not the domain either.
  status(() => store.resolveSsoLogin({ companyId: co.id, email: 'x@evil.autodom.test' }), 403)
  // The company's own domain is admitted (case-insensitive).
  const ok = store.resolveSsoLogin({ companyId: co.id, email: 'Pat@AutoDom.test' })
  assert.equal(ok.ssoEmail, 'pat@autodom.test')
  // A pre-provisioned address off-domain still signs in (explicit allowlist wins).
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'contractor@other.test' })
  assert.ok(store.resolveSsoLogin({ companyId: co.id, email: 'contractor@other.test' }))
})

test('an SSO sign-in domain belongs to exactly one company', () => {
  const a = store.createCompany({ name: uniq('DomA'), seats: 0 })
  const b = store.createCompany({ name: uniq('DomB'), seats: 0 })
  const dom = `${uniq('claim').replace(/[^a-z0-9]/gi, '').toLowerCase()}.test`
  store.setCompanySso(a.id, { provider: 'okta', issuer: 'https://a.okta.com', clientId: 'cid', clientSecret: 'sec', domain: dom })
  // Another tenant cannot claim it (would hijack sign-ins typed on the login page).
  status(() => store.setCompanySso(b.id, { provider: 'okta', issuer: 'https://b.okta.com', clientId: 'cid', clientSecret: 'sec', domain: dom.toUpperCase() }), 409)
  assert.equal(store.findCompanyBySsoDomain(dom).id, a.id)
  // The owner can re-save its own config with the same domain.
  assert.ok(store.setCompanySso(a.id, { provider: 'okta', issuer: 'https://a.okta.com', clientId: 'cid2', clientSecret: '', domain: dom }))
  // Garbage domains are refused; the raw sso patch cannot bypass validation.
  status(() => store.setCompanySso(b.id, { provider: 'okta', issuer: 'https://b.okta.com', clientId: 'cid', clientSecret: 'sec', domain: 'https://not a domain' }), 400)
  status(() => store.updateCompany(b.id, { sso: { connected: true, issuer: 'http://evil', domain: dom } }), 400)
  assert.equal(store.getCompany(b.id).sso, null)
  // Disconnecting through the patch is still allowed.
  store.updateCompany(a.id, { sso: null })
  assert.equal(store.getCompany(a.id).sso, null)
})

test('seat counts reject negative / non-numeric input and clamp fractions and huge values', () => {
  status(() => store.createCompany({ name: uniq('NegSeats'), seats: -5 }), 400)
  status(() => store.createCompany({ name: uniq('NanSeats'), seats: 'abc' }), 400)
  status(() => store.createCompany({ name: uniq('NegAdmin'), adminSeats: -1 }), 400)
  status(() => store.createCompany({ name: uniq('NegTier'), seatsByTier: { basic: -1 } }), 400)
  status(() => store.createCompany({ name: uniq('InfSeats'), adminSeats: Infinity }), 400)
  const co = store.createCompany({ name: uniq('Frac'), seats: 2.9, adminSeats: 1e300 })
  assert.equal(co.seats, 2)
  assert.equal(co.adminSeats, 1000000)   // capped, finite, JSON-safe
  status(() => store.updateCompany(co.id, { seats: -1 }), 400)
  status(() => store.updateCompany(co.id, { adminSeats: NaN }), 400)
  // A refused patch applies NOTHING (name unchanged even though it came first).
  const nm = co.name
  status(() => store.updateCompany(co.id, { name: uniq('Renamed'), seats: -1 }), 400)
  assert.equal(store.getCompany(co.id).name, nm)
})

test('an explicit all-zero per-tier allocation means no user licenses, not the old pool', () => {
  const co = store.createCompany({ name: uniq('Zero'), seatsByTier: { basic: 2, advanced: 0, premium: 0 } })
  store.updateCompany(co.id, { seatsByTier: { basic: 0, advanced: 0, premium: 0 } })
  const c = store.getCompany(co.id)
  assert.deepEqual(c.seatsByTier, { basic: 0, advanced: 0, premium: 0 })
  assert.equal(c.seats, 0)
  status(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'nobody@zero.test', tier: 'basic' }), 403)
  // Clearing the allocation entirely (null) returns to the single total pool.
  store.updateCompany(co.id, { seatsByTier: null, seats: 3 })
  assert.equal(store.getCompany(co.id).seatsByTier, null)
  assert.equal(store.getCompany(co.id).seats, 3)
  // A total (single-pool) company cannot take a single total while per-tier is set.
  status(() => store.updateCompany(co.id, { seatsByTier: { basic: 1, advanced: 0, premium: 0 }, seats: 9 }), 400)
})

test('a total-pool company that round-trips the zero-prefilled license form keeps its pool (no lockout)', () => {
  // Reviewer-found regression: the superadmin "Edit licenses" form prefills zeros
  // for a total-pool company and sends them back on an admin-seat-only change.
  const co = store.createCompany({ name: uniq('RoundTrip'), seats: 5, adminSeats: 1 })
  const m = store.addCompanyMemberByEmail({ companyId: co.id, email: 'm@roundtrip.test' })
  store.updateCompany(co.id, { seatsByTier: { basic: 0, advanced: 0, premium: 0 }, adminSeats: 3 })
  const c = store.getCompany(co.id)
  assert.equal(c.seatsByTier, null)
  assert.equal(c.seats, 5)
  assert.equal(c.adminSeats, 3)
  assert.equal(store.userCanUseService(m.id), true)
  // An unlimited total-pool company stays unlimited too.
  const open = store.createCompany({ name: uniq('OpenPool'), seats: 0 })
  const om = store.addCompanyMemberByEmail({ companyId: open.id, email: 'o@openpool.test' })
  store.updateCompany(open.id, { seatsByTier: { basic: 0, advanced: 0, premium: 0 } })
  assert.equal(store.getCompany(open.id).seatsByTier, null)
  assert.equal(store.userCanUseService(om.id), true)
})

test('an explicit AI source choice supersedes the pre-keys memory on clear', () => {
  const co = store.createCompany({ name: uniq('AiPin'), seats: 1 })
  store.setCompanyAiKeys(co.id, { providerId: 'openai', apiKey: 'k' }, 'company')   // source was null -> remembered null
  store.setCompanyAiSource(co.id, 'company')                                           // operator pins company keys explicitly
  store.setCompanyAiKeys(co.id, { apiKey: '' }, 'company')
  assert.equal(store.getCompany(co.id).aiSource, 'company')   // the pin survives; not reset to "not selected"
  assert.equal(store.getCompany(co.id).aiReady, false)
})

test('per-tier coverage: lowering an allocation under usage unlicenses the newest member of that tier only', () => {
  const co = store.createCompany({ name: uniq('Lower'), seatsByTier: { basic: 2, advanced: 1, premium: 0 } })
  const b1 = store.addCompanyMemberByEmail({ companyId: co.id, email: 'b1@lower.test', tier: 'basic' })
  const b2 = store.addCompanyMemberByEmail({ companyId: co.id, email: 'b2@lower.test', tier: 'basic' })
  const a1 = store.addCompanyMemberByEmail({ companyId: co.id, email: 'a1@lower.test', tier: 'advanced' })
  store.updateCompany(co.id, { seatsByTier: { basic: 1, advanced: 1, premium: 0 } })
  assert.equal(store.userCanUseService(b1.id), true)    // oldest basic keeps the one license
  assert.equal(store.userCanUseService(b2.id), false)   // over the basic allocation
  assert.equal(store.userCanUseService(a1.id), true)    // advanced untouched (total pool would have covered b2 wrongly)
  const s = store.companyLicenseSummary(co.id)
  assert.equal(s.members.find((m) => m.id === b2.id).licensed, false)
  assert.equal(s.tierUsage.basic.used, 2)
  assert.equal(s.tierUsage.basic.allocated, 1)
})

test('role and plan inputs are strict: a typo never silently demotes or defaults', () => {
  const co = store.createCompany({ name: uniq('Strict'), seats: 0, adminSeats: 0, licenseMode: 'flexible' })
  const adm = store.addCompanyMemberByEmail({ companyId: co.id, email: 'adm@strict.test', companyRole: 'company_admin' })
  status(() => store.updateCompanyMember(co.id, adm.id, { companyRole: 'admin' }), 400)
  assert.equal(store.getWorkUser(adm.id).companyRole, 'company_admin')   // NOT demoted
  status(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'x@strict.test', companyRole: 'owner' }), 400)
  status(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'y@strict.test', tier: 'platinum' }), 400)
  status(() => store.createManagedUser({ username: uniq('s'), password: 'secret1', companyId: co.id, companyRole: 'root' }), 400)
  status(() => store.createCompany({ name: uniq('BadMode'), licenseMode: 'flexable' }), 400)
  status(() => store.createCompany({ name: uniq('BadProv'), ssoProvisioning: 'anyone' }), 400)
  status(() => store.createCompany({ name: uniq('BadPlan'), plan: 'gold' }), 400)
  status(() => store.updateCompany(co.id, { licenseMode: 'open' }), 400)
  status(() => store.setCompanyAiSource(co.id, 'cloud'), 400)
  assert.equal(store.getCompany(co.id).licenseMode, 'flexible')
  // Company names: capped and unique on rename too.
  status(() => store.createCompany({ name: 'x'.repeat(121) }), 400)
  const other = store.createCompany({ name: uniq('Other'), seats: 0 })
  status(() => store.updateCompany(other.id, { name: co.name }), 409)
})

test('work emails are validated, normalized and length-capped', () => {
  const co = store.createCompany({ name: uniq('Mail'), seats: 0 })
  for (const bad of ['nope', 'a@b', 'a b@c.test', '@c.test', 'a@@c.test', `${'a'.repeat(70)}@c.test`, `a@${'b'.repeat(250)}.test`]) {
    status(() => store.addCompanyMemberByEmail({ companyId: co.id, email: bad }), 400)
  }
  const u = store.addCompanyMemberByEmail({ companyId: co.id, email: '  Alex.Morgan@Acme.TEST ' })
  assert.equal(u.email, 'alex.morgan@acme.test')
  status(() => store.addCompanyMemberByEmail({ companyId: co.id, email: 'alex.morgan@acme.test' }), 409)
  status(() => store.resolveSsoLogin({ companyId: co.id, email: 'not-an-email' }), 400)
})

test('ledger items reject NaN / Infinity and need a description; totals stay finite', () => {
  const co = store.createCompany({ name: uniq('Ledger'), seats: 0 })
  status(() => store.addCompanyBillingItem(co.id, { description: 'x', amount: 'abc' }), 400)
  status(() => store.addCompanyBillingItem(co.id, { description: 'x', qty: Infinity, unitAmount: 1 }), 400)
  status(() => store.addCompanyBillingItem(co.id, { description: 'x', qty: -1, unitAmount: 1 }), 400)
  status(() => store.addCompanyBillingItem(co.id, { description: 'x', unitAmount: 1e12 }), 400)
  status(() => store.addCompanyBillingItem(co.id, { description: '   ', amount: 5 }), 400)
  const credit = store.addCompanyBillingItem(co.id, { type: 'credit', description: 'Goodwill credit', amount: -25.5 })
  assert.equal(credit.amount, -25.5)
  const bill = store.companyBilling(co.id)
  assert.equal(bill.extrasTotal, -25.5)
  assert.ok(Number.isFinite(bill.total))
  assert.equal(JSON.stringify(bill).includes('null'), false)
})

test('admin seats are billed at their plan tier (no free premium via self-upgrade)', () => {
  const co = store.createCompany({ name: uniq('AdmBill'), seats: 5, adminSeats: 2, licenseMode: 'flexible' })
  store.updateCompany(co.id, { pricing: { plans: { basic: 100, premium: 400 } } })
  const adm = store.addCompanyMemberByEmail({ companyId: co.id, email: 'adm@admbill.test', companyRole: 'company_admin', tier: 'basic' })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'm@admbill.test', tier: 'basic' })
  let bill = store.companyBilling(co.id)
  assert.equal(bill.recurringTotal, 200)                       // 1 basic member + 1 basic admin
  // The admin raises their own plan: the statement reflects it.
  store.updateCompanyMember(co.id, adm.id, { tier: 'premium' })
  bill = store.companyBilling(co.id)
  const admLine = bill.seatLines.find((l) => l.type === 'admin_seats')
  assert.equal(admLine.tier, 'premium')
  assert.equal(admLine.amount, 400)
  assert.equal(bill.recurringTotal, 500)
})

test('clearing company AI keys restores the recorded prior source and never silently switches', () => {
  // Operator chose platform; company admin adds own keys, then removes them -> back to platform.
  const a = store.createCompany({ name: uniq('AiRestoreP'), seats: 1 })
  store.setCompanyAiSource(a.id, 'platform')
  store.setCompanyAiKeys(a.id, { providerId: 'openai', apiKey: 'k1' }, 'company')
  assert.equal(store.getCompany(a.id).aiSource, 'company')
  store.setCompanyAiKeys(a.id, { apiKey: '' }, 'company')
  assert.equal(store.getCompany(a.id).aiSource, 'platform')
  assert.equal(store.getCompany(a.id).aiReady, true)
  // Operator chose company keys explicitly; clearing keeps 'company' and reports NOT ready.
  const b = store.createCompany({ name: uniq('AiRestoreC'), seats: 1 })
  const u = store.addCompanyMemberByEmail({ companyId: b.id, email: 'u@airestorec.test' })
  store.setCompanyAiSource(b.id, 'company')
  store.setCompanyAiKeys(b.id, { providerId: 'openai', apiKey: 'k2' }, 'company')
  store.setCompanyAiKeys(b.id, { apiKey: '' }, 'company')
  assert.equal(store.getCompany(b.id).aiSource, 'company')
  assert.equal(store.getCompany(b.id).aiReady, false)
  assert.equal(store.companyAiRequirement(u.id).ready, false)
  assert.equal(store.getCompanyRuntime(u.id), null)
  // Keys are never returned in full.
  store.setCompanyAiKeys(b.id, { providerId: 'openai', apiKey: 'sk-live-verysecret-9876' }, 'company')
  const pub = JSON.stringify(store.getCompany(b.id))
  assert.equal(pub.includes('sk-live-verysecret-9876'), false)
  assert.ok(pub.includes('9876'))   // masked tail only
})

test('global pricing writes are validated (no "abc" priced at $0, no negatives, no junk keys)', () => {
  const before = store.getWorkPricing()
  status(() => store.setWorkPricing({ plans: { basic: 'abc' } }), 400)
  status(() => store.setWorkPricing({ hour: { premium: -3 } }), 400)
  status(() => store.setWorkPricing({ currency: 'dollars' }), 400)
  assert.deepEqual(store.getWorkPricing(), before)
  const after = store.setWorkPricing({ plans: { basic: 120, bogus: 1 }, currency: 'USD' })
  assert.equal(after.plans.basic, 120)
  assert.equal(after.plans.bogus, undefined)
  assert.equal(after.currency, 'usd')
  store.setWorkPricing({ plans: { basic: before.plans.basic } })
})

test('pool minutes reject non-numeric input', () => {
  const co = store.createCompany({ name: uniq('PoolNaN'), seats: 0 })
  status(() => store.grantCompanyPoolSeconds(co.id, NaN), 400)
  status(() => store.grantCompanyPoolSeconds(co.id, Infinity), 400)
  assert.equal(store.companyLicenseSummary(co.id).poolSeconds, 0)
})

test('invoice PDF: long text wraps, long ledgers paginate, money is formatted', async () => {
  assert.equal(money('usd', 1234567.891), '$1,234,567.89')
  assert.equal(money('usd', -5), '-$5.00')
  assert.equal(money('eur', 10), '10.00 EUR')
  assert.equal(money('usd', NaN), '$0.00')
  assert.equal(money('usd', Infinity), '$0.00')
  const co = store.createCompany({
    name: uniq('Inv ' + 'Very Long Company Name '.repeat(4)),
    seats: 0,
    profile: { contactPerson: 'P'.repeat(120), address: '1 ' + 'Long Street Name '.repeat(10), city: 'Austin', state: 'TX', country: 'USA', postalCode: '78701', email: 'bill@inv.test' },
  })
  store.addCompanyMemberByEmail({ companyId: co.id, email: 'm@inv.test', tier: 'premium' })
  for (let i = 0; i < 80; i++) store.addCompanyBillingItem(co.id, { description: `Line ${i} ${'with a very long description that must wrap onto more than one line '.repeat(i % 3)}`, qty: 1, unitAmount: 12.5 })
  const statement = store.companyBilling(co.id)
  const render = (st) => new Promise((resolve, reject) => {
    const chunks = []
    const doc = buildCompanyInvoice(st)
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve({ buf: Buffer.concat(chunks), pages: doc.pageCount }))
    doc.on('error', reject)
  })
  store.addCompanyBillingItem(co.id, { description: 'Large one-off onboarding fee', amount: 1234567.89 })
  const big = await render(store.companyBilling(co.id))
  assert.ok(big.buf.length > 1000)
  assert.ok(big.buf.subarray(0, 5).toString() === '%PDF-')
  assert.ok(big.pages >= 3, `expected a multi-page statement, got ${big.pages}`)
  // Text extraction proves pagination and that large amounts are never split
  // mid-number ("$1,234,567.8" / "9" was the defect) and the footer paginates.
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: big.buf })
  const parsed = await parser.getText()
  await (parser.destroy ? parser.destroy() : null)
  const text = parsed.text || ''
  assert.ok(text.includes('$1,234,567.89'), 'large amount intact')
  assert.ok(text.includes(`Page 1 of ${big.pages}`) && text.includes(`Page ${big.pages} of ${big.pages}`), 'page footer on first and last page')
  assert.ok(text.includes('Premium plan seats'))
  const lastPage = (parsed.pages && parsed.pages.length) ? parsed.pages[parsed.pages.length - 1].text : text
  assert.ok(/\bTotal\b/.test(lastPage), 'totals land on the last page')
  // Degenerate inputs never throw.
  const empty = await render({ companyId: co.id, name: '', profile: null, seatLines: null, ledger: null, generatedAt: 'not a date', recurringTotal: NaN, extrasTotal: null, total: undefined })
  assert.equal(empty.pages, 1)
})

test.after(() => { try { fs.rmSync(DIR, { recursive: true, force: true }) } catch { /* best effort */ } })
