// Daily task-cap gate: tier caps (Basic 4 / Advanced 8 / Premium 12), one active
// task at a time, monotonic daily count, corporate unlimited, superadmin-editable.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-taskcap-'))
process.env.PORT = '0'
const store = await import(storePath)

// A basic individual user (no company).
const u = store.createWorkUser({ username: 'capuser', password: 'Passw0rd!x' })
store.setWorkTier(u.id, 'basic')

test('default caps: basic 4, advanced 8, premium 12', () => {
  const p = store.getWorkPricing()
  assert.equal(p.tasks.basic, 4)
  assert.equal(p.tasks.advanced, 8)
  assert.equal(p.tasks.premium, 12)
  assert.equal(store.workDailyTaskLimit(u.id), 4)
})

test('must finish the current task before starting a new one', () => {
  store.startWorkTask(u.id)
  const s1 = store.createWorkSession(u.id, { goal: 'task one' })
  assert.throws(() => store.startWorkTask(u.id), (e) => e.mustCompleteCurrent === true && e.status === 409)
  // Completing (ending) the active task frees the slot.
  store.endWorkSession(u.id, s1.id)
  store.startWorkTask(u.id)               // now allowed
  const s2 = store.createWorkSession(u.id, { goal: 'task two' })
  store.endWorkSession(u.id, s2.id)
  assert.equal(store.workTasksToday(u.id), 2)
})

test('daily cap blocks the 5th task for a basic user', () => {
  // already used 2; complete 2 more to reach 4
  store.startWorkTask(u.id); const a = store.createWorkSession(u.id, { goal: '3' }); store.endWorkSession(u.id, a.id)
  store.startWorkTask(u.id); const b = store.createWorkSession(u.id, { goal: '4' }); store.endWorkSession(u.id, b.id)
  assert.equal(store.workTasksToday(u.id), 4)
  assert.throws(() => store.startWorkTask(u.id), (e) => e.taskLimit === true && e.cap === 4 && e.status === 402)
})

test('an abandoned (deleted) task still counts - no refund', () => {
  const u2 = store.createWorkUser({ username: 'capuser2', password: 'Passw0rd!x' })
  store.setWorkTier(u2.id, 'basic')
  store.startWorkTask(u2.id); const s = store.createWorkSession(u2.id, { goal: 'x' })
  store.deleteWorkSession(u2.id, s.id, 'abandoned')
  assert.equal(store.workTasksToday(u2.id), 1)   // deletion did not refund the count
  // active is clear now, so a new one can start (still counts toward the cap)
  store.startWorkTask(u2.id)
  assert.equal(store.workTasksToday(u2.id), 2)
})

test('superadmin can change the caps', () => {
  store.setWorkPricing({ tasks: { basic: 2 } })
  assert.equal(store.getWorkPricing().tasks.basic, 2)
  const u3 = store.createWorkUser({ username: 'capuser3', password: 'Passw0rd!x' })
  store.setWorkTier(u3.id, 'basic')
  assert.equal(store.workDailyTaskLimit(u3.id), 2)
})

test('non-integer or negative caps are rejected', () => {
  assert.throws(() => store.setWorkPricing({ tasks: { basic: 2.5 } }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasks: { premium: -1 } }), (e) => e.status === 400)
})

test('corporate (company) accounts are unlimited', () => {
  const co = store.createCompany ? store.createCompany({ name: 'Acme', plan: 'premium' }) : null
  if (!co) return
  const m = store.createManagedUser({ username: 'corpuser', password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.workDailyTaskLimit(m.id), Infinity)
  const usage = store.getWorkTaskUsage(m.id)
  assert.equal(usage.unlimited, true)
  assert.equal(usage.cap, null)
})
