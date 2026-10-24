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
import { attestReport, REPORT_CONTACTS } from './report_sign.js'   // hash + authenticity signature on every report

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
  const steps = Array.isArray(session.steps) ? session.steps : []
  const doneN = steps.filter((s) => s.status === 'done').length
  const flags = (session.events || []).filter((e) => e.kind === 'flag')
  const qa = (session.events || []).filter((e) => e.kind === 'ask' || e.kind === 'answer')
  const issued = new Date()
  const title = String(session.title || '').trim() || 'Session Report'
  const goal = String(session.goal || '').trim() || '(no goal recorded)'

  const doc = new PDFDocument({
    size: 'LETTER', margins: { top: 78, bottom: 72, left: 60, right: 60 }, bufferPages: true,
    info: { Title: `${title} - WorkCoPilot Session Report`, Author: REPORT_ISSUER_LINE, Subject: `WorkCoPilot session report ${session.id || ''}`, Creator: 'WorkCoPilot' },
  })
  doc.pipe(stream)
  const L = doc.page.margins.left
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const ctx = { doc, L, R: L + W, W, top: doc.page.margins.top, bottom: doc.page.height - doc.page.margins.bottom, toc: [], pageOf: () => doc.bufferedPageRange().count - 1 }

  // Per-step screenshots, grouped by stepIndex and ordered by capture time, so
  // each step shows its own captures as exhibits beneath it (as compliance does).
  const shotsByStep = new Map()
  for (const sh of (Array.isArray(session.shots) ? session.shots : [])) {
    if (!sh || typeof sh !== 'object' || !sh.path) continue
    const k = Number(sh.stepIndex); if (!Number.isInteger(k)) continue
    if (!shotsByStep.has(k)) shotsByStep.set(k, [])
    shotsByStep.get(k).push(sh)
  }
  for (const arr of shotsByStep.values()) arr.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
  const asksN = qa.filter((e) => e.kind === 'ask').length

  // Evidence selection: include at most 5 scrubbed milestone screenshots - one
  // representative capture per CONFIRMED step (the frame kept at confirmation) -
  // shown inline beneath its step. If more than 5 confirmed steps have a shot,
  // evenly sample 5 across them so the spread still covers the whole task. (The
  // capture target is >= 3; a very short task may yield fewer, and we never
  // invent evidence.) Only confirmed steps carry exhibits (privacy gate below).
  const MAX_EVIDENCE = 5
  let picks = steps
    .map((s, i) => ({ i, arr: (s.status === 'done' && shotsByStep.get(i)) || [] }))
    .filter((x) => x.arr.length)
    .map((x) => ({ i: x.i, shot: x.arr[x.arr.length - 1] }))
  if (picks.length > MAX_EVIDENCE) {
    const sampled = []
    for (let k = 0; k < MAX_EVIDENCE; k++) sampled.push(picks[Math.round(k * (picks.length - 1) / (MAX_EVIDENCE - 1))])
    picks = sampled
  }
  const evidenceByStep = new Map()
  for (const p of picks) evidenceByStep.set(p.i, [p.shot])
  const evidenceCount = picks.length

  // Outcome facts.
  const ended = session.status === 'ended'
  const allDone = steps.length > 0 && doneN === steps.length
  let reached = -1
  steps.forEach((s, i) => { if (s.status === 'done') reached = i })
  if (reached < 0) reached = steps.findIndex((s) => s.status === 'current')
  const lastFlag = [...(session.events || [])].reverse().find((e) => e.kind === 'flag')

  // Section numbers. Optional sections are only counted when they exist, so
  // cross-references and the contents page stay correct.
  let nn = 3
  const secNotes = flags.length ? ++nn : null
  const secQA = qa.length ? ++nn : null
  const secAuth = ++nn

  // Prose that preserves fenced code blocks, rendered on the shared code panel.
  const prose = (text, { size = 10, color = INK } = {}) => {
    for (const seg of segments(String(text || ''))) {
      if (seg.type === 'code') codeBlockAt(doc, seg.body, L, W, { fit: true })
      else para(ctx, seg.body.trim(), { size, color })
    }
  }

  // Outcome banner: a tinted callout with a status stripe (green done / amber
  // stopped / grey in-progress) so the result reads at a glance.
  const banner = (tone, head, body) => {
    const fill = tone === 'good' ? TINT : tone === 'warn' ? AMBER_TINT : ZEBRA
    const stripe = tone === 'good' ? ACCENT : tone === 'warn' ? AMBER : MUTED
    doc.font('Helvetica').fontSize(9.5)
    const bodyH = body ? doc.heightOfString(body, { width: W - 32, lineGap: 1.4 }) : 0
    const h = 12 + 14 + (body ? 4 + bodyH : 0) + 12
    ensure(ctx, h + 8)
    const y = doc.y
    doc.rect(L, y, W, h).fill(fill)
    doc.rect(L, y, 4, h).fill(stripe)
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(stripe).text(head, L + 16, y + 12, { width: W - 32, lineBreak: false, height: 14 })
    if (body) doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(body, L + 16, y + 30, { width: W - 32, lineGap: 1.4 })
    doc.x = L
    doc.y = y + h + 10
  }

  // ---- Cover (page 1) -------------------------------------------------------
  const coverPosture = { total: steps.length, satisfied: doneN, partial: steps.filter((s) => s.status === 'current').length, na: 0 }
  drawCover(ctx, {
    title, goal, company: '', member: '', generatedBy: '', modeLabel, session, issued, posture: coverPosture, focus: null,
    kicker: 'SESSION REPORT',
    scope: 'Scope: a complete record of this guided task - the goal, every planned step with the exact commands and code handed over, what was confirmed on screen, and any questions answered along the way. A practical work record to help you act; not legal, financial, medical or other professional advice.',
    metaRows: [
      ['Report ID', session.id || '-', 'Issue date', fmtDate(issued.toISOString())],
      ['Task performed', fmtDate(session.startedAt) || '-', 'Guide style', modeLabel || '-'],
      ['Steps confirmed', `${doneN} of ${steps.length}`, 'Session status', session.status ? capitalize(session.status) : '-'],
    ],
  })

  // ---- Contents (page 2) ----------------------------------------------------
  doc.addPage()
  const tocPage = ctx.pageOf()
  drawTocFrame(ctx, { kind: 'session' })

  // ---- 1. Overview ----------------------------------------------------------
  doc.addPage()
  sectionHeading(ctx, 1, 'Overview')
  {
    const when = fmtDate(session.startedAt)
    const shortGoal = goal.length > 150 ? goal.slice(0, 147).trimEnd() + '…' : goal
    const s1 = `This report records the guided task “${shortGoal}”${when ? `, performed on ${when}` : ''} under WorkCoPilot's read-only guidance.`
    const s2 = allDone
      ? `All ${steps.length} planned step${steps.length === 1 ? '' : 's'} ${steps.length === 1 ? 'was' : 'were'} confirmed on screen.`
      : `${doneN} of ${steps.length} planned step${steps.length === 1 ? '' : 's'} ${doneN === 1 ? 'was' : 'were'} confirmed on screen.`
    para(ctx, [s1, s2].join(' '), { size: 10.5, color: INK, gap: 0.8 })
    statStrip(ctx, [
      { value: `${doneN}/${steps.length}`, label: 'Steps confirmed' },
      { value: String(evidenceCount), label: 'Scrubbed shots' },
      { value: String(asksN), label: 'Questions asked' },
      { value: String(flags.length), label: 'Notes & warnings' },
    ])
    if (allDone) banner('good', 'Outcome: every planned step was confirmed on screen.', '')
    else if (ended) {
      const where = reached >= 0 ? `Reached step ${reached + 1} of ${steps.length}: ${steps[reached].text}` : 'No step was confirmed on screen.'
      banner('warn', 'Outcome: this session ended before finishing.', where + (lastFlag && lastFlag.text ? `  Last issue flagged: ${String(lastFlag.text)}` : ''))
    } else {
      banner('neutral', `Outcome: in progress - ${doneN} of ${steps.length} step${steps.length === 1 ? '' : 's'} confirmed.`, '')
    }
  }

  // ---- 2. Work summary ------------------------------------------------------
  sectionHeading(ctx, 2, 'Work summary')
  eyebrow(ctx, 'The task')
  quoteBlock(ctx, goal)
  eyebrow(ctx, 'What was achieved')
  if (String(achieved || '').trim()) prose(achieved, { size: 9.5 })
  else if (doneN > 0) para(ctx, `${doneN} of ${steps.length} step${steps.length === 1 ? '' : 's'} confirmed on screen - each is detailed in Section 3.`, { size: 9.5, color: MUTED })
  else para(ctx, 'No steps were confirmed on screen yet.', { size: 9.5, color: MUTED })
  eyebrow(ctx, 'Session details')
  kvTable(ctx, [
    ['Task', session.title], ['Session reference', session.id],
    ['Task started', fmtWhen(session.startedAt)], ['Task ended', fmtWhen(session.endedAt)],
    ['Session status', session.status ? capitalize(session.status) : ''],
    ['Application context', session.appContext], ['Guide style', modeLabel],
    ['Report issued', fmtWhen(issued.toISOString())],
  ].filter(([, v]) => v != null && String(v).trim()))

  // ---- 3. Steps, in detail --------------------------------------------------
  sectionHeading(ctx, 3, 'Steps, in detail', { newPage: true })
  if (!steps.length) para(ctx, 'No steps were planned for this task.', { size: 10, color: MUTED })
  else {
    para(ctx, 'Every planned step, in order, with its status and the time it was confirmed on screen. Full detail - the exact commands, code, sub-steps and milestone screenshots - is shown only for steps confirmed on screen; steps not yet performed are listed by name and status alone.', { size: 9.5, color: MUTED })
    // Scrubbed-screenshot evidence + the transmission assurance. When captures
    // exist they appear inline beneath their confirmed step; when none do, the
    // note explains why rather than leaving the reader to wonder.
    if (evidenceCount > 0) {
      noticeBox(ctx, `Evidence - scrubbed screenshots: ${evidenceCount} milestone screenshot${evidenceCount === 1 ? '' : 's'} captured when a step was confirmed ${evidenceCount === 1 ? 'is' : 'are'} included below, beneath the relevant step${evidenceCount === 1 ? '' : 's'}. Every screenshot is redacted on your device before it is captured - only the scrubbed image is ever stored (encrypted at rest) or transmitted. The original screen is never sent.`)
    } else {
      noticeBox(ctx, 'No milestone screenshots were captured for this task - screen watching may have been off while steps were confirmed. When WorkCoPilot is watching, it keeps 3 to 5 scrubbed milestone screenshots as evidence; each is redacted on your device before capture, and only the scrubbed image is ever stored (encrypted at rest) or transmitted - the original screen is never sent.')
    }
  }
  let exhibitN = 0
  const nextExhibit = () => ++exhibitN
  // completedOnly: never reveal the how-to of steps that were not performed.
  // showSub: include the detailed sub-steps the operator followed, for confirmed steps.
  // evidenceByStep: at most 5 scrubbed shots, one per confirmed step, capped + spread.
  steps.forEach((s, i) => stepEntry(ctx, s, i, evidenceByStep.get(i), nextExhibit, { completedOnly: true, showSub: true }))

  // ---- 4. Notes & warnings (only if any) ------------------------------------
  if (secNotes) {
    sectionHeading(ctx, secNotes, 'Notes & warnings', { newPage: true })
    para(ctx, 'Issues WorkCoPilot raised to the operator during this task.', { size: 9.5, color: MUTED })
    for (const f of flags) flagEntry(ctx, String(f.text || ''))
  }

  // ---- 5. Questions & analysis (only if any) --------------------------------
  if (secQA) {
    sectionHeading(ctx, secQA, 'Questions & analysis', { newPage: true })
    para(ctx, 'Questions asked during the task and the answers given, in order.', { size: 9.5, color: MUTED })
    for (const e of qa) {
      if (e.kind === 'ask') {
        ensure(ctx, 28)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('Q.  ' + String(e.text || ''), L, doc.y, { width: W, lineGap: 1.2 })
        doc.x = L; doc.moveDown(0.25)
      } else prose(String(e.text || ''), { size: 9.5 })
    }
  }

  // ---- 6. Report authenticity -----------------------------------------------
  ensure(ctx, 240)
  sectionHeading(ctx, secAuth, 'Report authenticity')
  para(ctx, `This document was generated by WorkCoPilot and sealed by ${REPORT_ISSUER_LINE}. The seal records a SHA-256 hash of the report's canonical content (the task, every step and its status, and what was confirmed) and an HMAC-SHA256 signature over that hash, the issue time and the issuer. Any party may verify the seal at the address shown.`, { size: 9.5, color: INK })
  para(ctx, 'This report is a record of guided work to help you act. It is not legal, financial, medical or other professional advice. Verify anything you rely on against your own requirements and a qualified professional. WorkCoPilot provides guidance and evidence; it does not make you compliant or certified.', { size: 9, color: MUTED, oblique: true })
  // Authenticity seal over the canonical content of this session report. The
  // payload shape is unchanged, so previously issued reports still verify.
  attestationBlock(doc, { kind: 'session', reportId: session.id || '', payload: {
    id: session.id || '', goal: session.goal || '', achieved: String(achieved || ''),
    steps: steps.map((s) => ({ t: s.text, st: s.status, at: s.doneAt || null })),
  } })

  // ---- Second pass: contents page numbers, running header + footer -----------
  fillToc(ctx, tocPage)
  runningHeaderFooter(ctx, { title, company: '', tocPage })
  doc.end()
}

