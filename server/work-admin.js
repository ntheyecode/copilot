// ===========================================================================
// WorkCoPilot admin routes - SELF-CONTAINED, decoupled register module.
//
// This file adds only the READ endpoints the WorkCoPilot admin console needs
// that did not already exist. The write endpoints it relies on (set tier,
// grant minutes, set pricing, platform-AI toggle) already live in
// server/index.js and are REUSED by the client as-is - we do not re-register
// their paths here (single source of truth; no parallel route list).
//
// Wiring (owner does this in server/index.js, after the existing work routes):
//   import { registerWorkAdminRoutes } from './work-admin.js'
//   registerWorkAdminRoutes(app, {
//     store, work, ai, requireAuth, requireAdmin, requireSuperAdmin, wrap, resolveWorkRuntime,
//   })
//
// deps it reads (confirmed against server/index.js):
//   - store                : the store.js module namespace (functions below)
//   - requireAuth          : index.js:97  sets req.user, 401 when not signed in
//   - requireAdmin         : index.js:1034 403 unless req.user.role in ADMIN_ROLES
//   - requireSuperAdmin    : index.js:1346 403 unless req.user.role === 'superadmin'
//   - wrap                 : index.js:93  try/catch wrapper for sync handlers
//   (work, ai, resolveWorkRuntime are accepted for forward-compat / symmetry
//    with the other work routes but this read-only surface does not need them.)
//
// existing store functions relied on (confirmed in server/store.js):
//   - listUsers()          : store.js:548  all accounts as publicUser() (has .products, .role)
//   - getWorkUser(id)       : store.js:3452
//   - getWorkTier(id)       : store.js:3504
//   - getWorkUsage(id)      : store.js:3520 { tier, dailySeconds, usedSeconds, purchasedSeconds, freeLeft, remainingSeconds, exhausted, resetLabel }
//   - listWorkSessions(id)  : store.js:3705
//   - getWorkPricing()      : store.js:3571
//   - getWorkPlatformAllowed(): store.js:3608
//   - getActiveRuntime()    : store.js:1144 { providerId, apiKey, chatModel, ... } | null
//   - WORK_TIERS            : store.js:3490 ['basic','advanced','premium']
//
// store functions I WISH existed (owner: optional, would make this exhaustive
// and O(1) instead of O(users); the fallbacks below work today without them):
//   - listAllWorkUsers()    -> raw db.workUsers array (would also surface any
//                              legacy 'w'-prefixed records not in db.users).
//   - listAllWorkSessions() -> raw db.workSessions array (avoids the per-user
//                              fan-out when building the global sessions view).
// Both are auto-detected: if present they are used, else we derive from the
// 'work'-entitled accounts returned by listUsers().
// ===========================================================================

// Eastern "today" key, matching store.js day boundaries closely enough for a
// dashboard count (calendar day in America/New_York).
function easternDay(ts) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    })
    return fmt.format(new Date(ts))
  } catch { return new Date(ts).toISOString().slice(0, 10) }
}

// The set of people who can use WorkCoPilot. Prefer a dedicated store function
// if the owner adds one; otherwise derive from accounts that hold the 'work'
// entitlement (admins/superadmins hold every product, so they appear too).
function workRoster(store) {
  if (typeof store.listAllWorkUsers === 'function') {
    const rows = store.listAllWorkUsers() || []
    return rows.map((u) => ({ id: u.id, username: u.username })).filter((x) => x && x.id)
  }
  const accts = (typeof store.listUsers === 'function') ? (store.listUsers() || []) : []
  return accts
    .filter((a) => Array.isArray(a.products) && a.products.includes('work'))
    .map((a) => ({ id: a.id, username: a.username }))
}

// Every session across all users. Prefer a dedicated store function; else fan
// out over the roster. Guard each lookup so one bad record never 500s the view.
function allWorkSessions(store, roster) {
  if (typeof store.listAllWorkSessions === 'function') {
    return store.listAllWorkSessions() || []
  }
  const nameById = new Map(roster.map((r) => [r.id, r.username]))
  const out = []
  for (const r of roster) {
    let list = []
    try { list = store.listWorkSessions(r.id) || [] } catch { list = [] }
    for (const s of list) {
      if (!s || !s.id) continue
      out.push(s.username ? s : { ...s, username: nameById.get(s.workUserId) || r.username })
    }
  }
  return out
}

