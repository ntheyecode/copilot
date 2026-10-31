// ---------------------------------------------------------------------------
// The superadmin console sections, per edition: the ONE registry.
// ---------------------------------------------------------------------------
// Each section of the superadmin console (src/pages/workadmin/WorkAdmin.jsx)
// says what it needs to exist on this server and which admin API families
// serve it. Two consumers read this file and nothing else:
//   * the SPA hides a section whose needs are not met (and names it in an
//     honest "not offered on this service" note), and
//   * the server's route gate (edition_route_gates.js) refuses the section's
//     admin API families on the same edition.
// So "the paid site has no Companies section" and "the paid server refuses
// /api/work/admin/companies" are one fact, written once (class fix: no
// scattered `if` per section or per route).
//
// Pure data and pure functions, no Node or browser APIs, so the SPA imports it
// directly (the same way it imports edition_registry.js). It lives in server/
// because the server deploy ships server/ only.
//
// needs: a list; every entry must hold. An entry is a capability id from
// edition_registry.js CAPABILITIES, or the derived requirement 'companies'
// (company tenancy: saas_companies or single_company).
// api:   admin route prefixes (same prefix rules as the route gate: 'a/b/'
//        covers a/b and below; 'a/b' covers a/b, a/b/... and a/b-...).
// ---------------------------------------------------------------------------
import { CAPABILITIES, companyTenancy } from './edition_registry.js'

export const ADMIN_SECTIONS = Object.freeze([
  { id: 'overview', needs: [], api: [] },
  // Company tenants, their contracts, B2B invoices and pool alerts.
  { id: 'companies', needs: ['companies'], api: ['/api/work/admin/companies', '/api/work/admin/company-admins'] },
  { id: 'invoices', needs: ['companies'], api: ['/api/work/admin/b2b/'] },
  { id: 'notifications', needs: ['companies'], api: ['/api/work/admin/notifications'] },
  { id: 'governance', needs: ['companies'], api: [] },
  { id: 'users', needs: [], api: [] },
  // The personal Lite to Premium price list and the people who bought one.
  { id: 'pricing', needs: ['individual_plans'], api: ['/api/work/admin/pricing'] },
  { id: 'subscribers', needs: ['individual_plans'], api: ['/api/work/admin/subscribers'] },
  { id: 'cancelled', needs: ['individual_plans'], api: [] },
  // Stripe keys, prices and the test call.
  { id: 'billing', needs: ['stripe_billing'], api: ['/api/work/admin/billing'] },
  { id: 'finance', needs: [], api: [] },
  { id: 'email', needs: [], api: [] },
  { id: 'email-templates', needs: [], api: [] },
  { id: 'ai', needs: [], api: [] },
  { id: 'social', needs: ['social_login'], api: ['/api/work/admin/social'] },
  { id: 'sessions', needs: [], api: [] },
  // The public site's lead capture and its home-page hero.
  { id: 'leads', needs: ['public_site'], api: ['/api/work/admin/leads'] },
  { id: 'hero', needs: ['public_site'], api: ['/api/work/admin/hero'] },
  { id: 'tickets', needs: [], api: [] },
  { id: 'help', needs: [], api: [] },
  { id: 'incidents', needs: [], api: [] },
  // Referral payouts on a referred person's first personal-plan payment, paid
  // out through Stripe Connect: they exist only where both do.
  { id: 'affiliates', needs: ['individual_plans', 'stripe_billing'], api: ['/api/work/admin/affiliate', '/api/work/admin/affiliates'] },
  { id: 'claims', needs: [], api: [] },
  { id: 'appearance', needs: [], api: [] },
])

export const ADMIN_SECTION_IDS = Object.freeze(ADMIN_SECTIONS.map((s) => s.id))
const BY_ID = new Map(ADMIN_SECTIONS.map((s) => [s.id, s]))

// Validate at import: a typo in a need fails loudly, never reads as "off".
for (const s of ADMIN_SECTIONS) {
  for (const n of s.needs) {
    if (n !== 'companies' && !Object.hasOwn(CAPABILITIES, n)) throw new Error(`[admin_sections] section "${s.id}" needs unknown capability "${n}".`)
  }
  Object.freeze(s.needs); Object.freeze(s.api); Object.freeze(s)
}
if (new Set(ADMIN_SECTION_IDS).size !== ADMIN_SECTION_IDS.length) throw new Error('[admin_sections] a section id is listed twice.')

// Does `caps` (anything with has(cap)) meet every need?
export function meetsNeeds(needs, caps) {
  return (needs || []).every((n) => (n === 'companies' ? companyTenancy(caps) : caps.has(n)))
}

// Is this section offered on this server? Throws on an unknown section id so
// a section added to the console without a registry row fails at once.
export function adminSectionAvailable(id, caps) {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`[admin_sections] unknown section "${id}". Add it to ADMIN_SECTIONS in server/admin_sections.js first.`)
  return meetsNeeds(s.needs, caps)
}

// The section ids this server does not offer, in console order.
export function unavailableAdminSections(caps) {
  return ADMIN_SECTIONS.filter((s) => !meetsNeeds(s.needs, caps)).map((s) => s.id)
}

// Admin API prefixes the route gate refuses on this server.
export function refusedAdminApiPrefixes(caps) {
  return ADMIN_SECTIONS.filter((s) => !meetsNeeds(s.needs, caps)).flatMap((s) => s.api)
}
