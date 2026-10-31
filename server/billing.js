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

import { sendTemplateAsync, sendOwnerSubscriptionAlertAsync } from './emails.js'
// Shared with the onboarding confirm path (billing_checkout.js): one param
// builder + one activation function, so webhook and confirm never drift.
import { PLANS, mapStatus, planFromSub, periodEndIso, cycleFromSub, subscriptionCheckoutParams, applyCheckoutSession } from './billing_checkout.js'
import { caps, stripeOffReason, individualPlanRefusal } from './edition.js'
// Where Stripe sends the customer back. Fixed to the public site by default; an
// operator can override it for a staging host via WORK_PUBLIC_URL.
const SITE = (process.env.WORK_PUBLIC_URL || 'https://admireveda.com').replace(/\/+$/, '')

// Record a money event to the ledger + (optionally) email the account. The
// amount is Stripe's minor unit (cents); stored as major units. Best-effort -
// never breaks webhook handling.
function ledgerAndEmail(store, { kind, user, amountMinor, currency, stripeId, plan, status, emailType, invoiceUrl, description, invoiceNumber, nextBillingDate, cardLabel }) {
  try {
    const amount = (Number(amountMinor) || 0) / 100
    store.recordTransaction({ kind, userId: user ? user.id : null, amount, currency: currency || 'usd', stripeId, plan: plan || null, status: status || 'succeeded', description: description || '' })
    if (emailType && user) {
      const to = store.effectiveUserEmail(user.id)
      if (to) {
        const name = user.displayName || user.username || ''
        const label = description || (plan ? `${plan} plan` : 'WorkCoPilot')
        // invoiceNumber / nextBillingDate / cardLabel feed the redesigned receipt
        // detail-table rows; they stay empty (and the row hides) when not supplied.
        sendTemplateAsync(emailType, to, { name, description: label, item: label, amount, currency: currency || 'usd', date: new Date().toISOString(), reference: stripeId || '', invoiceUrl: invoiceUrl || '', invoiceNumber: invoiceNumber || '', nextBillingDate: nextBillingDate || '', cardLabel: cardLabel || '' })
      }
    }
  } catch (e) { console.warn('[billing] ledger/email failed: ' + (e && e.message)) }
}
// Stripe invoice -> the next-billing-date ISO (the current line's period end), or ''.
function invoicePeriodEndISO(inv) {
  try {
    const end = inv && inv.lines && inv.lines.data && inv.lines.data[0] && inv.lines.data[0].period && inv.lines.data[0].period.end
    return end ? new Date(end * 1000).toISOString() : ''
  } catch { return '' }
}

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim())

// Resolve the live config: store values (when billing is enabled there) take
// precedence, env vars fall back. Price ids fall back per plan, so a half-filled
// store config still picks up any env price ids that are set.
function cfg(store) {
  // Editions without Stripe (on-prem, managed) resolve to an empty config, so
  // every Stripe path takes its existing "not configured" branch and no Stripe
  // call is ever made, even if a key sits in the env or the store.
  if (!caps.has('stripe_billing')) {
    const none = { lite: '', basic: '', advanced: '', premium: '' }
    return { secret: '', webhookSecret: '', price: { ...none }, priceAnnual: { ...none } }
  }
  const c = (store && typeof store.getBillingConfig === 'function') ? (store.getBillingConfig() || {}) : {}
  const storeOn = c.enabled !== false   // default on when a store secret key is present
  const secret = (c.secretKey && storeOn) ? c.secretKey : (process.env.STRIPE_SECRET_KEY || '')
  const webhookSecret = (c.webhookSecret && storeOn) ? c.webhookSecret : (process.env.STRIPE_WEBHOOK_SECRET || '')
  const price = {
    lite: c.priceLite || process.env.STRIPE_PRICE_LITE || '',
    basic: c.priceBasic || process.env.STRIPE_PRICE_BASIC || '',
    advanced: c.priceAdvanced || process.env.STRIPE_PRICE_ADVANCED || '',
    premium: c.pricePremium || process.env.STRIPE_PRICE_PREMIUM || '',
  }
  // Annual (yearly) prices - separate recurring Stripe prices (interval=year),
  // 20% off. Checkout uses these when cycle === 'annual'. Empty = annual not
  // set up for that plan, and the client falls back to monthly / sign-up.
  const priceAnnual = {
    lite: c.priceLiteAnnual || process.env.STRIPE_PRICE_LITE_ANNUAL || '',
    basic: c.priceBasicAnnual || process.env.STRIPE_PRICE_BASIC_ANNUAL || '',
    advanced: c.priceAdvancedAnnual || process.env.STRIPE_PRICE_ADVANCED_ANNUAL || '',
    premium: c.pricePremiumAnnual || process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
  }
  return { secret, webhookSecret, price, priceAnnual }
}
// "Billing is configured" = a usable secret key exists (store OR env). The gate
// in index.js uses this: subscriptions are enforced only once billing is set up.
export function billingConfigured(store) { return !!cfg(store).secret }

// Shared Stripe client for other modules (e.g. affiliate payouts via Connect).
// Returns the configured client, or null when no secret key is set / the package
// is not installed - callers surface a clear 503 rather than crashing. SITE is the
// public base URL used for Stripe return/refresh links.
export async function stripeClient(store) { return getStripe(cfg(store).secret) }
export const PUBLIC_SITE = SITE

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

