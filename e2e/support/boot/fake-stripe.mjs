// Local Stripe-compatible API for E2E. The REAL stripe SDK inside the server is
// pointed here through its documented host / port / protocol options
// (STRIPE_API_BASE, honored for loopback only: server/stripe_endpoint.js), so
// the product's own Stripe code runs unchanged and nothing reaches stripe.com.
//
// It implements the calls the product makes for an individual's plan:
//   POST   /v1/checkout/sessions            create a Checkout Session (and the
//                                           customer + subscription it will own)
//   GET    /v1/subscriptions/:id            read a subscription
//   POST   /v1/subscriptions/:id            update (cancel_at_period_end)
//   DELETE /v1/subscriptions/:id            cancel now
//   POST   /v1/billing_portal/sessions      a portal link
//   POST   /v1/billing_portal/configurations
//   GET    /v1/charges?customer=            the customer's charges
//   POST   /v1/refunds                      refund a charge
//   GET    /v1/invoices?customer=           the customer's invoices
// Anything else answers 404 in Stripe's error shape and is recorded, so a test
// sees an unexpected call instead of a silent pass. Every call is recorded with
// its decoded form parameters.
import http from 'node:http'

const PLAN_AMOUNTS = { lite: 900, basic: 1900, advanced: 3900, premium: 7900 }

export function startFakeStripe() {
  const calls = []
  const sessions = new Map()
  const subs = new Map()
  const charges = new Map()   // customer -> [charge]
  let n = 0
  const nextId = (p) => `${p}_e2e${Date.now().toString(36)}${(++n).toString(36)}`
  let base = ''

  const srv = http.createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      const url = new URL(req.url, 'http://127.0.0.1')
      const params = Object.fromEntries(new URLSearchParams(req.method === 'GET' || req.method === 'DELETE' ? url.search : raw))
      const call = { method: req.method, path: url.pathname, params, auth: /^Bearer sk_test_/.test(String(req.headers.authorization || '')), at: Date.now() }
      calls.push(call)
      const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json', 'request-id': nextId('req') }); res.end(JSON.stringify(obj)) }
      const notFound = (msg) => send(404, { error: { type: 'invalid_request_error', message: msg || `Unrecognized request URL (${req.method}: ${url.pathname})` } })
      if (!call.auth) return send(401, { error: { type: 'invalid_request_error', message: 'Invalid API Key provided.' } })
      const p = url.pathname
      let m

      if (req.method === 'POST' && p === '/v1/checkout/sessions') {
        const id = nextId('cs_test')
        const plan = params['metadata[plan]'] || 'basic'
        const customer = params.customer || nextId('cus')
        const subscription = nextId('sub')
        const priceId = params['line_items[0][price]'] || ''
        const now = Math.floor(Date.now() / 1000)
        subs.set(subscription, {
          id: subscription, object: 'subscription', status: 'active', customer,
          current_period_start: now, current_period_end: now + 30 * 86400, cancel_at_period_end: false,
          items: { object: 'list', data: [{ id: nextId('si'), object: 'subscription_item', price: { id: priceId, object: 'price', unit_amount: PLAN_AMOUNTS[plan] || 1900, currency: 'usd', recurring: { interval: params['metadata[cycle]'] === 'annual' ? 'year' : 'month', interval_count: 1 } } }] },
          metadata: { workUserId: params['subscription_data[metadata][workUserId]'] || '', plan, cycle: params['metadata[cycle]'] || 'monthly' },
        })
        charges.set(customer, [{ id: nextId('ch'), object: 'charge', amount: PLAN_AMOUNTS[plan] || 1900, currency: 'usd', customer, paid: true, refunded: false }])
        const s = {
          id, object: 'checkout.session', mode: params.mode, url: `${base}/pay/${id}`,
          client_reference_id: params.client_reference_id || null, customer, subscription,
          customer_email: params.customer_email || null,
          metadata: Object.fromEntries(Object.entries(params).filter(([k]) => k.startsWith('metadata[')).map(([k, v]) => [k.slice(9, -1), v])),
          success_url: params.success_url, cancel_url: params.cancel_url, priceId,
          status: 'open', payment_status: 'unpaid', amount_total: PLAN_AMOUNTS[plan] || 1900, currency: 'usd',
        }
        sessions.set(id, s)
        return send(200, s)
      }
      if ((m = /^\/v1\/subscriptions\/([\w-]+)$/.exec(p))) {
        const sub = subs.get(m[1])
        if (!sub) return notFound(`No such subscription: '${m[1]}'`)
        if (req.method === 'GET') return send(200, sub)
        if (req.method === 'POST') { if (params.cancel_at_period_end) sub.cancel_at_period_end = params.cancel_at_period_end === 'true'; return send(200, sub) }
        if (req.method === 'DELETE') { sub.status = 'canceled'; sub.canceled_at = Math.floor(Date.now() / 1000); return send(200, sub) }
      }
      if (req.method === 'POST' && p === '/v1/billing_portal/sessions') {
        const id = nextId('bps')
        return send(200, { id, object: 'billing_portal.session', customer: params.customer, return_url: params.return_url, url: `${base}/portal/${id}` })
      }
      if (req.method === 'POST' && p === '/v1/billing_portal/configurations') {
        return send(200, { id: nextId('bpc'), object: 'billing_portal.configuration' })
      }
      if (req.method === 'GET' && p === '/v1/charges') {
        return send(200, { object: 'list', data: charges.get(params.customer) || [], has_more: false, url: '/v1/charges' })
      }
      if (req.method === 'POST' && p === '/v1/refunds') {
        const all = [...charges.values()].flat()
        const ch = all.find((c) => c.id === params.charge)
        if (!ch) return notFound(`No such charge: '${params.charge}'`)
        ch.refunded = true
        return send(200, { id: nextId('re'), object: 'refund', amount: ch.amount, currency: ch.currency, charge: ch.id, status: 'succeeded' })
      }
      if (req.method === 'GET' && p === '/v1/invoices') {
        return send(200, { object: 'list', data: [], has_more: false, url: '/v1/invoices' })
      }
      return notFound()
    })
  })

  return new Promise((resolve) => {
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      base = `http://127.0.0.1:${port}`
      resolve({
        port,
        base,
        calls: () => calls.map((c) => ({ ...c })),
        sessions: () => [...sessions.values()].map((s) => ({ ...s })),
        subscription: (id) => (subs.get(id) ? { ...subs.get(id) } : null),
        charges: (customer) => (charges.get(customer) || []).map((c) => ({ ...c })),
        close: () => new Promise((r) => srv.close(r)),
      })
    })
  })
}
