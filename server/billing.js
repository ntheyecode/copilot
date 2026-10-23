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
//
// CONFIG SOURCE: the Stripe keys + price ids come from the store FIRST (the
// superadmin pastes them in the admin console, saved to db.billing), with the
// matching environment variables as a fallback. That means a fresh deploy can
// be configured entirely from the UI, while an operator who prefers env vars
// still works unchanged. Secrets are never read back to the client.
// ---------------------------------------------------------------------------

const PLANS = ['basic', 'advanced', 'premium']
// Where Stripe sends the customer back. Fixed to the public site by default; an
// operator can override it for a staging host via WORK_PUBLIC_URL.
const SITE = (process.env.WORK_PUBLIC_URL || 'https://admireveda.com').replace(/\/+$/, '')

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())

// Resolve the live config: store values (when billing is enabled there) take
// precedence, env vars fall back. Price ids fall back per plan, so a half-filled
// store config still picks up any env price ids that are set.
function cfg(store) {
  const c = (store && typeof store.getBillingConfig === 'function') ? (store.getBillingConfig() || {}) : {}
  const storeOn = c.enabled !== false   // default on when a store secret key is present
  const secret = (c.secretKey && storeOn) ? c.secretKey : (process.env.STRIPE_SECRET_KEY || '')
  const webhookSecret = (c.webhookSecret && storeOn) ? c.webhookSecret : (process.env.STRIPE_WEBHOOK_SECRET || '')
  const price = {
    basic: c.priceBasic || process.env.STRIPE_PRICE_BASIC || '',
    advanced: c.priceAdvanced || process.env.STRIPE_PRICE_ADVANCED || '',
    premium: c.pricePremium || process.env.STRIPE_PRICE_PREMIUM || '',
  }
  // Annual (yearly) prices - separate recurring Stripe prices (interval=year),
  // 20% off. Checkout uses these when cycle === 'annual'. Empty = annual not
  // set up for that plan, and the client falls back to monthly / sign-up.
  const priceAnnual = {
    basic: c.priceBasicAnnual || process.env.STRIPE_PRICE_BASIC_ANNUAL || '',
    advanced: c.priceAdvancedAnnual || process.env.STRIPE_PRICE_ADVANCED_ANNUAL || '',
    premium: c.pricePremiumAnnual || process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
  }
  return { secret, webhookSecret, price, priceAnnual }
}
// "Billing is configured" = a usable secret key exists (store OR env). The gate
// in index.js uses this: subscriptions are enforced only once billing is set up.
export function billingConfigured(store) { return !!cfg(store).secret }

// Lazy, guarded Stripe client, cached per secret key so a runtime key change
// (operator updates it in the admin console) re-initialises cleanly. Returns
// null (never throws) when the key is missing or the package is not installed,
// so the server stays up either way.
let _stripe = null
let _stripeKey = null
let _pkgTried = false
let _pkgOk = true
async function getStripe(secret) {
  if (!secret) return null
  if (_pkgTried && !_pkgOk) return null   // package missing: do not retry the import every call
  if (_stripe && _stripeKey === secret) return _stripe
  try {
    const mod = await import('stripe')
    const Stripe = mod.default || mod
    _pkgTried = true; _pkgOk = true
    _stripe = new Stripe(secret)
    _stripeKey = secret
  } catch (e) {
    _pkgTried = true; _pkgOk = false; _stripe = null; _stripeKey = null
    console.warn('[billing] stripe package not available (run `npm install stripe`): ' + (e && e.message))
  }
  return _stripe
}

// Resolve a configured id to a usable Checkout price id. A price id (price_...)
// is used as-is; a product id (prod_...) is resolved to that product's default
// price once and cached. This lets a superadmin paste EITHER the price id or the
// product id from the Stripe dashboard and have checkout work either way.
const _priceByProduct = new Map()
async function resolvePriceId(s, configuredId) {
  const id = String(configuredId || '').trim()
  if (!id) return ''
  if (id.startsWith('price_')) return id
  if (!id.startsWith('prod_')) return id   // unknown shape: pass through, Stripe validates
  if (_priceByProduct.has(id)) return _priceByProduct.get(id)
  try {
    const product = await s.products.retrieve(id)
    const dp = product && product.default_price
    const priceId = (typeof dp === 'string' ? dp : (dp && dp.id)) || ''
    if (priceId) _priceByProduct.set(id, priceId)
    return priceId
  } catch (e) {
    console.warn(`[billing] could not resolve default price for product ${id}: ` + (e && e.message))
    return ''
  }
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
// Resolve the plan name from a subscription's price id (reverse of the price map).
function planFromSub(sub, price) {
  try {
    const items = sub && sub.items && sub.items.data
    const p0 = items && items[0] && items[0].price
    const priceId = p0 && p0.id
    const productId = p0 && (typeof p0.product === 'string' ? p0.product : (p0.product && p0.product.id))
    if (!priceId && !productId) return null
    // The configured id may be a price id or a product id, so match on either.
    for (const p of PLANS) {
      const cfgId = price[p]
      if (cfgId && (cfgId === priceId || cfgId === productId)) return p
    }
  } catch { /* fall through */ }
  return null
}
const periodEndIso = (unixSeconds) => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null)