// Normalize a Stripe price to a MONTHLY-EQUIVALENT minor-unit amount, so an
// upgrade/downgrade decision compares a monthly price against an annual price
// fairly (annual amount / 12), not by plan-name order. Honors interval_count
// (e.g. a price that bills every 3 months). Falls back to treating an unknown
// interval as monthly.
function monthlyEquivMinor(unitAmount, recurring) {
  const a = Number(unitAmount) || 0
  const interval = (recurring && recurring.interval) || 'month'
  const rawCount = Number(recurring && recurring.interval_count) || 1
  const n = rawCount > 0 ? rawCount : 1
  switch (interval) {
    case 'year': return a / (12 * n)
    case 'week': return (a * 52) / (12 * n)
    case 'day': return (a * 365) / (12 * n)
    case 'month':
    default: return a / n
  }
}

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
    // (so Stripe stops retrying) but not processed again. Prefer the STORE-backed
    // dedupe when the store provides it (survives a process restart, which the
    // in-memory set does not - closing the cross-restart double-credit gap on
    // one-time purchases); fall back to the in-memory deduper otherwise so the
    // module still works standalone.
    const claim = (typeof store.claimStripeEvent === 'function') ? (id) => store.claimStripeEvent(id) : (id) => _eventDeduper.claim(id)
    const release = (typeof store.releaseStripeEvent === 'function') ? (id) => { try { store.releaseStripeEvent(id) } catch { /* best-effort */ } } : (id) => _eventDeduper.release(id)
    if (!claim(event && event.id)) {
      console.log(`[billing] duplicate webhook ${event.id} (${event.type}) ignored`)
      return res.json({ received: true, duplicate: true })
    }
    try {
      await handleEvent(s, store, event)
    } catch (e) {
      // Release the claim so a manual resend from the Stripe dashboard can retry.
      release(event && event.id)
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
    // One-time credit purchase (extra hours or image credits). Not a
    // subscription - credit the account, record the sale, email a receipt.
    const md = obj.metadata || {}
    if (obj.mode === 'payment' && (md.kind === 'hours' || md.kind === 'images') && userId) {
      const qty = Math.max(0, Math.round(Number(md.quantity) || 0))
      const user = store.getUser(userId)
      if (qty > 0 && user) {
        // Purchased hours never expire and grant hours only: tasks are a plain
        // per-day cap now (no bonus credits per hour bought).
        if (md.kind === 'hours') store.grantWorkPurchasedSeconds(userId, qty * 3600)
        else store.grantWorkImageCredits(userId, qty)
        ledgerAndEmail(store, { kind: md.kind, user, amountMinor: obj.amount_total, currency: obj.currency, stripeId: (typeof obj.payment_intent === 'string' ? obj.payment_intent : obj.id), emailType: 'purchase_receipt', description: md.kind === 'hours' ? `${qty} extra hour${qty === 1 ? '' : 's'}` : `${qty} image credit${qty === 1 ? '' : 's'}` })
        console.log(`[billing] credit purchase -> user ${userId} ${qty} ${md.kind}`)
      }
      return
    }
    // Subscription purchase: ONE shared activation path with the onboarding
    // confirm endpoint (billing_checkout.js). Idempotent; the owner alert fires
    // once, on the first of webhook / confirm to land.
    const r = await applyCheckoutSession(s, store, obj, {
      price,
      onNew: ({ user, plan, status, cycle, subId }) => sendOwnerSubscriptionAlertAsync('new_subscription', { user, plan, status, cycle, stripeId: subId }),
    })
    if (r) console.log(`[billing] checkout completed -> user ${r.userId} plan ${r.plan || '(unknown)'} status ${r.status}${md.affiliateBenefit ? ` (+${md.affiliateBenefit})` : ''}`)
    else console.warn('[billing] checkout.session.completed with no user reference; ignored')
    return
  }

  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const subId = obj.id || null
    const customerId = (typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id)) || null
    let user = store.findUserByStripeSubscription(subId) || store.findUserByStripeCustomer(customerId)
    if (!user && obj.metadata && obj.metadata.workUserId) user = store.getUser(obj.metadata.workUserId)
    if (!user) { console.warn(`[billing] ${type} for unknown subscription ${subId}; ignored`); return }
    // Prior state (read BEFORE we write) so we can tell a genuine change from a
    // no-op update (Stripe sends subscription.updated for many internal changes;
    // a renewal does not change plan or status, so it must not alert).
    const prior = user.subscription || {}
    const priorPlan = prior.plan || null
    const priorStatus = prior.status || 'none'
    const status = type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(obj.status)
    const plan = planFromSub(obj, price) || priorPlan
    const cycle = cycleFromSub(obj) || prior.cycle || null
    const patch = { status, plan, stripeCustomerId: customerId, stripeSubscriptionId: subId, currentPeriodEnd: periodEndIso(obj.current_period_end) }
    if (cycle) patch.cycle = cycle
    // On a genuine end, record WHEN it ended and (if Stripe gave one) WHY, so the
    // cancelled-subscribers list + churn graphs have a real date + reason. We only
    // pass a reason when Stripe reports one, so an admin-stashed reason set ahead
    // of a period-end cancel is not overwritten with null.
    if (type === 'customer.subscription.deleted') {
      patch.canceledAt = new Date().toISOString()
      const reason = (obj.cancellation_details && (obj.cancellation_details.reason || obj.cancellation_details.comment)) || null
      if (reason) patch.cancelReason = String(reason).slice(0, 300)
    }
    store.setSubscription(user.id, patch)
    console.log(`[billing] ${type} -> user ${user.id} plan ${plan || '(unknown)'} status ${status}`)
    // Owner alert, deduped by transition (prior-vs-new) so renewals never spam:
    //   canceled   -> cancellation (once, when it first becomes canceled)
    //   past_due   -> past due (once; the prior-status guard also dedupes against
    //                 the invoice.payment_failed handler, whichever arrives first)
    //   plan/status otherwise changed -> plan change
    if (status === 'canceled') {
      if (priorStatus !== 'canceled') {
        sendOwnerSubscriptionAlertAsync('cancellation', { user, plan, status, cycle, stripeId: subId })
        // Confirm the cancellation to the CUSTOMER (access-until shown when a paid period remains).
        const toC = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(user.id) : null
        if (toC) sendTemplateAsync('subscription_canceled', toC, { name: user.displayName || user.username, plan: plan ? plan[0].toUpperCase() + plan.slice(1) : '', accessUntil: patch.currentPeriodEnd, canceledAt: new Date().toISOString() })
      }
    } else if (status === 'past_due') {
      if (priorStatus !== 'past_due') sendOwnerSubscriptionAlertAsync('past_due', { user, plan, status, cycle, stripeId: subId })
    } else if (plan !== priorPlan || status !== priorStatus) {
      sendOwnerSubscriptionAlertAsync('plan_change', { user, plan, status, cycle, stripeId: subId })
      // Confirm a plan/status change (e.g. via the Stripe portal) to the CUSTOMER.
      const toU = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(user.id) : null
      if (toU) sendTemplateAsync('subscription_update', toU, { name: user.displayName || user.username, plan: plan ? plan[0].toUpperCase() + plan.slice(1) : '', status: status === 'active' ? 'updated' : status, nextBillingDate: patch.currentPeriodEnd })
    }
    return
  }

  // A paid invoice (initial subscription payment + every renewal) is the
  // authoritative money event for subscriptions. Record it to the ledger and
  // email a receipt. (checkout.session.completed only activates the sub, so we
  // do not double-count there.)
  if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') {
    const customerId = (typeof obj.customer === 'string' ? obj.customer : (obj.customer && obj.customer.id)) || null
    const subId = (typeof obj.subscription === 'string' ? obj.subscription : (obj.subscription && obj.subscription.id)) || null
    let user = store.findUserByStripeSubscription(subId) || store.findUserByStripeCustomer(customerId)
    if (!user && obj.metadata && obj.metadata.workUserId) user = store.getUser(obj.metadata.workUserId)
    const plan = (user && user.subscription && user.subscription.plan) || null
    ledgerAndEmail(store, { kind: 'subscription', user, amountMinor: obj.amount_paid != null ? obj.amount_paid : obj.total, currency: obj.currency, stripeId: obj.id, plan, emailType: 'payment_success', invoiceUrl: obj.hosted_invoice_url || '', description: plan ? `${plan} plan` : 'Subscription', invoiceNumber: obj.number || '', nextBillingDate: invoicePeriodEndISO(obj) })
    // Affiliate commission: on the referred user's FIRST real (non-zero) payment.
    // Deduped per referred user in the store, so renewals never pay again. Using
    // amount_paid > 0 (not billing_reason) correctly handles the free-month trial,
    // where the first money event is the post-trial invoice, not subscription_create.
    try {
      const paidUsd = (obj.amount_paid != null ? obj.amount_paid : (obj.total || 0)) / 100
      if (user && paidUsd > 0 && typeof store.recordAffiliateConversion === 'function') {
        const r = store.recordAffiliateConversion({ refUserId: user.id, amountUsd: paidUsd, currency: obj.currency || 'usd', stripeId: obj.id })
        if (r) console.log(`[affiliate] conversion -> affiliate ${r.affiliateId} commission $${r.commissionUsd} from user ${user.id}`)
      }
    } catch (e) { console.warn('[affiliate] conversion failed: ' + (e && e.message)) }
    return
  }

  // A refund issued in the Stripe dashboard (or by our admin action - deduped by
  // id). Record it as a negative-direction entry on the ledger + notify.
  if (type === 'charge.refunded' || type === 'charge.refund.updated' || type === 'refund.created' || type === 'refund.updated') {
    const charge = type.startsWith('charge') ? obj : null
    const refundObj = type.startsWith('refund') ? obj : (charge && charge.refunds && charge.refunds.data && charge.refunds.data[0]) || null
    const customerId = charge ? ((typeof charge.customer === 'string' ? charge.customer : (charge.customer && charge.customer.id)) || null) : null
    let user = customerId ? store.findUserByStripeCustomer(customerId) : null
    const amt = charge ? charge.amount_refunded : (refundObj ? refundObj.amount : 0)
    const rid = refundObj ? refundObj.id : (charge ? charge.id : null)
    store.recordTransaction({ kind: 'refund', userId: user ? user.id : null, amount: (Number(amt) || 0) / 100, currency: (charge && charge.currency) || (refundObj && refundObj.currency) || 'usd', stripeId: rid, status: 'refunded', description: 'Refund' })
    // A refunded payment voids any not-yet-paid affiliate commission earned on it
    // (backs the "voided on refund" claim; prevents paying out on reversed revenue).
    try { if (user && typeof store.voidAffiliateCommissionForUser === 'function') store.voidAffiliateCommissionForUser(user.id, { reason: 'payment refunded' }) } catch (e) { console.warn('[affiliate] void-on-refund failed: ' + (e && e.message)) }
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
    const priorStatus = (user.subscription && user.subscription.status) || 'none'
    const plan = (user.subscription && user.subscription.plan) || null
    const cycle = (user.subscription && user.subscription.cycle) || null
    store.setSubscription(user.id, { status: 'past_due' })
    const to = store.effectiveUserEmail(user.id)
    if (to) sendTemplateAsync('payment_failed', to, { name: user.displayName || user.username, description: plan ? `${plan} plan` : 'Subscription', reason: 'The card was declined or could not be charged.', amount: (obj.amount_due || 0) / 100, currency: obj.currency || 'usd', retryUrl: `${SITE}/work/billing` })
    // Owner alert on the FIRST past-due (prior-status guard dedupes against the
    // customer.subscription.updated handler and avoids alerting on every retry).
    if (priorStatus !== 'past_due') sendOwnerSubscriptionAlertAsync('past_due', { user, plan, status: 'past_due', cycle, amount: (obj.amount_due || 0) / 100, currency: obj.currency || 'usd', stripeId: obj.id })
    console.log(`[billing] invoice.payment_failed -> user ${user.id} status past_due`)
    return
  }
}