function stepCounts(s) {
  const steps = Array.isArray(s.steps) ? s.steps : []
  const done = steps.filter((x) => x && x.status === 'done').length
  return { total: steps.length, done }
}

// A session row trimmed to what the console shows (no internal event logs, no
// AI config). username is resolved from the roster when the record lacks it.
function sessionRow(s, nameById) {
  const c = stepCounts(s)
  return {
    id: s.id,
    userId: s.workUserId || null,
    username: s.username || nameById.get(s.workUserId) || 'unknown',
    title: s.title || null,
    goal: s.goal || null,
    status: s.status || 'active',
    paused: !!s.paused,
    stepTotal: c.total,
    stepDone: c.done,
    currentStep: Number(s.currentStep) || 0,
    startedAt: s.startedAt || null,
    endedAt: s.endedAt || null,
    lastActivityAt: s.lastActivityAt || null,
    costUsd: Number(s.costUsd || 0),   // estimated AI cost for this session
  }
}

import { buildCompanyInvoice } from './company_invoice.js'

export function registerWorkAdminRoutes(app, deps = {}) {
  const { store, requireAuth, requireAdmin, requireSuperAdmin, wrap } = deps
  if (!app || !store || !requireAuth || !requireAdmin || !wrap) {
    throw new Error('registerWorkAdminRoutes: missing required deps (app, store, requireAuth, requireAdmin, wrap)')
  }
  // A plain pass-through when wrap is given; keeps the same try/catch shape.
  const w = (fn) => wrap(fn)

  // -- Overview: headline aggregates + the signed-in viewer's role (so the UI
  //    can gate superadmin-only write controls without guessing). -------------
  app.get('/api/work/admin/overview', requireAuth, requireAdmin, w((req, res) => {
    const roster = workRoster(store)
    const byTier = { basic: 0, advanced: 0, premium: 0 }
    let purchasedSeconds = 0
    for (const r of roster) {
      let tier = 'basic'
      try { tier = store.getWorkTier(r.id) } catch { tier = 'basic' }
      if (byTier[tier] == null) byTier[tier] = 0
      byTier[tier] += 1
      try { purchasedSeconds += (store.getWorkUsage(r.id).purchasedSeconds || 0) } catch { /* skip */ }
    }

    const sessions = allWorkSessions(store, roster)
    const today = easternDay(Date.now())
    const activeCut = Date.now() - 5 * 60 * 1000
    let sessionsToday = 0
    let activeNow = 0
    for (const s of sessions) {
      if (s.startedAt && easternDay(Date.parse(s.startedAt)) === today) sessionsToday += 1
      if ((s.status || 'active') === 'active' && !s.paused && (s.lastActivityAt || 0) >= activeCut) activeNow += 1
    }

    let platformConfigured = false
    try { platformConfigured = !!store.getActiveRuntime() } catch { platformConfigured = false }
    const platformAiAllowed = (() => { try { return !!store.getWorkPlatformAllowed() } catch { return false } })()

    res.json({
      viewer: {
        username: req.user.username,
        role: req.user.role,
        isSuperAdmin: req.user.role === 'superadmin',
      },
      stats: {
        totalUsers: roster.length,
        byTier,
        sessionsToday,
        activeNow,
        totalSessions: sessions.length,
        purchasedHoursOutstanding: Math.round((purchasedSeconds / 3600) * 10) / 10,
        platformAiAllowed,
        platformConfigured,
        platformReady: platformAiAllowed && platformConfigured,
      },
    })
  }))

  // -- Users: every WorkCoPilot user with tier + today's balance + session count.
  app.get('/api/work/admin/users', requireAuth, requireAdmin, w((req, res) => {
    const roster = workRoster(store)
    let companyList = []
    try { companyList = (store.listCompanies() || []).map((c) => ({ id: c.id, name: c.name })) } catch { companyList = [] }
    const companyNameById = new Map(companyList.map((c) => [c.id, c.name]))
    const sessions = allWorkSessions(store, roster)
    const countById = new Map()
    for (const s of sessions) {
      const k = s.workUserId || (s.userId || null)
      if (k) countById.set(k, (countById.get(k) || 0) + 1)
    }
    const users = roster.map((r) => {
      let usage = null
      try { usage = store.getWorkUsage(r.id) } catch { usage = null }
      const wu = (() => { try { return store.getWorkUser(r.id) } catch { return null } })()
      return {
        id: r.id,
        username: r.username,
        displayName: (wu && wu.displayName) || null,
        tier: usage ? usage.tier : ((() => { try { return store.getWorkTier(r.id) } catch { return 'basic' } })()),
        dailySeconds: usage ? usage.dailySeconds : 0,
        usedSeconds: usage ? usage.usedSeconds : 0,
        freeLeftSeconds: usage ? usage.freeLeft : 0,
        purchasedSeconds: usage ? usage.purchasedSeconds : 0,
        remainingSeconds: usage ? usage.remainingSeconds : 0,
        exhausted: usage ? !!usage.exhausted : false,
        sessionCount: countById.get(r.id) || 0,
        // Tenancy so the console can show + change a user's company and role.
        companyId: (wu && wu.companyId) || null,
        companyRole: (wu && wu.companyRole) || null,
        companyName: (wu && wu.companyName) || (wu && wu.companyId ? companyNameById.get(wu.companyId) : null) || null,
        role: r.role || 'user',
      }
    }).sort((a, b) => a.username.localeCompare(b.username))
    res.json({ users, tiers: store.WORK_TIERS || ['basic', 'advanced', 'premium'], companies: companyList })
  }))

  // -- Sessions: recent sessions across all users (newest first, capped). ------
  app.get('/api/work/admin/sessions', requireAuth, requireAdmin, w((req, res) => {
    const roster = workRoster(store)
    const nameById = new Map(roster.map((r) => [r.id, r.username]))
    const raw = allWorkSessions(store, roster)
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200))
    const sessions = raw
      .slice()
      .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))
      .slice(0, limit)
      .map((s) => sessionRow(s, nameById))
    res.json({ sessions, total: raw.length })
  }))

  // -- AI state: booleans only (SUPREME RULE III - surface state, never leak a
  //    key or a provider/model name). Complements the existing platform-ai
  //    toggle at GET/POST /api/work/admin/platform-ai (not re-registered here).
  app.get('/api/work/admin/ai-state', requireAuth, requireAdmin, w((req, res) => {
    const platformAiAllowed = (() => { try { return !!store.getWorkPlatformAllowed() } catch { return false } })()
    let platformConfigured = false
    try { platformConfigured = !!store.getActiveRuntime() } catch { platformConfigured = false }
    res.json({
      platformAiAllowed,
      platformConfigured,
      platformReady: platformAiAllowed && platformConfigured,
    })
  }))

  // -- Support tickets (superadmin responds). Users open tickets from their
  //    dashboard (routes in index.js); here the superadmin reads them all,
  //    replies, and sets status. requireSuperAdmin when present, else the
  //    admin gate (both keep it to trusted operators).
  const superGate = requireSuperAdmin || requireAdmin
  app.get('/api/work/admin/tickets', requireAuth, superGate, w((req, res) => {
    const status = req.query.status ? String(req.query.status) : null
    const category = req.query.category ? String(req.query.category) : null
    const tickets = store.listAllWorkTickets({ status, category })
    const counts = { open: 0, answered: 0, closed: 0 }
    for (const t of store.listAllWorkTickets({})) if (counts[t.status] != null) counts[t.status]++
    res.json({ tickets, counts, categories: store.workTicketCategories() })
  }))
  app.get('/api/work/admin/tickets/:id', requireAuth, superGate, w((req, res) => {
    const t = store.getWorkTicket(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json(t)
  }))
  app.post('/api/work/admin/tickets/:id/reply', requireAuth, superGate, w((req, res) => {
    const t = store.getWorkTicket(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const text = String((req.body && req.body.text) || '').trim()
    if (!text) return res.status(400).json({ error: 'Write a reply.' })
    res.json(store.addWorkTicketMessage(req.params.id, { from: 'admin', by: req.user.username, text }))
  }))
  app.post('/api/work/admin/tickets/:id/status', requireAuth, superGate, w((req, res) => {
    const t = store.getWorkTicket(req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    res.json(store.setWorkTicketStatus(req.params.id, String((req.body && req.body.status) || '')))
  }))

  // -- Tenancy (superadmin): companies, managed users, and the per-user /
  //    per-company PII-PHI scrub policy. Company admins get their own scoped
  //    routes in index.js; these are the global superadmin controls.
  app.get('/api/work/admin/companies', requireAuth, superGate, w((req, res) => {
    res.json({ companies: store.listCompanies() })
  }))
  app.post('/api/work/admin/companies', requireAuth, superGate, w((req, res) => {
    const b = req.body || {}
    const c = store.createCompany({
      name: b.name, plan: b.plan, seats: b.seats, seatsByTier: b.seatsByTier,
      adminSeats: b.adminSeats, licenseMode: b.licenseMode, ssoProvisioning: b.ssoProvisioning,
      scrub: b.scrub, profile: b.profile, pricing: b.pricing,
    })
    // AI source is set after creation (the store has a dedicated setter + null
    // default). The setter rejects an unknown value with a 400, so validate it up
    // front rather than creating the company and then failing.
    if (b.aiSource && !['platform', 'company'].includes(String(b.aiSource))) return res.status(400).json({ error: 'AI source must be platform or company.' })
    if (b.aiSource) store.setCompanyAiSource(c.id, b.aiSource)
    res.json(store.getCompany(c.id))
  }))
  app.get('/api/work/admin/companies/:id', requireAuth, superGate, w((req, res) => {
    const c = store.getCompany(req.params.id)
    if (!c) return res.status(404).json({ error: 'Company not found' })
    res.json({ company: c, users: store.listCompanyUsers(req.params.id) })
  }))
  app.patch('/api/work/admin/companies/:id', requireAuth, superGate, w((req, res) => {
    res.json(store.updateCompany(req.params.id, req.body || {}))
  }))
  app.post('/api/work/admin/companies/:id/scrub', requireAuth, superGate, w((req, res) => {
    res.json(store.updateCompany(req.params.id, { scrub: !!(req.body && req.body.enabled) }))
  }))
  // Superadmin: set a company's CORPORATE AI keys (we manage them per company so we
  // attribute usage per company). An empty apiKey clears them.
  app.post('/api/work/admin/companies/:id/ai-keys', requireAuth, superGate, w((req, res) => {
    const { providerId, apiKey, chatModel, visionModel } = req.body || {}
    res.json(store.setCompanyAiKeys(req.params.id, { providerId, apiKey, chatModel, visionModel }, 'corporate'))
  }))
  // Superadmin: per-company AI consumption (estimated $), who used what.
  app.get('/api/work/admin/companies/:id/consumption', requireAuth, superGate, w((req, res) => {
    res.json(store.companyConsumption(req.params.id))
  }))
  // Superadmin: the license + usage dashboard for any company.
  app.get('/api/work/admin/companies/:id/licenses', requireAuth, superGate, w((req, res) => {
    res.json(store.companyLicenseSummary(req.params.id))
  }))
  // Superadmin: pre-provision a company member or admin BY EMAIL (SSO, no
  // password). This is how the first company admin is seeded so they can sign in
  // through SSO before anyone has a password. Works even in locked license mode.
  app.post('/api/work/admin/companies/:id/members', requireAuth, superGate, w((req, res) => {
    const { email, companyRole, tier, displayName } = req.body || {}
    res.json({ user: store.addCompanyMemberByEmail({ companyId: req.params.id, email, companyRole, tier, displayName }) })
  }))
  // Superadmin: remove a company member (any mode). Reversible detach.
  app.delete('/api/work/admin/companies/:id/members/:uid', requireAuth, superGate, w((req, res) => {
    const reason = String((req.body && req.body.reason) || '').trim()
    if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to remove a member (recorded in the audit trail).' })
    res.json(store.removeCompanyMember(req.params.id, req.params.uid, { reason, byUserId: req.user.id }))
  }))
  // Superadmin: add minutes to a company's shared pool (negative removes).
  app.post('/api/work/admin/companies/:id/pool-minutes', requireAuth, superGate, w((req, res) => {
    const minutes = Number((req.body || {}).minutes)
    if (!Number.isFinite(minutes) || minutes === 0) return res.status(400).json({ error: 'Enter a number of minutes (negative removes).' })
    res.json(store.grantCompanyPoolSeconds(req.params.id, Math.round(minutes * 60)))
  }))
  // Superadmin: set a company's per-company price overrides (merged over global).
  app.post('/api/work/admin/companies/:id/pricing', requireAuth, superGate, w((req, res) => {
    res.json(store.updateCompany(req.params.id, { pricing: (req.body || {}).pricing || null }))
  }))
  // Superadmin: a company's assembled bill (seat charges computed live + ledger).
  app.get('/api/work/admin/companies/:id/billing', requireAuth, superGate, w((req, res) => {
    res.json(store.companyBilling(req.params.id))
  }))
  // Superadmin: add / remove a billable line item (extra hours sold, adjustments).
  app.post('/api/work/admin/companies/:id/billing/items', requireAuth, superGate, w((req, res) => {
    res.json(store.addCompanyBillingItem(req.params.id, req.body || {}))
  }))
  app.delete('/api/work/admin/companies/:id/billing/items/:itemId', requireAuth, superGate, w((req, res) => {
    const reason = String((req.body && req.body.reason) || '').trim()
    if (reason.length < 3) return res.status(400).json({ error: 'A reason is required to remove a billing line item (recorded in the audit trail).' })
    res.json(store.removeCompanyBillingItem(req.params.id, req.params.itemId, { reason, byUserId: req.user.id }))
  }))
  // Superadmin: download the company invoice / statement as a branded PDF.
  app.get('/api/work/admin/companies/:id/invoice.pdf', requireAuth, superGate, w((req, res) => {
    const statement = store.companyBilling(req.params.id)
    const safe = String(statement.name || 'company').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'company'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="workcopilot-invoice-${safe}.pdf"`)
    buildCompanyInvoice(statement).pipe(res)
  }))
  // System incidents (superadmin): the REAL causes behind the generic "system is
  // busy" message users see. AI provider quota/key/5xx failures, timeouts, and
  // unexpected errors, so the operator can fix billing, keys or the model.
  app.get('/api/work/admin/incidents', requireAuth, superGate, w((req, res) => {
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 300))
    res.json({ incidents: store.listWorkIncidents({ limit }), total: store.workIncidentCount() })
  }))
  // Leads: the public "Validate it live" captures (superadmin). Append-only log
  // with a timestamp + which page each came from.
  app.get('/api/work/admin/leads', requireAuth, superGate, w((req, res) => {
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit, 10) || 1000))
    const leads = typeof store.listWorkLeads === 'function' ? store.listWorkLeads({ limit }) : []
    res.json({ leads, total: typeof store.workLeadCount === 'function' ? store.workLeadCount() : leads.length })
  }))

  // Create a user (optionally into a company, as member or company_admin).
  // `free: true` grants comped access (use the service without Stripe).
  app.post('/api/work/admin/users', requireAuth, superGate, w((req, res) => {
    const { username, password, companyId, companyRole, tier, scrub, free } = req.body || {}
    res.json(store.createManagedUser({ username, password, companyId: companyId || null, companyRole, tier, scrub: !!scrub, free: !!free }))
  }))
  app.post('/api/work/admin/users/:id/scrub', requireAuth, superGate, w((req, res) => {
    res.json(store.setWorkUserScrub(req.params.id, !!(req.body && req.body.enabled)))
  }))
  // Grant/revoke free (comped) access for a user - no Stripe needed.
  app.post('/api/work/admin/users/:id/access', requireAuth, superGate, w((req, res) => {
    res.json(store.setUserFreeAccess(req.params.id, !!(req.body && req.body.free)))
  }))
  app.post('/api/work/admin/users/:id/company', requireAuth, superGate, w((req, res) => {
    const { companyId, companyRole } = req.body || {}
    res.json(store.setUserCompany(req.params.id, companyId || null, companyRole))
  }))
}

export default { registerWorkAdminRoutes }
