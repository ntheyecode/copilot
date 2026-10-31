// Edition route gates: the ONE place that maps a family of API routes to the
// capability it needs. Mounted once in index.js, before every route, so a
// route added later under one of these prefixes is covered without remembering
// to add a check (class fix: never one `if` per handler).
//
//   individual_plans off  ->  buying or changing a personal plan is refused
//                             (individualPlanRefusal: actionable "talk to us")
//   no company tenancy    ->  every company-only route family is refused
//                             (companyFeatureRefusal: neutral wording)
//   public_site off       ->  the public website's forms are refused
//                             (publicSiteRefusal: "sign in instead")
//
// Reading what you already have is never refused here: the subscription, the
// invoices and the Stripe portal stay reachable, so a person keeps managing a
// plan they are already paying for (never degrade an entitlement). The list of
// what each edition refuses is tested per edition (edition_*_routes.test.mjs).
import { caps as activeCaps, individualPlanRefusal, companyFeatureRefusal, publicSiteRefusal } from './edition.js'

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
  '/api/work/company/',              // company console: users, SSO config, integrations, API keys, webhooks, KB spaces, customers, depth pool
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
  '/api/work/sso/',                  // company single sign-on (OIDC start / resolve / callback)
  '/api/v1/',                        // the integration API (company API keys)
])

// The public website's forms (method + exact path), refused where public_site
// is off: the "validate it live" check and its lead capture, and the contact form.
export const PUBLIC_SITE_ROUTES = Object.freeze([
  ['POST', '/api/work/coverage'],              // "validate it live": is my scenario covered?
  ['POST', '/api/work/leads'],                 // "validate it live": lead capture
  ['POST', '/api/work/contact'],               // contact us (sales)
])

// 'a/b/' covers a/b and everything under it; 'a/b' covers a/b, a/b/... and a/b-...
// (workflow-incidents also covers workflow-incidents-alerts).
function matchesPrefix(p, prefix) {
  if (prefix.endsWith('/')) return p === prefix.slice(0, -1) || p.startsWith(prefix)
  return p === prefix || p.startsWith(prefix + '/') || p.startsWith(prefix + '-')
}

// Which refusal (if any) a request meets. Pure: (method, path, caps) -> refusal | null.
export function routeRefusal(method, urlPath, c = activeCaps) {
  // Lower-cased: Express routes case-insensitively by default, so
  // /api/work/Checkout/Credits reaches the same handler as the lower-case path
  // and must meet the same refusal (independent review, 2026-10-30).
  const p = String(urlPath || '').split('?')[0].replace(/\/+$/, '').toLowerCase() || '/'
  const m = String(method || '').toUpperCase()
  if (INDIVIDUAL_PLAN_ROUTES.some(([rm, rp]) => rm === m && rp === p)) {
    const r = individualPlanRefusal(c)
    if (r) return r
  }
  if (COMPANY_ROUTE_PREFIXES.some((pre) => matchesPrefix(p, pre))) {
    const r = companyFeatureRefusal(c)
    if (r) return r
  }
  if (PUBLIC_SITE_ROUTES.some(([rm, rp]) => rm === m && rp === p)) {
    const r = publicSiteRefusal(c)
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
