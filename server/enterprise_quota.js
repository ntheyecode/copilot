// ===========================================================================
// WorkCoPilot ENTERPRISE QUOTA — pure, dependency-free math + validation.
//
// This module holds the testable core of the enterprise billing hierarchy:
// per-company timezone date keys, settings/allocation normalizers, the
// monthly-pool rollover math, the effective per-user allocation merge, and the
// ceiling/consumption math. It is PURE: every function takes plain objects and
// returns plain values, touching no database, clock-of-record, or I/O. store.js
// is the single orchestrator that reads/writes `db`, persists, and emits events;
// it delegates every decision here so the rules are unit-tested in isolation
// (pool math, ceiling enforcement, month-end expiry) without spinning a server.
//
// SINGLE SOURCE OF TRUTH: the LIVE remaining pool stays `company.poolSeconds`
// (the field the existing engine already draws down). We add only the monthly
// grant, the period key, the rollover behavior, and the ceilings AROUND it — we
// never mint a parallel pool counter.
// ===========================================================================

// Allocation GROUPS are a company-admin concept layered on top of the fixed
// COMPANY_ROLES (member / company_admin / executive) — NOT a 4th company role.
// A user's group defaults from their company role and the admin may reassign it.
export const ALLOC_GROUPS = ['admin', 'supervisor', 'member']
export const MONTH_END_MODES = ['forfeit', 'carryforward']
export const TASK_POLICY_MODES = ['unlimited', 'limited']
const SECONDS_TEN_YEARS = 10 * 366 * 24 * 3600

// Map the fixed company role to a default allocation group. The admin can
// override per user; this only seeds the default so a new member is governed.
export function defaultAllocGroup(companyRole) {
  if (companyRole === 'company_admin') return 'admin'
  if (companyRole === 'executive') return 'supervisor'
  return 'member'
}

// ---- Timezone-aware day / week / month keys --------------------------------
// The "usage day" flips at 23:59 LOCAL (one minute before midnight), matching
// the engine's existing 11:59 PM reset so individual and company behavior align.
// All keys are civil-date strings so differencing/rolling them is DST-safe.
function civilParts(tz, ts) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const o = {}
  for (const p of fmt.formatToParts(new Date(ts))) o[p.type] = p.value
  let y = +o.year, m = +o.month, d = +o.day
  const hh = +o.hour === 24 ? 0 : +o.hour, mm = +o.minute
  // Flip to the next civil day at 23:59 local (mirrors store.easternDayKey).
  if (hh === 23 && mm >= 59) {
    const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + 1)
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate()
  }
  return { y, m, d }
}
export function tzDayKey(tz, ts = Date.now()) {
  const { y, m, d } = civilParts(tz, ts)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
export function tzMonthKey(tz, ts = Date.now()) {
  const { y, m } = civilParts(tz, ts)
  return `${y}-${String(m).padStart(2, '0')}`
}
// ISO-style week key: the Monday (local civil date) of the week the timestamp
// falls in, as YYYY-MM-DD. Weekly quotas reset Monday (owner decision).
export function tzWeekKey(tz, ts = Date.now()) {
  const { y, m, d } = civilParts(tz, ts)
  const base = new Date(Date.UTC(y, m - 1, d))
  const dow = base.getUTCDay()            // 0=Sun..6=Sat
  const backToMonday = (dow + 6) % 7       // Mon->0, Sun->6
  base.setUTCDate(base.getUTCDate() - backToMonday)
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`
}
// The Monday-week key that a stored civil day key (YYYY-MM-DD) belongs to. Used
// to roll daily consumption records up into the current week without a clock.
export function weekKeyOfDayKey(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''))
  if (!m) return String(dayKey || '')
  const base = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  const backToMonday = (base.getUTCDay() + 6) % 7
  base.setUTCDate(base.getUTCDate() - backToMonday)
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(base.getUTCDate()).padStart(2, '0')}`
}
// The period key for a given window ('day' | 'week' | 'month'), used to age out
// per-user consumption and to fire a threshold alert at most once per period.
export function tzPeriodKey(window, tz, ts = Date.now()) {
  if (window === 'week') return tzWeekKey(tz, ts)
  if (window === 'month') return tzMonthKey(tz, ts)
  return tzDayKey(tz, ts)
}
// A user-facing reset label, e.g. "11:59 PM EST". Falls back gracefully.
export function tzResetLabel(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/New_York', timeZoneName: 'short', hour: 'numeric', hour12: true }).formatToParts(new Date())
    const name = (parts.find((p) => p.type === 'timeZoneName') || {}).value || 'ET'
    return `11:59 PM ${name}`
  } catch { return '11:59 PM ET' }
}
// The first day of the NEXT civil month in the zone: when a monthly allowance
// renews. As a date key ('YYYY-MM-01', for clients to format per locale) and as
// a short English label ("Nov 1", for logs and the default UI).
export function tzNextMonthStart(tz, ts = Date.now()) {
  const { y, m } = civilParts(tz, ts)
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}
export function tzNextMonthLabel(tz, ts = Date.now(), locale = 'en-US') {
  const [y, m, d] = tzNextMonthStart(tz, ts).split('-').map(Number)
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)))
  } catch { return `${y}-${String(m).padStart(2, '0')}-01` }
}
export function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