// Render the screenshots captured for one step, beneath that step. Each image
// is fitted to the content width and a sensible max height so the PDF stays
// small, with its caption (if any) in the muted small style. A missing or
// unreadable file is skipped in a try/catch so a lost shot can never break the
// report. Images near the page bottom move to the next page.
//
// `frame` (compliance report) draws each capture inside a hairline frame with a
// numbered "Exhibit" caption, left-aligned at doc.x; the default keeps the
// historical centred, frameless rendering for the session report.
function stepShots(doc, shots, W, { frame = false, exhibit = null } = {}) {
  if (!Array.isArray(shots) || !shots.length) return
  const MAX_H = 220
  const bottom = doc.page.height - doc.page.margins.bottom
  const x0 = doc.x
  for (const shot of shots) {
    try {
      const bytes = readShotBuffer(shot.path)   // decrypted Buffer (handles legacy plaintext too)
      if (!bytes) continue
      const img = doc.openImage(bytes)
      const scale = Math.min(W / img.width, MAX_H / img.height, 1)
      const drawH = img.height * scale
      const drawW = img.width * scale
      const cap = shot.caption != null ? String(shot.caption).trim() : ''
      if (frame) {
        // Frame + caption are one unit: break the page before, never between.
        if (doc.y + drawH + 34 > bottom) doc.addPage()
        const y = doc.y
        doc.rect(x0 - 0.5, y - 0.5, drawW + 1, drawH + 1).lineWidth(0.75).strokeColor(BORDER).stroke()
        doc.image(bytes, x0, y, { width: drawW, height: drawH })
        doc.y = y + drawH + 6
        const n = exhibit ? exhibit() : null
        let when = ''
        try { when = shot.at ? new Date(shot.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '' } catch { when = '' }
        const label = (n ? `Exhibit ${n}` : 'Exhibit') + (cap ? ` — ${cap}` : '') + (when ? `  (${when})` : '')
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED).text(label, x0, doc.y, { width: W, lineBreak: false, height: 12 })
        doc.x = x0
        doc.moveDown(0.6)
        continue
      }
      // Page-break BEFORE drawing so the image never runs off the page edge.
      if (doc.y + drawH + 16 > bottom) doc.addPage()
      doc.image(bytes, { fit: [W, MAX_H], align: 'center' })
      doc.moveDown(0.2)
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
  // Authenticity seal over the canonical content of this deliverables report.
  attestationBlock(doc, { kind: 'deliverables', reportId: '', payload: {
    goal: String(goal || ''), summary: String(d.summary || ''),
    architecture: (Array.isArray(d.architecture) ? d.architecture : []).map((a) => a.issue || ''),
    security: (Array.isArray(d.security) ? d.security : []).map((a) => a.issue || ''),
    promptIssues: String(d.promptIssues || ''), promptTarget: String(d.promptTarget || ''),
  } })
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
// III) and every status is rendered exactly as the evidence builder emitted it.
//
// Presentation: a formal attestation-style document - cover page, contents with
// real page numbers, numbered sections, posture + coverage charts (all vector,
// deterministic, drawn with pdfkit primitives), control cards, an execution
// timeline with exhibits, a framework coverage table, running header/footer and
// the authenticity seal. Streamed straight to the response.
const AMBER = '#b8860b'
const INK_HEAD = '#111827'      // near-black heading ink
const TINT = '#eef6f0'          // light brand-green fill (callouts, headers)
const TINT_2 = '#d9e9dd'        // deeper tint (chart tracks, cover rings)
const BORDER = '#d8dbe0'        // hairlines
const ZEBRA = '#f7f8fa'         // alternate table rows
const AMBER_TINT = '#fbf3df'
const GREY_FILL = '#8b929c'     // n/a chip fill
const GREY_TINT = '#eceef1'
const GAP_RED = '#9b3b3b'       // framework "gap" status (honest: never softened)
const WHITE = '#ffffff'
const REPORT_ISSUER_LINE = 'AdmireVeda / COE Security LLC'

const CTRL_STATUS = {
  satisfied: { label: 'SATISFIED', fill: ACCENT, tint: TINT, long: 'Satisfied' },
  partial: { label: 'PARTIAL', fill: AMBER, tint: AMBER_TINT, long: 'Partial' },
  na: { label: 'N/A', fill: GREY_FILL, tint: GREY_TINT, long: 'Not applicable' },
}
const FW_STATUS = {
  supported: { label: 'Supported', fill: ACCENT, tint: TINT },
  partial: { label: 'Partial', fill: AMBER, tint: AMBER_TINT },
  gap: { label: 'Gap', fill: GAP_RED, tint: '#f6e7e7' },
  na: { label: 'N/A', fill: GREY_FILL, tint: GREY_TINT },
}
const ctrlStatus = (st) => CTRL_STATUS[st] || CTRL_STATUS.na
const fwStatus = (st) => FW_STATUS[st] || FW_STATUS.na

export function buildComplianceReportPdf(session, stream, { evidence, company = '', member = '', generatedBy = '', modeLabel = '' } = {}) {
  const ev = evidence || { controls: [], posture: { satisfied: 0, partial: 0, na: 0, total: 0 }, frameworks: [], focus: null, evidence: {} }
  const controls = Array.isArray(ev.controls) ? ev.controls : []
  const posture = ev.posture || { satisfied: 0, partial: 0, na: 0, total: controls.length }
  const frameworks = Array.isArray(ev.frameworks) ? ev.frameworks : []
  const focus = ev.focus || null
  const facts = ev.evidence || {}
  const steps = Array.isArray(session.steps) ? session.steps : []
  const flags = (session.events || []).filter((e) => e.kind === 'flag')
  const title = focus ? `${focus.name} Compliance Evidence Report` : 'Compliance Evidence Report'
  const issued = new Date()

  const doc = new PDFDocument({
    size: 'LETTER', margins: { top: 78, bottom: 72, left: 60, right: 60 }, bufferPages: true,
    info: { Title: title, Author: REPORT_ISSUER_LINE, Subject: `WorkCoPilot compliance evidence for session ${session.id || ''}`, Creator: 'WorkCoPilot' },
  })
  doc.pipe(stream)
  const L = doc.page.margins.left
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const ctx = { doc, L, R: L + W, W, top: doc.page.margins.top, bottom: doc.page.height - doc.page.margins.bottom, toc: [], pageOf: () => doc.bufferedPageRange().count - 1 }

  // Group shots by step (same as the session report) for the evidence section.
  const shotsByStep = new Map()
  for (const sh of (Array.isArray(session.shots) ? session.shots : [])) {
    if (!sh || typeof sh !== 'object' || !sh.path) continue
    const k = Number(sh.stepIndex); if (!Number.isInteger(k)) continue
    if (!shotsByStep.has(k)) shotsByStep.set(k, [])
    shotsByStep.get(k).push(sh)
  }
  for (const arr of shotsByStep.values()) arr.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))

  const fwSupported = frameworks.filter((f) => f.status === 'supported').length
  const fwPartial = frameworks.filter((f) => f.status === 'partial').length
  const fwGap = frameworks.filter((f) => f.status === 'gap').length
  const fwNa = frameworks.filter((f) => f.status === 'na').length
  const doneN = steps.filter((s) => s.status === 'done').length
  const goal = String(session.goal || '').trim() || '(no goal recorded)'

  // ---- Cover (page 1) -------------------------------------------------------
  drawCover(ctx, { title, goal, company, member, generatedBy, modeLabel, session, issued, posture, focus })

  // ---- Contents (page 2) - entries are filled in after the body is laid out --
  doc.addPage()
  const tocPage = ctx.pageOf()
  drawTocFrame(ctx)

  // ---- 1. Executive summary -------------------------------------------------
  doc.addPage()
  sectionHeading(ctx, 1, 'Executive summary')
  if (focus) focusCallout(ctx, focus)
  {
    const who = member ? (company ? `${member} (${company})` : member) : (company ? `An operator at ${company}` : 'The operator')
    const when = fmtDate(session.startedAt)
    const shortGoal = goal.length > 140 ? goal.slice(0, 137).trimEnd() + '…' : goal
    const partialControls = controls.filter((c) => c.status === 'partial')
    const s1 = `${who} carried out the task “${shortGoal}” under WorkCoPilot's guided, read-only operation${when ? ` on ${when}` : ''}.`
    const s2 = `Of the ${posture.total} control${posture.total === 1 ? '' : 's'} WorkCoPilot applies to every task, ${posture.satisfied} ${posture.satisfied === 1 ? 'was' : 'were'} satisfied, ${posture.partial} partially satisfied and ${posture.na} not applicable to this task.`
    const s3 = frameworks.length
      ? `${fwSupported} of ${frameworks.length} frameworks in scope ${fwSupported === 1 ? 'is' : 'are'} fully supported by this task's evidence` +
        (fwPartial ? `, ${fwPartial} partially` : '') + (fwGap ? `, ${fwGap} show${fwGap === 1 ? 's' : ''} a gap` : '') + (fwNa ? `, ${fwNa} ${fwNa === 1 ? 'is' : 'are'} not applicable` : '') + '.'
      : ''
    const s4 = partialControls.length
      ? `Residual gaps: ${partialControls.map((c) => c.name).join('; ')}. Each is detailed, with its cause, in Section 4.`
      : 'No residual gaps were identified among the applicable controls.'
    para(ctx, [s1, s2, s3, s4].filter(Boolean).join(' '), { size: 10.5, color: INK, gap: 0.8 })
    statStrip(ctx, [
      { value: `${posture.satisfied}/${posture.total}`, label: 'Controls satisfied' },
      { value: `${fwSupported}/${frameworks.length}`, label: 'Frameworks supported' },
      { value: `${doneN}/${steps.length}`, label: 'Steps confirmed' },
      { value: String(Number(facts.redactedTotal) || 0), label: 'Items redacted' },
      { value: String(Number(facts.transmissions) || 0), label: 'AI transmissions' },
    ])
  }

  // ---- 2. Scope & methodology -----------------------------------------------
  sectionHeading(ctx, 2, 'Scope & methodology')
  eyebrow(ctx, 'Task under review')
  quoteBlock(ctx, goal)
  eyebrow(ctx, 'Engagement details')
  kvTable(ctx, [
    ['Organization', company], ['Operator', member], ['Report requested by', generatedBy],
    ['Session reference', session.id], ['Task started', fmtWhen(session.startedAt)], ['Task ended', fmtWhen(session.endedAt)],
    ['Session status', session.status ? capitalize(session.status) : ''], ['Application context', session.appContext],
    ['Guide style', modeLabel], ['Report issued', fmtWhen(issued.toISOString())],
  ].filter(([, v]) => v != null && String(v).trim()))
  eyebrow(ctx, 'How statuses were determined')
  para(ctx, 'Every status in this report is derived directly from session records; nothing is inferred or self-reported. Three sources are consulted:', { size: 9.5 })
  bullets(ctx, [
    ['Audit trail', `the per-session transmission log (${Number(facts.transmissions) || 0} transmission${Number(facts.transmissions) === 1 ? '' : 's'}, ${Number(facts.redactedTotal) || 0} redaction${Number(facts.redactedTotal) === 1 ? '' : 's'}, ${Number(facts.framesSent) || 0} screen frame${Number(facts.framesSent) === 1 ? '' : 's'}) records exactly what left the device.`],
    ['Operator posture', `the account's multi-factor authentication (${facts.mfa && facts.mfa.global === false ? 'globally disabled' : (facts.mfa && facts.mfa.enabled ? 'enrolled' : 'not enrolled')}), on-device redaction (${facts.scrubOn ? 'on' : 'off'}), governance policy (${facts.policyOn ? 'in force' : 'none'}) and retention window (${Number(facts.retentionDays) > 0 ? `${facts.retentionDays} day${Number(facts.retentionDays) === 1 ? '' : 's'}` : 'until deleted'}) as in effect when this report was issued.`],
    ['Execution record', `steps confirmed on screen (${doneN} of ${steps.length}), their timestamps, the commands and code handed over, and ${Number(facts.shots) || 0} encrypted milestone screenshot${Number(facts.shots) === 1 ? '' : 's'}.`],
  ])
  para(ctx, 'Status vocabulary. Satisfied: the control was applied to this task and evidence exists. Partial: the control was applied in part, or a prerequisite setting was off. Not applicable: the task gave the control nothing to act on. Framework statuses roll up from the controls mapped to each framework: Supported when every applicable control is satisfied, Partial when some are, Gap when none are, N/A when no mapped control applied.', { size: 9, color: MUTED })
  para(ctx, 'This report evidences controls and the work performed under them. It is not a certification, and framework references are indicative mappings rather than an attestation of conformance (see Section 7).', { size: 9, color: MUTED, oblique: true })

  // ---- 3. Control posture ---------------------------------------------------
  sectionHeading(ctx, 3, 'Control posture', { newPage: true })
  para(ctx, `${posture.satisfied} of ${posture.total} controls fully satisfied` + (posture.partial ? `, ${posture.partial} partial` : '') + (posture.na ? `, ${posture.na} not applicable to this task` : '') + '. Each control is shown with its response and evidence in Section 4; the figures below summarise the posture and the evidence volume behind it.', { size: 10 })
  postureFigure(ctx, posture)
  eyebrow(ctx, 'Evidence metrics')
  gaugeRow(ctx, [
    { ratio: posture.total ? posture.satisfied / posture.total : 0, big: `${posture.satisfied}/${posture.total}`, label: 'Controls satisfied', color: ACCENT },
    { ratio: frameworks.length ? fwSupported / frameworks.length : 0, big: `${fwSupported}/${frameworks.length}`, label: 'Frameworks supported', color: ACCENT },
    { ratio: steps.length ? doneN / steps.length : 0, big: `${doneN}/${steps.length}`, label: 'Steps confirmed', color: ACCENT },
  ], [
    ['Milestone screenshots', String(Number(facts.shots) || 0)],
    ['Code blocks security-reviewed', String(Number(facts.codeBlocks) || 0)],
    ['Security issues flagged', String(Number(facts.securityFlags) || 0)],
    ['Items redacted on device', String(Number(facts.redactedTotal) || 0)],
    ['Multi-factor authentication', facts.mfa && facts.mfa.global === false ? 'Globally disabled' : (facts.mfa && facts.mfa.enabled ? 'Enrolled (TOTP)' : 'Not enrolled')],
    ['Retention window', Number(facts.retentionDays) > 0 ? `${facts.retentionDays} day${Number(facts.retentionDays) === 1 ? '' : 's'}` : 'Until deleted'],
  ])

  // ---- 4. Controls, responses & evidence ------------------------------------
  sectionHeading(ctx, 4, 'Controls, responses & evidence', { newPage: true })
  para(ctx, 'Each control below states how WorkCoPilot satisfied it for this task and the evidence behind that statement. Responses are drawn from the actual session: the audit trail, the operator’s data-protection settings, and what was confirmed on screen.', { size: 9.5, color: MUTED })
  if (!controls.length) para(ctx, 'No controls were evaluated for this session.', { size: 10, color: MUTED })
  controls.forEach((c, i) => controlCard(ctx, c, `4.${i + 1}`))

  // ---- 5. Execution evidence ------------------------------------------------
  sectionHeading(ctx, 5, 'Execution evidence', { newPage: true })
  para(ctx, steps.length
    ? `${doneN} of ${steps.length} planned step${steps.length === 1 ? '' : 's'} ${doneN === 1 ? 'was' : 'were'} confirmed on screen. Confirmed steps carry the timestamp at which the operator’s screen showed the expected result; commands and code are reproduced exactly as handed over, and milestone screenshots (redacted on the device, encrypted at rest) are presented as exhibits. Steps that were not confirmed are listed by name and status only.`
    : 'No steps were planned for this task.', { size: 9.5, color: MUTED })
  let exhibitN = 0
  const nextExhibit = () => ++exhibitN
  // Same privacy gate as the task report: the detailed how-to of a step that was
  // not confirmed is never rendered - only its name and status.
  steps.forEach((s, i) => stepEntry(ctx, s, i, shotsByStep.get(i), nextExhibit, { completedOnly: true }))

  // ---- 6. Framework coverage ------------------------------------------------
  sectionHeading(ctx, 6, 'Framework coverage', { newPage: true })
  para(ctx, 'How this task maps to every framework WorkCoPilot supports. Supported means every applicable control was satisfied for this task; Partial means some were; Gap means none were; N/A means no mapped control applied. These are controls and evidence that support your program, not a certification.', { size: 9.5, color: MUTED })
  if (frameworks.length) {
    fwSummaryPills(ctx, { supported: fwSupported, partial: fwPartial, gap: fwGap, na: fwNa })
    eyebrow(ctx, 'Controls satisfied per framework')
    fwChart(ctx, frameworks, posture.total || 8, focus)
    eyebrow(ctx, 'Coverage detail')
    fwTable(ctx, frameworks, focus)
  } else {
    para(ctx, 'No framework registry was available for this report.', { size: 10, color: MUTED })
  }

  // ---- 7. Notes & observations ----------------------------------------------
  sectionHeading(ctx, 7, 'Notes & observations', { newPage: true })
  eyebrow(ctx, 'Flags raised during the task')
  if (!flags.length) para(ctx, 'No warnings were raised to the operator during this task.', { size: 9.5 })
  for (const f of flags) flagEntry(ctx, String(f.text || ''))
  eyebrow(ctx, 'Important notice')
  noticeBox(ctx, 'This report evidences the controls WorkCoPilot applied to this task and the work performed under them. The audit log (a separate export) records exactly what was transmitted to the AI. WorkCoPilot provides controls and evidence to support your compliance program; it does not by itself make an organization compliant or certified, and this report is not legal advice. Framework references are indicative mappings, not an attestation of conformance.' + (frameworks.some((f) => f.readiness) ? ' FedRAMP coverage is readiness support, not an authorization.' : ''))

  // ---- 8. Report authenticity -----------------------------------------------
  ensure(ctx, 300)
  sectionHeading(ctx, 8, 'Report authenticity')
  para(ctx, `This document was generated by WorkCoPilot and sealed by ${REPORT_ISSUER_LINE}. The seal records a SHA-256 hash of the report’s canonical content (the task, control statuses, framework statuses, confirmed steps and evidence tallies) and an HMAC-SHA256 signature over that hash, the issue time and the issuer. Any party may verify the seal at the address shown.`, { size: 9.5, color: INK })
  // Authenticity seal (hash + signature + issuer + contacts) over the canonical
  // content of THIS report. The payload shape is unchanged so the hash stays
  // comparable with previously issued reports.
  attestationBlock(doc, { kind: 'compliance', reportId: session.id || '', payload: {
    id: session.id || '', goal: session.goal || '', company, member,
    posture: ev.posture,
    controls: (ev.controls || []).map((c) => ({ id: c.id, status: c.status })),
    frameworks: frameworks.map((f) => ({ id: f.id, status: f.status })),
    steps: steps.map((s) => ({ t: s.text, st: s.status, at: s.doneAt || null })),
    evidence: ev.evidence,
  } })

  // ---- Second pass: contents page numbers, running header + footer -----------
  fillToc(ctx, tocPage)
  runningHeaderFooter(ctx, { title, company, tocPage })
  doc.end()
}

// ---- Compliance report: layout primitives ----------------------------------
function fmtDate(iso) { try { return iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '' } catch { return '' } }
function fmtWhen(iso) { try { return iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '' } catch { return '' } }
function capitalize(s) { s = String(s || ''); return s ? s[0].toUpperCase() + s.slice(1) : '' }
const n2 = (v) => Number(v).toFixed(2)

// Page-break before an element of height `h` if it would not fit.
function ensure(ctx, h) {
  if (ctx.doc.y + h > ctx.bottom) { ctx.doc.addPage(); ctx.doc.x = ctx.L }
}

// Small-caps style label (letter-spaced uppercase) used for sub-sections.
function eyebrow(ctx, label) {
  const { doc, L, W } = ctx
  ensure(ctx, 40)
  doc.moveDown(0.5)
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ACCENT).text(String(label).toUpperCase(), L, doc.y, { width: W, characterSpacing: 1.1, lineBreak: false, height: 11 })
  doc.x = L
  doc.y += 14
}

