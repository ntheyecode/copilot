// ---------------------------------------------------------------------------
// WorkCoPilot - company invoice / statement PDF (pdfkit).
// ---------------------------------------------------------------------------
// Pure rendering: takes a statement from store.companyBilling(companyId) and
// writes a branded PDF to a stream. It never charges anything; it is the
// document the operator sends or files. No em dashes; American English.
//
// Layout rules (every one of these was a real defect):
//   * Every text block is MEASURED (heightOfString) before the cursor advances,
//     so a long description, a long address line or a long company name wraps
//     without printing over the next line.
//   * A row, the totals block and the footer each check for room first and
//     start a new page when needed, so a long ledger paginates cleanly and the
//     totals never land on top of the footer.
//   * Money is formatted with thousands separators and two decimals; huge or
//     non-finite inputs render as 0.00 rather than "1e+21" or "NaN".
//   * Profile text is plain text to pdfkit (no markup), so nothing injected into
//     a profile field can change the layout; it is also length-capped upstream.
// ---------------------------------------------------------------------------
import PDFDocument from 'pdfkit'

const ACCENT = '#1f7a4d'      // WorkCoPilot green
const INK = '#1a1a1a'
const MUTE = '#666666'
const LINE = '#e3e8e4'

const PAGE_W = 612           // US Letter
const PAGE_H = 792
const MARGIN = 50
const LEFT = MARGIN
const RIGHT = PAGE_W - MARGIN
const CONTENT_W = RIGHT - LEFT
// The footer is two lines of 8pt text; it must END above the bottom margin
// (PAGE_H - MARGIN), or pdfkit's own overflow handling would add a page while we
// are writing footers onto buffered pages.
const FOOTER_Y = PAGE_H - MARGIN - 26  // where the footer text starts
const BODY_BOTTOM = FOOTER_Y - 18      // last usable y for body content

export function money(currency, n) {
  let v = Number(n)
  if (!Number.isFinite(v)) v = 0
  const neg = v < 0
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const cur = String(currency || 'usd').toLowerCase()
  const body = cur === 'usd' ? `$${abs}` : `${abs} ${cur.toUpperCase()}`
  return neg ? `-${body}` : body
}

// One line of plain text, never undefined/null, never a non-string.
function txt(v, fallback = '') {
  if (v == null) return fallback
  const s = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  return s || fallback
}

