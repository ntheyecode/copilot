// Start the server as one edition:  node editions/start.mjs <edition>
// Applies editions/<edition>/manifest.json (operator-set variables win), then
// starts server/index.js exactly as `node server/index.js` would. With the
// `all` edition and no manifest defaults this is the same server as today.
import { loadManifest, profileEnv } from './profile.js'
import { EDITION_IDS } from '../server/edition_registry.js'

const id = String(process.argv[2] || '').trim().toLowerCase()
try {
  Object.assign(process.env, profileEnv(loadManifest(id)))
} catch (e) {
  console.error(e.message)
  console.error(`Usage: node editions/start.mjs <${EDITION_IDS.join('|')}>`)
  process.exit(2)
}
// Imported only after the environment is set: the server reads it at import.
const { start } = await import('../server/index.js')
await start()
