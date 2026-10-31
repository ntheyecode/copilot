// ---------------------------------------------------------------------------
// Company console routes for SCIM group -> role mappings (scim_roles.js).
// Every route is scoped to the caller's OWN company (req.workUser.companyId)
// and needs a company admin. Mapping targets are validated against the role
// registry (server/work_roles.js) in scim_role_rules.js; a platform role can
// never be named. Every change is audited by the store.
// ---------------------------------------------------------------------------
export function registerScimRoleRoutes(app, deps = {}) {
  const { store, requireWorkAuth, requireCompanyAdmin, wrap } = deps
  if (!app || !store || !requireWorkAuth || !requireCompanyAdmin || !wrap) throw new Error('registerScimRoleRoutes: missing required deps')
  const scope = (req, res) => {
    const cid = req.workUser && req.workUser.companyId
    if (!cid) { res.status(403).json({ error: 'No company in scope.' }); return null }
    return cid
  }
  const actor = (req) => ({ id: req.workUser.id, username: req.workUser.username || (req.user && req.user.username) || req.workUser.id })

  app.get('/api/work/company/scim/role-mappings', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const cid = scope(req, res); if (!cid) return
    res.json(store.listScimRoleMappings(cid))
  }))
  app.post('/api/work/company/scim/role-mappings', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const cid = scope(req, res); if (!cid) return
    const b = req.body || {}
    res.json(store.addScimRoleMapping(cid, actor(req), { group: b.group, target: b.target }))
  }))
  app.delete('/api/work/company/scim/role-mappings/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const cid = scope(req, res); if (!cid) return
    // The reason the admin typed in the confirm step goes to the audit trail.
    res.json(store.removeScimRoleMapping(cid, actor(req), req.params.id, { reason: String((req.body && req.body.reason) || '').slice(0, 500) }))
  }))
}

export default { registerScimRoleRoutes }