function isoDate(v) {
  const d = v ? new Date(v) : new Date()
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

// Build the invoice into a PDFDocument and return it. The caller pipes it to a
// response (or a file) and the document is already ended.
// `b2b` (optional): an invoice AdmireVeda issues under a company's contract
// ({ periodStart, periodEnd, dueDate, status, notes }): titled Invoice, with the
// service period, the due date and one Total. Without it the layout is the
// statement exactly as before.
export function buildCompanyInvoice(statement, { invoiceNumber = null, issuer = null, b2b = null } = {}) {
  const st = statement || {}
  // autoFirstPage on, but we drive the cursor ourselves (absolute x/y) and add
  // pages explicitly, so pdfkit's own overflow paging never fires mid-row.
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, bufferPages: true })
  const cur = st.currency || 'usd'
  const num = txt(invoiceNumber) || `WCP-${txt(st.companyId).replace(/[^a-z0-9]/gi, '').toUpperCase() || 'X'}-${isoDate(st.generatedAt).replace(/-/g, '')}`

  let y = 50
  const ensureRoom = (h) => { if (y + h > BODY_BOTTOM) { doc.addPage(); y = 60 } }
  const measure = (text, width, fontSize, font) => {
    doc.fontSize(fontSize).font(font)
    return doc.heightOfString(text, { width })
  }

  // Header
  doc.fillColor(ACCENT).fontSize(22).font('Helvetica-Bold').text('WorkCoPilot', LEFT, 50, { width: 260, lineBreak: false })
  doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('Read-only, screen-aware work guidance', LEFT, 76, { width: 260, lineBreak: false })
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text(b2b ? 'Invoice' : 'Invoice / Statement', LEFT, 52, { width: CONTENT_W, align: 'right' })
  doc.fillColor(MUTE).fontSize(9).font('Helvetica')
  doc.text(`Invoice: ${num}`, LEFT, 74, { width: CONTENT_W, align: 'right', lineBreak: false })
  doc.text(`Date: ${isoDate(st.generatedAt)}`, LEFT, 85, { width: CONTENT_W, align: 'right', lineBreak: false })
  if (issuer && txt(issuer.name)) doc.text(txt(issuer.name), LEFT, 96, { width: CONTENT_W, align: 'right', lineBreak: false })
  if (b2b) {
    // Service period, due date and status sit under the bill-to block (right column).
    doc.fillColor(MUTE).fontSize(9).font('Helvetica')
    doc.text(`Service period: ${txt(b2b.periodStart)} to ${txt(b2b.periodEnd)}`, LEFT, 126, { width: CONTENT_W, align: 'right', lineBreak: false })
    doc.text(`Due: ${txt(b2b.dueDate)}`, LEFT, 137, { width: CONTENT_W, align: 'right', lineBreak: false })
    doc.text(`Status: ${txt(b2b.status)}`, LEFT, 148, { width: CONTENT_W, align: 'right', lineBreak: false })
  }

  doc.moveTo(LEFT, 110).lineTo(RIGHT, 110).strokeColor(ACCENT).lineWidth(2).stroke()

  // Bill to (measured: long names and addresses wrap instead of overprinting)
  const p = st.profile || {}
  y = 126
  doc.fillColor(MUTE).fontSize(9).font('Helvetica-Bold').text('BILL TO', LEFT, y)
  y += 15
  const billW = 300
  const name = txt(st.name, 'Company')
  const nameH = measure(name, billW, 12, 'Helvetica-Bold')
  doc.fillColor(INK).fontSize(12).font('Helvetica-Bold').text(name, LEFT, y, { width: billW })
  y += nameH + 5
  const addrParts = []
  if (txt(p.contactPerson)) addrParts.push(txt(p.contactPerson))
  if (txt(p.address)) addrParts.push(txt(p.address))
  const cityLine = [p.city, p.state, p.postalCode].map((x) => txt(x)).filter(Boolean).join(', ')
  if (cityLine) addrParts.push(cityLine)
  if (txt(p.country)) addrParts.push(txt(p.country))
  if (txt(p.billingEmail) || txt(p.email)) addrParts.push(txt(p.billingEmail) || txt(p.email))
  if (txt(p.phone)) addrParts.push(txt(p.phone))
  doc.fillColor(INK)
  for (const linePart of addrParts) {
    const h = measure(linePart, billW, 10, 'Helvetica')
    doc.fillColor(INK).fontSize(10).font('Helvetica').text(linePart, LEFT, y, { width: billW })
    y += h + 2
  }
  if (!addrParts.length) { doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('No billing details on file.', LEFT, y); y += 14 }

  // Table. Numeric columns are wide enough for "$1,234,567.89" at 10pt, and a
  // cell that is still too wide is shrunk to fit (never wrapped: pdfkit wraps on
  // `width` even with lineBreak:false, which used to split "$1,234,567.8|9").
  y = Math.max(y + 16, 236)
  const cols = { desc: LEFT, qty: 322, unit: 372, amount: 452 }
  const widths = { desc: 264, qty: 44, unit: 72, amount: 110 }
  const cell = (text, x, width, size, font, color) => {
    let s = size
    doc.font(font)
    while (s > 6 && doc.fontSize(s).widthOfString(text) > width) s -= 0.5
    doc.fillColor(color).fontSize(s).font(font).text(text, x, y, { width, align: 'right', lineBreak: false })
  }
  const header = () => {
    doc.fillColor(MUTE).fontSize(9).font('Helvetica-Bold')
    doc.text('DESCRIPTION', cols.desc, y, { width: widths.desc, lineBreak: false })
    doc.text('QTY', cols.qty, y, { width: widths.qty, align: 'right', lineBreak: false })
    doc.text('UNIT', cols.unit, y, { width: widths.unit, align: 'right', lineBreak: false })
    doc.text('AMOUNT', cols.amount, y, { width: widths.amount, align: 'right', lineBreak: false })
    y += 14
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke()
    y += 8
  }
  header()

  const row = (desc, qty, unit, amount) => {
    const d = txt(desc, 'Charge')
    const h = Math.max(12, measure(d, widths.desc, 10, 'Helvetica'))
    if (y + h + 8 > BODY_BOTTOM) { doc.addPage(); y = 60; header() }
    doc.fillColor(INK).fontSize(10).font('Helvetica')
    doc.text(d, cols.desc, y, { width: widths.desc })
    const q = Number(qty)
    const u = Number(unit)
    const a = Number(amount)
    // An amount-only item (a flat fee or credit entered as a total) has no
    // meaningful qty x unit, so those cells stay blank instead of "1  $0.00".
    const priced = Number.isFinite(q) && Number.isFinite(u) && (u !== 0 || Math.abs(a - q * u) < 0.005)
    cell(priced ? String(q) : '', cols.qty, widths.qty, 10, 'Helvetica', INK)
    cell(priced ? money(cur, u) : '', cols.unit, widths.unit, 10, 'Helvetica', INK)
    cell(money(cur, amount), cols.amount, widths.amount, 10, 'Helvetica', INK)
    y += h + 8
  }

  const lines = [...(Array.isArray(st.seatLines) ? st.seatLines : []), ...(Array.isArray(st.ledger) ? st.ledger : [])]
  if (!lines.length) { doc.fillColor(MUTE).fontSize(10).font('Helvetica').text('No charges this period.', cols.desc, y); y += 20 }
  for (const l of lines) row((l && (l.description || l.type)) || 'Charge', l && l.qty, l && l.unitAmount, l && l.amount)

  // Totals (kept together; moved to a new page as a block when they do not fit)
  ensureRoom(6 + 10 + 18 + 18 + 22)
  y += 6
  doc.moveTo(330, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke()
  y += 10
  const totalRow = (label, amount, bold) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica'
    const color = bold ? INK : MUTE
    doc.fillColor(color).fontSize(bold ? 12 : 10).font(font).text(label, 330, y, { width: 112, align: 'right', lineBreak: false })
    cell(money(cur, amount), cols.amount, widths.amount, bold ? 12 : 10, font, color)
    y += bold ? 22 : 18
  }
  if (!b2b) {
    totalRow('Recurring', st.recurringTotal)
    totalRow('Extras', st.extrasTotal)
  }
  totalRow('Total', st.total, true)
  if (b2b && txt(b2b.notes)) {
    const n = txt(b2b.notes)
    const h = measure(n, CONTENT_W, 9, 'Helvetica')
    ensureRoom(h + 10)
    doc.fillColor(MUTE).fontSize(9).font('Helvetica').text(n, LEFT, y + 4, { width: CONTENT_W })
    y += h + 10
  }

  // Footer on EVERY page (with page numbers), drawn last via bufferPages.
  const range = doc.bufferedPageRange()
  const pages = range.count
  for (let i = 0; i < pages; i++) {
    doc.switchToPage(range.start + i)
    doc.fillColor(MUTE).fontSize(8).font('Helvetica')
    doc.text(b2b
      ? 'Issued by AdmireVeda under your company contract. Payment terms are those in your contract. Thank you for using WorkCoPilot.'
      : 'This statement reflects the current roster and recorded charges. Seat charges are computed from active licenses. Thank you for using WorkCoPilot.', LEFT, FOOTER_Y, { width: CONTENT_W - 70, align: 'left' })
    doc.text(`Page ${i + 1} of ${pages}`, RIGHT - 60, FOOTER_Y, { width: 60, align: 'right', lineBreak: false })
  }
  doc.pageCount = pages   // for callers and tests; the stream itself is unchanged

  doc.end()
  return doc
}

export default { buildCompanyInvoice, money }
