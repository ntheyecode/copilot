// The active deployment edition for this server process, plus the small
// edition rules the routes share. The registry itself (which edition turns on
// which capability) lives in ONE place: server/edition_registry.js.
//
// WORK_EDITION picks the edition (default `all`, today's product). An unknown
// value throws at import, so the server refuses to start rather than running as
// the wrong edition. This is the only server module that reads WORK_EDITION
// (editions/profile.js sets it before the server loads).
import { makeCaps, companyTenancy } from './edition_registry.js'

export const caps = makeCaps(process.env.WORK_EDITION)

// What the SPA (and any client) may know: the edition id, its label, and the
// capabilities that are on. Nothing secret.
export function publicEdition(c = caps) {
  return { edition: c.edition, label: c.label, capabilities: c.list() }
}

// Refusals are { status, body }; a route sends them as they are
// (res.status(r.status).json(r.body)), so every path answers the same way.

// Where an organization talks to us. Only offered where the public site is
// served (an on-prem or managed install has no sales page of its own).
export const CONTACT_PATH = '/workcopilot/contact'

// Self-service sign-up when this edition has no individual accounts, or null
// when sign-up is allowed. One answer for every sign-up path (email, subscribe
// onboarding, first-time social sign-in).
export function soloSignupRefusal(c = caps) {
  if (c.has('solo_signup')) return null
  const error = c.has('public_site')
    ? 'WorkCoPilot is for organizations, so personal sign-up is not available. To bring it to your company, talk to us. Already with a company that uses it? Ask your company administrator for an account, or sign in with your company (SSO).'
    : 'Self sign-up is not available on this installation. Ask your company administrator for an account, or sign in with your company (SSO).'
  return { status: 403, body: { error, signupDisabled: true, ...(c.has('public_site') ? { contact: CONTACT_PATH } : {}) } }
}

// Buying or changing a personal subscription plan (Lite to Premium checkout,
// annual switch, plan change), or null when this edition sells them. A company
// user's capacity comes from the company pool, never from these plans, so this
// refusal never takes anything a company user is entitled to.
export function individualPlanRefusal(c = caps) {
  if (c.has('individual_plans')) return null
  const error = c.has('public_site')
    ? 'Personal plans are not sold here: WorkCoPilot is for organizations. Talk to us about a plan for your company, or ask your company administrator for more guided hours.'
    : 'Personal plans are not sold on this installation. Ask your company administrator for more guided hours.'
  return { status: 403, body: { error, individualPlansDisabled: true, ...(c.has('public_site') ? { contact: CONTACT_PATH } : {}) } }
}

// A company-only feature (company console, team invites, PM and executive
// dashboards, teach studio, Company Brain, API keys, webhooks, launch links)
// on an edition with no company tenants, or null when companies exist. The
// wording stays neutral because an individuals-only service never talks about
// companies; the UI hides these surfaces, so a person reaches this only by
// calling the API directly.
export function companyFeatureRefusal(c = caps) {
  if (companyTenancy(c)) return null
  return { status: 403, body: { error: 'This feature is not available on this service.', companiesDisabled: true } }
}

// Creating a company tenant, or null when allowed. countCompanies is called
// only when the answer depends on it (single_company), so the default edition
// does no extra work.
export function companyCreationRefusal(countCompanies, c = caps) {
  if (c.has('saas_companies')) return null
  if (c.has('single_company')) {
    if ((Number(countCompanies()) || 0) === 0) return null
    return { status: 409, body: { error: 'This installation hosts one company, and it already exists. Edit that company instead of adding another.', singleCompany: true } }
  }
  return { status: 403, body: { error: 'Company accounts are not part of this edition.', companiesDisabled: true } }
}

// Why Stripe is off on this server, for the superadmin billing panel, or null
// when this edition uses Stripe.
export function stripeOffReason(c = caps) {
  if (c.has('stripe_billing')) return null
  return c.has('offline_licensing')
    ? 'Stripe is off in this edition: plans come from the installation license. Stripe keys in the settings or the environment are ignored.'
    : 'Stripe is off in this edition: this installation is invoiced directly. Stripe keys in the settings or the environment are ignored.'
}
