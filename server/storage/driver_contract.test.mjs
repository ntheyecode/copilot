// The storage driver contract, run against EVERY driver:
//   json      -> a temp data dir
//   postgres  -> a real Postgres served in-process by PGlite (test_pg_server.mjs)
//   postgres  -> also a real Postgres server when WORK_TEST_PG_URL is set
//                (e.g. postgres://user:pass@localhost:5432/scratch); the suite
//                then uses a throwaway schema and drops it afterwards.
// Same assertions for each, so the drivers cannot drift apart.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { openStorage } from './index.js'
import { createJsonDriver } from './json_driver.js'
import { startTestPostgres } from './test_pg_server.mjs'

const tmpDirs = []
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-storage-')); tmpDirs.push(d); return d }

const pglite = await startTestPostgres()
let schemaN = 0
const targets = [
  { name: 'json', open: () => { const dir = tmp(); return { env: {}, dataDir: dir } } },
  { name: 'postgres (PGlite)', pg: true, open: () => ({ env: { WORK_DB_DRIVER: 'postgres', WORK_DB_URL: pglite.url, WORK_DB_SCHEMA: `contract_${++schemaN}` } }) },
]
if (process.env.WORK_TEST_PG_URL) {
  targets.push({ name: 'postgres (WORK_TEST_PG_URL)', pg: true, real: true, open: () => ({ env: { WORK_DB_DRIVER: 'postgres', WORK_DB_URL: process.env.WORK_TEST_PG_URL, WORK_DB_SCHEMA: `wcp_contract_${process.pid}_${++schemaN}` } }) })
}
const opened = []
after(async () => {
  for (const d of opened) { try { d.close() } catch { /* already closed */ } }
  await pglite.stop()
  for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ } }
})

// Open a ready driver for a target: migrations applied, then server mode.
function ready(t) {
  const where = t.open()
  if (t.pg) { const a = openStorage({ ...where, mode: 'admin' }); a.migrate(); a.close() }
  const d = openStorage(where)
  opened.push(d)
  return { d, where, reopen: () => { d.close(); const d2 = openStorage(where); opened.push(d2); return d2 } }
}

const SNAP = () => ({
  users: [{ id: '1', username: 'admin', passwordHash: '$2a$10$x' }, { id: '2', username: 'b', note: 'quote " and \\ and \u0000' }],
  seq: 2,
  sessionSecret: 'enc:v1:c2VjcmV0',
  ai: { activeProvider: 'zeta', providers: { zeta: { apiKey: 'enc:v1:emV0YQ==' }, alpha: { apiKey: 'enc:v1:YWxwaGE=' } } },
  workUsage: {},
  leads: [],
  nothing: null,
  // Keys a text column cannot hold as is, and an own "__proto__".
  odd: JSON.parse(String.raw`{"__proto__":1,"nul\u0000key":2,"lone\ud800":3,"~json:x":4}`),
})
const text = (x) => JSON.stringify(x)

for (const t of targets) {
  test(`[${t.name}] empty store loads as null`, () => {
    const { d } = ready(t)
    assert.equal(d.load(), null)
  })

  test(`[${t.name}] save then load returns the same snapshot, key order included`, () => {
    const { d, reopen } = ready(t)
    const s = SNAP()
    d.save(s)
    assert.equal(text(d.load()), text(s))
    assert.equal(text(reopen().load()), text(s), 'a fresh driver (restart) reads the same')
  })

  test(`[${t.name}] successive saves: edits, appends, deletes, removed and changed collections`, () => {
    const { d, reopen } = ready(t)
    const s = SNAP()
    d.load(); d.save(s)
    s.users[1].username = 'bee'
    s.users.push({ id: '3', username: 'c' })
    s.seq = 3
    d.save(s)
    s.users.splice(0, 1)
    delete s.ai.providers.alpha
    delete s.leads
    s.workUsage = { '2:2026-10-30': { usedSeconds: 9 } }
    s.nothing = ['now', 'an', 'array']
    d.save(s)
    assert.equal(text(reopen().load()), text(s))
  })

  test(`[${t.name}] a save that fails leaves the stored data as it was`, () => {
    const { d, reopen } = ready(t)
    const s = SNAP()
    d.load(); d.save(s)
    const bad = SNAP(); bad.users.push({ id: '9', big: 10n })   // BigInt cannot be serialized
    assert.throws(() => d.save(bad), /BigInt/)
    assert.equal(text(reopen().load()), text(s))
  })

  test(`[${t.name}] status names the driver and never shows a password`, () => {
    const { d } = ready(t)
    const st = d.status()
    assert.equal(st.driver, t.pg ? 'postgres' : 'json')
    if (t.pg) {
      assert.equal(st.schemaVersion, st.latestVersion)
      assert.deepEqual(st.pending, [])
      assert.ok(!/:postgres@/.test(st.target), 'password replaced in the target')
    }
  })
}