function para(ctx, text, { size = 10, color = INK, gap = 0.5, oblique = false, x = null, width = null } = {}) {
  const { doc, L, W } = ctx
  doc.font(oblique ? 'Helvetica-Oblique' : 'Helvetica').fontSize(size).fillColor(color)
  doc.text(String(text || ''), x == null ? L : x, doc.y, { width: width == null ? W : width, lineGap: 1.5 })
  doc.x = L
  doc.moveDown(gap)
}

// Numbered section heading: number in brand green, title in heading ink, a
// short accent rule continuing as a hairline. Records the TOC entry.
function sectionHeading(ctx, num, title, { newPage = false } = {}) {
  const { doc, L, W } = ctx
  if (newPage && doc.y > ctx.top + 2) doc.addPage()
  else if (doc.y > ctx.top + 2) { ensure(ctx, 120); if (doc.y > ctx.top + 2) doc.moveDown(1.4) }
  ctx.toc.push({ num, title, page: ctx.pageOf() })
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(20).fillColor(ACCENT).text(String(num), L, y - 2, { lineBreak: false, height: 26 })
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK_HEAD).text(title, L + 28, y + 1, { width: W - 28, lineBreak: false, height: 22 })
  const ry = y + 27
  doc.rect(L, ry, 36, 2.2).fill(ACCENT)
  doc.moveTo(L + 36, ry + 1.1).lineTo(L + W, ry + 1.1).lineWidth(0.6).strokeColor(BORDER).stroke()
  doc.x = L
  doc.y = ry + 16
}