// ---- webhook (raw body) ---------------------------------------------------
// Best-effort + logged: a webhook must never throw out of the handler, or
// Stripe would retry forever. Signature is verified with the webhook secret
// (store first, env fallback).
//
// SUBSCRIPTION LIFECYCLE (how the gate opens and closes automatically):
//   1. checkout.session.completed  -> status active/trialing   (service unlocks)
//   2. customer.subscription.updated -> mapped status (active, trialing,
//      past_due on a billing problem, canceled when it ends)
//   3. invoice.payment_failed      -> status past_due           (service blocks)
//   4. customer.subscription.deleted -> status canceled         (service blocks)
// store.userCanUseService() returns true only for trialing/active/comp (and
// company members), so past_due and canceled block guiding automatically with
// no extra wiring. A later successful payment fires subscription.updated again
// and flips the status back to active, reopening the gate.

// ---- webhook idempotency (APP-05) -----------------------------------------
// Stripe delivers at-least-once and an attacker who captured one signed payload
// can replay it inside the signature tolerance window. Dedupe on event.id so a
// replayed event is processed at most once. A bounded in-memory set is used on
// purpose: the handlers below are state-setters (status/plan/period), so a
// replay after a process restart is harmless, and the set avoids a write to the
// store on every webhook. Tradeoff: the memory is lost on restart and is per
// process (fine for the single-process deploy); the bound keeps it from growing
// without limit, evicting the oldest ids first. Only ids from events that passed
// signature verification are ever recorded, so unauthenticated callers cannot
// fill it.
export function createEventDeduper(limit = 5000) {
  const seen = new Set()
  return {
    // true if this id is new (and is now claimed); false if already seen.
    claim(id) {
      if (!id) return true            // no id to key on: do not block processing
      const k = String(id)
      if (seen.has(k)) return false
      seen.add(k)
      if (seen.size > limit) seen.delete(seen.values().next().value)   // evict oldest (insertion order)
      return true
    },
    // Give the id back, so a failed attempt can be re-delivered and reprocessed.
    release(id) { if (id) seen.delete(String(id)) },
    has(id) { return seen.has(String(id)) },
    get size() { return seen.size },
  }
}
const _eventDeduper = createEventDeduper()

export function workStripeWebhook({ store }) {
  return async (req, res) => {
    const { secret, webhookSecret } = cfg(store)
    const s = await getStripe(secret)
    if (!s || !webhookSecret) {
      // Not configured yet: acknowledge so Stripe stops retrying, but do nothing.
      return res.status(200).json({ received: true, skipped: true })
    }
    let event
    try {
      const sig = req.headers['stripe-signature']
      event = s.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (e) {
      console.warn('[billing] webhook signature check failed: ' + (e && e.message))
      return res.status(400).json({ error: 'Bad signature' })
    }
    // Replay guard: a repeat of an already-processed event.id is acknowledged
    // (so Stripe stops retrying) but not processed again.
    if (!_eventDeduper.claim(event && event.id)) {
      console.log(`[billing] duplicate webhook ${event.id} (${event.type}) ignored`)
      return res.json({ received: true, duplicate: true })
    }
    try {
      await handleEvent(s, store, event)
    } catch (e) {
      // Release the claim so a manual resend from the Stripe dashboard can retry.
      _eventDeduper.release(event && event.id)
      console.warn(`[billing] webhook handling error for ${event && event.type}: ` + (e && e.message))
    }
    res.json({ received: true })
  }
}

async function handleEvent(s, store, event) {
  const type = event && event.type
  const obj = event && event.data && event.data.object
  if (!obj) return
  const price = cfg(store).price

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
        plan = plan || planFromSub(sub, price)
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
    const plan = planFromSub(obj, price) || (user.subscription && user.subscription.plan) || null
    store.setSubscription(user.id, {
      status, plan, stripeCustomerId: customerId, stripeSubscriptionId: subId, currentPeriodEnd: periodEndIso(obj.current_period_end),
    })
    console.log(`[billing] ${type} -> user ${user.id} plan ${plan || '(unknown)'} status ${status}`)
    return
  }

  // A failed renewal payment moves the account to past_due. userCanUseService
  // excludes past_due, so guiding blocks until the payment succeeds (which
  // fires customer.subscription.updated and flips the status back to active).
  if (type === 'invoice.payment_failed') {
    const customerId = (typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id)) || null
    const subId = (typeof obj.subscription === 'string' ? obj.subscription : (obj.subscription && obj.subscription.id)) || null
    let user = store.findUserByStripeSubscription(subId) || store.findUserByStripeCustomer(customerId)
    if (!user) { console.warn(`[billing] invoice.payment_failed for unknown customer ${customerId}; ignored`); return }
    store.setSubscription(user.id, { status: 'past_due' })
    console.log(`[billing] invoice.payment_failed -> user ${user.id} status past_due`)
    return
  }
}

