// Database operations for the postgres storage driver. Run with the server
// stopped. Reads the same WORK_DB_* settings as the server (see
// server/storage/config.js). Never prints a password.
//
//   npm run db:migrate                         deploy or upgrade all tables
//   npm run db:status
//   npm run db:import -- --from <db.json> [--replace]
//   npm run db:export -- --to <db.json> [--replace]
import { migrateDb, dbStatus, importJson, exportJson } from './admin_ops.js'

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name) => rest.includes(`--${name}`)
const value = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined }
const dataDir = process.env.WORK_DATA_DIR || undefined

const ops = {
  migrate: () => migrateDb(),
  status: () => dbStatus({ dataDir }),
  import: () => importJson({ from: value('from'), replace: flag('replace') }),
  export: () => exportJson({ to: value('to'), replace: flag('replace') }),
}

if (!ops[cmd]) {
  console.error('Usage: node server/storage/cli.js <migrate|status|import|export> [--from file] [--to file] [--replace]')
  process.exit(2)
}
try {
  console.log(JSON.stringify(ops[cmd](), null, 2))
} catch (e) {
  console.error(e && e.message ? e.message : String(e))
  process.exit(1)
}
