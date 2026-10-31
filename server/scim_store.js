// ===========================================================================
// SCIM 2.0 provisioning: orchestration over the pure rules in scim_rules.js.
// ===========================================================================
// A company's identity provider (Okta, Microsoft Entra ID, ...) creates,
// updates, deactivates and removes that company's accounts and groups with a
// company-scoped bearer token. Created by the store with its context (never
// imports the store); every account change goes through the store's own
// seat-gated, audited functions, so SCIM can never bypass a license cap.
//
// Tokens: created and revoked by a company admin in the company console. The
// plaintext exists only in the create response; the store keeps a peppered
// HMAC (the same scheme as the company API keys) and compares in constant time.
// A token only ever reaches its own company's accounts.
//
// Deactivation (active=false) turns the account off and signs it out
// everywhere at once (setUserDisabled bumps the session epoch). DELETE
// deprovisions the same way and hides the account from SCIM (a later GET is
// 404, RFC 7644 3.6); the person's work stays with the company until a company
// administrator removes the account in the console. Creating the same email
// again brings that account back.
//
// ctx: { db, persist, persistSoon, httpErr, company(cid), masterKey(),
//        createMember({ companyId, email, companyRole, tier, displayName }) -> raw user,
//        setDisabled(userId, disabled, { reason, by }), setSsoEmail(userId, email),
//        audit({ userId, companyId, action, reason, detail }), clock? }
// ===========================================================================
import crypto from 'node:crypto'
import * as R from './scim_rules.js'
import { derivePepper, hashSecret, newSalt, hashesEqual } from './api_key_rules.js'

const LAST_USED_WRITE_MS = 60 * 1000

