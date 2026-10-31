// The postgres storage driver (same contract as json_driver.js). One driver
// serves all three networked or local choices: Postgres on the customer's own
// box, a database we provision in the cloud for them, or their own external
// database. Only the connection string differs.
//
// The snapshot is stored as rows (doc_layout.js). Each save sends only the rows
// that changed since the last load or save, in one transaction. The database
// work runs in a worker thread (postgres_worker.js) behind a synchronous bridge
// (sync_bridge.js), so save() returns only once the transaction has committed,
// exactly like the json driver's fsync + rename.
import { createSyncBridge } from './sync_bridge.js'
import { toLayout, fromRows, layoutFromRows, diffLayout, isEmptyDiff } from './doc_layout.js'

// mode 'server': refuse to open while migrations are pending (unless
// cfg.autoMigrate). mode 'admin': db:migrate / db:import (takes the
// single-writer lock). mode 'read': db:status / db:export (no lock, no writes,
// so it works while a server is running).
export function createPostgresDriver(cfg, { mode = 'server' } = {}) {
  const bridge = createSyncBridge(new URL('./postgres_worker.js', import.meta.url))
  const where = `${cfg.display} (schema ${cfg.schema})`
  const call = (op, payload, timeoutMs = cfg.timeoutMs) => {
    try { return bridge.call(op, payload, timeoutMs) } catch (e) {
      const m = String(e && e.message || e)
      const err = new Error(m.startsWith('[storage]') ? m : `[storage] database ${where}: ${m}`)
      if (e && e.code) err.code = e.code
      throw err
    }
  }
  try {
    call('open', {
      url: cfg.url, ssl: cfg.ssl, ca: cfg.ca, schema: cfg.schema,
      timeoutMs: cfg.timeoutMs, connectTimeoutMs: cfg.connectTimeoutMs,
      autoMigrate: !!cfg.autoMigrate, mode,
    }, cfg.connectTimeoutMs + cfg.timeoutMs)
  } catch (e) {
    bridge.terminate()
    const err = new Error(`${e.message}\n[storage] Refusing to start: the store will not fall back to db.json. Fix the database settings (WORK_DB_URL, WORK_DB_SSL) or unset WORK_DB_DRIVER to use the json driver.`)
    err.code = e.code
    throw err
  }

  let layout = null      // what the database holds, as of the last load/save
  let revision = null

  function load() {
    const r = call('load')
    revision = r.revision
    layout = layoutFromRows(r.collections, r.records)
    if (!r.collections.length) return null
    return fromRows(r.collections, r.records)
  }

  function save(snapshot) {
    if (revision === null) load()     // a save must know what it replaces
    const next = toLayout(snapshot)
    const attempt = () => {
      const diff = diffLayout(layout, next)
      if (isEmptyDiff(diff)) return
      const r = call('save', { diff, expectRevision: revision })
      // Only after the commit: the next diff is taken against this state.
      revision = r.revision
      layout = next
    }
    try { attempt() } catch (e) {
      // Our own earlier commit landed but its answer was lost (the connection
      // dropped during COMMIT). Re-read what the database really holds and
      // diff again, once. Another writer's change still refuses.
      if (e.code !== 'WCP_REVISION_SELF') throw e
      load()
      attempt()
    }
  }

  let closed = false
  function close() {
    if (closed) return
    closed = true
    try { call('close') } finally { bridge.terminate() }
  }

  return Object.freeze({
    name: 'postgres',
    load,
    save,
    migrate: () => call('migrate'),
    status: () => ({ driver: 'postgres', target: cfg.display, schema: cfg.schema, ssl: cfg.ssl, ...call('status') }),
    close,
  })
}
