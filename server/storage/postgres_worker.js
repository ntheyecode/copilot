// Worker thread for the postgres driver: owns the one database connection and
// runs each operation asynchronously while the main thread waits (see
// sync_bridge.js). Single writer by design:
//   - in 'server' and 'admin' mode the connection holds a session advisory
//     lock on this schema for its whole life, so a second server (or a
//     db:migrate / db:import run) against the same schema is refused;
//   - every save is a transaction that also checks and bumps a revision, so
//     even if the lock were lost (dropped connection, a pooler in transaction
//     mode) no writer can overwrite data it has not seen.
// 'read' mode (db:status, db:export) takes no lock and writes nothing, so it
// works while a server is running.
//
// Only migrate() runs DDL. The server itself needs nothing beyond reading and
// writing the three tables, so a least-privilege runtime role works.
import { workerData } from 'node:worker_threads'
import crypto from 'node:crypto'
import { serveSync } from './sync_bridge.js'
import { MIGRATIONS, LATEST_VERSION, pendingMigrations } from './migrations.js'

const LOCK_CLASS = 0x57435030   // 'WCP0': the first key of the two-key advisory lock
// This process's writer id, recorded with every save: after a dropped
// connection it tells "my own commit whose answer was lost" apart from "another
// writer".
const WRITER = crypto.randomUUID()

let pg = null
let cfg = null
let client = null
let S = null            // quoted schema name

const q = (text, params) => client.query(text, params)
const locking = () => cfg.mode !== 'read'

async function connect() {
  if (!pg) {
    try { pg = (await import('pg')).default } catch (e) { throw new Error(`the "pg" package is not installed (${e.message}). Run npm install.`) }
  }
  const ssl = cfg.ssl === 'disable' ? false
    : cfg.ssl === 'require' ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true, ...(cfg.ca ? { ca: cfg.ca } : {}) }
  const c = new pg.Client({
    connectionString: cfg.url,
    ssl,
    connectionTimeoutMillis: cfg.connectTimeoutMs,
    query_timeout: cfg.timeoutMs,
    application_name: 'workcopilot',
  })
  // A dropped connection must not crash the worker; the next operation reconnects.
  c.on('error', () => { if (client === c) client = null })
  c.on('end', () => { if (client === c) client = null })
  await c.connect()
  client = c
  if (locking()) {
    const r = await q(`SELECT pg_try_advisory_lock(${LOCK_CLASS}, hashtext($1)) AS ok`, [cfg.schema])
    if (!r.rows[0].ok) {
      client = null
      await c.end().catch(() => {})
      throw new Error(`another WorkCoPilot server, or a db:migrate / db:import run, is already using schema "${cfg.schema}" on this database. Stop it first: two writers would overwrite each other.`)
    }
  }
}

async function ready() { if (!client) await connect() }

async function tx(fn) {
  await q('BEGIN')
  try { const out = await fn(); await q('COMMIT'); return out } catch (e) { await q('ROLLBACK').catch(() => {}); throw e }
}

// Applied migration versions, without creating anything.
async function applied() {
  const t = await q('SELECT to_regclass($1) AS t', [`${S}.wcp_schema_migrations`])
  if (!t.rows[0].t) return []
  return (await q(`SELECT version FROM ${S}.wcp_schema_migrations ORDER BY version`)).rows.map((x) => x.version)
}

