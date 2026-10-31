// ---------------------------------------------------------------------------
// SCIM group -> WorkCoPilot role mapping: the PURE rules. No store, no Express.
// ---------------------------------------------------------------------------
// The standard enterprise behaviour ("push groups" in Okta and Microsoft Entra
// ID): a company admin maps an identity-provider group to one WorkCoPilot
// company role or one grant, and group membership then decides that person's
// role and grants.
//
//   * A mapping target is a COMPANY role (server/work_roles.js COMPANY_ROLES) or
//     a GRANT (GRANTS). Nothing else is accepted, so a mapping can never name a
//     platform role (superadmin, admin, accounting, affiliate_admin, user).
//   * A person in several mapped groups gets the HIGHEST-precedence role
//     (ROLE_PRECEDENCE, defined once next to the registry) and the UNION of the
//     grants. Grants the final role may not hold are dropped (sanitizeGrants).
//   * Unmapped groups change nothing. A person in no role-mapped group keeps a
//     role set by hand; one the identity provider set before returns to
//     `member` when they leave every role-mapped group (least privilege).
//   * The last active company admin can never be demoted this way: the whole
//     change is refused (planCompany returns `refused`).
//
// A mapping names its group by display name (case-insensitive) or by the SCIM
// group id. Renaming the group in the identity provider therefore stops a
// name-based mapping from matching, exactly as it does in Okta.
// ---------------------------------------------------------------------------
import { COMPANY_ROLES, GRANTS, highestRole, sanitizeGrants } from './work_roles.js'

export const MAX_MAPPINGS = 200
export const DEFAULT_ROLE = 'member'

// 'role' | 'grant' | null. Ids only, never labels; never a platform role.
export function targetKind(target) {
  const s = String(target == null ? '' : target)
  if (COMPANY_ROLES.includes(s)) return 'role'
  if (GRANTS.includes(s)) return 'grant'
  return null
}

const bad = (msg) => Object.assign(new Error(msg), { status: 400 })

// Validate an admin's mapping input -> { group, target, kind } or throw a 400.
export function validateMapping(input) {
  const b = input || {}
  const group = String(b.group == null ? '' : b.group).trim().slice(0, 200)
  if (!group) throw bad('Name the identity provider group (its display name or its SCIM id).')
  const target = String(b.target == null ? '' : b.target).trim()
  const kind = targetKind(target)
  if (!kind) throw bad('Choose a WorkCoPilot company role or grant for this group.')
  return { group, target, kind }
}

// Does a mapping's group reference name this SCIM group?
export function groupMatches(ref, g) {
  if (!g) return false
  const r = String(ref || '').trim()
  if (!r) return false
  return r === String(g.id || '') || r.toLowerCase() === String(g.displayName || '').trim().toLowerCase()
}

// The SCIM groups a user belongs to.
export function groupsOfUser(userId, groups) {
  return (Array.isArray(groups) ? groups : []).filter((g) => Array.isArray(g.members) && g.members.includes(userId))
}

// What the mappings say for one person, given the groups they are in.
// -> { role: id|null, roleGroup: name|null, grants: [ids], grantGroups: { id: name } }
export function resolveForUser(mappings, userGroups) {
  const roleHits = []
  const grantGroups = {}
  for (const m of Array.isArray(mappings) ? mappings : []) {
    const kind = targetKind(m && m.target)
    if (!kind) continue                      // a stale or tampered record is ignored, never trusted
    const g = (userGroups || []).find((x) => groupMatches(m.group, x))
    if (!g) continue
    if (kind === 'role') roleHits.push({ role: m.target, group: g.displayName })
    else if (!grantGroups[m.target]) grantGroups[m.target] = g.displayName
  }
  const role = highestRole(roleHits.map((h) => h.role))
  const roleGroup = role ? roleHits.find((h) => h.role === role).group : null
  return { role, roleGroup, grants: GRANTS.filter((x) => grantGroups[x]), grantGroups }
}

const sameList = (a, b) => [...(a || [])].sort().join(',') === [...(b || [])].sort().join(',')

