// The CLIENT's single plan derivation (src/pages/work/planModel.js planView) must
// fold BOTH task shapes the server sends into one view, and must never expose the
// retired per-day cap fields again:
//   individual  { unlimited:false, maxOpen, open, remaining }       -> mode 'open'
//   company     { unlimited, cap, usedToday, remaining, resetLabel } -> 'limit' / 'unlimited'
// Gate for the 2026-10-27 model change (hours are the only usage limit; up to 4
// tasks open at once): if anyone reintroduces `cap` / `usedToday` / `taskCap` on
// the view, or a daily hours allowance for an individual, this goes red. Pure JS,
// no React, so it runs in the server suite.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planView } from '../src/pages/work/planModel.js'

const PLAN = { grantSeconds: 60 * 3600, poolSeconds: 58 * 3600, expiry: { mode: 'forfeit', carryCapHours: null }, renewsAt: '2026-11-01' }
const base = (over = {}) => ({
  tier: 'basic', usedSeconds: 1200, purchasedSeconds: 3600, planSeconds: 58 * 3600, poolSeconds: 0,
  dailySeconds: null, remainingSeconds: 59 * 3600, exhausted: false, resetLabel: 'Nov 1', renewsAt: '2026-11-01', plan: PLAN,
  ...over,
})

test('individual: the open-slot shape becomes mode "open" with used / max / remaining and no reset', () => {
  const v = planView(base({ tasks: { unlimited: false, maxOpen: 4, open: 1, remaining: 3, activeTaskId: null } }))
  assert.equal(v.tasks.mode, 'open')
  assert.equal(v.tasks.max, 4)
  assert.equal(v.tasks.used, 1)
  assert.equal(v.tasks.remaining, 3)
  assert.equal(v.tasks.resetLabel, '', 'an open slot frees when a task is finished, never on a clock')
  assert.equal(v.tasksFull, false)
  assert.equal(v.state, 'ok')
  assert.equal(v.dailySeconds, null, 'individuals have no per-day hours allowance')
  // The retired per-day fields must not come back on the view.
  for (const k of ['cap', 'usedToday']) assert.equal(k in v.tasks, false, `tasks.${k} is retired`)
  assert.equal('taskCap' in v, false, 'plan.taskCap is retired (use tasksFull)')
})

test('individual: every slot in use -> tasksFull and the lowest-priority state "tasksFull"', () => {
  const v = planView(base({ tasks: { unlimited: false, maxOpen: 4, open: 4, remaining: 0, activeTaskId: 's1' } }))
  assert.equal(v.tasksFull, true)
  assert.equal(v.state, 'tasksFull')
  assert.equal(v.tasks.used, 4)
  // Hours still rule: exhausted outranks a full slot row.
  const x = planView(base({ exhausted: true, remainingSeconds: 0, tasks: { unlimited: false, maxOpen: 4, open: 4, remaining: 0 } }))
  assert.equal(x.state, 'exhausted')
})

test('individual: remaining is derived from max - open when the server omits it', () => {
  const v = planView(base({ tasks: { unlimited: false, maxOpen: 4, open: 3 } }))
  assert.equal(v.tasks.remaining, 1)
})

test('company member, unlimited: mode "unlimited", no max, nothing full', () => {
  const v = planView(base({ tasks: { unlimited: true, cap: null, usedToday: 2, remaining: null, activeTaskId: null, resetLabel: '11:59 PM ET' } }), { isCompanyMember: true })
  assert.equal(v.tasks.mode, 'unlimited')
  assert.equal(v.tasks.unlimited, true)
  assert.equal(v.tasks.max, null)
  assert.equal(v.tasksFull, false)
  assert.equal(v.state, 'ok')
})

test('company member with an admin-set ceiling: mode "limit" keeps started / cap and the reset', () => {
  const v = planView(base({ tasks: { unlimited: false, cap: 3, usedToday: 3, remaining: 0, activeTaskId: null, resetLabel: '11:59 PM ET' } }), { isCompanyMember: true })
  assert.equal(v.tasks.mode, 'limit')
  assert.equal(v.tasks.max, 3)
  assert.equal(v.tasks.used, 3)
  assert.equal(v.tasks.resetLabel, '11:59 PM ET')
  assert.equal(v.tasksFull, true)
  assert.equal(v.state, 'tasksFull')
})

test('pool-based company member: the admin day ceiling (dailySeconds) is still carried through', () => {
  const v = planView(base({ plan: null, planSeconds: 0, dailySeconds: 7200, usedSeconds: 1800, enterprise: { pool: { monthlySeconds: 360000, remainingSeconds: 300000, usedPct: 17 } }, tasks: { unlimited: true, cap: null, usedToday: 0, remaining: null, resetLabel: '11:59 PM ET' } }), { isCompanyMember: true })
  assert.equal(v.hasPlan, false)
  assert.equal(v.dailySeconds, 7200)
  assert.equal(v.usedToday, 1800)
})