async function migrate() {
  await ready()
  await q(`CREATE SCHEMA IF NOT EXISTS ${S}`)
  await q(`CREATE TABLE IF NOT EXISTS ${S}.wcp_schema_migrations (
    version integer PRIMARY KEY,
    name text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  const done = []
  for (const m of pendingMigrations(await applied())) {
    await tx(async () => {
      for (const sql of m.up(S)) await q(sql)
      await q(`INSERT INTO ${S}.wcp_schema_migrations (version, name) VALUES ($1, $2)`, [m.version, m.name])
    })
    done.push({ version: m.version, name: m.name })
  }
  return { applied: done }
}

async function requireMigrated() {
  const pending = pendingMigrations(await applied())
  if (pending.length) {
    const e = new Error(`the database schema "${cfg.schema}" is at version ${LATEST_VERSION - pending.length} of ${LATEST_VERSION}. Run "npm run db:migrate" (or set WORK_DB_AUTO_MIGRATE=1) and start again.`)
    e.code = 'WCP_SCHEMA_PENDING'
    throw e
  }
}

async function meta(key) {
  const r = await q(`SELECT value FROM ${S}.wcp_meta WHERE key = $1`, [key])
  return r.rows.length ? r.rows[0].value : null
}

const cols = (rows, ...keys) => keys.map((k) => rows.map((r) => r[k]))

serveSync(workerData, {
  async open(c) {
    cfg = c
    S = '"' + c.schema + '"'
    await connect()
    if (c.mode === 'server') {
      if (c.autoMigrate) await migrate()
      await requireMigrated()
    }
    return { ok: true }
  },

  async migrate() { return migrate() },

  async status() {
    await ready()
    const versions = await applied()
    const pending = pendingMigrations(versions).map((m) => m.version)
    let collections = 0, records = 0, rev = null
    if (!pending.includes(1)) {
      collections = Number((await q(`SELECT count(*)::int AS n FROM ${S}.wcp_collections`)).rows[0].n)
      records = Number((await q(`SELECT count(*)::int AS n FROM ${S}.wcp_records`)).rows[0].n)
      rev = await meta('revision')
    }
    return { schemaVersion: versions.length ? Math.max(...versions) : 0, latestVersion: LATEST_VERSION, pending, collections, records, revision: rev, migrations: MIGRATIONS.length }
  },

  async load() {
    await ready()
    await requireMigrated()
    // One consistent snapshot of all three tables.
    return tx(async () => {
      await q('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
      const collections = (await q(`SELECT name, kind, pos FROM ${S}.wcp_collections`)).rows
      const records = (await q(`SELECT collection, rid, pos, doc::text AS doc FROM ${S}.wcp_records`)).rows
      return { collections, records, revision: await meta('revision') }
    })
  },

  async save({ diff, expectRevision }) {
    if (!locking()) throw new Error('this connection was opened read-only.')
    await ready()
    return tx(async () => {
      const bumped = await q(`UPDATE ${S}.wcp_meta SET value = (value::bigint + 1)::text WHERE key = 'revision' AND value = $1 RETURNING value`, [String(expectRevision)])
      if (!bumped.rows.length) {
        const found = await meta('revision')
        const lastWriter = await meta('writer')
        const e = new Error(lastWriter === WRITER
          ? `this server's previous save was committed but its answer was lost (expected revision ${expectRevision}, found ${found}).`
          : `the database was changed by another writer since this server loaded it (expected revision ${expectRevision}, found ${found}). Nothing was written. Stop the other writer and restart this server so it loads the current data.`)
        e.code = lastWriter === WRITER ? 'WCP_REVISION_SELF' : 'WCP_REVISION_CONFLICT'
        throw e
      }
      await q(`INSERT INTO ${S}.wcp_meta (key, value) VALUES ('writer', $1) ON CONFLICT (key) DO UPDATE SET value = excluded.value`, [WRITER])
      const uc = diff.upsertCollections
      if (uc.length) {
        await q(`INSERT INTO ${S}.wcp_collections (name, kind, pos)
          SELECT * FROM unnest($1::text[], $2::text[], $3::int[])
          ON CONFLICT (name) DO UPDATE SET kind = excluded.kind, pos = excluded.pos`, cols(uc, 'name', 'kind', 'pos'))
      }
      if (diff.deleteRecords.length) {
        await q(`DELETE FROM ${S}.wcp_records r USING unnest($1::text[], $2::text[]) AS d(collection, rid)
          WHERE r.collection = d.collection AND r.rid = d.rid`, cols(diff.deleteRecords, 'collection', 'rid'))
      }
      if (diff.moveRecords.length) {
        await q(`UPDATE ${S}.wcp_records r SET pos = m.pos FROM unnest($1::text[], $2::text[], $3::int[]) AS m(collection, rid, pos)
          WHERE r.collection = m.collection AND r.rid = m.rid`, cols(diff.moveRecords, 'collection', 'rid', 'pos'))
      }
      if (diff.upsertRecords.length) {
        await q(`INSERT INTO ${S}.wcp_records (collection, rid, pos, doc)
          SELECT c, r, p, d::json FROM unnest($1::text[], $2::text[], $3::int[], $4::text[]) AS t(c, r, p, d)
          ON CONFLICT (collection, rid) DO UPDATE SET pos = excluded.pos, doc = excluded.doc, updated_at = now()`, cols(diff.upsertRecords, 'collection', 'rid', 'pos', 'doc'))
      }
      if (diff.deleteCollections.length) {
        await q(`DELETE FROM ${S}.wcp_collections WHERE name = ANY($1::text[])`, [diff.deleteCollections])
      }
      return { revision: bumped.rows[0].value }
    })
  },

  async close() {
    const c = client
    client = null
    if (c) {
      if (locking()) await c.query(`SELECT pg_advisory_unlock(${LOCK_CLASS}, hashtext($1))`, [cfg.schema]).catch(() => {})
      await c.end().catch(() => {})
    }
    return { ok: true }
  },
})