// ---- Normalizers (validate EVERYTHING before anything is written) ----------
function clampInt(v, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return null
  return Math.max(min, Math.min(max, n))
}
function clampNum(v, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(min, Math.min(max, n))
}
// A {day,week,month} window of non-negative integer limits. null (or omitted)
// for a window = NO limit on that window (inherit / unlimited). A limit of 0 is
// a real, meaningful cap (0 tasks / 0 hours allowed) and is KEPT, never dropped.
export function normalizeWindows(v) {
  if (v == null) return { day: null, week: null, month: null }
  const out = {}
  for (const w of ['day', 'week', 'month']) {
    const raw = v[w]
    if (raw == null || raw === '') { out[w] = null; continue }
    const n = clampInt(raw, { min: 0, max: 1e9 })
    out[w] = n == null ? null : n
  }
  return out
}
// One allocation bucket: hour windows (stored as SECONDS) + task windows (counts).
export function normalizeAlloc(v) {
  const src = v && typeof v === 'object' ? v : {}
  // hours may arrive as hour numbers; convert to seconds for storage.
  const hoursIn = src.hours || {}
  const hourSecs = { day: null, week: null, month: null }
  for (const w of ['day', 'week', 'month']) {
    const raw = hoursIn[w]
    if (raw == null || raw === '') { hourSecs[w] = null; continue }
    const n = clampNum(raw, { min: 0, max: 1e6 })
    hourSecs[w] = n == null ? null : Math.round(n * 3600)
  }
  return { hours: hourSecs, tasks: normalizeWindows(src.tasks) }
}
export function emptyAlloc() { return { hours: { day: null, week: null, month: null }, tasks: { day: null, week: null, month: null } } }