export function createScimState(ctx) {
  const { persist, httpErr } = ctx
  const persistSoon = ctx.persistSoon || persist
  const clock = ctx.clock || Date.now
  const nowIso = () => new Date(clock()).toISOString()
  let pepper = null
  const pepperOf = () => (pepper || (pepper = derivePepper(ctx.masterKey())))
  const db = () => {
    const d = ctx.db()
    if (!Array.isArray(d.scimTokens)) d.scimTokens = []
    if (!Array.isArray(d.scimGroups)) d.scimGroups = []
    return d
  }
  const audit = (a) => { try { ctx.audit(a) } catch { /* audit never blocks */ } }

  // ---- tokens --------------------------------------------------------------
  const pubToken = (t) => ({
    id: t.id, prefix: `${R.TOKEN_PREFIX}${t.id}`, last4: t.last4, name: t.name || '', createdAt: t.createdAt,
    createdBy: t.createdBy || null, lastUsedAt: t.lastUsedAt || null, revokedAt: t.revokedAt || null,
    status: t.revokedAt ? 'revoked' : 'active',
  })
  function listScimTokens(companyId) {
    return db().scimTokens.filter((t) => t.companyId === companyId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(pubToken)
  }
  function createScimToken(companyId, userId, { name = '' } = {}) {
    if (!ctx.company(companyId)) throw httpErr(404, 'Company not found.')
    const active = db().scimTokens.filter((t) => t.companyId === companyId && !t.revokedAt).length
    if (active >= R.MAX_TOKENS) throw httpErr(409, `Your company has ${R.MAX_TOKENS} active provisioning tokens. Revoke one you no longer use first.`)
    let id = R.newTokenId()
    while (db().scimTokens.some((t) => t.id === id)) id = R.newTokenId()
    const secret = R.newTokenSecret()
    const salt = newSalt()
    const rec = {
      id, companyId, name: String(name || '').trim().slice(0, 80), salt,
      hash: hashSecret(pepperOf(), R.tokenHashInput(id), salt, secret), last4: secret.slice(-4),
      createdAt: nowIso(), createdBy: userId || null, lastUsedAt: null, revokedAt: null,
    }
    db().scimTokens.push(rec)
    persist()
    audit({ userId, companyId, action: 'scim_token_create', reason: 'SCIM provisioning token created', detail: `${R.TOKEN_PREFIX}${id}` })
    return { token: pubToken(rec), secret: R.formatToken(id, secret) }
  }
  function revokeScimToken(companyId, tokenId, userId) {
    const t = db().scimTokens.find((x) => x.id === String(tokenId || '') && x.companyId === companyId)
    if (!t) throw httpErr(404, 'Token not found.')
    if (!t.revokedAt) {
      t.revokedAt = nowIso()
      persist()
      audit({ userId, companyId, action: 'scim_token_revoke', reason: 'SCIM provisioning token revoked', detail: `${R.TOKEN_PREFIX}${t.id}` })
    }
    return { token: pubToken(t) }
  }
  // Bearer token -> { ok, companyId, tokenId } or { ok:false, status, detail }.
  // The secret is checked before anything about the token is revealed.
  function resolveScimToken(raw) {
    const bad = { ok: false, status: 401, detail: 'The provisioning token is not valid.' }
    const p = R.parseToken(raw)
    if (!p) return bad
    const t = db().scimTokens.find((x) => x.id === p.id)
    if (!t) { hashSecret(pepperOf(), R.tokenHashInput(p.id), 'x', p.secret); return bad }   // same work either way
    if (!hashesEqual(hashSecret(pepperOf(), R.tokenHashInput(t.id), t.salt, p.secret), t.hash)) return bad
    if (t.revokedAt) return { ok: false, status: 401, detail: 'This provisioning token was revoked.' }
    const co = ctx.company(t.companyId)
    if (!co) return bad
    if (co.disabled) return { ok: false, status: 403, detail: 'This company account is disabled.' }
    const n = clock()
    if (!t.lastUsedAt || n - Date.parse(t.lastUsedAt) >= LAST_USED_WRITE_MS) { t.lastUsedAt = new Date(n).toISOString(); persistSoon() }
    return { ok: true, companyId: t.companyId, tokenId: t.id }
  }

  // ---- users -----------------------------------------------------------------
  const companyUsers = (cid) => (db().users || []).filter((u) => u.companyId === cid && !u.scimDeletedAt)
  const userName = (u) => u.ssoEmail || u.email || u.username
  const findUser = (cid, id) => companyUsers(cid).find((u) => u.id === String(id || '')) || null
  const byEmail = (cid, mail, { includeDeleted = false } = {}) => (db().users || []).find((u) => u.companyId === cid && (includeDeleted || !u.scimDeletedAt) && [u.ssoEmail, u.email].some((e) => e && String(e).toLowerCase() === mail)) || null

  function userResource(u, base) {
    const given = u.scimGivenName || ''
    const family = u.scimFamilyName || ''
    const formatted = u.displayName || [given, family].filter(Boolean).join(' ')
    const mail = u.ssoEmail || u.email || ''
    return {
      schemas: [R.SCHEMA_USER], id: u.id, ...(u.scimExternalId ? { externalId: u.scimExternalId } : {}),
      userName: userName(u),
      name: { ...(formatted ? { formatted } : {}), ...(given ? { givenName: given } : {}), ...(family ? { familyName: family } : {}) },
      displayName: formatted || userName(u),
      emails: mail ? [{ value: mail, type: 'work', primary: true }] : [],
      active: !u.disabled,
      meta: { resourceType: 'User', created: u.createdAt || null, lastModified: u.scimUpdatedAt || u.createdAt || null, location: `${base}/Users/${u.id}` },
    }
  }
  const ok = (status, body) => ({ status, body })
  const fromErr = (e) => {
    if (e && e.scim) return e.scim
    const s = (e && e.status) || 500
    return R.scimError(s, (e && e.message) || 'The request could not be completed.', s === 409 ? 'uniqueness' : null)
  }
  const wrapOp = (fn) => (...args) => { try { return fn(...args) } catch (e) { return fromErr(e) } }

  function applyNames(u, { displayName, givenName, familyName, externalId }) {
    if (givenName !== undefined) u.scimGivenName = String(givenName || '').slice(0, 80)
    if (familyName !== undefined) u.scimFamilyName = String(familyName || '').slice(0, 80)
    if (displayName !== undefined && displayName !== '') u.displayName = String(displayName).slice(0, 80)
    else if ((givenName !== undefined || familyName !== undefined) && !displayName) {
      const n = [u.scimGivenName, u.scimFamilyName].filter(Boolean).join(' ')
      if (n) u.displayName = n.slice(0, 80)
    }
    if (externalId !== undefined) u.scimExternalId = String(externalId || '').slice(0, 256) || null
  }
  function setActive(cid, u, active, tokenId) {
    if (active === undefined || !!u.disabled === !active) return
    ctx.setDisabled(u.id, !active, { reason: active ? 'Reactivated by the identity provider (SCIM)' : 'Deactivated by the identity provider (SCIM)', by: `scim:${tokenId}` })
  }
  function changeEmail(cid, u, email) {
    const mail = String(email || '').trim().toLowerCase()
    if (!mail || mail === String(u.ssoEmail || '').toLowerCase()) return
    const other = byEmail(cid, mail, { includeDeleted: true })
    if (other && other.id !== u.id) throw Object.assign(new Error('dup'), { scim: R.scimError(409, 'Another account in this company already uses that email.', 'uniqueness') })
    ctx.setSsoEmail(u.id, mail)
  }

  const scimUsers = {
    list: wrapOp((cid, query, base) => {
      const f = R.parseFilter(query && query.filter, ['username', 'externalid', 'id', 'emails.value'])
      let rows = companyUsers(cid)
      if (f) {
        const v = f.value.toLowerCase()
        rows = rows.filter((u) => {
          if (f.attr === 'username') return String(userName(u)).toLowerCase() === v
          if (f.attr === 'externalid') return u.scimExternalId === f.value
          if (f.attr === 'id') return u.id === f.value
          return [u.ssoEmail, u.email].some((e) => e && String(e).toLowerCase() === v)
        })
      }
      rows = rows.slice().sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.id).localeCompare(String(b.id)))
      const { start, count } = R.page(query)
      const pageRows = rows.slice(start - 1, start - 1 + count)
      return ok(200, R.listResponse(pageRows.map((u) => userResource(u, base)), rows.length, start))
    }),
    get: wrapOp((cid, id, base) => {
      const u = findUser(cid, id)
      return u ? ok(200, userResource(u, base)) : R.scimError(404, 'User not found.')
    }),
    create: wrapOp((cid, body, base, tokenId) => {
      const b = body || {}
      const mail = R.emailOf(b)
      if (!mail) return R.scimError(400, 'userName or a primary email must be an email address.', 'invalidValue')
      const active = R.toBool(b.active)
      const names = { displayName: R.displayNameOf(b), givenName: b.name && b.name.givenName, familyName: b.name && b.name.familyName, externalId: b.externalId }
      const existing = byEmail(cid, mail, { includeDeleted: true })
      if (existing && !existing.scimDeletedAt) return R.scimError(409, 'A user with this userName already exists in this company.', 'uniqueness')
      let u
      if (existing) {
        // A deprovisioned account comes back (its work was kept).
        u = existing
        u.scimDeletedAt = null
      } else {
        u = ctx.createMember({ companyId: cid, email: mail, companyRole: 'member', tier: 'basic', displayName: names.displayName || null })
      }
      u.scimManaged = true
      applyNames(u, names)
      u.scimUpdatedAt = nowIso()
      persist()
      setActive(cid, u, active === undefined ? true : active, tokenId)
      audit({ userId: null, companyId: cid, action: 'scim_user_create', reason: 'provisioned by the identity provider', detail: `${mail} (token ${tokenId})` })
      return ok(201, userResource(u, base))
    }),
    replace: wrapOp((cid, id, body, base, tokenId) => {
      const u = findUser(cid, id)
      if (!u) return R.scimError(404, 'User not found.')
      const b = body || {}
      const mail = R.emailOf(b)
      if (mail) changeEmail(cid, u, mail)
      applyNames(u, { displayName: R.displayNameOf(b), givenName: (b.name && b.name.givenName) || '', familyName: (b.name && b.name.familyName) || '', externalId: b.externalId != null ? b.externalId : u.scimExternalId })
      u.scimManaged = true
      u.scimUpdatedAt = nowIso()
      persist()
      const active = R.toBool(b.active)
      setActive(cid, u, active === undefined ? true : active, tokenId)
      audit({ userId: null, companyId: cid, action: 'scim_user_update', reason: 'updated by the identity provider', detail: `${userName(u)} (token ${tokenId})` })
      return ok(200, userResource(u, base))
    }),
    patch: wrapOp((cid, id, body, base, tokenId) => {
      const u = findUser(cid, id)
      if (!u) return R.scimError(404, 'User not found.')
      const ch = R.userPatchChanges(body)
      const mail = ch.email || (ch.userName && /@/.test(ch.userName) ? ch.userName.toLowerCase() : '')
      if (mail) changeEmail(cid, u, mail)
      applyNames(u, { displayName: ch.displayName, givenName: ch.givenName, familyName: ch.familyName, externalId: ch.externalId })
      u.scimUpdatedAt = nowIso()
      persist()
      setActive(cid, u, ch.active, tokenId)
      audit({ userId: null, companyId: cid, action: ch.active === false ? 'scim_user_deactivate' : 'scim_user_update', reason: ch.active === false ? 'deactivated by the identity provider' : 'updated by the identity provider', detail: `${userName(u)} (token ${tokenId})` })
      return ok(200, userResource(u, base))
    }),
    remove: wrapOp((cid, id, tokenId) => {
      const u = findUser(cid, id)
      if (!u) return R.scimError(404, 'User not found.')
      setActive(cid, u, false, tokenId)
      u.scimDeletedAt = nowIso()
      for (const g of db().scimGroups) if (g.companyId === cid) g.members = (g.members || []).filter((m) => m !== u.id)
      persist()
      audit({ userId: null, companyId: cid, action: 'scim_user_deprovision', reason: 'removed by the identity provider', detail: `${userName(u)} (token ${tokenId}); account turned off, work kept` })
      return ok(204, null)
    }),
  }

  // ---- groups ------------------------------------------------------------------
  const groups = (cid) => db().scimGroups.filter((g) => g.companyId === cid)
  const findGroup = (cid, id) => groups(cid).find((g) => g.id === String(id || '')) || null
  function groupResource(g, base, { members = true } = {}) {
    const users = new Map(companyUsers(g.companyId).map((u) => [u.id, u]))
    return {
      schemas: [R.SCHEMA_GROUP], id: g.id, displayName: g.displayName, ...(g.externalId ? { externalId: g.externalId } : {}),
      ...(members ? { members: (g.members || []).filter((m) => users.has(m)).map((m) => ({ value: m, display: userName(users.get(m)), $ref: `${base}/Users/${m}` })) } : {}),
      meta: { resourceType: 'Group', created: g.createdAt, lastModified: g.updatedAt || g.createdAt, location: `${base}/Groups/${g.id}` },
    }
  }
  const memberIds = (cid, ids) => {
    const known = new Set(companyUsers(cid).map((u) => u.id))
    const bad = ids.filter((m) => !known.has(m))
    if (bad.length) throw Object.assign(new Error('bad member'), { scim: R.scimError(400, `Unknown member: ${bad[0]}.`, 'invalidValue') })
    return ids
  }
  const cleanName = (s) => {
    const v = String(s || '').trim().slice(0, 200)
    if (!v) throw Object.assign(new Error('name'), { scim: R.scimError(400, 'displayName is required.', 'invalidValue') })
    return v
  }
  const uniqueName = (cid, name, exceptId) => {
    if (groups(cid).some((g) => g.id !== exceptId && g.displayName.toLowerCase() === name.toLowerCase())) throw Object.assign(new Error('dup'), { scim: R.scimError(409, 'A group with this displayName already exists.', 'uniqueness') })
  }

  const scimGroups = {
    list: wrapOp((cid, query, base) => {
      const f = R.parseFilter(query && query.filter, ['displayname', 'externalid', 'id'])
      let rows = groups(cid)
      if (f) rows = rows.filter((g) => (f.attr === 'displayname' ? g.displayName.toLowerCase() === f.value.toLowerCase() : f.attr === 'externalid' ? g.externalId === f.value : g.id === f.value))
      const { start, count } = R.page(query)
      const withMembers = !/\bmembers\b/i.test(String((query && query.excludedAttributes) || ''))
      return ok(200, R.listResponse(rows.slice(start - 1, start - 1 + count).map((g) => groupResource(g, base, { members: withMembers })), rows.length, start))
    }),
    get: wrapOp((cid, id, base, query) => {
      const g = findGroup(cid, id)
      if (!g) return R.scimError(404, 'Group not found.')
      return ok(200, groupResource(g, base, { members: !/\bmembers\b/i.test(String((query && query.excludedAttributes) || '')) }))
    }),
    create: wrapOp((cid, body, base, tokenId) => {
      const b = body || {}
      const name = cleanName(b.displayName)
      uniqueName(cid, name, null)
      if (groups(cid).length >= 1000) return R.scimError(409, 'This company has reached the group limit.')
      const g = { id: crypto.randomUUID(), companyId: cid, displayName: name, externalId: String(b.externalId || '').slice(0, 256) || null, members: [...new Set(memberIds(cid, (Array.isArray(b.members) ? b.members : []).map((m) => String((m && m.value) || '').trim()).filter(Boolean)))], createdAt: nowIso(), updatedAt: nowIso() }
      db().scimGroups.push(g)
      persist()
      audit({ userId: null, companyId: cid, action: 'scim_group_create', reason: 'group provisioned by the identity provider', detail: `${name} (token ${tokenId})` })
      return ok(201, groupResource(g, base))
    }),
    replace: wrapOp((cid, id, body, base, tokenId) => {
      const g = findGroup(cid, id)
      if (!g) return R.scimError(404, 'Group not found.')
      const b = body || {}
      const name = cleanName(b.displayName)
      uniqueName(cid, name, g.id)
      g.displayName = name
      if (b.externalId !== undefined) g.externalId = String(b.externalId || '').slice(0, 256) || null
      g.members = [...new Set(memberIds(cid, (Array.isArray(b.members) ? b.members : []).map((m) => String((m && m.value) || '').trim()).filter(Boolean)))]
      g.updatedAt = nowIso()
      persist()
      audit({ userId: null, companyId: cid, action: 'scim_group_update', reason: 'group updated by the identity provider', detail: `${name} (token ${tokenId})` })
      return ok(200, groupResource(g, base))
    }),
    patch: wrapOp((cid, id, body, base, tokenId) => {
      const g = findGroup(cid, id)
      if (!g) return R.scimError(404, 'Group not found.')
      const ch = R.groupPatchChanges(body)
      if (ch.displayName !== undefined) { const n = cleanName(ch.displayName); uniqueName(cid, n, g.id); g.displayName = n }
      if (ch.externalId !== undefined) g.externalId = ch.externalId || null
      let members = ch.replaceMembers ? memberIds(cid, ch.replaceMembers) : [...(g.members || [])]
      if (ch.add.length) members.push(...memberIds(cid, ch.add))
      if (ch.remove.length) { const rm = new Set(ch.remove); members = members.filter((m) => !rm.has(m)) }
      g.members = [...new Set(members)]
      g.updatedAt = nowIso()
      persist()
      audit({ userId: null, companyId: cid, action: 'scim_group_update', reason: 'group updated by the identity provider', detail: `${g.displayName} (token ${tokenId})` })
      // Entra and Okta accept 204 or 200 with the resource; 200 lets a caller confirm.
      return ok(200, groupResource(g, base))
    }),
    remove: wrapOp((cid, id, tokenId) => {
      const g = findGroup(cid, id)
      if (!g) return R.scimError(404, 'Group not found.')
      db().scimGroups = db().scimGroups.filter((x) => x !== g)
      persist()
      audit({ userId: null, companyId: cid, action: 'scim_group_delete', reason: 'group removed by the identity provider', detail: `${g.displayName} (token ${tokenId})` })
      return ok(204, null)
    }),
  }

  return { listScimTokens, createScimToken, revokeScimToken, resolveScimToken, scimUsers, scimGroups }
}

export default { createScimState }
