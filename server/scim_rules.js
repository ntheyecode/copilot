// ---------------------------------------------------------------------------
// SCIM 2.0 (RFC 7643 / 7644): the PURE rules. No store, no Express.
// ---------------------------------------------------------------------------
// The subset Okta and Microsoft Entra ID use for workforce provisioning:
//   * Users:  create, read, list with `filter=userName eq "..."` (also
//             externalId / id / emails.value), replace (PUT), PATCH (including
//             active=false to deactivate), delete.
//   * Groups: create, read, list with `filter=displayName eq "..."`, replace,
//             PATCH members add / remove and displayName, delete.
// Both IdPs differ in small ways this module absorbs once:
//   * Entra sends op names capitalized ("Replace") and booleans as strings
//     ("False"); Okta sends `{ op:'replace', value:{ active:false } }` with no
//     path. Both are normalized here.
//   * Entra removes a member with path `members[value eq "id"]`; Okta sends
//     `op:'remove', path:'members', value:[{ value:'id' }]`.
// Tokens: `wcp_scim_<16 hex id>_<43 char secret>`, hashed with the same
// peppered HMAC as the company API keys (api_key_rules.js), compared in
// constant time.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto'

export const SCHEMA_USER = 'urn:ietf:params:scim:schemas:core:2.0:User'
export const SCHEMA_GROUP = 'urn:ietf:params:scim:schemas:core:2.0:Group'
export const SCHEMA_LIST = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
export const SCHEMA_PATCH = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'
export const SCHEMA_ERROR = 'urn:ietf:params:scim:api:messages:2.0:Error'
export const SCHEMA_ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'

export const TOKEN_PREFIX = 'wcp_scim_'
export const TOKEN_RE = /^wcp_scim_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/
export const MAX_TOKENS = 5
export const MAX_PAGE = 200

export function newTokenId() { return crypto.randomBytes(8).toString('hex') }
export function newTokenSecret() { return crypto.randomBytes(32).toString('base64url') }
export function formatToken(id, secret) { return `${TOKEN_PREFIX}${id}_${secret}` }
export function parseToken(raw) {
  const m = TOKEN_RE.exec(String(raw || '').trim())
  return m ? { id: m[1], secret: m[2] } : null
}
// The hashed value is bound to the SCIM namespace so it can never equal an API
// key hash computed from the same pepper.
export function tokenHashInput(id) { return `scim:${id}` }

// A SCIM error body (RFC 7644 3.12).
export function scimError(status, detail, scimType = null) {
  return { status, body: { schemas: [SCHEMA_ERROR], status: String(status), ...(scimType ? { scimType } : {}), detail } }
}

