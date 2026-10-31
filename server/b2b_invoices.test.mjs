// B2B contract + invoice billing on the REAL app (saas edition, no Stripe):
// the price registry's volume pricing, the superadmin records a contract and
// issues invoices, the company admin sees only what was issued (never a
// draft), downloads the PDF, and status moves are one-way.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { bootEdition } from './edition_http_harness.mjs'
import { perUserRate, monthlyAmount, bandFor, MIN_USERS, ORG_PLAN_IDS } from './org_pricing.js'
import { nextInvoiceNumber, monthsBetween, validateLines, canMove, termEndDate } from './b2b_rules.js'

const app = await bootEdition('saas')
after(app.close)
const { req, jar, store, base, superadmin } = app
const PASS = 'Passw0rd!b2b'
const co = store.createCompany({ name: 'Invoice Co', seats: 200, adminSeats: 2 })
store.createManagedUser({ username: 'billadmin', password: PASS, companyId: co.id, companyRole: 'company_admin' })
const other = store.createCompany({ name: 'Other Bill Co', seats: 5 })

test('price registry: the owner\'s rates, volume pricing (the band sets the rate for every user), 100-user minimum', () => {
  assert.deepEqual([...ORG_PLAN_IDS], ['hosted', 'managed', 'private'])
  assert.equal(MIN_USERS, 100)
  assert.deepEqual([100, 1000, 1001, 3000, 3001, 5000].map((n) => perUserRate('hosted', n)), [199, 199, 149, 149, 99, 99])
  assert.deepEqual([100, 1000, 1001, 3000, 3001, 5000].map((n) => perUserRate('private', n)), [40, 40, 30, 30, 20, 20])
  assert.deepEqual([100, 5000].map((n) => perUserRate('managed', n)), [149, 149])
  assert.equal(monthlyAmount('private', 5000), 100000, '5,000 users pay $20 each')
  assert.equal(monthlyAmount('hosted', 40), 19900, 'billed for the 100-user minimum')
  assert.equal(bandFor(10).id, 'b1')
})

test('rules: sequential numbers per year, whole months, server-computed line amounts, one-way statuses', () => {
  assert.equal(nextInvoiceNumber([], 2026), 'AV-2026-0001')
  assert.equal(nextInvoiceNumber(['AV-2026-0009', 'AV-2025-0100'], 2026), 'AV-2026-0010')
  assert.equal(monthsBetween('2026-01-01', '2026-01-31'), 1)
  assert.equal(monthsBetween('2026-01-15', '2026-02-14'), 1)
  assert.equal(monthsBetween('2026-01-01', '2026-03-31'), 3)
  assert.equal(monthsBetween('2026-01-01', '2026-12-31'), 12)
  assert.equal(termEndDate('2026-01-01', 12), '2026-12-31')
  assert.equal(termEndDate('2026-01-31', 1), '2026-02-27', 'clamped to Feb 28, minus one day')
  assert.equal(termEndDate('2027-11-30', 3), '2028-02-28', 'leap year: Feb 29 minus one day')
  assert.deepEqual(validateLines([{ description: 'Hosted', qty: 3, unitAmount: 199.999, amount: 1 }])[0], { description: 'Hosted', qty: 3, unitAmount: 200, amount: 600 })
  assert.throws(() => validateLines([]), /at least one line/)
  assert.ok(canMove('draft', 'issued') && canMove('issued', 'paid') && canMove('issued', 'void'))
  assert.ok(!canMove('paid', 'void') && !canMove('void', 'issued') && !canMove('draft', 'paid'))
})

