// ---------------------------------------------------------------------------
// WorkCoPilot - Stripe Checkout billing (subscriptions).
// ---------------------------------------------------------------------------
// Free signup gives dashboard access. A paid plan unlocks the service actions
// (start a session + the guidance calls). This module owns:
//   POST /api/work/checkout         -> a Stripe Checkout Session for a plan
//   GET  /api/work/subscription     -> the account's safe subscription fields
//   the webhook handler (mounted on the RAW body in index.js, before json)
//
// Everything Stripe-touching is guarded: the `stripe` package is loaded only on
// demand (dynamic import), and a missing secret key returns a clear 503 instead
// of crashing. If the package is not installed, the same graceful path is taken.
// No stripe id is ever returned to the client. No em dashes in any copy.
// ---------------------------------------------------------------------------

const SECRET = process.env.STRIPE_SECRET_KEY || ''
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const PRICE = {
  basic: process.env.STRIPE_PRICE_BASIC || '',
  advanced: process.env.STRIPE_PRICE_ADVANCED || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
}
const PLANS = ['basic', 'advanced', 'premium']
// Where Stripe sends the customer back. Fixed to the public site by default; an
// operator can override it for a staging host via WORK_PUBLIC_URL.
const SITE = (process.env.WORK_PUBLIC_URL || 'https://admireveda.com').replace(/\/+$/, '')

export function billingConfigured() { return !!SECRET }

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())

// Lazy, guarded Stripe client. Returns null (never throws) when the key is
// missing or the package is not installed, so the server stays up either way.
let _stripe = null
let _stripeTried = false
async function getStripe() {
  if (!SECRET) return null
  if (_stripe || _stripeTried) return _stripe
  _stripeTried = true
  try {
    const mod = await import('stripe')
    const Stripe = mod.default || mod
    _stripe = new Stripe(SECRET)
  } catch (e) {
    console.warn('[billing] stripe package not available (run `npm install stripe`): ' + (e && e.message))
    _stripe = null
  }
  return _stripe
}

// Map Stripe subscription status -> our enum (store expects none|trialing|
// active|past_due|canceled). Unknown-but-usable states fall back to active.
function mapStatus(st) {
  switch (st) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due':
    case 'unpaid': return 'past_due'
    case 'canceled':
    case 'incomplete_expired': return 'canceled'
    case 'incomplete': return 'none'
    default: return 'active'
  }
}
// Resolve the plan name from a subscription's price id (reverse of PRICE).
function planFromSub(sub) {
  try {
    const items = sub && sub.items && sub.items.data
    const priceId = items && items[0] && items[0].price && items[0].price.id
    if (!priceId) return null
    for (const p of PLANS) if (PRICE[p] && PRICE[p] === priceId) return p
  } catch { /* fall through */ }
  return null
}
const periodEndIso = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null)

// ---- webhook (raw body) ---------------------------------------------------
// Best-effort + logged: a webhook must never throw out of the handler, or
// Stripe would retry forever. Signature is verified with STRIPE_WEBHOOK_SECRET.
export function workStripeWebhook({ store }) {
  return async (req, res) => {
    const s = await getStripe()
    if (!s || !WEBHOOK_SECRET) {
      // Not configured yet: acknowledge so Stripe stops retrying, but do nothing.
      return res.status(200).json({ received: true, skipped: true })
    }
    let event
    try {
      const sig = req.headers['stripe-signature']
      event = s.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
    } catch (e) {
      console.warn('[billing] webhook signature check failed: ' + (e && e.message))
      return res.status(400).json({ error: 'Bad signature' })
    }
    try {
      await handleEvent(s, store, event)
    } catch (e) {
      console.warn(`[billing] webhook handling error for ${event && event.type}: ` + (e && e.message))
    }
    res.json({ received: true })
  }
}