// The default enterprise settings for a company that has none yet. Preserves the
// pre-feature behavior: no pool grant, unlimited tasks, forfeit at month end,
// Eastern time, no self-serve Stripe, 75% alert threshold.
export function enterpriseDefaults() {
  return {
    poolMonthlySeconds: 0,
    poolPeriodKey: null,
    monthEnd: 'forfeit',
    carryCapSeconds: null,
    timezone: 'America/New_York',
    overageUsdPerHour: 0,
    requestsEnabled: true,
    stripeEnabled: false,
    notifyPct: 75,
    taskPolicy: { mode: 'unlimited', day: null, week: null, month: null },
    groups: { admin: emptyAlloc(), supervisor: emptyAlloc(), member: emptyAlloc() },
    alertState: {},
    hourRequests: [],
  }
}
// Merge a PARTIAL superadmin patch onto the existing (or default) settings,
// validating each field. Throws a plain Error (store maps to httpErr 400) on bad
// input so a pinned config never silently falls back (no-silent-fail).
export function normalizeEnterprise(patch = {}, existing = null) {
  const base = { ...enterpriseDefaults(), ...(existing || {}) }
  // keep nested objects from being shared by reference
  base.taskPolicy = { ...enterpriseDefaults().taskPolicy, ...(existing && existing.taskPolicy || {}) }
  base.groups = {
    admin: (existing && existing.groups && existing.groups.admin) || emptyAlloc(),
    supervisor: (existing && existing.groups && existing.groups.supervisor) || emptyAlloc(),
    member: (existing && existing.groups && existing.groups.member) || emptyAlloc(),
  }
  base.hourRequests = Array.isArray(existing && existing.hourRequests) ? existing.hourRequests : []
  base.alertState = (existing && existing.alertState) || {}

  const out = { ...base }
  if (patch.poolHours != null && patch.poolHours !== '') {
    const h = clampNum(patch.poolHours, { min: 0, max: SECONDS_TEN_YEARS / 3600 })
    if (h == null) throw new Error('Enter the monthly pool in hours.')
    out.poolMonthlySeconds = Math.round(h * 3600)
  } else if (patch.poolMonthlySeconds != null) {
    const s = clampInt(patch.poolMonthlySeconds, { min: 0, max: SECONDS_TEN_YEARS })
    if (s == null) throw new Error('Enter the monthly pool.')
    out.poolMonthlySeconds = s
  }
  if (patch.monthEnd != null) {
    if (!MONTH_END_MODES.includes(patch.monthEnd)) throw new Error('Month-end behavior must be forfeit or carryforward.')
    out.monthEnd = patch.monthEnd
  }
  if (patch.carryCapHours !== undefined) {
    if (patch.carryCapHours == null || patch.carryCapHours === '') out.carryCapSeconds = null
    else { const h = clampNum(patch.carryCapHours, { min: 0, max: SECONDS_TEN_YEARS / 3600 }); if (h == null) throw new Error('Enter the carry-forward cap in hours, or leave it blank for no cap.'); out.carryCapSeconds = Math.round(h * 3600) }
  }
  if (patch.timezone != null) {
    if (!isValidTimezone(patch.timezone)) throw new Error('That is not a recognized time zone.')
    out.timezone = patch.timezone
  }
  if (patch.overageUsdPerHour != null && patch.overageUsdPerHour !== '') {
    const p = clampNum(patch.overageUsdPerHour, { min: 0, max: 100000 })
    if (p == null) throw new Error('Enter the per-hour overage price.')
    out.overageUsdPerHour = Math.round(p * 100) / 100
  }
  if (patch.requestsEnabled != null) out.requestsEnabled = !!patch.requestsEnabled
  if (patch.stripeEnabled != null) out.stripeEnabled = !!patch.stripeEnabled
  if (patch.notifyPct != null && patch.notifyPct !== '') {
    const n = Math.round(Number(patch.notifyPct))
    if (!Number.isFinite(n) || n < 1 || n > 100) throw new Error('The alert threshold must be between 1 and 100 percent.')
    out.notifyPct = n
  }
  if (patch.taskPolicy != null) {
    const tp = patch.taskPolicy
    const mode = tp.mode != null ? tp.mode : out.taskPolicy.mode
    if (!TASK_POLICY_MODES.includes(mode)) throw new Error('Task policy must be unlimited or limited.')
    const win = normalizeWindows({ day: tp.day, week: tp.week, month: tp.month })
    out.taskPolicy = { mode, ...win }
  }
  if (patch.groups != null && typeof patch.groups === 'object') {
    const g = { ...out.groups }
    for (const grp of ALLOC_GROUPS) {
      if (patch.groups[grp] != null) g[grp] = normalizeAlloc(patch.groups[grp])
    }
    out.groups = g
  }
  return out
}