// Map one Stripe invoice to the safe shape the dashboard shows (no secrets, no
// internal ids beyond the invoice id). Amount is in the currency's minor unit
// (cents) as Stripe reports it; the client formats it.
function mapInvoice(inv) {
  // The billing period: prefer the (subscription) line item's own period, which
  // is the service window the customer paid for; fall back to the invoice-level
  // period. Both are optional and never contain a secret.
  const toIso = (sec) => (sec ? new Date(sec * 1000).toISOString() : null)
  const line0 = inv.lines && inv.lines.data && inv.lines.data[0]
  const periodStart = toIso((line0 && line0.period && line0.period.start) || inv.period_start)
  const periodEnd = toIso((line0 && line0.period && line0.period.end) || inv.period_end)
  return {
    id: inv.id || null,
    number: inv.number || null,
    amount: (inv.amount_paid != null ? inv.amount_paid : (inv.amount_due != null ? inv.amount_due : inv.total)) || 0,
    currency: inv.currency || 'usd',
    status: inv.status || null,
    created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    hostedInvoiceUrl: inv.hosted_invoice_url || null,
    invoicePdf: inv.invoice_pdf || null,
    paid: !!inv.paid,
    periodStart,
    periodEnd,
  }
}
// Server-only: the Stripe ids an operator action needs for one account.
function userStripe(store, userId) {
  const u = store.getUser(userId)
  if (!u) return null
  const sub = u.subscription || {}
  return { user: u, customer: sub.stripeCustomerId || null, subId: sub.stripeSubscriptionId || null }
}

