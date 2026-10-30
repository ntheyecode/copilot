// ===========================================================================
// WorkCoPilot company API keys: orchestration (create / list / rotate / revoke /
// resolve) over the pure rules in api_key_rules.js. Created with the store's
// context (never imports the store, no circular import), exactly like the
// workflows and incidents modules; the store stays the single owner of db and
// persistence and re-exports this API.
//
// Who: only a company admin of the key's own company manages keys (enforced
// HERE, not only in the route). On the hosted service, creating or rotating a
// key needs an MFA step-up when the admin has MFA enrolled (the shared policy in
// mfa_step_up.js). Every create, rotate and revoke is audited; every use is
// aggregated per key per hour (one row, never one row per call).
//
// What a key is: a NON-HUMAN principal bound to one company with exactly its
// scopes. resolveApiKey returns { companyId, keyId, scopes } and never a user.
//
// ctx: { db, persist, persistSoon, httpErr, getUser, company(cid), pepper()->Buffer,
//        stepUp: { stepUpNeeded(user), assertStepUp(user, token, opts) },
//        audit({ userId, companyId, action, reason, detail }), clock? }
// ===========================================================================
import * as R from './api_key_rules.js'
import { normalizeScopes } from './api_scopes.js'

const USAGE_ROWS_MAX = 50000         // hourly usage rows kept platform-wide
const USAGE_ROWS_PER_COMPANY = 2000  // per company, so one busy tenant never evicts another's history
const LAST_USED_WRITE_MS = 60 * 1000 // lastUsedAt is persisted at most once a minute per key

