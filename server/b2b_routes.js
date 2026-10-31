// ---------------------------------------------------------------------------
// B2B billing routes: AdmireVeda (superadmin) records each company's contract
// and issues invoices; the company admin reads its own contract, pool and
// invoices and downloads each invoice as a PDF. No card payment, no Stripe.
//
//   superadmin   /api/work/admin/b2b/...      (the console's Invoices section;
//                                             refused where there are no companies)
//   company admin /api/work/company/billing, /api/work/company/invoices/:id.pdf
// ---------------------------------------------------------------------------
import { buildCompanyInvoice } from './company_invoice.js'

export function registerB2bRoutes(app, deps = {}) {
  const { store, requireAuth, requireWorkAuth, requireSuperAdmin, requireCompanyAdmin, wrap } = deps
  if (!app || !store || !requireAuth || !requireWorkAuth || !requireSuperAdmin || !requireCompanyAdmin || !wrap) throw new Error('registerB2bRoutes: missing required deps')
  const who = (req) => (req.user && (req.user.username || req.user.id)) || 'unknown'

  function sendPdf(res, cid, invoiceId, opts) {
    const { statement, invoice } = store.invoiceStatement(cid, invoiceId, opts)
    const safe = String(invoice.number).replace(/[^A-Za-z0-9-]+/g, '')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="admireveda-invoice-${safe}.pdf"`)
    buildCompanyInvoice(statement, {
      invoiceNumber: invoice.number,
      issuer: { name: 'AdmireVeda' },
      b2b: { periodStart: invoice.periodStart, periodEnd: invoice.periodEnd, dueDate: invoice.dueDate, status: invoice.status, notes: invoice.notes },
    }).pipe(res)
  }

  // ---- superadmin ----------------------------------------------------------------
  app.get('/api/work/admin/b2b/invoices', requireAuth, requireSuperAdmin, wrap((req, res) => {
    const status = ['draft', 'issued', 'paid', 'void'].includes(req.query.status) ? req.query.status : null
    res.json({ invoices: store.listAllInvoices({ status }) })
  }))
  app.get('/api/work/admin/b2b/companies/:id', requireAuth, requireSuperAdmin, wrap((req, res) => {
    const { contract } = store.getCompanyContract(req.params.id)
    res.json({ contract, invoices: store.listCompanyInvoices(req.params.id) })
  }))
  app.post('/api/work/admin/b2b/companies/:id/contract', requireAuth, requireSuperAdmin, wrap((req, res) => {
    res.json(store.setCompanyContract(req.params.id, req.body || {}, { by: who(req) }))
  }))
  app.post('/api/work/admin/b2b/companies/:id/invoices', requireAuth, requireSuperAdmin, wrap((req, res) => {
    res.json({ invoice: store.createCompanyInvoice(req.params.id, req.body || {}, { by: who(req) }) })
  }))
  app.post('/api/work/admin/b2b/companies/:id/invoices/:invoiceId/status', requireAuth, requireSuperAdmin, wrap((req, res) => {
    const b = req.body || {}
    res.json({ invoice: store.setInvoiceStatus(req.params.id, req.params.invoiceId, String(b.status || ''), { by: who(req), note: b.note }) })
  }))
  app.get('/api/work/admin/b2b/companies/:id/invoices/:invoiceId.pdf', requireAuth, requireSuperAdmin, wrap((req, res) => {
    sendPdf(res, req.params.id, req.params.invoiceId, {})
  }))

  // ---- company admin (own company only) ------------------------------------------
  app.get('/api/work/company/billing', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.companyBillingOverview(req.workUser.companyId))
  }))
  app.get('/api/work/company/invoices/:invoiceId.pdf', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    sendPdf(res, req.workUser.companyId, req.params.invoiceId, { forCompanyAdmin: true })
  }))
}

export default { registerB2bRoutes }