// Rounded status chip. Returns its width.
function chip(doc, x, y, label, { fill = ACCENT, text = WHITE, size = 7, h = 13, padX = 6 } = {}) {
  doc.font('Helvetica-Bold').fontSize(size)
  const w = doc.widthOfString(label, { characterSpacing: 0.6 }) + padX * 2
  doc.roundedRect(x, y, w, h, h / 2).fill(fill)
  doc.fillColor(text).text(label, x + padX, y + (h - size) / 2 - 0.5, { lineBreak: false, characterSpacing: 0.6, height: h })
  return w
}

// Outlined tag pill (framework references on a control card). Returns width.
function tagPill(doc, x, y, label) {
  doc.font('Helvetica').fontSize(7.5)
  const w = doc.widthOfString(label) + 12
  doc.roundedRect(x, y, w, 13, 6.5).lineWidth(0.6).fillAndStroke(TINT, TINT_2)
  doc.fillColor(INK).text(label, x + 6, y + 2.6, { lineBreak: false, height: 12 })
  return w
}

// Statistic tiles across the content width.
function statStrip(ctx, tiles) {
  const { doc, L, W } = ctx
  const gap = 8, h = 58
  const w = (W - gap * (tiles.length - 1)) / tiles.length
  ensure(ctx, h + 12)
  const y = doc.y
  tiles.forEach((t, i) => {
    const x = L + i * (w + gap)
    doc.rect(x, y, w, h).fill(TINT)
    doc.rect(x, y, 3, h).fill(ACCENT)
    doc.font('Helvetica-Bold').fontSize(18).fillColor(INK_HEAD).text(fitText(doc, t.value, w - 20), x + 12, y + 10, { lineBreak: false, height: 22 })
    doc.font('Helvetica').fontSize(7.2).fillColor(MUTED).text(fitText(doc, t.label.toUpperCase(), w - 20), x + 12, y + 37, { characterSpacing: 0.8, lineBreak: false, height: 10 })
  })
  doc.x = L
  doc.y = y + h + 14
}

// Left-barred quotation block (the task statement).
function quoteBlock(ctx, text) {
  const { doc, L, W } = ctx
  doc.font('Helvetica').fontSize(11).fillColor(INK_HEAD)
  const h = doc.heightOfString(text, { width: W - 18, lineGap: 1.5 })
  ensure(ctx, h + 12)
  const y = doc.y
  doc.rect(L, y - 1, 3, h + 4).fill(ACCENT)
  doc.text(text, L + 16, y, { width: W - 18, lineGap: 1.5 })
  doc.x = L
  doc.moveDown(0.8)
}

// Two-column label / value table with hairline separators.
function kvTable(ctx, rows) {
  const { doc, L, W } = ctx
  const labelW = 150, pad = 6
  for (const [k, v] of rows) {
    doc.font('Helvetica').fontSize(9.5)
    const vh = doc.heightOfString(String(v), { width: W - labelW - pad * 2 })
    const h = Math.max(vh, 12) + pad * 2
    ensure(ctx, h)
    const y = doc.y
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(String(k).toUpperCase(), L, y + pad + 1.5, { width: labelW - pad, characterSpacing: 0.5, lineBreak: false, height: 12 })
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(String(v), L + labelW, y + pad, { width: W - labelW - pad * 2 })
    doc.moveTo(L, y + h).lineTo(L + W, y + h).lineWidth(0.5).strokeColor(BORDER).stroke()
    doc.x = L
    doc.y = y + h
  }
  doc.moveDown(0.8)
}

// Bulleted list with bold lead-ins.
function bullets(ctx, items) {
  const { doc, L, W } = ctx
  for (const [lead, body] of items) {
    doc.font('Helvetica').fontSize(9.5)
    const h = doc.heightOfString(`${lead}. ${body}`, { width: W - 16 })
    ensure(ctx, h + 6)
    const y = doc.y
    doc.circle(L + 4, y + 5, 1.8).fill(ACCENT)
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK_HEAD).text(lead + '.', L + 16, y, { continued: true, width: W - 16 })
    doc.font('Helvetica').fillColor(INK).text(' ' + body, { width: W - 16 })
    doc.x = L
    doc.moveDown(0.3)
  }
  doc.moveDown(0.4)
}

// Bordered notice panel.
function noticeBox(ctx, text) {
  const { doc, L, W } = ctx
  doc.font('Helvetica-Oblique').fontSize(8.8)
  const h = doc.heightOfString(text, { width: W - 28, lineGap: 1.5 }) + 22
  ensure(ctx, h)
  const y = doc.y
  doc.rect(L, y, W, h).lineWidth(0.6).fillAndStroke(ZEBRA, BORDER)
  doc.rect(L, y, 3, h).fill(MUTED)
  doc.fillColor(INK).text(text, L + 16, y + 11, { width: W - 28, lineGap: 1.5 })
  doc.x = L
  doc.y = y + h + 10
}

// ---- Vector figures ---------------------------------------------------------
function polar(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)] }

// Filled ring segment between angles a0 -> a1 (radians, clockwise, 0 = east).
function ringSegment(doc, cx, cy, rO, rI, a0, a1, color) {
  const span = a1 - a0
  if (span <= 1e-6) return
  if (span >= Math.PI * 2 - 1e-4) {
    ringSegment(doc, cx, cy, rO, rI, a0, a0 + Math.PI, color)
    ringSegment(doc, cx, cy, rO, rI, a0 + Math.PI, a0 + Math.PI * 2, color)
    return
  }
  const large = span > Math.PI ? 1 : 0
  const [ox0, oy0] = polar(cx, cy, rO, a0), [ox1, oy1] = polar(cx, cy, rO, a1)
  const [ix0, iy0] = polar(cx, cy, rI, a1), [ix1, iy1] = polar(cx, cy, rI, a0)
  doc.path(`M ${n2(ox0)} ${n2(oy0)} A ${n2(rO)} ${n2(rO)} 0 ${large} 1 ${n2(ox1)} ${n2(oy1)} L ${n2(ix0)} ${n2(iy0)} A ${n2(rI)} ${n2(rI)} 0 ${large} 0 ${n2(ix1)} ${n2(iy1)} Z`).fill(color)
}

// Donut of segments [{ value, color }] starting at 12 o'clock.
function donut(doc, cx, cy, rO, rI, segs, track = TINT_2) {
  doc.circle(cx, cy, rO).fill(track)
  doc.circle(cx, cy, rI).fill(WHITE)
  const total = segs.reduce((a, s) => a + (Number(s.value) || 0), 0)
  if (!total) return
  let a = -Math.PI / 2
  for (const s of segs) {
    const v = Number(s.value) || 0
    if (!v) continue
    const a1 = a + (v / total) * Math.PI * 2
    ringSegment(doc, cx, cy, rO, rI, a, a1, s.color)
    a = a1
  }
}

