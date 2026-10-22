// Renders the WorkCoPilot Security and Privacy paper (docs/security-paper-content.mjs)
// to a branded PDF and to Markdown. Run from the repo root:
//   node docs/gen-security-paper.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import { META, BLOCKS } from './security-paper-content.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const OUT_PDF = path.join(__dir, 'WorkCoPilot-Security-and-Privacy.pdf')
const OUT_MD = path.join(__dir, 'WorkCoPilot-Security-and-Privacy.md')

const ACCENT = '#1f7a4d', INK = '#1a1a1a', MUTE = '#555555', LINE = '#dde3df', CALL = '#eef5f0', CODEBG = '#f4f6f5'

// ---------------------------------------------------------------- PDF --------
function renderPdf() {
  const doc = new PDFDocument({ size: 'LETTER', margin: 56, bufferPages: true })
  const stream = fs.createWriteStream(OUT_PDF)
  doc.pipe(stream)
  const L = doc.page.margins.left, R = doc.page.width - doc.page.margins.right, W = R - L
  const TOP = () => doc.page.margins.top
  const BOTTOM = () => doc.page.height - doc.page.margins.bottom
  // doc.y is the ONE cursor. need(h) starts a fresh page only when the element
  // would not fit, and never relies on pdfkit's own auto-pagination (every text
  // call passes lineBreak implicitly but we measure first so nothing overflows).
  const need = (h) => { if (doc.y + h > BOTTOM()) doc.addPage() }
  const textH = (t, opts) => doc.heightOfString(String(t), opts)

  // Cover page
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(30).text(META.product, L, 150, { width: W })
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(META.title, L, doc.y + 6, { width: W })
  doc.fillColor(MUTE).font('Helvetica').fontSize(13).text(META.subtitle, L, doc.y + 6, { width: W })
  doc.moveTo(L, doc.y + 18).lineTo(R, doc.y + 18).strokeColor(ACCENT).lineWidth(2).stroke()
  doc.fillColor(MUTE).fontSize(11).text(`${META.org}    |    ${META.version}    |    ${META.date}`, L, doc.y + 28, { width: W })
  doc.addPage()

  const para = (t, { color = INK, size = 10.5, font = 'Helvetica', gap = 8 } = {}) => {
    doc.font(font).fontSize(size)
    const h = textH(t, { width: W, lineGap: 2.5 })
    need(h)
    doc.fillColor(color).text(t, L, doc.y, { width: W, lineGap: 2.5 })
    doc.y += gap
  }
  const heading = (t, lvl) => {
    const size = lvl === 1 ? 15 : lvl === 2 ? 12.5 : 11
    const before = lvl === 1 ? 16 : 10
    doc.font('Helvetica-Bold').fontSize(size)
    const h = textH(t, { width: W })
    need(before + h + 6)
    doc.y += before
    if (lvl === 1) { doc.moveTo(L, doc.y - 6).lineTo(L + 26, doc.y - 6).strokeColor(ACCENT).lineWidth(2.5).stroke() }
    doc.fillColor(lvl === 1 ? ACCENT : INK).font('Helvetica-Bold').fontSize(size).text(t, L, doc.y, { width: W })
    doc.y += 6
  }
  const bullets = (items, ordered) => {
    items.forEach((it, i) => {
      const marker = ordered ? `${i + 1}.` : '•'
      const tw = W - 16
      doc.font('Helvetica').fontSize(10.5)
      const h = textH(it, { width: tw, lineGap: 2.5 })
      need(h + 5)
      const sy = doc.y
      doc.fillColor(ACCENT).font('Helvetica-Bold').text(marker, L, sy, { width: 14 })
      doc.fillColor(INK).font('Helvetica').text(it, L + 16, sy, { width: tw, lineGap: 2.5 })
      doc.y = sy + h + 5
    })
    doc.y += 3
  }
  const kv = (pairs) => {
    pairs.forEach(([k, v]) => {
      doc.font('Helvetica-Bold').fontSize(10.5)
      const kh = textH(k, { width: 120 })
      doc.font('Helvetica').fontSize(10.5)
      const vh = textH(v, { width: W - 132, lineGap: 2.5 })
      const h = Math.max(kh, vh)
      need(h + 8)
      const sy = doc.y
      doc.fillColor(ACCENT).font('Helvetica-Bold').text(k, L, sy, { width: 120 })
      doc.fillColor(INK).font('Helvetica').text(v, L + 132, sy, { width: W - 132, lineGap: 2.5 })
      doc.y = sy + h + 8
    })
  }
  const callout = (title, body) => {
    const pad = 12, iw = W - pad * 2
    doc.font('Helvetica-Bold').fontSize(10.5)
    const th = textH(title, { width: iw })
    doc.font('Helvetica').fontSize(10)
    const bh = textH(body, { width: iw, lineGap: 2.5 })
    const h = th + bh + pad * 2 + 6
    need(h + 10)
    const sy = doc.y
    doc.roundedRect(L, sy, W, h, 8).fillColor(CALL).fill()
    doc.roundedRect(L, sy, 4, h, 2).fillColor(ACCENT).fill()
    doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(10.5).text(title, L + pad, sy + pad, { width: iw })
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(body, L + pad, sy + pad + th + 6, { width: iw, lineGap: 2.5 })
    doc.y = sy + h + 10
  }
  const code = (t) => {
    const pad = 10, iw = W - pad * 2
    doc.font('Courier').fontSize(9.5)
    const h = textH(t, { width: iw, lineGap: 2 }) + pad * 2
    need(h + 8)
    const sy = doc.y
    doc.roundedRect(L, sy, W, h, 6).fillColor(CODEBG).fill()
    doc.fillColor('#0b3d26').font('Courier').fontSize(9.5).text(t, L + pad, sy + pad, { width: iw, lineGap: 2 })
    doc.y = sy + h + 8
  }
  const table = (head, rows) => {
    const n = head.length
    const weights = n === 2 ? [1, 2.2] : n === 3 ? [1.1, 1.5, 1] : head.map(() => 1)
    const tot = weights.reduce((a, b) => a + b, 0)
    const cw = weights.map((w) => (W * w) / tot)
    const x0 = (i) => L + cw.slice(0, i).reduce((a, b) => a + b, 0)
    const pad = 7
    const rowH = (cells, font, size) => {
      doc.font(font).fontSize(size)
      return Math.max(...cells.map((c, i) => textH(c, { width: cw[i] - pad * 2, lineGap: 2 }))) + pad * 2
    }
    const drawRow = (cells, header) => {
      const font = header ? 'Helvetica-Bold' : 'Helvetica'
      const h = rowH(cells, font, 9.5)
      need(h)
      const sy = doc.y
      doc.rect(L, sy, W, h).fillColor(header ? ACCENT : '#ffffff').fill()
      cells.forEach((c, i) => {
        doc.fillColor(header ? '#ffffff' : INK).font(font).fontSize(9.5)
        doc.text(String(c), x0(i) + pad, sy + pad, { width: cw[i] - pad * 2, lineGap: 2 })
      })
      doc.strokeColor(LINE).lineWidth(0.5)
      doc.moveTo(L, sy + h).lineTo(R, sy + h).stroke()
      for (let i = 1; i < n; i++) { doc.moveTo(x0(i), sy).lineTo(x0(i), sy + h).stroke() }
      doc.y = sy + h
    }
    need(40)
    drawRow(head, true)
    rows.forEach((r) => drawRow(r, false))
    doc.y += 10
  }

  for (const b of BLOCKS) {
    if (b.h1) heading(b.h1, 1)
    else if (b.h2) heading(b.h2, 2)
    else if (b.h3) heading(b.h3, 3)
    else if (b.p) para(b.p)
    else if (b.ul) bullets(b.ul, false)
    else if (b.ol) bullets(b.ol, true)
    else if (b.kv) kv(b.kv)
    else if (b.callout) callout(b.callout.title, b.callout.body)
    else if (b.code) code(b.code)
    else if (b.table) table(b.table.head, b.table.rows)
    else if (b.hr) { need(16); doc.moveTo(L, doc.y + 4).lineTo(R, doc.y + 4).strokeColor(LINE).lineWidth(1).stroke(); doc.y += 16 }
  }

  console.log('pages:', doc.bufferedPageRange().count)
  doc.end()
  return new Promise((res) => stream.on('finish', res))
}

