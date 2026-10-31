// ===========================================================================
// WorkCoPilot company API keys: PURE rules (no store, no I/O beyond crypto).
//
// Key shape: `wcp_live_<id>_<secret>`
//   id     = 16 lowercase hex chars (64 random bits). Public, identifies the
//            record so lookup is O(1) and never a scan-and-compare over hashes.
//   secret = 43 base64url chars (32 random bytes = 256 bits).
// The fixed-length hex id makes parsing unambiguous even though base64url can
// contain `_`.
//
// Hash construction (and why): HMAC-SHA256 keyed with a server PEPPER derived
// from the platform master key (HKDF), over `<id>.<salt>.<secret>` with a random
// per-key salt. The secret carries 256 bits of entropy, so a slow password KDF
// (scrypt/argon2) buys nothing against guessing and would add 50 to 200 ms of CPU
// to EVERY API call, which turns the auth path into a denial-of-service lever.
// The pepper means a leaked database alone cannot even be used to test a guess;
// the salt and id bind each hash to its own record. Comparison is constant time
// (crypto.timingSafeEqual over equal-length digests). This departs from the
// sketch in docs/company-brain.md section 11 (plain SHA-256) only by adding the
// pepper and salt: strictly stronger, same cost.
// ===========================================================================
import crypto from 'node:crypto'
import net from 'node:net'

export const KEY_PREFIX = 'wcp_live_'
export const KEY_RE = /^wcp_live_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/
export const HASH_ALG = 'hmac-sha256-v1'
export const MAX_NAME = 80
export const MAX_EXPIRY_DAYS = 730
export const MAX_IP_ENTRIES = 50
export const MAX_ROTATE_GRACE_MIN = 1440
export const MAX_ACTIVE_KEYS = 50

function err(status, message, code) { const e = new Error(message); e.status = status; e.code = code; return e }

export function newKeyId() { return crypto.randomBytes(8).toString('hex') }
export function newSecret() { return crypto.randomBytes(32).toString('base64url') }
export function newSalt() { return crypto.randomBytes(16).toString('base64url') }
export function formatKey(id, secret) { return `${KEY_PREFIX}${id}_${secret}` }
export function displayPrefix(id) { return `${KEY_PREFIX}${id}` }

// parseKey(raw) -> { id, secret } or null. Never throws.
export function parseKey(raw) {
  const m = KEY_RE.exec(String(raw || '').trim())
  return m ? { id: m[1], secret: m[2] } : null
}

// Read `Authorization: Bearer <key>` only. Keys are never accepted in a query
// string (they would land in proxy and access logs).
export function bearerFrom(headerValue) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(String(headerValue || ''))
  return m ? m[1] : null
}

// The pepper: 32 bytes derived from the platform master key, domain-separated so
// it can never collide with any other use of that key.
export function derivePepper(masterKey) {
  if (!masterKey || masterKey.length < 32) throw new Error('[api_key_rules] a 32-byte master key is required')
  return Buffer.from(crypto.hkdfSync('sha256', masterKey, Buffer.alloc(0), Buffer.from('workcopilot/api-key-hmac/v1'), 32))
}

export function hashSecret(pepper, id, salt, secret) {
  return crypto.createHmac('sha256', pepper).update(`${id}.${salt}.${secret}`).digest('base64url')
}

export function hashesEqual(a, b) {
  const x = Buffer.from(String(a || ''), 'base64url')
  const y = Buffer.from(String(b || ''), 'base64url')
  if (x.length !== 32 || y.length !== 32) return false
  return crypto.timingSafeEqual(x, y)
}

export function validateName(name) {
  const n = String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!n) throw err(400, 'Give the key a name so you can tell it apart later.', 'BAD_NAME')
  if (n.length > MAX_NAME) throw err(400, `Use a name of ${MAX_NAME} characters or fewer.`, 'BAD_NAME')
  return n
}

// expiresInDays: null/undefined/'' = never; otherwise an integer 1..730.
export function expiryFrom(expiresInDays, nowMs) {
  if (expiresInDays === null || expiresInDays === undefined || expiresInDays === '') return { expiresAt: null, ttlDays: null }
  const d = Number(expiresInDays)
  if (!Number.isInteger(d) || d < 1 || d > MAX_EXPIRY_DAYS) throw err(400, `Choose an expiry between 1 and ${MAX_EXPIRY_DAYS} days, or no expiry.`, 'BAD_EXPIRY')
  return { expiresAt: new Date(nowMs + d * 86400000).toISOString(), ttlDays: d }
}

