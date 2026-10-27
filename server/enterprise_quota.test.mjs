// Pure enterprise-quota math: timezone date keys, settings validation, the
// monthly-pool ROLLOVER (forfeit vs carryforward, catch-up, cap), the effective
// per-user allocation merge, and the ceiling/consumption math. These are the
// authoritative tests for the pool math + month-end expiry + ceiling rules
// (store.js delegates every decision here), so they run without a server.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as eq from './enterprise_quota.js'

const ET = 'America/New_York'

test('tz day/month/week keys are civil dates in the company zone', () => {
  const t = Date.parse('2026-03-16T15:00:00Z')   // a Monday
  assert.equal(eq.tzDayKey(ET, t), '2026-03-16')
  assert.equal(eq.tzMonthKey(ET, t), '2026-03')
  assert.equal(eq.tzWeekKey(ET, t), '2026-03-16')               // Monday itself
  // A Wednesday rolls back to the same Monday.
  assert.equal(eq.tzWeekKey(ET, Date.parse('2026-03-18T15:00:00Z')), '2026-03-16')
  // A Sunday belongs to the week that STARTED the prior Monday.
  assert.equal(eq.tzWeekKey(ET, Date.parse('2026-03-22T15:00:00Z')), '2026-03-16')
  assert.equal(eq.weekKeyOfDayKey('2026-03-18'), '2026-03-16')
})

test('the usage day flips at 23:59 local (mirrors the ET reset)', () => {
  // 2026-03-16 23:59 ET == 2026-03-17 03:59 UTC -> already the next usage day.
  assert.equal(eq.tzDayKey(ET, Date.parse('2026-03-17T03:59:00Z')), '2026-03-17')
  assert.equal(eq.tzDayKey(ET, Date.parse('2026-03-17T03:58:00Z')), '2026-03-16')
})

test('defaultAllocGroup maps the fixed company role', () => {
  assert.equal(eq.defaultAllocGroup('company_admin'), 'admin')
  assert.equal(eq.defaultAllocGroup('executive'), 'supervisor')
  assert.equal(eq.defaultAllocGroup('member'), 'member')
  assert.equal(eq.defaultAllocGroup(null), 'member')
})

test('normalizeEnterprise validates and converts; no silent fallback', () => {
  const e = eq.normalizeEnterprise({ poolHours: 1000, monthEnd: 'carryforward', timezone: 'Europe/London', overageUsdPerHour: 12.5, notifyPct: 80, stripeEnabled: true }, null)
  assert.equal(e.poolMonthlySeconds, 1000 * 3600)
  assert.equal(e.monthEnd, 'carryforward')
  assert.equal(e.timezone, 'Europe/London')
  assert.equal(e.overageUsdPerHour, 12.5)
  assert.equal(e.notifyPct, 80)
  assert.equal(e.stripeEnabled, true)
  assert.equal(e.requestsEnabled, true)             // default preserved
  assert.throws(() => eq.normalizeEnterprise({ monthEnd: 'keep' }), /forfeit or carryforward/)
  assert.throws(() => eq.normalizeEnterprise({ timezone: 'Mars/Phobos' }), /time zone/)
  assert.throws(() => eq.normalizeEnterprise({ notifyPct: 0 }), /between 1 and 100/)
})

test('normalizeEnterprise defaults preserve pre-feature behavior', () => {
  const d = eq.enterpriseDefaults()
  assert.equal(d.poolMonthlySeconds, 0)
  assert.equal(d.monthEnd, 'forfeit')
  assert.equal(d.stripeEnabled, false)               // NO Stripe for companies by default
  assert.equal(d.taskPolicy.mode, 'unlimited')
  assert.equal(d.timezone, 'America/New_York')
})

test('task policy + group ceilings normalize (hours -> seconds, 0 is kept)', () => {
  const e = eq.normalizeEnterprise({
    taskPolicy: { mode: 'limited', day: 5, week: 20, month: null },
    groups: { member: { hours: { day: 2, week: null, month: 40 }, tasks: { day: 3 } }, supervisor: { hours: { day: 0 } } },
  }, null)
  assert.equal(e.taskPolicy.mode, 'limited')
  assert.equal(e.taskPolicy.day, 5)
  assert.equal(e.taskPolicy.month, null)
  assert.equal(e.groups.member.hours.day, 2 * 3600)
  assert.equal(e.groups.member.hours.week, null)
  assert.equal(e.groups.member.tasks.day, 3)
  assert.equal(e.groups.supervisor.hours.day, 0)     // a real 0-hour cap, not dropped
})

