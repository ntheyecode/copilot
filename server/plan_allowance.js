// ===========================================================================
// WorkCoPilot PLAN ALLOWANCE: what an individual plan (and a company seat on a
// seat-based company) includes, and how it is consumed.
//
//   Superadmin pricing (ONE source, Admin > Pricing):
//     hoursMonthly[tier]  guided hours included per calendar month (ET)
//     tasks[tier]         guided tasks a person may START per day (ET)
//     hoursExpiry         what happens to unused hours at month end:
//                         forfeit (default) or carry forward, with an optional cap
//
//   Each person has ONE monthly hours pool, renewed lazily on the first read of
//   a new month (no cron) with the same rollover rules the enterprise pool uses
//   (enterprise_quota.rolloverPool: single source for month-end math). A grant
//   change (superadmin edit, upgrade, downgrade) applies at once, as a delta on
//   the current pool, never below zero. Purchased top-up hours are a separate,
//   non-expiring balance owned by the store; a seat-based company's shared pool
//   comes after both; pool-based companies (enterprise) never use this module.
//
//   Tasks are a plain per-day cap: no banked credits, no earning, no trading.
//
// Created with the store's context so it never imports the store (no circular
// import); the store stays the single owner of db + persistence and keeps only
// thin hooks (owner rule: no monolith files).
// ===========================================================================
import * as eq from './enterprise_quota.js'

export const PLAN_TZ = 'America/New_York'          // individuals and seats run on Eastern, like the rest of the engine
const DEFAULT_HOURS_MONTHLY = { lite: 30, basic: 60, advanced: 120, premium: 180 }
const DEFAULT_TASKS_DAILY = { lite: 4, basic: 4, advanced: 6, premium: 8 }

// ctx: { db: () => object, persistSoon, getWorkPricing, workUserTier, tasksToday(userId), httpErr }
export function createPlanAllowance(ctx) {
  const { persistSoon, getWorkPricing, workUserTier, tasksToday, httpErr } = ctx
  const db = () => ctx.db()

  // ---- Live pricing reads (never a parallel copy of the numbers) --------
  function hoursMonthly(tier) {
    const h = Number(((getWorkPricing().hoursMonthly) || {})[tier])
    return Number.isFinite(h) && h >= 0 ? h : (DEFAULT_HOURS_MONTHLY[tier] || 0)
  }
  const grantSeconds = (tier) => Math.round(hoursMonthly(tier) * 3600)
  function dailyTaskCap(tier) {
    const n = ((getWorkPricing().tasks) || {})[tier]
    return Number.isInteger(n) && n >= 0 ? n : (DEFAULT_TASKS_DAILY[tier] || 0)
  }
  function expiry() {
    const e = (getWorkPricing().hoursExpiry) || {}
    const mode = eq.MONTH_END_MODES.includes(e.mode) ? e.mode : 'forfeit'
    const cap = (mode === 'carryforward' && e.carryCapHours != null && Number.isFinite(Number(e.carryCapHours))) ? Math.round(Number(e.carryCapHours) * 3600) : null
    return { mode, carryCapSeconds: cap, carryCapHours: cap == null ? null : cap / 3600 }
  }

  // ---- The person's monthly pool (lazy rollover + immediate grant deltas) --
  function rollUserPool(u) {
    if (!u) return null
    const grant = grantSeconds(workUserTier(u.id))
    if (!u.plan) u.plan = { poolSeconds: 0, poolPeriodKey: null, grantSeconds: 0 }
    const ex = expiry()
    const r = eq.rolloverPool({
      poolSeconds: u.plan.poolSeconds || 0, poolPeriodKey: u.plan.poolPeriodKey,
      poolMonthlySeconds: grant, monthEnd: ex.mode, carryCapSeconds: ex.carryCapSeconds,
    }, PLAN_TZ)
    let changed = false
    if (r.rolled) {
      u.plan.poolSeconds = r.poolSeconds; u.plan.poolPeriodKey = r.poolPeriodKey; u.plan.grantSeconds = grant; changed = true
    } else if ((u.plan.grantSeconds || 0) !== grant) {
      // The monthly grant changed mid-month (superadmin edit, upgrade, downgrade):
      // apply the difference to this month's pool right away, never below zero.
      u.plan.poolSeconds = Math.max(0, (u.plan.poolSeconds || 0) + (grant - (u.plan.grantSeconds || 0)))
      u.plan.grantSeconds = grant; changed = true
    }
    if (changed) persistSoon()
    return u.plan
  }
  // Draw `secs` from the person's monthly pool; returns what could NOT be served
  // (the caller continues with purchased hours, then a seat-based company pool).
  function consume(u, secs) {
    const p = rollUserPool(u)
    const take = Math.min(Math.max(0, p.poolSeconds || 0), secs)
    p.poolSeconds = Math.max(0, (p.poolSeconds || 0) - take)
    return secs - take
  }
  // Seconds consumed this calendar month, from the daily usage records (the one
  // record of consumption; the pool is the entitlement, this is the spend).
  function usedMonthSeconds(u) {
    const month = eq.tzMonthKey(PLAN_TZ), prefix = `${u.id}:`
    let secs = 0
    const usage = db().workUsage || {}
    for (const key in usage) {
      if (key.indexOf(prefix) !== 0) continue
      if (key.slice(prefix.length, prefix.length + 7) !== month) continue
      secs += Math.max(0, Number((usage[key] || {}).consumedSeconds) || 0)
    }
    return secs
  }
  // The client-facing view of the plan allowance (hours side).
  function snapshot(u) {
    const p = rollUserPool(u)
    const ex = expiry()
    return {
      tier: workUserTier(u.id),
      hoursMonthly: (p.grantSeconds || 0) / 3600,
      grantSeconds: p.grantSeconds || 0,
      poolSeconds: Math.max(0, p.poolSeconds || 0),          // included hours left this month (plus any carried forward)
      usedMonthSeconds: usedMonthSeconds(u),
      periodKey: p.poolPeriodKey,
      renewsAt: eq.tzNextMonthStart(PLAN_TZ),                  // 'YYYY-MM-01' in the plan zone; clients format it per locale
      renewsLabel: eq.tzNextMonthLabel(PLAN_TZ),
      expiry: { mode: ex.mode, carryCapHours: ex.carryCapHours },
    }
  }

  // ---- Tasks: a plain per-day cap ------------------------------------------
  function taskState(u) {
    const cap = dailyTaskCap(workUserTier(u.id))
    const usedToday = tasksToday(u.id)
    return { unlimited: false, cap, usedToday, remaining: Math.max(0, cap - usedToday), resetLabel: eq.tzResetLabel(PLAN_TZ) }
  }
  // Throws the coded 402 the client turns into an actionable "today's tasks are
  // used" state; returns the state when a start is allowed.
  function gateTaskStart(u) {
    const s = taskState(u)
    if (s.usedToday >= s.cap) {
      const tier = workUserTier(u.id)
      const e = httpErr(402, `You've used today's ${s.cap} guided ${s.cap === 1 ? 'task' : 'tasks'} on the ${tier} plan. New tasks open at ${s.resetLabel}, or upgrade for more each day.`)
      e.taskLimit = true; e.cap = s.cap; e.window = 'day'; e.resetLabel = s.resetLabel
      throw e
    }
    return s
  }

  return { hoursMonthly, grantSeconds, dailyTaskCap, expiry, rollUserPool, consume, usedMonthSeconds, snapshot, taskState, gateTaskStart }
}
