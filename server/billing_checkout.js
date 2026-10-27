// ---------------------------------------------------------------------------
// WorkCoPilot - Stripe subscription checkout: the shared pieces.
// ---------------------------------------------------------------------------
// Extracted from billing.js (touch-to-split) so that TWO callers share ONE
// activation path (SUPREME RULE II: single source of truth):
//   * the signed webhook (checkout.session.completed)            billing.js
//   * the server-side confirm after the browser returns from Stripe
//     (the onboarding flow retrieves the Checkout Session from Stripe and
//     applies it when the webhook has not landed yet)             onboarding.js
// Both end in store.setSubscription with the SAME patch, so whichever arrives
// first activates and the second is a no-op (setSubscription is a state setter;
// the owner alert is guarded on the prior status, so it fires exactly once).
//
// Nothing here talks to the network except through the Stripe client it is
// handed. No secret is read or returned. No em dashes in any copy.
// ---------------------------------------------------------------------------

export const PLANS = ['lite', 'basic', 'advanced', 'premium']

// Map Stripe subscription status -> our enum (store expects none|trialing|
// active|past_due|canceled). Unknown-but-usable states fall back to active.
export function mapStatus(st) {
  switch (st) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due':
    case 'unpaid':
    case 'paused': return 'past_due'   // paused = not currently billing: block the gate (do not fall through to active)
    case 'canceled':
    case 'incomplete_expired': return 'canceled'
    case 'incomplete': return 'none'
    default: return 'active'
  }
}

// Resolve the plan name from a subscription's price id (reverse of the price map).
export function planFromSub(sub, price) {
  try {
    const items = sub && sub.items && sub.items.data
    const p0 = items && items[0] && items[0].price
    const priceId = p0 && p0.id
    const productId = p0 && (typeof p0.product === 'string' ? p0.product : (p0.product && p0.product.id))
    if (!priceId && !productId) return null
    // The configured id may be a price id or a product id, so match on either.
    for (const p of PLANS) {
      const cfgId = price && price[p]
      if (cfgId && (cfgId === priceId || cfgId === productId)) return p
    }
  } catch { /* fall through */ }
  return null
}

export const periodEndIso = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null)

// Billing cycle from a subscription's price interval ('year' -> annual, else
// monthly). Returns null when the interval cannot be read (keeps any cycle
// already stored).
export function cycleFromSub(sub) {
  try {
    const items = sub && sub.items && sub.items.data
    const rec = items && items[0] && items[0].price && items[0].price.recurring
    const interval = rec && rec.interval
    if (interval === 'year') return 'annual'
    if (interval === 'month' || interval === 'week' || interval === 'day') return 'monthly'
  } catch { /* fall through */ }
  return null
}

const idOf = (v) => (typeof v === 'string' ? v : (v && v.id)) || null

// The Checkout Session parameters for a subscription. One builder for every
// caller, so success/cancel URLs are the only thing that differs between the
// dashboard checkout and the onboarding checkout (same price, same metadata,
// same promotion-code support, same affiliate trial).
export function subscriptionCheckoutParams({ user, plan, cycle, priceId, benefitDays = 0, successUrl, cancelUrl, customerEmail = null }) {
  const subData = { metadata: { workUserId: String(user.id), plan, cycle } }
  if (benefitDays > 0) subData.trial_period_days = benefitDays
  const params = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: String(user.id),
    metadata: { workUserId: String(user.id), plan, cycle, affiliateBenefit: benefitDays > 0 ? `annual_free_${benefitDays}d` : '' },
    subscription_data: subData,
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
  }
  const existingCustomer = (user.subscription && user.subscription.stripeCustomerId) || null
  // Reuse a known customer; otherwise seed the email so Stripe creates/attaches one.
  if (existingCustomer) params.customer = existingCustomer
  else if (customerEmail) params.customer_email = customerEmail
  return params
}

// Is this Checkout Session a completed, PAID (or trial-started) subscription
// purchase? Stripe's own fields decide, never the redirect: payment_status is
// 'paid' for a charged subscription and 'no_payment_required' for a trial.
export function checkoutSessionPaid(session) {
  if (!session || session.mode !== 'subscription') return false
  if (session.status && session.status !== 'complete') return false
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

// Apply a completed subscription Checkout Session to the account it belongs to.
// Idempotent: the same session applied twice writes the same state twice.
// Returns { userId, plan, status, cycle, activated:boolean } or null when the
// session carries no user reference (logged by the caller).
//   s        Stripe client (for the subscription lookup; may be null in tests)
//   store    the store (getUser / setSubscription / markAnnualBenefitUsed)
//   obj      the Checkout Session object
//   price    the configured plan -> price id map (for planFromSub)
//   onNew    optional ({ user, plan, status, cycle, subId }) called ONCE, when
//            the account first becomes active/trialing through this session
export async function applyCheckoutSession(s, store, obj, { price = {}, onNew = null } = {}) {
  if (!obj) return null
  const userId = obj.client_reference_id || (obj.metadata && obj.metadata.workUserId) || null
  if (!userId) return null
  const md = obj.metadata || {}
  const customerId = idOf(obj.customer)
  const subId = idOf(obj.subscription)
  let plan = md.plan || null
  // Cycle comes from the checkout metadata first (what the customer chose), with
  // the subscription's price interval as the authoritative fallback.
  let cycle = (md.cycle === 'annual' || md.cycle === 'monthly') ? md.cycle : null
  let status = 'active'
  let currentPeriodEnd = null
  if (subId) {
    // An expanded subscription (confirm path) needs no second round trip.
    const sub = (obj.subscription && typeof obj.subscription === 'object') ? obj.subscription : null
    try {
      const full = sub || (s ? await s.subscriptions.retrieve(subId) : null)
      if (full) {
        status = mapStatus(full.status)
        currentPeriodEnd = periodEndIso(full.current_period_end)
        plan = plan || planFromSub(full, price)
        cycle = cycleFromSub(full) || cycle
      }
    } catch (e) { console.warn('[billing] could not retrieve subscription on checkout: ' + (e && e.message)) }
  }
  const before = store.getUser(userId)
  if (!before) return null
  const priorStatus = (before.subscription && before.subscription.status) || 'none'
  const patch = { status, plan: plan || null, stripeCustomerId: customerId, stripeSubscriptionId: subId, currentPeriodEnd }
  if (cycle) patch.cycle = cycle
  store.setSubscription(userId, patch)
  // The referred-annual free month was applied: mark it used (once per account).
  if (md.affiliateBenefit && /^annual_free/.test(md.affiliateBenefit) && typeof store.markAnnualBenefitUsed === 'function') {
    try { store.markAnnualBenefitUsed(userId) } catch { /* best-effort */ }
  }
  const live = status === 'active' || status === 'trialing'
  const wasLive = priorStatus === 'active' || priorStatus === 'trialing'
  const activated = live && !wasLive
  // The NEW-subscription signal fires once: whichever of webhook / confirm lands
  // first sees the prior status as not-live and alerts; the second sees live.
  if (activated && typeof onNew === 'function') {
    const u = store.getUser(userId)
    if (u) { try { onNew({ user: u, plan: plan || null, status, cycle: cycle || null, subId }) } catch { /* never block */ } }
  }
  return { userId, plan: plan || null, status, cycle: cycle || null, activated }
}
