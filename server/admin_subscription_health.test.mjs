// The subscriber-health summary (server/admin_subscription_health.js): pure
// math over accounts and the ledger. Dates are fixed so the 30-day window is
// deterministic.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionHealth, monthlyRevenue } from './admin_subscription_health.js'

const NOW = new Date('2026-10-30T12:00:00.000Z')
const d = (daysAgo) => new Date(NOW.getTime() - daysAgo * 86400000).toISOString()
const plans = { lite: 69, basic: 99, advanced: 299, premium: 399 }

test('monthly revenue: monthly at list price, annual spread over twelve months, nothing from past due or comp', () => {
  assert.equal(monthlyRevenue({ status: 'active', plan: 'basic', cycle: 'monthly' }, plans), 99)
  assert.equal(monthlyRevenue({ status: 'active', plan: 'premium', cycle: 'annual' }, plans), 319.2)
  assert.equal(monthlyRevenue({ status: 'past_due', plan: 'basic' }, plans), 0)
  assert.equal(monthlyRevenue({ status: 'comp', plan: 'basic' }, plans), 0)
  assert.equal(monthlyRevenue({ status: 'active', plan: 'unknown' }, plans), 0)
})

test('the summary: MRR by plan, counts, churn over the window, payments, plans ending, Stripe wiring', () => {
  const users = [
    { id: 'a', username: 'a', subscription: { status: 'active', plan: 'basic', cycle: 'monthly', since: d(90), stripeSubscriptionId: 'sub_a' } },
    { id: 'b', username: 'b', subscription: { status: 'active', plan: 'premium', cycle: 'annual', since: d(400) } },
    { id: 'c', username: 'c', subscription: { status: 'trialing', plan: 'lite', since: d(3) } },
    { id: 'p', username: 'p', subscription: { status: 'past_due', plan: 'advanced', since: d(60), currentPeriodEnd: d(-5) } },
    { id: 'e', username: 'e', subscription: { status: 'active', plan: 'basic', since: d(200), cancelAtPeriodEnd: true, currentPeriodEnd: d(-12), cancelReason: 'Done for now' } },
    { id: 'x', username: 'x', subscription: { status: 'canceled', plan: 'basic', since: d(120), canceledAt: d(10) } },
    { id: 'y', username: 'y', subscription: { status: 'canceled', plan: 'lite', since: d(300), canceledAt: d(90) } },
    { id: 'k', username: 'k', subscription: { status: 'comp', plan: 'premium', since: d(10) } },
    { id: 'co', username: 'co', companyId: 'c1', subscription: { status: 'active', plan: 'premium', since: d(10) } },
    { id: 'n', username: 'n', subscription: { status: 'none' } },
  ]
  const transactions = [
    { kind: 'subscription', amount: 99, at: d(2) }, { kind: 'hours', amount: 20, at: d(5) }, { kind: 'refund', amount: 69, at: d(7) },
    { kind: 'subscription', amount: 99, at: d(40) }, { kind: 'subscription', amount: 50, at: d(1), voided: true },
  ]
  const h = subscriptionHealth({ users, transactions, pricing: { plans, currency: 'usd' }, billing: { configured: true, webhookSecret: 'whsec', annualReady: false, mode: 'test' }, now: NOW })
  assert.equal(h.mrrUsd, 99 + 319.2 + 69 + 99, 'a, b, c and e produce revenue; past due, comp and company members do not')
  assert.equal(h.arrUsd, Math.round((99 + 319.2 + 69 + 99) * 12 * 100) / 100)
  assert.deepEqual(h.counts, { active: 3, trialing: 1, pastDue: 1, endingSoon: 1, pendingDowngrade: 0, comp: 1 })
  assert.deepEqual(h.byPlan.basic, { subscribers: 2, mrrUsd: 198, annual: 0 })
  assert.deepEqual(h.byPlan.premium, { subscribers: 1, mrrUsd: 319.2, annual: 1 })
  assert.deepEqual(h.churn, { canceled: 1, activeAtStart: 5, pct: 20, newSubscribers: 1 }, 'x churned in the window; a, b, p, e were live at the start plus x; c is new')
  assert.deepEqual(h.payments, { paid: 2, paidUsd: 119, refunds: 1, refundedUsd: 69, failed: 1 }, 'the voided and the 40-day-old entries are out')
  assert.deepEqual(h.ending.map((e) => [e.id, e.reason]), [['e', 'Done for now']])
  assert.deepEqual(h.pastDue.map((p) => p.id), ['p'])
  assert.deepEqual(h.stripe, { configured: true, webhook: true, annualReady: false, mode: 'test' })
  assert.ok(!JSON.stringify(h).includes('sub_a'), 'no Stripe id in the summary')
})

test('an empty installation reads as zeros, never as a crash', () => {
  const h = subscriptionHealth({ now: NOW })
  assert.equal(h.mrrUsd, 0)
  assert.equal(h.churn.pct, 0)
  assert.deepEqual(h.ending, [])
  assert.equal(h.stripe.configured, false)
})
