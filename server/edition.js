// The active deployment edition for this server process, plus the small
// edition rules the routes share. The registry itself (which edition turns on
// which capability) lives in ONE place: server/edition_registry.js.
//
// WORK_EDITION picks the edition (default `all`, today's product). An unknown
// value throws at import, so the server refuses to start rather than running as
// the wrong edition. This is the only module that reads WORK_EDITION.
import { makeCaps } from './edition_registry.js'

export const caps = makeCaps(process.env.WORK_EDITION)

// What the SPA (and any client) may know: the edition id, its label, and the
// capabilities that are on. Nothing secret.
export function publicEdition(c = caps) {
  return { edition: c.edition, label: c.label, capabilities: c.list() }
}

// Refusals are { status, body }; a route sends them as they are
// (res.status(r.status).json(r.body)), so every path answers the same way.

// Self-service sign-up when this edition has no individual accounts, or null
// when sign-up is allowed. One answer for every sign-up path (email, subscribe
// onboarding, first-time social sign-in).
export function soloSignupRefusal(c = caps) {
  if (c.has('solo_signup')) return null
  return { status: 403, body: { error: 'Self sign-up is not available on this installation. Ask your company administrator for an account, or sign in with your company (SSO).', signupDisabled: true } }
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
