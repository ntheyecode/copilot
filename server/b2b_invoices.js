// ===========================================================================
// B2B billing: AdmireVeda bills each company under contract and invoice.
// ===========================================================================
// No card payment and no Stripe call anywhere in this module. AdmireVeda's
// superadmin records the company's contract (plan, users, term) and creates
// invoices (draft -> issued -> paid, or void); the company admin reads its
// contract, its guided-hours pool and the invoices issued to it, and downloads
// each as a PDF (company_invoice.js renders it).
//
// Decisions live in the pure b2b_rules.js; prices in org_pricing.js. Created
// by the store with its context (never imports the store), which stays the
// single owner of db + persistence and re-exports this API.
//
// ctx: { db, persist, httpErr, id(), company(cid) -> raw, publicCompany(raw),
//        poolDashboard(cid), audit({...}), clock? }
// ===========================================================================
import * as R from './b2b_rules.js'

export function createB2bBilling(ctx) {
  const { persist, httpErr } = ctx
  const clock = ctx.clock || Date.now
  const today = () => new Date(clock()).toISOString().slice(0, 10)
  const db = () => {
    const d = ctx.db()
    if (!Array.isArray(d.b2bInvoices)) d.b2bInvoices = []
    return d
  }
  const must = (cid) => { const c = ctx.company(cid); if (!c) throw httpErr(404, 'Company not found.'); return c }
  const audit = (a) => { try { ctx.audit(a) } catch { /* audit never blocks */ } }
  const pub = (inv) => ({
    id: inv.id, companyId: inv.companyId, number: inv.number, status: inv.status,
    periodStart: inv.periodStart, periodEnd: inv.periodEnd, issueDate: inv.issueDate, dueDate: inv.dueDate,
    currency: inv.currency, lines: inv.lines.map((l) => ({ ...l })), total: inv.total, notes: inv.notes || '',
    createdAt: inv.createdAt, issuedAt: inv.issuedAt || null, paidAt: inv.paidAt || null, voidedAt: inv.voidedAt || null,
    overdue: inv.status === 'issued' && inv.dueDate < today(),
  })

  function getCompanyContract(cid) {
    const c = must(cid)
    return { contract: R.contractView(c.contract || null) }
  }
  function setCompanyContract(cid, input, { by = '' } = {}) {
    const c = must(cid)
    const v = R.validateContract(input)
    c.contract = { ...v, updatedAt: new Date(clock()).toISOString(), updatedBy: String(by || '') }
    persist()
    audit({ userId: null, companyId: cid, action: 'contract_set', reason: 'company contract recorded', detail: `${v.plan}, ${v.users} users, ${v.termMonths} months from ${v.startDate} by ${by}` })
    return getCompanyContract(cid)
  }

  // Superadmin: every invoice of one company (drafts included), newest first.
  // Company admin (forCompanyAdmin): only what was issued to it.
  function listCompanyInvoices(cid, { forCompanyAdmin = false } = {}) {
    must(cid)
    return db().b2bInvoices
      .filter((x) => x.companyId === cid && (!forCompanyAdmin || R.COMPANY_VISIBLE.includes(x.status)))
      .sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)) || String(b.number).localeCompare(String(a.number)))
      .map(pub)
  }
  function listAllInvoices({ status = null } = {}) {
    return db().b2bInvoices
      .filter((x) => !status || x.status === status)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((x) => ({ ...pub(x), companyName: (ctx.company(x.companyId) || {}).name || '' }))
  }
  function createCompanyInvoice(cid, input, { by = '' } = {}) {
    must(cid)
    const v = R.validateInvoice(input, { today: today() })
    const year = v.issueDate.slice(0, 4)
    const number = R.nextInvoiceNumber(db().b2bInvoices.map((x) => x.number), year)
    const inv = {
      id: 'inv' + ctx.id(), companyId: cid, number, status: 'draft', ...v,
      createdAt: new Date(clock()).toISOString(), createdBy: String(by || ''),
      history: [{ status: 'draft', at: new Date(clock()).toISOString(), by: String(by || '') }],
    }
    db().b2bInvoices.push(inv)
    persist()
    audit({ userId: null, companyId: cid, action: 'invoice_create', reason: 'B2B invoice drafted', detail: `${number} ${v.total} ${v.currency} by ${by}` })
    return pub(inv)
  }
  function setInvoiceStatus(cid, invoiceId, status, { by = '', note = '' } = {}) {
    must(cid)
    const inv = db().b2bInvoices.find((x) => x.id === String(invoiceId || '') && x.companyId === cid)
    if (!inv) throw httpErr(404, 'Invoice not found.')
    if (!R.INVOICE_STATUSES.includes(status)) throw httpErr(400, 'Unknown invoice status.')
    if (!R.canMove(inv.status, status)) throw httpErr(409, `An invoice that is ${inv.status} cannot become ${status}.`)
    const at = new Date(clock()).toISOString()
    inv.status = status
    if (status === 'issued') inv.issuedAt = at
    if (status === 'paid') inv.paidAt = at
    if (status === 'void') inv.voidedAt = at
    inv.history = [...(inv.history || []), { status, at, by: String(by || ''), note: String(note || '').slice(0, 300) }]
    persist()
    audit({ userId: null, companyId: cid, action: `invoice_${status}`, reason: `B2B invoice marked ${status}`, detail: `${inv.number} by ${by}${note ? `: ${String(note).slice(0, 120)}` : ''}` })
    return pub(inv)
  }
  function getCompanyInvoice(cid, invoiceId, { forCompanyAdmin = false } = {}) {
    const inv = db().b2bInvoices.find((x) => x.id === String(invoiceId || '') && x.companyId === cid)
    if (!inv || (forCompanyAdmin && !R.COMPANY_VISIBLE.includes(inv.status))) throw httpErr(404, 'Invoice not found.')
    return pub(inv)
  }
  // The statement shape company_invoice.js renders, for one B2B invoice.
  function invoiceStatement(cid, invoiceId, opts = {}) {
    const inv = getCompanyInvoice(cid, invoiceId, opts)
    const c = must(cid)
    return {
      statement: {
        companyId: cid, name: c.name, profile: c.profile || {}, currency: inv.currency, generatedAt: inv.issueDate + 'T00:00:00Z',
        seatLines: inv.lines, ledger: [], recurringTotal: inv.total, extrasTotal: 0, total: inv.total,
      },
      invoice: inv,
    }
  }
  // The company admin's billing area in one read: contract, pool, invoices.
  function companyBillingOverview(cid) {
    const { contract } = getCompanyContract(cid)
    let pool = null
    try { const d = ctx.poolDashboard(cid); pool = d ? { ...d.pool, timezone: d.timezone, resetLabel: d.resetLabel, pendingRequests: d.pendingRequests } : null } catch { pool = null }
    const invoices = listCompanyInvoices(cid, { forCompanyAdmin: true })
    const open = invoices.filter((i) => i.status === 'issued')
    return {
      contract, pool, invoices,
      openTotal: R.round2(open.reduce((s, i) => s + i.total, 0)),
      overdueCount: open.filter((i) => i.overdue).length,
    }
  }

  return { getCompanyContract, setCompanyContract, listCompanyInvoices, listAllInvoices, createCompanyInvoice, setInvoiceStatus, getCompanyInvoice, invoiceStatement, companyBillingOverview }
}

export default { createB2bBilling }