// ---- json driver specifics ----------------------------------------------------
test('[json] the file on disk is byte-identical to the original format', () => {
  const dir = tmp()
  const d = createJsonDriver({ dataDir: dir })
  const s = SNAP()
  d.save(s)
  assert.equal(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'), JSON.stringify(s, null, 2))
  assert.ok(!fs.existsSync(path.join(dir, 'db.json.tmp')), 'no temp file left behind')
})

test('[json] a corrupt db.json is kept and the load refuses (never reseeds)', () => {
  const dir = tmp()
  fs.writeFileSync(path.join(dir, 'db.json'), '{"users": [')
  assert.throws(() => createJsonDriver({ dataDir: dir }).load(), /db\.json is CORRUPT.*refusing to start/)
  assert.equal(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'), '{"users": [')
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('db.json.corrupt-')), 'a copy is saved')
})

// ---- postgres driver specifics --------------------------------------------------
const pgEnv = (schema, extra = {}) => ({ WORK_DB_DRIVER: 'postgres', WORK_DB_URL: pglite.url, WORK_DB_SCHEMA: schema, ...extra })

async function sql(text) {
  const pg = (await import('pg')).default
  const c = new pg.Client({ connectionString: pglite.url })
  await c.connect()
  try { return (await c.query(text)).rows } finally { await c.end() }
}

test('[postgres] the server refuses to start on an undeployed schema, says what to run, and creates nothing', async () => {
  assert.throws(() => openStorage({ env: pgEnv('pending_one') }), (e) => e.code === 'WCP_SCHEMA_PENDING' && /npm run db:migrate/.test(e.message) && /will not fall back to db\.json/.test(e.message))
  const st = openStorage({ env: pgEnv('pending_one'), mode: 'read' })
  assert.deepEqual(st.status().pending, [1])
  st.close()
  // Only migrate() runs DDL, so a least-privilege runtime role can start the server.
  assert.equal((await sql(`SELECT to_regnamespace('pending_one') AS n`))[0].n, null)
})

test('[postgres] a save that fails inside the transaction rolls back, and the driver can save again', async () => {
  const env = pgEnv('mid_tx', { WORK_DB_AUTO_MIGRATE: '1' })
  const d = openStorage({ env }); opened.push(d)
  const s = SNAP()
  d.load(); d.save(s)
  // Fail on the records upsert, after the revision bump and the collections upsert.
  await sql(`CREATE FUNCTION mid_tx.boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.doc::text LIKE '%BOOM%' THEN RAISE EXCEPTION 'boom'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER boom BEFORE INSERT OR UPDATE ON mid_tx.wcp_records FOR EACH ROW EXECUTE FUNCTION mid_tx.boom();`)
  const bad = SNAP(); bad.newcol = ['x']; bad.users[0].username = 'BOOM'
  assert.throws(() => d.save(bad), /boom/)
  const reread = openStorage({ env, mode: 'read' })
  assert.equal(text(reread.load()), text(s), 'nothing of the failed save is visible')
  reread.close()
  const good = SNAP(); good.users[0].username = 'fine'
  d.save(good)
  assert.equal(text(d.load()), text(good))
})

test('[postgres] after a lost commit answer, the next save reloads and succeeds', async () => {
  const env = pgEnv('lost_ack', { WORK_DB_AUTO_MIGRATE: '1' })
  const d = openStorage({ env }); opened.push(d)
  const s = SNAP()
  d.load(); d.save(s)
  // Stand-in for "our second commit landed but its answer was lost": the
  // revision moved on while the writer id is still ours.
  await sql(`UPDATE lost_ack.wcp_meta SET value = (value::bigint + 1)::text WHERE key = 'revision'`)
  s.users[1].username = 'after the blip'
  d.save(s)
  assert.equal(text(d.load()), text(s))
})

test('[postgres] WORK_DB_AUTO_MIGRATE=1 deploys the schema at start; migrate is idempotent', () => {
  const d = openStorage({ env: pgEnv('auto_one', { WORK_DB_AUTO_MIGRATE: '1' }) })
  opened.push(d)
  assert.deepEqual(d.status().pending, [])
  assert.deepEqual(d.migrate().applied, [], 'running it again applies nothing')
  d.close()
})

test('[postgres] an unreachable database fails fast and loud, with no password in the message', () => {
  const t0 = Date.now()
  assert.throws(
    () => openStorage({ env: { WORK_DB_DRIVER: 'postgres', WORK_DB_URL: 'postgres://u:Very-Secret-1@127.0.0.1:1/x', WORK_DB_CONNECT_TIMEOUT_MS: '3000', WORK_DB_SCHEMA: 'nowhere' } }),
    (e) => /Refusing to start/.test(e.message) && /u:\*\*\*@127\.0\.0\.1:1/.test(e.message) && !e.message.includes('Very-Secret-1'),
  )
  assert.ok(Date.now() - t0 < 20000)
})

test('[postgres] a second writer cannot overwrite newer data (revision check)', () => {
  // PGlite is one backend, so both drivers get the advisory lock; the revision
  // check is what must stop the stale writer.
  const env = pgEnv('two_writers', { WORK_DB_AUTO_MIGRATE: '1' })
  const a = openStorage({ env }); opened.push(a)
  const b = openStorage({ env }); opened.push(b)
  a.load(); b.load()
  const s = SNAP()
  a.save(s)
  const stale = SNAP(); stale.users[0].username = 'stale'
  assert.throws(() => b.save(stale), (e) => e.code === 'WCP_REVISION_CONFLICT' && /another writer/.test(e.message))
  assert.equal(text(a.load()), text(s), 'the newer data is intact')
})

test('[postgres] secrets are stored exactly as given (the store hands the driver ciphertext)', async () => {
  const env = pgEnv('secrets_raw', { WORK_DB_AUTO_MIGRATE: '1' })
  const d = openStorage({ env }); opened.push(d)
  d.load(); d.save(SNAP())
  const pg = (await import('pg')).default
  const c = new pg.Client({ connectionString: pglite.url })
  await c.connect()
  try {
    const r = await c.query(`SELECT doc::text AS doc FROM "secrets_raw".wcp_records WHERE collection = 'ai' AND rid = 'providers'`)
    assert.match(r.rows[0].doc, /"apiKey":"enc:v1:emV0YQ=="/)
  } finally { await c.end() }
})

if (process.env.WORK_TEST_PG_URL) {
  test('[postgres real] a second server on the same schema is refused at start (advisory lock)', () => {
    const env = { WORK_DB_DRIVER: 'postgres', WORK_DB_URL: process.env.WORK_TEST_PG_URL, WORK_DB_SCHEMA: `wcp_lock_${process.pid}`, WORK_DB_AUTO_MIGRATE: '1' }
    const a = openStorage({ env }); opened.push(a)
    assert.throws(() => openStorage({ env }), /already using schema/)
  })
}
