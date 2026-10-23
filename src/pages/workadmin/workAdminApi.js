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
  sessions: (limit) => request('GET', `/api/work/admin/sessions${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  leads: (limit) => request('GET', `/api/work/admin/leads${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  incidents: (limit) => request('GET', `/api/work/admin/incidents${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  aiState: () => request('GET', '/api/work/admin/ai-state'),

  // Platform AI toggle (existing: GET requireAdmin, POST superadmin-only)
  getPlatformAi: () => request('GET', '/api/work/admin/platform-ai'),
  setPlatformAi: (allowed) => request('POST', '/api/work/admin/platform-ai', { allowed: !!allowed }),

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
  // Remove a provider's key (active hands off to another configured one).
  clearAiProvider: (id) => request('DELETE', `/api/work/admin/ai/providers/${encodeURIComponent(id)}`),
  // Key POOL: add another key (load spreads round-robin) or remove one by index.
  addAiProviderKey: (id, apiKey) => request('POST', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/keys`, { apiKey }),
  removeAiProviderKey: (id, index) => request('DELETE', `/api/work/admin/ai/providers/${encodeURIComponent(id)}/keys/${encodeURIComponent(index)}`),
  // CUSTOM provider: add any OpenAI-compatible endpoint, or remove one.
  addCustomProvider: (body) => request('POST', '/api/work/admin/ai/custom', body || {}),
  removeCustomProvider: (id) => request('DELETE', `/api/work/admin/ai/custom/${encodeURIComponent(id)}`),

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
  setWebSearch: (apiKey, provider) => request('POST', '/api/work/admin/web-search', { apiKey, provider }),
  // A company's own web-search key (superadmin). apiKey:'' clears.
  companyWebSearch: (id, apiKey, provider) => request('POST', `/api/work/admin/companies/${id}/web-search`, { apiKey, provider }),

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
  companyAiKeys: (id, body) => request('POST', `/api/work/admin/companies/${id}/ai-keys`, body || {}),
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
  createUser: (body) => request('POST', '/api/work/admin/users', body),
  userScrub: (id, enabled) => request('POST', `/api/work/admin/users/${id}/scrub`, { enabled: !!enabled }),
  userFreeAccess: (id, free) => request('POST', `/api/work/admin/users/${id}/access`, { free: !!free }),
  userCompany: (id, companyId, companyRole) => request('POST', `/api/work/admin/users/${id}/company`, { companyId, companyRole }),

  // Per-user writes (existing: superadmin-only). userId is the account id.
  setTier: (userId, tier) => request('POST', '/api/work/admin/tier', { userId, tier }),
  // Grant purchased time. The server takes minutes; the UI collects hours.
  grantHours: (userId, hours) => request('POST', '/api/work/admin/grant-minutes', { userId, minutes: Math.round((Number(hours) || 0) * 60) }),

  // Governance (DLP) policy per company. GET returns the policy + framework
  // presets + the category list; POST saves it. Superadmin manages any company.
  policy: (companyId) => request('GET', `/api/work/policy?companyId=${encodeURIComponent(companyId)}`),
  setPolicy: (body) => request('POST', '/api/work/policy', body),

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
  cancelUserSubscription: (id, atPeriodEnd) => request('POST', `/api/work/admin/users/${id}/cancel-subscription`, { atPeriodEnd: !!atPeriodEnd }),
}

export default workAdminApi
