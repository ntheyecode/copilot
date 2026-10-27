// ===========================================================================
// WorkCoPilot ENTERPRISE BILLING + QUOTA HIERARCHY: the orchestration.
//
//   AdmireVeda (superadmin) sets a company's monthly pool, task policy, overage
//   price, time zone, month-end behavior and the request/Stripe toggles
//     -> the company admin sub-allocates per group / per user (hours and tasks
//        per day / week / month), which can only TIGHTEN below the pool
//     -> every guided second and every task start draws from the ONE company
//        pool and is bounded by the user's effective ceiling
//     -> 75% alerts reach the superadmin (pool) and the company admins (user).
//
// Every DECISION (date keys, validation, rollover, ceiling math) lives in the
// pure module enterprise_quota.js and is unit tested without a server. This
// module is the orchestration around it: it reads/writes the store's db,
// persists, and emits events. It is created with the store's context so it
// never imports the store (no circular import); the store keeps only thin
// hot-path hooks and re-exports (owner rule: no monolith files).
//
// SINGLE SOURCE OF TRUTH (SUPREME RULE II): the LIVE remaining pool stays
// company.poolSeconds (the field the consumption engine already draws down).
// enterprise.* adds the monthly grant, period tracking, month-end behavior,
// ceilings and alert state AROUND it; no parallel pool counter is ever minted.
// ===========================================================================
import * as eq from './enterprise_quota.js'
import { createInbox } from './notifications.js'

export const SUPER_INBOX = '__super'
const WINDOWS = ['day', 'week', 'month']
const DEFAULT_TZ = 'America/New_York'

