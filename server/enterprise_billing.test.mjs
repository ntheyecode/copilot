// Enterprise billing hierarchy END-TO-END through the store: superadmin sets a
// company pool + per-hour price; the pool seeds immediately; a company-admin
// per-user HOUR ceiling clamps consumption and surfaces an actionable limit; a
// per-user TASK ceiling gates task starts; an additional-hours request flows
// company-admin -> superadmin approve -> pool credited + invoice line; and the
// 75% alerts reach the superadmin (pool) and company admins (user ceiling).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-entbill-'))
process.env.PORT = '0'
const store = await import(storePath)

const co = store.createCompany({ name: 'Northwind Logistics', plan: 'advanced', seats: 25 })
const admin = store.createManagedUser({ username: 'nw_admin', password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin', tier: 'advanced' })
const member = store.createManagedUser({ username: 'nw_member', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'advanced' })

test('superadmin sets the pool; it seeds immediately and surfaces honestly', () => {
  const pub = store.setCompanyEnterprise(co.id, { poolHours: 100, overageUsdPerHour: 10, monthEnd: 'forfeit', timezone: 'America/New_York' })
  assert.equal(pub.enterprise.poolMonthlySeconds, 100 * 3600)
  assert.equal(pub.enterprise.poolRemainingSeconds, 100 * 3600)   // seeded now, no wait for a rollover
  assert.equal(pub.enterprise.overageUsdPerHour, 10)
  assert.equal(pub.enterprise.stripeEnabled, false)               // NO Stripe for companies by default
  const usage = store.getWorkUsage(member.id)
  assert.ok(usage.enterprise, 'company user usage carries an enterprise snapshot')
  assert.equal(usage.enterprise.pool.monthlySeconds, 100 * 3600)
})

test('a company-admin per-user HOUR ceiling clamps consumption and is actionable', () => {
  // Tighten this member to 0.05h (180s) of guided time per day.
  store.setUserAllocation(co.id, member.id, { group: 'member', alloc: { hours: { day: 0.05 } } })
  // Heartbeats are capped at 60s; four of them REQUEST 240s but only 180 land.
  for (let i = 0; i < 4; i++) store.addWorkUsage(member.id, 60)
  const usage = store.getWorkUsage(member.id)
  assert.equal(usage.enterprise.hours.day.limit, 180)
  assert.equal(usage.enterprise.hours.day.used, 180)             // clamped, never 240
  assert.equal(usage.enterprise.hours.day.remaining, 0)
  assert.equal(usage.remainingSeconds, 0)
  assert.equal(usage.exhausted, true)
  assert.equal(usage.ceilingHit, true)                            // allowance spent while the pool still has time
  assert.equal(usage.poolExhausted, false)
})

test('a per-user TASK ceiling gates task starts with a clear message', () => {
  const m2 = store.createManagedUser({ username: 'nw_m2', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'advanced' })
  store.setUserAllocation(co.id, m2.id, { alloc: { tasks: { day: 1 } } })
  store.startWorkTask(m2.id)                                      // first allowed
  assert.throws(() => store.startWorkTask(m2.id), (e) => e.taskLimit === true && e.status === 402)
  const tu = store.getWorkTaskUsage(m2.id)
  assert.equal(tu.unlimited, false)
  assert.equal(tu.remaining, 0)
})

test('with no allocation set, a company user stays unlimited on tasks', () => {
  const m3 = store.createManagedUser({ username: 'nw_m3', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'advanced' })
  for (let i = 0; i < 5; i++) store.startWorkTask(m3.id)          // no cap -> no throw
  assert.equal(store.getWorkTaskUsage(m3.id).unlimited, true)
})

test('additional-hours request flows admin -> superadmin approve -> pool + invoice', () => {
  const before = store.companyPoolDashboard(co.id).pool.remainingSeconds
  const req = store.requestCompanyHours(co.id, admin.id, { hours: 50, note: 'quarter-end push' })
  assert.equal(req.status, 'pending')
  // superadmin sees it in their inbox
  assert.ok(store.listSuperadminNotifications().some((n) => n.type === 'hours_requested' && n.companyId === co.id))
  const decided = store.decideCompanyHours(co.id, req.id, { approve: true, by: 'superadmin' })
  assert.equal(decided.status, 'approved')
  const after = store.companyPoolDashboard(co.id).pool.remainingSeconds
  assert.equal(after - before, 50 * 3600)                        // pool credited
  const pub = store.getCompany(co.id)
  assert.equal(pub.billingItemCount >= 1, true)                  // billed on the company invoice
  // company admin is notified of the decision
  assert.ok(store.listNotificationsForUser(admin.id).some((n) => n.type === 'hours_decided'))
})

test('deciding an already-decided request is refused', () => {
  const req = store.requestCompanyHours(co.id, admin.id, { hours: 5 })
  store.decideCompanyHours(co.id, req.id, { approve: false, by: 'superadmin', note: 'not now' })
  assert.throws(() => store.decideCompanyHours(co.id, req.id, { approve: true }), (e) => e.status === 409)
})

test('a user crossing 75% of their allowance alerts the company admins', () => {
  const m4 = store.createManagedUser({ username: 'nw_m4', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'advanced' })
  store.setUserAllocation(co.id, m4.id, { alloc: { hours: { day: 0.1 } } })   // 360s; 75% = 270s
  for (let i = 0; i < 5; i++) store.addWorkUsage(m4.id, 60)                    // 300s used -> 83%
  assert.ok(store.listNotificationsForUser(admin.id).some((n) => n.type === 'user_ceiling_threshold' && n.userId === m4.id))
})

test('a company crossing 75% of its pool alerts the superadmin', () => {
  // Drop the live pool to ~8% remaining (92% used) via a superadmin correction,
  // then any heartbeat on a company user trips the pool alert to the superadmin.
  const dash = store.companyPoolDashboard(co.id)
  const drop = -(Math.round(dash.pool.remainingSeconds * 0.92))
  store.grantCompanyPoolSeconds(co.id, Math.floor(drop / 60) * 60)
  const m5 = store.createManagedUser({ username: 'nw_m5', password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'advanced' })
  store.addWorkUsage(m5.id, 60)
  assert.ok(store.listSuperadminNotifications().some((n) => n.type === 'company_pool_threshold' && n.companyId === co.id))
})
