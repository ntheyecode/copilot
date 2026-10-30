// ===========================================================================
// WorkCoPilot integration API: `requireApiKey(scope)` middleware.
//
// Reads `Authorization: Bearer wcp_live_...` (never a cookie, never a query
// string), resolves it to a NON-HUMAN company principal and checks, in order:
// key valid and live -> company enabled -> caller IP allowed -> per-key rate
// limit -> the route's scope. On success it sets `req.apiPrincipal`
// ({ kind:'api_key', keyId, companyId, scopes }) and NOTHING else: it never sets
// req.user / req.workUser, so no session-only route or helper can mistake a key
// for a person or an admin.
//
// Failed key attempts are throttled per client network (an IPv4 address, or the
// /64 of an IPv6 one, since one host owns a whole /64): past its failure budget a
// network gets 429 instead of a verdict on each bad key. A valid key is never
// refused for its neighbors' failures (no shared-NAT lockout).
// A per-company limit sits above the per-key one, so 50 keys cannot multiply a
// company's share of the server. Every outcome for a real key (including revoked,
// expired and wrong-IP uses) is counted in the hourly usage audit.
// ===========================================================================
import net from 'node:net'
import { bearerFrom, normalizeIp } from './api_key_rules.js'
import { isScope } from './api_scopes.js'
import { sendApiError } from './api_errors.js'

// The throttle bucket for a client address: the IPv4 address itself, or the first
// four hextets (/64) of an IPv6 address.
export function networkKey(ip) {
  const a = normalizeIp(ip)
  if (net.isIP(a) !== 6) return a || 'unknown'
  const [head, tail = ''] = a.toLowerCase().split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const full = a.includes('::') ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h
  return full.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '')).join(':') + '::/64'
}

const tooMany = (res, sec, what) => {
  res.setHeader('Retry-After', String(sec))
  return sendApiError(res, 429, 'RATE_LIMITED', `${what} Retry in ${sec} seconds.`)
}

// deps: { resolve(raw, {ip}) -> {ok, principal}|{ok:false,status,code,error,keyId?,companyId?},
//         recordUse(keyId, companyId, {route, denied}), keyLimiter, companyLimiter?, ipLimiter, ipOf(req) }
export function makeRequireApiKey({ resolve, recordUse = () => {}, keyLimiter, companyLimiter = null, ipLimiter, ipOf }) {
  return function requireApiKey(scope) {
    // A route declaring an unknown scope is a programming error: fail at boot.
    if (!isScope(scope)) throw new Error(`[api_key_auth] unknown scope "${scope}"`)
    return function apiKeyGate(req, res, next) {
      res.setHeader('Cache-Control', 'no-store')
      const route = `${req.method} ${(req.route && req.route.path) || req.path}`
      const raw = bearerFrom(req.headers && req.headers.authorization)
      if (!raw) {
        res.setHeader('WWW-Authenticate', 'Bearer realm="workcopilot"')
        return sendApiError(res, 401, 'MISSING_KEY', 'Send your API key in the Authorization header: Bearer <key>.')
      }
      const ip = ipOf(req) || 'unknown'
      const netKey = `net:${networkKey(ip)}`
      // A VALID key always gets through (verifying costs one HMAC): refusing a whole
      // network first would let anyone behind the same NAT lock a customer out with
      // a few bad requests. Failures are what the network budget limits.
      const r = resolve(raw, { ip })
      if (!r || !r.ok) {
        const g = ipLimiter.take(netKey)
        if (!g.ok) return tooMany(res, g.retryAfterSec, 'Too many failed API key attempts from this network.')
        if (r && r.keyId) recordUse(r.keyId, r.companyId, { route, denied: true })
        if (r && r.status === 401) res.setHeader('WWW-Authenticate', 'Bearer realm="workcopilot", error="invalid_token"')
        return sendApiError(res, (r && r.status) || 401, (r && r.code) || 'INVALID_KEY', (r && r.error) || 'The API key is not valid.')
      }
      const p = r.principal
      const lim = keyLimiter.take(`key:${p.keyId}`)
      res.setHeader('X-RateLimit-Limit', String(lim.limit))
      res.setHeader('X-RateLimit-Remaining', String(lim.remaining))
      if (!lim.ok) {
        recordUse(p.keyId, p.companyId, { route, denied: true })
        return tooMany(res, lim.retryAfterSec, 'Rate limit reached for this key.')
      }
      if (companyLimiter) {
        const cl = companyLimiter.take(`co:${p.companyId}`)
        if (!cl.ok) {
          recordUse(p.keyId, p.companyId, { route, denied: true })
          return tooMany(res, cl.retryAfterSec, 'Rate limit reached for your company across all of its keys.')
        }
      }
      if (!p.scopes.includes(scope)) {
        recordUse(p.keyId, p.companyId, { route, denied: true })
        return sendApiError(res, 403, 'INSUFFICIENT_SCOPE', `This key does not have the "${scope}" scope. Ask your company admin to create a key with it.`)
      }
      recordUse(p.keyId, p.companyId, { route, denied: false })
      req.apiPrincipal = Object.freeze({ kind: 'api_key', keyId: p.keyId, companyId: p.companyId, scopes: Object.freeze([...p.scopes]) })
      next()
    }
  }
}

export default { makeRequireApiKey }