// ---- Subscription checkout (shared by the dashboard route + onboarding) ----
// A Stripe Customer Portal configuration without plan switching (invoices,
// payment method, cancel at period end), created once per process and reused.
// null when Stripe refuses it (the caller answers with an actionable 503;
// never the default configuration, which may allow a plan switch).
let noSwitchConfigId = null
async function noPlanChangePortalConfig(s) {
  if (noSwitchConfigId) return noSwitchConfigId
  try {
    const c = await s.billingPortal.configurations.create({
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
        subscription_update: { enabled: false },
      },
    })
    noSwitchConfigId = (c && c.id) || null
  } catch (e) {
    console.warn('[billing] could not create the no-plan-change portal configuration: ' + (e && e.message))
  }
  return noSwitchConfigId
}

// Resolve the plan's price (monthly or annual), the affiliate trial, and create
// the Stripe Checkout Session. Throws an error with .status (+ optional .body
// fields) for every operator-facing refusal, so each caller maps it to its own
// response shape; unexpected Stripe failures throw plain errors (callers return
// a 502). Returns { url, id } of the created session.
const checkoutRefusal = (status, message, body) => { const e = new Error(message); e.status = status; if (body) e.body = body; return e }
export async function createSubscriptionCheckout(store, user, { plan, cycle = 'monthly', successUrl, cancelUrl }) {
  // Every personal-plan checkout funnels through here, so the edition rule is
  // also checked here (the route gate in edition_route_gates.js answers first).
  const noPlans = individualPlanRefusal()
  if (noPlans) throw checkoutRefusal(noPlans.status, noPlans.body.error, noPlans.body)
  const p = String(plan || '').trim().toLowerCase()
  if (!PLANS.includes(p)) throw checkoutRefusal(400, 'Pick a plan: lite, basic, advanced or premium.')
  const cyc = cycle === 'annual' ? 'annual' : 'monthly'
  const { secret, price, priceAnnual } = cfg(store)
  const s = await getStripe(secret)
  // Annual uses the yearly price id when configured; if annual was requested
  // but not set up, say so clearly (the client falls back) rather than
  // silently charging the monthly price.
  const configuredId = cyc === 'annual' ? priceAnnual[p] : price[p]
  if (!s) throw checkoutRefusal(503, 'Billing is not configured yet.')
  if (cyc === 'annual' && !configuredId) throw checkoutRefusal(409, 'Annual billing is not set up for this plan yet.', { annualUnavailable: true })
  if (!configuredId) throw checkoutRefusal(503, 'Billing is not configured yet.')
  const priceId = await resolvePriceId(s, configuredId)
  if (!priceId) throw checkoutRefusal(503, 'That plan is not set up correctly in Stripe (no price found for the configured id). Check the price or product id in the admin console.')
  // Referred-user perk: an affiliate referral enrolling ANNUALLY gets a free
  // month, delivered as a trial on the subscription (1 free month of access,
  // then the 12-month annual charge = 13 months total). Entitlement flows
  // automatically because trialing counts as active. Once per account.
  let benefitDays = 0
  try {
    if (cyc === 'annual' && typeof store.affiliateAnnualBenefitDays === 'function') benefitDays = store.affiliateAnnualBenefitDays(user.id) || 0
  } catch { benefitDays = 0 }
  // Seed the email so Stripe creates/attaches a customer: the contact email
  // first (onboarding accounts always have one), else an email-shaped username.
  const contact = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(user.id) : null
  const customerEmail = looksLikeEmail(contact) ? contact : (looksLikeEmail(user.username) ? user.username : null)
  const params = subscriptionCheckoutParams({ user, plan: p, cycle: cyc, priceId, benefitDays, successUrl, cancelUrl, customerEmail })
  const checkout = await s.checkout.sessions.create(params)
  if (!checkout || !checkout.url) throw checkoutRefusal(502, 'Could not start checkout. Please try again.')
  return { url: checkout.url, id: checkout.id || null }
}
// The configured plan -> price id map (for reverse lookups by other modules).
export function billingPriceMap(store) { return cfg(store).price }

