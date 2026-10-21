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

  // Reads (requireAuth + requireAdmin) - server/work-admin.js
  overview: () => request('GET', '/api/work/admin/overview'),
  users: () => request('GET', '/api/work/admin/users'),
  sessions: (limit) => request('GET', `/api/work/admin/sessions${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  leads: (limit) => request('GET', `/api/work/admin/leads${limit ? `?limit=${encodeURIComponent(limit)}` : ''}`),
  aiState: () => request('GET', '/api/work/admin/ai-state'),

  // Platform AI toggle (existing: GET requireAdmin, POST superadmin-only)
  getPlatformAi: () => request('GET', '/api/work/admin/platform-ai'),
  setPlatformAi: (allowed) => request('POST', '/api/work/admin/platform-ai', { allowed: !!allowed }),

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