// ---- Monthly pool rollover (lazy; no cron) ---------------------------------
// Given the current stored pool + its period, and "now", return the pool state
// AT now: if the company's month changed, grant a fresh monthly pool (forfeit)
// or add the monthly grant on top of the carried balance up to an optional cap
// (carryforward). Purchased per-user hours are a DIFFERENT bucket and never
// touched here. `rolled` lists each month boundary crossed (for the caller to
// reset per-period alert state). Deterministic + pure for unit testing.
export function rolloverPool({ poolSeconds = 0, poolPeriodKey = null, poolMonthlySeconds = 0, monthEnd = 'forfeit', carryCapSeconds = null }, tz = 'America/New_York', now = Date.now()) {
  let seconds = Math.max(0, Number(poolSeconds) || 0)
  const grant = Math.max(0, Number(poolMonthlySeconds) || 0)
  // No monthly grant configured -> this is the LEGACY flat pool (manual top-ups
  // via grantCompanyPoolSeconds). Never seed, reset or roll it: leave the balance
  // exactly as it is so the enterprise feature never degrades existing behavior.
  if (grant <= 0) return { poolSeconds: seconds, poolPeriodKey, rolled: false, periodsAdvanced: 0 }
  const nowKey = tzMonthKey(tz, now)
  if (!poolPeriodKey) {
    // First time a monthly grant is active: seed the current month's grant.
    return { poolSeconds: grant, poolPeriodKey: nowKey, rolled: true, periodsAdvanced: 1 }
  }
  if (poolPeriodKey === nowKey) {
    return { poolSeconds: seconds, poolPeriodKey, rolled: false, periodsAdvanced: 0 }
  }
  // Count whole months crossed so a dormant company catches up correctly.
  const months = monthsBetween(poolPeriodKey, nowKey)
  if (monthEnd === 'carryforward') {
    for (let i = 0; i < months; i++) {
      seconds += grant
      if (carryCapSeconds != null) seconds = Math.min(seconds, carryCapSeconds)
    }
  } else {
    // forfeit: unused pool is lost; the new period starts at exactly one grant.
    seconds = grant
  }
  return { poolSeconds: Math.max(0, Math.round(seconds)), poolPeriodKey: nowKey, rolled: true, periodsAdvanced: months }
}
function monthsBetween(aKey, bKey) {
  const a = /^(\d{4})-(\d{2})$/.exec(String(aKey || '')), b = /^(\d{4})-(\d{2})$/.exec(String(bKey || ''))
  if (!a || !b) return 1
  return Math.max(0, (+b[1] * 12 + (+b[2] - 1)) - (+a[1] * 12 + (+a[2] - 1)))
}

// ---- Effective per-user allocation -----------------------------------------
// Merge the group ceiling with the per-user override. A per-user value WINS for
// its window when present; otherwise the group's value applies; null means no
// limit on that window. The result is the user's effective ceiling, which the
// admin can only use to TIGHTEN below the shared pool (the pool is the hard cap).
export function effectiveAlloc({ group = emptyAlloc(), user = null } = {}) {
  const g = group || emptyAlloc()
  const u = user || emptyAlloc()
  const pick = (gv, uv) => (uv != null ? uv : (gv != null ? gv : null))
  const mergeWin = (kind) => ({
    day: pick(g[kind] && g[kind].day, u[kind] && u[kind].day),
    week: pick(g[kind] && g[kind].week, u[kind] && u[kind].week),
    month: pick(g[kind] && g[kind].month, u[kind] && u[kind].month),
  })
  return { hours: mergeWin('hours'), tasks: mergeWin('tasks') }
}

// ---- Ceiling / consumption math --------------------------------------------
// Given an effective ceiling bucket ({day,week,month} as seconds OR task counts)
// and the matching consumed amounts, return per-window remaining and the single
// most-binding window (smallest remaining relative to its limit). Windows with a
// null limit are unlimited and never bind. Used for hour AND task ceilings.
export function windowState(limits, consumed) {
  const out = { day: null, week: null, month: null, binding: null, bindingPct: 0, limited: false }
  let worst = Infinity
  for (const w of ['day', 'week', 'month']) {
    const lim = limits ? limits[w] : null
    if (lim == null) { out[w] = { limit: null, used: (consumed && consumed[w]) || 0, remaining: null, pct: 0 }; continue }
    out.limited = true
    const used = Math.max(0, (consumed && consumed[w]) || 0)
    const remaining = Math.max(0, lim - used)
    const pct = lim > 0 ? Math.min(100, Math.round((used / lim) * 100)) : 100
    out[w] = { limit: lim, used, remaining, pct }
    // Most-binding = the window with the least remaining head-room.
    if (remaining <= worst) { worst = remaining; out.binding = w; out.bindingPct = pct }
  }
  return out
}
// Highest consumption percentage across hour + task windows and the pool, for
// the "you have used N%" surfaces and the 75% alert decision.
export function peakPct(...states) {
  let p = 0
  for (const s of states) { if (s && Number.isFinite(s.bindingPct)) p = Math.max(p, s.bindingPct); if (s && Number.isFinite(s.pct)) p = Math.max(p, s.pct) }
  return p
}
