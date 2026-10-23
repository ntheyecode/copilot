// ---------------------------------------------------------------------------
// WorkCoPilot - guided session -> PDF
//
// Streamed straight to the HTTP response, so a long session never has to be
// buffered in memory on a small server.
//
// Step detail may contain fenced code blocks (commands / file contents). Prose
// is set in Helvetica; code is set in Courier on a tinted panel so it stays
// readable and copy-pasteable out of the PDF.
// ---------------------------------------------------------------------------
import PDFDocument from 'pdfkit'
import { readShotBuffer } from './store.js'   // decrypts the at-rest encrypted shot bytes

const INK = '#1a1a1a'
const MUTED = '#6b7280'
const ACCENT = '#2f6f3e'
const CODE_BG = '#f4f5f7'

// Split a block into prose and fenced-code segments, in order.
function segments(text) {
  const out = []
  const re = /```[ \t]*([A-Za-z0-9+#._-]*)[ \t]*\r?\n([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', body: text.slice(last, m.index) })
    out.push({ type: 'code', lang: m[1] || '', body: m[2].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  if (last < text.length) out.push({ type: 'text', body: text.slice(last) })
  return out.filter((s) => s.body.trim())
}

// ---- WorkCoPilot session report -> PDF ------------------------------------
// A keepable record of a guided session: the task, every step in detail (with
// the exact commands/code), what was achieved, any warnings, and the on-demand
// questions/analysis. Streamed straight to the response.
export function buildWorkReportPdf(session, stream, { achieved = '', modeLabel = '' } = {}) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 60, bottom: 60, left: 60, right: 60 }, bufferPages: true })
  doc.pipe(stream)
  const W = doc.page.width - 120
  const steps = Array.isArray(session.steps) ? session.steps : []
  const doneN = steps.filter((s) => s.status === 'done').length
  const started = session.startedAt ? new Date(session.startedAt) : null

  // Phase 3: per-step screenshots. Group session.shots by stepIndex so each
  // step can show its own captures beneath it, ordered by capture time ('at').
  // A session with no shots renders exactly as before.
  const shotsByStep = new Map()
  for (const sh of (Array.isArray(session.shots) ? session.shots : [])) {
    if (!sh || typeof sh !== 'object' || !sh.path) continue
    const k = Number(sh.stepIndex)
    if (!Number.isInteger(k)) continue
    if (!shotsByStep.has(k)) shotsByStep.set(k, [])
    shotsByStep.get(k).push(sh)
  }
  for (const arr of shotsByStep.values()) {
    arr.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
  }

  const rule = () => { doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#d8dbe0').lineWidth(1).stroke() }
  const heading = (t) => {
    if (doc.y + 60 > doc.page.height - 60) doc.addPage()
    doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t); doc.moveDown(0.3)
  }
  const prose = (text, { size = 11, color = INK } = {}) => {
    for (const seg of segments(String(text || ''))) {
      if (seg.type === 'code') codeBlock(doc, seg.body)
      else { doc.font('Helvetica').fontSize(size).fillColor(color).text(seg.body.trim(), { width: W }); doc.moveDown(0.4) }
    }
  }
  const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString() } catch { return '' } }

  // Title
  doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('WorkCoPilot session report')
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(
    [session.title, started ? started.toLocaleString() : null, session.appContext ? ('App: ' + session.appContext) : null, modeLabel ? ('Guide style: ' + modeLabel) : null]
      .filter(Boolean).join('   -   '), { width: W })
  doc.moveDown(0.4); rule(); doc.moveDown(0.6)

  // The task
  heading('The task')
  doc.font('Helvetica').fontSize(11).fillColor(INK).text(session.goal || '(no goal recorded)', { width: W })

  // What was achieved
  heading('What was achieved')
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`${doneN} of ${steps.length} step${steps.length === 1 ? '' : 's'} completed.`, { width: W })
  doc.moveDown(0.2)
  if (String(achieved || '').trim()) prose(achieved)
  else if (doneN > 0) prose(steps.filter((s) => s.status === 'done').map((s) => '- ' + s.text).join('\n'), { size: 10 })
  else doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No steps were confirmed done yet.', { width: W })

  // Outcome: a reference document states plainly whether the task finished, or
  // where it stopped and why (a strong failure), with no padding.
  {
    const ended = session.status === 'ended'
    const allDone = steps.length > 0 && doneN === steps.length
    let reached = -1
    steps.forEach((s, i) => { if (s.status === 'done') reached = i })
    if (reached < 0) reached = steps.findIndex((s) => s.status === 'current')
    const lastFlag = [...(session.events || [])].reverse().find((e) => e.kind === 'flag')
    doc.moveDown(0.2)
    if (allDone) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text('Outcome: every planned step was confirmed on screen.', { width: W })
    } else if (ended) {
      const where = reached >= 0 ? `Reached step ${reached + 1} of ${steps.length}: ${steps[reached].text}` : 'No step was confirmed.'
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Outcome: this session ended before finishing.', { width: W })
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(where, { width: W })
      if (lastFlag && lastFlag.text) doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Last issue flagged: ' + String(lastFlag.text), { width: W })
    }
  }

  // Steps in detail
  heading('Steps, in detail')
  if (!steps.length) doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No steps were planned.', { width: W })
  steps.forEach((s, i) => {
    if (doc.y + 50 > doc.page.height - 60) doc.addPage()
    const mark = s.status === 'done' ? '[done]' : s.status === 'current' ? '[in progress]' : '[not done]'
    doc.font('Helvetica-Bold').fontSize(11).fillColor(s.status === 'done' ? ACCENT : INK).text(`${i + 1}. ${s.text}   ${mark}`, { width: W })
    if (s.url) doc.font('Helvetica').fontSize(9).fillColor(ACCENT).text('Open: ' + s.url, { width: W, link: s.url, underline: true })
    if (s.validate) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Done when: ' + s.validate, { width: W })
    if (s.status === 'done' && s.doneAt) doc.font('Helvetica').fontSize(9).fillColor(ACCENT).text('Confirmed on screen: ' + fmtWhen(s.doneAt), { width: W })
    if (Array.isArray(s.commands) && s.commands.length) codeBlock(doc, s.commands.map((c) => '$ ' + c).join('\n'))
    if (s.code && s.code.content) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('File: ' + (s.code.file || 'code'), { width: W })
      codeBlock(doc, s.code.content)
    }
    stepShots(doc, shotsByStep.get(i), W)
    doc.moveDown(0.5)
  })

  // Notes and warnings
  const flags = (session.events || []).filter((e) => e.kind === 'flag')
  if (flags.length) {
    heading('Notes and warnings')
    for (const f of flags) { if (doc.y + 24 > doc.page.height - 60) doc.addPage(); doc.font('Helvetica').fontSize(10).fillColor(INK).text('- ' + String(f.text || ''), { width: W }); doc.moveDown(0.2) }
  }

  // Questions and analysis (on-demand asks/answers, in order)
  const qa = (session.events || []).filter((e) => e.kind === 'ask' || e.kind === 'answer')
  if (qa.length) {
    heading('Questions and analysis')
    for (const e of qa) {
      if (doc.y + 30 > doc.page.height - 60) doc.addPage()
      if (e.kind === 'ask') { doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text('Q: ' + String(e.text || ''), { width: W }); doc.moveDown(0.15) }
      else prose(e.text, { size: 10 })
    }
  }

  // Closing disclaimer: a practical work record, not professional advice.
  doc.moveDown(1)
  if (doc.y + 46 > doc.page.height - 60) doc.addPage()
  rule(); doc.moveDown(0.3)
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED).text(
    'This report is a record of guided work to help you act. It is not legal, financial, medical or other professional advice. Verify anything you rely on against your own requirements and a qualified professional. WorkCoPilot provides controls and evidence; it does not make you compliant or certified.',
    { width: W })

  // Page numbers
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      `WorkCoPilot  -  Page ${i + 1} of ${range.count}`, 60, doc.page.height - 42,
      { width: W, align: 'center' })
  }
  doc.end()
}

// Render the screenshots captured for one step, beneath that step. Each image
// is fitted to the content width and a sensible max height so the PDF stays
// small, with its caption (if any) in the muted small style. A missing or
// unreadable file is skipped in a try/catch so a lost shot can never break the
// report. Images near the page bottom move to the next page.
function stepShots(doc, shots, W) {
  if (!Array.isArray(shots) || !shots.length) return
  const MAX_H = 220
  const bottom = doc.page.height - doc.page.margins.bottom
  for (const shot of shots) {
    try {
      const bytes = readShotBuffer(shot.path)   // decrypted Buffer (handles legacy plaintext too)
      if (!bytes) continue
      const img = doc.openImage(bytes)
      const scale = Math.min(W / img.width, MAX_H / img.height, 1)
      const drawH = img.height * scale
      // Page-break BEFORE drawing so the image never runs off the page edge.
      if (doc.y + drawH + 16 > bottom) doc.addPage()
      doc.image(bytes, { fit: [W, MAX_H], align: 'center' })
      doc.moveDown(0.2)
      const cap = shot.caption != null ? String(shot.caption).trim() : ''
      if (cap) {
        if (doc.y + 14 > bottom) doc.addPage()
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(cap, { width: W, align: 'center' })
      }
      doc.moveDown(0.3)
    } catch {
      // Missing or unreadable image: skip it, keep the report intact.
    }
  }
}

// ---- Review deliverables -> PDF -------------------------------------------
// The engagement document: understanding, architecture + security issues, and
// the two generation prompts, streamed straight to the response.
export function buildDeliverablesPdf(d = {}, goal = '', stream) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 60, bottom: 60, left: 60, right: 60 }, bufferPages: true })
  doc.pipe(stream)
  const W = doc.page.width - 120
  const rule = () => { doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#d8dbe0').lineWidth(1).stroke() }
  const heading = (t) => { if (doc.y + 60 > doc.page.height - 60) doc.addPage(); doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t); doc.moveDown(0.3) }
  doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('WorkCoPilot review and generation prompts')
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(new Date().toLocaleString(), { width: W })
  doc.moveDown(0.4); rule(); doc.moveDown(0.6)
  heading('Goal'); doc.font('Helvetica').fontSize(11).fillColor(INK).text(String(goal || '(none)'), { width: W })
  if (d.summary) { heading('Understanding'); doc.font('Helvetica').fontSize(11).fillColor(INK).text(String(d.summary), { width: W }) }
  const issues = (title, arr, withCtrl) => {
    if (!Array.isArray(arr) || !arr.length) return
    heading(title)
    for (const a of arr) {
      if (doc.y + 44 > doc.page.height - 60) doc.addPage()
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(String(a.severity || '') + '  -  ' + String(a.issue || ''), { width: W })
      if (withCtrl && a.control) doc.font('Helvetica').fontSize(9).fillColor(ACCENT).text('Control: ' + String(a.control), { width: W })
      if (a.fix) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Fix: ' + String(a.fix), { width: W })
      doc.moveDown(0.3)
    }
  }
  issues('Architecture issues', d.architecture, false)
  issues('Security issues', d.security, true)
  heading('Prompt 1 - current design, with the problems marked'); codeBlock(doc, String(d.promptIssues || '(none)'))
  heading('Prompt 2 - recommended corrected design'); codeBlock(doc, String(d.promptTarget || '(none)'))
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('WorkCoPilot  -  Page ' + (i + 1) + ' of ' + range.count, 60, doc.page.height - 42, { width: W, align: 'center' })
  }
  doc.end()
}

// ---- Compliance report -> PDF ---------------------------------------------
// A RELEVANT, evidence-backed record for a company admin (or the operator): the
// controls WorkCoPilot enforced on this task, how each was satisfied (the
// response), and the evidence behind it - then the execution evidence itself
// (confirmed steps with timestamps + scrubbed milestone screenshots). Honest by
// construction: every response is grounded in real session data (SUPREME RULE
// III). Streamed straight to the response.
const AMBER = '#b8860b'
export function buildComplianceReportPdf(session, stream, { evidence, company = '', member = '', generatedBy = '', modeLabel = '' } = {}) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 60, bottom: 60, left: 60, right: 60 }, bufferPages: true })
  doc.pipe(stream)
  const W = doc.page.width - 120
  const steps = Array.isArray(session.steps) ? session.steps : []
  const ev = evidence || { controls: [], posture: { satisfied: 0, partial: 0, na: 0, total: 0 }, evidence: {} }
  const controls = Array.isArray(ev.controls) ? ev.controls : []
  const posture = ev.posture || { satisfied: 0, partial: 0, na: 0, total: controls.length }
  const started = session.startedAt ? new Date(session.startedAt) : null
  const fmtWhen = (iso) => { try { return new Date(iso).toLocaleString() } catch { return '' } }

  // Group shots by step (same as the session report) for the evidence section.
  const shotsByStep = new Map()
  for (const sh of (Array.isArray(session.shots) ? session.shots : [])) {
    if (!sh || typeof sh !== 'object' || !sh.path) continue
    const k = Number(sh.stepIndex); if (!Number.isInteger(k)) continue
    if (!shotsByStep.has(k)) shotsByStep.set(k, [])
    shotsByStep.get(k).push(sh)
  }
  for (const arr of shotsByStep.values()) arr.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))

  const rule = () => { doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#d8dbe0').lineWidth(1).stroke() }
  const heading = (t) => { if (doc.y + 60 > doc.page.height - 60) doc.addPage(); doc.moveDown(0.4); doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t); doc.moveDown(0.3) }
  const statusColor = (st) => st === 'satisfied' ? ACCENT : (st === 'partial' ? AMBER : MUTED)
  const statusLabel = (st) => st === 'satisfied' ? 'SATISFIED' : (st === 'partial' ? 'PARTIAL' : 'N/A')

  // Title + scope
  doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('WorkCoPilot compliance report')
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(
    [company ? ('Organization: ' + company) : null, member ? ('Operator: ' + member) : null,
     started ? ('Task date: ' + started.toLocaleString()) : null,
     ('Report generated: ' + new Date().toLocaleString()), generatedBy ? ('Pulled by: ' + generatedBy) : null,
     ('Session: ' + (session.id || ''))].filter(Boolean).join('   -   '), { width: W })
  doc.moveDown(0.4); rule(); doc.moveDown(0.6)

  // The task
  heading('Task under review')
  doc.font('Helvetica').fontSize(11).fillColor(INK).text(session.goal || '(no goal recorded)', { width: W })
  if (modeLabel) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Guide style: ' + modeLabel, { width: W })

  // Control posture summary
  heading('Control posture')
  doc.font('Helvetica').fontSize(11).fillColor(INK).text(
    `${posture.satisfied} of ${posture.total} controls fully satisfied` +
    (posture.partial ? `, ${posture.partial} partial` : '') +
    (posture.na ? `, ${posture.na} not applicable to this task` : '') + '.', { width: W })
  doc.moveDown(0.2)
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED).text(
    'Each control below shows how WorkCoPilot satisfied it for THIS task, with the evidence behind it. Responses are drawn from the actual session - the audit trail, the operator\'s data-protection settings, and what was confirmed on screen.', { width: W })

  // Controls and responses
  heading('Controls, responses and evidence')
  controls.forEach((c, i) => {
    if (doc.y + 70 > doc.page.height - 60) doc.addPage()
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(`${i + 1}. ${c.name}`, { width: W, continued: true })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor(c.status)).text('    [' + statusLabel(c.status) + ']')
    if (Array.isArray(c.frameworks) && c.frameworks.length) doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(c.frameworks.join('  -  '), { width: W })
    doc.moveDown(0.15)
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text('Response: ', { width: W, continued: true })
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(String(c.response || ''), { width: W })
    if (c.evidence) { doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Evidence: ' + String(c.evidence), { width: W }) }
    doc.moveDown(0.5)
  })

  // Execution evidence: confirmed steps, timestamps, commands, screenshots.
  heading('Execution evidence')
  if (!steps.length) doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No steps were planned for this task.', { width: W })
  steps.forEach((s, i) => {
    if (doc.y + 50 > doc.page.height - 60) doc.addPage()
    const mark = s.status === 'done' ? '[confirmed]' : s.status === 'current' ? '[in progress]' : '[not done]'
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(s.status === 'done' ? ACCENT : INK).text(`${i + 1}. ${s.text}   ${mark}`, { width: W })
    if (s.status === 'done' && s.doneAt) doc.font('Helvetica').fontSize(9).fillColor(ACCENT).text('Confirmed on screen: ' + fmtWhen(s.doneAt), { width: W })
    if (s.validate) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Done when: ' + s.validate, { width: W })
    if (Array.isArray(s.commands) && s.commands.length) codeBlock(doc, s.commands.map((c) => '$ ' + c).join('\n'))
    if (s.code && s.code.content) { doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('File: ' + (s.code.file || 'code'), { width: W }); codeBlock(doc, s.code.content) }
    stepShots(doc, shotsByStep.get(i), W)
    doc.moveDown(0.4)
  })

  // Flags surfaced to the operator (security + other warnings).
  const flags = (session.events || []).filter((e) => e.kind === 'flag')
  if (flags.length) {
    heading('Notes and warnings')
    for (const f of flags) { if (doc.y + 24 > doc.page.height - 60) doc.addPage(); doc.font('Helvetica').fontSize(10).fillColor(INK).text('- ' + String(f.text || ''), { width: W }); doc.moveDown(0.2) }
  }

  // Disclaimer: controls + evidence, not a certification.
  doc.moveDown(1)
  if (doc.y + 46 > doc.page.height - 60) doc.addPage()
  rule(); doc.moveDown(0.3)
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED).text(
    'This report evidences the controls WorkCoPilot applied to this task and the work performed under them. The audit log (a separate export) records exactly what was transmitted to the AI. WorkCoPilot provides controls and evidence to support your compliance program; it does not by itself make an organization compliant or certified, and this report is not legal advice. Framework references are indicative mappings, not an attestation of conformance.', { width: W })

  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`WorkCoPilot compliance report  -  Page ${i + 1} of ${range.count}`, 60, doc.page.height - 42, { width: W, align: 'center' })
  }
  doc.end()
}

function codeBlock(doc, body) {
  const lines = body.split('\n')
  const lineH = 12
  const padding = 8
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right

  for (const line of lines) {
    // Page-break BEFORE drawing, so a block never runs off the page edge.
    if (doc.y + lineH + padding > doc.page.height - doc.page.margins.bottom) doc.addPage()
    const y = doc.y
    doc.rect(doc.page.margins.left, y - 2, width, lineH + 2).fill(CODE_BG)
    doc.fillColor(INK).font('Courier').fontSize(9)
      .text(line.length ? line : ' ', doc.page.margins.left + padding, y, {
        width: width - padding * 2,
        lineBreak: false,   // keep indentation; long lines are clipped, not reflowed
      })
    doc.y = y + lineH
  }
  doc.moveDown(0.6)
}
