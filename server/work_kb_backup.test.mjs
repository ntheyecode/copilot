// Auto-backup-before-clear safeguard: clearing a company knowledge base must NEVER
// lose good learnings by accident. clearCompanyLearnings snapshots the KB first,
// the admin can list/restore those snapshots, and the ring buffer is bounded.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-kbbak-'))
process.env.PORT = '0'
const store = await import(storePath)

if (!store.createCompany) { test('company KB backup (skipped: no company support)', () => {}) }
else {
  const mkCo = () => {
    const co = store.createCompany({ name: 'KB Corp ' + Math.random().toString(36).slice(2, 6), plan: 'premium' })
    const admin = store.createManagedUser({ username: 'kbadm' + Math.random().toString(36).slice(2, 6), password: 'Passw0rd!x', companyId: co.id, tier: 'premium' })
    return { co, admin }
  }
  const seed = (userId, n) => { for (let i = 1; i <= n; i++) store.addLearning(userId, { app: 'Make.com', fact: `Fact number ${i} about the tool that is long enough`, kind: 'fresh' }) }

  test('clear auto-backs-up the KB before wiping it', () => {
    const { co, admin } = mkCo()
    seed(admin.id, 3)
    assert.equal(store.getCompanyLearningsCount(co.id), 3)
    const { cleared, backupId } = store.clearCompanyLearnings(co.id, { byUserId: admin.id, reason: 'reset for test' })
    assert.equal(cleared, 3)
    assert.ok(backupId, 'a backup id is returned')
    assert.equal(store.getCompanyLearningsCount(co.id), 0)   // KB wiped
    const backups = store.listCompanyKbBackups(co.id)
    assert.equal(backups.length, 1)
    assert.equal(backups[0].count, 3)
    assert.equal(backups[0].reason, 'reset for test')
  })

  test('a backup can be restored, bringing the good learnings back', () => {
    const { co, admin } = mkCo()
    seed(admin.id, 4)
    const { backupId } = store.clearCompanyLearnings(co.id, { byUserId: admin.id, reason: 'oops' })
    assert.equal(store.getCompanyLearningsCount(co.id), 0)
    const restored = store.restoreCompanyKbBackup(co.id, backupId, { replace: true })
    assert.equal(restored, 4)
    assert.equal(store.getCompanyLearningsCount(co.id), 4)
  })

  test('clearing an empty KB takes no backup (nothing to lose)', () => {
    const { co } = mkCo()
    const { cleared, backupId } = store.clearCompanyLearnings(co.id, { reason: 'empty' })
    assert.equal(cleared, 0)
    assert.equal(backupId, null)
    assert.equal(store.listCompanyKbBackups(co.id).length, 0)
  })

  test('the auto-backup ring buffer keeps only the last 5', () => {
    const { co, admin } = mkCo()
    for (let round = 1; round <= 7; round++) { seed(admin.id, 1); store.clearCompanyLearnings(co.id, { byUserId: admin.id, reason: `round ${round}` }) }
    const backups = store.listCompanyKbBackups(co.id)
    assert.equal(backups.length, 5)              // capped
    assert.equal(backups[0].reason, 'round 7')   // newest first
    assert.equal(backups[4].reason, 'round 3')   // oldest kept
  })

  test('restoring an unknown backup id throws a 404, never silently', () => {
    const { co } = mkCo()
    assert.throws(() => store.restoreCompanyKbBackup(co.id, 'kbb_nope', {}), (e) => e.status === 404)
  })
}
