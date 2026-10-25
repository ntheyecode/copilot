// Task-start gate under the BANKED task-credit economy: data-driven earn rates
// (1/2/4/6), one active task at a time (409), consume-on-start with no refund on
// abandon, insufficient-credit gate (clear message), superadmin-editable rates,
// corporate unlimited (no credit accounting). Accrual/banking/trade specifics
// live in task_credits.test.mjs.
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

// A basic individual user (no company). Basic earn rate = 2/day; first read of
// the balance seeds one day's worth (2 credits) so they can start today.
const u = store.createWorkUser({ username: 'capuser', password: 'Passw0rd!x' })
store.setWorkTier(u.id, 'basic')

test('default earn rates: lite 1, basic 2, advanced 4, premium 6', () => {
  const p = store.getWorkPricing()
  assert.equal(p.tasks.lite, 1)
  assert.equal(p.tasks.basic, 2)
  assert.equal(p.tasks.advanced, 4)
  assert.equal(p.tasks.premium, 6)
  assert.equal(store.workDailyTaskLimit(u.id), 2)
})

test('must finish the current task before starting a new one', () => {
  // Seeded with 2 credits. Start one (consumes 1 -> balance 1).
  store.startWorkTask(u.id)
  const s1 = store.createWorkSession(u.id, { goal: 'task one' })
  // An active task blocks a new start regardless of balance (409 finish-first).
  assert.throws(() => store.startWorkTask(u.id), (e) => e.mustCompleteCurrent === true && e.status === 409)
  // Completing (ending) the active task frees the slot.
  store.endWorkSession(u.id, s1.id)
  store.startWorkTask(u.id)               // now allowed (consumes the 2nd credit -> balance 0)
  const s2 = store.createWorkSession(u.id, { goal: 'task two' })
  store.endWorkSession(u.id, s2.id)
  assert.equal(store.workTasksToday(u.id), 2)
  assert.equal(store.getWorkTaskUsage(u.id).taskCredits, 0)
})

test('out of credits blocks the next task with a clear, actionable message', () => {
  // Balance is 0 from the previous test; no active task.
  assert.equal(store.getWorkTaskUsage(u.id).remaining, 0)
  assert.throws(() => store.startWorkTask(u.id), (e) =>
    e.taskLimit === true && e.status === 402 && e.taskCredits === 0 &&
    /out of task credits/i.test(e.message) && /earn 2 more/i.test(e.message))
})

test('an abandoned (deleted) task still consumes a credit - no refund', () => {
  const u2 = store.createWorkUser({ username: 'capuser2', password: 'Passw0rd!x' })
  store.setWorkTier(u2.id, 'basic')                 // seeds 2 credits on first read below
  assert.equal(store.getWorkTaskUsage(u2.id).taskCredits, 2)
  store.startWorkTask(u2.id)                         // consume 1 -> balance 1
  const s = store.createWorkSession(u2.id, { goal: 'x' })
  store.deleteWorkSession(u2.id, s.id, 'abandoned')
  assert.equal(store.workTasksToday(u2.id), 1)       // deletion did not refund the count
  assert.equal(store.getWorkTaskUsage(u2.id).taskCredits, 1)  // nor the credit
  // active is clear now, so a new one can start (consumes the last credit)
  store.startWorkTask(u2.id)
  assert.equal(store.workTasksToday(u2.id), 2)
  assert.equal(store.getWorkTaskUsage(u2.id).taskCredits, 0)
})

test('superadmin can change the earn rate', () => {
  store.setWorkPricing({ tasks: { basic: 3 } })
  assert.equal(store.getWorkPricing().tasks.basic, 3)
  const u3 = store.createWorkUser({ username: 'capuser3', password: 'Passw0rd!x' })
  store.setWorkTier(u3.id, 'basic')
  assert.equal(store.workDailyTaskLimit(u3.id), 3)
  assert.equal(store.getWorkTaskUsage(u3.id).taskCredits, 3)   // seeds the new rate
  store.setWorkPricing({ tasks: { basic: 2 } })                 // restore for other tests
})

test('non-integer or negative rates are rejected', () => {
  assert.throws(() => store.setWorkPricing({ tasks: { basic: 2.5 } }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ tasks: { premium: -1 } }), (e) => e.status === 400)
})

test('corporate (company) accounts are unlimited - no credit accounting', () => {
  const co = store.createCompany ? store.createCompany({ name: 'Acme', plan: 'premium' }) : null
  if (!co) return
  const m = store.createManagedUser({ username: 'corpuser', password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.workDailyTaskLimit(m.id), Infinity)
  assert.equal(store.getWorkTaskCredits(m.id), null)   // no balance for corporate
  const usage = store.getWorkTaskUsage(m.id)
  assert.equal(usage.unlimited, true)
  assert.equal(usage.cap, null)
  assert.equal(usage.taskCredits, undefined)
  // Starting tasks never gates and never accrues credits.
  store.startWorkTask(m.id)
  assert.equal(store.getWorkTaskCredits(m.id), null)
})
