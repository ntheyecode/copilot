// ---------------------------------------------------------------------------
// B2B billing: the PURE rules for a company's contract and the invoices
// AdmireVeda issues to it. No store, no Express, no card payment anywhere.
// ---------------------------------------------------------------------------
// The orchestration (who may do what, persistence, audit) is b2b_invoices.js.
// Prices come from the one registry, org_pricing.js.
// ---------------------------------------------------------------------------
import { ORG_PLAN_IDS, MIN_USERS, CURRENCY, perUserRate, billableUsers, monthlyAmount } from './org_pricing.js'

export const INVOICE_STATUSES = Object.freeze(['draft', 'issued', 'paid', 'void'])
// Allowed moves. paid and void are final (a correction is a new invoice).
export const TRANSITIONS = Object.freeze({ draft: ['issued', 'void'], issued: ['paid', 'void'], paid: [], void: [] })
// What a company admin sees: never a draft.
export const COMPANY_VISIBLE = Object.freeze(['issued', 'paid', 'void'])
export const BILLING_CYCLES = Object.freeze(['monthly', 'quarterly', 'annual'])
export const MAX_LINES = 50
export const MAX_AMOUNT = 100000000   // 100 million per line; anything larger is a typo

function bad(message) { const e = new Error(message); e.status = 400; return e }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
function isoDay(v, label, { required = true } = {}) {
  const s = String(v == null ? '' : v).trim()
  if (!s) { if (required) throw bad(`${label} is required.`); return null }
  if (!DATE_RE.test(s) || isNaN(Date.parse(s + 'T00:00:00Z')) || new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) !== s) throw bad(`${label} must be a date (YYYY-MM-DD).`)
  return s
}
const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max)
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// The company's contract with AdmireVeda.
export function validateContract(input = {}) {
  const b = input || {}
  const plan = String(b.plan || '').trim()
  if (!ORG_PLAN_IDS.includes(plan)) throw bad(`Choose a plan: ${ORG_PLAN_IDS.join(', ')}.`)
  const users = Math.floor(Number(b.users))
  if (!Number.isFinite(users) || users < MIN_USERS) throw bad(`A contract covers at least ${MIN_USERS} users.`)
  if (users > 10000000) throw bad('That user count is too large.')
  const startDate = isoDay(b.startDate, 'The start date')
  const termMonths = Math.floor(Number(b.termMonths))
  if (!Number.isFinite(termMonths) || termMonths < 1 || termMonths > 120) throw bad('The term is 1 to 120 months.')
  const billingCycle = BILLING_CYCLES.includes(b.billingCycle) ? b.billingCycle : 'monthly'
  return {
    plan, users, startDate, termMonths, billingCycle,
    reference: text(b.reference, 80),
    notes: text(b.notes, 500),
  }
}

// The contract as the company admin and the invoice form read it: the
// per-user rate and the monthly amount from the price registry.
export function contractView(contract) {
  if (!contract) return null
  const rate = perUserRate(contract.plan, contract.users)
  return {
    ...contract,
    currency: CURRENCY,
    billableUsers: billableUsers(contract.users),
    perUserRate: rate,
    monthlyAmount: monthlyAmount(contract.plan, contract.users),
    endDate: termEndDate(contract.startDate, contract.termMonths),
  }
}

// The last day of a term: the same day `months` later, minus one day, with the
// day clamped to the target month (a term from Jan 31 for 1 month ends Feb 28
// or 29, never Mar 2). Built from the 1st of the target month, so it never
// rolls over (month_shift_gate.test.mjs).
export function termEndDate(startDate, months) {
  const [y, m, d] = String(startDate).split('-').map(Number)
  const firstOfTarget = new Date(Date.UTC(y, m - 1 + Number(months), 1))
  const daysInTarget = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  const sameDay = Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(d, daysInTarget))
  return new Date(sameDay - 86400000).toISOString().slice(0, 10)
}

// An invoice's lines: qty x unit = amount, computed here (never trusted from
// the client). A line may also be amount-only (qty 1, unit = amount).
export function validateLines(lines) {
  const list = Array.isArray(lines) ? lines : []
  if (!list.length) throw bad('Add at least one line.')
  if (list.length > MAX_LINES) throw bad(`An invoice has at most ${MAX_LINES} lines.`)
  return list.map((l, i) => {
    const description = text(l && l.description, 300)
    if (!description) throw bad(`Line ${i + 1} needs a description.`)
    const qty = l && l.qty != null && l.qty !== '' ? Number(l.qty) : 1
    const unitAmount = Number(l && l.unitAmount != null && l.unitAmount !== '' ? l.unitAmount : l && l.amount)
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10000000) throw bad(`Line ${i + 1} needs a quantity above 0.`)
    if (!Number.isFinite(unitAmount) || Math.abs(unitAmount) > MAX_AMOUNT) throw bad(`Line ${i + 1} needs an amount.`)
    return { description, qty, unitAmount: round2(unitAmount), amount: round2(qty * unitAmount) }
  })
}

export function validateInvoice(input = {}, { today }) {
  const b = input || {}
  const periodStart = isoDay(b.periodStart, 'The period start')
  const periodEnd = isoDay(b.periodEnd, 'The period end')
  if (periodEnd < periodStart) throw bad('The period ends before it starts.')
  const issueDate = isoDay(b.issueDate, 'The issue date', { required: false }) || today
  const dueDate = isoDay(b.dueDate, 'The due date', { required: false }) || addDays(issueDate, 30)
  if (dueDate < issueDate) throw bad('The due date is before the issue date.')
  const lines = validateLines(b.lines)
  const total = round2(lines.reduce((s, l) => s + l.amount, 0))
  return { periodStart, periodEnd, issueDate, dueDate, lines, currency: CURRENCY, total, notes: text(b.notes, 1000) }
}

export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Next sequential number for a year: AV-2026-0001, AV-2026-0002, ...
export function nextInvoiceNumber(existingNumbers, year) {
  const prefix = `AV-${year}-`
  let max = 0
  for (const n of existingNumbers || []) {
    if (typeof n === 'string' && n.startsWith(prefix)) {
      const v = parseInt(n.slice(prefix.length), 10)
      if (Number.isFinite(v) && v > max) max = v
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export function canMove(from, to) {
  return !!(TRANSITIONS[from] && TRANSITIONS[from].includes(to))
}

// Suggested subscription line for a period from the contract (the superadmin
// can edit it before saving): users x per-user rate x whole months.
export function suggestedLines(contract, periodStart, periodEnd) {
  if (!contract) return []
  const v = contractView(contract)
  const months = monthsBetween(periodStart, periodEnd)
  return [{ description: `${v.plan} plan, ${v.billableUsers} users, ${months} month${months === 1 ? '' : 's'}`, qty: v.billableUsers * months, unitAmount: v.perUserRate }]
}
export function monthsBetween(a, b) {
  const x = new Date(a + 'T00:00:00Z'), y = new Date(b + 'T00:00:00Z')
  if (isNaN(x) || isNaN(y) || y < x) return 1
  // Inclusive days over the average month length (365.25 / 12), so a calendar
  // month, a quarter or a year counts 1, 3 or 12 whatever day it starts on.
  const days = Math.round((y - x) / 86400000) + 1
  return Math.max(1, Math.round(days / 30.4375))
}
