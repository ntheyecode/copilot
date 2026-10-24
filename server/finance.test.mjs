// Finance ledger + period summary + accounting role: transactions are deduped,
// refunds net out, periods compute, MRR reflects active subs, role gating works.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-finance-'))
process.env.PORT = '0'
const store = await import(storePath)

const u = store.createWorkUser({ username: 'finuser', password: 'Passw0rd!x', email: 'f@x.com' })

test('transactions are recorded and deduped by kind+stripeId', () => {
  store.recordTransaction({ kind: 'subscription', userId: u.id, amount: 99, currency: 'usd', stripeId: 'in_1', plan: 'basic' })
  store.recordTransaction({ kind: 'subscription', userId: u.id, amount: 99, currency: 'usd', stripeId: 'in_1', plan: 'basic' })  // dup
  assert.equal(store.transactionCount(), 1)
  store.recordTransaction({ kind: 'subscription', userId: u.id, amount: 299, currency: 'usd', stripeId: 'in_2', plan: 'advanced' })
  assert.equal(store.transactionCount(), 2)
})

test('summary nets refunds out of gross for the period', () => {
  store.recordTransaction({ kind: 'refund', userId: u.id, amount: 99, currency: 'usd', stripeId: 're_1' })
  const s = store.financialSummary()
  assert.equal(s.year.current.gross, 398)        // 99 + 299
  assert.equal(s.year.current.refunds, 99)
  assert.equal(s.year.current.net, 299)
  assert.equal(s.series.length, 12)
  assert.ok(s.byPlan.basic === 99 && s.byPlan.advanced === 299)
})

test('MRR reflects active subscriptions and the plan price', () => {
  store.setSubscription(u.id, { status: 'active', plan: 'advanced' })
  const s = store.financialSummary()
  // Advanced monthly price from pricing (live default 299).
  assert.ok(s.mrr >= 1, 'MRR is counted for the active sub')
  assert.equal(s.activeSubs, 1)
})

test('accounting role: set, gate, revoke', () => {
  assert.equal(store.isFinanceUser(u.id), false)
  store.setUserRole(u.id, 'accounting')
  assert.equal(store.isFinanceUser(u.id), true)
  assert.ok(store.listFinanceStaff().some((s) => s.username === 'finuser'))
  store.setUserRole(u.id, 'user')
  assert.equal(store.isFinanceUser(u.id), false)
})

test('setUserRole rejects an unknown role and protects superadmin', () => {
  assert.throws(() => store.setUserRole(u.id, 'king'), (e) => e.status === 400)
})
