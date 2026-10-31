// Network boundary for the server process under E2E.
//
// The product is never changed for tests. Instead, inside the server process,
// the two outbound doors are wrapped:
//   - globalThis.fetch: every AI provider host (taken from server/ai.js PROVIDERS,
//     the single source of truth) is redirected to the local fake provider.
//   - https.request: the fake webhook receiver host is redirected to the local
//     receiver over plain http (the product still runs its own URL rules and
//     signing; only the socket is swapped).
// Anything else that is not loopback is REFUSED and recorded, so a test run can
// never reach a real paid API, and the suite asserts that the list stays empty.
import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'

export const FAKE_HOOK_HOST = 'receiver.e2e-hooks.net'

const blocked = []
export function blockedCalls() { return blocked.slice() }

function isLoopback(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '')
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')
}

// The Stripe SDK's host: swapped for the fake Stripe (fake-stripe.mjs) over
// plain http, so the product's real SDK, config and signature checks run.
export const STRIPE_HOST = 'api.stripe.com'

export function installNetFakes({ aiHosts, aiPort, hookPort, stripePort = 0 }) {
  const hosts = new Set(aiHosts.map((h) => h.toLowerCase()))
  const realFetch = globalThis.fetch

  globalThis.fetch = async function e2eFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : (input && input.url) || String(input))
    const host = url.hostname.toLowerCase()
    if (hosts.has(host)) {
      const target = `http://127.0.0.1:${aiPort}/${host}${url.pathname}${url.search}`
      if (typeof input === 'object' && input && input.url && !init) return realFetch(new Request(target, input))
      return realFetch(target, init)
    }
    if (isLoopback(host)) return realFetch(input, init)
    blocked.push({ via: 'fetch', host, path: url.pathname, at: new Date().toISOString() })
    throw Object.assign(new TypeError(`fetch failed (E2E: outbound to ${host} is blocked)`), { cause: { code: 'ENOTFOUND' } })
  }

  // Webhook hosts are resolved with c-ares (dns.Resolver) at registration and at
  // connect time. The fake receiver host answers with a public address (never
  // dialed: https.request below swaps the socket); every other name is refused,
  // so the run makes no real DNS queries either.
  const FAKE_PUBLIC_V4 = '93.184.215.14'
  const nxdomain = (host) => Object.assign(new Error(`queryA ENOTFOUND ${host}`), { code: 'ENOTFOUND', hostname: host })
  dns.Resolver.prototype.resolve4 = function e2eResolve4(host, ...rest) {
    const cb = rest[rest.length - 1]
    if (String(host).toLowerCase() === FAKE_HOOK_HOST) return process.nextTick(cb, null, [FAKE_PUBLIC_V4])
    blocked.push({ via: 'dns', host, at: new Date().toISOString() })
    process.nextTick(cb, nxdomain(host))
  }
  dns.Resolver.prototype.resolve6 = function e2eResolve6(host, ...rest) {
    const cb = rest[rest.length - 1]
    process.nextTick(cb, Object.assign(new Error(`queryAaaa ENODATA ${host}`), { code: 'ENODATA', hostname: host }))
  }

  const realHttpsRequest = https.request
  https.request = function e2eHttpsRequest(urlOrOpts, optsOrCb, maybeCb) {
    let url = null
    let opts = {}
    let cb = maybeCb
    if (typeof urlOrOpts === 'string' || urlOrOpts instanceof URL) {
      url = new URL(String(urlOrOpts))
      if (typeof optsOrCb === 'function') cb = optsOrCb
      else opts = optsOrCb || {}
    } else {
      opts = urlOrOpts || {}
      cb = optsOrCb
      url = new URL(`https://${opts.hostname || opts.host || 'localhost'}${opts.path || '/'}`)
    }
    const host = url.hostname.toLowerCase()
    if (host === FAKE_HOOK_HOST) {
      const { lookup, agent, ...rest } = opts
      return http.request({ ...rest, protocol: 'http:', hostname: '127.0.0.1', port: hookPort, path: `${url.pathname}${url.search}` }, cb)
    }
    if (host === STRIPE_HOST && stripePort) {
      const { lookup, agent, host: _h, hostname: _hn, ciphers, ...rest } = opts
      const req = http.request({ ...rest, protocol: 'http:', hostname: '127.0.0.1', port: stripePort, path: `${url.pathname}${url.search}` }, cb)
      // The Stripe SDK writes its body only after the TLS handshake
      // ('secureConnect'); a plain socket never fires it, so it is raised here
      // right after 'connect' (our listener is registered before the SDK's).
      req.once('socket', (socket) => {
        if (socket.connecting) socket.once('connect', () => socket.emit('secureConnect'))
        else process.nextTick(() => socket.emit('secureConnect'))
      })
      return req
    }
    if (isLoopback(host)) return realHttpsRequest.call(https, urlOrOpts, optsOrCb, maybeCb)
    blocked.push({ via: 'https.request', host, path: url.pathname, at: new Date().toISOString() })
    // Port 1 on loopback refuses the connection: the caller sees an ordinary
    // async 'error' event, exactly like an unreachable host.
    return http.request({ hostname: '127.0.0.1', port: 1, path: '/', method: opts.method || 'GET', agent: false }, cb)
  }
}
