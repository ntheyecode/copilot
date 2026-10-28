// Guidance-depth governance routes. Superadmin sets a company's depth CEILING (the
// grant); the company admin assigns each pool (allocGroup) a depth, clamped to that
// ceiling in the store so a pool can never exceed the grant. Self-contained register,
// mirroring the other registerWork*Routes modules. Company-admin routes are tenant-
// isolated via req.workUser.companyId.
export function registerGuidanceDepthRoutes(app, { store, requireWorkAuth, requireSuperAdmin, requireCompanyAdmin, wrap }) {
  // Superadmin: set a company's depth ceiling (Standard vs Deep/Projects).
  app.post('/api/work/admin/companies/:id/guidance-depth', requireWorkAuth, requireSuperAdmin, wrap((req, res) => {
    res.json({ guidanceDepth: store.setCompanyGuidanceDepth(req.params.id, (req.body || {}).depth) })
  }))
  // Company admin: read the ceiling + the current per-pool assignments.
  app.get('/api/work/company/guidance-depth', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({
      ceiling: store.getCompanyGuidanceDepth(req.workUser.companyId),
      pools: store.getCompanyPoolDepths(req.workUser.companyId),
    })
  }))
  // Company admin: assign a pool (allocGroup) a depth; the store clamps it to the ceiling.
  app.post('/api/work/company/guidance-depth/pool', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const { pool, depth } = req.body || {}
    res.json({ depth: store.setCompanyPoolDepth(req.workUser.companyId, pool, depth) })
  }))
}