// Half-circle gauge: track + proportional fill, big value centred, label below.
function gauge(doc, cx, cy, r, ratio, color, big, label) {
  const rI = r - 9
  ringSegment(doc, cx, cy, r, rI, Math.PI, Math.PI * 2, TINT_2)
  const p = Math.max(0, Math.min(1, Number(ratio) || 0))
  if (p > 0) ringSegment(doc, cx, cy, r, rI, Math.PI, Math.PI + p * Math.PI, color)
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK_HEAD).text(big, cx - r, cy - 16, { width: r * 2, align: 'center', lineBreak: false, height: 16 })
  doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(`${Math.round(p * 100)}%`, cx - r, cy - 2, { width: r * 2, align: 'center', lineBreak: false, height: 10 })
  doc.font('Helvetica').fontSize(7.2).fillColor(MUTED).text(label.toUpperCase(), cx - r - 14, cy + 10, { width: r * 2 + 28, align: 'center', characterSpacing: 0.7, lineBreak: false, height: 10 })
}

// Control posture figure: donut + stacked bar + legend, drawn as ONE unit.
function postureFigure(ctx, posture) {
  const { doc, L, W } = ctx
  const H = 128
  ensure(ctx, H + 10)
  const y = doc.y
  const segs = [
    { key: 'satisfied', value: posture.satisfied, color: ACCENT },
    { key: 'partial', value: posture.partial, color: AMBER },
    { key: 'na', value: posture.na, color: GREY_FILL },
  ]
  // Donut.
  const cx = L + 64, cy = y + H / 2
  donut(doc, cx, cy, 52, 36, segs)
  doc.font('Helvetica-Bold').fontSize(17).fillColor(INK_HEAD).text(`${posture.satisfied}/${posture.total}`, cx - 40, cy - 12, { width: 80, align: 'center', lineBreak: false, height: 20 })
  doc.font('Helvetica').fontSize(6.8).fillColor(MUTED).text('SATISFIED', cx - 40, cy + 7, { width: 80, align: 'center', characterSpacing: 0.8, lineBreak: false, height: 10 })
  // Stacked bar.
  const bx = L + 150, bw = W - 150, by = y + 30, bh = 16
  doc.rect(bx, by, bw, bh).fill(TINT_2)
  let x = bx
  const total = posture.total || 1
  for (const s of segs) {
    const w = (Number(s.value) || 0) / total * bw
    if (w > 0) { doc.rect(x, by, w, bh).fill(s.color); x += w }
  }
  // Boundary ticks between segments for crispness.
  x = bx
  for (const s of segs.slice(0, -1)) { x += (Number(s.value) || 0) / total * bw; if (x > bx && x < bx + bw) doc.rect(x - 0.4, by, 0.8, bh).fill(WHITE) }
  doc.font('Helvetica-Bold').fontSize(7.2).fillColor(MUTED).text('DISTRIBUTION OF CONTROL STATUSES', bx, y + 14, { characterSpacing: 0.8, lineBreak: false, height: 10 })
  // Legend with counts and shares.
  let lx = bx
  const ly = by + bh + 14
  for (const s of segs) {
    const st = ctrlStatus(s.key)
    const v = Number(s.value) || 0
    const label = `${st.long}  ${v}  (${Math.round(v / total * 100)}%)`
    doc.rect(lx, ly + 1, 9, 9).fill(s.color)
    doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(label, lx + 14, ly, { lineBreak: false, height: 12 })
    lx += 14 + doc.widthOfString(label) + 18
  }
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED).text('Statuses are reproduced exactly as evaluated; a partial control is never shown as satisfied.', bx, ly + 20, { width: bw, lineGap: 1 })
  doc.x = L
  doc.y = y + H + 8
}

// Three gauges on the left, a 2 x 3 metric grid on the right - one unit.
function gaugeRow(ctx, gauges, kpis) {
  const { doc, L, W } = ctx
  const H = 104
  ensure(ctx, H + 8)
  const y = doc.y
  const gw = 100, r = 34
  gauges.forEach((g, i) => gauge(doc, L + 50 + i * gw, y + 52, r, g.ratio, g.color, g.big, g.label))
  const gx = L + gauges.length * gw + 14
  const gridW = W - (gx - L)
  const colW = gridW / 2, rowH = 30
  doc.moveTo(gx - 8, y + 4).lineTo(gx - 8, y + H - 6).lineWidth(0.6).strokeColor(BORDER).stroke()
  kpis.forEach(([label, value], i) => {
    const cx = gx + (i % 2) * colW, cy = y + 2 + Math.floor(i / 2) * rowH
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK_HEAD).text(fitText(doc, value, colW - 10), cx, cy, { lineBreak: false, height: 14 })
    doc.font('Helvetica').fontSize(6.8).fillColor(MUTED).text(fitText(doc, label.toUpperCase(), colW - 10), cx, cy + 14, { characterSpacing: 0.6, lineBreak: false, height: 10 })
  })
  doc.x = L
  doc.y = y + H + 6
}

// Framework focus callout (per-framework report), tinted with a status stripe.
function focusCallout(ctx, focus) {
  const { doc, L, W } = ctx
  const st = fwStatus(focus.status)
  const headline = focus.status === 'supported' ? 'Supported for this task' : focus.status === 'partial' ? 'Partially supported for this task' : focus.status === 'gap' ? 'Gap on this task' : 'Not applicable to this task'
  const sub = focus.applicable ? `${focus.satisfied} of ${focus.applicable} applicable control${focus.applicable === 1 ? '' : 's'} satisfied` : 'No mapped control applied to this task'
  const ctrls = Array.isArray(focus.controls) ? focus.controls : []
  doc.font('Helvetica').fontSize(9.5)
  const supportH = doc.heightOfString(String(focus.support || ''), { width: W - 32, lineGap: 1.5 })
  const rows = Math.ceil(ctrls.length / 2)
  const h = 14 + 18 + 16 + supportH + (ctrls.length ? 16 + rows * 14 : 0) + 14
  ensure(ctx, h + 10)
  const y = doc.y
  doc.rect(L, y, W, h).fill(st.tint)
  doc.rect(L, y, 4, h).fill(st.fill)
  doc.font('Helvetica-Bold').fontSize(7.2).fillColor(MUTED).text('FRAMEWORK FOCUS', L + 16, y + 12, { characterSpacing: 1, lineBreak: false, height: 10 })
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK_HEAD).text(fitText(doc, focus.name + (focus.readiness ? '  (readiness)' : ''), W - 140), L + 16, y + 24, { lineBreak: false, height: 18 })
  chip(doc, L + W - 16 - chipWidth(doc, st.label), y + 25, st.label, { fill: st.fill })
  doc.font('Helvetica-Bold').fontSize(9).fillColor(st.fill).text(`${headline}  ·  ${sub}`, L + 16, y + 44, { width: W - 32, lineBreak: false, height: 12 })
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(String(focus.support || ''), L + 16, y + 60, { width: W - 32, lineGap: 1.5 })
  if (ctrls.length) {
    let cy = y + 60 + supportH + 10
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(MUTED).text('SUPPORTING CONTROLS', L + 16, cy, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    cy += 12
    const colW = (W - 32) / 2
    ctrls.forEach((c, i) => {
      const cx = L + 16 + (i % 2) * colW, yy = cy + Math.floor(i / 2) * 14
      doc.circle(cx + 4, yy + 5, 3.2).fill(ctrlStatus(c.status).fill)
      doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(fitText(doc, c.name, colW - 70), cx + 14, yy, { lineBreak: false, height: 12 })
      doc.font('Helvetica-Bold').fontSize(7).fillColor(ctrlStatus(c.status).fill).text(ctrlStatus(c.status).label, cx + colW - 58, yy + 1.5, { width: 50, align: 'right', lineBreak: false, height: 10 })
    })
  }
  doc.x = L
  doc.y = y + h + 14
}
function chipWidth(doc, label, size = 7, padX = 6) { doc.font('Helvetica-Bold').fontSize(size); return doc.widthOfString(label, { characterSpacing: 0.6 }) + padX * 2 }

// One control as a bordered card: status stripe + chip, framework pills,
// response and evidence. Measured first so it never splits across pages.
function controlCard(ctx, c, num) {
  const { doc, L, W } = ctx
  const st = ctrlStatus(c.status)
  const pad = 14, innerX = L + pad + 4, innerW = W - pad * 2 - 4
  const tags = Array.isArray(c.frameworks) ? c.frameworks.map(String) : []
  // Measure.
  const cw = chipWidth(doc, st.label)
  doc.font('Helvetica-Bold').fontSize(11)
  const nameW = innerW - cw - 12
  const nameH = doc.heightOfString(`${num}  ${c.name}`, { width: nameW })
  doc.font('Helvetica').fontSize(7.5)
  let px = 0, pillRows = tags.length ? 1 : 0
  for (const t of tags) { const w = doc.widthOfString(t) + 12; if (px + w > innerW && px > 0) { pillRows++; px = 0 } px += w + 5 }
  const pillsH = pillRows ? pillRows * 17 : 0
  doc.font('Helvetica').fontSize(9.5)
  const response = String(c.response || '')
  const respH = doc.heightOfString(response, { width: innerW, lineGap: 1.2 })
  const evidence = String(c.evidence || '')
  doc.font('Helvetica-Oblique').fontSize(8.8)
  const evH = evidence ? doc.heightOfString(evidence, { width: innerW - 60, lineGap: 1 }) : 0
  const h = pad + nameH + 6 + pillsH + 8 + 11 + respH + (evidence ? 10 + Math.max(evH, 11) : 0) + pad
  ensure(ctx, h + 10)
  // Draw.
  const y = doc.y
  doc.rect(L, y, W, h).lineWidth(0.7).fillAndStroke(WHITE, BORDER)
  doc.rect(L, y, 4, h).fill(st.fill)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK_HEAD).text(`${num}  ${c.name}`, innerX, y + pad, { width: nameW })
  chip(doc, L + W - pad - cw, y + pad, st.label, { fill: st.fill })
  let yy = y + pad + nameH + 6
  if (tags.length) {
    let x = innerX
    for (const t of tags) {
      doc.font('Helvetica').fontSize(7.5)
      const w = doc.widthOfString(t) + 12
      if (x + w > innerX + innerW && x > innerX) { x = innerX; yy += 17 }
      tagPill(doc, x, yy, t)
      x += w + 5
    }
    yy += 17
  }
  yy += 8
  doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text('RESPONSE', innerX, yy, { characterSpacing: 0.9, lineBreak: false, height: 10 })
  yy += 11
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(response, innerX, yy, { width: innerW, lineGap: 1.2 })
  yy += respH
  if (evidence) {
    yy += 10
    doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text('EVIDENCE', innerX, yy + 1, { characterSpacing: 0.9, lineBreak: false, height: 10 })
    doc.font('Helvetica-Oblique').fontSize(8.8).fillColor(INK).text(evidence, innerX + 60, yy, { width: innerW - 60, lineGap: 1 })
  }
  doc.x = L
  doc.y = y + h + 10
}

