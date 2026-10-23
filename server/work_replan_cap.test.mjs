// Re-plan budget + goal-lock: a task may be re-planned up to its per-tier cap
// (default 10), the count is per-task (not daily), corporate is unlimited, the
// cap is superadmin-editable, and - critically - the ORIGINAL REQUEST is frozen
// once a task is planned, so a re-plan can never rewrite the goal (owner rule
// 2026-10-23). This is the class-level guard in setWorkSessionGoal + the gate in
// gateWorkReplan / bumpWorkReplan that the /plan endpoint drives.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-replan-'))
process.env.PORT = '0'
const store = await import(storePath)

const u = store.createWorkUser({ username: 'replanuser', password: 'Passw0rd!x' })
store.setWorkTier(u.id, 'basic')

test('default re-plan cap is 10 per tier', () => {
  const p = store.getWorkPricing()
  assert.equal(p.replans.basic, 10)
  assert.equal(p.replans.advanced, 10)
  assert.equal(p.replans.premium, 10)
  assert.equal(store.workReplanLimit(u.id), 10)
})

test('fresh task starts with the full budget and a zero count', () => {
  const s = store.createWorkSession(u.id, { goal: 'set up a VPN' })
  const usage = store.getWorkReplanUsage(u.id, s.id)
  assert.equal(usage.used, 0)
  assert.equal(usage.cap, 10)
  assert.equal(usage.remaining, 10)
  assert.equal(usage.unlimited, false)
})

test('the original request is FROZEN once the task has a goal + steps', () => {
  const s = store.createWorkSession(u.id, { goal: 'install Docker on Ubuntu' })
  // Before a plan exists, the goal is still editable (composition phase).
  store.setWorkSessionGoal(u.id, s.id, 'install Docker on Ubuntu 22.04')
  assert.equal(store.getWorkSession(u.id, s.id).goal, 'install Docker on Ubuntu 22.04')
  // Plan it: now it has steps -> the goal is locked.
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'step one' }, { text: 'step two' }])
  // Any attempt to change the goal is a silent no-op; the request stays put.
  store.setWorkSessionGoal(u.id, s.id, 'actually, write me a poem instead')
  assert.equal(store.getWorkSession(u.id, s.id).goal, 'install Docker on Ubuntu 22.04')
})

test('re-plan budget decrements and blocks at the cap', () => {
  store.setWorkPricing({ replans: { basic: 3 } })   // shrink for a fast test
  const s = store.createWorkSession(u.id, { goal: 'configure nginx' })
  store.setWorkSessionSteps(u.id, s.id, [{ text: 'a' }])   // first plan (not a re-plan)
  // Three re-plans allowed, the fourth is blocked.
  for (let i = 1; i <= 3; i++) {
    store.gateWorkReplan(u.id, s.id)        // does not throw
    store.bumpWorkReplan(u.id, s.id)
    assert.equal(store.getWorkReplanUsage(u.id, s.id).used, i)
  }
  assert.equal(store.getWorkReplanUsage(u.id, s.id).remaining, 0)
  assert.throws(() => store.gateWorkReplan(u.id, s.id), (e) => e.replanLimit === true && e.cap === 3 && e.status === 402)
})

test('the budget is PER TASK - a new task gets a fresh budget', () => {
  const s = store.createWorkSession(u.id, { goal: 'a different task' })
  const usage = store.getWorkReplanUsage(u.id, s.id)
  assert.equal(usage.used, 0)
  assert.equal(usage.remaining, store.workReplanLimit(u.id))   // full again
})

test('non-integer or negative re-plan caps are rejected', () => {
  assert.throws(() => store.setWorkPricing({ replans: { basic: 2.5 } }), (e) => e.status === 400)
  assert.throws(() => store.setWorkPricing({ replans: { premium: -1 } }), (e) => e.status === 400)
})

test('corporate (company) accounts have unlimited re-plans', () => {
  const co = store.createCompany ? store.createCompany({ name: 'Acme', plan: 'premium' }) : null
  if (!co) return
  const m = store.createManagedUser({ username: 'corpreplan', password: 'Passw0rd!x', companyId: co.id, tier: 'basic' })
  assert.equal(store.workReplanLimit(m.id), Infinity)
  const s = store.createWorkSession(m.id, { goal: 'corp task' })
  store.setWorkSessionSteps(m.id, s.id, [{ text: 'a' }])
  const usage = store.getWorkReplanUsage(m.id, s.id)
  assert.equal(usage.unlimited, true)
  assert.equal(usage.cap, null)
  store.gateWorkReplan(m.id, s.id)   // never throws for corporate
})
