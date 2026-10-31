// ===========================================================================
// Where the Stripe SDK sends its API calls. Unset (every real deployment): the
// SDK's own default, api.stripe.com over https.
//
// STRIPE_API_BASE points the SDK at a local Stripe-compatible server (the
// end-to-end suite's fake, or Stripe's own stripe-mock) through the SDK's
// documented host / port / protocol options. It is honored ONLY for a loopback
// address, so a mistyped value can never send a secret key to another host;
// anything else is ignored with a warning and the SDK default stays in force.
// ===========================================================================

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

// -> {} (SDK default) or { host, port, protocol }
export function stripeClientOptions(env = process.env, warn = (m) => console.warn(m)) {
  const raw = String((env && env.STRIPE_API_BASE) || '').trim()
  if (!raw) return {}
  let u
  try { u = new URL(raw) } catch { warn(`[billing] STRIPE_API_BASE "${raw}" is not a URL; using the Stripe default.`); return {} }
  if (!LOOPBACK.has(u.hostname.toLowerCase()) || !/^https?:$/.test(u.protocol)) {
    warn('[billing] STRIPE_API_BASE is only honored for a loopback address (a local Stripe-compatible test server); using the Stripe default.')
    return {}
  }
  const protocol = u.protocol.replace(':', '')
  const port = Number(u.port) || (protocol === 'http' ? 80 : 443)
  return { host: u.hostname.replace(/^\[|\]$/g, ''), port, protocol }
}

export default { stripeClientOptions }
