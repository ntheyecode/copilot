// Edition route gates: the ONE place that maps a family of API routes to the
// capability it needs. Mounted once in index.js, before every route, so a
// route added later under one of these prefixes is covered without remembering
// to add a check (class fix: never one `if` per handler).
//
//   individual_plans off  ->  buying or changing a personal plan is refused
//                             (individualPlanRefusal: actionable "talk to us")
//   no company tenancy    ->  every company-only route family is refused
//                             (companyFeatureRefusal: neutral wording)
//   stripe_billing off    ->  every Stripe path (checkout, portal, Stripe
//                             invoices and refunds, webhook, Connect payouts)
//   social_login off      ->  every social sign-in path
//   a superadmin section  ->  its admin API families (server/admin_sections.js,
//   the edition lacks         the same registry the console reads to hide it)
//
// Where Stripe is on, reading what you already have is never refused here: the
// subscription, the invoices and the Stripe portal stay reachable, so a person
// keeps managing a plan they are already paying for (never degrade an
// entitlement). The list of what each edition refuses is tested per edition
// (edition_*_routes.test.mjs).
import { caps as activeCaps, individualPlanRefusal, companyFeatureRefusal, stripeRefusal, socialLoginRefusal, featureRefusal } from './edition.js'
import { refusedAdminApiPrefixes } from './admin_sections.js'

// Personal-plan purchase and change (method + exact path).
export const INDIVIDUAL_PLAN_ROUTES = Object.freeze([
  ['POST', '/api/work/checkout'],              // start a plan subscription
  ['POST', '/api/work/checkout/credits'],      // extra hours / images on a personal plan
  ['POST', '/api/work/subscription/change'],   // upgrade / downgrade a personal plan
  ['POST', '/api/work/onboarding/plan'],       // the subscribe onboarding's plan pick
  ['POST', '/api/work/onboarding/checkout'],   // the subscribe onboarding's checkout
])

// Company-only route families (prefix match on the path, any method). A solo
// person's own features (personal projects, reference docs, their own policy,
// skills, sessions) live outside these prefixes and are never touched.
export const COMPANY_ROUTE_PREFIXES = Object.freeze([
  '/api/work/company/',              // company console: users, SSO config, integrations, API keys, webhooks, KB spaces, customers, depth pool, invoices, SCIM tokens
  '/api/work/team/',                 // company admin: activity, pool, allocations, AI keys, learnings, exports
  '/api/work/my-company',            // the member's company card
  '/api/work/exec/',                 // executive dashboards
  '/api/work/pm/',                   // project manager dashboards
  '/api/work/grc/',                  // GRC oversight
  '/api/work/brain/',                // Company Brain (ingest, query, export, custody)
  '/api/work/workflows',             // teach studio: published company workflows
  '/api/work/workflow-incidents',    // workflow issues inbox (+ -alerts)
  '/api/work/templates',             // team project templates
  '/api/work/kb-spaces',             // company knowledge spaces (the start-task picker hides itself on an error)
  '/api/work/customers',             // company customers list
  '/api/work/my/assigned',           // the worker queue (tasks a project manager assigned)
  '/api/work/app/msi',               // the company MSI installer download
  '/api/work/launch/',               // launch links from a company's own app
  '/api/work/sso/',                  // company single sign-on (OIDC and SAML: start / resolve / callback / metadata / ACS)
  '/api/work/scim/',                 // SCIM 2.0 provisioning from the company's identity provider
  '/api/v1/',                        // the integration API (company API keys)
])

// Every path that reaches Stripe. '*' matches exactly one path segment.
export const STRIPE_ROUTE_PREFIXES = Object.freeze([
  '/api/work/stripe/',                               // the Stripe webhook
  '/api/work/checkout',                              // plan and credits checkout
  '/api/work/onboarding/checkout',                   // the subscribe onboarding's checkout
  '/api/work/subscription/change',                   // a plan change runs through Stripe
  '/api/work/billing/portal',                        // the Stripe customer portal
  '/api/work/invoices',                              // the signed-in person's Stripe invoices
  '/api/work/admin/users/*/invoices',                // a person's Stripe invoices (superadmin)
  '/api/work/admin/users/*/refund',                  // a Stripe refund
  '/api/work/admin/users/*/cancel-subscription',     // a Stripe subscription cancel
  '/api/work/admin/finance/transactions/*/refund',   // a Stripe refund from the ledger
  '/api/work/affiliate/connect/',                    // Stripe Connect payouts
])

