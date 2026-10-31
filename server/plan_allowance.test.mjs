// Plan allowance (owner, 2026-10-27): every plan includes MONTHLY hours that
// renew on the 1st (ET) with a superadmin-set month-end policy. There is NO
// per-day task cap: hours are the only usage limit, and a person may keep up to
// WORK_MAX_OPEN_TASKS (4) tasks open at once. Monthly hours and the extra-hour
// rate are dynamic per tier (superadmin-editable). Buying hours grants hours
// only. Phrased as the business rules, so the suite protects the rules.
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

test('plans include monthly hours and an extra-hour rate per tier (dynamic), and NO per-day task cap', () => {
  const p = store.getWorkPricing()
  assert.deepEqual(p.hoursMonthly, { lite: 30, basic: 60, advanced: 120, premium: 180 })
  assert.deepEqual(p.hour, { lite: 25, basic: 20, advanced: 15, premium: 10 })   // extra-hour rate per tier, superadmin-editable
  assert.deepEqual(p.hoursExpiry, { mode: 'forfeit', carryCapHours: null })
  assert.equal('tasks' in p, false)                  // the per-day task cap is retired
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
  // Day 1 first: on the 31st, "one month back" would otherwise overflow into this month.
  const prev = (() => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` })()
  raw.plan.poolPeriodKey = prev; raw.plan.poolSeconds = 15 * 3600
  assert.equal(store.getWorkUsage(u.id).plan.poolSeconds, 70 * 3600)
  store.setWorkPricing({ hoursExpiry: { mode: 'forfeit' } })
})

test('open-task slots: Lite/Basic/Advanced capped at 4; Premium is unlimited', () => {
  for (const tier of ['lite', 'basic', 'advanced']) {
    const u = person(tier)
    const t = store.getWorkTaskUsage(u.id)
    assert.equal(t.unlimited, false)
    assert.equal(t.maxOpen, 4, tier)
    assert.equal(t.open, 0)
    assert.equal(t.remaining, 4)
    assert.equal('cap' in t, false)        // the old daily cap is gone
    assert.equal('usedToday' in t, false)
  }
  // Premium = Depth-2 / Projects -> UNLIMITED concurrent tasks (a project runs many).
  const p = person('premium')
  const tp = store.getWorkTaskUsage(p.id)
  assert.equal(tp.unlimited, true)
  assert.equal(tp.maxOpen, null)
})

test('Premium can open more than 4 tasks at once (no tooManyOpen 409)', () => {
  const u = person('premium')
  const sessions = []
  for (let i = 0; i < 6; i++) {
    store.startWorkTask(u.id)                                      // never refused for premium
    sessions.push(store.createWorkSession(u.id, { goal: `Proj task ${i}`, app: 'App' }))
  }
  const t = store.getWorkTaskUsage(u.id)
  assert.equal(t.open, 6)
  assert.equal(t.unlimited, true)
  const r = store.startWorkTask(u.id)
  assert.equal(r.unlimited, true)
  assert.equal(r.maxOpen, null)
})

test('out of guided hours is a 402 (hours are the only usage limit, no daily cap)', () => {
  store.setWorkPricing({ hoursMonthly: { lite: 0.05 } })   // 180 s pool, small on purpose
  const u = person('lite')
  // addWorkUsage records a bounded tick per call, so drain the pool in steps.
  for (let i = 0; i < 20 && !store.getWorkUsage(u.id).exhausted; i++) store.addWorkUsage(u.id, 60)
  assert.equal(store.getWorkUsage(u.id).exhausted, true)
  assert.throws(() => store.startWorkTask(u.id), (e) => e.status === 402 && e.outOfHours === true && /add hours|renew/i.test(e.message))
  store.setWorkPricing({ hoursMonthly: { lite: 30 } })      // restore for other tests
})

test('up to 4 tasks open at once; the 5th start is refused with a 409 until one is finished', () => {
  const u = person('basic')
  const sessions = []
  for (let i = 0; i < 4; i++) {
    store.startWorkTask(u.id)                               // gate passes (fewer than 4 open)
    sessions.push(store.createWorkSession(u.id, { goal: `Ledger ${i}`, app: 'Spreadsheet' }))
  }
  assert.equal(store.getWorkTaskUsage(u.id).open, 4)
  assert.equal(store.getWorkTaskUsage(u.id).remaining, 0)
  assert.throws(() => store.startWorkTask(u.id), (e) => e.status === 409 && e.tooManyOpen === true && e.maxOpen === 4 && e.open === 4)
  store.deleteWorkSession(u.id, sessions[0].id, 'done in test')   // finishing one frees a slot
  assert.equal(store.getWorkTaskUsage(u.id).open, 3)
  const r = store.startWorkTask(u.id)
  assert.equal(r.unlimited, false); assert.equal(r.maxOpen, 4)
})

test('company members stay unlimited on tasks; a pool-based company draws nothing from a plan pool', () => {
  const co = store.createCompany({ name: uniq('PlanCo'), plan: 'advanced', seats: 5 })
  const m = store.createManagedUser({ username: uniq('m'), password: 'Passw0rd!x', companyId: co.id, tier: 'advanced' })
  assert.equal(store.getWorkTaskUsage(m.id).unlimited, true)
  assert.equal(store.workMaxOpenTasks(m.id), Infinity)
  // Seat-based: the seat carries the plan's monthly pool.
  assert.equal(store.getWorkUsage(m.id).plan.hoursMonthly, 120)
  // Pool-based (AdmireVeda sets a company pool): the company pool is the only budget.
  store.setCompanyEnterprise(co.id, { poolHours: 10 })
  const usage = store.getWorkUsage(m.id)
  assert.equal(usage.plan, null)
  assert.equal(usage.planSeconds, 0)
  assert.equal(usage.poolSeconds, 10 * 3600)
})

test('usage history lists the last N days with seconds consumed and tasks started, oldest first', () => {
  const u = person('basic')
  for (let i = 0; i < 3; i++) store.addWorkUsage(u.id, 60)
  store.startWorkTask(u.id)
  const h = store.getWorkUsageHistory(u.id, 14).days
  assert.equal(h.length, 14)
  assert.match(h[0].day, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(h[0].day < h[13].day)
  assert.deepEqual({ seconds: h[13].seconds, tasks: h[13].tasks }, { seconds: 180, tasks: 1 })   // today is last
  assert.equal(h[12].seconds, 0)
})

test('the credit economy is gone from the store: no trade, no balance, no legacy pricing keys', () => {
  assert.equal(typeof store.tradeWorkTaskCreditsForHours, 'undefined')
  assert.equal(typeof store.getWorkTaskCredits, 'undefined')
  assert.equal(typeof store.getWorkCreditsSummary, 'undefined')
  assert.throws(() => store.setWorkPricing({ dailyHours: { lite: 1 } }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasksPerExtraHour: 2 }), (e) => e.status === 400)
})