let invId = null
test('superadmin: contract, then a draft invoice the company admin cannot see', async () => {
  const sa = await superadmin()
  const bad = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/contract`, { plan: 'hosted', users: 50, startDate: '2026-01-01', termMonths: 12 })
  assert.equal(bad.status, 400, 'below the minimum')
  const c = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/contract`, { plan: 'hosted', users: 1200, startDate: '2026-01-01', termMonths: 12, reference: 'PO-778', billingCycle: 'monthly' })
  assert.equal(c.status, 200, JSON.stringify(c.data))
  assert.equal(c.data.contract.perUserRate, 149)
  assert.equal(c.data.contract.monthlyAmount, 178800)
  assert.equal(c.data.contract.endDate, '2026-12-31')
  const inv = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/invoices`, { periodStart: '2026-01-01', periodEnd: '2026-01-31', issueDate: '2026-02-01', lines: [{ description: 'Hosted plan, 1,200 users, January 2026', qty: 1200, unitAmount: 149 }] })
  assert.equal(inv.status, 200, JSON.stringify(inv.data))
  assert.equal(inv.data.invoice.status, 'draft')
  assert.equal(inv.data.invoice.total, 178800)
  assert.match(inv.data.invoice.number, /^AV-2026-\d{4}$/)
  invId = inv.data.invoice.id
  const admin = jar()
  assert.equal((await req(admin, 'POST', '/api/work/login', { username: 'billadmin', password: PASS })).status, 200)
  const view = await req(admin, 'GET', '/api/work/company/billing')
  assert.equal(view.status, 200)
  assert.equal(view.data.contract.plan, 'hosted')
  assert.equal(view.data.invoices.length, 0, 'a draft is never shown to the company')
  const pdf = await fetch(`${base}/api/work/company/invoices/${invId}.pdf`, { headers: { cookie: Object.entries(admin.map).map(([k, v]) => `${k}=${v}`).join('; ') } })
  assert.equal(pdf.status, 404)
})

test('issued: the company admin sees it and downloads the PDF; paid is final', async () => {
  const sa = await superadmin()
  const issued = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/invoices/${invId}/status`, { status: 'issued' })
  assert.equal(issued.data.invoice.status, 'issued')
  const admin = jar()
  await req(admin, 'POST', '/api/work/login', { username: 'billadmin', password: PASS })
  const view = await req(admin, 'GET', '/api/work/company/billing')
  assert.equal(view.data.invoices.length, 1)
  assert.equal(view.data.openTotal, 178800)
  const pdf = await fetch(`${base}/api/work/company/invoices/${invId}.pdf`, { headers: { cookie: Object.entries(admin.map).map(([k, v]) => `${k}=${v}`).join('; ') } })
  assert.equal(pdf.status, 200)
  assert.equal(pdf.headers.get('content-type'), 'application/pdf')
  const bytes = Buffer.from(await pdf.arrayBuffer())
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  const paid = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/invoices/${invId}/status`, { status: 'paid', note: 'wire received' })
  assert.equal(paid.data.invoice.status, 'paid')
  const back = await req(sa, 'POST', `/api/work/admin/b2b/companies/${co.id}/invoices/${invId}/status`, { status: 'void' })
  assert.equal(back.status, 409)
})

test('a company admin never reaches another company\'s invoice, and only superadmin issues invoices', async () => {
  const admin = jar()
  await req(admin, 'POST', '/api/work/login', { username: 'billadmin', password: PASS })
  assert.equal((await req(admin, 'POST', `/api/work/admin/b2b/companies/${co.id}/invoices`, { periodStart: '2026-01-01', periodEnd: '2026-01-31', lines: [{ description: 'x', amount: 1 }] })).status, 403)
  const sa = await superadmin()
  const theirs = await req(sa, 'POST', `/api/work/admin/b2b/companies/${other.id}/invoices`, { periodStart: '2026-01-01', periodEnd: '2026-01-31', lines: [{ description: 'Other', amount: 10 }] })
  await req(sa, 'POST', `/api/work/admin/b2b/companies/${other.id}/invoices/${theirs.data.invoice.id}/status`, { status: 'issued' })
  const pdf = await fetch(`${base}/api/work/company/invoices/${theirs.data.invoice.id}.pdf`, { headers: { cookie: Object.entries(admin.map).map(([k, v]) => `${k}=${v}`).join('; ') } })
  assert.equal(pdf.status, 404)
})

test('saas: the enterprise "pay extra hours by card" toggle is forced off (no Stripe)', async () => {
  const sa = await superadmin()
  const r = await req(sa, 'POST', `/api/work/admin/companies/${co.id}/enterprise`, { stripeEnabled: true, requestsEnabled: true })
  assert.equal(r.status, 200, JSON.stringify(r.data))
  assert.equal(store.getCompany(co.id).enterprise.stripeEnabled, false)
})

test('saas: Stripe paths answer 403 on the real app', async () => {
  for (const [m, p] of [['POST', '/api/work/stripe/webhook'], ['POST', '/api/work/billing/portal'], ['GET', '/api/work/invoices'], ['GET', '/api/work/admin/billing']]) {
    const r = await req(await superadmin(), m, p, m === 'POST' ? {} : undefined)
    assert.equal(r.status, 403, `${m} ${p}`)
  }
})
