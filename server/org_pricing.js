// ---------------------------------------------------------------------------
// The ONE registry of what an organization pays (owner, 2026-10-30).
// ---------------------------------------------------------------------------
// Pure data plus pure functions, no Node or browser APIs: the marketing pricing
// page (src/components/OrgPlans.jsx), the company admin's billing area and the
// superadmin's invoice form all read these rows, so a price lives in one place.
// It sits in server/ because the server deploy ships server/ only, and the SPA
// imports it directly (like edition_registry.js).
//
// Rules:
//   * Prices are US dollars per user per month.
//   * Every company has at least MIN_USERS users.
//   * Volume pricing: the company's size band sets the rate for EVERY user
//     (5,000 users on the private instance pay $20 each), never graduated
//     brackets.
//   * Managed is one flat rate per user, plus AI billed at actual usage.
// ---------------------------------------------------------------------------

export const CURRENCY = 'usd'
export const MIN_USERS = 100

// Size bands, inclusive. `max: null` is open ended.
export const BANDS = Object.freeze([
  Object.freeze({ id: 'b1', min: 100, max: 1000 }),
  Object.freeze({ id: 'b2', min: 1001, max: 3000 }),
  Object.freeze({ id: 'b3', min: 3001, max: null }),
])

// The plans, in display order. `rates` is per band id; `flat` is one rate for
// any size; `aiAtUsage` means AI is billed on top at actual usage.
export const ORG_PLANS = Object.freeze([
  Object.freeze({ id: 'hosted', rates: Object.freeze({ b1: 199, b2: 149, b3: 99 }), flat: null, aiAtUsage: false }),
  Object.freeze({ id: 'managed', rates: null, flat: 149, aiAtUsage: true }),
  Object.freeze({ id: 'private', rates: Object.freeze({ b1: 40, b2: 30, b3: 20 }), flat: null, aiAtUsage: false }),
])
export const ORG_PLAN_IDS = Object.freeze(ORG_PLANS.map((p) => p.id))

export function orgPlan(id) {
  return ORG_PLANS.find((p) => p.id === id) || null
}

// The band a company of `users` falls in (below the minimum counts as the
// first band: it is billed for MIN_USERS anyway).
export function bandFor(users) {
  const n = Math.max(MIN_USERS, Math.floor(Number(users) || 0))
  return BANDS.find((b) => n >= b.min && (b.max == null || n <= b.max)) || BANDS[BANDS.length - 1]
}

// Per-user monthly rate for a plan at a company size, or null for an unknown plan.
export function perUserRate(planId, users) {
  const p = orgPlan(planId)
  if (!p) return null
  if (p.flat != null) return p.flat
  return p.rates[bandFor(users).id]
}

// The billable user count (never below the minimum).
export function billableUsers(users) {
  return Math.max(MIN_USERS, Math.floor(Number(users) || 0))
}

// The monthly subscription amount (users x rate), excluding AI at usage.
export function monthlyAmount(planId, users) {
  const r = perUserRate(planId, users)
  return r == null ? null : Math.round(billableUsers(users) * r * 100) / 100
}
