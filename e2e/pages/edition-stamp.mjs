// A deployed edition serves an SPA shell stamped with its capabilities
// (build/spa_stamp.js, `npm run stamp:spa` / `npm run compose`), so the very
// first paint is already that edition's. The suite builds ONE dist/ for every
// edition; to test what each deploy really serves, the HTML documents the test
// browser loads get the same stampShell transform the deploy step applies.
// The default edition needs no stamp (isDefaultStamp), exactly as in production.
import { stampShell, isDefaultStamp, DEFAULT_ORIGIN } from '../../build/spa_stamp.js'
import { makeCaps } from '../../server/edition_registry.js'

export async function stampLikeDeploy(context, { edition, baseURL }) {
  const list = makeCaps(edition).list()
  if (isDefaultStamp(list, DEFAULT_ORIGIN)) return
  const origin = new URL(baseURL).origin
  await context.route((url) => url.origin === origin && !url.pathname.startsWith('/api/'), async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback()
    const res = await route.fetch()
    const type = res.headers()['content-type'] || ''
    if (!type.includes('text/html')) return route.fulfill({ response: res })
    const html = await res.text()
    let body = html
    try { body = /name="wcp-capabilities"/.test(html) ? html : stampShell(html, list, { origin: DEFAULT_ORIGIN }) } catch { body = html }
    return route.fulfill({ response: res, body })
  })
}
