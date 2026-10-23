// Data-retention: superadmin window auto-purges old sessions; 0 = keep forever;
// validation; recent sessions are kept.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-retain-'))
process.env.PORT = '0'
const store = await import(storePath)

const u = store.createWorkUser({ username: 'retainuser', password: 'Passw0rd!x' })

test('default is keep-forever (0) and purge is a no-op', () => {
  assert.equal(store.getWorkRetentionDays(), 0)
  const s = store.createWorkSession(u.id, { goal: 'keep' })
  assert.equal(store.purgeOldWorkSessions().purged, 0, 'no purge when retention is off')
  assert.ok(store.getWorkSession(u.id, s.id), 'session still there')
})

test('rejects bad retention values', () => {
  assert.throws(() => store.setWorkRetentionDays(-1), (e) => e.status === 400)
  assert.throws(() => store.setWorkRetentionDays(2.5), (e) => e.status === 400)
  assert.throws(() => store.setWorkRetentionDays(99999), (e) => e.status === 400)
})

test('purges sessions older than the window, keeps recent ones', () => {
  store.setWorkRetentionDays(30)
  const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  const old = store.createWorkSession(u.id, { goal: 'old' })
  // Backdate via the live record reference.
  old.startedAt = oldDate; old.endedAt = oldDate; old.lastActivityAt = Date.parse(oldDate)
  const recent = store.createWorkSession(u.id, { goal: 'recent' })
  const r = store.purgeOldWorkSessions()
  assert.ok(r.purged >= 1, 'at least the old session purged')
  assert.equal(store.getWorkSession(u.id, old.id), null, 'old session is gone')
  assert.ok(store.getWorkSession(u.id, recent.id), 'recent session kept')
})

test('an ACTIVE session used recently is NOT purged even if it started long ago (H2)', () => {
  store.setWorkRetentionDays(30)
  const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  const s = store.createWorkSession(u.id, { goal: 'long-lived' })
  // started 40 days ago, still active (no endedAt), but used yesterday
  s.startedAt = old
  s.endedAt = null
  s.status = 'active'
  s.lastActivityAt = Date.now() - 1 * 24 * 60 * 60 * 1000
  store.purgeOldWorkSessions()
  assert.ok(store.getWorkSession(u.id, s.id), 'recently-active session kept despite old startedAt')
  store.setWorkRetentionDays(0)
})

test('setting back to 0 stops purging', () => {
  store.setWorkRetentionDays(0)
  assert.equal(store.getWorkRetentionDays(), 0)
  const s = store.createWorkSession(u.id, { goal: 'safe' })
  s.startedAt = new Date(Date.now() - 999 * 24 * 60 * 60 * 1000).toISOString()
  assert.equal(store.purgeOldWorkSessions().purged, 0, 'no purge when off, even for very old')
  assert.ok(store.getWorkSession(u.id, s.id), 'ancient session kept while retention is off')
})