// Map one Stripe invoice to the safe shape the dashboard shows (no secrets, no
// internal ids beyond the invoice id). Amount is in the currency's minor unit
// (cents) as Stripe reports it; the client formats it.
function mapInvoice(inv) {
  return {
    id: inv.id || null,
    number: inv.number || null,
    amount: (inv.amount_paid != null ? inv.amount_paid : (inv.amount_due != null ? inv.amount_due : inv.total)) || 0,
    currency: inv.currency || 'usd',
    status: inv.status || null,
    created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    hostedInvoiceUrl: inv.hosted_invoice_url || null,
    invoicePdf: inv.invoice_pdf || null,
  }
}
// Server-only: the Stripe ids an operator action needs for one account.
function userStripe(store, userId) {
  const u = store.getUser(userId)
  if (!u) return null
  const sub = u.subscription || {}
  return { user: u, customer: sub.stripeCustomerId || null, subId: sub.stripeSubscriptionId || null }
}

// ---- JSON routes (checkout + read + invoices + portal + admin) ------------
export function registerWorkBillingRoutes(app, { store, requireWorkAuth, requireAuth, requireSuperAdmin, wrap }) {
  // Start a subscription Checkout Session for the chosen plan. Returns { url }.
  app.post('/api/work/checkout', requireWorkAuth, async (req, res) => {
    try {
      const plan = String((req.body || {}).plan || '').trim().toLowerCase()
      if (!PLANS.includes(plan)) return res.status(400).json({ error: 'Pick a plan: basic, advanced or premium.' })
      const cycle = String((req.body || {}).cycle || 'monthly').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly'
      const { secret, price, priceAnnual } = cfg(store)
      const s = await getStripe(secret)
      // Annual uses the yearly price id when configured; if annual was requested
      // but not set up, say so clearly (the client falls back) rather than
      // silently charging the monthly price.
      const configuredId = cycle === 'annual' ? priceAnnual[plan] : price[plan]
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      if (cycle === 'annual' && !configuredId) return res.status(409).json({ error: 'Annual billing is not set up for this plan yet.', annualUnavailable: true })
      if (!configuredId) return res.status(503).json({ error: 'Billing is not configured yet.' })
      const priceId = await resolvePriceId(s, configuredId)
      if (!priceId) return res.status(503).json({ error: 'That plan is not set up correctly in Stripe (no price found for the configured id). Check the price or product id in the admin console.' })

      const u = req.workUser
      const existingCustomer = (u.subscription && u.subscription.stripeCustomerId) || null
      const params = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: String(u.id),
        metadata: { workUserId: String(u.id), plan, cycle },
        subscription_data: { metadata: { workUserId: String(u.id), plan, cycle } },
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
    res.json({ subscription: store.getSubscription(req.workUser.id), configured: billingConfigured(store) })
  }))

  // The signed-in account's Stripe invoices (newest first). No customer yet
  // (never checked out) returns an empty list, not an error.
  app.get('/api/work/invoices', requireWorkAuth, async (req, res) => {
    try {
      const { secret } = cfg(store)
      const s = await getStripe(secret)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      const customer = (req.workUser.subscription && req.workUser.subscription.stripeCustomerId) || null
      if (!customer) return res.json({ invoices: [] })
      const list = await s.invoices.list({ customer, limit: 24 })
      res.json({ invoices: (list && list.data ? list.data : []).map(mapInvoice) })
    } catch (e) {
      console.warn('[billing] invoice list failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not load your invoices. Please try again.' })
    }
  })

  // Self-serve manage + cancel through the Stripe Customer Portal. The portal
  // lets the user update their card, cancel, and download invoices, then sends
  // them back to the dashboard.
  app.post('/api/work/billing/portal', requireWorkAuth, async (req, res) => {
    try {
      const { secret } = cfg(store)
      const s = await getStripe(secret)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      const customer = (req.workUser.subscription && req.workUser.subscription.stripeCustomerId) || null
      if (!customer) return res.status(400).json({ error: 'No billing account yet. Choose a plan first.' })
      const portal = await s.billingPortal.sessions.create({ customer, return_url: `${SITE}/work` })
      if (!portal || !portal.url) return res.status(502).json({ error: 'Could not open the billing portal. Please try again.' })
      res.json({ url: portal.url })
    } catch (e) {
      console.warn('[billing] portal create failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not open the billing portal. Please try again.' })
    }
  })

  // ---- Superadmin billing controls ----------------------------------------
  // These are only registered when the superadmin gates are supplied (index.js
  // passes them). getBillingPublic never returns a secret; POST writes config
  // with secrets write-only (blank keeps the stored value).
  if (requireAuth && requireSuperAdmin) {
    // Read / write the store-held Stripe config (secrets never read back).
    app.get('/api/work/admin/billing', requireAuth, requireSuperAdmin, wrap((req, res) => {
      res.json({ billing: store.getBillingPublic(), webhookUrl: `${SITE}/api/work/stripe/webhook`, envFallback: {
        secretKey: !!process.env.STRIPE_SECRET_KEY,
        webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      } })
    }))
    app.post('/api/work/admin/billing', requireAuth, requireSuperAdmin, wrap((req, res) => {
      res.json({ billing: store.setBillingConfig(req.body || {}) })
    }))

    // Validate the stored config end to end: the secret key is accepted by
    // Stripe, and each configured plan id (price_... or prod_...) resolves to a
    // real price. Returns per-plan amounts so the operator sees it is wired.
    // Never returns a secret.
    app.post('/api/work/admin/billing/test', requireAuth, requireSuperAdmin, async (req, res) => {
      const { secret, webhookSecret, price, priceAnnual } = cfg(store)
      const s = await getStripe(secret)
      if (!s) return res.json({ ok: false, error: 'No Stripe secret key is set. Add it above and Save first.' })
      const out = { ok: false, account: null, accountId: null, livemode: /^sk_live_/.test(secret), webhookSet: !!webhookSecret, plans: {}, annualPlans: {}, annualReady: false }
      try {
        const acct = await s.accounts.retrieve()
        out.accountId = (acct && acct.id) || null
        out.account = (acct && acct.business_profile && acct.business_profile.name) || out.accountId
      } catch (e) {
        return res.json({ ok: false, livemode: out.livemode, error: 'Stripe rejected the secret key: ' + ((e && e.message) || 'invalid key') })
      }
      for (const p of PLANS) {
        const configured = price[p]
        if (!configured) { out.plans[p] = { ok: false, error: 'not set' }; continue }
        try {
          const priceId = await resolvePriceId(s, configured)
          if (!priceId) { out.plans[p] = { ok: false, error: 'no price found for this id' }; continue }
          const pr = await s.prices.retrieve(priceId)
          out.plans[p] = {
            ok: true,
            amount: (pr.unit_amount != null ? pr.unit_amount / 100 : null),
            currency: pr.currency || 'usd',
            interval: (pr.recurring && pr.recurring.interval) || 'one-time',
          }
        } catch (e) {
          out.plans[p] = { ok: false, error: (e && e.message) || 'could not load this price' }
        }
      }
      // Annual prices are optional. Validate any that are set and confirm they
      // bill yearly. annualReady = all three set and valid.
      let annualSetCount = 0
      for (const p of PLANS) {
        const configured = priceAnnual[p]
        if (!configured) { out.annualPlans[p] = { set: false }; continue }
        annualSetCount++
        try {
          const priceId = await resolvePriceId(s, configured)
          if (!priceId) { out.annualPlans[p] = { set: true, ok: false, error: 'no price found for this id' }; continue }
          const pr = await s.prices.retrieve(priceId)
          const interval = (pr.recurring && pr.recurring.interval) || 'one-time'
          out.annualPlans[p] = {
            set: true, ok: interval === 'year',
            amount: (pr.unit_amount != null ? pr.unit_amount / 100 : null),
            currency: pr.currency || 'usd', interval,
            error: interval === 'year' ? undefined : `this price bills ${interval}, not yearly`,
          }
        } catch (e) {
          out.annualPlans[p] = { set: true, ok: false, error: (e && e.message) || 'could not load this price' }
        }
      }
      out.annualReady = annualSetCount === PLANS.length && PLANS.every((p) => out.annualPlans[p] && out.annualPlans[p].ok)
      out.ok = !!out.accountId && PLANS.every((p) => out.plans[p] && out.plans[p].ok)
      res.json(out)
    })

    // Any user's invoices (for support).
    app.get('/api/work/admin/users/:id/invoices', requireAuth, requireSuperAdmin, async (req, res) => {
      try {
        const { secret } = cfg(store)
        const s = await getStripe(secret)
        if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
        const info = userStripe(store, req.params.id)
        if (!info) return res.status(404).json({ error: 'Account not found.' })
        if (!info.customer) return res.json({ invoices: [] })
        const list = await s.invoices.list({ customer: info.customer, limit: 24 })
        res.json({ invoices: (list && list.data ? list.data : []).map(mapInvoice) })
      } catch (e) {
        console.warn('[billing] admin invoice list failed: ' + (e && e.message))
        res.status(502).json({ error: 'Could not load invoices for that user.' })
      }
    })

    // Refund a payment. With paymentIntentId or chargeId, refund that; otherwise
    // refund the account's most recent charge.
    app.post('/api/work/admin/users/:id/refund', requireAuth, requireSuperAdmin, async (req, res) => {
      try {
        const { secret } = cfg(store)
        const s = await getStripe(secret)
        if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
        const info = userStripe(store, req.params.id)
        if (!info) return res.status(404).json({ error: 'Account not found.' })
        const body = req.body || {}
        const params = {}
        if (body.paymentIntentId) params.payment_intent = String(body.paymentIntentId)
        else if (body.chargeId) params.charge = String(body.chargeId)
        else {
          if (!info.customer) return res.status(400).json({ error: 'That account has no payments to refund.' })
          const charges = await s.charges.list({ customer: info.customer, limit: 1 })
          const latest = charges && charges.data && charges.data[0]
          if (!latest) return res.status(404).json({ error: 'No charge found to refund for that account.' })
          params.charge = latest.id
        }
        const refund = await s.refunds.create(params)
        res.json({ ok: true, refund: { id: refund.id, amount: refund.amount || 0, currency: refund.currency || 'usd', status: refund.status || null } })
      } catch (e) {
        console.warn('[billing] refund failed: ' + (e && e.message))
        res.status(502).json({ error: (e && e.message) || 'Could not process the refund.' })
      }
    })

    // Cancel a subscription. Default cancels immediately; atPeriodEnd:true lets
    // it run to the end of the paid period. The webhook also syncs the status,
    // but we update the store now so the console reflects it right away.
    app.post('/api/work/admin/users/:id/cancel-subscription', requireAuth, requireSuperAdmin, async (req, res) => {
      try {
        const { secret } = cfg(store)
        const s = await getStripe(secret)
        if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
        const info = userStripe(store, req.params.id)
        if (!info) return res.status(404).json({ error: 'Account not found.' })
        if (!info.subId) return res.status(400).json({ error: 'That account has no active subscription.' })
        const atPeriodEnd = !!(req.body && req.body.atPeriodEnd)
        let sub
        if (atPeriodEnd) {
          sub = await s.subscriptions.update(info.subId, { cancel_at_period_end: true })
        } else {
          sub = await s.subscriptions.cancel(info.subId)
          store.setSubscription(req.params.id, { status: 'canceled' })
        }
        res.json({ ok: true, atPeriodEnd, subscription: store.getSubscription(req.params.id) })
      } catch (e) {
        console.warn('[billing] cancel failed: ' + (e && e.message))
        res.status(502).json({ error: (e && e.message) || 'Could not cancel the subscription.' })
      }
    })
  }
}