// Step marker: filled check for confirmed, amber dot for in progress, hollow
// for not done.
function stepMarker(doc, cx, cy, r, status) {
  if (status === 'done') {
    doc.circle(cx, cy, r).fill(ACCENT)
    doc.moveTo(cx - r * 0.45, cy + r * 0.02).lineTo(cx - r * 0.12, cy + r * 0.38).lineTo(cx + r * 0.5, cy - r * 0.38).lineWidth(1.6).strokeColor(WHITE).stroke()
  } else if (status === 'current') {
    doc.circle(cx, cy, r).lineWidth(1.4).strokeColor(AMBER).stroke()
    doc.circle(cx, cy, r * 0.42).fill(AMBER)
  } else {
    doc.circle(cx, cy, r).lineWidth(1).strokeColor(BORDER).stroke()
  }
}

// One step of the execution timeline: marker, title, status + timestamp,
// "done when", commands / code, exhibits.
function stepEntry(ctx, s, i, shots, nextExhibit, { completedOnly = false, showSub = false } = {}) {
  const { doc, L, W } = ctx
  const ix = L + 24, iw = W - 24
  const done = s.status === 'done'
  // Privacy gate: in `completedOnly` mode, the detailed how-to (the exact
  // commands, code, target URL, success check, sub-steps and exhibits) is shown
  // ONLY for steps the operator confirmed on screen. Steps that were not
  // performed are listed by name and status alone - never with their detail -
  // so a report can't leak the how-to of work that was never done.
  const showDetail = done || !completedOnly
  const mark = done ? 'Confirmed on screen' : s.status === 'current' ? 'In progress' : 'Not done'
  doc.font('Helvetica-Bold').fontSize(10.5)
  const titleH = doc.heightOfString(`Step ${i + 1}  ${s.text}`, { width: iw })
  ensure(ctx, titleH + 36)
  const y = doc.y
  stepMarker(doc, L + 7, y + 6, 6, s.status)
  doc.fillColor(done ? INK_HEAD : INK).text(`Step ${i + 1}  ${s.text}`, ix, y, { width: iw })
  let yy = y + titleH + 3
  const when = done && s.doneAt ? fmtWhen(s.doneAt) : ''
  doc.font('Helvetica-Bold').fontSize(8).fillColor(done ? ACCENT : (s.status === 'current' ? AMBER : MUTED)).text(mark.toUpperCase(), ix, yy, { characterSpacing: 0.7, lineBreak: false, height: 11 })
  if (when) {
    const mw = doc.widthOfString(mark.toUpperCase(), { characterSpacing: 0.7 })
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`·  ${when}`, ix + mw + 6, yy - 0.5, { lineBreak: false, height: 11 })
  }
  yy += 13
  doc.x = L; doc.y = yy
  if (!showDetail) { doc.x = L; doc.moveDown(0.5); return }
  if (s.validate) para(ctx, 'Done when: ' + s.validate, { size: 8.5, color: MUTED, x: ix, width: iw, gap: 0.3 })
  if (s.url) {
    doc.font('Helvetica').fontSize(8.5).fillColor(ACCENT).text(fitText(doc, s.url, iw), ix, doc.y, { width: iw, link: s.url, underline: true })
    doc.x = L; doc.moveDown(0.2)
  }
  if (Array.isArray(s.commands) && s.commands.length) { doc.y += 2; codeBlockAt(doc, s.commands.map((c) => '$ ' + c).join('\n'), ix, iw, { fit: true }) }
  if (s.code && s.code.content) {
    ensure(ctx, 30)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text(('FILE  ' + (s.code.file || 'code')).toUpperCase(), ix, doc.y, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.y += 12
    codeBlockAt(doc, s.code.content, ix, iw, { fit: true })
  }
  // The detailed sub-steps the operator followed for this step ("their detailed
  // steps if any"). Only rendered when asked, and - under the gate above - only
  // for confirmed steps, so an unperformed step never reveals its sub-steps.
  if (showSub && Array.isArray(s.sub) && s.sub.length) {
    const jx = ix + 14, jw = iw - 14
    ensure(ctx, 16)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text('DETAILED STEPS', ix, doc.y, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.y += 12
    s.sub.forEach((ss, j) => {
      const t = String((ss && ss.text) || '').trim()
      if (!t) return
      doc.font('Helvetica').fontSize(9)
      const sh = doc.heightOfString(`${j + 1}. ${t}`, { width: jw })
      ensure(ctx, sh + 4)
      const sy = doc.y
      doc.circle(ix + 4, sy + 5, 1.8).fill(ACCENT)
      doc.font('Helvetica').fontSize(9).fillColor(INK).text(`${j + 1}. ${t}`, jx, sy, { width: jw, lineGap: 1.1 })
      doc.x = L
      if (ss.validate) para(ctx, 'Done when: ' + ss.validate, { size: 8, color: MUTED, x: jx, width: jw, gap: 0.2 })
      if (ss.url) {
        doc.font('Helvetica').fontSize(8).fillColor(ACCENT).text(fitText(doc, ss.url, jw), jx, doc.y, { width: jw, link: ss.url, underline: true })
        doc.x = L; doc.moveDown(0.15)
      }
      if (Array.isArray(ss.commands) && ss.commands.length) codeBlockAt(doc, ss.commands.map((c) => '$ ' + c).join('\n'), jx, jw, { fit: true })
      if (ss.code && ss.code.content) codeBlockAt(doc, ss.code.content, jx, jw, { fit: true })
      doc.moveDown(0.2)
    })
  }
  if (Array.isArray(shots) && shots.length) {
    doc.x = ix
    stepShots(doc, shots, iw, { frame: true, exhibit: nextExhibit })
  }
  doc.x = L
  doc.moveDown(0.6)
}

// Status summary pills for the framework section.
function fwSummaryPills(ctx, counts) {
  const { doc, L } = ctx
  ensure(ctx, 24)
  let x = L
  const y = doc.y
  for (const key of ['supported', 'partial', 'gap', 'na']) {
    const st = fwStatus(key)
    const label = `${st.label}  ${counts[key] || 0}`
    doc.font('Helvetica-Bold').fontSize(8)
    const w = doc.widthOfString(label) + 22
    doc.roundedRect(x, y, w, 18, 9).fill(st.tint)
    doc.circle(x + 10, y + 9, 3.2).fill(st.fill)
    doc.fillColor(INK_HEAD).text(label, x + 17, y + 4.5, { lineBreak: false, height: 12 })
    x += w + 8
  }
  doc.x = L
  doc.y = y + 26
}

// Horizontal bar chart: one row per framework. Track = applicable controls,
// fill = satisfied, both on a shared scale of all controls, so rows compare.
function fwChart(ctx, frameworks, scale, focus) {
  const { doc, L, W } = ctx
  const rowH = 15, labelW = 150, valW = 40, chipW = 64
  const barX = L + labelW + 8, barW = W - labelW - 8 - valW - chipW - 10
  const H = 16 + frameworks.length * rowH + 14
  ensure(ctx, Math.min(H, ctx.bottom - ctx.top))
  let y = doc.y
  const header = () => {
    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(MUTED)
    doc.text('FRAMEWORK', L, y, { characterSpacing: 0.7, lineBreak: false, height: 10 })
    doc.text(`CONTROLS SATISFIED / APPLICABLE  (scale: ${scale} controls)`, barX, y, { characterSpacing: 0.7, lineBreak: false, height: 10 })
    doc.text('STATUS', L + W - chipW, y, { width: chipW, align: 'right', characterSpacing: 0.7, lineBreak: false, height: 10 })
    y += 12
    doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.5).strokeColor(BORDER).stroke()
    y += 4
  }
  header()
  // Light gridlines at each control count.
  const gridTop = y
  for (const f of frameworks) {
    if (y + rowH > ctx.bottom) { doc.addPage(); y = ctx.top; header() }
    const st = fwStatus(f.status)
    const isFocus = focus && focus.id === f.id
    if (isFocus) doc.rect(L - 4, y - 1.5, W + 8, rowH).fill(TINT)
    doc.font(isFocus ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.3).fillColor(INK).text(fitText(doc, f.name, labelW), L, y + 1.5, { lineBreak: false, height: 11 })
    const appW = Math.max(0, Math.min(1, (Number(f.applicable) || 0) / (scale || 1))) * barW
    const satW = Math.max(0, Math.min(1, (Number(f.satisfied) || 0) / (scale || 1))) * barW
    doc.rect(barX, y + 2.5, barW, 8).fill(ZEBRA)
    if (appW > 0) doc.rect(barX, y + 2.5, appW, 8).fill(TINT_2)
    if (satW > 0) doc.rect(barX, y + 2.5, satW, 8).fill(st.fill)
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(f.applicable ? `${f.satisfied} / ${f.applicable}` : '—', barX + barW + 6, y + 1.5, { width: valW, lineBreak: false, height: 11 })
    chip(doc, L + W - chipWidth(doc, st.label.toUpperCase()), y, st.label.toUpperCase(), { fill: st.fill, h: 12, size: 6.5 })
    y += rowH
  }
  // Tick marks under the bars (one per control on the shared scale).
  for (let k = 0; k <= scale; k++) {
    const tx = barX + (k / (scale || 1)) * barW
    doc.moveTo(tx, gridTop - 2).lineTo(tx, y - 2).lineWidth(0.3).strokeColor(k === 0 || k === scale ? BORDER : '#eceef1').stroke()
  }
  doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
  for (let k = 0; k <= scale; k++) {
    const tx = barX + (k / (scale || 1)) * barW
    doc.text(String(k), tx - 6, y, { width: 12, align: 'center', lineBreak: false, height: 9 })
  }
  y += 10
  // Legend.
  doc.rect(L, y + 2, 9, 7).fill(TINT_2); doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('applicable controls', L + 13, y, { lineBreak: false, height: 10 })
  doc.rect(L + 100, y + 2, 9, 7).fill(ACCENT); doc.text('satisfied', L + 113, y, { lineBreak: false, height: 10 })
  doc.x = L
  doc.y = y + 18
}

