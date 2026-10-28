// Company-admin CRUD for Customers (enterprise: "who the work is for"). Self-
// contained register, mirroring the other registerWork*Routes modules. Tenant-
// isolated: every route acts on the admin's OWN company (req.workUser.companyId),
// so a company can never see or touch another company's customers. Company-admin
// only (requireCompanyAdmin). Default is always returned and cannot be removed
// (enforced in the store/work_customers layer).
export function registerWorkCustomerRoutes(app, { store, requireWorkAuth, requireCompanyAdmin, wrap }) {
  // Member-readable: any company user can LIST their own company's customers (to pick
  // one when starting a project). Read-only + tenant-scoped; individuals (no company)
  // get an empty list. CRUD below stays company-admin only.
  app.get('/api/work/customers', requireWorkAuth, wrap((req, res) => {
    res.json({ customers: req.workUser.companyId ? store.listWorkCustomers(req.workUser.companyId) : [] })
  }))
  app.get('/api/work/company/customers', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ customers: store.listWorkCustomers(req.workUser.companyId) })
  }))
  app.post('/api/work/company/customers', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ customer: store.addWorkCustomer(req.workUser.companyId, (req.body || {}).name) })
  }))
  app.patch('/api/work/company/customers/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ customer: store.renameWorkCustomer(req.workUser.companyId, req.params.id, (req.body || {}).name) })
  }))
  app.delete('/api/work/company/customers/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.archiveWorkCustomer(req.workUser.companyId, req.params.id))
  }))
}