async function handleEvent(s, store, event) {
  const type = event && event.type
  const obj = event && event.data && event.data.object
  if (!obj) return

  if (type === 'checkout.session.completed') {
    const userId = obj.client_reference_id || (obj.metadata && obj.metadata.workUserId) || null
    const customerId = (typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id)) || null
    const subId = (typeof obj.subscription === 'string' ? obj.subscription : (obj.subscription && obj.subscription.id)) || null
    let plan = (obj.metadata && obj.metadata.plan) || null
    let status = 'active'
    let currentPeriodEnd = null
    if (subId) {
      try {
        const sub = await s.subscriptions.retrieve(subId)
        status = mapStatus(sub.status)
        currentPeriodEnd = periodEndIso(sub.current_period_end)
        plan = plan || planFromSub(sub)
      } catch (e) { console.warn('[billing] could not retrieve subscription on checkout: ' + (e && e.message)) }
    }
    if (userId) {
      store.setSubscription(userId, { status, plan: plan || null, stripeCustomerId: customerId, stripeSubscriptionId: subId, currentPeriodEnd })
      console.log(`[billing] checkout completed -> user ${userId} plan ${plan || '(unknown)'} status ${status}`)
    } else {
      console.warn('[billing] checkout.session.completed with no user reference; ignored')
    }
    return
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const subId = obj.id || null
    const customerId = (typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id)) || null
    let user = store.findUserByStripeSubscription(subId) || store.findUserByStripeCustomer(customerId)
    if (!user && obj.metadata && obj.metadata.workUserId) user = store.getUser(obj.metadata.workUserId)
    if (!user) { console.warn(`[billing] ${type} for unknown subscription ${subId}; ignored`); return }
    const status = type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(obj.status)
    const plan = planFromSub(obj) || (user.subscription && user.subscription.plan) || null
    store.setSubscription(user.id, {
      status, plan, stripeCustomerId: customerId, stripeSubscriptionId: subId, currentPeriodEnd: periodEndIso(obj.current_period_end),
    })
    console.log(`[billing] ${type} -> user ${user.id} plan ${plan || '(unknown)'} status ${status}`)
    return
  }
}

// ---- JSON routes (checkout + read) ----------------------------------------
export function registerWorkBillingRoutes(app, { store, requireWorkAuth, wrap }) {
  // Start a subscription Checkout Session for the chosen plan. Returns { url }.
  app.post('/api/work/checkout', requireWorkAuth, async (req, res) => {
    try {
      const plan = String((req.body || {}).plan || '').trim().toLowerCase()
      if (!PLANS.includes(plan)) return res.status(400).json({ error: 'Pick a plan: basic, advanced or premium.' })
      const s = await getStripe()
      const priceId = PRICE[plan]
      if (!s || !priceId) return res.status(503).json({ error: 'Billing is not configured yet.' })

      const u = req.workUser
      const existingCustomer = (u.subscription && u.subscription.stripeCustomerId) || null
      const params = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: String(u.id),
        metadata: { workUserId: String(u.id), plan },
        subscription_data: { metadata: { workUserId: String(u.id), plan } },
        allow_promotion_codes: true,
        success_url: `${SITE}/work?checkout=success`,
        cancel_url: `${SITE}/#pricing`,
      }
      // Reuse a known customer; otherwise seed the email so Stripe creates/attaches one.
      if (existingCustomer) params.customer = existingCustomer
      else if (looksLikeEmail(u.username)) params.customer_email = u.username

      const checkout = await s.checkout.sessions.create(params)
      if (!checkout || !checkout.url) return res.status(502).json({ error: 'Could not start checkout. Please try again.' })
      res.json({ url: checkout.url })
    } catch (e) {
      console.warn('[billing] checkout create failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not start checkout. Please try again.' })
    }
  })

  // The account's own subscription (safe fields only).
  app.get('/api/work/subscription', requireWorkAuth, wrap((req, res) => {
    res.json({ subscription: store.getSubscription(req.workUser.id), configured: billingConfigured() })
  }))
}
