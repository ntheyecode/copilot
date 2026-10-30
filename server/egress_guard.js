// ===========================================================================
// WorkCoPilot outbound egress guard: the ONE place that decides whether the
// server may connect to a host a customer or a user supplied (SSRF defense).
//
// Two layers:
//   1. Lexical: the URL itself (scheme, no credentials, no IP literal, no
//      internal-looking name). isPublicHttpUrl is the check web learning has
//      always used, moved here unchanged so there is one copy.
//   2. Resolved: the addresses the name ACTUALLY resolves to. isPublicAddress
//      classifies every resolved address against the reserved ranges, and
//      guardedLookup is a drop-in `lookup` for http(s).request that refuses any
//      private answer at CONNECT time, so a DNS rebind between check and use
//      cannot reach an internal address (the socket only ever dials an address
//      this function approved).
// ===========================================================================
import net from 'node:net'
import dns from 'node:dns'

// ---- Layer 1: lexical --------------------------------------------------------
const INTERNAL_SUFFIX_RE = /(^|\.)(localhost|local|internal|intranet|corp|lan|home|test|localdomain|priv|private|example|invalid|arpa)$/

// Web learning (index.js) uses this exact rule: public http(s), no internal names,
// no IPv6 literal, no private IPv4 literal.
export function isPublicHttpUrl(u) {
  let url; try { url = new URL(u) } catch { return false }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const h = url.hostname.toLowerCase()
  if (!h.includes('.')) return false
  if (/(^|\.)(localhost|local|internal|intranet|corp|lan|home|test|localdomain|priv|private)$/.test(h)) return false
  if (h.includes(':')) return false // raw IPv6 literal
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const a = +m[1], b = +m[2]
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)) return false
  }
  return true
}

// Webhook endpoints are stricter: https only, a domain name (never an IP literal),
// no userinfo, port 443 or 8443, bounded length. Returns { ok, url, host, reason }.
export const WEBHOOK_PORTS = Object.freeze(['', '443', '8443'])
export function checkWebhookUrl(raw) {
  const s = String(raw == null ? '' : raw).trim()
  if (!s || s.length > 2048) return { ok: false, reason: 'Enter a full https URL of 2048 characters or fewer.' }
  let u; try { u = new URL(s) } catch { return { ok: false, reason: 'Enter a full https URL, for example https://hooks.example.com/workcopilot.' } }
  if (u.protocol !== 'https:') return { ok: false, reason: 'Webhook URLs must use https.' }
  if (u.username || u.password) return { ok: false, reason: 'Do not put a username or password in the URL. Verify deliveries with the signing secret instead.' }
  const h = u.hostname.toLowerCase().replace(/\.$/, '')
  if (net.isIP(h) || h.startsWith('[') || h.includes(':')) return { ok: false, reason: 'Use a domain name, not an IP address.' }
  if (!h.includes('.') || INTERNAL_SUFFIX_RE.test(h) || !/^[a-z0-9.-]+$/.test(h)) return { ok: false, reason: 'That host is not allowed. Use a public domain name.' }
  if (!WEBHOOK_PORTS.includes(u.port)) return { ok: false, reason: 'Use the standard https port (443) or 8443.' }
  u.hash = ''
  return { ok: true, url: u.toString(), host: h }
}

// ---- Layer 2: resolved addresses --------------------------------------------
// Reserved, private, loopback, link-local, multicast, documentation, benchmark,
// carrier-grade NAT and transition ranges. Any address inside one is refused.
const RESERVED_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]
const RESERVED_V6 = [
  ['::', 96] /* unspecified, loopback, IPv4-compatible (::a.b.c.d) */, ['::ffff:0:0', 96], ['::ffff:0:0:0', 96] /* SIIT */, ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64],
  ['2001::', 32], ['2001:2::', 48], ['2001:db8::', 32], ['2001:10::', 28], ['2001:20::', 28], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
]
// Separate lists per family: net.BlockList matches an IPv4 address against an
// IPv4-mapped IPv6 subnet (::ffff:0:0/96 would swallow every IPv4 address), so a
// v4 address is only ever checked against the v4 list, and a v6 one against v6.
const RESERVED4 = new net.BlockList()
const RESERVED6 = new net.BlockList()
for (const [a, b] of RESERVED_V4) RESERVED4.addSubnet(a, b, 'ipv4')
for (const [a, b] of RESERVED_V6) RESERVED6.addSubnet(a, b, 'ipv6')

