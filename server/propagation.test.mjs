// "Deliver what we promise": superadmin changes propagate downstream live.
// Daily included hours per tier read from pricing (not a hardcoded constant),
// and daily task caps already do; a disabled account/company loses service.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

process.env.WORK_DATA_DIR = path.join(os.tmpdir(), 'wc-prop-' + Date.now())
process.env.PORT = '0'
const store = await import('./store.js')
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('changing a tier daily hours in pricing reflects in workDailyLimit + usage', () => {
  const u = store.createWorkUser({ username: uniq('hrs'), password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'advanced')
  // Default advanced = 4h.
  assert.equal(store.workDailyLimit('advanced'), 4 * 3600)
  assert.equal(store.getWorkUsage(u.id).dailySeconds, 4 * 3600)
  // Superadmin raises advanced to 5.5 hours -> reflects immediately everywhere.
  store.setWorkPricing({ dailyHours: { advanced: 5.5 } })
  assert.equal(store.workDailyLimit('advanced'), Math.round(5.5 * 3600))
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.dailySeconds, Math.round(5.5 * 3600))
  assert.equal(usage.remainingSeconds, Math.round(5.5 * 3600), 'fresh day: full new bucket available')
  // Out-of-range rejected, leaving the value unchanged.
  assert.throws(() => store.setWorkPricing({ dailyHours: { advanced: 99 } }), (e) => e.status === 400)
  assert.equal(store.workDailyLimit('advanced'), Math.round(5.5 * 3600))
})

test('changing a tier daily task cap in pricing reflects in workDailyTaskLimit', () => {
  const u = store.createWorkUser({ username: uniq('tsk'), password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'basic')
  assert.equal(store.workDailyTaskLimit(u.id), 4)       // default
  store.setWorkPricing({ tasks: { basic: 7 } })
  assert.equal(store.workDailyTaskLimit(u.id), 7)       // reflects live
})

test('disabling an account removes service access (userCanUseService)', () => {
  const u = store.createWorkUser({ username: uniq('dis'), password: 'Passw0rd!x' })
  store.setSubscription(u.id, { status: 'active', plan: 'basic' })
  assert.equal(store.userCanUseService(u.id), true)
  store.setUserDisabled(u.id, true, { reason: 'blocked by superadmin' })
  assert.equal(store.userCanUseService(u.id), false)
  assert.equal(store.publicWorkUser(store.getUser(u.id)).disabled, true)
})

test('free images-per-day reads live pricing; tier feature gates are single-source', () => {
  const u = store.createWorkUser({ username: uniq('img'), password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium')
  assert.equal(store.getWorkImageUsage(u.id).dailyCap, 5)      // default
  store.setWorkPricing({ imagesPerDay: { premium: 9 } })
  assert.equal(store.getWorkImageUsage(u.id).dailyCap, 9)      // reflects live
  // Feature registry is the one source for gates (documents + images).
  assert.equal(store.tierAllows('premium', 'images'), true)
  assert.equal(store.tierAllows('basic', 'images'), false)
  assert.equal(store.tierAllows('basic', 'documents'), false)
  assert.equal(store.tierAllows('advanced', 'documents'), true)
})

test('disabling a company removes service access for its members', () => {
  const co = store.createCompany({ name: uniq('PropCo'), plan: 'premium', seats: 0 })
  const m = store.createManagedUser({ username: uniq('cm'), password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.userCanUseService(m.id), true)
  store.setCompanyDisabled(co.id, true, { reason: 'company suspended' })
  assert.equal(store.userCanUseService(m.id), false)
  assert.equal(store.getCompany(co.id).disabled, true)
})