// One person's next role, grants and "managed" record.
// managed = what the identity provider controls now: { role: id|null, grants: [ids] }.
// prevManaged = the same record from the last sync (or null).
export function planUser(user, resolved) {
  const u = user || {}
  const prev = u.scimRoleManaged || null
  const curRole = u.companyRole || DEFAULT_ROLE
  const curGrants = sanitizeGrants(curRole, u.grants)
  const prevGrants = (prev && Array.isArray(prev.grants)) ? prev.grants : []
  const toRole = resolved.role || (prev && prev.role ? DEFAULT_ROLE : curRole)
  // Grants set by hand stay; grants the identity provider set before are replaced
  // by what it says now.
  const manual = curGrants.filter((g) => !prevGrants.includes(g))
  const toGrants = sanitizeGrants(toRole, [...manual, ...resolved.grants])
  const managedGrants = resolved.grants.filter((g) => toGrants.includes(g))
  const managed = (resolved.role || managedGrants.length) ? { role: resolved.role || null, grants: managedGrants } : null
  const prevNorm = prev && (prev.role || prevGrants.length) ? { role: prev.role || null, grants: prevGrants } : null
  return {
    userId: u.id,
    fromRole: curRole, toRole,
    fromGrants: curGrants, toGrants,
    managed,
    roleChanged: toRole !== curRole,
    grantsChanged: !sameList(curGrants, toGrants),
    managedChanged: JSON.stringify(prevNorm) !== JSON.stringify(managed && { role: managed.role, grants: managed.grants }),
    group: resolved.role ? resolved.roleGroup : (Object.values(resolved.grantGroups)[0] || null),
  }
}

// Active = may sign in to the console (not turned off, not deprovisioned).
const activeAdmin = (u) => u && u.companyRole === 'company_admin' && !u.disabled && !u.scimDeletedAt

// Plan a sync for a company. users: the company's accounts (raw records);
// groups: its SCIM groups; mappings: its mappings; userIds: whom to recompute
// (default everyone). -> { changes: [plan...], refused: null | { reason, userIds } }
// Only plans that change something are returned. Nothing is mutated.
export function planCompany({ users, groups, mappings, userIds = null }) {
  const list = (Array.isArray(users) ? users : []).filter((u) => u && !u.scimDeletedAt)
  const want = userIds ? new Set(userIds) : null
  const changes = []
  for (const u of list) {
    if (want && !want.has(u.id)) continue
    const p = planUser(u, resolveForUser(mappings, groupsOfUser(u.id, groups)))
    if (p.roleChanged || p.grantsChanged || p.managedChanged) changes.push(p)
  }
  // The last-admin rule: a company that has an active admin keeps at least one.
  const before = list.filter(activeAdmin)
  if (before.length) {
    const toOf = new Map(changes.map((c) => [c.userId, c.toRole]))
    const after = list.filter((u) => !u.disabled && (toOf.has(u.id) ? toOf.get(u.id) : u.companyRole) === 'company_admin')
    if (!after.length) {
      const demoted = changes.filter((c) => c.fromRole === 'company_admin' && c.toRole !== 'company_admin').map((c) => c.userId)
      return { changes, refused: { reason: 'last_admin', userIds: demoted } }
    }
  }
  return { changes, refused: null }
}

// A console edit against a field the identity provider manages -> 'role' |
// 'grants' | null. `finalRole` / `finalGrants` are what the edit would leave
// (grants already sanitized against the final role), so a role change that would
// silently drop a managed grant is caught too.
export function manualEditConflict(user, { finalRole, finalGrants }) {
  const m = user && user.scimRoleManaged
  if (!m) return null
  if (m.role && finalRole !== (user.companyRole || DEFAULT_ROLE)) return 'role'
  const cur = new Set(sanitizeGrants(user.companyRole || DEFAULT_ROLE, user.grants))
  const next = new Set(finalGrants || [])
  for (const g of m.grants || []) if (cur.has(g) !== next.has(g)) return 'grants'
  return null
}

// The console's view of a person: which fields their identity provider manages.
export function managedView(user) {
  const m = user && user.companyId ? user.scimRoleManaged : null
  if (!m || (!m.role && !(m.grants || []).length)) return null
  return { role: !!m.role, grants: [...(m.grants || [])] }
}

// One audit line: who, from what, to what, which group. Fits the audit's 200 chars.
export function describeChange(c, label) {
  const g = (list) => (list && list.length ? list.join('+') : 'none')
  const parts = [`${label || c.userId}: role ${c.fromRole} -> ${c.toRole}`]
  if (c.grantsChanged) parts.push(`grants ${g(c.fromGrants)} -> ${g(c.toGrants)}`)
  parts.push(c.group ? `group "${c.group}"` : 'no mapped group')
  return parts.join('; ').slice(0, 200)
}

export default { MAX_MAPPINGS, DEFAULT_ROLE, targetKind, validateMapping, groupMatches, groupsOfUser, resolveForUser, planUser, planCompany, manualEditConflict, managedView, describeChange }
