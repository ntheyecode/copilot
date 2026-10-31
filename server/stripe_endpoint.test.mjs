// STRIPE_API_BASE points the Stripe SDK at a LOCAL Stripe-compatible server
// only; any other host is refused so a secret key never leaves for the wrong
// place. Unset keeps the SDK default (api.stripe.com).
import test from 'node:test'
import assert from 'node:assert/strict'
import { stripeClientOptions } from './stripe_endpoint.js'

test('unset: the SDK default', () => {
  assert.deepEqual(stripeClientOptions({}), {})
})

test('a loopback URL becomes host, port and protocol', () => {
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'http://127.0.0.1:12111' }), { host: '127.0.0.1', port: 12111, protocol: 'http' })
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'https://localhost' }), { host: 'localhost', port: 443, protocol: 'https' })
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'http://[::1]:9' }), { host: '::1', port: 9, protocol: 'http' })
})

test('any other host or a bad value is ignored, with a warning', () => {
  const warned = []
  const w = (m) => warned.push(m)
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'http://evil.example.com:80' }, w), {})
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'http://127.0.0.1.evil.example.com' }, w), {})
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'not a url' }, w), {})
  assert.deepEqual(stripeClientOptions({ STRIPE_API_BASE: 'ftp://127.0.0.1' }, w), {})
  assert.equal(warned.length, 4)
})

test('the Stripe SDK accepts the options and sends its calls there', async () => {
  const http = await import('node:http')
  const seen = []
  const srv = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`)
    res.writeHead(200, { 'content-type': 'application/json', 'request-id': 'req_test' })
    res.end(JSON.stringify({ id: 'acct_local', object: 'account' }))
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  try {
    const Stripe = (await import('stripe')).default
    const s = new Stripe('sk_test_local', stripeClientOptions({ STRIPE_API_BASE: `http://127.0.0.1:${srv.address().port}` }))
    const acct = await s.accounts.retrieve()
    assert.equal(acct.id, 'acct_local')
    assert.deepEqual(seen, ['GET /v1/account'])
  } finally { srv.close() }
})
