// KB-spaces routes: pickable company knowledge collections. Members read the
// list (to scope grounding at plan time); the company admin curates spaces and
// assigns learnings to them. Tenant-scoped on the admin's own company. Thin over
// the store ops; self-contained register (SUPREME XV).
export function registerKbSpaceRoutes(app, { store, requireWorkAuth, requireCompanyAdmin, wrap }) {
  // Member-readable: the spaces this company user may pick to scope grounding.
  app.get('/api/work/kb-spaces', requireWorkAuth, wrap((req, res) => {
    res.json({ spaces: store.kbSpacesForUser(req.workUser.id) })
  }))

  // Company admin: list / create / rename / remove spaces.
  app.get('/api/work/company/kb-spaces', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ spaces: store.listCompanyKbSpaces(req.workUser.companyId) })
  }))
  app.post('/api/work/company/kb-spaces', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ space: store.addCompanyKbSpace(req.workUser.companyId, (req.body || {}).name) })
  }))
  app.patch('/api/work/company/kb-spaces/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ space: store.renameCompanyKbSpace(req.workUser.companyId, req.params.id, (req.body || {}).name) })
  }))
  app.delete('/api/work/company/kb-spaces/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.removeCompanyKbSpace(req.workUser.companyId, req.params.id))
  }))

  // Company admin: move a learning into a space (null to ungroup).
  app.post('/api/work/company/learnings/:id/space', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.setCompanyLearningSpace(req.workUser.companyId, req.params.id, (req.body || {}).space || null))
  }))
}

export default { registerKbSpaceRoutes }
