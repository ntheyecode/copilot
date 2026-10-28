// Project reports (Depth-2): aggregate a project's tasks + their guided sessions into
// a report the user can generate on demand. Three kinds:
//   success  - every completed task's outcome + confirmed steps, rolled up to the
//              project end-state (the "add all successes of all completed tasks").
//   security - security-relevant actions (destructive steps) + flags across tasks.
//   error    - incomplete tasks + errors/flags encountered.
// Pure (given the project + a map of its task sessions); the endpoint gathers the
// sessions and the document engine renders the markdown in the unified style.
export const REPORT_KINDS = ['success', 'security', 'error']
const TITLE = { success: 'Project success report', security: 'Project security report', error: 'Project issues report' }

const doneSteps = (s) => (s && Array.isArray(s.steps) ? s.steps.filter((st) => st && st.status === 'done') : [])
const flagTexts = (s) => (s && Array.isArray(s.events) ? s.events.filter((e) => e && e.kind === 'flag').map((e) => String(e.text || '').trim()).filter(Boolean) : [])
const destructiveSteps = (s) => (s && Array.isArray(s.steps) ? s.steps.filter((st) => st && st.destructive) : [])

export function buildProjectReport(project, sessionsByTaskId = {}, kind = 'success') {
  const k = REPORT_KINDS.includes(kind) ? kind : 'success'
  const p = project || {}
  const tasks = Array.isArray(p.tasks) ? p.tasks : []
  const sess = (id) => (id && sessionsByTaskId[id]) || null
  let sections = []
  if (k === 'success') {
    sections = tasks.filter((t) => t.state === 'done').map((t) => ({
      task: t.title,
      doneState: t.doneState || '',
      outcome: t.outcome || null,
      steps: doneSteps(sess(t.sessionId)).map((st) => ({ text: st.text, validate: st.validate || null })),
    }))
  } else if (k === 'security') {
    sections = tasks.map((t) => ({
      task: t.title,
      destructive: destructiveSteps(sess(t.sessionId)).map((st) => ({ text: st.text, why: st.destructiveWhy || null })),
      flags: flagTexts(sess(t.sessionId)),
    })).filter((s) => s.destructive.length || s.flags.length)
  } else {
    sections = tasks.map((t) => ({
      task: t.title,
      state: t.state,
      incomplete: t.state !== 'done',
      flags: flagTexts(sess(t.sessionId)),
    })).filter((s) => s.incomplete || s.flags.length)
  }
  const endState = p.endState || { done: '', checks: [] }
  return { kind: k, title: TITLE[k], project: { name: p.name || '', goal: p.goal || '' }, endState, sections, markdown: toMarkdown(k, p, endState, sections) }
}

function toMarkdown(k, p, endState, sections) {
  const lines = [`# ${TITLE[k]}`, '', `**Project:** ${p.name || ''}`, p.goal ? `**Goal:** ${p.goal}` : '', '']
  if (k === 'success') {
    if (endState.done) lines.push(`**Outcome:** ${endState.done}`, '')
    if (Array.isArray(endState.checks) && endState.checks.length) { lines.push('**Checks:**'); for (const c of endState.checks) lines.push(`- ${c}`); lines.push('') }
    for (const s of sections) {
      lines.push(`## ${s.task}`)
      if (s.doneState) lines.push(`_Done when:_ ${s.doneState}`)
      if (s.outcome) lines.push(`_Outcome:_ ${s.outcome}`)
      for (const st of s.steps) lines.push(`- ${st.text}${st.validate ? ` (confirmed: ${st.validate})` : ''}`)
      lines.push('')
    }
    if (!sections.length) lines.push('_No tasks are completed yet._')
  } else if (k === 'security') {
    if (!sections.length) lines.push('_No security-relevant actions or flags were recorded._')
    for (const s of sections) {
      lines.push(`## ${s.task}`)
      for (const d of s.destructive) lines.push(`- Sensitive action: ${d.text}${d.why ? ` (${d.why})` : ''}`)
      for (const f of s.flags) lines.push(`- Flag: ${f}`)
      lines.push('')
    }
  } else {
    if (!sections.length) lines.push('_No incomplete tasks or errors were recorded._')
    for (const s of sections) {
      lines.push(`## ${s.task}${s.incomplete ? ` (${s.state})` : ''}`)
      for (const f of s.flags) lines.push(`- ${f}`)
      lines.push('')
    }
  }
  return lines.filter((l) => l !== undefined).join('\n')
}
