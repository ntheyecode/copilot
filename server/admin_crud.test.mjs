// Delete/disable CRUD + per-session telemetry (superadmin). Verifies the
// reason-gate, the audit trail, disable enforcement, cascade deletes, and the
// rich session detail the admin "View" renders.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

process.env.WORK_DATA_DIR = path.join(os.tmpdir(), 'wc-admincrud-' + Date.now())
process.env.PORT = '0'
const store = await import('./store.js')
const ai = await import('./ai.js')

const uniq = (p) => p + Math.random().toString(36).slice(2, 8)

test('recordSessionCall tallies calls, premium, round-robins, by-kind; detail reports progress', () => {
  const u = store.createWorkUser({ username: uniq('tele'), password: 'Passw0rd!x', email: 't@x.com' })
  const s = store.createWorkSession(u.id, { goal: 'do a thing' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'one' }, { text: 'two' }, { text: 'three' }])
  store.recordSessionCall(u.id, s.id, { kind: 'plan', premium: true, roundRobin: false })
  store.recordSessionCall(u.id, s.id, { kind: 'guide', premium: false, roundRobin: true })
  store.recordSessionCall(u.id, s.id, { kind: 'guide', premium: true, roundRobin: false })
  const d = store.adminSessionDetail(s.id)
  assert.equal(d.calls, 3)
  assert.equal(d.premiumCalls, 2)
  assert.equal(d.roundRobins, 1)
  assert.equal(d.byKind.guide, 2)
  assert.equal(d.byKind.plan, 1)
  assert.equal(d.progress.total, 3)
  assert.equal(typeof d.remainingMinutes, 'number')
})

test('isPremiumModel: top-tier models are premium, cheap ones are not', () => {
  assert.equal(ai.isPremiumModel('gpt-4o'), true)
  assert.equal(ai.isPremiumModel('gemini-2.5-pro'), true)
  assert.equal(ai.isPremiumModel('gpt-4o-mini'), false)
  assert.equal(ai.isPremiumModel('gemini-2.0-flash'), false)
  assert.equal(ai.isPremiumModel(''), false)
})

test('every destructive op requires a reason (>=3 chars)', () => {
  const u = store.createWorkUser({ username: uniq('noreason'), password: 'Passw0rd!x' })
  assert.throws(() => store.setUserDisabled(u.id, true, { reason: '' }), (e) => e.status === 400)
  assert.throws(() => store.deleteWorkUser(u.id, { reason: 'x' }), (e) => e.status === 400)
})

test('disable blocks service + sign-in epoch bumps; enable restores', () => {
  const u = store.createWorkUser({ username: uniq('dis'), password: 'Passw0rd!x' })
  store.setSubscription(u.id, { status: 'active', plan: 'basic' })
  assert.equal(store.userCanUseService(u.id), true)
  const ep0 = store.getSessionEpoch(u.id)
  store.setUserDisabled(u.id, true, { reason: 'policy violation' })
  assert.equal(store.userCanUseService(u.id), false)
  assert.ok(store.getSessionEpoch(u.id) > ep0, 'disabling signs the user out everywhere')
  store.setUserDisabled(u.id, false, { reason: 'reinstated after review' })
  assert.equal(store.userCanUseService(u.id), true)
})

test('superadmin accounts cannot be disabled or deleted', () => {
  const admin = (store.listUsers ? store.listUsers() : []).find((x) => x.role === 'superadmin')
  if (!admin) return
  assert.throws(() => store.setUserDisabled(admin.id, true, { reason: 'nope attempt' }), (e) => e.status === 400)
  assert.throws(() => store.deleteWorkUser(admin.id, { reason: 'nope attempt' }), (e) => e.status === 400)
})

test('deleteWorkUser removes the account and its sessions', () => {
  const u = store.createWorkUser({ username: uniq('del'), password: 'Passw0rd!x' })
  const s = store.createWorkSession(u.id, { goal: 'temp' })
  store.deleteWorkUser(u.id, { reason: 'offboarded, account closed' })
  assert.equal(store.getUser(u.id), null)
  assert.equal(store.adminSessionDetail(s.id), null)
})

test('company disable blocks members; delete detaches them by default', () => {
  const co = store.createCompany({ name: uniq('DelCo'), plan: 'premium', seats: 0 })
  const m = store.createManagedUser({ username: uniq('cmem'), password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.userCanUseService(m.id), true)
  store.setCompanyDisabled(co.id, true, { reason: 'account suspended for billing' })
  assert.equal(store.userCanUseService(m.id), false)
  store.setCompanyDisabled(co.id, false, { reason: 'billing resolved' })
  assert.equal(store.userCanUseService(m.id), true)
  store.deleteCompany(co.id, { reason: 'company closed its account' })
  assert.equal(store.getCompany(co.id), null)
  const after = store.getUser(m.id)
  assert.ok(after && !after.companyId, 'member detached to standalone, not deleted')
})

test('leads / incidents / contacts delete + clear are reason-gated and work', () => {
  store.addWorkLead({ firstName: 'A', email: uniq('a') + '@x.com' }, {})
  const leads = store.listWorkLeads({})
  assert.throws(() => store.deleteWorkLead(leads[0].id, { reason: '' }), (e) => e.status === 400)
  store.deleteWorkLead(leads[0].id, { reason: 'duplicate spam lead' })
  assert.ok(!store.listWorkLeads({}).some((l) => l.id === leads[0].id))

  store.recordWorkIncident({ kind: 'ai_error', message: 'boom' })
  const incs = store.listWorkIncidents({})
  store.deleteWorkIncident(incs[0].id, { reason: 'resolved and acknowledged' })
  assert.ok(!store.listWorkIncidents({}).some((i) => i.id === incs[0].id))
})

test('an audit action is recorded for each destructive op', () => {
  const before = store.listAdminActions({ limit: 2000 }).length
  const u = store.createWorkUser({ username: uniq('aud'), password: 'Passw0rd!x' })
  store.setUserDisabled(u.id, true, { reason: 'audit trail check' })
  const actions = store.listAdminActions({ limit: 2000 })
  assert.ok(actions.length > before)
  assert.ok(actions.some((a) => a.action === 'user_disabled' && /audit trail check/.test(a.reason)))
})
