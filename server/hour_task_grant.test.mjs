// Buying extra hours grants bonus task credits: tasksPerExtraHour (default 1) per
// hour, the SAME for every tier, superadmin-editable, tied to the real purchase
// (grantTaskCreditsForPurchasedHours), corporate = unlimited (no grant). This is
// the store-level contract that billing.js drives on an extra-hours purchase.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-hourtask-'))
process.env.PORT = '0'
const store = await import(storePath)

const mk = (tier) => { const u = store.createWorkUser({ username: 'ht_' + tier + Math.random().toString(36).slice(2, 7), password: 'Passw0rd!x' }); store.setWorkTier(u.id, tier); return u }

test('default rate is 1 task per extra hour', () => {
  assert.equal(store.getWorkPricing().tasksPerExtraHour, 1)
})

test('buying N hours grants N task credits at the default rate, for every tier', () => {
  for (const tier of ['lite', 'basic', 'advanced', 'premium']) {
    const u = mk(tier)
    const before = store.getWorkTaskCredits(u.id).balance
    const granted = store.grantTaskCreditsForPurchasedHours(u.id, 3)   // 3 hours
    assert.equal(granted, 3, `${tier}: 3 hours -> 3 tasks at rate 1`)
    assert.equal(store.getWorkTaskCredits(u.id).balance, before + 3, `${tier}: balance increased by 3`)
  }
})

test('superadmin can change the rate and the grant reflects it immediately', () => {
  store.setWorkPricing({ tasksPerExtraHour: 2 })
  assert.equal(store.getWorkPricing().tasksPerExtraHour, 2)
  const u = mk('basic')
  const before = store.getWorkTaskCredits(u.id).balance
  const granted = store.grantTaskCreditsForPurchasedHours(u.id, 4)     // 4 hours * 2
  assert.equal(granted, 8)
  assert.equal(store.getWorkTaskCredits(u.id).balance, before + 8)
  store.setWorkPricing({ tasksPerExtraHour: 1 })                        // restore for other tests
})

test('rate 0 disables the bonus (no credits granted)', () => {
  store.setWorkPricing({ tasksPerExtraHour: 0 })
  const u = mk('premium')
  const before = store.getWorkTaskCredits(u.id).balance
  assert.equal(store.grantTaskCreditsForPurchasedHours(u.id, 5), 0)
  assert.equal(store.getWorkTaskCredits(u.id).balance, before)
  store.setWorkPricing({ tasksPerExtraHour: 1 })
})

test('invalid rates are rejected', () => {
  assert.throws(() => store.setWorkPricing({ tasksPerExtraHour: -1 }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasksPerExtraHour: 2.5 }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasksPerExtraHour: 101 }), (e) => e.status === 400)
  assert.equal(store.getWorkPricing().tasksPerExtraHour, 1)             // unchanged after rejects
})

test('corporate (company) accounts get no bonus - they are unlimited', () => {
  if (!store.createCompany) return
  const co = store.createCompany({ name: 'HT Corp', plan: 'premium' })
  const m = store.createManagedUser({ username: 'ht_corp' + Math.random().toString(36).slice(2, 6), password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.getWorkTaskCredits(m.id), null)                    // no credit accounting
  assert.equal(store.grantTaskCreditsForPurchasedHours(m.id, 10), 0)    // grant is a no-op
})

test('zero or negative hours grant nothing', () => {
  const u = mk('advanced')
  assert.equal(store.grantTaskCreditsForPurchasedHours(u.id, 0), 0)
  assert.equal(store.grantTaskCreditsForPurchasedHours(u.id, -3), 0)
})
