// Banked task-credit economy (owner-confirmed): lazy daily accrual with banking,
// consume-on-start (no refund on abandon), insufficient-credit gate, trading
// credits for today-only bonus guidance hours (2 credits -> 1 hour, multiples of
// 2) that expire at ET midnight and never join the persistent purchased pool,
// and corporate accounts staying fully unlimited (no credit accounting).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-credits-'))
process.env.WORK_DATA_DIR = DATA_DIR
process.env.PORT = '0'
const store = await import(storePath)

// Shift a user's accrual clock back by N whole days so lazy accrual catches up
// deterministically (simulates N Eastern days elapsing, no wall-clock wait).
function rewindAccrual(userId, days) {
  const uref = store.getWorkUser(userId)
  const [y, m, d] = String(uref.lastAccrualDay).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - days)
  uref.lastAccrualDay = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
function readDisk() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'db.json'), 'utf8'))
}

test('default earn rates are 1 / 2 / 4 / 6', () => {
  const p = store.getWorkPricing()
  assert.deepEqual(
    { lite: p.tasks.lite, basic: p.tasks.basic, advanced: p.tasks.advanced, premium: p.tasks.premium },
    { lite: 1, basic: 2, advanced: 4, premium: 6 },
  )
})

test('lazy accrual over 7 ET days with 1 use leaves 6 banked (lite, rate 1)', () => {
  const u = store.createWorkUser({ username: 'acc1', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'lite')                  // seeds day-0 credit (balance 1), anchors today
  assert.equal(store.getWorkTaskCredits(u.id).balance, 1)
  rewindAccrual(u.id, 6)                            // simulate 6 more ET days passing
  const c = store.getWorkTaskCredits(u.id)          // catches up: 1 + 6 = 7 earned over 7 days
  assert.equal(c.balance, 7)
  assert.equal(c.dailyRate, 1)
  store.startWorkTask(u.id)                          // consume 1
  assert.equal(store.getWorkTaskCredits(u.id).balance, 6)   // banked
})

test('banking has no cap and accrual is idempotent within a day', () => {
  const u = store.createWorkUser({ username: 'acc2', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium')               // rate 6, seed 6
  rewindAccrual(u.id, 10)                           // 10 days -> +60
  assert.equal(store.getWorkTaskCredits(u.id).balance, 66)   // 6 + 60, no cap
  // Reading again the same day does not accrue more.
  assert.equal(store.getWorkTaskCredits(u.id).balance, 66)
})

test('consume-on-start, and no refund when the task is abandoned/deleted', () => {
  const u = store.createWorkUser({ username: 'noref', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'basic')                 // seed 2
  store.startWorkTask(u.id)                          // -> 1
  const s = store.createWorkSession(u.id, { goal: 'x' })
  assert.equal(store.getWorkTaskCredits(u.id).balance, 1)
  store.deleteWorkSession(u.id, s.id, 'abandoned')
  assert.equal(store.getWorkTaskCredits(u.id).balance, 1)    // not refunded
})

test('insufficient credits gate the start with a clear, actionable 402', () => {
  const u = store.createWorkUser({ username: 'gate', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'lite')                  // seed 1
  store.startWorkTask(u.id)                          // -> 0
  const s = store.createWorkSession(u.id, { goal: 'one' }); store.endWorkSession(u.id, s.id)
  assert.throws(() => store.startWorkTask(u.id), (e) =>
    e.status === 402 && e.taskLimit === true && e.taskCredits === 0 &&
    /out of task credits/i.test(e.message) && /trade 2 credits for 1 bonus hour/i.test(e.message))
})

test('trade 2 credits -> 1 bonus hour: decrements 2, grants today-only bonus minutes', () => {
  const u = store.createWorkUser({ username: 'trade1', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium')               // rate 6, seed 6
  rewindAccrual(u.id, 4); assert.equal(store.getWorkTaskCredits(u.id).balance, 30)  // 6 + 24
  const before = store.getWorkUsage(u.id)
  assert.equal(before.bonusSeconds, 0)
  const r = store.tradeWorkTaskCreditsForHours(u.id, 1)
  assert.equal(r.creditsSpent, 2)
  assert.equal(r.hoursGranted, 1)
  assert.equal(r.creditsPerHour, 2)
  assert.equal(r.taskCredits, 28)                    // 30 - 2
  const after = store.getWorkUsage(u.id)
  assert.equal(after.bonusSeconds, 3600)             // +1h bonus today
  assert.equal(after.freeLeft, before.freeLeft + 3600)   // extends the free daily bucket
  assert.equal(after.purchasedSeconds, before.purchasedSeconds)  // did NOT join the persistent pool
})

test('trade in multiples of 2: 2 hours costs 4 credits', () => {
  const u = store.createWorkUser({ username: 'trade2', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium'); rewindAccrual(u.id, 4)   // balance 30
  const r = store.tradeWorkTaskCreditsForHours(u.id, 2)
  assert.equal(r.creditsSpent, 4)
  assert.equal(r.hoursGranted, 2)
  assert.equal(store.getWorkUsage(u.id).bonusSeconds, 7200)
})

test('bonus minutes expire with the Eastern day and never carry to the persistent pool', () => {
  const u = store.createWorkUser({ username: 'expire', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium'); rewindAccrual(u.id, 4)   // balance 30
  store.tradeWorkTaskCreditsForHours(u.id, 1)
  // The bonus is stored on the Eastern-DAY usage record, so a new ET day reads a
  // fresh record with no bonus. Prove it structurally on disk:
  const disk = readDisk()
  const keys = Object.keys(disk.workUsage || {}).filter((k) => k.startsWith(u.id + ':'))
  assert.equal(keys.length, 1)                        // exactly one day record
  assert.match(keys[0], new RegExp('^' + u.id + ':\\d{4}-\\d{2}-\\d{2}$'))  // date-keyed
  assert.equal(disk.workUsage[keys[0]].bonusSeconds, 3600)
  // The bonus is NEVER written onto the persistent user record (so it cannot carry).
  assert.equal(disk.users.find((x) => x.id === u.id).bonusSeconds, undefined)
  assert.equal(store.getWorkUser(u.id).purchasedSeconds, 0)
})

test('spending minutes draws the bonus from the free bucket, not the purchased pool', () => {
  const u = store.createWorkUser({ username: 'spend', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'lite'); rewindAccrual(u.id, 6)      // balance 7
  store.tradeWorkTaskCreditsForHours(u.id, 1)                   // +3600 bonus, -2 credits -> 5
  const u0 = store.getWorkUsage(u.id)
  store.addWorkUsage(u.id, 60)
  const u1 = store.getWorkUsage(u.id)
  assert.equal(u1.usedSeconds, u0.usedSeconds + 60)             // came out of the free/bonus bucket
  assert.equal(u1.purchasedSeconds, u0.purchasedSeconds)        // purchased untouched
  assert.equal(store.getWorkTaskCredits(u.id).balance, 5)
})

test('trade is rejected when the balance is below the cost (2)', () => {
  const u = store.createWorkUser({ username: 'poor', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'lite')                  // seed 1 (< 2)
  assert.throws(() => store.tradeWorkTaskCreditsForHours(u.id, 1), (e) =>
    e.status === 400 && /need 2 task credits/i.test(e.message) && /You have 1/.test(e.message))
  // Non-integer / zero / negative hours rejected too.
  assert.throws(() => store.tradeWorkTaskCreditsForHours(u.id, 0), (e) => e.status === 400)
  assert.throws(() => store.tradeWorkTaskCreditsForHours(u.id, 1.5), (e) => e.status === 400)
})

test('the trade is recorded in the admin-action audit (single sink)', () => {
  const u = store.createWorkUser({ username: 'audit', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'premium'); rewindAccrual(u.id, 4)
  store.tradeWorkTaskCreditsForHours(u.id, 1)
  const acts = store.listAdminActions({ limit: 50 })
  const mine = acts.find((a) => a.userId === u.id && a.action === 'credit_trade')
  assert.ok(mine, 'trade should appear in the admin-action audit')
  assert.match(mine.detail, /2 task credits -> 1h/)
})

test('usage + credits summary expose taskCredits and the earn rate for the UI', () => {
  const u = store.createWorkUser({ username: 'uishape', password: 'Passw0rd!x' })
  store.setWorkTier(u.id, 'advanced')              // rate 4, seed 4
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.tasks.taskCredits, 4)
  assert.equal(usage.tasks.dailyRate, 4)
  assert.equal(usage.tasks.remaining, 4)
  assert.equal(usage.tasks.unlimited, false)
  const sum = store.getWorkCreditsSummary(u.id)
  assert.equal(sum.taskCredits, 4)
  assert.equal(sum.dailyRate, 4)
  assert.equal(sum.monthlyRate, 120)               // 4 x 30, derivable client-side
  assert.equal(sum.creditsPerHour, 2)
})

test('corporate users are unlimited: no accrual, no balance, trade refused', () => {
  const co = store.createCompany ? store.createCompany({ name: 'Acme2', plan: 'premium' }) : null
  if (!co) return
  const m = store.createManagedUser({ username: 'corp2', password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.getWorkTaskCredits(m.id), null)
  const usage = store.getWorkTaskUsage(m.id)
  assert.equal(usage.unlimited, true)
  assert.equal(usage.taskCredits, undefined)
  const sum = store.getWorkCreditsSummary(m.id)
  assert.equal(sum.unlimited, true)
  assert.equal(sum.taskCredits, null)
  assert.throws(() => store.tradeWorkTaskCreditsForHours(m.id, 1), (e) => e.status === 400)
  // Starting many tasks never gates and never creates a balance.
  for (let i = 0; i < 5; i++) { store.startWorkTask(m.id); const s = store.createWorkSession(m.id, { goal: 't' + i }); store.endWorkSession(m.id, s.id) }
  assert.equal(store.getWorkTaskCredits(m.id), null)
})
