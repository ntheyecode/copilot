// A fake Stripe at the network boundary. The product's own Stripe SDK (the
// real `stripe` package, unchanged) talks to api.stripe.com; net-fakes.mjs
// swaps that socket for this server, which answers the REST subset the
// product uses, and hosts the two pages a person is sent to: the Checkout
// page (one Pay button, one Cancel link) and the Customer Portal (one Back
// link). Nothing here signs webhooks: a test POSTs its own signed events to
// the product's webhook route (support/stripe-events.mjs), the way Stripe
// would deliver them.
//
// Prices: the ids the test configures follow price_<plan>_<m|y>; the amount
// comes from the plan's list price so proration math and MRR read sensibly.
// Everything is in memory; reset() between tests.
import http from 'node:http'

const PLAN_USD = { lite: 69, basic: 99, advanced: 299, premium: 399 }
const DAY = 86400

export async function startFakeStripe() {
  let n = 0
  const id = (p) => `${p}_${(++n).toString(36).padStart(6, '0')}`
  const now = () => Math.floor(Date.now() / 1000)
  let db
  const reset = () => { db = { customers: {}, sessions: {}, subscriptions: {}, invoices: {}, schedules: {}, portalConfigs: {}, refunds: {}, calls: [] }; return true }
  reset()
  let base = ''

  function priceOf(priceId) {
    const m = /^price_([a-z]+)_(m|y)$/.exec(String(priceId || ''))
    if (!m || !PLAN_USD[m[1]]) return null
    const monthly = PLAN_USD[m[1]] * 100
    const annual = m[2] === 'y'
    return { id: priceId, object: 'price', product: `prod_${m[1]}`, currency: 'usd', unit_amount: annual ? Math.round(monthly * 12 * 0.8) : monthly, recurring: { interval: annual ? 'year' : 'month', interval_count: 1 } }
  }
  function customerFor(email, existing) {
    if (existing && db.customers[existing]) return db.customers[existing]
    const c = { id: id('cus'), object: 'customer', email: email || null }
    db.customers[c.id] = c
    return c
  }
  function subscriptionView(s) {
    return { ...s, items: { object: 'list', data: s.items.map((it) => ({ id: it.id, object: 'subscription_item', price: priceOf(it.price) || { id: it.price, recurring: { interval: 'month' } }, quantity: it.quantity })) } }
  }
  function invoiceFor(sub, amount) {
    const inv = { id: id('in'), object: 'invoice', number: `E2E-${n}`, customer: sub.customer, subscription: sub.id, status: 'paid', paid: true, currency: 'usd', amount_paid: amount, amount_due: amount, total: amount, created: now(), period_start: sub.current_period_start, period_end: sub.current_period_end, hosted_invoice_url: `${base}/invoice/${n}`, invoice_pdf: `${base}/invoice/${n}.pdf`, lines: { data: [{ period: { start: sub.current_period_start, end: sub.current_period_end } }] } }
    db.invoices[inv.id] = inv
    return inv
  }
  // Complete a Checkout Session as the hosted page would when the person pays.
  function pay(session) {
    if (session.status !== 'open') return session
    const cust = customerFor(session.customer_email, session.customer)
    session.customer = cust.id
    session.status = 'complete'
    session.payment_status = 'paid'
    if (session.mode === 'subscription') {
      const price = session.line_items[0].price
      const sub = { id: id('sub'), object: 'subscription', customer: cust.id, status: 'active', cancel_at_period_end: false, current_period_start: now(), current_period_end: now() + 30 * DAY, items: [{ id: id('si'), price, quantity: 1 }], metadata: session.subscription_data_metadata || {}, schedule: null }
      if (session.trial_period_days) { sub.status = 'trialing'; sub.trial_end = now() + session.trial_period_days * DAY }
      db.subscriptions[sub.id] = sub
      session.subscription = sub.id
      const p = priceOf(price)
      invoiceFor(sub, sub.status === 'trialing' ? 0 : (p ? p.unit_amount : 0))
    } else {
      session.payment_intent = id('pi')
      session.amount_total = session.line_items.reduce((a, li) => a + (li.unit_amount || 0) * (li.quantity || 1), 0)
    }
    return session
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    // net-fakes forwards the original path; the SDK's own host prefix never appears here.
    const p = url.pathname
    const body = await readBody(req)
    const form = parseForm(body)
    db.calls.push({ method: req.method, path: p, form })
    const json = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json', 'request-id': id('req') }); res.end(JSON.stringify(obj)) }
    const html = (status, s, headers = {}) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers }); res.end(s) }
    const notFound = () => json(404, { error: { type: 'invalid_request_error', message: `No such route: ${req.method} ${p}` } })
    let m

    // ---- hosted pages (the browser lands here) ------------------------------
    if ((m = /^\/checkout\/(cs_[\w]+)$/.exec(p)) && req.method === 'GET') {
      const s = db.sessions[m[1]]
      if (!s) return html(404, '<h1>Unknown checkout</h1>')
      return html(200, `<!doctype html><html><head><meta charset="utf-8"><title>Fake Stripe Checkout</title></head><body style="font-family:sans-serif;padding:40px">
<h1>Fake Stripe Checkout</h1><p>${s.mode === 'subscription' ? `Subscribe to ${s.line_items[0].price}` : `Pay ${s.line_items.map((l) => `${l.quantity} x ${l.name}`).join(', ')}`}</p>
<form method="post" action="/checkout/${s.id}/pay"><button type="submit" id="fake-pay">Pay</button></form>
<p><a id="fake-cancel" href="${esc(s.cancel_url)}">Cancel and go back</a></p></body></html>`)
    }
    if ((m = /^\/checkout\/(cs_[\w]+)\/pay$/.exec(p)) && req.method === 'POST') {
      const s = db.sessions[m[1]]
      if (!s) return html(404, '<h1>Unknown checkout</h1>')
      pay(s)
      return html(302, '', { location: s.success_url.replace('{CHECKOUT_SESSION_ID}', s.id) })
    }
    if ((m = /^\/portal\/(cus_[\w]+)$/.exec(p)) && req.method === 'GET') {
      const back = url.searchParams.get('return_url') || '/'
      return html(200, `<!doctype html><html><head><meta charset="utf-8"><title>Fake Stripe Portal</title></head><body style="font-family:sans-serif;padding:40px"><h1>Fake Stripe Customer Portal</h1><p>Customer ${m[1]}</p><p><a id="fake-portal-back" href="${esc(back)}">Back</a></p></body></html>`)
    }
    if (/^\/invoice\//.test(p)) return html(200, '<h1>Fake invoice</h1>')

    // ---- REST (the product's Stripe SDK) --------------------------------------
    if (p === '/v1/checkout/sessions' && req.method === 'POST') {
      const items = (form.line_items || []).map((li) => li.price ? { price: li.price, quantity: Number(li.quantity) || 1 } : { name: li.price_data && li.price_data.product_data && li.price_data.product_data.name, unit_amount: Number(li.price_data && li.price_data.unit_amount) || 0, quantity: Number(li.quantity) || 1 })
      if (form.mode === 'subscription' && !priceOf(items[0] && items[0].price)) return json(400, { error: { type: 'invalid_request_error', message: `No such price: '${items[0] && items[0].price}'` } })
      const s = { id: id('cs'), object: 'checkout.session', mode: form.mode, status: 'open', payment_status: 'unpaid', url: '', line_items: items, metadata: form.metadata || {}, client_reference_id: form.client_reference_id || null, customer: form.customer || null, customer_email: form.customer_email || null, success_url: form.success_url, cancel_url: form.cancel_url, subscription: null, subscription_data_metadata: (form.subscription_data && form.subscription_data.metadata) || {}, trial_period_days: Number(form.subscription_data && form.subscription_data.trial_period_days) || 0, currency: 'usd' }
      s.url = `${base}/checkout/${s.id}`
      db.sessions[s.id] = s
      return json(200, s)
    }
    if ((m = /^\/v1\/checkout\/sessions\/(cs_[\w]+)$/.exec(p)) && req.method === 'GET') {
      const s = db.sessions[m[1]]
      if (!s) return notFound()
      const expand = [].concat(url.searchParams.getAll('expand[]'), url.searchParams.getAll('expand[0]'))
      const out = { ...s }
      if (expand.includes('subscription') && s.subscription) out.subscription = subscriptionView(db.subscriptions[s.subscription])
      return json(200, out)
    }
    if ((m = /^\/v1\/checkout\/sessions\/(cs_[\w]+)\/expire$/.exec(p)) && req.method === 'POST') {
      const s = db.sessions[m[1]]
      if (!s) return notFound()
      if (s.status === 'open') s.status = 'expired'
      return json(200, s)
    }
    if ((m = /^\/v1\/subscriptions\/(sub_[\w]+)$/.exec(p))) {
      const s = db.subscriptions[m[1]]
      if (!s) return notFound()
      if (req.method === 'GET') return json(200, subscriptionView(s))
      if (req.method === 'DELETE') { s.status = 'canceled'; s.canceled_at = now(); return json(200, subscriptionView(s)) }
      if (req.method === 'POST') {
        if (form.cancel_at_period_end !== undefined) s.cancel_at_period_end = String(form.cancel_at_period_end) === 'true'
        if (form.cancellation_details && form.cancellation_details.comment) s.cancellation_details = { comment: form.cancellation_details.comment }
        if (form.items) for (const it of form.items) { const cur = s.items.find((x) => x.id === it.id); if (cur && it.price) cur.price = it.price }
        if (form.metadata) s.metadata = { ...s.metadata, ...form.metadata }
        return json(200, subscriptionView(s))
      }
    }
    if ((m = /^\/v1\/prices\/(price_[\w]+)$/.exec(p)) && req.method === 'GET') { const pr = priceOf(m[1]); return pr ? json(200, pr) : notFound() }
    if ((m = /^\/v1\/products\/(prod_[\w]+)$/.exec(p)) && req.method === 'GET') return json(200, { id: m[1], object: 'product', default_price: `price_${m[1].slice(5)}_m` })
    if (p === '/v1/subscription_schedules' && req.method === 'POST') {
      const sub = db.subscriptions[form.from_subscription]
      if (!sub) return notFound()
      const sch = { id: id('sub_sched'), object: 'subscription_schedule', subscription: sub.id, phases: [{ start_date: sub.current_period_start, end_date: sub.current_period_end, items: sub.items.map((it) => ({ price: it.price, quantity: it.quantity })) }], end_behavior: 'release' }
      db.schedules[sch.id] = sch; sub.schedule = sch.id
      return json(200, sch)
    }
    if ((m = /^\/v1\/subscription_schedules\/(sub_sched_[\w]+)(\/release)?$/.exec(p))) {
      const sch = db.schedules[m[1]]
      if (!sch) return notFound()
      if (m[2]) { const sub = db.subscriptions[sch.subscription]; if (sub) sub.schedule = null; sch.status = 'released'; return json(200, sch) }
      if (req.method === 'POST') { if (form.phases) sch.phases = form.phases.map((ph) => ({ start_date: ph.start_date ? Number(ph.start_date) : undefined, end_date: ph.end_date ? Number(ph.end_date) : undefined, items: (ph.items || []).map((it) => ({ price: it.price, quantity: Number(it.quantity) || 1 })) })); if (form.end_behavior) sch.end_behavior = form.end_behavior }
      return json(200, sch)
    }
    if (p === '/v1/invoices' && req.method === 'GET') {
      const cust = url.searchParams.get('customer')
      return json(200, { object: 'list', data: Object.values(db.invoices).filter((i) => !cust || i.customer === cust).sort((a, b) => b.created - a.created) })
    }
    if (p === '/v1/billing_portal/configurations' && req.method === 'POST') { const c = { id: id('bpc'), object: 'billing_portal.configuration', features: form.features || {} }; db.portalConfigs[c.id] = c; return json(200, c) }
    if (p === '/v1/billing_portal/sessions' && req.method === 'POST') {
      if (!db.customers[form.customer]) return json(400, { error: { type: 'invalid_request_error', message: `No such customer: '${form.customer}'` } })
      return json(200, { id: id('bps'), object: 'billing_portal.session', url: `${base}/portal/${form.customer}?return_url=${encodeURIComponent(form.return_url || '/')}` })
    }
    if (p === '/v1/refunds' && req.method === 'POST') { const r = { id: id('re'), object: 'refund', amount: Number(form.amount) || 0, status: 'succeeded', currency: 'usd', payment_intent: form.payment_intent || null, charge: form.charge || null }; db.refunds[r.id] = r; return json(200, r) }
    if ((m = /^\/v1\/customers\/(cus_[\w]+)$/.exec(p)) && req.method === 'GET') { const c = db.customers[m[1]]; return c ? json(200, c) : notFound() }
    if (p === '/v1/balance' && req.method === 'GET') return json(200, { object: 'balance', available: [] })
    return notFound()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  base = `http://127.0.0.1:${port}`
  return {
    port, base, reset,
    state: () => ({ sessions: Object.values(db.sessions), subscriptions: Object.values(db.subscriptions), invoices: Object.values(db.invoices), customers: Object.values(db.customers), schedules: Object.values(db.schedules), refunds: Object.values(db.refunds), calls: db.calls }),
    // A subscription object the way Stripe would send it in a webhook.
    subscription: (subId) => { const s = db.subscriptions[subId]; return s ? subscriptionView(s) : null },
    close: () => new Promise((r) => server.close(() => r())),
  }
}

function readBody(req) {
  return new Promise((resolve) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))) })
}
// Stripe's form encoding: a[b][0][c]=v -> { a: { b: [ { c: v } ] } }.
export function parseForm(body) {
  const out = {}
  if (!body) return out
  for (const [k, v] of new URLSearchParams(body)) {
    const parts = k.replace(/\]/g, '').split('[')
    let cur = out
    parts.forEach((part, i) => {
      const last = i === parts.length - 1
      const nextIsIndex = !last && /^\d+$/.test(parts[i + 1])
      if (last) { if (Array.isArray(cur)) cur[Number(part)] = v; else cur[part] = v; return }
      const key = Array.isArray(cur) ? Number(part) : part
      if (cur[key] == null) cur[key] = nextIsIndex ? [] : {}
      cur = cur[key]
    })
  }
  return out
}
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
