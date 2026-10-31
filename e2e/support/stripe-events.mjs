// Signed Stripe webhook events for the E2E suite: the same signature scheme
// Stripe uses (t=<unix>,v1=<hmac-sha256 of "<t>.<payload>">), so the product's
// real signature check (stripe.webhooks.constructEvent) accepts them and a
// tampered or unsigned event is still refused. The test chooses the secret
// when it boots its server (STRIPE_WEBHOOK_SECRET).
import crypto from 'node:crypto'

export const STRIPE_E2E_ENV = Object.freeze({
  STRIPE_SECRET_KEY: 'sk_test_e2e_fake',
  STRIPE_WEBHOOK_SECRET: 'whsec_e2e_fake',
  STRIPE_PRICE_LITE: 'price_lite_m', STRIPE_PRICE_BASIC: 'price_basic_m', STRIPE_PRICE_ADVANCED: 'price_advanced_m', STRIPE_PRICE_PREMIUM: 'price_premium_m',
  STRIPE_PRICE_LITE_ANNUAL: 'price_lite_y', STRIPE_PRICE_BASIC_ANNUAL: 'price_basic_y', STRIPE_PRICE_ADVANCED_ANNUAL: 'price_advanced_y', STRIPE_PRICE_PREMIUM_ANNUAL: 'price_premium_y',
  // Stripe sends people back to the public site; under E2E that is this server.
  WORK_PUBLIC_URL: 'self',
})

export function signStripeEvent(payload, secret = STRIPE_E2E_ENV.STRIPE_WEBHOOK_SECRET, at = Math.floor(Date.now() / 1000)) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', secret).update(`${at}.${body}`).digest('hex')
  return { body, header: `t=${at},v1=${sig}` }
}

let seq = 0
export function stripeEvent(type, object, { id } = {}) {
  return { id: id || `evt_e2e_${Date.now().toString(36)}_${(++seq).toString(36)}`, object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), type, data: { object }, livemode: false }
}

// Deliver one signed event to the product's webhook route with a Playwright
// request context (any cookie jar; the route is public and signature-gated).
export async function deliverEvent(ctx, type, object, { secret, id } = {}) {
  const { body, header } = signStripeEvent(stripeEvent(type, object, { id }), secret)
  const r = await ctx.fetch('/api/work/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, data: body, failOnStatusCode: false })
  return { status: r.status(), data: await r.json().catch(() => null) }
}
