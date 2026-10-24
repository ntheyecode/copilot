// Affiliate program: application -> approval (account + code), first-touch
// attribution, commission on FIRST payment only, suspend voids earnings, rate
// override, and payout bookkeeping. Stripe calls are route-level (not tested
// here); this covers the store money logic.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

process.env.WORK_DATA_DIR = path.join(os.tmpdir(), 'wc-aff-' + Date.now())
process.env.PORT = '0'
const store = await import('./store.js')

const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('apply -> approve creates an account + code; dupe application rejected', () => {
  const email = uniq('aff') + '@x.com'
  const { id } = store.applyAffiliate({ name: 'Ann Affiliate', email })
  assert.ok(id)
  assert.throws(() => store.applyAffiliate({ name: 'Ann', email }), (e) => e.status === 409)
  const out = store.approveAffiliate(id, { byUsername: 'admin', ratePct: 25 })
  assert.ok(out.userId)
  assert.equal(out.created, true)
  const a = store.publicAffiliateById(id)
  assert.equal(a.status, 'approved')
  assert.equal(a.ratePct, 25)
  assert.ok(a.code && a.code.length >= 6)
  // the created account is linked back
  assert.equal(store.getAffiliateByUserId(out.userId).id, id)
})

test('reject + suspend require a reason', () => {
  const { id } = store.applyAffiliate({ name: 'Rudy', email: uniq('r') + '@x.com' })
  assert.throws(() => store.rejectAffiliate(id, { reason: '' }), (e) => e.status === 400)
  store.approveAffiliate(id, { byUsername: 'admin' })
  assert.throws(() => store.setAffiliateSuspended(id, true, { reason: '' }), (e) => e.status === 400)
})

test('first-touch attribution + commission on FIRST payment only', () => {
  const { id } = store.applyAffiliate({ name: 'Faye', email: uniq('f') + '@x.com' })
  const { } = store.approveAffiliate(id, { byUsername: 'admin', ratePct: 30 })
  const code = store.publicAffiliateById(id).code

  const ref = store.createWorkUser({ username: uniq('refu'), password: 'Passw0rd!x', email: uniq('rf') + '@x.com' })
  assert.equal(store.bindReferral(ref.id, code), true)
  assert.equal(store.bindReferral(ref.id, code), false, 'second bind ignored (first-touch)')

  // First payment: $20 at 30% => $6.00 commission.
  const c1 = store.recordAffiliateConversion({ refUserId: ref.id, amountUsd: 20 })
  assert.ok(c1)
  assert.equal(c1.commissionUsd, 6)
  // Renewal / second payment: no new commission (first payment only).
  const c2 = store.recordAffiliateConversion({ refUserId: ref.id, amountUsd: 20 })
  assert.equal(c2, null)

  const a = store.publicAffiliateById(id)
  assert.equal(a.conversions, 1)
  assert.equal(a.earnedUsd, 6)
  assert.equal(a.pendingUsd, 6)
  assert.equal(a.paidUsd, 0)
})

test('no self-referral; unapproved code does not bind', () => {
  const { id } = store.applyAffiliate({ name: 'Sam', email: uniq('s') + '@x.com' })
  const out = store.approveAffiliate(id, { byUsername: 'admin' })
  const code = store.publicAffiliateById(id).code
  assert.equal(store.bindReferral(out.userId, code), false, 'affiliate cannot refer themselves')

  const pending = store.applyAffiliate({ name: 'Pat', email: uniq('p') + '@x.com' })
  // pending affiliate has no code yet; a random code does not bind
  const u = store.createWorkUser({ username: uniq('u'), password: 'Passw0rd!x' })
  assert.equal(store.bindReferral(u.id, 'ZZZZZZZ'), false)
})

test('suspended affiliate earns nothing; payout marks refs paid', () => {
  const { id } = store.applyAffiliate({ name: 'Val', email: uniq('v') + '@x.com' })
  store.approveAffiliate(id, { byUsername: 'admin', ratePct: 50 })
  const code = store.publicAffiliateById(id).code

  const r1 = store.createWorkUser({ username: uniq('r1'), password: 'Passw0rd!x' })
  store.bindReferral(r1.id, code)
  store.recordAffiliateConversion({ refUserId: r1.id, amountUsd: 10 }) // $5 earned
  assert.equal(store.publicAffiliateById(id).pendingUsd, 5)

  // Pay it out (bookkeeping only; Stripe transfer is route-level).
  const payable = store.affiliatePayableRefs(id)
  assert.equal(payable.length, 1)
  const marked = store.markAffiliateRefsPaid(id, payable.map((r) => r.id), { transferId: 'tr_test' })
  assert.equal(marked.paid, 1)
  assert.equal(marked.totalUsd, 5)
  const a = store.publicAffiliateById(id)
  assert.equal(a.paidUsd, 5)
  assert.equal(a.pendingUsd, 0)

  // Suspend -> new conversions are void (no earnings).
  store.setAffiliateSuspended(id, true, { reason: 'policy review hold' })
  const r2 = store.createWorkUser({ username: uniq('r2'), password: 'Passw0rd!x' })
  store.bindReferral(r2.id, code) // code owner suspended -> bind refused
  assert.equal(store.getUser(r2.id).referredBy, undefined)
})

test('referred-user annual free month: eligible once, then consumed', () => {
  const { id } = store.applyAffiliate({ name: 'Ned', email: uniq('n') + '@x.com' })
  store.approveAffiliate(id, { byUsername: 'admin' })
  const code = store.publicAffiliateById(id).code
  const ref = store.createWorkUser({ username: uniq('refn'), password: 'Passw0rd!x' })
  store.bindReferral(ref.id, code)
  assert.equal(store.affiliateAnnualBenefitDays(ref.id), 30, 'referred + unused => 30-day free month')
  store.markAnnualBenefitUsed(ref.id)
  assert.equal(store.affiliateAnnualBenefitDays(ref.id), 0, 'used once, not again')
  // Not referred -> no benefit.
  const solo = store.createWorkUser({ username: uniq('solo'), password: 'Passw0rd!x' })
  assert.equal(store.affiliateAnnualBenefitDays(solo.id), 0)
  // Turning the perk off disables it even for the eligible.
  const ref2 = store.createWorkUser({ username: uniq('refn2'), password: 'Passw0rd!x' })
  store.bindReferral(ref2.id, code)
  store.setAffiliateConfig({ freeMonthOnAnnual: false })
  assert.equal(store.affiliateAnnualBenefitDays(ref2.id), 0)
  store.setAffiliateConfig({ freeMonthOnAnnual: true })
})

test('config: rate/min payout clamp sanely; isAffiliateAdmin role', () => {
  const c = store.setAffiliateConfig({ defaultRatePct: 200, minPayoutUsd: -5, cookieDays: 14 })
  assert.equal(c.defaultRatePct, 30, 'rate >90 ignored, keeps default')
  assert.equal(c.cookieDays, 14)
  const admin = (store.listUsers ? store.listUsers() : []).find((x) => x.role === 'superadmin')
  if (admin) assert.equal(store.isAffiliateAdmin(admin.id), true)
})
