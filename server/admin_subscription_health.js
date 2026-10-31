// ---------------------------------------------------------------------------
// WorkCoPilot - subscriber health for the superadmin of an individuals
// business: MRR by plan, trial and past-due counts, plans set to end, churn in
// the last 30 days, failed payments, new subscriptions and refunds in the
// window, and whether Stripe is wired. Pure math in subscriptionHealth(); the
// route is one GET behind the finance gate. Read-only; no secrets, no Stripe
// ids. Consumed by src/pages/workadmin/sections/SubscriptionHealth.jsx.
// ---------------------------------------------------------------------------
import { ANNUAL_DISCOUNT } from '../src/pricingModel.js'

export const PLANS = ['lite', 'basic', 'advanced', 'premium']
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const DAY = 24 * 3600 * 1000

// Monthly revenue one subscriber produces, from the configured monthly price:
// an annual plan's yearly charge spread over twelve months; 0 for comped and
// past-due accounts (not currently producing revenue).
export function monthlyRevenue(sub, plans) {
  const s = sub || {}
  if (!(s.status === 'active' || s.status === 'trialing')) return 0
  const monthly = Number(plans && plans[s.plan])
  if (!Number.isFinite(monthly)) return 0
  return round2(s.cycle === 'annual' ? (monthly * 12 * (1 - ANNUAL_DISCOUNT)) / 12 : monthly)
}

// users: [{ id, companyId?, subscription }], transactions: the ledger
// (kind, amount, at, voided, status), pricing: { plans, currency },
// billing: { configured, webhookSecret, annualReady }, now: Date.
export function subscriptionHealth({ users = [], transactions = [], pricing = {}, billing = {}, now = new Date(), windowDays = 30 } = {}) {
  const plans = pricing.plans || {}
  const since = new Date(now.getTime() - windowDays * DAY).toISOString()
  const byPlan = Object.fromEntries(PLANS.map((p) => [p, { subscribers: 0, mrrUsd: 0, annual: 0 }]))
  const counts = { active: 0, trialing: 0, pastDue: 0, endingSoon: 0, pendingDowngrade: 0, comp: 0 }
  const ending = []
  const pastDue = []
  let mrr = 0
  let canceledInWindow = 0
  let newInWindow = 0
  let activeAtWindowStart = 0
  for (const u of users) {
    if (u.companyId) continue   // a company member's capacity is not a personal subscription
    const s = u.subscription || {}
    const st = s.status || 'none'
    const live = st === 'active' || st === 'trialing' || st === 'past_due'
    if (st === 'canceled' && s.canceledAt && s.canceledAt >= since) canceledInWindow++
    if (live && s.since && s.since >= since) newInWindow++
    // Live at the window start: live now and subscribed before it, or ended inside the window.
    if ((live && s.since && s.since < since) || (st === 'canceled' && s.canceledAt && s.canceledAt >= since && (!s.since || s.since < since))) activeAtWindowStart++
    if (!live && st !== 'comp') continue
    if (st === 'comp') { counts.comp++; continue }
    if (st === 'active') counts.active++
    if (st === 'trialing') counts.trialing++
    if (st === 'past_due') { counts.pastDue++; pastDue.push({ id: u.id, username: u.username, plan: s.plan || null, since: s.since || null, currentPeriodEnd: s.currentPeriodEnd || null }) }
    if (s.cancelAtPeriodEnd) { counts.endingSoon++; ending.push({ id: u.id, username: u.username, plan: s.plan || null, endsAt: s.currentPeriodEnd || null, reason: s.cancelReason || null }) }
    if (s.pendingChange && s.pendingChange.plan) counts.pendingDowngrade++
    const m = monthlyRevenue(s, plans)
    mrr += m
    if (byPlan[s.plan]) { byPlan[s.plan].subscribers++; byPlan[s.plan].mrrUsd = round2(byPlan[s.plan].mrrUsd + m); if (s.cycle === 'annual') byPlan[s.plan].annual++ }
  }
  let refundsInWindow = 0, refundedUsd = 0, paidInWindow = 0, paidUsd = 0
  for (const t of transactions) {
    if (t.voided || !t.at || t.at < since) continue
    if (t.kind === 'refund') { refundsInWindow++; refundedUsd += Number(t.amount) || 0 }
    else if (t.kind === 'subscription' || t.kind === 'hours' || t.kind === 'images') { paidInWindow++; paidUsd += Number(t.amount) || 0 }
  }
  const churnPct = activeAtWindowStart ? round2((canceledInWindow / activeAtWindowStart) * 100) : 0
  ending.sort((a, b) => String(a.endsAt || '').localeCompare(String(b.endsAt || '')))
  return {
    currency: pricing.currency || 'usd',
    generatedAt: now.toISOString(),
    windowDays,
    mrrUsd: round2(mrr),
    arrUsd: round2(mrr * 12),
    counts,
    byPlan,
    churn: { canceled: canceledInWindow, activeAtStart: activeAtWindowStart, pct: churnPct, newSubscribers: newInWindow },
    payments: { paid: paidInWindow, paidUsd: round2(paidUsd), refunds: refundsInWindow, refundedUsd: round2(refundedUsd), failed: counts.pastDue },
    ending,
    pastDue,
    stripe: { configured: !!billing.configured, webhook: !!billing.webhookSecret, annualReady: !!billing.annualReady, mode: billing.mode || null },
  }
}

export function registerSubscriptionHealthRoute(app, { store, requireAuth, financeGate, wrap, billingConfigured, cfg }) {
  app.get('/api/work/admin/subscriptions/health', requireAuth, financeGate, wrap((req, res) => {
    const c = cfg(store)
    const pub = (typeof store.getBillingPublic === 'function') ? store.getBillingPublic() : {}
    const pricing = store.getWorkPricing()
    const annualReady = PLANS.every((p) => !!c.priceAnnual[p])
    const { users, transactions } = store.subscriptionHealthInputs()
    res.json(subscriptionHealth({
      users,
      transactions,
      pricing,
      billing: { configured: billingConfigured(store), webhookSecret: !!c.webhookSecret, annualReady, mode: pub.mode || null },
    }))
  }))
}
