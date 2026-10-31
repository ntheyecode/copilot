// Stamp a built SPA for one edition, for a server deployed by copying dist/
// directly (the tar-over-ssh flow) instead of from a composed bundle.
//   npm run build && npm run stamp:spa -- --edition saas [--dist dist] [--origin https://host]
// The default edition at the default origin needs no stamp (nothing changes).
// See build/spa_stamp.js for what is stamped.
import path from 'node:path'
import { EDITION_IDS, makeCaps } from '../server/edition_registry.js'
import { stampSpa, DEFAULT_ORIGIN } from './spa_stamp.js'

const args = process.argv.slice(2)
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
try {
  const edition = value('edition')
  if (!EDITION_IDS.includes(edition)) throw new Error(`[stamp] --edition must be one of: ${EDITION_IDS.join(', ')}.`)
  const dist = path.resolve(value('dist') || 'dist')
  const r = stampSpa(dist, makeCaps(edition).list(), { origin: value('origin') || process.env.WORK_PUBLIC_URL || DEFAULT_ORIGIN })
  console.log(r.stamped
    ? `[stamp] ${edition}: ${dist} stamped for [${r.capabilities}] at ${r.origin}${r.audience ? `, ${r.audience} copy` : ''}, ${r.prerenderedRoutes} prerendered route(s).`
    : `[stamp] ${edition}: nothing to do (${r.reason}).`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