// ---- JSON routes (checkout + read + invoices + portal + admin) ------------
export function registerWorkBillingRoutes(app, { store, requireWorkAuth, requireAuth, requireSuperAdmin, requireAiStepUp, wrap }) {
  // Step-up on the most sensitive writes (Stripe secret/webhook keys). A no-op
  // pass-through if the host did not provide the middleware, so the module stays
  // usable standalone.
  const stepUp = requireAiStepUp || ((req, res, next) => next())
  // Finance gate = superadmin OR the `accounting` role (store.isFinanceUser).
  // Defined once here so BOTH the Subscribers view (widened from superadmin-only)
  // and the finance endpoints share one authority (SUPREME RULE II: single source
  // of truth). Stripe secret/config WRITES stay superadmin-only below.
  const financeGate = (req, res, next) => {
    if (!req.user || !store.isFinanceUser(req.user.id)) return res.status(403).json({ error: 'Finance access only.' })
    next()
  }
  // Start a subscription Checkout Session for the chosen plan. Returns { url }.
  app.post('/api/work/checkout', requireWorkAuth, async (req, res) => {
    try {
      const plan = String((req.body || {}).plan || '').trim().toLowerCase()
      const cycle = String((req.body || {}).cycle || 'monthly').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly'
      const r = await createSubscriptionCheckout(store, req.workUser, { plan, cycle, successUrl: `${SITE}/work?checkout=success`, cancelUrl: `${SITE}/#pricing` })
      res.json({ url: r.url })
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.message, ...(e.body || {}) })
      console.warn('[billing] checkout create failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not start checkout. Please try again.' })
    }
  })

  // One-time purchase of extra hours or image credits. Priced DYNAMICALLY from
  // Admin > Pricing (the per-hour / per-image rate for the buyer's tier) - no
  // Stripe products to manage. The webhook credits the account + emails a
  // receipt on completion.
  app.post('/api/work/checkout/credits', requireWorkAuth, async (req, res) => {
    // Edition backstop (the route gate answers first): no personal top-ups
    // where personal plans are not sold.
    const noPlans = individualPlanRefusal()
    if (noPlans) return res.status(noPlans.status).json(noPlans.body)
    try {
      const kind = String((req.body || {}).kind || '').trim().toLowerCase()
      if (kind !== 'hours' && kind !== 'images') return res.status(400).json({ error: 'Choose hours or images.' })
      const u = req.workUser
      const pricing = store.getWorkPricing()
      const tier = (store.getWorkUsage ? (store.getWorkUsage(u.id) || {}).tier : u.tier) || u.tier || 'basic'
      const minBulk = kind === 'images' ? Math.max(1, Number(pricing.imageMinBulk) || 10) : 1
      let qty = Math.round(Number((req.body || {}).quantity) || 0)
      if (kind === 'images' && qty < minBulk) qty = minBulk
      if (qty < 1) return res.status(400).json({ error: `Enter how many ${kind} to buy.` })
      if (qty > 1000) return res.status(400).json({ error: 'That is a very large quantity; buy a smaller amount.' })
      const unit = kind === 'hours' ? Number((pricing.hour || {})[tier]) : Number((pricing.image || {})[tier])
      if (!(unit > 0)) return res.status(503).json({ error: `Extra ${kind} are not priced for your plan.` })
      const { secret } = cfg(store)
      const s = await getStripe(secret)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
      const existingCustomer = (u.subscription && u.subscription.stripeCustomerId) || null
      const to = store.effectiveUserEmail ? store.effectiveUserEmail(u.id) : null
      const params = {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: pricing.currency || 'usd',
            unit_amount: Math.round(unit * 100),
            product_data: { name: kind === 'hours' ? 'WorkCoPilot extra hour' : 'WorkCoPilot image credit' },
          },
          quantity: qty,
        }],
        client_reference_id: String(u.id),
        metadata: { workUserId: String(u.id), kind, quantity: String(qty) },
        payment_intent_data: { metadata: { workUserId: String(u.id), kind, quantity: String(qty) } },
        success_url: `${SITE}/work?purchase=success`,
        cancel_url: `${SITE}/work`,
      }
      if (existingCustomer) params.customer = existingCustomer
      else if (to) params.customer_email = to
      const checkout = await s.checkout.sessions.create(params)
      if (!checkout || !checkout.url) return res.status(502).json({ error: 'Could not start checkout. Please try again.' })
      res.json({ url: checkout.url, quantity: qty, unit, total: Math.round(unit * qty * 100) / 100, currency: pricing.currency || 'usd' })
    } catch (e) {
      console.warn('[billing] credits checkout failed: ' + (e && e.message))
      res.status(502).json({ error: 'Could not start checkout. Please try again.' })
    }
  })

  // The account's own subscription (safe fields only: status, plan, cycle,
  // currentPeriodEnd, since, canceledAt, pendingChange - no Stripe ids).
  app.get('/api/work/subscription', requireWorkAuth, wrap((req, res) => {
    res.json({ subscription: store.getSubscription(req.workUser.id), configured: billingConfigured(store) })
  }))

  // Self-serve UPGRADE / DOWNGRADE of the active subscription.
  //
  // POLICY (financial best practice; documented here and enforced below):
  //   * Upgrade vs downgrade is decided by the RESOLVED Stripe price amounts,
  //     each normalized to a MONTHLY-EQUIVALENT (annual / 12), so a
  //     monthly<->annual move compares fairly - never by plan-name order.
  //   * UPGRADE (equal-or-higher monthly-equivalent) is IMMEDIATE with
  //     proration_behavior 'create_prorations': the customer is charged the
  //     prorated difference now and gets the higher tier at once. The store is
  //     updated immediately so entitlements follow right away. (Equal is folded
  //     into "now" so a lateral move never strands the customer below what they
  //     paid for.)
  //   * DOWNGRADE (lower monthly-equivalent) takes effect AT PERIOD END via a
  //     Stripe subscription schedule with proration_behavior 'none': the customer
  //     keeps the tier they already paid for until the period ends, with no
  //     mid-cycle credit. We record a pendingChange (shown on the dashboard) and
  //     do NOT change the active plan now; at renewal Stripe fires
  //     customer.subscription.updated, our webhook maps the new price -> plan and
  //     setSubscription clears the pendingChange.
  // Never silent (SUPREME RULE III/VI): a Stripe failure logs a work incident and
  // returns an actionable error; it never degrades to a wrong-tier state.
  app.post('/api/work/subscription/change', requireWorkAuth, async (req, res) => {
    const noPlans = individualPlanRefusal()   // edition backstop, as above
    if (noPlans) return res.status(noPlans.status).json(noPlans.body)
    try {
      const plan = String((req.body || {}).plan || '').trim().toLowerCase()
      if (!PLANS.includes(plan)) return res.status(400).json({ error: 'Pick a plan: lite, basic, advanced or premium.' })
      const cycle = String((req.body || {}).cycle || 'monthly').trim().toLowerCase() === 'annual' ? 'annual' : 'monthly'
      const { secret, price, priceAnnual } = cfg(store)
      const s = await getStripe(secret)
      if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })

      const u = req.workUser
      const sub0 = u.subscription || {}
      const status0 = sub0.status || 'none'
      const subId = sub0.stripeSubscriptionId || null
      // No active/trialing Stripe subscription -> this is a first purchase, not a change.
      if (!subId || !(status0 === 'active' || status0 === 'trialing')) {
        return res.status(409).json({ error: 'You do not have an active subscription to change. Choose a plan to get started.', needsCheckout: true, checkout: '/api/work/checkout' })
      }
      const configuredId = cycle === 'annual' ? priceAnnual[plan] : price[plan]
      if (cycle === 'annual' && !configuredId) return res.status(409).json({ error: 'Annual billing is not set up for this plan yet.', annualUnavailable: true })
      if (!configuredId) return res.status(503).json({ error: 'That plan is not configured in Stripe yet.' })
      const newPriceId = await resolvePriceId(s, configuredId)
      if (!newPriceId) return res.status(503).json({ error: 'That plan is not set up correctly in Stripe (no price found). Check the admin console.' })

      // Load the live subscription + its current item/price.
      const sub = await s.subscriptions.retrieve(subId)
      const item = sub.items && sub.items.data && sub.items.data[0]
      if (!item || !item.price) return res.status(502).json({ error: 'Could not read your current subscription. Please try again.' })
      if (item.price.id === newPriceId) return res.status(400).json({ error: 'You are already on that plan and billing cycle.' })

      // Decide by resolved monthly-equivalent price amounts.
      const newPrice = await s.prices.retrieve(newPriceId)
      const curMonthly = monthlyEquivMinor(item.price.unit_amount, item.price.recurring)
      const newMonthly = monthlyEquivMinor(newPrice.unit_amount, newPrice.recurring)
      const isUpgrade = newMonthly >= curMonthly
      const planLabel = `${plan[0].toUpperCase()}${plan.slice(1)} (${cycle})`

      if (isUpgrade) {
        // Immediate upgrade. If a period-end downgrade was previously scheduled,
        // release that schedule first so it cannot later override the upgrade.
        const schedId = (typeof sub.schedule === 'string' ? sub.schedule : (sub.schedule && sub.schedule.id)) || null
        if (schedId) { try { await s.subscriptionSchedules.release(schedId) } catch (e) { console.warn('[billing] could not release prior schedule: ' + (e && e.message)) } }
        const updated = await s.subscriptions.update(subId, {
          items: [{ id: item.id, price: newPriceId }],
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false,
        })
        const newStatus = mapStatus(updated.status)
        store.setSubscription(u.id, { status: newStatus, plan, cycle, currentPeriodEnd: periodEndIso(updated.current_period_end), pendingChange: null })
        // Applied change -> alert the owner now.
        sendOwnerSubscriptionAlertAsync('plan_change', { user: store.getUser(u.id) || u, plan, status: newStatus, amount: (newPrice.unit_amount || 0) / 100, currency: newPrice.currency || 'usd', cycle, stripeId: subId })
        // Confirm the upgrade to the CUSTOMER, with the new price.
        const toUp = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(u.id) : null
        if (toUp) sendTemplateAsync('subscription_changed', toUp, { name: (store.getUser(u.id) || u).displayName || u.username, plan: planLabel, cycle, amount: (newPrice.unit_amount || 0) / 100, currency: newPrice.currency || 'usd', effectiveLabel: 'Now (prorated for the rest of this period)' })
        const effectiveDate = new Date().toISOString()
        return res.json({ ok: true, effective: 'now', effectiveDate, summary: `Upgraded to ${planLabel}, effective now.`, subscription: store.getSubscription(u.id) })
      }

      // Downgrade: schedule the new (lower) price at the current period end.
      const periodEnd = sub.current_period_end || null
      const effectiveDate = periodEndIso(periodEnd)
      let schedule
      const existingSchedId = (typeof sub.schedule === 'string' ? sub.schedule : (sub.schedule && sub.schedule.id)) || null
      if (existingSchedId) schedule = await s.subscriptionSchedules.retrieve(existingSchedId)
      else schedule = await s.subscriptionSchedules.create({ from_subscription: subId })
      const phase0 = schedule.phases && schedule.phases[0]
      if (!phase0) return res.status(502).json({ error: 'Could not schedule the change. Please try again or contact support.' })
      const curItems = (phase0.items || []).map((it) => ({ price: (typeof it.price === 'string' ? it.price : (it.price && it.price.id)), quantity: it.quantity || 1 }))
      const phases = [
        { items: curItems, start_date: phase0.start_date, end_date: phase0.end_date || periodEnd },
        { items: [{ price: newPriceId, quantity: 1 }] },
      ]
      await s.subscriptionSchedules.update(schedule.id, { phases, end_behavior: 'release', proration_behavior: 'none' })
      // Record the pending change for the dashboard; the active plan is unchanged
      // until the renewal webhook flips it (which also clears this pendingChange).
      const pendingChange = { plan, cycle, priceId: newPriceId, effectiveDate, scheduleId: schedule.id, scheduledAt: new Date().toISOString() }
      store.setSubscription(u.id, { pendingChange })
      // Confirm the SCHEDULED downgrade to the CUSTOMER, with the new price + date.
      const toDn = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(u.id) : null
      if (toDn) sendTemplateAsync('subscription_changed', toDn, { name: (store.getUser(u.id) || u).displayName || u.username, plan: planLabel, cycle, amount: (newPrice.unit_amount || 0) / 100, currency: newPrice.currency || 'usd', effectiveLabel: effectiveDate ? `At your next renewal (${effectiveDate.slice(0, 10)})` : 'At your next renewal' })
      // No owner alert yet: the change is SCHEDULED, not applied. The webhook fires
      // the plan_change alert when the downgrade actually lands at period end.
      return res.json({ ok: true, effective: 'period_end', effectiveDate, summary: `Scheduled downgrade to ${planLabel}, effective ${effectiveDate ? effectiveDate.slice(0, 10) : 'at period end'}.`, subscription: store.getSubscription(u.id) })
    } catch (e) {
      console.warn('[billing] subscription change failed: ' + (e && e.message))
      try { if (store.recordWorkIncident) store.recordWorkIncident({ kind: 'billing_change_failed', message: 'subscription change failed: ' + (e && e.message ? e.message : 'unknown'), userId: req.workUser && req.workUser.id, call: 'subscription/change' }) } catch { /* best effort */ }
      res.status(502).json({ error: 'Could not change your plan. Please try again or contact support.' })
    }
  })

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
      // Where personal plans are not sold, the portal must not offer a plan
      // switch either (the dashboard's default configuration may allow one):
      // invoices, card and cancel only.
      let configuration
      if (!caps.has('individual_plans')) {
        configuration = await noPlanChangePortalConfig(s)
        if (!configuration) return res.status(503).json({ error: 'The billing portal is not available right now. Your invoices are in your dashboard; for anything else write to support.', portalUnavailable: true })
      }
      const portal = await s.billingPortal.sessions.create({ customer, return_url: `${SITE}/work`, ...(configuration ? { configuration } : {}) })
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
      }, ...(stripeOffReason() ? { offByEdition: true, offReason: stripeOffReason() } : {}) })
    }))
    app.post('/api/work/admin/billing', requireAuth, requireSuperAdmin, stepUp, wrap((req, res) => {
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
      // The DISPLAYED monthly price (superadmin pricing) vs what Stripe will
      // actually CHARGE (the Price id). These are separate sources of truth, so we
      // flag any mismatch here - otherwise a superadmin can change the shown price
      // and Stripe keeps charging the old amount.
      const displayed = (store.getWorkPricing && store.getWorkPricing().plans) || {}
      for (const p of PLANS) {
        const configured = price[p]
        if (!configured) { out.plans[p] = { ok: false, error: 'not set' }; continue }
        try {
          const priceId = await resolvePriceId(s, configured)
          if (!priceId) { out.plans[p] = { ok: false, error: 'no price found for this id' }; continue }
          const pr = await s.prices.retrieve(priceId)
          const amount = (pr.unit_amount != null ? pr.unit_amount / 100 : null)
          const shown = displayed[p]
          const matchesDisplayed = (amount != null && shown != null) ? (Math.round(amount * 100) === Math.round(shown * 100)) : null
          out.plans[p] = {
            ok: true,
            amount, currency: pr.currency || 'usd',
            interval: (pr.recurring && pr.recurring.interval) || 'one-time',
            displayed: shown ?? null,
            matchesDisplayed,
            ...(matchesDisplayed === false ? { warning: `Stripe charges $${amount} but the site shows $${shown}` } : {}),
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
      // Lite is validated + shown when set, but not REQUIRED (an operator may run
      // basic/advanced/premium without a Lite tier). Checkout is "ready" when the
      // account is valid, the three core plans resolve, and any set Lite id also
      // resolves. Annual is "live" when the three core annual ids are valid.
      const CORE = ['basic', 'advanced', 'premium']
      out.annualReady = CORE.every((p) => out.annualPlans[p] && out.annualPlans[p].set && out.annualPlans[p].ok)
      out.ok = !!out.accountId && CORE.every((p) => out.plans[p] && out.plans[p].ok) && PLANS.every((p) => !price[p] || (out.plans[p] && out.plans[p].ok))
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
        const reason = String((req.body && req.body.reason) || 'Canceled by admin').slice(0, 300)
        let sub
        if (atPeriodEnd) {
          sub = await s.subscriptions.update(info.subId, { cancel_at_period_end: true })
          // Stash the reason now (status stays live until it ends) so the webhook
          // customer.subscription.deleted lands with the reason already recorded.
          store.setSubscription(req.params.id, { cancelReason: reason })
        } else {
          const priorStatus = (info.user.subscription && info.user.subscription.status) || 'none'
          sub = await s.subscriptions.cancel(info.subId)
          store.setSubscription(req.params.id, { status: 'canceled', canceledAt: new Date().toISOString(), cancelReason: reason })
          // Owner alert for the admin-initiated immediate cancel. We pre-set the
          // store to canceled above, so the webhook's subscription.deleted (prior
          // status already canceled) will be suppressed - fire it here instead so
          // an admin cancel is never silent. Period-end cancels alert via the
          // webhook when they actually end.
          if (priorStatus !== 'canceled') {
            const sb = info.user.subscription || {}
            sendOwnerSubscriptionAlertAsync('cancellation', { user: info.user, plan: sb.plan || null, status: 'canceled', cycle: sb.cycle || null, stripeId: info.subId })
            // Immediate admin cancel: access ends now, so no access-until date is sent.
            const toAc = (typeof store.effectiveUserEmail === 'function') ? store.effectiveUserEmail(info.user.id) : null
            if (toAc) sendTemplateAsync('subscription_canceled', toAc, { name: info.user.displayName || info.user.username, plan: sb.plan ? sb.plan[0].toUpperCase() + sb.plan.slice(1) : '', canceledAt: new Date().toISOString() })
          }
        }
        res.json({ ok: true, atPeriodEnd, subscription: store.getSubscription(req.params.id) })
      } catch (e) {
        console.warn('[billing] cancel failed: ' + (e && e.message))
        res.status(502).json({ error: (e && e.message) || 'Could not cancel the subscription.' })
      }
    })
  }

  // ---- Finance: subscribers, cancelled, all-transactions, period summary,
  // timeseries, manual-entry CRUD, refunds. Gated by financeGate (superadmin OR
  // the accounting role). "Admin should see all transactions; accounting role
  // sees all transactions; dashboard speaks weekly/monthly/quarterly/annual."
  if (requireAuth) {
    // Subscribers list for the admin Subscribers page. WIDENED from superadmin-only
    // to financeGate so an accountant can see it (Stripe config WRITES stay
    // superadmin-only above). Shape is unchanged for the existing admin UI (it now
    // also carries cycle + pendingChange per row - additive). The store builds it
    // from accounts with a live-ish subscription (active | trialing | past_due |
    // comp); no secrets and no Stripe ids (a boolean `free` marks a comped account).
    app.get('/api/work/admin/subscribers', requireAuth, financeGate, wrap((req, res) => {
      res.json(store.listSubscribers())
    }))
    // Cancelled subscribers (churn view + graphs): every account whose sub ended,
    // with the end date + reason recorded at cancellation and the lifetime spend.
    app.get('/api/work/admin/subscribers/cancelled', requireAuth, financeGate, wrap((req, res) => {
      res.json(store.listCancelledSubscribers())
    }))
    app.get('/api/work/admin/finance/summary', requireAuth, financeGate, wrap((req, res) => res.json(store.financialSummary())))
    // Bucketed finance timeseries for the dashboard graphs (week|month|quarter|year).
    app.get('/api/work/admin/finance/timeseries', requireAuth, financeGate, wrap((req, res) => {
      res.json(store.financeTimeseries(String(req.query.granularity || 'month')))
    }))
    app.get('/api/work/admin/finance/transactions', requireAuth, financeGate, wrap((req, res) => res.json({
      transactions: store.listTransactions({ limit: Math.min(5000, Number(req.query.limit) || 500), kind: req.query.kind || null, since: req.query.since || null, until: req.query.until || null }),
      total: store.transactionCount(),
    })))
    // ---- Manual ledger CRUD (financeGate). Create an adjustment, edit its NOTE
    // only (posted amount immutable), or VOID a manual entry (delete). A real
    // Stripe-sourced row cannot be edited/voided here (409 stripeSourced) - it is
    // reversed with a Stripe refund or an offsetting adjustment. Every mutation
    // carries WHO + reason in the entry's audit trail (store enforces this).
    const actor = (req) => ({ byUserId: req.user && req.user.id, byName: (req.user && (req.user.displayName || req.user.username)) || null })
    app.post('/api/work/admin/finance/transactions', requireAuth, financeGate, wrap((req, res) => {
      const b = req.body || {}
      const a = actor(req)
      const rec = store.createManualTransaction({ amount: b.amount, currency: b.currency || 'usd', description: b.description || '', reason: b.reason || '', createdBy: a.byUserId, createdByName: a.byName })
      res.json({ ok: true, transaction: rec })
    }))
    app.patch('/api/work/admin/finance/transactions/:id', requireAuth, financeGate, (req, res) => {
      try {
        const b = req.body || {}; const a = actor(req)
        const rec = store.updateManualTransaction(req.params.id, { description: b.description, reason: b.reason || '', byUserId: a.byUserId, byName: a.byName })
        res.json({ ok: true, transaction: rec })
      } catch (e) {
        const code = e && e.status ? e.status : 502
        const body = { error: (e && e.message) || 'Could not edit that entry.' }
        if (e && e.stripeSourced) { body.stripeSourced = true; if (e.hint) body.hint = e.hint }
        res.status(code).json(body)
      }
    })
    app.delete('/api/work/admin/finance/transactions/:id', requireAuth, financeGate, (req, res) => {
      try {
        const b = req.body || {}; const a = actor(req)
        const rec = store.voidTransaction(req.params.id, { reason: b.reason || '', byUserId: a.byUserId, byName: a.byName })
        res.json({ ok: true, voided: true, transaction: rec })
      } catch (e) {
        const code = e && e.status ? e.status : 502
        const body = { error: (e && e.message) || 'Could not void that entry.' }
        if (e && e.stripeSourced) { body.stripeSourced = true; if (e.hint) body.hint = e.hint }
        res.status(code).json(body)
      }
    })
    // Refund a specific ledger transaction (by its Stripe reference). Records the
    // refund to the ledger. Optional partial amount (major units).
    app.post('/api/work/admin/finance/transactions/:id/refund', requireAuth, financeGate, async (req, res) => {
      try {
        const tx = store.getTransaction(req.params.id)
        if (!tx) return res.status(404).json({ error: 'Transaction not found.' })
        if (tx.kind === 'refund') return res.status(400).json({ error: 'That entry is already a refund.' })
        if (!tx.stripeId) return res.status(400).json({ error: 'That transaction has no Stripe reference to refund.' })
        const { secret } = cfg(store); const s = await getStripe(secret)
        if (!s) return res.status(503).json({ error: 'Billing is not configured yet.' })
        const sid = String(tx.stripeId); const params = {}
        if (sid.startsWith('pi_')) params.payment_intent = sid
        else if (sid.startsWith('ch_')) params.charge = sid
        else if (sid.startsWith('in_')) {
          const inv = await s.invoices.retrieve(sid)
          if (inv && inv.payment_intent) params.payment_intent = (typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent.id)
          else if (inv && inv.charge) params.charge = (typeof inv.charge === 'string' ? inv.charge : inv.charge.id)
        }
        if (!params.payment_intent && !params.charge) return res.status(400).json({ error: 'Could not resolve a charge to refund for this transaction.' })
        if (req.body && req.body.amount != null && req.body.amount !== '') params.amount = Math.round(Number(req.body.amount) * 100)
        const refund = await s.refunds.create(params)
        const rec = store.recordTransaction({ kind: 'refund', userId: tx.userId, amount: (refund.amount || 0) / 100, currency: refund.currency || tx.currency, stripeId: refund.id, status: refund.status || 'succeeded', description: `Refund of ${tx.description || tx.kind}` })
        res.json({ ok: true, refund: { id: refund.id, amount: (refund.amount || 0) / 100, currency: refund.currency }, transaction: rec })
      } catch (e) { console.warn('[billing] finance refund failed: ' + (e && e.message)); res.status(502).json({ error: (e && e.message) || 'Could not process the refund.' }) }
    })
  }
  // Accounting-role management (superadmin only).
  if (requireAuth && requireSuperAdmin) {
    app.get('/api/work/admin/finance/staff', requireAuth, requireSuperAdmin, wrap((req, res) => res.json({ staff: store.listFinanceStaff() })))
    app.post('/api/work/admin/finance/role', requireAuth, requireSuperAdmin, wrap((req, res) => res.json({ user: store.setUserRole((req.body || {}).userId, (req.body || {}).role) })))
  }
}
