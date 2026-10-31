// Operator actions: db:migrate, db:status, the one-time db.json import, and the
// export back to db.json. Against a real Postgres (PGlite) and temp files.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { migrateDb, dbStatus, importJson, exportJson } from './admin_ops.js'
import { createJsonDriver } from './json_driver.js'
import { startTestPostgres } from './test_pg_server.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const pglite = await startTestPostgres()
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-dbops-'))
after(async () => { await pglite.stop(); try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* best effort */ } })
const env = (schema) => ({ WORK_DB_DRIVER: 'postgres', WORK_DB_URL: pglite.url, WORK_DB_SCHEMA: schema })

// A db.json exactly as the json driver writes it, secrets already ciphertext.
function sourceFile() {
  const src = path.join(dir, 'src')
  createJsonDriver({ dataDir: src }).save({
    users: [{ id: '1', username: 'admin', role: 'superadmin' }, { id: '4', username: 'ana', companyId: 'co2' }],
    seq: 4,
    sessionSecret: 'enc:v1:c2Vzcw==',
    companies: [{ id: 'co2', name: 'Fabrikam', companyAi: { apiKey: 'enc:v1:Y29tcGFueQ==' } }],
    workUsage: { '4:2026-10-30': { usedSeconds: 120 } },
  })
  return path.join(src, 'db.json')
}

test('db:migrate deploys all tables once; status reports the version', () => {
  const first = migrateDb({ env: env('ops_migrate') })
  assert.deepEqual(first.applied.map((m) => m.version), [1])
  assert.equal(first.status.schemaVersion, 1)
  assert.deepEqual(migrateDb({ env: env('ops_migrate') }).applied, [])
  const st = dbStatus({ env: env('ops_migrate') })
  assert.equal(st.collections, 0)
  assert.deepEqual(st.pending, [])
})

test('the json driver has nothing to migrate', () => {
  assert.match(migrateDb({ env: {} }).note, /no schema/)
  assert.equal(dbStatus({ env: {}, dataDir: dir }).driver, 'json')
})

test('import refuses an undeployed schema, then copies db.json exactly; export writes the same bytes back', () => {
  const from = sourceFile()
  assert.throws(() => importJson({ env: env('ops_import'), from }), /Run "npm run db:migrate" first/)
  migrateDb({ env: env('ops_import') })
  const r = importJson({ env: env('ops_import'), from })
  assert.equal(r.imported, true)
  assert.equal(r.counts.users, 2)
  const to = path.join(dir, 'out', 'db.json')
  exportJson({ env: env('ops_import'), to })
  assert.equal(fs.readFileSync(to, 'utf8'), fs.readFileSync(from, 'utf8'), 'round trip is byte-identical')
})

test('import never overwrites a store unless asked; export never overwrites a file unless asked', () => {
  const from = sourceFile()
  migrateDb({ env: env('ops_guard') })
  importJson({ env: env('ops_guard'), from })
  assert.throws(() => importJson({ env: env('ops_guard'), from }), /already holds a store.*--replace/)
  assert.equal(importJson({ env: env('ops_guard'), from, replace: true }).replaced, true)
  const to = path.join(dir, 'exists.json')
  fs.writeFileSync(to, 'keep me')
  assert.throws(() => exportJson({ env: env('ops_guard'), to }), /already exists/)
  assert.equal(fs.readFileSync(to, 'utf8'), 'keep me')
})

test('import of a bad file changes nothing and says why', () => {
  migrateDb({ env: env('ops_bad') })
  const bad = path.join(dir, 'bad.json')
  fs.writeFileSync(bad, '[1,2]')
  assert.throws(() => importJson({ env: env('ops_bad'), from: bad }), /expected a JSON object/)
  fs.writeFileSync(bad, '{nope')
  assert.throws(() => importJson({ env: env('ops_bad'), from: bad }), /not valid JSON/)
  assert.throws(() => importJson({ env: env('ops_bad'), from: path.join(dir, 'missing.json') }), /cannot read/)
  assert.equal(dbStatus({ env: env('ops_bad') }).collections, 0)
})

test('the npm run db:* CLI prints JSON and never the password', () => {
  const cli = path.join(here, 'cli.js')
  const url = pglite.url.replace('postgres:postgres@', 'postgres:Cli-Secret-9@')   // PGlite accepts any password
  const r = spawnSync(process.execPath, [cli, 'status'], { env: { ...process.env, ...env('ops_cli'), WORK_DB_URL: url, WORK_DB_AUTO_MIGRATE: '' }, encoding: 'utf8', timeout: 60000 })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.equal(out.driver, 'postgres')
  assert.ok(!(r.stdout + r.stderr).includes('Cli-Secret-9'))
  const bad = spawnSync(process.execPath, [cli, 'nope'], { encoding: 'utf8' })
  assert.equal(bad.status, 2)
})

test('import of an empty object is refused up front', () => {
  migrateDb({ env: env('ops_empty') })
  const f = path.join(dir, 'empty.json')
  fs.writeFileSync(f, '{}')
  assert.throws(() => importJson({ env: env('ops_empty'), from: f }), /nothing to import/)
})
