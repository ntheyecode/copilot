// Individual (no-company) users' guided-session deletions must land in the
// SUPERADMIN-visible destructive-action audit (listAdminActions) with the same
// accountable who/what/when/WHY discipline company members already get in their
// company activity log. A delete with no reason is rejected (400). Company
// members stay in their company pane and are NOT duplicated into the superadmin
// audit. Store-level, matching admin_crud.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

process.env.WORK_DATA_DIR = path.join(os.tmpdir(), 'wc-sessdelaudit-' + Date.now())
process.env.PORT = '0'
const store = await import('./store.js')

const uniq = (p) => p + Math.random().toString(36).slice(2, 8)

test('individual user session delete is recorded to the superadmin audit (who/when/reason/subject)', () => {
  const u = store.createWorkUser({ username: uniq('solo'), password: 'Passw0rd!x', email: 's@x.com' })
  assert.ok(!u.companyId, 'this user is an individual (no company)')
  const s = store.createWorkSession(u.id, { title: 'Quarterly report', goal: 'draft the Q3 numbers' })

  const before = store.listAdminActions({ limit: 2000 }).length
  const t0 = Date.now()
  store.deleteWorkSession(u.id, s.id, 'no longer needed, cleaning up my list')
  const t1 = Date.now()

  const actions = store.listAdminActions({ limit: 2000 })
  assert.ok(actions.length > before, 'a superadmin-visible audit entry was added')
  const entry = actions.find((a) => a.action === 'session_delete' && a.userId === u.id)
  assert.ok(entry, 'the individual delete appears in the superadmin audit')
  // WHO
  assert.equal(entry.username, u.username)
  // WHY (the reason they gave)
  assert.match(entry.reason, /no longer needed/)
  // WHAT the session was about (title/goal subject)
  assert.match(entry.detail, /Quarterly report/)
  // WHEN - a valid ISO timestamp within the delete window
  assert.ok(!Number.isNaN(Date.parse(entry.at)), 'at is a parseable ISO timestamp')
  const at = Date.parse(entry.at)
  assert.ok(at >= t0 - 1000 && at <= t1 + 1000, 'timestamp is when the delete happened')
})

test('a delete with an empty or too-short reason is rejected (400) and nothing is removed', () => {
  const u = store.createWorkUser({ username: uniq('solo'), password: 'Passw0rd!x' })
  const s = store.createWorkSession(u.id, { title: 'Keep me', goal: 'should survive a rejected delete' })
  const is400 = (e) => e.status === 400

  assert.throws(() => store.deleteWorkSession(u.id, s.id, ''), is400)
  assert.throws(() => store.deleteWorkSession(u.id, s.id, '   '), is400)
  assert.throws(() => store.deleteWorkSession(u.id, s.id, 'ab'), is400)

  // The session is untouched after the rejected deletes.
  assert.ok(store.listWorkSessions(u.id).some((x) => x.id === s.id), 'session not deleted without a reason')
  // And no stray superadmin audit entry was written for the rejected attempts.
  assert.ok(!store.listAdminActions({ limit: 2000 }).some((a) => a.action === 'session_delete' && a.userId === u.id))
})

test('company member delete stays in the company activity log and is NOT duplicated into the superadmin audit', () => {
  const co = store.createCompany({ name: uniq('AuditCo'), plan: 'premium', seats: 0 })
  const m = store.createManagedUser({ username: uniq('member'), password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  const s = store.createWorkSession(m.id, { title: 'Team deck', goal: 'build the board deck' })

  const beforeAdmin = store.listAdminActions({ limit: 2000 }).filter((a) => a.action === 'session_delete').length
  store.deleteWorkSession(m.id, s.id, 'merged into the shared deck instead')

  // Visible to the company admin in their company activity log (existing behavior).
  const activity = store.listWorkActivity({ companyId: co.id })
  assert.ok(activity.some((a) => a.type === 'session_deleted' && a.sessionId === s.id && /merged into the shared deck/.test(a.reason || '')),
    'company member delete recorded in the company activity log')
  // NOT duplicated into the superadmin destructive audit (company members already
  // have oversight; duplicating would double-log the company dashboard).
  const afterAdmin = store.listAdminActions({ limit: 2000 }).filter((a) => a.action === 'session_delete').length
  assert.equal(afterAdmin, beforeAdmin, 'company member delete is not mirrored to the superadmin session_delete audit')
})

test('sessions list exposes each session status (so the UI can split ended vs in-progress)', () => {
  const u = store.createWorkUser({ username: uniq('status'), password: 'Passw0rd!x' })
  const s = store.createWorkSession(u.id, { title: 'Has a status', goal: 'confirm status is exposed' })
  const listed = store.listWorkSessions(u.id).find((x) => x.id === s.id)
  assert.ok(listed, 'the session is listed')
  assert.equal(typeof listed.status, 'string')
  assert.ok(listed.status.length > 0, 'status is a non-empty string (e.g. active / ended)')
})
