// Stripe webhook events for E2E, signed exactly as Stripe signs them
// (Stripe-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<payload>"
// keyed with the endpoint's signing secret). The server verifies them with the
// real stripe SDK (webhooks.constructEvent), so a wrong secret or a changed
// body is refused like in production.
import crypto from 'node:crypto'

// The test signing secret the Stripe E2E server is booted with.
export const E2E_WEBHOOK_SECRET = 'whsec_e2e_test_signing_secret_0123456789'

let seq = 0
export function stripeEvent(type, object) {
  return { id: `evt_e2e${Date.now().toString(36)}${(++seq).toString(36)}`, object: 'event', api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), type, data: { object }, livemode: false, pending_webhooks: 1 }
}

export function signPayload(payload, secret = E2E_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex')
  return `t=${t},v1=${v1}`
}

// POST one event to the product's webhook endpoint. Returns { status, data }.
export async function sendStripeEvent(api, event, { secret = E2E_WEBHOOK_SECRET } = {}) {
  const payload = JSON.stringify(event)
  const r = await api.ctx.fetch('/api/work/stripe/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signPayload(payload, secret) },
    data: payload,
    failOnStatusCode: false,
  })
  let data = null
  try { data = await r.json() } catch { data = null }
  return { status: r.status(), data }
}
