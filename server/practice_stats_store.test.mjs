// Recommended Practices - phase 3 (store side): counters per company + platform,
// history-driven ranking, and the completion loop closing on task done.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-prac-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

test('practice stats: record bumps company + platform, ranks by history, completes once', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const u = store.createManagedUser({ username: uniq('u'), password: 'Passw0rd!x', companyId: co.id, tier: 'premium' })

  // Record: offered/accepted bump BOTH the company and the platform aggregate.
  store.recordPracticeStat(co.id, 'sec-mfa', 'offered')
  store.recordPracticeStat(co.id, 'sec-mfa', 'accepted')
  store.recordPracticeStat(co.id, 'sec-backup', 'offered')   // offered, never accepted
  const cs = store.getCompanyPracticeStats(co.id)
  assert.equal(cs['sec-mfa'].accepted, 1)
  assert.equal(cs['sec-backup'].accepted, 0)
  assert.equal(store.getPlatformPracticeStats()['sec-mfa'].offered, 1)

  // A solo user (no company) still moves the platform aggregate only.
  store.recordPracticeStat(null, 'sec-mfa', 'offered')
  assert.equal(store.getPlatformPracticeStats()['sec-mfa'].offered, 2)
  assert.deepEqual(store.getCompanyPracticeStats(co.id)['sec-mfa'].offered, 1)

  // Ranking: the practice this company accepts floats above the one it ignores.
  const ranked = store.rankPracticeSuggestions(u.id, [{ id: 'sec-backup' }, { id: 'sec-mfa' }])
  assert.deepEqual(ranked.map((s) => s.id), ['sec-mfa', 'sec-backup'])

  // Completion loop: a roped-in practice task that finishes counts once.
  const p = store.createWorkProject(u.id, { name: 'P', goal: 'secure the admin console', companyId: co.id })
  const inj = store.injectWorkProjectTask(u.id, p.id, { request: 'Enable multi-factor sign-in on the admin account', doneState: 'MFA shows enabled', practiceId: 'sec-mfa' })
  const task = inj.created
  assert.equal(task.practiceId, 'sec-mfa')
  // Drive the realistic path: a guided session starts (pending -> active, linked),
  // then finishes.
  store.setWorkProjectTaskState(u.id, p.id, task.id, 'active')
  store.linkWorkProjectTaskSession(u.id, p.id, task.id, 'sess-x')
  store.completeProjectTaskForSession(u.id, 'sess-x', { outcome: 'done' })
  assert.equal(store.getCompanyPracticeStats(co.id)['sec-mfa'].completed, 1)
  // Idempotent: completing an already-done task does not double-count.
  store.completeProjectTaskForSession(u.id, 'sess-x', { outcome: 'done' })
  assert.equal(store.getCompanyPracticeStats(co.id)['sec-mfa'].completed, 1)
})