// Framework coverage table with zebra rows, status chips and the support
// sentence as a compact second line. Header repeats after a page break.
function fwTable(ctx, frameworks, focus) {
  const { doc, L, W } = ctx
  const cols = { name: 190, region: 84, status: 84 }
  cols.ctrl = W - cols.name - cols.region - cols.status
  const xName = L + 8, xRegion = L + cols.name, xStatus = xRegion + cols.region, xCtrl = xStatus + cols.status
  const header = () => {
    const y = doc.y
    doc.rect(L, y, W, 20).fill(TINT)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(INK_HEAD)
    doc.text('FRAMEWORK', xName, y + 6.5, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.text('REGION', xRegion, y + 6.5, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.text('STATUS', xStatus, y + 6.5, { characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.text('CONTROLS SATISFIED', xCtrl, y + 6.5, { width: cols.ctrl - 8, align: 'right', characterSpacing: 0.8, lineBreak: false, height: 10 })
    doc.moveTo(L, y + 20).lineTo(L + W, y + 20).lineWidth(0.8).strokeColor(ACCENT).stroke()
    doc.y = y + 20
  }
  ensure(ctx, 80)
  header()
  frameworks.forEach((f, i) => {
    const st = fwStatus(f.status)
    const isFocus = focus && focus.id === f.id
    const support = String(f.support || '')
    doc.font('Helvetica').fontSize(7.8)
    const supH = support ? doc.heightOfString(support, { width: W - 16, lineGap: 0.8 }) : 0
    const h = 7 + 13 + (support ? supH + 4 : 0) + 7
    if (doc.y + h > ctx.bottom) { doc.addPage(); header() }
    const y = doc.y
    if (isFocus) doc.rect(L, y, W, h).fill(TINT)
    else if (i % 2 === 1) doc.rect(L, y, W, h).fill(ZEBRA)
    if (isFocus) doc.rect(L, y, 3, h).fill(ACCENT)
    doc.font(isFocus ? 'Helvetica-Bold' : 'Helvetica-Bold').fontSize(9).fillColor(INK_HEAD).text(fitText(doc, f.name, cols.name - 14), xName, y + 7.5, { lineBreak: false, height: 12 })
    doc.font('Helvetica').fontSize(8.3).fillColor(INK).text(fitText(doc, `${f.region || ''}`, cols.region - 8), xRegion, y + 8, { lineBreak: false, height: 12 })
    chip(doc, xStatus, y + 7, st.label.toUpperCase(), { fill: st.fill, h: 13, size: 6.5 })
    // Controls satisfied: "x of y" + a mini bar.
    const txt = f.applicable ? `${f.satisfied} of ${f.applicable}` : 'none applicable'
    doc.font('Helvetica').fontSize(8.3).fillColor(INK).text(txt, xCtrl, y + 8, { width: cols.ctrl - 8, align: 'right', lineBreak: false, height: 12 })
    if (f.applicable) {
      const mbW = 46, mbX = xCtrl + cols.ctrl - 8 - mbW
      doc.rect(mbX, y + 21, mbW, 3).fill(TINT_2)
      doc.rect(mbX, y + 21, (f.satisfied / f.applicable) * mbW, 3).fill(st.fill)
    }
    if (support) {
      doc.font('Helvetica').fontSize(7.8).fillColor(MUTED).text(`${f.category ? f.category + '. ' : ''}${support}`, xName, y + 7 + 13 + 4, { width: W - 16, lineGap: 0.8 })
    }
    doc.moveTo(L, y + h).lineTo(L + W, y + h).lineWidth(0.4).strokeColor(BORDER).stroke()
    doc.x = L
    doc.y = y + h
  })
  doc.moveDown(0.8)
}

// One flag raised to the operator. Security flags get an amber warning glyph.
function flagEntry(ctx, text) {
  const { doc, L, W } = ctx
  const sec = /^security:/i.test(text)
  const body = sec ? text.replace(/^security:\s*/i, '') : text
  doc.font('Helvetica').fontSize(9.5)
  const h = doc.heightOfString(body, { width: W - 26, lineGap: 1.2 }) + (sec ? 12 : 0)
  ensure(ctx, h + 8)
  const y = doc.y
  if (sec) {
    // Warning triangle.
    doc.path(`M ${n2(L + 7)} ${n2(y + 1)} L ${n2(L + 14)} ${n2(y + 13)} L ${n2(L)} ${n2(y + 13)} Z`).fill(AMBER)
    doc.rect(L + 6.3, y + 5, 1.4, 4).fill(WHITE); doc.rect(L + 6.3, y + 10.2, 1.4, 1.4).fill(WHITE)
    doc.font('Helvetica-Bold').fontSize(7).fillColor(AMBER).text('SECURITY', L + 22, y + 1, { characterSpacing: 0.9, lineBreak: false, height: 10 })
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(body, L + 22, y + 12, { width: W - 26, lineGap: 1.2 })
  } else {
    doc.circle(L + 7, y + 6, 5.5).fill(GREY_FILL)
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(WHITE).text('i', L + 5.6, y + 1.6, { lineBreak: false, height: 10 })
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(body, L + 22, y, { width: W - 26, lineGap: 1.2 })
  }
  doc.x = L
  doc.moveDown(0.6)
}

// ---- Cover, contents, running header / footer ------------------------------
function drawCover(ctx, { title, goal, company, member, generatedBy, modeLabel, session, issued, posture, focus, kicker = 'COMPLIANCE EVIDENCE', scope = null, metaRows = null }) {
  const { doc, L, W } = ctx
  const PW = doc.page.width, PH = doc.page.height
  // Brand spine.
  doc.rect(0, 0, 14, PH).fill(ACCENT)
  // Geometric accent: concentric rings off the top-right corner, with a data
  // arc for the share of controls satisfied - a tasteful, meaningful graphic.
  const cx = PW - 70, cy = 150
  for (const [r, lw, col] of [[200, 0.8, TINT_2], [164, 0.8, TINT_2], [128, 14, TINT], [96, 0.8, TINT_2], [60, 0.8, TINT_2]]) {
    doc.circle(cx, cy, r).lineWidth(lw).strokeColor(col).stroke()
  }
  const share = posture.total ? posture.satisfied / posture.total : 0
  if (share > 0) ringSegment(doc, cx, cy, 135, 121, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2, ACCENT)
  if (posture.partial) {
    const a0 = -Math.PI / 2 + share * Math.PI * 2
    ringSegment(doc, cx, cy, 135, 121, a0, a0 + (posture.partial / posture.total) * Math.PI * 2, AMBER)
  }
  // Eyebrow + wordmark.
  doc.font('Helvetica-Bold').fontSize(8).fillColor(ACCENT).text('WORKCOPILOT', L, 72, { characterSpacing: 2.2, lineBreak: false, height: 12 })
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(kicker, L + 92, 72, { characterSpacing: 2.2, lineBreak: false, height: 12 })
  // Title.
  doc.font('Helvetica-Bold').fontSize(focus ? 28 : 34).fillColor(INK_HEAD).text(title, L, 236, { width: 360, lineGap: 2 })
  const afterTitle = doc.y + 10
  doc.rect(L, afterTitle, 56, 3).fill(ACCENT)
  // Task line.
  const shortGoal = goal.length > 170 ? goal.slice(0, 167).trimEnd() + '…' : goal
  doc.font('Helvetica').fontSize(11.5).fillColor(MUTED).text(shortGoal, L, afterTitle + 18, { width: 380, lineGap: 2 })
  // Meta grid.
  let gy = Math.max(doc.y + 34, 440)
  const rows = metaRows || (() => {
    const r = [
      ['Organization', company || '—', 'Operator', member || '—'],
      ['Report ID', session.id || '—', 'Issue date', fmtDate(issued.toISOString())],
      ['Task performed', fmtDate(session.startedAt) || '—', focus ? 'Framework' : 'Guide style', focus ? focus.name : (modeLabel || '—')],
    ]
    if (generatedBy) r.push(['Requested by', generatedBy, '', ''])
    return r
  })()
  const colW = W / 2
  for (const [k1, v1, k2, v2] of rows) {
    for (const [k, v, cxx] of [[k1, v1, L], [k2, v2, L + colW]]) {
      if (!k) continue
      doc.font('Helvetica-Bold').fontSize(7).fillColor(MUTED).text(k.toUpperCase(), cxx, gy, { characterSpacing: 1, lineBreak: false, height: 10 })
      doc.font('Helvetica').fontSize(10.5).fillColor(INK_HEAD).text(fitText(doc, String(v), colW - 24), cxx, gy + 12, { lineBreak: false, height: 14 })
    }
    gy += 40
  }
  // Scope statement.
  const sy = Math.max(gy + 6, 612)
  const scopeText = scope || `Scope: the controls WorkCoPilot applied to this single guided task, how each was satisfied, and the execution evidence behind it${focus ? `, viewed through the lens of ${focus.name}` : ''}. Controls and evidence that support a compliance program; not a certification.`
  doc.font('Helvetica').fontSize(9)
  const sh = doc.heightOfString(scopeText, { width: W - 32, lineGap: 1.5 }) + 22
  doc.rect(L, sy, W, sh).fill(TINT)
  doc.rect(L, sy, 3, sh).fill(ACCENT)
  doc.fillColor(INK).text(scopeText, L + 16, sy + 11, { width: W - 32, lineGap: 1.5 })
  // Footer: confidential tag + issuer.
  const fy = PH - 64
  doc.roundedRect(L, fy, 92, 18, 2).lineWidth(0.8).strokeColor(INK_HEAD).stroke()
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK_HEAD).text('CONFIDENTIAL', L, fy + 5, { width: 92, align: 'center', characterSpacing: 1.6, lineBreak: false, height: 10 })
  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`Prepared by ${REPORT_ISSUER_LINE}`, L + 110, fy + 5, { width: W - 110, align: 'right', lineBreak: false, height: 12 })
  doc.x = L
}

// The contents page frame: title + "how to read" legend. Entries are written
// in the second pass once every section's page is known (fillToc).
function drawTocFrame(ctx, { kind = 'compliance' } = {}) {
  const { doc, L, W } = ctx
  const y = ctx.top
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK_HEAD).text('Contents', L, y, { lineBreak: false, height: 22 })
  doc.rect(L, y + 27, 36, 2.2).fill(ACCENT)
  doc.moveTo(L + 36, y + 28.1).lineTo(L + W, y + 28.1).lineWidth(0.6).strokeColor(BORDER).stroke()
  ctx.tocEntriesY = y + 50
  // Session report: a step-status legend (there are no controls or frameworks).
  if (kind === 'session') {
    let sy = 360
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ACCENT).text('HOW TO READ THIS REPORT', L, sy, { characterSpacing: 1.1, lineBreak: false, height: 11 })
    sy += 20
    doc.font('Helvetica').fontSize(9).fillColor(INK).text('Step statuses', L, sy, { lineBreak: false, height: 12 })
    sy += 16
    const srows = [
      ['done', 'Confirmed on screen', 'the operator’s screen showed the expected result; the time is recorded.'],
      ['current', 'In progress', 'reached during the session but not yet confirmed.'],
      ['pending', 'Not done', 'not reached in this session.'],
    ]
    for (const [st, label, desc] of srows) {
      stepMarker(doc, L + 6, sy + 6, 6, st)
      doc.font('Helvetica-Bold').fontSize(8.8).fillColor(INK_HEAD).text(label, L + 20, sy + 1.5, { lineBreak: false, height: 12 })
      const lw = doc.widthOfString(label)
      doc.font('Helvetica').fontSize(8.8).fillColor(INK).text('— ' + desc, L + 20 + lw + 6, sy + 1.5, { width: W - 20 - lw - 6, lineBreak: false, height: 12 })
      sy += 20
    }
    sy += 10
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED).text('Exhibits are milestone screenshots captured when a step was confirmed; they were redacted on the device before capture and are stored encrypted. The authenticity seal at the end lets any party verify this report was issued unchanged.', L, sy, { width: W, lineGap: 1.5 })
    doc.x = L
    return
  }
  // Legend block sits in a fixed region below the entries.
  let ly = 420
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ACCENT).text('HOW TO READ THIS REPORT', L, ly, { characterSpacing: 1.1, lineBreak: false, height: 11 })
  ly += 18
  doc.font('Helvetica').fontSize(9).fillColor(INK).text('Control statuses', L, ly, { lineBreak: false, height: 12 })
  ly += 16
  const ctrlRows = [
    ['satisfied', 'The control was applied to this task and evidence exists.'],
    ['partial', 'Applied in part, or a prerequisite setting (for example MFA or redaction) was off.'],
    ['na', 'The task gave the control nothing to act on.'],
  ]
  for (const [k, d] of ctrlRows) {
    const st = ctrlStatus(k)
    chip(doc, L, ly, st.label, { fill: st.fill })
    doc.font('Helvetica').fontSize(8.8).fillColor(INK).text(d, L + 76, ly + 1.5, { width: W - 76, lineBreak: false, height: 12 })
    ly += 20
  }
  ly += 8
  doc.font('Helvetica').fontSize(9).fillColor(INK).text('Framework statuses (rolled up from the controls mapped to each framework)', L, ly, { lineBreak: false, height: 12 })
  ly += 16
  const fwRows = [
    ['supported', 'Every applicable control was satisfied for this task.'],
    ['partial', 'Some applicable controls were satisfied.'],
    ['gap', 'No applicable control was satisfied.'],
    ['na', 'No mapped control applied to this task.'],
  ]
  for (const [k, d] of fwRows) {
    const st = fwStatus(k)
    chip(doc, L, ly, st.label.toUpperCase(), { fill: st.fill })
    doc.font('Helvetica').fontSize(8.8).fillColor(INK).text(d, L + 76, ly + 1.5, { width: W - 76, lineBreak: false, height: 12 })
    ly += 20
  }
  ly += 10
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED).text('Exhibits are milestone screenshots captured when the operator confirmed a step; they were redacted on the device before capture and are stored encrypted. Statuses are reproduced exactly as evaluated.', L, ly, { width: W, lineGap: 1.5 })
  doc.x = L
}

