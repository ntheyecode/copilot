// Plan allowance (owner, 2026-10-27): every plan includes MONTHLY hours that
// renew on the 1st (ET) with a superadmin-set month-end policy, and a plain
// per-day task cap (4 / 4 / 6 / 8). No banked task credits, no earning, no
// trading hours for tasks. Buying hours grants hours only. Phrased as the
// business rules, so the suite protects the rules, not the implementation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-plan-'))
process.env.WORK_DATA_DIR = DATA_DIR
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)
const person = (tier) => { const u = store.createWorkUser({ username: uniq(tier), password: 'Passw0rd!x' }); store.setWorkTier(u.id, tier); return u }

test('plans include monthly hours and a per-day task cap: 30/60/120/180 h and 4/4/6/8 tasks', () => {
  const p = store.getWorkPricing()
  assert.deepEqual(p.hoursMonthly, { lite: 30, basic: 60, advanced: 120, premium: 180 })
  assert.deepEqual(p.tasks, { lite: 4, basic: 4, advanced: 6, premium: 8 })
  assert.deepEqual(p.hoursExpiry, { mode: 'forfeit', carryCapHours: null })
  assert.equal('dailyHours' in p, false)             // the per-day bucket is gone
  assert.equal('tasksPerExtraHour' in p, false)      // and so is the bonus-credit rate
})

test('a new person gets the full monthly pool at once, and usage says when it renews', () => {
  const u = person('basic')
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.plan.hoursMonthly, 60)
  assert.equal(usage.plan.poolSeconds, 60 * 3600)
  assert.equal(usage.plan.usedMonthSeconds, 0)
  assert.equal(usage.remainingSeconds, 60 * 3600)
  assert.equal(usage.freeLeft, 60 * 3600)            // included time left (the heartbeat client reads this)
  assert.equal(usage.dailySeconds, null)             // nothing resets daily any more
  assert.match(usage.renewsAt, /^\d{4}-\d{2}-01$/)   // the 1st of next month, for locale-aware display
  assert.match(usage.resetLabel, /^[A-Z][a-z]{2} 1$/) // "Nov 1"
  assert.equal(usage.plan.expiry.mode, 'forfeit')
})

test('guided time draws the plan pool first, then purchased hours, and "used today" counts both', () => {
  store.setWorkPricing({ hoursMonthly: { lite: 0.05 } })   // 180 s pool keeps the test short
  const u = person('lite')
  store.grantWorkPurchasedSeconds(u.id, 100)
  for (let i = 0; i < 4; i++) store.addWorkUsage(u.id, 60) // asks for 240 s
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.plan.poolSeconds, 0)             // 180 s of plan time gone first
  assert.equal(usage.purchasedSeconds, 40)            // then 60 s of the 100 purchased
  assert.equal(usage.usedSeconds, 240)
  assert.equal(usage.plan.usedMonthSeconds, 240)
  assert.equal(usage.remainingSeconds, 40)
  store.setWorkPricing({ hoursMonthly: { lite: 30 } })
})

test('purchased hours never expire and buying them grants hours only (no task bonus)', () => {
  const u = person('basic')
  const before = store.getWorkTaskUsage(u.id)
  store.grantWorkPurchasedSeconds(u.id, 3600)
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.purchasedSeconds, 3600)
  assert.equal(usage.remainingSeconds, 60 * 3600 + 3600)
  assert.deepEqual(store.getWorkTaskUsage(u.id).remaining, before.remaining)
  assert.equal(typeof store.grantTaskCreditsForPurchasedHours, 'undefined')
})

test('a superadmin change to a plan monthly hours reaches an existing pool at once, as a delta', () => {
  const u = person('advanced')
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 120 * 3600)
  store.addWorkUsage(u.id, 60)
  store.setWorkPricing({ hoursMonthly: { advanced: 125 } })
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 125 * 3600 - 60)   // +5 h on the live pool, consumption kept
  store.setWorkPricing({ hoursMonthly: { advanced: 1 } })
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 3600 - 60)          // a cut applies too, never below zero
  store.setWorkPricing({ hoursMonthly: { advanced: 120 } })
})

test('upgrading mid-month adds the difference between the plans to the live pool', () => {
  const u = person('basic')
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 60 * 3600)
  store.setWorkTier(u.id, 'premium')
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.plan.hoursMonthly, 180)
  assert.equal(usage.plan.poolSeconds, 180 * 3600)
})

