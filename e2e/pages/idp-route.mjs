// Browser side of the mock identity provider (fake-oidc.mjs, on loopback inside
// the E2E server process). The product's /api/work/sso/:companyId/start answers
// with a 302 to the provider's https issuer host. A browser cannot resolve that
// test host, and Playwright does not route a request that a redirect produced,
// so the start response itself is intercepted: the real server answers (its
// session cookie is kept), and only the redirect's host is swapped for the
// mock's loopback address. Path and query (state, nonce, PKCE challenge,
// redirect_uri) are passed on unchanged, so the provider sees exactly what the
// product sent. Every other third-party request is still refused by the guard.
import { FAKE_IDP_HOST } from '../support/boot/fake-oidc.mjs'

export async function routeIdp(context, idpPort) {
  const seen = []
  await context.route(/\/api\/work\/sso\/[^/?#]+\/start(?:[?#]|$)/, async (route) => {
    const response = await route.fetch({ maxRedirects: 0 })
    const headers = { ...response.headers() }
    const loc = headers.location || ''
    if (loc.startsWith(`https://${FAKE_IDP_HOST}/`)) {
      const u = new URL(loc)
      seen.push(u.pathname)
      headers.location = `http://127.0.0.1:${idpPort}${u.pathname}${u.search}`
    }
    await route.fulfill({ response, headers })
  })
  return seen
}