// Strip an IPv4-mapped IPv6 prefix so `::ffff:10.0.0.1` matches a v4 rule.
export function normalizeIp(ip) {
  const s = String(ip || '').trim()
  const m = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(s)
  return m ? m[1] : s
}

// One entry: an IPv4/IPv6 address or CIDR. Returns the canonical string or
// throws BAD_IP. net.isIP is the stdlib authority for address syntax.
function parseIpEntry(raw) {
  const s = String(raw || '').trim()
  const [addr, bits, extra] = s.split('/')
  const a = normalizeIp(addr)
  const fam = net.isIP(a)
  if (!fam || extra !== undefined) throw err(400, `"${s.slice(0, 60)}" is not an IP address or CIDR range.`, 'BAD_IP')
  if (bits === undefined) return a
  const max = fam === 4 ? 32 : 128
  const b = Number(bits)
  if (!/^\d{1,3}$/.test(bits) || b < 0 || b > max) throw err(400, `"${s.slice(0, 60)}" has an invalid prefix length.`, 'BAD_IP')
  return `${a}/${b}`
}

// Accepts an array or a comma/newline separated string. Empty = any address.
export function normalizeIpAllowlist(list) {
  const arr = Array.isArray(list) ? list : String(list || '').split(/[\s,]+/)
  const out = []
  for (const raw of arr) {
    if (!String(raw || '').trim()) continue
    const v = parseIpEntry(raw)
    if (!out.includes(v)) out.push(v)
  }
  if (out.length > MAX_IP_ENTRIES) throw err(400, `Use at most ${MAX_IP_ENTRIES} allowlist entries.`, 'BAD_IP')
  return out
}

// Is `ip` allowed by `allowlist`? An empty list allows every address. Uses the
// stdlib net.BlockList for CIDR matching, one list per family: a BlockList checks
// IPv4 addresses against IPv4-mapped IPv6 ranges, so a v6 entry such as `::/0` in
// a shared list would admit every IPv4 caller.
export function ipAllowed(allowlist, ip) {
  if (!Array.isArray(allowlist) || !allowlist.length) return true
  const a = normalizeIp(ip)
  const fam = net.isIP(a)
  if (!fam) return false
  const bl = new net.BlockList()
  const type = fam === 4 ? 'ipv4' : 'ipv6'
  for (const e of allowlist) {
    const [addr, bits] = String(e).split('/')
    if (net.isIP(addr) !== fam) continue   // only this caller's own family
    if (bits === undefined) bl.addAddress(addr, type)
    else bl.addSubnet(addr, Number(bits), type)
  }
  return bl.check(a, type)
}

export function keyStatus(rec, nowMs) {
  if (!rec) return 'revoked'
  if (rec.revokedAt) return 'revoked'
  if (rec.expiresAt && Date.parse(rec.expiresAt) <= nowMs) return 'expired'
  return 'active'
}

export function rotateGrace(graceMinutes) {
  if (graceMinutes === null || graceMinutes === undefined || graceMinutes === '') return 0
  const g = Number(graceMinutes)
  if (!Number.isInteger(g) || g < 0 || g > MAX_ROTATE_GRACE_MIN) throw err(400, `Choose a grace period between 0 and ${MAX_ROTATE_GRACE_MIN} minutes.`, 'BAD_EXPIRY')
  return g
}

// The ONLY shape that leaves the server for a key record. No hash, no salt, no
// secret: those fields are dropped by construction (allowlist, not denylist).
export function publicKey(rec, nowMs, nameOf = () => '') {
  return {
    id: rec.id, name: rec.name, prefix: displayPrefix(rec.id), last4: rec.last4,
    scopes: [...(rec.scopes || [])], status: keyStatus(rec, nowMs),
    createdAt: rec.createdAt, createdBy: { id: rec.createdBy || null, name: rec.createdBy ? nameOf(rec.createdBy) : '' },
    lastUsedAt: rec.lastUsedAt || null, expiresAt: rec.expiresAt || null,
    ipAllowlist: [...(rec.ipAllowlist || [])], revokedAt: rec.revokedAt || null,
    rotatedFromId: rec.rotatedFromId || null, rotatedToId: rec.rotatedToId || null,
  }
}

export default {
  KEY_PREFIX, KEY_RE, HASH_ALG, MAX_NAME, MAX_EXPIRY_DAYS, MAX_IP_ENTRIES, MAX_ROTATE_GRACE_MIN, MAX_ACTIVE_KEYS,
  newKeyId, newSecret, newSalt, formatKey, displayPrefix, parseKey, bearerFrom, derivePepper, hashSecret, hashesEqual,
  validateName, expiryFrom, normalizeIp, normalizeIpAllowlist, ipAllowed, keyStatus, rotateGrace, publicKey,
}