test('month end: forfeit starts the new month at exactly one grant', () => {
  const u = person('basic')
  const raw = store.getWorkUser(u.id)
  store.getWorkUsage(u.id)
  raw.plan.poolPeriodKey = '2024-01'; raw.plan.poolSeconds = 12345   // a stale month with leftover hours
  const usage = store.getWorkUsage(u.id)
  assert.equal(usage.plan.poolSeconds, 60 * 3600)
  assert.match(usage.plan.periodKey, /^\d{4}-\d{2}$/)
  assert.notEqual(usage.plan.periodKey, '2024-01')
})

test('month end: carry forward keeps the leftover, up to the superadmin cap', () => {
  store.setWorkPricing({ hoursExpiry: { mode: 'carryforward', carryCapHours: 70 } })
  const u = person('basic')
  const raw = store.getWorkUser(u.id)
  store.getWorkUsage(u.id)
  // Last month ended with 15 h unused: 15 + 60 = 75 h, capped at 70 h.
  const prev = (() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` })()
  raw.plan.poolPeriodKey = prev; raw.plan.poolSeconds = 15 * 3600
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 70 * 3600)
  store.setWorkPricing({ hoursExpiry: { mode: 'forfeit' } })
})

test('tasks: 4 a day on lite and basic, 6 on advanced, 8 on premium', () => {
  for (const [tier, cap] of [['lite', 4], ['basic', 4], ['advanced', 6], ['premium', 8]]) {
    const u = person(tier)
    const t = store.getWorkTaskUsage(u.id)
    assert.equal(t.unlimited, false)
    assert.equal(t.cap, cap, tier)
    assert.equal(t.usedToday, 0)
    assert.equal(t.remaining, cap)
    assert.equal('taskCredits' in t, false)
  }
})

test('the start after the day cap is refused with a 402 that says when new tasks open', () => {
  const u = person('lite')
  for (let i = 0; i < 4; i++) {
    const r = store.startWorkTask(u.id)
    assert.equal(r.cap, 4); assert.equal(r.usedToday, i + 1); assert.equal(r.remaining, 3 - i)
  }
  assert.throws(() => store.startWorkTask(u.id), (e) => e.status === 402 && e.taskLimit === true && e.cap === 4 && e.window === 'day' && /11:59 PM/.test(e.resetLabel) && /upgrade/i.test(e.message))
  const t = store.getWorkTaskUsage(u.id)
  assert.equal(t.usedToday, 4); assert.equal(t.remaining, 0)
})

test('a started task counts even if it is abandoned (no refund), and a running task blocks a second start', () => {
  const u = person('basic')
  store.startWorkTask(u.id)
  const s = store.createWorkSession(u.id, { goal: 'Reconcile the October ledger', app: 'Spreadsheet' })
  assert.throws(() => store.startWorkTask(u.id), (e) => e.status === 409 && e.mustCompleteCurrent === true)
  store.deleteWorkSession(u.id, s.id, 'abandoned in test')   // destructive actions carry a reason
  assert.equal(store.getWorkTaskUsage(u.id).usedToday, 1)
})

test('company members stay unlimited on tasks; a pool-based company draws nothing from a plan pool', () => {
  const co = store.createCompany({ name: uniq('PlanCo'), plan: 'advanced', seats: 5 })
  const m = store.createManagedUser({ username: uniq('m'), password: 'Passw0rd!x', companyId: co.id, tier: 'advanced' })
  assert.equal(store.getWorkTaskUsage(m.id).unlimited, true)
  assert.equal(store.workDailyTaskLimit(m.id), Infinity)
  // Seat-based: the seat carries the plan's monthly pool.
  assert.equal(store.getWorkUsage(m.id).plan.hoursMonthly, 120)
  // Pool-based (AdmireVeda sets a company pool): the company pool is the only budget.
  store.setCompanyEnterprise(co.id, { poolHours: 10 })
  const usage = store.getWorkUsage(m.id)
  assert.equal(usage.plan, null)
  assert.equal(usage.planSeconds, 0)
  assert.equal(usage.poolSeconds, 10 * 3600)
})

test('the credit economy is gone from the store: no trade, no balance, no legacy pricing keys', () => {
  assert.equal(typeof store.tradeWorkTaskCreditsForHours, 'undefined')
  assert.equal(typeof store.getWorkTaskCredits, 'undefined')
  assert.equal(typeof store.getWorkCreditsSummary, 'undefined')
  assert.throws(() => store.setWorkPricing({ dailyHours: { lite: 1 } }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasksPerExtraHour: 2 }), (e) => e.status === 400)
})
