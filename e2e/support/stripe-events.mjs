// Stripe for the E2E suite, test side: the server env that turns Stripe on, and
// webhook events signed exactly as Stripe signs them
// (Stripe-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<payload>">
// keyed with the endpoint's signing secret). The product verifies them with the
// real stripe SDK (webhooks.constructEvent), so a wrong secret, a changed body
// or an unsigned event is refused like in production, and its replay guard runs.
//
// The one way to get a Stripe-enabled server: test.use({ serverEnv: STRIPE_E2E_ENV }).
// Every E2E server already runs the fake Stripe (boot/fake-stripe.mjs) and
// points the SDK at it (STRIPE_API_BASE); these keys and prices are what make
// the product use it. Specs that share this exact env share a server.
import crypto from 'node:crypto'

export const STRIPE_E2E_ENV = Object.freeze({
  STRIPE_SECRET_KEY: 'sk_test_e2e_fake',
  STRIPE_WEBHOOK_SECRET: 'whsec_e2e_fake',
  // The fake prices: price_<plan>_<m|y> (boot/fake-stripe.mjs reads the amount from the plan).
  STRIPE_PRICE_LITE: 'price_lite_m', STRIPE_PRICE_BASIC: 'price_basic_m', STRIPE_PRICE_ADVANCED: 'price_advanced_m', STRIPE_PRICE_PREMIUM: 'price_premium_m',
  STRIPE_PRICE_LITE_ANNUAL: 'price_lite_y', STRIPE_PRICE_BASIC_ANNUAL: 'price_basic_y', STRIPE_PRICE_ADVANCED_ANNUAL: 'price_advanced_y', STRIPE_PRICE_PREMIUM_ANNUAL: 'price_premium_y',
  // Stripe sends people back to the public site; under E2E that is this server
  // (support/server.mjs pins the port up front for 'self').
  WORK_PUBLIC_URL: 'self',
  // Owner subscription alerts (cancel, refund) go to the email sink.
  OWNER_ALERT_EMAILS: 'owner.alerts@e2e-mail.net',
})

export function signStripeEvent(payload, secret = STRIPE_E2E_ENV.STRIPE_WEBHOOK_SECRET, at = Math.floor(Date.now() / 1000)) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', secret).update(`${at}.${body}`, 'utf8').digest('hex')
  return { body, header: `t=${at},v1=${sig}` }
}

let seq = 0
export function stripeEvent(type, object, { id } = {}) {
  return { id: id || `evt_e2e_${Date.now().toString(36)}_${(++seq).toString(36)}`, object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), type, data: { object }, livemode: false, pending_webhooks: 1 }
}

// Deliver one signed event to the product's webhook route with a Playwright
// request context (any cookie jar; the route is public and signature-gated).
// Pass the same `id` again to replay an event; `secret` to forge one.
export async function deliverEvent(ctx, type, object, { secret, id } = {}) {
  const { body, header } = signStripeEvent(stripeEvent(type, object, { id }), secret)
  const r = await ctx.fetch('/api/work/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, data: body, failOnStatusCode: false })
  return { status: r.status(), data: await r.json().catch(() => null) }
}
