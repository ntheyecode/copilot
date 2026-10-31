// ===========================================================================
// SCIM group -> role mapping: orchestration over the pure rules in
// scim_role_rules.js. Created by the store with its context (never imports
// the store), like scim_store.js.
//
// Two things call syncUsers():
//   * the SCIM endpoint, after a group's members (or name) change, or after a
//     PATCH on a user's `groups`; it passes the people that change touched;
//   * the company console, after a mapping is added or removed; everyone in
//     the company is recomputed.
// A sync is ALL OR NOTHING: it is planned first, refused as a whole when it
// would demote the last active company admin (or, from the console, the
// acting admin), and rolled back as a whole when a seat gate refuses one
// person. A refusal is audited; so is every role or grant it changes (who
// made the change, which group, from and to).
//
// Sessions need nothing extra: every request re-reads the account
// (index.js resolveWorkIdentity), so the new role applies on the next request,
// the same way a manual role change in the console does.
//
// ctx: { db, persist, httpErr, audit(a), assertSeat(companyId, role, user),
//        accessChanged(user), label(user), clock? }
// ===========================================================================
import crypto from 'node:crypto'
import * as RR from './scim_role_rules.js'

export function createScimRoleSync(ctx) {
  const { persist, httpErr } = ctx
  const clock = ctx.clock || Date.now
  const nowIso = () => new Date(clock()).toISOString()
  const db = () => {
    const d = ctx.db()
    if (!Array.isArray(d.scimRoleMappings)) d.scimRoleMappings = []
    if (!Array.isArray(d.scimGroups)) d.scimGroups = []
    return d
  }
  const audit = (a) => { try { ctx.audit(a) } catch { /* audit never blocks */ } }
  const label = (u) => { try { return ctx.label(u) } catch { return u.id } }
  const mappingsOf = (cid) => db().scimRoleMappings.filter((m) => m.companyId === cid)
  const groupsOf = (cid) => db().scimGroups.filter((g) => g.companyId === cid)
  const usersOf = (cid) => (db().users || []).filter((u) => u.companyId === cid)
  const byId = (cid, id) => usersOf(cid).find((u) => u.id === id) || null

  function refusalText(refused, cid) {
    const names = refused.userIds.map((id) => { const u = byId(cid, id); return u ? label(u) : id }).join(', ')
    if (refused.reason === 'self') return 'This change would remove your own company admin role. Ask another company admin to make it.'
    return `This change would leave your company with no active company admin (${names}). Add another company admin first, in WorkCoPilot or in your identity provider.`
  }

  // Recompute and apply. opts: { userIds?, by, actorId?, reason }
  // -> { ok: true, changed: n } | { ok: false, status, detail }
  function syncUsers(cid, { userIds = null, by = '', actorId = null, reason = '' } = {}) {
    const plan = RR.planCompany({ users: usersOf(cid), groups: groupsOf(cid), mappings: mappingsOf(cid), userIds })
    let refused = plan.refused
    if (!refused && actorId) {
      const self = plan.changes.find((c) => c.userId === actorId && c.fromRole === 'company_admin' && c.toRole !== 'company_admin')
      if (self) refused = { reason: 'self', userIds: [actorId] }
    }
    if (refused) {
      const detail = refusalText(refused, cid)
      audit({ userId: actorId, companyId: cid, action: 'scim_role_refused', reason: `${reason} (${by})`.trim(), detail: `${refused.reason}: ${refused.userIds.map((id) => { const u = byId(cid, id); return u ? label(u) : id }).join(', ')}` })
      return { ok: false, status: 409, detail }
    }
    if (!plan.changes.length) return { ok: true, changed: 0 }
    const snap = []
    try {
      for (const c of plan.changes) {
        const u = byId(cid, c.userId)
        snap.push({ u, companyRole: u.companyRole, grants: u.grants, managed: u.scimRoleManaged })
        // The ONE seat gate (store.assertSeatAvailable) when a person moves
        // between the admin and member pools; checked against the live state, so
        // several promotions in one sync are counted together.
        if ((c.fromRole === 'company_admin') !== (c.toRole === 'company_admin')) ctx.assertSeat(cid, c.toRole, u)
        u.companyRole = c.toRole
        u.grants = c.toGrants
        u.scimRoleManaged = c.managed ? { role: c.managed.role, grants: c.managed.grants, at: nowIso() } : null
      }
    } catch (e) {
      for (const s of snap.reverse()) { s.u.companyRole = s.companyRole; s.u.grants = s.grants; s.u.scimRoleManaged = s.managed }
      const detail = (e && e.message) || 'The change could not be applied.'
      audit({ userId: actorId, companyId: cid, action: 'scim_role_refused', reason: `${reason} (${by})`.trim(), detail: `seats: ${detail}` })
      return { ok: false, status: 409, detail }
    }
    persist()
    let changed = 0
    for (const c of plan.changes) {
      if (!c.roleChanged && !c.grantsChanged) continue
      changed++
      const u = byId(cid, c.userId)
      audit({ userId: actorId, companyId: cid, action: 'scim_role_change', reason: `${reason} (${by})`.trim(), detail: RR.describeChange(c, label(u)) })
      try { ctx.accessChanged(u) } catch { /* a notification never blocks */ }
    }
    return { ok: true, changed }
  }

  // ---- the console's mapping list ---------------------------------------------
  const pubMapping = (m, groups) => {
    const g = groups.find((x) => RR.groupMatches(m.group, x)) || null
    return { id: m.id, group: m.group, target: m.target, kind: RR.targetKind(m.target), createdAt: m.createdAt, createdBy: m.createdBy || null, matched: g ? { id: g.id, displayName: g.displayName, members: (g.members || []).length } : null }
  }
  function listRoleMappings(cid) {
    const groups = groupsOf(cid)
    const managed = usersOf(cid).filter((u) => !u.scimDeletedAt && RR.managedView(u)).length
    return {
      mappings: mappingsOf(cid).map((m) => pubMapping(m, groups)),
      groups: groups.map((g) => ({ id: g.id, displayName: g.displayName, members: (g.members || []).length })).sort((a, b) => a.displayName.localeCompare(b.displayName)),
      managed,
    }
  }
  function addRoleMapping(cid, actor, input) {
    const v = RR.validateMapping(input)
    const list = mappingsOf(cid)
    if (list.length >= RR.MAX_MAPPINGS) throw httpErr(409, `Your company has ${RR.MAX_MAPPINGS} group mappings. Remove one you no longer use first.`)
    if (list.some((m) => m.group.toLowerCase() === v.group.toLowerCase() && m.target === v.target)) throw httpErr(409, 'This group is already mapped to that role or grant.')
    const m = { id: crypto.randomUUID(), companyId: cid, group: v.group, target: v.target, createdAt: nowIso(), createdBy: (actor && actor.username) || null }
    db().scimRoleMappings.push(m)
    const r = syncUsers(cid, { by: `console:${(actor && actor.username) || ''}`, actorId: actor && actor.id, reason: `group mapping added: "${v.group}" -> ${v.target}` })
    if (!r.ok) { db().scimRoleMappings = db().scimRoleMappings.filter((x) => x !== m); throw httpErr(r.status, r.detail) }
    persist()
    audit({ userId: actor && actor.id, companyId: cid, action: 'scim_role_mapping_add', reason: 'identity provider group mapped to a role', detail: `"${v.group}" -> ${v.target}; ${r.changed} people updated` })
    return { mapping: pubMapping(m, groupsOf(cid)), changed: r.changed }
  }
  function removeRoleMapping(cid, actor, mappingId, { reason: why = '' } = {}) {
    const m = mappingsOf(cid).find((x) => x.id === String(mappingId || ''))
    if (!m) throw httpErr(404, 'Mapping not found.')
    const all = db().scimRoleMappings
    const at = all.indexOf(m)
    all.splice(at, 1)
    const r = syncUsers(cid, { by: `console:${(actor && actor.username) || ''}`, actorId: actor && actor.id, reason: `group mapping removed: "${m.group}" -> ${m.target}` })
    if (!r.ok) { db().scimRoleMappings.splice(at, 0, m); throw httpErr(r.status, r.detail) }
    persist()
    audit({ userId: actor && actor.id, companyId: cid, action: 'scim_role_mapping_remove', reason: String(why || '').trim() || 'identity provider group mapping removed', detail: `"${m.group}" -> ${m.target}; ${r.changed} people updated` })
    return { removed: m.id, changed: r.changed }
  }

  return { syncUsers, listRoleMappings, addRoleMapping, removeRoleMapping }
}

export default { createScimRoleSync }
