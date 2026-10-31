// ===========================================================================
// The public website's PAGES: the one list of marketing paths that exist only
// where the `public_site` capability is on. Pure data and pure functions, no
// Node APIs, so the SPA imports it too (src/edition/PublicSiteGate.jsx), the
// same way it imports server/edition_registry.js.
//
// Where public_site is off (a customer's own on-prem or managed install):
//   - the server redirects these pages to sign-in, and serves the plain SPA
//     shell for the sign-in page (never a prerendered marketing page),
//     server/public_site_gate.js;
//   - the SPA sends these routes to sign-in, src/edition/PublicSiteGate.jsx;
//   - the website's forms are refused, server/edition_route_gates.js
//     PUBLIC_SITE_ROUTES.
// Legal pages (terms, privacy, DPA, ...) are NOT here: sign-in and the consent
// gate link to them on every install.
// ===========================================================================

export const SIGN_IN_PATH = '/workcopilot'

export const MARKETING_PAGE_PATHS = Object.freeze([
  '/demo',
  '/workcopilot/use-cases',
  '/workcopilot/security',
  '/workcopilot/enterprise',
  '/enterprise',
  '/workcopilot/benchmark',
  '/workcopilot/how-it-works',
  '/workcopilot/fields',
  '/workcopilot/pricing',
  '/workcopilot/faq',
  '/workcopilot/contact',
  '/affiliate',
  '/affliate',
])

// The sign-in page's own paths: served, but as the plain shell.
export const SIGN_IN_PAGE_PATHS = Object.freeze(['/workcopilot', '/workcopilot/login'])

// '/WorkCoPilot/Pricing/', '/workcopilot/pricing/index.html' -> '/workcopilot/pricing'
export function normalizePagePath(p) {
  let s = String(p || '').split(/[?#]/)[0].toLowerCase()
  s = s.replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return s || '/'
}

export function isMarketingPage(p) {
  return MARKETING_PAGE_PATHS.includes(normalizePagePath(p))
}

export function isSignInPage(p) {
  return SIGN_IN_PAGE_PATHS.includes(normalizePagePath(p))
}

export default { SIGN_IN_PATH, MARKETING_PAGE_PATHS, SIGN_IN_PAGE_PATHS, normalizePagePath, isMarketingPage, isSignInPage }
