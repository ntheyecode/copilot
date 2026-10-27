// ONE derivation of the plan model for every signed-in surface. It turns the
// server's usage snapshot (GET /api/work/usage, shaped by server/store.js
// getWorkUsage + server/plan_allowance.js) into what the top-bar pill, its
// popover, the dashboard meters and the guiding console all show:
//
//   hours   this month's included hours (used / left / carried forward),
//           top-up hours (never expire), a seat-based company's shared pool,
//           a company member's admin-set allowance, a pool-based member's day
//           ceiling
//   tasks   today's per-day cap (used / remaining / reset time)
//   state   the single actionable state: ok, low, exhausted, taskCap, ceiling
//           (your allowance is spent) or pool (the company pool is empty)
//
// Pure functions, no React, no fetches: the pill and the meters can never
// disagree because they read the same derivation (SUPREME RULE II: one concept,
// one place). Nothing here is hardcoded from pricing; every number comes from
// the usage object, and the labels are rendered by the caller with its t().
export const LOW_SECONDS = 15 * 60

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// The plan zone's next month start ('YYYY-MM-01') -> a localized short date
// ("Nov 1", "1. Nov.", "11月1日"). Formatted at UTC noon so no timezone can
// shift it to the previous day. Returns '' when the key is missing or malformed
// (callers fall back to the server's English resetLabel).
export function fmtRenewDate(renewsAt, tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(renewsAt || ''))
  if (!m) return ''
  try {
    return new Intl.DateTimeFormat(tag || undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)))
  } catch { return renewsAt }
}

// Seconds -> "58 h 25 min" / "1 h" / "35 min" / "0 min", with the locale's unit
// words ({ h, min } from workShell.plan.unitH / unitMin). Whole minutes, rounded
// UP, so a few seconds of guidance never read as "0 min left". `compact` keeps
// whole hours only once there are ten or more (for the top bar chip).
export function fmtDuration(seconds, units, compact = false) {
  const mins = Math.ceil(Math.max(0, num(seconds)) / 60)
  const h = Math.floor(mins / 60), m = mins % 60
  const H = (units && units.h) || 'h', M = (units && units.min) || 'min'
  if (h === 0) return `${m} ${M}`
  if (m === 0 || (compact && h >= 10)) return `${h} ${H}`
  return `${h} ${H} ${m} ${M}`
}

// Whole hours for a monthly grant ("60 h"); minutes when under an hour.
export function fmtHours(seconds, units) {
  const s = Math.max(0, num(seconds))
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600} ${(units && units.h) || 'h'}`
  return fmtDuration(s, units)
}

// A share in [0, 1], safe for a zero denominator.
export const share = (part, whole) => (whole > 0 ? Math.max(0, Math.min(1, num(part) / whole)) : 0)

// The derived view. `opts.isCompanyMember` and `opts.isAdmin` come from the
// signed-in user, not from usage (an admin is "guidance on", never exhausted).
export function planView(usage, opts = {}) {
  if (!usage) return null
  const isCompany = !!opts.isCompanyMember
  const isAdmin = !!opts.isAdmin
  const plan = usage.plan || null
  const ent = usage.enterprise || null
  const tasksRaw = usage.tasks || null

  // ---- Hours: this month's included pool --------------------------------
  const included = plan ? Math.max(0, num(plan.grantSeconds)) : 0
  const left = plan ? Math.max(0, num(plan.poolSeconds)) : Math.max(0, num(usage.planSeconds))
  // Used of THIS month's grant. With carry-forward the pool can exceed the
  // grant; what is left above the grant is the visible carried-forward part.
  const used = plan ? Math.max(0, Math.min(included, included - left)) : 0
  const carriedExtra = plan ? Math.max(0, left - included) : 0
  const expiry = (plan && plan.expiry) || { mode: 'forfeit', carryCapHours: null }
  const carryForward = expiry.mode === 'carryforward'

  const topupSeconds = Math.max(0, num(usage.purchasedSeconds))
  const companyPoolSeconds = Math.max(0, num(usage.poolSeconds))
  const remainingSeconds = Math.max(0, num(usage.remainingSeconds))
  const exhausted = !isAdmin && !!usage.exhausted
  const low = !isAdmin && !exhausted && remainingSeconds <= LOW_SECONDS

  // ---- Company member: the admin-set allowance (tightest limited window) ----
  let allowance = null
  if (ent && ent.hours && ent.hours.limited) {
    const w = ent.hours.binding || 'day'
    const ws = ent.hours[w]
    if (ws && ws.limit != null) {
      allowance = { window: w, limit: num(ws.limit), used: num(ws.used), remaining: num(ws.remaining), pct: num(ws.pct), resetLabel: ent.resetLabel || usage.resetLabel || '' }
    }
  }
  // A pool-based company's shared monthly pool (what the whole team draws from).
  const pool = (ent && ent.pool && num(ent.pool.monthlySeconds) > 0)
    ? { remainingSeconds: Math.max(0, num(ent.pool.remainingSeconds)), monthlySeconds: num(ent.pool.monthlySeconds), usedPct: num(ent.pool.usedPct), monthEnd: ent.pool.monthEnd || 'forfeit' }
    : null

  // ---- Tasks: a plain per-day cap ---------------------------------------
  const tasks = tasksRaw ? {
    unlimited: !!tasksRaw.unlimited,
    cap: tasksRaw.cap == null ? null : Math.max(0, num(tasksRaw.cap)),
    usedToday: Math.max(0, num(tasksRaw.usedToday)),
    remaining: tasksRaw.remaining == null ? null : Math.max(0, num(tasksRaw.remaining)),
    resetLabel: tasksRaw.resetLabel || '',
    activeTaskId: tasksRaw.activeTaskId || null,
  } : null
  const taskCap = !!(tasks && !tasks.unlimited && tasks.cap != null && tasks.remaining != null && tasks.remaining <= 0)

  // ---- The one actionable state (most blocking first) --------------------
  const state = isAdmin ? 'ok'
    : usage.poolExhausted ? 'pool'
      : usage.ceilingHit ? 'ceiling'
        : exhausted ? 'exhausted'
          : low ? 'low'
            : taskCap ? 'taskCap'
              : 'ok'

  return {
    isCompany, isAdmin, hasPlan: !!plan, tier: usage.tier || 'basic',
    included, left, used, carriedExtra, carryForward, carryCapHours: expiry.carryCapHours == null ? null : num(expiry.carryCapHours),
    renewsAt: usage.renewsAt || null, resetLabel: usage.resetLabel || '',
    topupSeconds, companyPoolSeconds, pool, allowance,
    dailySeconds: usage.dailySeconds == null ? null : Math.max(0, num(usage.dailySeconds)),
    usedToday: Math.max(0, num(usage.usedSeconds)),
    remainingSeconds, exhausted, low,
    tasks, taskCap, state,
  }
}
