// The real store (server/store.js) running on the postgres driver, end to end:
// it seeds, persists through SQL, keeps secrets encrypted in the database,
// writes no db.json, and a restarted process (a child process with the same
// settings) reads everything back and decrypts the secrets with the same key.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startTestPostgres } from './test_pg_server.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const pglite = await startTestPostgres()
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-store-pg-'))
const SECRET = 'tvly-STORE-ON-PG-' + Math.random().toString(36).slice(2)
const env = {
  WORK_DATA_DIR: dataDir, PORT: '0',
  WORK_DB_DRIVER: 'postgres', WORK_DB_URL: pglite.url, WORK_DB_SCHEMA: 'store_e2e', WORK_DB_AUTO_MIGRATE: '1',
}
Object.assign(process.env, env)
const store = await import('../store.js')
const pg = (await import('pg')).default

after(async () => {
  await pglite.stop()
  try { fs.rmSync(dataDir, { recursive: true, force: true }) } catch { /* best effort */ }
})

async function rows(sql) {
  const c = new pg.Client({ connectionString: pglite.url })
  await c.connect()
  try { return (await c.query(sql)).rows } finally { await c.end() }
}

test('the store seeds into the database, not into db.json', async () => {
  assert.ok(store.listUsers().some((u) => u.role === 'superadmin'), 'superadmin seeded')
  assert.ok(!fs.existsSync(path.join(dataDir, 'db.json')), 'no silent db.json fallback')
  const users = await rows(`SELECT rid FROM "store_e2e".wcp_records WHERE collection = 'users'`)
  assert.ok(users.length >= 1)
})

test('a stored secret is ciphertext in the database and plaintext in memory', async () => {
  store.setPlatformWebSearch({ apiKey: SECRET, provider: 'tavily' })
  const docs = (await rows(`SELECT doc::text AS doc FROM "store_e2e".wcp_records`)).map((r) => r.doc).join('\n')
  assert.ok(!docs.includes(SECRET), 'plaintext never reaches the database')
  assert.match(docs, /enc:v1:/)
  assert.equal(store.getPlatformWebSearchKey(), SECRET)
  assert.ok(fs.existsSync(path.join(dataDir, '.enc.key')), 'the master key stays in the data dir')
})

test('an unrelated save keeps the stored ciphertext of an unchanged secret (no rewrite)', async () => {
  const before = await rows(`SELECT doc::text AS doc, updated_at FROM "store_e2e".wcp_records WHERE collection = 'ai' AND rid = 'webSearch'`)
  store.createWorkUser({ username: 'unrelated1', password: 'Passw0rd!x' })
  const after = await rows(`SELECT doc::text AS doc, updated_at FROM "store_e2e".wcp_records WHERE collection = 'ai' AND rid = 'webSearch'`)
  assert.equal(after[0].doc, before[0].doc)
  assert.equal(String(after[0].updated_at), String(before[0].updated_at))
})

test('a restarted server reads the same data and decrypts the secret', () => {
  const u = store.createWorkUser({ username: 'pguser1', password: 'Passw0rd!x', email: 'pg1@example.com' })
  // Stop this "server" first (releases its connection and lock), as a real
  // restart would, so the child is the only writer.
  store.closeStore()
  assert.throws(() => store.createWorkUser({ username: 'pguser2', password: 'Passw0rd!x' }), /connection is closed/)
  const probe = `
    const store = await import(${JSON.stringify(pathToFileURL(path.join(here, '..', 'store.js')).href)})
    const u = store.findUser('pguser1')
    console.log('PROBE ' + JSON.stringify({ id: u && u.id, key: store.getPlatformWebSearchKey() }))
    process.exit(0)
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 60000 })
  const line = (r.stdout || '').split(/\r?\n/).find((l) => l.startsWith('PROBE '))
  assert.ok(line, `child printed a result (status ${r.status}): ${r.stderr}`)
  const got = JSON.parse(line.slice(6))
  assert.equal(got.id, u.id)
  assert.equal(got.key, SECRET)
})