export function isPublicAddress(ip) {
  const a = String(ip || '').trim()
  const fam = net.isIP(a)
  if (fam === 4) return !RESERVED4.check(a, 'ipv4')
  if (fam === 6) return !RESERVED6.check(a, 'ipv6')
  return false
}

function refused(host) {
  const e = new Error(`Refusing to connect: ${host} resolves to a private or reserved address.`)
  e.code = 'EGRESS_PRIVATE_ADDRESS'
  return e
}

// Default resolver: c-ares (dns.Resolver) with a short timeout and bounded tries,
// NOT dns.lookup. dns.lookup runs getaddrinfo on libuv's small shared thread pool,
// so a customer-chosen nameserver that never answers could starve fs, crypto and
// zlib for the whole server. c-ares is asynchronous and gives up on its own.
const RESOLVE_TIMEOUT_MS = 3000
export function resolveBoth(host, cb) {
  const r = new dns.Resolver({ timeout: RESOLVE_TIMEOUT_MS, tries: 2 })
  let pending = 2
  const out = []
  let lastErr = null
  const done = () => {
    if (--pending) return
    if (out.length) cb(null, out)
    else cb(lastErr || Object.assign(new Error(`No address for ${host}.`), { code: 'ENOTFOUND' }))
  }
  r.resolve4(host, (e, a) => { if (e) lastErr = e; else for (const x of a) out.push({ address: x, family: 4 }); done() })
  r.resolve6(host, (e, a) => { if (e) lastErr = lastErr || e; else for (const x of a) out.push({ address: x, family: 6 }); done() })
}

// makeGuardedLookup({ resolve? }) -> a `lookup(hostname, options, cb)` function for
// http(s).request. Every address the name resolves to must be public; one private
// answer fails the whole lookup (a mixed answer is a rebinding signal).
export function makeGuardedLookup({ resolve = resolveBoth } = {}) {
  return function guardedLookup(hostname, options, cb) {
    if (typeof options === 'function') { cb = options; options = {} }
    resolve(hostname, (e, addrs) => {
      if (e) return cb(e)
      const list = (Array.isArray(addrs) ? addrs : [addrs]).filter(Boolean).map((x) => (typeof x === 'string' ? { address: x, family: net.isIP(x) } : x))
      if (!list.length) return cb(Object.assign(new Error(`No address for ${hostname}.`), { code: 'ENOTFOUND' }))
      if (list.some((x) => !isPublicAddress(x.address))) return cb(refused(hostname))
      const fam = options && options.family ? Number(options.family) : 0
      const pool = fam ? list.filter((x) => x.family === fam) : list
      if (!pool.length) return cb(Object.assign(new Error(`No IPv${fam} address for ${hostname}.`), { code: 'ENOTFOUND' }))
      if (options && options.all) return cb(null, pool.map((x) => ({ address: x.address, family: x.family })))
      cb(null, pool[0].address, pool[0].family)
    })
  }
}

// Registration-time check: resolve once and refuse a private answer early, so the
// admin sees the problem when saving rather than on the first delivery.
export function assertResolvesPublic(host, { resolve } = {}) {
  const lookup = makeGuardedLookup(resolve ? { resolve } : {})
  return new Promise((ok, fail) => lookup(host, { all: true }, (e) => (e ? fail(e) : ok(true))))
}

export default { isPublicHttpUrl, checkWebhookUrl, isPublicAddress, makeGuardedLookup, assertResolvesPublic, WEBHOOK_PORTS }
