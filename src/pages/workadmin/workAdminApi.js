// Self-contained fetch client for the WorkCoPilot admin console.
//
// Decoupled on purpose: this does NOT import the shared src/api.js, so the whole
// WorkCoPilot surface can be lifted out as a standalone product later. It mirrors
// the same session conventions (same-origin, cookie session, the desktop-app
// header) without sharing code.
//
// Reads hit the new /api/work/admin/* endpoints registered by
// server/work-admin.js. Writes reuse the existing endpoints already in
// server/index.js (set tier, grant minutes, set pricing, platform-AI toggle),
// so there is one source of truth for each mutation.

const IS_APP = typeof window !== 'undefined' && !!window.refigold

async function request(method, url, body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (IS_APP) headers['X-Refigold-App'] = '1'
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: Object.keys(headers).length ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (networkError) {
    const err = new Error('Could not reach the server. Check your connection and try again.')
    err.status = 0
    err.cause = networkError
    throw err
  }
  let data = null
  try { data = await res.json() } catch { /* no JSON body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const workAdminApi = {
  // Identity / gate. The console gates on the admin read endpoints returning
  // 401/403; overview also carries the viewer role for superadmin-only controls.
  me: () => request('GET', '/api/work/me'),
  logout: () => request('POST', '/api/work/logout'),

  // Reads (requireAuth + requireAdmin) - server/work-admin.js
  overview: () => request('GET', '/api/work/admin/overview'),
  users: () => request('GET', '/api/work/admin/users'),
  // Sessions: live-first, paginated, last 7 days. page/pageSize (pageSize <= 100).
  sessions: (page = 1, pageSize = 25) => request('GET', `/api/work/admin/sessions?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`),
  // Rich "View" detail: progress, premium calls, round-robins, refinements, cost,
  // remaining minutes, live/active.
  sessionDetail: (id) => request('GET', `/api/work/admin/sessions/${encodeURIComponent(id)}`),
  deleteSession: (id, reason) => request('DELETE', `/api/work/admin/sessions/${encodeURIComponent(id)}`, { reason }),
  leads: (limit) => request('GET', `/api/work/admin/leads${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  // Subscribers: every paying subscriber + their operations (superadmin). Shape:
  // { subscribers: [ { id, username, email, plan, status, cycle, since,
  //   currentPeriodEnd, mrrUsd, lifetimeUsd, tasksToday, hoursUsedToday,
  //   sessionCount, lastActive, companyName, free } ],
  //   totals: { count, activeCount, mrrUsd, byPlan: { lite, basic, advanced, premium } } }.
  // Endpoint is implemented by the server agent; the UI codes defensively (it may
  // 404/501 until wired, and any field may be null).
  subscribers: () => request('GET', '/api/work/admin/subscribers'),
  // Cancelled (churned) subscribers (superadmin + accounting). Shape:
  // { cancelled: [ { id, username, email, plan, status:'canceled', cycle, since,
  //   canceledAt, reason, lifetimeUsd, companyName } ],
  //   totals: { count, lifetimeUsd } }.
  // Endpoint is implemented by the server agent; the UI codes defensively (it may
  // 404/501 until wired, and any field may be null).
  subscribersCancelled: () => request('GET', '/api/work/admin/subscribers/cancelled'),
  incidents: (limit) => request('GET', `/api/work/admin/incidents${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  aiState: () => request('GET', '/api/work/admin/ai-state'),

  // Platform AI toggle (existing: GET requireAdmin, POST superadmin-only)
  getPlatformAi: () => request('GET', '/api/work/admin/platform-ai'),
  setPlatformAi: (allowed) => request('POST', '/api/work/admin/platform-ai', { allowed: !!allowed }),

  // SMTP / email (SES) - superadmin only. The password is write-only (the view
  // only reports whether one is set). Test sends a real email with the saved config.
  getSmtp: () => request('GET', '/api/work/admin/smtp'),
  setSmtp: (body) => request('POST', '/api/work/admin/smtp', body || {}),
  testSmtp: (to) => request('POST', '/api/work/admin/smtp/test', { to }),

  // Finance (superadmin + accounting role): all transactions, period summary,
  // refunds, and accounting-role management.
  financeSummary: () => request('GET', '/api/work/admin/finance/summary'),
  financeTransactions: (q) => request('GET', `/api/work/admin/finance/transactions${q ? `?${q}` : ''}`),
  financeRefund: (txId, amount, reason) => request('POST', `/api/work/admin/finance/transactions/${encodeURIComponent(txId)}/refund`, { ...(amount != null ? { amount } : {}), ...(reason ? { reason } : {}) }),
  financeStaff: () => request('GET', '/api/work/admin/finance/staff'),
  financeSetRole: (userId, role, reason) => request('POST', '/api/work/admin/finance/role', { userId, role, ...(reason ? { reason } : {}) }),
  // Revenue + MRR timeseries for the accounting dashboard charts. granularity is
  // one of week|month|quarter|year. Shape: { granularity, series: [ { bucket,
  //   label, revenueUsd, refundsUsd, netUsd, mrrUsd, newSubs, cancellations } ] }.
  // Implemented by the server agent; the UI codes defensively (may 404/501 until
  // wired, and any field may be null).
  financeTimeseries: (granularity) => request('GET', `/api/work/admin/finance/timeseries?granularity=${encodeURIComponent(granularity || 'month')}`),
  // Manual ledger entries (superadmin + accounting). Full CRUD on adjustment
  // transactions - every money/destructive call carries a REASON (logged).
  // create: { amount, currency, kind:'adjustment', description, reason }.
  createTransaction: (body) => request('POST', '/api/work/admin/finance/transactions', body || {}),
  // update: patch the note/description of a manual entry (not an amount).
  updateTransaction: (id, patch) => request('PATCH', `/api/work/admin/finance/transactions/${encodeURIComponent(id)}`, patch || {}),
  // delete/void a manual entry (destructive - reason required).
  deleteTransaction: (id, reason) => request('DELETE', `/api/work/admin/finance/transactions/${encodeURIComponent(id)}`, reason ? { reason } : undefined),

  // Notification recipients (Contact Us + leads) + thank-you toggle.
  getNotify: () => request('GET', '/api/work/admin/notify'),
  setNotify: (body) => request('POST', '/api/work/admin/notify', body || {}),
  contacts: (limit) => request('GET', `/api/work/admin/contacts${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),

  // Business-claims traceability (superadmin, behind the shared authenticator
  // step-up - same lock as AI config). Returns { claims, summary, attestation }.
  claims: () => request('GET', '/api/work/admin/claims'),
  claimsMdUrl: '/api/work/admin/claims.md',

  // Editable email templates: list all, save one, reset one, live-preview one.
  emailTemplates: () => request('GET', '/api/work/admin/email-templates'),
  saveEmailTemplate: (type, body) => request('POST', `/api/work/admin/email-templates/${encodeURIComponent(type)}`, body || {}),
  resetEmailTemplate: (type) => request('POST', `/api/work/admin/email-templates/${encodeURIComponent(type)}/reset`, {}),
  previewEmailTemplate: (type, body) => request('POST', `/api/work/admin/email-templates/${encodeURIComponent(type)}/preview`, body || {}),

  // AI-config OTP step-up (superadmin). The page shows/changes nothing until a
  // fresh authenticator code opens a short window. GET is ungated (tells the UI
  // lock state); POST verifies a code; DELETE locks immediately.
  aiStepUp: () => request('GET', '/api/work/admin/ai/stepup'),
  verifyAiStepUp: (code) => request('POST', '/api/work/admin/ai/stepup', { code }),
  lockAiConfig: () => request('DELETE', '/api/work/admin/ai/stepup'),

  // Platform AI PROVIDERS (superadmin): see every AI, enter a key, test, pin.
  // The list never carries a raw key - only a masked tail + configured/active.
  aiProviders: () => request('GET', '/api/work/admin/ai/providers'),
  // Save a key (optionally pin chat/vision model) AND test it in one call.
  setAiProvider: (id, body) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}`, body || {}),
  // Re-test a provider already configured, without re-typing the key.
  testAiProvider: (id) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/test`),
  // Make a configured provider the active/primary platform runtime.
  activateAiProvider: (id) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/activate`),
  // VISION is chosen separately from the chat primary (owner 2026-10-27): the
  // provider (and optionally one of its models) that READS THE SCREEN. id 'auto'
  // clears the pick so the built-in preference order applies again.
  setAiVision: (id, model) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/vision`, model ? { model } : {}),
  // Remove a provider's key (active hands off to another configured one). A
  // reason is captured by the UI confirm and sent when present (logged); the
  // no-reason call stays byte-identical for backward compatibility.
  clearAiProvider: (id, reason) => request('DELETE', `/api/work/admin/ai/providers/${encodeURIComponent(id)}`, reason ? { reason } : undefined),
  // Key POOL: add another key (load spreads round-robin) or remove one by index.
  addAiProviderKey: (id, apiKey) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/keys`, { apiKey }),
  removeAiProviderKey: (id, index, reason) => request('DELETE', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/keys/${encodeURIComponent(index)}`, reason ? { reason } : undefined),
  // CUSTOM provider: add any OpenAI-compatible endpoint, or remove one.
  addCustomProvider: (body) => request('POST', '/api/work/admin/ai/custom', body || {}),
  removeCustomProvider: (id, reason) => request('DELETE', `/api/work/admin/ai/custom/${encodeURIComponent(id)}`, reason ? { reason } : undefined),

  // Platform social sign-in apps (Google / Microsoft / Facebook) for the public
  // sign-in buttons. PLATFORM level (one app each), superadmin-only. The secret is
  // set-only: GET carries only { configured, clientIdMasked, tenant, setAt }.
  // POST with empty clientId + clientSecret clears that provider. POST is behind
  // the shared AI step-up window.
  getSocial: () => request('GET', '/api/work/admin/social'),
  setSocial: (provider, body) => request('POST', `/api/work/admin/social/${encodeURIComponent(provider)}`, body || {}),

  // Plan-heavy / watch-light: superadmin forces it ON for premium users (our model;
  // users have no control). GET readable by any admin; POST superadmin-only.
  getWatchLight: () => request('GET', '/api/work/admin/watch-light'),
  setWatchLight: (on) => request('POST', '/api/work/admin/watch-light', { on: !!on }),
  // Homepage hero copy (GET admin; POST superadmin). pairs = [{h,s,em}]; an empty
  // array restores the built-in default.
  getHero: () => request('GET', '/api/work/admin/hero'),
  setHero: (pairs) => request('POST', '/api/work/admin/hero', { pairs: pairs || [] }),
  // Platform data-retention window in days (0 = keep forever). GET admin; POST superadmin.
  getRetention: () => request('GET', '/api/work/admin/retention'),
  setRetention: (retentionDays) => request('POST', '/api/work/admin/retention', { retentionDays }),

  // Platform web-search (Tavily) key for live web learning (GET admin; POST
  // superadmin). Returns { configured, provider, keyMasked, setAt, envFallback };
  // send apiKey:'' to clear. Never returns the raw key.
  getWebSearch: () => request('GET', '/api/work/admin/web-search'),
  setWebSearch: (apiKey, provider, reason) => request('POST', '/api/work/admin/web-search', { apiKey, provider, ...(reason ? { reason } : {}) }),
  // A company's own web-search key (superadmin). apiKey:'' clears.
  companyWebSearch: (id, apiKey, provider, reason) => request('POST', `/api/work/admin/companies/${id}/web-search`, { apiKey, provider, ...(reason ? { reason } : {}) }),

  // Best + cheapest model recommendation across configured providers (cached,
  // daily). refresh:true forces a live recompute. Shape: { at, providers:[...],
  // overall:{cheapest,cheapestVision,best}, note }.
  aiRecommendation: (refresh) => request('GET', `/api/work/admin/ai-recommendation${refresh ? '?refresh=1' : ''}`),

  // Pricing (existing: GET public, POST superadmin-only)
  getPricing: () => request('GET', '/api/work/pricing'),
  setPricing: (patch) => request('POST', '/api/work/admin/pricing', patch || {}),

  // Tenancy (superadmin): companies, managed users, scrub policy.
  companies: () => request('GET', '/api/work/admin/companies'),
  createCompany: (body) => request('POST', '/api/work/admin/companies', body),
  company: (id) => request('GET', `/api/work/admin/companies/${id}`),
  updateCompany: (id, patch) => request('PATCH', `/api/work/admin/companies/${id}`, patch),
  companyScrub: (id, enabled) => request('POST', `/api/work/admin/companies/${id}/scrub`, { enabled: !!enabled }),
  companyAiKeys: (id, body) => request('POST', `/api/work/admin/companies/${id}/ai-keys`, body || {}),  // clearing passes { apiKey:'', reason }
  companyConsumption: (id) => request('GET', `/api/work/admin/companies/${id}/consumption`),
  // License + usage dashboard for one company (seat pools, per-tier allocation,
  // minute pool, AI readiness, each member's usage).
  companyLicenses: (id) => request('GET', `/api/work/admin/companies/${id}/licenses`),
  // Pre-provision a member or admin BY EMAIL (SSO, no password), or remove one.
  addCompanyMember: (id, body) => request('POST', `/api/work/admin/companies/${id}/members`, body || {}),
  removeCompanyMember: (id, uid, reason) => request('DELETE', `/api/work/admin/companies/${id}/members/${uid}`, { reason }),
  resetUserMfa: (uid, reason) => request('POST', `/api/work/admin/users/${uid}/mfa/reset`, { reason }),
  // Add minutes to the shared company pool (server takes minutes).
  poolMinutes: (id, minutes) => request('POST', `/api/work/admin/companies/${id}/pool-minutes`, { minutes: Number(minutes) || 0 }),
  // Guidance depth CEILING for a company ('standard' | 'deep'): the grant its admin
  // distributes within. Returns { guidanceDepth } (the saved value, confirmed back).
  setCompanyGuidanceDepth: (id, depth) => request('POST', `/api/work/admin/companies/${encodeURIComponent(id)}/guidance-depth`, { depth }),

  // ---- Enterprise billing + quota hierarchy (superadmin, per company) --------
  // Set the monthly pool, task policy, overage price, timezone, month-end
  // behavior and the request/Stripe toggles. Validated + atomic server-side.
  companyEnterprise: (id, body) => request('POST', `/api/work/admin/companies/${id}/enterprise`, body || {}),
  // Live pool + per-user consumption (reflects the rules set above).
  companyPool: (id) => request('GET', `/api/work/admin/companies/${id}/pool`),
  // Top up (or correct) the live pool now, in minutes.
  companyPoolGrant: (id, minutes) => request('POST', `/api/work/admin/companies/${id}/pool/grant`, { minutes: Number(minutes) || 0 }),
  // Additional-hours requests from the company admin: list + approve/deny.
  companyHourRequests: (id) => request('GET', `/api/work/admin/companies/${id}/hour-requests`),
  decideHourRequest: (id, rid, approve, note) => request('POST', `/api/work/admin/companies/${id}/hour-requests/${rid}/decide`, { approve: !!approve, ...(note ? { note } : {}) }),
  // Superadmin notifications inbox (pool-threshold + hour-request alerts).
  adminNotifications: (limit) => request('GET', `/api/work/admin/notifications${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  markAdminNotification: (id) => request('POST', '/api/work/admin/notifications/read', id ? { id } : {}),
  // Per-company price overrides (merged over the global pricing).
  setCompanyPricing: (id, pricing) => request('POST', `/api/work/admin/companies/${id}/pricing`, { pricing: pricing || null }),
  // Billing: the assembled statement, ledger line-item add/remove, invoice PDF.
  companyBilling: (id) => request('GET', `/api/work/admin/companies/${id}/billing`),
  addBillingItem: (id, item) => request('POST', `/api/work/admin/companies/${id}/billing/items`, item || {}),
  removeBillingItem: (id, itemId, reason) => request('DELETE', `/api/work/admin/companies/${id}/billing/items/${itemId}`, { reason }),
  invoiceUrl: (id) => `/api/work/admin/companies/${id}/invoice.pdf`,
  // SSO (OIDC) per company. GET returns non-secret status; POST sets the config
  // (leave clientSecret empty to keep the stored one unchanged).
  companySso: (id) => request('GET', `/api/work/admin/companies/${id}/sso`),
  setCompanySso: (id, cfg) => request('POST', `/api/work/admin/companies/${id}/sso`, cfg || {}),
  // "Single sign-on required" for every account of a company (superadmin).
  setCompanySsoRequired: (id, required, reason) => request('POST', `/api/work/admin/companies/${id}/sso-required`, { required: !!required, reason: reason || '' }),
  // B2B contract + invoices (server/b2b_routes.js). No card payment anywhere.
  b2bInvoices: (status) => request('GET', `/api/work/admin/b2b/invoices${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  b2bCompany: (id) => request('GET', `/api/work/admin/b2b/companies/${id}`),
  b2bSetContract: (id, contract) => request('POST', `/api/work/admin/b2b/companies/${id}/contract`, contract || {}),
  b2bCreateInvoice: (id, invoice) => request('POST', `/api/work/admin/b2b/companies/${id}/invoices`, invoice || {}),
  b2bSetInvoiceStatus: (id, invoiceId, status, note) => request('POST', `/api/work/admin/b2b/companies/${id}/invoices/${invoiceId}/status`, { status, note: note || '' }),
  b2bInvoicePdfUrl: (id, invoiceId) => `/api/work/admin/b2b/companies/${id}/invoices/${invoiceId}.pdf`,
  createUser: (body) => request('POST', '/api/work/admin/users', body),
  userScrub: (id, enabled) => request('POST', `/api/work/admin/users/${id}/scrub`, { enabled: !!enabled }),
  userFreeAccess: (id, free) => request('POST', `/api/work/admin/users/${id}/access`, { free: !!free }),
  // Set (or clear) a user's company, their company role and their work flow
  // (worker / independent / mixed); the server validates both against its registry.
  userCompany: (id, companyId, companyRole, workFlow) => request('POST', `/api/work/admin/users/${id}/company`, { companyId, companyRole, ...(workFlow ? { workFlow } : {}) }),
  // Support tool (superadmin): open the dashboard AS an individual user. The
  // server switches this browser session to that user, audits who/when, and
  // 400s for company members (owner rule: company impersonation is excluded).
  // Returns { ok, user }; the caller then navigates to /work.
  impersonate: (id) => request('POST', `/api/work/admin/impersonate/${encodeURIComponent(id)}`, {}),

  // Per-user writes (existing: superadmin-only). userId is the account id.
  setTier: (userId, tier) => request('POST', '/api/work/admin/tier', { userId, tier }),
  // Grant purchased time. The server takes minutes; the UI collects hours.
  grantHours: (userId, hours) => request('POST', '/api/work/admin/grant-minutes', { userId, minutes: Math.round((Number(hours) || 0) * 60) }),

  // Governance (DLP) policy per company. GET returns the policy + framework
  // presets + the category list; POST saves it. Superadmin manages any company.
  policy: (companyId) => request('GET', `/api/work/policy?companyId=${encodeURIComponent(companyId)}`),
  setPolicy: (body) => request('POST', '/api/work/policy', body),
  // Extract enforceable guidance rules (forbid/require) from a pasted policy doc.
  extractPolicyRules: (body) => request('POST', '/api/work/policy/rules/extract', body),

  // Stripe billing config (superadmin). GET returns booleans + ids only (never a
  // secret); POST writes config (secrets are write-only, blank keeps stored).
  getBilling: () => request('GET', '/api/work/admin/billing'),
  setBilling: (patch) => request('POST', '/api/work/admin/billing', patch || {}),
  // Validate the stored config against Stripe (secret key + each plan price).
  testBilling: () => request('POST', '/api/work/admin/billing/test'),
  // Per-user Stripe actions (superadmin). refund with no id refunds the latest
  // charge; cancel ends the subscription (atPeriodEnd keeps it to period end).
  userInvoices: (id) => request('GET', `/api/work/admin/users/${id}/invoices`),
  refundUser: (id, body) => request('POST', `/api/work/admin/users/${id}/refund`, body || {}),
  cancelUserSubscription: (id, atPeriodEnd, reason) => request('POST', `/api/work/admin/users/${id}/cancel-subscription`, { atPeriodEnd: !!atPeriodEnd, ...(reason ? { reason } : {}) }),

  // ---- Destructive CRUD (superadmin). Every call sends a REASON (logged). -----
  // Leads / incidents / contacts: delete one or clear all.
  deleteLead: (id, reason) => request('DELETE', `/api/work/admin/leads/${encodeURIComponent(id)}`, { reason }),
  clearLeads: (reason) => request('POST', '/api/work/admin/leads/clear', { reason }),
  deleteIncident: (id, reason) => request('DELETE', `/api/work/admin/incidents/${encodeURIComponent(id)}`, { reason }),
  clearIncidents: (reason) => request('POST', '/api/work/admin/incidents/clear', { reason }),
  deleteContact: (id, reason) => request('DELETE', `/api/work/admin/contacts/${encodeURIComponent(id)}`, { reason }),
  clearContacts: (reason) => request('POST', '/api/work/admin/contacts/clear', { reason }),
  deleteTicket: (id, reason) => request('DELETE', `/api/work/admin/tickets/${encodeURIComponent(id)}`, { reason }),
  // Users: disable (reversible) + delete (hard).
  disableUser: (id, disabled, reason) => request('POST', `/api/work/admin/users/${encodeURIComponent(id)}/disable`, { disabled: !!disabled, reason }),
  deleteUser: (id, reason) => request('DELETE', `/api/work/admin/users/${encodeURIComponent(id)}`, { reason }),
  // Companies: disable (reversible) + delete (detaches members unless deleteMembers).
  disableCompany: (id, disabled, reason) => request('POST', `/api/work/admin/companies/${encodeURIComponent(id)}/disable`, { disabled: !!disabled, reason }),
  deleteCompany: (id, reason, deleteMembers) => request('DELETE', `/api/work/admin/companies/${encodeURIComponent(id)}`, { reason, deleteMembers: !!deleteMembers }),

  // ---- Affiliate program (superadmin or affiliate_admin) ----------------------
  affiliates: (status) => request('GET', `/api/work/admin/affiliates${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  affiliate: (id) => request('GET', `/api/work/admin/affiliates/${encodeURIComponent(id)}`),
  approveAffiliate: (id, ratePct) => request('POST', `/api/work/admin/affiliates/${encodeURIComponent(id)}/approve`, ratePct != null ? { ratePct } : {}),
  rejectAffiliate: (id, reason) => request('POST', `/api/work/admin/affiliates/${encodeURIComponent(id)}/reject`, { reason }),
  suspendAffiliate: (id, suspended, reason) => request('POST', `/api/work/admin/affiliates/${encodeURIComponent(id)}/suspend`, { suspended: !!suspended, reason }),
  setAffiliateRate: (id, ratePct) => request('POST', `/api/work/admin/affiliates/${encodeURIComponent(id)}/rate`, { ratePct }),
  payoutAffiliate: (id) => request('POST', `/api/work/admin/affiliates/${encodeURIComponent(id)}/payout`, {}),
  affiliateConfig: () => request('GET', '/api/work/admin/affiliate-config'),
  setAffiliateConfig: (patch) => request('POST', '/api/work/admin/affiliate-config', patch || {}),
  affiliateStaff: () => request('GET', '/api/work/admin/affiliate-staff'),
  setAffiliateRole: (userId, role) => request('POST', '/api/work/admin/affiliate/role', { userId, role }),
}

export default workAdminApi