// ctx: { db: () => object, persist, persistSoon, getUser, company(id), publicCompany,
//        publicWorkUser, httpErr, id, now, emitStoreEvent }
export function createEnterpriseBilling(ctx) {
  const { persist, persistSoon, getUser, httpErr, id, now, emitStoreEvent } = ctx
  const db = () => ctx.db()
  const findCompany = (companyId) => ctx.company(companyId)
  const inbox = createInbox({ db, persistSoon, id })

  // ---- Company / user basics ---------------------------------------------
  function companyEnterprise(c) {
    if (!c) return eq.enterpriseDefaults()
    if (!c.enterprise) c.enterprise = eq.enterpriseDefaults()
    return c.enterprise
  }
  function userCompany(u) { return (u && u.companyId) ? findCompany(u.companyId) : null }
  function userTz(u) { const c = userCompany(u); return (c && c.enterprise && c.enterprise.timezone) || DEFAULT_TZ }
  // A company user's "usage day" is in the COMPANY time zone (daily resets at
  // company-local 11:59 PM). Individuals stay on Eastern, so for a company-less
  // account this equals the engine's Eastern day key (no behavior change).
  function userDayKey(u) { return eq.tzDayKey(userTz(u)) }
  function userAllocGroup(u) {
    const g = u && u.allocGroup
    return eq.ALLOC_GROUPS.includes(g) ? g : eq.defaultAllocGroup(u && u.companyRole)
  }
  function companyAdminIds(companyId) {
    return (db().users || []).filter((x) => x.companyId === companyId && x.companyRole === 'company_admin').map((x) => x.id)
  }
  const resetLabel = (c) => eq.tzResetLabel(companyEnterprise(c).timezone)
  const resetLabelForUser = (u) => eq.tzResetLabel(userTz(u))

  // ---- Lazy month-end rollover (no cron) ---------------------------------
  // Forfeit (reset to one monthly grant) or carry forward (add a grant, up to an
  // optional cap) when the company's month changed. Resets the per-period alert
  // state so each new month can alert again. Persists only when something moved.
  function rollCompanyPool(c) {
    if (!c) return eq.enterpriseDefaults()
    const ent = companyEnterprise(c)
    const r = eq.rolloverPool({
      poolSeconds: c.poolSeconds || 0, poolPeriodKey: ent.poolPeriodKey,
      poolMonthlySeconds: ent.poolMonthlySeconds || 0, monthEnd: ent.monthEnd, carryCapSeconds: ent.carryCapSeconds,
    }, ent.timezone)
    if (r.rolled) {
      c.poolSeconds = r.poolSeconds
      ent.poolPeriodKey = r.poolPeriodKey
      ent.alertState = {}
      persistSoon()
    }
    return ent
  }

  // ---- Per-user consumption roll-ups (derived from the daily records) ------
  // The daily usage/task records are the single source; week/month totals are
  // summed from them so no parallel counter can drift. ONE pass per table for
  // any number of users (the heartbeat path asks for one user; the dashboards
  // ask for a whole company), bucketing each day key into day/week/month once.
  function windowKeys(tz) {
    const t = Date.now()   // numeric clock for date keys; the store's now() is an ISO stamp
    return { day: eq.tzDayKey(tz, t), week: eq.tzWeekKey(tz, t), month: eq.tzMonthKey(tz, t) }
  }
  function aggregateUsage(users) {
    const out = new Map()
    const want = new Map()
    for (const u of users) {
      out.set(u.id, { secs: { day: 0, week: 0, month: 0 }, tasks: { day: 0, week: 0, month: 0 } })
      want.set(u.id, windowKeys(userTz(u)))
    }
    const bucket = (userId, dayKey, add) => {
      const w = want.get(userId)
      if (!w) return
      if (dayKey.slice(0, 7) === w.month) add('month')
      if (eq.weekKeyOfDayKey(dayKey) === w.week) add('week')
      if (dayKey === w.day) add('day')
    }
    const d = db()
    for (const key in (d.workUsage || {})) {
      const i = key.indexOf(':'); if (i < 0) continue
      const userId = key.slice(0, i); const rec = out.get(userId); if (!rec) continue
      const secs = Math.max(0, Number((d.workUsage[key] || {}).consumedSeconds) || 0)
      if (secs) bucket(userId, key.slice(i + 1), (w) => { rec.secs[w] += secs })
    }
    for (const key in (d.workTasks || {})) {
      const i = key.indexOf(':'); if (i < 0) continue
      const userId = key.slice(0, i); const rec = out.get(userId); if (!rec) continue
      const n = Math.max(0, Number(d.workTasks[key]) || 0)
      if (n) bucket(userId, key.slice(i + 1), (w) => { rec.tasks[w] += n })
    }
    return out
  }
  const tighter = (a, b) => { if (a == null) return b == null ? null : b; if (b == null) return a; return Math.min(a, b) }

  // The user's EFFECTIVE ceiling = group default merged with the per-user
  // override, then (for tasks) the company-wide policy, keeping the TIGHTER
  // limit. null for individuals (they use the task-credit economy, unchanged).
  function userEffectiveAlloc(u) {
    const c = userCompany(u); if (!c) return null
    const ent = companyEnterprise(c)
    const group = (ent.groups && ent.groups[userAllocGroup(u)]) || eq.emptyAlloc()
    return eq.effectiveAlloc({ group, user: (u && u.alloc) || null })
  }
  function ceilingFromUsage(u, ent, agg) {
    const alloc = userEffectiveAlloc(u)
    const policy = (ent.taskPolicy && ent.taskPolicy.mode === 'limited')
      ? { day: ent.taskPolicy.day, week: ent.taskPolicy.week, month: ent.taskPolicy.month }
      : { day: null, week: null, month: null }
    const taskLimits = { day: tighter(alloc.tasks.day, policy.day), week: tighter(alloc.tasks.week, policy.week), month: tighter(alloc.tasks.month, policy.month) }
    const hours = eq.windowState(alloc.hours, agg.secs)
    const tasks = eq.windowState(taskLimits, agg.tasks)
    return { group: userAllocGroup(u), alloc, taskLimits, hours, tasks, consumed: agg }
  }
  function userCeilingState(u) {
    const c = userCompany(u); if (!c) return null
    const agg = aggregateUsage([u]).get(u.id)
    return ceilingFromUsage(u, companyEnterprise(c), agg)
  }
  // Remaining guided SECONDS before the most binding HOUR ceiling (Infinity when
  // no hour window is limited). The pool is still the separate hard company cap.
  function userHourHeadroom(cs) {
    if (!cs || !cs.hours || !cs.hours.limited) return Infinity
    let h = Infinity
    for (const w of WINDOWS) { const ws = cs.hours[w]; if (ws && ws.limit != null) h = Math.min(h, ws.remaining) }
    return h
  }
  const poolUsedPct = (monthly, remaining) => (monthly > 0 ? Math.min(100, Math.round(((monthly - remaining) / monthly) * 100)) : 0)

  // Compact enterprise snapshot for the client usage object (pool + ceiling +
  // actionable state). Never exposes AI cost or any model/provider name.
  function companyUsageSnapshot(c, u, cs = null) {
    const ent = companyEnterprise(c)
    cs = cs || userCeilingState(u)
    const monthly = ent.poolMonthlySeconds || 0
    const remaining = Math.max(0, c.poolSeconds || 0)
    return {
      timezone: ent.timezone, resetLabel: eq.tzResetLabel(ent.timezone),
      pool: { remainingSeconds: remaining, monthlySeconds: monthly, usedPct: poolUsedPct(monthly, remaining), monthEnd: ent.monthEnd },
      group: cs ? cs.group : null, hours: cs ? cs.hours : null, tasks: cs ? cs.tasks : null,
      requestsEnabled: !!ent.requestsEnabled, stripeEnabled: !!ent.stripeEnabled, overageUsdPerHour: ent.overageUsdPerHour || 0,
    }
  }
  // The public view of a company's enterprise settings + live pool state (for
  // publicCompany). alertState is internal; hourRequests are summarized.
  function publicEnterprise(c) {
    const ent = c.enterprise || eq.enterpriseDefaults()
    const monthly = ent.poolMonthlySeconds || 0
    const remaining = Math.max(0, Number(c.poolSeconds) || 0)
    return {
      poolMonthlySeconds: monthly, poolRemainingSeconds: remaining, poolUsedPct: poolUsedPct(monthly, remaining),
      poolPeriodKey: ent.poolPeriodKey || null,
      monthEnd: ent.monthEnd, carryCapSeconds: ent.carryCapSeconds,
      timezone: ent.timezone, resetLabel: eq.tzResetLabel(ent.timezone),
      overageUsdPerHour: ent.overageUsdPerHour || 0,
      requestsEnabled: !!ent.requestsEnabled, stripeEnabled: !!ent.stripeEnabled,
      notifyPct: ent.notifyPct || 75,
      taskPolicy: ent.taskPolicy || { mode: 'unlimited', day: null, week: null, month: null },
      groups: ent.groups || { admin: eq.emptyAlloc(), supervisor: eq.emptyAlloc(), member: eq.emptyAlloc() },
      hourRequestCount: (ent.hourRequests || []).length,
      pendingHourRequests: (ent.hourRequests || []).filter((r) => r.status === 'pending').length,
    }
  }

  // ---- 75% consumption alerts (in-app + email, once per period) ------------
  function notifySuperadminPool(c, usedPct) {
    inbox.add(SUPER_INBOX, {
      type: 'company_pool_threshold', companyId: c.id, companyName: c.name, pct: usedPct,
      title: `${c.name}: ${usedPct}% of monthly pool used`,
      body: `The monthly guided-hours pool for ${c.name} is ${usedPct}% consumed.`,
    })
    emitStoreEvent('company_pool_threshold', { companyId: c.id, companyName: c.name, pct: usedPct })
  }
  function notifyCompanyAdminsUser(c, u, pct) {
    const name = u.displayName || u.username
    for (const aid of companyAdminIds(c.id)) {
      inbox.add(aid, {
        type: 'user_ceiling_threshold', companyId: c.id, userId: u.id, pct,
        title: `${name}: ${pct}% of allowance used`,
        body: `${name} has reached ${pct}% of their guided-time or task allowance.`,
      })
    }
    emitStoreEvent('user_ceiling_threshold', { companyId: c.id, companyName: c.name, userId: u.id, userName: name, pct })
  }
  // Fire the threshold alerts for a company (pool -> superadmin) and a user
  // (ceiling -> company admins) at most once per period. `cs` may be passed by a
  // caller that already computed the ceiling state (the heartbeat path), so the
  // usage tables are scanned once, not twice. Never throws into consumption.
  function maybeFireAlerts(c, u, cs = null) {
    try {
      const ent = companyEnterprise(c)
      const threshold = Math.max(1, Math.min(100, Number(ent.notifyPct) || 75))
      if (!ent.alertState) ent.alertState = {}
      const monthly = ent.poolMonthlySeconds || 0
      if (monthly > 0) {
        const usedPct = poolUsedPct(monthly, Math.max(0, c.poolSeconds || 0))
        const periodKey = ent.poolPeriodKey || eq.tzMonthKey(ent.timezone)
        const fired = ent.alertState.company
        if (usedPct >= threshold && (!fired || fired.period !== periodKey)) {
          ent.alertState.company = { period: periodKey, pct: usedPct, at: now() }
          notifySuperadminPool(c, usedPct); persistSoon()
        }
      }
      if (u) {
        const state = cs || userCeilingState(u)
        const peak = eq.peakPct(state && state.hours, state && state.tasks)
        if (peak >= threshold) {
          if (!ent.alertState.users) ent.alertState.users = {}
          const periodKey = eq.tzWeekKey(ent.timezone)   // re-alert at most once per week per user
          const prev = ent.alertState.users[u.id]
          if (!prev || prev.period !== periodKey) {
            ent.alertState.users[u.id] = { period: periodKey, pct: peak, at: now() }
            notifyCompanyAdminsUser(c, u, peak); persistSoon()
          }
        }
      }
    } catch { /* alerts must never break consumption */ }
  }

  // ---- Superadmin + company-admin setters / dashboards ---------------------
  // Superadmin: per-company pool, policy, overage price, time zone, month-end
  // behavior, request + Stripe toggles. Validated atomically; no silent fail.
  function setCompanyEnterprise(companyId, patch = {}) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    let next
    try { next = eq.normalizeEnterprise(patch, c.enterprise) } catch (e) { throw httpErr(400, e.message) }
    next.poolPeriodKey = (c.enterprise && c.enterprise.poolPeriodKey) || null
    next.alertState = (c.enterprise && c.enterprise.alertState) || {}
    next.hourRequests = (c.enterprise && c.enterprise.hourRequests) || []
    c.enterprise = next
    rollCompanyPool(c)   // seed the live pool immediately when a grant is first set
    persist()
    return ctx.publicCompany(c)
  }
  // Company admin: per-GROUP ceilings + the company-wide task policy. Can only
  // TIGHTEN (the shared pool is the hard company cap set by AdmireVeda).
  function setCompanyAllocation(companyId, patch = {}) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    const ent = companyEnterprise(c)
    let next
    try { next = eq.normalizeEnterprise({ groups: patch.groups, taskPolicy: patch.taskPolicy }, ent) } catch (e) { throw httpErr(400, e.message) }
    if (patch.groups != null) ent.groups = next.groups
    if (patch.taskPolicy != null) ent.taskPolicy = next.taskPolicy
    persist()
    return publicCompanyAllocation(c)
  }
  function setUserAllocation(companyId, targetUserId, { group, alloc } = {}) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    const u = getUser(targetUserId)
    if (!u || String(u.companyId) !== String(companyId)) throw httpErr(404, 'That user is not in your company.')
    if (group != null) { if (!eq.ALLOC_GROUPS.includes(group)) throw httpErr(400, 'Unknown allocation group.'); u.allocGroup = group }
    if (alloc !== undefined) u.alloc = (alloc == null) ? null : eq.normalizeAlloc(alloc)
    persist()
    return ctx.publicWorkUser(u)
  }
  function publicCompanyAllocation(c) {
    c = (typeof c === 'string') ? findCompany(c) : c
    if (!c) throw httpErr(404, 'Company not found.')
    const ent = companyEnterprise(c)
    return { groups: ent.groups, taskPolicy: ent.taskPolicy, timezone: ent.timezone, resetLabel: eq.tzResetLabel(ent.timezone), notifyPct: ent.notifyPct }
  }
  // Live pool + per-user consumption for BOTH consoles (superadmin: any company;
  // company admin: their own). One pass over the usage tables for all members.
  function companyPoolDashboard(companyId) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    rollCompanyPool(c)
    const ent = companyEnterprise(c)
    const monthly = ent.poolMonthlySeconds || 0
    const remaining = Math.max(0, c.poolSeconds || 0)
    const members = (db().users || []).filter((x) => x.companyId === companyId)
    const agg = aggregateUsage(members)
    const byUser = members.map((u) => {
      const cs = ceilingFromUsage(u, ent, agg.get(u.id))
      return {
        id: u.id, username: u.username, displayName: u.displayName || u.username,
        companyRole: u.companyRole || 'member', group: cs.group,
        hours: cs.hours, tasks: cs.tasks, alloc: u.alloc || null,
        consumedSeconds: { ...cs.consumed.secs },
        taskCount: { ...cs.consumed.tasks },
      }
    }).sort((a, b) => b.consumedSeconds.month - a.consumedSeconds.month)
    return {
      companyId, name: c.name, timezone: ent.timezone, resetLabel: eq.tzResetLabel(ent.timezone),
      pool: { remainingSeconds: remaining, monthlySeconds: monthly, usedSeconds: Math.max(0, monthly - remaining), usedPct: poolUsedPct(monthly, remaining), monthEnd: ent.monthEnd, periodKey: ent.poolPeriodKey, carryCapSeconds: ent.carryCapSeconds },
      policy: { task: ent.taskPolicy, notifyPct: ent.notifyPct, overageUsdPerHour: ent.overageUsdPerHour, requestsEnabled: ent.requestsEnabled, stripeEnabled: ent.stripeEnabled },
      groups: ent.groups,
      pendingRequests: (ent.hourRequests || []).filter((r) => r.status === 'pending').length,
      byUser,
    }
  }

  // ---- Additional-hours requests (company admin asks, superadmin decides) ---
  function requestCompanyHours(companyId, byUserId, { hours, note } = {}) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    const ent = companyEnterprise(c)
    if (!ent.requestsEnabled) throw httpErr(403, 'Additional-hours requests are turned off for your company. Contact AdmireVeda.')
    const h = Math.round(Number(hours))
    if (!Number.isFinite(h) || h <= 0 || h > 1e6) throw httpErr(400, 'Enter how many hours to request.')
    const by = getUser(byUserId)
    const req = { id: 'hreq' + id(), hours: h, note: String(note || '').slice(0, 500), status: 'pending', byUserId: byUserId || null, byName: (by && (by.displayName || by.username)) || '', at: new Date().toISOString(), decidedBy: null, decidedAt: null, decisionNote: '' }
    ent.hourRequests.unshift(req)
    if (ent.hourRequests.length > 200) ent.hourRequests.length = 200
    inbox.add(SUPER_INBOX, { type: 'hours_requested', companyId: c.id, companyName: c.name, requestId: req.id, hours: h, title: `${c.name} requested ${h} more hours`, body: `${req.byName} requested ${h} additional pooled hours.${req.note ? ' Note: ' + req.note : ''}` })
    emitStoreEvent('hours_requested', { companyId: c.id, companyName: c.name, requestId: req.id, hours: h, byName: req.byName, note: req.note })
    persist()
    return req
  }
  function listCompanyHourRequests(companyId) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    return (companyEnterprise(c).hourRequests || []).slice()
  }
  function decideCompanyHours(companyId, requestId, { approve, by, note } = {}) {
    const c = findCompany(companyId); if (!c) throw httpErr(404, 'Company not found.')
    const ent = companyEnterprise(c)
    const req = (ent.hourRequests || []).find((r) => r.id === requestId)
    if (!req) throw httpErr(404, 'Request not found.')
    if (req.status !== 'pending') throw httpErr(409, 'That request was already decided.')
    req.status = approve ? 'approved' : 'denied'
    req.decidedBy = by || 'superadmin'; req.decidedAt = new Date().toISOString(); req.decisionNote = String(note || '').slice(0, 500)
    if (approve) {
      rollCompanyPool(c)
      c.poolSeconds = Math.max(0, (Number(c.poolSeconds) || 0) + req.hours * 3600)
      const price = Number(ent.overageUsdPerHour) || 0
      if (price > 0) {
        if (!c.billing) c.billing = { items: [] }
        c.billing.items.push({ id: 'bi' + id(), at: new Date().toISOString(), label: `${req.hours} additional guided hours`, qty: req.hours, unit: price, amount: +(req.hours * price).toFixed(2) })
      }
    }
    for (const aid of companyAdminIds(c.id)) {
      inbox.add(aid, { type: 'hours_decided', companyId: c.id, requestId: req.id, hours: req.hours, title: `Your ${req.hours}-hour request was ${req.status}`, body: approve ? `AdmireVeda approved ${req.hours} more hours; they are in your pool now.` : `AdmireVeda could not approve your ${req.hours}-hour request.${req.decisionNote ? ' ' + req.decisionNote : ''}` })
    }
    emitStoreEvent('hours_decided', { companyId: c.id, companyName: c.name, requestId: req.id, hours: req.hours, status: req.status, note: req.decisionNote })
    persist()
    return req
  }

  // ---- Notification inbox surface (superadmin + per-user) ------------------
  const listNotificationsForUser = (workUserId, opts) => (getUser(workUserId) ? inbox.list(workUserId, opts) : [])
  const listSuperadminNotifications = (opts = {}) => inbox.list(SUPER_INBOX, { limit: 100, ...opts })
  const superadminUnreadCount = () => inbox.unreadCount(SUPER_INBOX)
  const markSuperadminNotificationRead = (idOrAll = '*') => inbox.markRead(SUPER_INBOX, idOrAll)

  return {
    // hooks used by the consumption engine (store.js)
    defaults: () => eq.enterpriseDefaults(),
    companyEnterprise, userCompany, userTz, userDayKey, userAllocGroup, resetLabel, resetLabelForUser,
    rollCompanyPool, userCeilingState, userHourHeadroom, companyUsageSnapshot, publicEnterprise, maybeFireAlerts,
    // public API (re-exported by the store)
    setCompanyEnterprise, setCompanyAllocation, setUserAllocation, publicCompanyAllocation, companyPoolDashboard,
    requestCompanyHours, listCompanyHourRequests, decideCompanyHours,
    listNotifications: inbox.list, listNotificationsForUser, listSuperadminNotifications, superadminUnreadCount,
    unreadNotificationCount: inbox.unreadCount, markNotificationRead: inbox.markRead, markSuperadminNotificationRead,
  }
}