// Second pass: write the contents entries with real page numbers and dotted
// leaders. Page numbers are 1-based and include the cover.
function fillToc(ctx, tocPage) {
  const { doc, L, W } = ctx
  const range = doc.bufferedPageRange()
  doc.switchToPage(range.start + tocPage)
  let y = ctx.tocEntriesY
  for (const e of ctx.toc) {
    const pageNo = String(e.page + 1)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text(String(e.num), L, y, { lineBreak: false, height: 14 })
    doc.font('Helvetica').fontSize(10.5).fillColor(INK_HEAD).text(e.title, L + 26, y - 0.5, { lineBreak: false, height: 14 })
    const tw = doc.widthOfString(e.title)
    doc.font('Helvetica').fontSize(10.5).fillColor(INK_HEAD).text(pageNo, L + W - 40, y - 0.5, { width: 40, align: 'right', lineBreak: false, height: 14 })
    const x0 = L + 26 + tw + 8, x1 = L + W - 40 - doc.widthOfString(pageNo) - 6
    if (x1 > x0) {
      doc.save()
      doc.dash(1, { space: 3 })
      doc.moveTo(x0, y + 9).lineTo(x1, y + 9).lineWidth(0.7).strokeColor(BORDER).stroke()
      doc.undash()
      doc.restore()
    }
    y += 28
  }
}

// Running header (report title + organization) on body pages and footer (issuer
// | CONFIDENTIAL | page x of n) on every page after the cover. Each text call
// passes `height` so pdfkit never opens a new page from the header/footer pass.
function runningHeaderFooter(ctx, { title, company, tocPage }) {
  const { doc, L, R, W } = ctx
  const range = doc.bufferedPageRange()
  const PH = doc.page.height
  for (let i = 0; i < range.count; i++) {
    if (i === 0) continue   // cover
    doc.switchToPage(range.start + i)
    if (i !== tocPage) {
      doc.font('Helvetica-Bold').fontSize(7.2).fillColor(MUTED).text(fitText(doc, title.toUpperCase(), W * 0.62), L, 42, { characterSpacing: 1, lineBreak: false, height: 11 })
      if (company) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(fitText(doc, company, W * 0.36), L + W * 0.62, 41.5, { width: W * 0.38, align: 'right', lineBreak: false, height: 11 })
      doc.moveTo(L, 57).lineTo(R, 57).lineWidth(0.5).strokeColor(BORDER).stroke()
    }
    doc.moveTo(L, PH - 50).lineTo(R, PH - 50).lineWidth(0.5).strokeColor(BORDER).stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(REPORT_ISSUER_LINE, L, PH - 42, { width: 220, lineBreak: false, height: 11 })
    doc.font('Helvetica-Bold').fontSize(7).fillColor(INK_HEAD).text('CONFIDENTIAL', L, PH - 42, { width: W, align: 'center', characterSpacing: 1.3, lineBreak: false, height: 11 })
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(`Page ${i + 1} of ${range.count}`, R - 120, PH - 42, { width: 120, align: 'right', lineBreak: false, height: 11 })
  }
}

// Shared authenticity seal, rendered near the end of EVERY report PDF: the
// content hash, the signature, the issue date + timestamp, the issuer and the
// contact addresses. `payload` is the report's canonical content (hashed);
// `kind`/`reportId` scope the signature. Returns nothing - it draws the block.
function attestationBlock(doc, { payload, kind, reportId }) {
  const att = attestReport(payload, { kind, reportId })
  const W = doc.page.width - 120
  const lineH = 13
  // Reserve enough room; move to a fresh page if the seal would be split.
  if (doc.y + 150 > doc.page.height - 60) doc.addPage()
  doc.moveDown(0.8)
  const top = doc.y
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Report authenticity', 60, top + 10, { width: W })
  let y = doc.y + 3
  const row = (label, value, mono) => {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, 70, y, { width: 118, continued: false })
    doc.font(mono ? 'Courier' : 'Helvetica').fontSize(8).fillColor(INK).text(value, 190, y, { width: W - 140 })
    y = doc.y + 2
  }
  let human = ''
  try { human = new Date(att.issuedAt).toLocaleString() } catch { human = att.issuedAt }
  row('Issued by', att.issuer)
  row('Issued', `${human}  (${att.issuedAt} UTC)`)
  row('Content SHA-256', att.hash, true)
  row(`Signature`, att.signature, true)
  row('Algorithm / key', `${att.alg} - key ${att.keyId}`)
  row('Verify', 'https://admireveda.com/api/work/reports/verify')
  row('Contact', REPORT_CONTACTS.join('   |   '))
  const bottom = y + 6
  // Border around the seal.
  doc.rect(60, top + 2, doc.page.width - 120, bottom - top).strokeColor(ACCENT).lineWidth(1).stroke()
  doc.x = 60; doc.y = bottom + 8
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(MUTED).text(
    'This seal attests that ' + att.issuer + ' issued this exact content at the time shown. Any change to the content changes the SHA-256 hash and invalidates the signature. It is an integrity and origin seal, not a legal e-signature or a compliance certification.',
    60, doc.y, { width: W })
  doc.x = 60
}

function codeBlock(doc, body) {
  codeBlockAt(doc, body, doc.page.margins.left, doc.page.width - doc.page.margins.left - doc.page.margins.right)
}

// The code panel at an explicit x / width (shared by codeBlock and the
// compliance report's indented timeline). `fit` truncates an over-long line
// with an ellipsis so it can never run past the panel edge; the default keeps
// the historical behaviour (clipped, not reflowed) for the other reports.
function codeBlockAt(doc, body, x, width, { fit = false } = {}) {
  const lines = String(body == null ? '' : body).split('\n')
  const lineH = 12
  const padding = 8
  const startX = doc.x

  for (const line of lines) {
    // Page-break BEFORE drawing, so a block never runs off the page edge.
    if (doc.y + lineH + padding > doc.page.height - doc.page.margins.bottom) doc.addPage()
    const y = doc.y
    doc.rect(x, y - 2, width, lineH + 2).fill(CODE_BG)
    doc.fillColor(INK).font('Courier').fontSize(9)
    const shown = fit ? fitText(doc, line, width - padding * 2) : line
    doc.text(shown.length ? shown : ' ', x + padding, y, {
      width: width - padding * 2,
      lineBreak: false,   // keep indentation; long lines are clipped, not reflowed
    })
    doc.y = y + lineH
  }
  doc.x = startX
  doc.moveDown(0.6)
}

// Truncate `str` with an ellipsis so it fits `width` in the CURRENT font/size.
function fitText(doc, str, width) {
  const s = String(str == null ? '' : str)
  if (doc.widthOfString(s) <= width) return s
  const ell = '…'
  let lo = 0, hi = s.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (doc.widthOfString(s.slice(0, mid).trimEnd() + ell) <= width) lo = mid
    else hi = mid - 1
  }
  return s.slice(0, lo).trimEnd() + ell
}
