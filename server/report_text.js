// Plain-text session report. Mirrors the PDF report's content and the SAME
// completed-only privacy gate (detail - commands, code, link, sub-steps - is
// shown ONLY for steps confirmed on screen; not-reached steps are listed by
// name and status alone), so the .txt download can never leak the how-to of work
// that was never performed. Sealed with the same attestation the audit log uses.
import { attestReport, attestationText } from './report_sign.js'

const W = 74
function utc(iso) { try { return new Date(iso).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC' } catch { return String(iso || '') } }
function indent(text, pad) { return String(text == null ? '' : text).split('\n').map((l) => pad + l).join('\n') }

export function formatWorkReportText(session, { achieved = '', modeLabel = '' } = {}) {
  const s = session || {}
  const steps = Array.isArray(s.steps) ? s.steps : []
  const doneN = steps.filter((x) => x.status === 'done').length
  const flags = (s.events || []).filter((e) => e.kind === 'flag')
  const qa = (s.events || []).filter((e) => e.kind === 'ask' || e.kind === 'answer')
  const shots = (Array.isArray(s.shots) ? s.shots : []).filter((sh) => sh && Number.isInteger(Number(sh.stepIndex)))
  const evidenceCount = Math.min(5, new Set(shots.filter((sh) => { const st = steps[Number(sh.stepIndex)]; return st && st.status === 'done' }).map((sh) => Number(sh.stepIndex))).size)
  const title = String(s.title || '').trim() || 'Session Report'
  const goal = String(s.goal || '').trim() || '(no goal recorded)'
  const ended = s.status === 'ended'

  const L = []
  L.push('WorkCoPilot - Session Report')
  L.push('Task: ' + title)
  L.push('Goal: ' + goal)
  if (modeLabel) L.push('Mode: ' + modeLabel)
  L.push('Generated: ' + utc(new Date().toISOString()))
  L.push('Status: ' + (ended ? `Ended - ${doneN} of ${steps.length} step${steps.length === 1 ? '' : 's'} confirmed on screen` : `In progress - ${doneN} of ${steps.length} confirmed`))
  L.push('Note: commands, code, links and sub-steps are shown ONLY for steps confirmed on screen; steps not reached are listed by name and status alone.')
  L.push('='.repeat(W))
  L.push('')
  L.push('WHAT WAS ACHIEVED')
  L.push('-'.repeat(W))
  L.push(String(achieved || '').trim() || '(No summary was generated. The confirmed steps below are the record of what was done.)')
  L.push('')
  L.push('STEPS')
  L.push('-'.repeat(W))
  steps.forEach((st, i) => {
    const done = st.status === 'done'
    const tag = done ? 'DONE' : (st.status === 'current' ? 'CURRENT' : 'NOT REACHED')
    let head = `Step ${i + 1} [${tag}] ${String(st.text || '').trim()}`
    if (done && st.doneAt) head += `   (confirmed ${utc(st.doneAt)})`
    L.push(head)
    // Privacy gate: only confirmed steps carry detail.
    if (!done) { L.push('    (not performed - details omitted)'); L.push(''); return }
    if (st.validate) L.push('    Done when: ' + st.validate)
    if (st.url) L.push('    Link: ' + st.url)
    if (Array.isArray(st.commands) && st.commands.length) { L.push('    Commands:'); st.commands.forEach((c) => L.push('        $ ' + c)) }
    if (st.code && st.code.content) { L.push('    Code (' + (st.code.file || 'code') + '):'); L.push(indent(st.code.content, '        ')) }
    if (Array.isArray(st.sub) && st.sub.length) {
      L.push('    Detailed steps:')
      st.sub.forEach((ss, j) => {
        const t = String((ss && ss.text) || '').trim(); if (!t) return
        L.push('        ' + (j + 1) + '. ' + t)
        if (ss.validate) L.push('           Done when: ' + ss.validate)
        if (ss.url) L.push('           Link: ' + ss.url)
        if (Array.isArray(ss.commands) && ss.commands.length) ss.commands.forEach((c) => L.push('           $ ' + c))
        if (ss.code && ss.code.content) L.push(indent(ss.code.content, '           '))
      })
    }
    L.push('')
  })
  L.push('EVIDENCE - SCRUBBED SCREENSHOTS')
  L.push('-'.repeat(W))
  if (evidenceCount > 0) L.push(`${evidenceCount} milestone screenshot${evidenceCount === 1 ? '' : 's'} captured when a step was confirmed ${evidenceCount === 1 ? 'is' : 'are'} included in the PDF report. Every screenshot is redacted on your device before capture - only the scrubbed image is ever stored (encrypted at rest) or transmitted. (This text report lists the count; the images are in the PDF.)`)
  else L.push('No milestone screenshots were captured for this task (screen watching may have been off while steps were confirmed).')
  L.push('')
  if (flags.length) { L.push('NOTES & WARNINGS'); L.push('-'.repeat(W)); flags.forEach((f) => L.push('- ' + String(f.text || '').replace(/\n/g, ' '))); L.push('') }
  if (qa.length) {
    L.push('QUESTIONS & ANALYSIS'); L.push('-'.repeat(W))
    qa.forEach((e) => { if (e.kind === 'ask') L.push('Q. ' + String(e.text || '')); else L.push(indent(String(e.text || ''), '   ')) })
    L.push('')
  }
  L.push('This report is a record of guided work to help you act. It is not legal, financial, medical or other professional advice.')
  const body = L.join('\n') + '\n'
  // Seal: SHA-256 hash + HMAC over the canonical text, same scheme as the audit log.
  return body + attestationText(attestReport(body, { kind: 'session-text', reportId: s.id || '' }))
}
