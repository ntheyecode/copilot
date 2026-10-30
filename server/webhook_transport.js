// ===========================================================================
// WorkCoPilot webhooks: ONE outbound HTTPS attempt, SSRF-guarded.
//
// - The socket only dials an address egress_guard approved at connect time
//   (guardedLookup), so DNS rebinding cannot reach an internal host.
// - Redirects are never followed (a 3xx is a failed attempt): a redirect is the
//   classic way to bounce a server-side request to an internal address.
// - The response body is drained up to a small cap and discarded; it is never
//   stored (it could carry the receiver's data).
// - Bounded time: one overall timeout covers connect, TLS and response.
// ===========================================================================
import https from 'node:https'
import * as W from './webhook_rules.js'
import { makeGuardedLookup } from './egress_guard.js'

const MAX_DRAIN = 16 * 1024
const CONNECT_MS = 5000
const UA = 'WorkCoPilot-Webhooks/1.0'

// job: { deliveryId, url, event, body, secret }
// opts: { timeoutMs, lookup, request (for tests), nowSec }
export function deliverWebhook(job, { timeoutMs = 10000, lookup = makeGuardedLookup(), request = https.request, nowSec = () => Math.floor(Date.now() / 1000) } = {}) {
  return new Promise((resolve) => {
    let done = false
    const finish = (r) => { if (!done) { done = true; clearTimeout(timer); resolve(r) } }
    const ts = nowSec()
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(job.body),
      'User-Agent': UA,
      [W.EVENT_HEADER]: job.event,
      [W.DELIVERY_HEADER]: job.deliveryId,
      [W.SIGNATURE_HEADER]: W.signatureHeader(job.secret, ts, job.body),
    }
    let req
    const timer = setTimeout(() => { try { req && req.destroy(new Error('timed out')) } catch { /* ignore */ } finish({ ok: false, httpStatus: null, error: 'Timed out waiting for the endpoint.' }) }, timeoutMs)
    try {
      req = request(job.url, { method: 'POST', headers, lookup, timeout: timeoutMs, agent: false }, (res) => {
        const status = res.statusCode || 0
        let seen = 0
        res.on('data', (c) => { seen += c.length; if (seen > MAX_DRAIN) res.destroy() })
        res.on('error', () => {})
        res.on('close', () => {
          if (status >= 200 && status < 300) finish({ ok: true, httpStatus: status, error: null })
          else if (status >= 300 && status < 400) finish({ ok: false, httpStatus: status, error: `Endpoint answered ${status}; redirects are not followed. Register the final URL.` })
          else finish({ ok: false, httpStatus: status, error: `Endpoint answered ${status}.` })
        })
        res.resume()
      })
      // Connect + TLS must finish within CONNECT_MS: a host that accepts nothing or
      // stalls the handshake frees the slot fast instead of holding it 10 seconds.
      req.on('socket', (sock) => {
        const ct = setTimeout(() => { try { req.destroy(Object.assign(new Error('connect timeout'), { code: 'ECONNTIMEOUT' })) } catch { /* ignore */ } }, Math.min(CONNECT_MS, timeoutMs))
        sock.once('secureConnect', () => clearTimeout(ct))
        sock.once('close', () => clearTimeout(ct))
      })
      req.on('error', (e) => {
        const msg = e && e.code === 'EGRESS_PRIVATE_ADDRESS' ? 'The host resolves to a private or reserved address, so it was not contacted.'
          : e && e.code === 'ENOTFOUND' ? 'The host could not be found.'
          : e && e.code === 'ECONNTIMEOUT' ? 'The endpoint did not accept a secure connection in time.'
          : 'Could not connect to the endpoint.'
        finish({ ok: false, httpStatus: null, error: msg })
      })
      req.end(job.body)
    } catch {
      finish({ ok: false, httpStatus: null, error: 'Could not connect to the endpoint.' })
    }
  })
}

export default { deliverWebhook }