export function createApiKeys(ctx) {
  const { persist, httpErr, getUser } = ctx
  const persistSoon = ctx.persistSoon || persist
  const clock = ctx.clock || Date.now
  const db = () => {
    const d = ctx.db()
    if (!Array.isArray(d.apiKeys)) d.apiKeys = []
    if (!Array.isArray(d.apiKeyUsage)) d.apiKeyUsage = []
    return d
  }
  const all = () => db().apiKeys
  const nameOf = (uid) => { const u = getUser(uid); return u ? (u.name || u.username || '') : '' }
  const err = (status, message, code) => { const e = httpErr(status, message); e.code = code; return e }

  function adminOf(userId, companyId) {
    const u = getUser(userId)
    if (!u || !u.companyId || u.companyRole !== 'company_admin' || (companyId && String(u.companyId) !== String(companyId))) {
      throw err(403, 'Only a company admin can manage API keys.', 'FORBIDDEN')
    }
    return u
  }
  function find(companyId, keyId) {
    const k = all().find((x) => x.id === String(keyId || '') && String(x.companyId) === String(companyId))
    if (!k) throw err(404, 'API key not found.', 'NOT_FOUND')
    return k
  }
  const pub = (k) => R.publicKey(k, clock(), nameOf)

  function stepUpRequired(userId) { return !!ctx.stepUp.stepUpNeeded(getUser(userId)) }

  function listApiKeys(userId) {
    const u = adminOf(userId)
    return all().filter((k) => String(k.companyId) === String(u.companyId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(pub)
  }

  // Build + store a new key record. Returns { rec, secret }. The plaintext secret
  // exists only in this return value; it is never stored or logged.
  function mint(companyId, userId, { name, scopes, expiresAt, ttlDays, ipAllowlist, rotatedFromId = null }) {
    let id = R.newKeyId()
    while (all().some((k) => k.id === id)) id = R.newKeyId()
    const secret = R.newSecret()
    const salt = R.newSalt()
    const rec = {
      id, companyId, name, scopes, hashAlg: R.HASH_ALG, salt,
      hash: R.hashSecret(ctx.pepper(), id, salt, secret), last4: secret.slice(-4),
      createdAt: new Date(clock()).toISOString(), createdBy: userId,
      lastUsedAt: null, expiresAt, ttlDays, ipAllowlist, revokedAt: null, revokedBy: null,
      rotatedFromId, rotatedToId: null,
    }
    all().push(rec)
    return { rec, secret: R.formatKey(id, secret) }
  }

  function createApiKey(userId, { name, scopes, expiresInDays, ipAllowlist, mfaToken } = {}) {
    const u = adminOf(userId)
    ctx.stepUp.assertStepUp(u, mfaToken, { message: 'Enter a current authenticator code to create an API key.' })
    const n = R.validateName(name)
    const sc = normalizeScopes(scopes)
    if (!sc.ok) throw err(400, sc.unknown.length ? `Unknown scope: ${sc.unknown.join(', ')}.` : 'Choose at least one scope.', 'BAD_SCOPES')
    const { expiresAt, ttlDays } = R.expiryFrom(expiresInDays, clock())
    const ips = R.normalizeIpAllowlist(ipAllowlist)
    const active = all().filter((k) => String(k.companyId) === String(u.companyId) && R.keyStatus(k, clock()) === 'active').length
    if (active >= R.MAX_ACTIVE_KEYS) throw err(409, `Your company has ${R.MAX_ACTIVE_KEYS} active keys. Revoke one you no longer use first.`, 'LIMIT_REACHED')
    const { rec, secret } = mint(u.companyId, u.id, { name: n, scopes: sc.scopes, expiresAt, ttlDays, ipAllowlist: ips })
    persist()
    ctx.audit({ userId: u.id, companyId: u.companyId, action: 'api_key_create', reason: 'company API key created', detail: `${R.displayPrefix(rec.id)} "${n}" scopes ${sc.scopes.join(' ')}` })
    return { key: pub(rec), secret }
  }

  function rotateApiKey(userId, keyId, { mfaToken, graceMinutes } = {}) {
    const u = adminOf(userId)
    ctx.stepUp.assertStepUp(u, mfaToken, { message: 'Enter a current authenticator code to rotate an API key.' })
    const old = find(u.companyId, keyId)
    if (R.keyStatus(old, clock()) !== 'active') throw err(409, 'Only an active key can be rotated. Create a new key instead.', 'KEY_REVOKED')
    const grace = R.rotateGrace(graceMinutes)
    // With a grace window both keys are live for a while: the cap still holds.
    if (grace > 0) {
      const active = all().filter((k) => String(k.companyId) === String(u.companyId) && R.keyStatus(k, clock()) === 'active').length
      if (active >= R.MAX_ACTIVE_KEYS) throw err(409, `Your company has ${R.MAX_ACTIVE_KEYS} active keys. Rotate without a grace period, or revoke a key first.`, 'LIMIT_REACHED')
    }
    const expiresAt = old.ttlDays ? new Date(clock() + old.ttlDays * 86400000).toISOString() : null
    const { rec, secret } = mint(u.companyId, u.id, { name: old.name, scopes: [...old.scopes], expiresAt, ttlDays: old.ttlDays || null, ipAllowlist: [...(old.ipAllowlist || [])], rotatedFromId: old.id })
    old.rotatedToId = rec.id
    if (grace > 0) {
      // The old key keeps working for the grace window only, so a deploy can swap
      // to the new key without downtime. It can never outlive its own expiry.
      const until = clock() + grace * 60000
      if (!old.expiresAt || Date.parse(old.expiresAt) > until) old.expiresAt = new Date(until).toISOString()
    } else {
      old.revokedAt = new Date(clock()).toISOString(); old.revokedBy = u.id
    }
    persist()
    ctx.audit({ userId: u.id, companyId: u.companyId, action: 'api_key_rotate', reason: 'company API key rotated', detail: `${R.displayPrefix(old.id)} -> ${R.displayPrefix(rec.id)}${grace ? ` (old key valid ${grace} min)` : ''}` })
    return { key: pub(rec), secret, previous: pub(old) }
  }

  function revokeApiKey(userId, keyId) {
    const u = adminOf(userId)
    const k = find(u.companyId, keyId)
    if (!k.revokedAt) {
      // The record (and its hash) stays, so a leaked copy keeps failing as revoked.
      k.revokedAt = new Date(clock()).toISOString(); k.revokedBy = u.id
      persist()
      ctx.audit({ userId: u.id, companyId: u.companyId, action: 'api_key_revoke', reason: 'company API key revoked', detail: `${R.displayPrefix(k.id)} "${k.name}"` })
    }
    return { key: pub(k) }
  }

  // Resolve a presented key to its company principal. Never throws for a bad key:
  // returns { ok:false, status, code, error } so the middleware answers uniformly.
  // Revoked / expired are only reported once the secret itself matched, so a
  // guess learns nothing about which ids exist.
  function resolveApiKey(raw, { ip } = {}) {
    const bad = { ok: false, status: 401, code: 'INVALID_KEY', error: 'The API key is not valid.' }
    const p = R.parseKey(raw)
    if (!p) return bad
    const k = all().find((x) => x.id === p.id)
    if (!k || k.hashAlg !== R.HASH_ALG) return bad
    if (!R.hashesEqual(R.hashSecret(ctx.pepper(), k.id, k.salt, p.secret), k.hash)) return bad
    // From here the secret matched a real key: failures carry the key id so the use
    // audit records them (a replayed revoked key leaves a trace).
    const who = { keyId: k.id, companyId: k.companyId }
    const st = R.keyStatus(k, clock())
    if (st === 'revoked') return { ok: false, status: 401, code: 'KEY_REVOKED', error: 'This API key was revoked. Ask your company admin for a new one.', ...who }
    if (st === 'expired') return { ok: false, status: 401, code: 'KEY_EXPIRED', error: 'This API key has expired. Ask your company admin to rotate it.', ...who }
    const co = ctx.company(k.companyId)
    if (!co) return bad
    if (co.disabled) return { ok: false, status: 403, code: 'COMPANY_DISABLED', error: 'This company account is disabled.', ...who }
    if (!R.ipAllowed(k.ipAllowlist, ip)) return { ok: false, status: 403, code: 'IP_NOT_ALLOWED', error: 'Requests from this address are not allowed for this key.', ...who }
    const t = clock()
    if (!k.lastUsedAt || t - Date.parse(k.lastUsedAt) >= LAST_USED_WRITE_MS) { k.lastUsedAt = new Date(t).toISOString(); persistSoon() }
    return { ok: true, principal: { kind: 'api_key', keyId: k.id, companyId: k.companyId, scopes: [...k.scopes] } }
  }

  // Aggregated use audit: one row per key per UTC hour with a request count, a
  // denied count and per-route counts. Bounded platform-wide.
  function recordApiKeyUse(keyId, companyId, { route = '', denied = false } = {}) {
    const hour = new Date(clock()).toISOString().slice(0, 13)
    const rows = db().apiKeyUsage
    let row = null
    for (let i = rows.length - 1; i >= 0 && i >= rows.length - 200; i--) {
      if (rows[i].keyId === keyId && rows[i].hour === hour) { row = rows[i]; break }
    }
    if (!row) {
      row = { keyId, companyId, hour, count: 0, denied: 0, routes: {} }
      rows.push(row)
      const mine = rows.filter((r) => String(r.companyId) === String(companyId))
      if (mine.length > USAGE_ROWS_PER_COMPANY) {
        const drop = new Set(mine.slice(0, mine.length - USAGE_ROWS_PER_COMPANY))
        db().apiKeyUsage = rows.filter((r) => !drop.has(r))
      } else if (rows.length > USAGE_ROWS_MAX) rows.splice(0, rows.length - USAGE_ROWS_MAX)
    }
    row.count += 1
    if (denied) row.denied += 1
    const r = String(route).slice(0, 80)
    if (r) row.routes[r] = (row.routes[r] || 0) + 1
    persistSoon()
  }

  // Is this key still live? (Launch links made by a key stop working once it is revoked.)
  function isActive(keyId) {
    const k = all().find((x) => x.id === keyId)
    return !!k && R.keyStatus(k, clock()) === 'active'
  }

  function listApiKeyUsage(userId, keyId) {
    const u = adminOf(userId)
    const k = find(u.companyId, keyId)
    return db().apiKeyUsage.filter((r) => r.keyId === k.id).slice(-168).reverse()
      .map((r) => ({ hour: `${r.hour}:00:00Z`, count: r.count, denied: r.denied, routes: { ...r.routes } }))
  }

  // Company deletion: drop its keys and usage rows (part of the purge contract).
  function purgeCompanyApiKeys(companyId) {
    const d = db()
    const before = d.apiKeys.length
    d.apiKeys = d.apiKeys.filter((k) => String(k.companyId) !== String(companyId))
    d.apiKeyUsage = d.apiKeyUsage.filter((r) => String(r.companyId) !== String(companyId))
    if (d.apiKeys.length !== before) persist()
    return before - d.apiKeys.length
  }

  return { isActive, stepUpRequired, listApiKeys, createApiKey, rotateApiKey, revokeApiKey, resolveApiKey, recordApiKeyUse, listApiKeyUsage, purgeCompanyApiKeys }
}

export default { createApiKeys }
