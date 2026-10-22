// ---------------------------------------------------------------------------
// WorkCoPilot - company invoice / statement PDF (pdfkit).
// ---------------------------------------------------------------------------
// Pure rendering: takes a statement from store.companyBilling(companyId) and
// writes a branded PDF to a stream. It never charges anything; it is the
// document the operator sends or files. No em dashes; American English.
// ---------------------------------------------------------------------------
import PDFDocument from 'pdfkit'

const ACCENT = '#1f7a4d'      // WorkCoPilot green
const INK = '#1a1a1a'
const MUTE = '#666666'
const LINE = '#e3e8e4'

function money(currency, n) {
  const v = Number(n) || 0
  const sym = (currency || 'usd').toLowerCase() === 'usd' ? '$' : ''
  return `${sym}${v.toFixed(2)}${sym ? '' : ' ' + String(currency || '').toUpperCase()}`
}

// Build the invoice into a PDFDocument and return it. The caller pipes it to a
// response (or a file) and the document is already ended.
export function buildCompanyInvoice(statement, { invoiceNumber = null, issuer = null } = {}) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
  const cur = statement.currency || 'usd'
  const left = 50
  const right = 562 // 612 page width - 50 margin
  const num = invoiceNumber || `WCP-${String(statement.companyId || '').replace(/[^a-z0-9]/gi, '').toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

  // Header
  doc.fillColor(ACCENT).fontSize(22).font('Helvetica-Bold').text('WorkCoPilot', left, 50)
  doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('Read-only, screen-aware work guidance', left, 76)
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text('Invoice / Statement', 0, 52, { align: 'right' })
  doc.fillColor(MUTE).fontSize(9).font('Helvetica')
    .text(`Invoice: ${num}`, 0, 74, { align: 'right' })
    .text(`Date: ${new Date(statement.generatedAt || Date.now()).toISOString().slice(0, 10)}`, { align: 'right' })
  if (issuer && issuer.name) doc.text(issuer.name, { align: 'right' })

  doc.moveTo(left, 102).lineTo(right, 102).strokeColor(ACCENT).lineWidth(2).stroke()

  // Bill to
  const p = statement.profile || {}
  let y = 120
  doc.fillColor(MUTE).fontSize(9).font('Helvetica-Bold').text('BILL TO', left, y)
  y += 15
  doc.fillColor(INK).fontSize(12).font('Helvetica-Bold').text(statement.name || 'Company', left, y)
  y += 17
  doc.fillColor(INK).fontSize(10).font('Helvetica')
  const addrParts = []
  if (p.contactPerson) addrParts.push(p.contactPerson)
  if (p.address) addrParts.push(p.address)
  const cityLine = [p.city, p.state, p.postalCode].filter(Boolean).join(', ')
  if (cityLine) addrParts.push(cityLine)
  if (p.country) addrParts.push(p.country)
  if (p.billingEmail || p.email) addrParts.push(p.billingEmail || p.email)
  if (p.phone) addrParts.push(p.phone)
  for (const linePart of addrParts) { doc.text(linePart, left, y); y += 14 }
  if (!addrParts.length) { doc.fillColor(MUTE).text('No billing details on file.', left, y); y += 14 }

  // Table
  y = Math.max(y + 16, 230)
  const cols = { desc: left, qty: 360, unit: 420, amount: 500 }
  doc.fillColor(MUTE).fontSize(9).font('Helvetica-Bold')
  doc.text('DESCRIPTION', cols.desc, y)
  doc.text('QTY', cols.qty, y, { width: 50, align: 'right' })
  doc.text('UNIT', cols.unit, y, { width: 60, align: 'right' })
  doc.text('AMOUNT', cols.amount, y, { width: 62, align: 'right' })
  y += 14
  doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke()
  y += 8

  const row = (desc, qty, unit, amount) => {
    doc.fillColor(INK).fontSize(10).font('Helvetica')
    doc.text(desc, cols.desc, y, { width: 300 })
    doc.text(qty != null ? String(qty) : '', cols.qty, y, { width: 50, align: 'right' })
    doc.text(unit != null ? money(cur, unit) : '', cols.unit, y, { width: 60, align: 'right' })
    doc.text(money(cur, amount), cols.amount, y, { width: 62, align: 'right' })
    y += 20
    if (y > 700) { doc.addPage(); y = 60 }
  }

  const lines = [...(statement.seatLines || []), ...(statement.ledger || [])]
  if (!lines.length) { doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('No charges this period.', cols.desc, y); y += 20 }
  for (const l of lines) row(l.description || l.type || 'Charge', l.qty, l.unitAmount, l.amount)

  // Totals
  y += 6
  doc.moveTo(360, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke()
  y += 10
  const totalRow = (label, amount, bold) => {
    doc.fillColor(bold ? INK : MUTE).fontSize(bold ? 12 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
    doc.text(label, 360, y, { width: 100, align: 'right' })
    doc.text(money(cur, amount), cols.amount, y, { width: 62, align: 'right' })
    y += bold ? 22 : 18
  }
  totalRow('Recurring', statement.recurringTotal)
  totalRow('Extras', statement.extrasTotal)
  totalRow('Total', statement.total, true)

  // Footer
  doc.fillColor(MUTE).fontSize(8).font('Helvetica')
    .text('This statement reflects the current roster and recorded charges. Seat charges are computed from active licenses. Thank you for using WorkCoPilot.', left, 740, { width: right - left, align: 'center' })

  doc.end()
  return doc
}

export default { buildCompanyInvoice }