// ---------------------------------------------------------------- Markdown ---
function renderMd() {
  const esc = (s) => String(s)
  const lines = [`# ${META.product} — ${META.title}`, '', `*${META.subtitle}*`, '', `${META.org}  |  ${META.version}  |  ${META.date}`, '']
  for (const b of BLOCKS) {
    if (b.h1) lines.push('', `## ${b.h1}`, '')
    else if (b.h2) lines.push('', `### ${b.h2}`, '')
    else if (b.h3) lines.push('', `#### ${b.h3}`, '')
    else if (b.p) lines.push(esc(b.p), '')
    else if (b.ul) { b.ul.forEach((i) => lines.push(`- ${esc(i)}`)); lines.push('') }
    else if (b.ol) { b.ol.forEach((i, k) => lines.push(`${k + 1}. ${esc(i)}`)); lines.push('') }
    else if (b.kv) { b.kv.forEach(([k, v]) => lines.push(`**${esc(k)}:** ${esc(v)}`, '')) }
    else if (b.callout) lines.push(`> **${esc(b.callout.title)}.** ${esc(b.callout.body)}`, '')
    else if (b.code) lines.push('```', b.code, '```', '')
    else if (b.table) {
      lines.push(`| ${b.table.head.join(' | ')} |`)
      lines.push(`| ${b.table.head.map(() => '---').join(' | ')} |`)
      b.table.rows.forEach((r) => lines.push(`| ${r.map((c) => esc(c).replace(/\|/g, '\\|')).join(' | ')} |`))
      lines.push('')
    } else if (b.hr) lines.push('---', '')
  }
  fs.writeFileSync(OUT_MD, lines.join('\n').replace(/\n{3,}/g, '\n\n'))
}

await renderPdf()
renderMd()
const kb = (fs.statSync(OUT_PDF).size / 1024).toFixed(0)
console.log(`PDF  -> ${OUT_PDF} (${kb} KB)`)
console.log(`MD   -> ${OUT_MD}`)
