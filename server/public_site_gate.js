// ===========================================================================
// Page gate for the public website (capability `public_site`). Mounted in
// index.js ahead of the static SPA. Where public_site is on it does nothing.
// Where it is off:
//   - a marketing page (server/public_site_paths.js) answers 302 to sign-in,
//     so a prerendered marketing file left in dist/ is never served;
//   - the sign-in page is served as the plain SPA shell (dist/index.html), not
//     its prerendered marketing variant (dist/workcopilot/index.html).
// Only GET and HEAD are touched; /api is never matched here.
// ===========================================================================
import { caps as activeCaps } from './edition.js'
import { SIGN_IN_PATH, isMarketingPage, isSignInPage } from './public_site_paths.js'

// opts: { shellFile: absolute path to dist/index.html, caps? }
export function publicSitePageGate({ shellFile, caps = activeCaps } = {}) {
  return (req, res, next) => {
    if (caps.has('public_site')) return next()
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (isMarketingPage(req.path)) {
      res.setHeader('Cache-Control', 'no-store')
      return res.redirect(302, SIGN_IN_PATH)
    }
    if (shellFile && isSignInPage(req.path)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      return res.sendFile(shellFile)
    }
    return next()
  }
}

export default { publicSitePageGate }