// ---- Monthly pool ROLLOVER (forfeit vs carryforward) ----------------------
test('first read seeds one monthly grant', () => {
  const now = Date.parse('2026-03-15T12:00:00Z')
  const r = eq.rolloverPool({ poolSeconds: 0, poolPeriodKey: null, poolMonthlySeconds: 100 * 3600, monthEnd: 'forfeit' }, ET, now)
  assert.equal(r.rolled, true)
  assert.equal(r.poolPeriodKey, '2026-03')
  assert.equal(r.poolSeconds, 100 * 3600)
})

test('same month does not roll', () => {
  const now = Date.parse('2026-03-20T12:00:00Z')
  const r = eq.rolloverPool({ poolSeconds: 42 * 3600, poolPeriodKey: '2026-03', poolMonthlySeconds: 100 * 3600, monthEnd: 'forfeit' }, ET, now)
  assert.equal(r.rolled, false)
  assert.equal(r.poolSeconds, 42 * 3600)
})

test('FORFEIT: a new month resets unused pool to one grant', () => {
  const now = Date.parse('2026-04-02T12:00:00Z')
  const r = eq.rolloverPool({ poolSeconds: 42 * 3600, poolPeriodKey: '2026-03', poolMonthlySeconds: 100 * 3600, monthEnd: 'forfeit' }, ET, now)
  assert.equal(r.rolled, true)
  assert.equal(r.poolPeriodKey, '2026-04')
  assert.equal(r.poolSeconds, 100 * 3600)            // leftover 42h forfeited
})

test('CARRYFORWARD: a new month adds a grant on top of the leftover', () => {
  const now = Date.parse('2026-04-02T12:00:00Z')
  const r = eq.rolloverPool({ poolSeconds: 42 * 3600, poolPeriodKey: '2026-03', poolMonthlySeconds: 100 * 3600, monthEnd: 'carryforward' }, ET, now)
  assert.equal(r.poolSeconds, (42 + 100) * 3600)
})

test('CARRYFORWARD catches up multiple dormant months and respects the cap', () => {
  const now = Date.parse('2026-05-02T12:00:00Z')     // 2 months after 2026-03
  const uncapped = eq.rolloverPool({ poolSeconds: 10 * 3600, poolPeriodKey: '2026-03', poolMonthlySeconds: 100 * 3600, monthEnd: 'carryforward' }, ET, now)
  assert.equal(uncapped.poolSeconds, (10 + 200) * 3600)
  const capped = eq.rolloverPool({ poolSeconds: 10 * 3600, poolPeriodKey: '2026-03', poolMonthlySeconds: 100 * 3600, monthEnd: 'carryforward', carryCapSeconds: 150 * 3600 }, ET, now)
  assert.equal(capped.poolSeconds, 150 * 3600)       // clamped to the cap
})

// ---- Effective allocation merge + ceiling math ----------------------------
test('effectiveAlloc: per-user override wins, else group, else unlimited', () => {
  const group = { hours: { day: 2 * 3600, week: null, month: 40 * 3600 }, tasks: { day: 5, week: null, month: null } }
  const user = { hours: { day: 1 * 3600, week: null, month: null }, tasks: { day: null, week: 10, month: null } }
  const eff = eq.effectiveAlloc({ group, user })
  assert.equal(eff.hours.day, 1 * 3600)              // user override
  assert.equal(eff.hours.month, 40 * 3600)           // inherited from group
  assert.equal(eff.hours.week, null)                 // neither -> unlimited
  assert.equal(eff.tasks.day, 5)                     // group
  assert.equal(eff.tasks.week, 10)                   // user
})

test('windowState reports remaining, pct and the most-binding window', () => {
  const s = eq.windowState({ day: 3600, week: 7200, month: null }, { day: 3000, week: 3600, month: 999 })
  assert.equal(s.limited, true)
  assert.equal(s.day.remaining, 600)
  assert.equal(s.day.pct, 83)
  assert.equal(s.week.remaining, 3600)
  assert.equal(s.month.limit, null)                  // unlimited window never binds
  assert.equal(s.binding, 'day')                     // least head-room
  assert.equal(eq.peakPct(s), 83)
})

test('windowState with no limits is unlimited', () => {
  const s = eq.windowState({ day: null, week: null, month: null }, { day: 10, week: 20, month: 30 })
  assert.equal(s.limited, false)
  assert.equal(s.binding, null)
})
