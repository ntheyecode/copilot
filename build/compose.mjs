// Compose an installable folder for one edition.
//   npm run compose -- --edition onprem --out out/onprem [--no-spa] [--replace]
// See build/compose.js for what ships and what is checked.
import { compose } from './compose.js'

const args = process.argv.slice(2)
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
try {
  const edition = value('edition')
  const r = compose({ edition, out: value('out') || (edition ? `out/${edition}` : undefined), spa: !args.includes('--no-spa'), replace: args.includes('--replace') })
  console.log(`[compose] ${r.edition}: ${r.files} files, ${(r.bytes / 1048576).toFixed(1)} MB -> ${r.out}`)
  if (r.dirty) console.log('[compose] note: built from uncommitted changes (ship-manifest.json says dirty: true). Commit first for a release bundle.')
  console.log('[compose] on the target: npm ci --omit=dev, then node editions/start.mjs ' + r.edition)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
