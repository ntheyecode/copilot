// Operator actions on the configured database, used by `npm run db:*`
// (server/storage/cli.js) and by the first-run setup. Never imports the store.
// migrate and import take the single-writer lock, so they are refused while a
// server holds the schema; status and export only read (one consistent
// snapshot) and work while the server runs.
//
//   migrateDb  -> apply pending schema migrations ("deploy all tables")
//   dbStatus   -> driver, target (password hidden), schema version, row counts
//   importJson -> one-time copy of an existing db.json into the database
//   exportJson -> write the database back out as a db.json (portability, rollback)
//
// Secrets inside db.json are already encrypted (enc:v1:) under the master key
// (WORK_ENC_KEY or <data dir>/.enc.key). Import and export copy them as they
// are, so the server that reads the database needs that same master key.
import fs from 'node:fs'
import path from 'node:path'
import { storageConfig } from './config.js'
import { createPostgresDriver } from './postgres_driver.js'

function postgresOnly(env, action) {
  const cfg = storageConfig(env)
  if (cfg.driver !== 'postgres') throw new Error(`[storage] ${action} needs WORK_DB_DRIVER=postgres and WORK_DB_URL. The json driver (db.json) has no database to ${action === 'db:migrate' ? 'migrate' : 'use'}.`)
  return cfg
}

function withDriver(cfg, fn, mode = 'admin') {
  const d = createPostgresDriver(cfg, { mode })
  try { return fn(d) } finally { d.close() }
}

export function migrateDb({ env = process.env } = {}) {
  const cfg = storageConfig(env)
  if (cfg.driver === 'json') return { driver: 'json', applied: [], note: 'The json driver keeps db.json and has no schema to migrate.' }
  return withDriver(cfg, (d) => ({ ...d.migrate(), status: d.status() }))
}

export function dbStatus({ env = process.env, dataDir } = {}) {
  const cfg = storageConfig(env, { dataDir })
  if (cfg.driver === 'json') {
    const file = dataDir ? path.join(dataDir, 'db.json') : null
    return { driver: 'json', file, exists: !!(file && fs.existsSync(file)) }
  }
  return withDriver(cfg, (d) => d.status(), 'read')
}

function readSnapshot(from) {
  if (!from) throw new Error('[storage] db:import needs --from <path to db.json>.')
  let raw
  try { raw = fs.readFileSync(from, 'utf8') } catch (e) { throw new Error(`[storage] cannot read ${from} (${e.code || e.message}).`) }
  let snap
  try { snap = JSON.parse(raw) } catch (e) { throw new Error(`[storage] ${from} is not valid JSON (${e.message}). Nothing was imported.`) }
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) throw new Error(`[storage] ${from} does not hold a WorkCoPilot store (expected a JSON object).`)
  if (!Object.keys(snap).length) throw new Error(`[storage] ${from} is an empty object: there is nothing to import.`)
  return snap
}

const countOf = (snap) => Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v).length : 1]))

export function importJson({ env = process.env, from, replace = false } = {}) {
  const cfg = postgresOnly(env, 'db:import')
  const snap = readSnapshot(from)
  return withDriver(cfg, (d) => {
    const st = d.status()
    if (st.pending.length) throw new Error(`[storage] the database schema is not deployed yet (pending migrations: ${st.pending.join(', ')}). Run "npm run db:migrate" first. Nothing was imported.`)
    const existing = d.load()
    if (existing && !replace) throw new Error(`[storage] ${cfg.display} (schema ${cfg.schema}) already holds a store (${Object.keys(existing).length} collections). Nothing was imported. Re-run with --replace to overwrite it.`)
    d.save(snap)
    // Read it back through a fresh load and compare, so "imported" means "the
    // database now returns exactly this file".
    const back = d.load()
    if (JSON.stringify(back) !== JSON.stringify(snap)) throw new Error('[storage] the import was written but reading it back did not match the source file. Do not start the server on this database; run db:import --replace again or restore from backup.')
    return { imported: true, from, target: cfg.display, schema: cfg.schema, replaced: !!existing, counts: countOf(snap) }
  })
}

export function exportJson({ env = process.env, to, replace = false } = {}) {
  const cfg = postgresOnly(env, 'db:export')
  if (!to) throw new Error('[storage] db:export needs --to <path for the db.json to write>.')
  if (fs.existsSync(to) && !replace) throw new Error(`[storage] ${to} already exists. Nothing was written. Pick another path or re-run with --replace.`)
  const snap = withDriver(cfg, (d) => d.load(), 'read')
  if (!snap) throw new Error(`[storage] ${cfg.display} (schema ${cfg.schema}) holds no store yet. Nothing was written.`)
  // Same format and the same atomic write as the json driver.
  fs.mkdirSync(path.dirname(path.resolve(to)), { recursive: true })
  const tmp = to + '.tmp'
  const fd = fs.openSync(tmp, 'w', 0o600)
  try { fs.writeSync(fd, JSON.stringify(snap, null, 2)); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(tmp, to)
  return { exported: true, to, source: cfg.display, schema: cfg.schema, counts: countOf(snap) }
}