const FILTER_RE = /^\s*([A-Za-z][A-Za-z0-9._:\[\]" ]*?)\s+eq\s+"((?:[^"\\]|\\.)*)"\s*$/i
// `attr eq "value"` -> { attr (lower case), value }. Anything else -> throws a
// 400 invalidFilter (we never guess a broader match).
export function parseFilter(filter, allowed) {
  if (filter == null || String(filter).trim() === '') return null
  const m = FILTER_RE.exec(String(filter))
  if (!m) throw Object.assign(new Error('Only "<attribute> eq \\"value\\"" filters are supported.'), { scim: scimError(400, 'Only "<attribute> eq \\"value\\"" filters are supported.', 'invalidFilter') })
  let attr = m[1].trim().toLowerCase().replace(/^urn:ietf:params:scim:schemas:core:2\.0:user:/, '')
  if (attr === 'emails[type eq "work"].value' || attr === 'emails.value' || attr === 'emails') attr = 'emails.value'
  if (!allowed.includes(attr)) throw Object.assign(new Error('Unsupported filter attribute.'), { scim: scimError(400, `Filtering on "${m[1].trim()}" is not supported.`, 'invalidFilter') })
  return { attr, value: m[2].replace(/\\(.)/g, '$1') }
}

// startIndex is 1-based (RFC 7644 3.4.2.4); count is capped.
export function page(query) {
  const start = Math.max(1, parseInt(query && query.startIndex, 10) || 1)
  const raw = parseInt(query && query.count, 10)
  const count = Number.isFinite(raw) ? Math.max(0, Math.min(MAX_PAGE, raw)) : MAX_PAGE
  return { start, count }
}

export function listResponse(resources, total, start) {
  return { schemas: [SCHEMA_LIST], totalResults: total, startIndex: start, itemsPerPage: resources.length, Resources: resources }
}

// "True"/"False"/true/false -> boolean; anything else -> undefined.
export function toBool(v) {
  if (typeof v === 'boolean') return v
  const s = String(v == null ? '' : v).trim().toLowerCase()
  if (s === 'true') return true
  if (s === 'false') return false
  return undefined
}

const looksEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || ''))

// The work email a SCIM user resource names: the primary (or work) email, else
// a userName that is an email address.
export function emailOf(res) {
  const r = res || {}
  const emails = Array.isArray(r.emails) ? r.emails : []
  const pick = emails.find((e) => e && toBool(e.primary) === true) || emails.find((e) => e && String(e.type || '').toLowerCase() === 'work') || emails[0]
  const fromEmails = pick && pick.value ? String(pick.value).trim().toLowerCase() : ''
  if (looksEmail(fromEmails)) return fromEmails
  const u = String(r.userName || '').trim().toLowerCase()
  return looksEmail(u) ? u : ''
}

export function displayNameOf(res) {
  const r = res || {}
  const dn = String(r.displayName || '').trim()
  if (dn) return dn.slice(0, 80)
  const n = r.name || {}
  const f = String(n.formatted || '').trim()
  if (f) return f.slice(0, 80)
  return [n.givenName, n.familyName].map((x) => String(x || '').trim()).filter(Boolean).join(' ').slice(0, 80)
}

// A user PATCH (RFC 7644 3.5.2) -> a flat change set the store applies:
// { active?, userName?, email?, displayName?, givenName?, familyName?, externalId?,
//   groups?: { add:[ids], remove:[ids], replace?:[ids] } }
export function userPatchChanges(body) {
  const ops = Array.isArray(body && body.Operations) ? body.Operations : null
  if (!ops) throw Object.assign(new Error('bad patch'), { scim: scimError(400, 'A PATCH needs an Operations list.', 'invalidSyntax') })
  const out = {}
  const setAttr = (path, value) => {
    const p = String(path || '').trim().toLowerCase()
    if (p === 'active') { const b = toBool(value); if (b === undefined) throw Object.assign(new Error('bad'), { scim: scimError(400, 'active must be true or false.', 'invalidValue') }); out.active = b; return }
    if (p === 'username') { out.userName = String(value || '').trim(); return }
    if (p === 'displayname') { out.displayName = String(value || '').trim(); return }
    if (p === 'externalid') { out.externalId = String(value || '').trim().slice(0, 256); return }
    if (p === 'name.givenname') { out.givenName = String(value || '').trim(); return }
    if (p === 'name.familyname') { out.familyName = String(value || '').trim(); return }
    if (p === 'name.formatted') { out.displayName = String(value || '').trim(); return }
    if (p === 'name' && value && typeof value === 'object') { if (value.givenName != null) out.givenName = String(value.givenName).trim(); if (value.familyName != null) out.familyName = String(value.familyName).trim(); if (value.formatted) out.displayName = String(value.formatted).trim(); return }
    if (p === 'emails' || p === 'emails[type eq "work"].value' || p === 'emails[primary eq true].value') {
      const v = Array.isArray(value) ? emailOf({ emails: value }) : String(value || '').trim().toLowerCase()
      if (v) out.email = v
      return
    }
    // Attributes we do not store (title, phone numbers, the enterprise
    // extension, locale...) are accepted and ignored, as RFC 7644 allows for
    // attributes the service provider does not support.
  }
  // The user's `groups` (membership written from the user side): ids collected
  // here, applied by the store to the company's own groups, which then decide
  // roles where a group is mapped (scim_role_rules.js). RFC 7643 lists `groups`
  // as read-only on User; a client that writes it anyway gets the change applied
  // through the Group resources, never a silent drop.
  const groupIds = (v) => (Array.isArray(v) ? v : (v ? [v] : [])).map((m) => String((m && m.value) || m || '').trim()).filter(Boolean)
  const groupOp = (op, path, value) => {
    const filter = /^groups\[\s*value\s+eq\s+"([^"]+)"\s*\]$/i.exec(path)
    if (!out.groups) out.groups = { add: [], remove: [] }
    if (op === 'remove' && filter) { out.groups.remove.push(filter[1]); return true }
    if (path.toLowerCase() !== 'groups') return false
    if (op === 'add') out.groups.add.push(...groupIds(value))
    else if (op === 'remove') { if (value == null) out.groups.replace = []; else out.groups.remove.push(...groupIds(value)) }
    else out.groups.replace = groupIds(value)
    return true
  }
  for (const raw of ops) {
    const op = String((raw && raw.op) || '').trim().toLowerCase()
    if (!['add', 'replace', 'remove'].includes(op)) throw Object.assign(new Error('bad op'), { scim: scimError(400, `Unsupported PATCH op "${raw && raw.op}".`, 'invalidSyntax') })
    const path = String((raw && raw.path) || '').trim()
    if (/^groups(\[|$)/i.test(path)) { if (!groupOp(op, path, raw.value)) throw Object.assign(new Error('bad path'), { scim: scimError(400, `Unsupported path "${path}".`, 'invalidPath') }); continue }
    if (op === 'remove') {
      // Removing a simple attribute clears it; removing active is not allowed.
      const p = path.toLowerCase()
      if (p === 'externalid') out.externalId = ''
      continue
    }
    if (path) setAttr(path, raw.value)
    else if (raw.value && typeof raw.value === 'object') {
      for (const [k, v] of Object.entries(raw.value)) {
        if (k === 'name' && v && typeof v === 'object') setAttr('name', v)
        // `groups` inside a whole-resource value is the read-only echo some
        // clients send back (often `[]`); it never empties a membership.
        else if (k === 'groups') continue
        else setAttr(k, v)
      }
    }
  }
  if (out.groups && !out.groups.add.length && !out.groups.remove.length && !out.groups.replace) delete out.groups
  return out
}

// A group PATCH -> { displayName?, add:[ids], remove:[ids], replaceMembers?:[ids] }.
export function groupPatchChanges(body) {
  const ops = Array.isArray(body && body.Operations) ? body.Operations : null
  if (!ops) throw Object.assign(new Error('bad patch'), { scim: scimError(400, 'A PATCH needs an Operations list.', 'invalidSyntax') })
  const out = { add: [], remove: [] }
  const ids = (v) => (Array.isArray(v) ? v : (v ? [v] : [])).map((m) => String((m && m.value) || m || '').trim()).filter(Boolean)
  for (const raw of ops) {
    const op = String((raw && raw.op) || '').trim().toLowerCase()
    const path = String((raw && raw.path) || '').trim()
    const lp = path.toLowerCase()
    if (!['add', 'replace', 'remove'].includes(op)) throw Object.assign(new Error('bad op'), { scim: scimError(400, `Unsupported PATCH op "${raw && raw.op}".`, 'invalidSyntax') })
    const memberFilter = /^members\[\s*value\s+eq\s+"([^"]+)"\s*\]$/i.exec(path)
    if (op === 'remove' && memberFilter) { out.remove.push(memberFilter[1]); continue }
    if (lp === 'members') {
      if (op === 'add') out.add.push(...ids(raw.value))
      else if (op === 'remove') { if (raw.value == null) out.replaceMembers = []; else out.remove.push(...ids(raw.value)) }
      else out.replaceMembers = ids(raw.value)
      continue
    }
    if (lp === 'displayname') { out.displayName = String(raw.value || '').trim(); continue }
    if (lp === 'externalid') { out.externalId = String(raw.value || '').trim(); continue }
    if (!path && raw.value && typeof raw.value === 'object') {
      if (raw.value.displayName != null) out.displayName = String(raw.value.displayName).trim()
      if (raw.value.externalId != null) out.externalId = String(raw.value.externalId).trim()
      if (raw.value.members != null) {
        if (op === 'add') out.add.push(...ids(raw.value.members))
        else out.replaceMembers = ids(raw.value.members)
      }
    }
  }
  return out
}

// ServiceProviderConfig (RFC 7643 5): what this endpoint supports.
export function serviceProviderConfig(baseUrl) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: `${baseUrl}`,
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: MAX_PAGE },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{ type: 'oauthbearertoken', name: 'OAuth Bearer Token', description: 'A company SCIM token created in the company console.', primary: true }],
    meta: { resourceType: 'ServiceProviderConfig', location: `${baseUrl}/ServiceProviderConfig` },
  }
}

export function resourceTypes(baseUrl) {
  return listResponse([
    { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'User', name: 'User', endpoint: '/Users', schema: SCHEMA_USER, meta: { resourceType: 'ResourceType', location: `${baseUrl}/ResourceTypes/User` } },
    { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'Group', name: 'Group', endpoint: '/Groups', schema: SCHEMA_GROUP, meta: { resourceType: 'ResourceType', location: `${baseUrl}/ResourceTypes/Group` } },
  ], 2, 1)
}