// Social sign-in (server/social.js) and its superadmin configuration.
export const SOCIAL_ROUTE_PREFIXES = Object.freeze([
  '/api/work/social/',
  '/api/work/admin/social',
])

// The public affiliate program: referral payouts on personal-plan payments.
export const AFFILIATE_ROUTE_PREFIXES = Object.freeze(['/api/work/affiliate/'])

// 'a/b/' covers a/b and everything under it; 'a/b' covers a/b, a/b/... and a/b-...
// (workflow-incidents also covers workflow-incidents-alerts). A '*' segment in
// the prefix matches any single segment of the path.
export function matchesPrefix(p, prefix) {
  if (!prefix.includes('*')) {
    if (prefix.endsWith('/')) return p === prefix.slice(0, -1) || p.startsWith(prefix)
    return p === prefix || p.startsWith(prefix + '/') || p.startsWith(prefix + '-')
  }
  const open = prefix.endsWith('/')
  const want = (open ? prefix.slice(0, -1) : prefix).split('/')
  const got = p.split('/')
  if (got.length < want.length) return false
  for (let i = 0; i < want.length; i++) {
    const w = want[i], g = got[i]
    if (w === '*') { if (!g) return false; continue }
    if (i === want.length - 1 && !open) { if (!(g === w || g.startsWith(w + '-'))) return false; continue }
    if (g !== w) return false
  }
  return true
}

// The families in the order they are checked; the first refusal wins (a
// personal-plan purchase on the organizations site answers with the plan
// refusal, which says how to talk to us, before the Stripe one).

const FAMILIES = Object.freeze([
  { name: 'individual_plans', exact: INDIVIDUAL_PLAN_ROUTES, refusal: individualPlanRefusal },
  { name: 'companies', prefixes: () => COMPANY_ROUTE_PREFIXES, refusal: companyFeatureRefusal },
  { name: 'stripe_billing', prefixes: () => STRIPE_ROUTE_PREFIXES, refusal: stripeRefusal },
  { name: 'social_login', prefixes: () => SOCIAL_ROUTE_PREFIXES, refusal: socialLoginRefusal },
  { name: 'affiliates', prefixes: () => AFFILIATE_ROUTE_PREFIXES, refusal: (c) => ((c.has('individual_plans') && c.has('stripe_billing')) ? null : featureRefusal()) },
  // Superadmin sections the edition does not offer: their admin APIs.
  // Without company tenants the neutral company refusal answers (it carries
  // companiesDisabled, which the individuals SPA already understands).
  { name: 'admin_sections', prefixes: (c) => refusedAdminApiPrefixes(c), refusal: (c) => companyFeatureRefusal(c) || featureRefusal() },
])

// Which refusal (if any) a request meets. Pure: (method, path, caps) -> refusal | null.
export function routeRefusal(method, urlPath, c = activeCaps) {
  // Lower-cased: Express routes case-insensitively by default, so
  // /api/work/Checkout/Credits reaches the same handler as the lower-case path
  // and must meet the same refusal (independent review, 2026-10-30).
  const p = String(urlPath || '').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/'
  const m = String(method || '').toUpperCase()
  for (const f of FAMILIES) {
    const hit = f.exact
      ? f.exact.some(([rm, rp]) => rm === m && rp === p)
      : f.prefixes(c).some((pre) => matchesPrefix(p, pre))
    if (!hit) continue
    const r = f.refusal(c)
    if (r) return r
  }
  return null
}

// Express middleware. Mount with app.use(editionRouteGate()) before the routes.
export function editionRouteGate(c = activeCaps) {
  return (req, res, next) => {
    const r = routeRefusal(req.method, req.path, c)
    if (!r) return next()
    res.status(r.status).json(r.body)
  }
}
