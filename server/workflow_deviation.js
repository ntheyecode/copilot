// ===========================================================================
// WorkCoPilot TEACH WORKFLOWS, Wave 3 part C: noticing when real work leaves
// the published workflow.
//
// While an employee follows a published workflow, the live guide (the watch
// navigator) is asked ONE extra thing in the same call: does the real screen
// differ from what this workflow step expects? A yes becomes a deviation:
//   ui_changed      the control the step names is renamed, moved or gone
//   error           an error or rejection the workflow does not cover
//   blocked         the person cannot continue from here as the workflow says
//   untrained_path  they had to go through a screen or step the workflow lacks
//                   (the guide proposes that step: the "autolearn" candidate)
//   skipped         a workflow step was skipped and it matters
// Ordinary slips the person corrects (a typo, a wrong click put right) are NOT
// deviations; those stay the guide's normal flags. The incident store routes a
// deviation to trainers, PMs and above, admins and executives.
//
// Pure: prompt text and parser. No I/O. (Dedupe lives in workflow_incidents.js.)
// ===========================================================================

import { scrubGuidance } from './ai_language.js'
import { stripGuideMarkup } from './guide_markup.js'

export const DEVIATION_KINDS = ['ui_changed', 'error', 'blocked', 'untrained_path', 'skipped']

const line = (v, n) => stripGuideMarkup(String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, n)

export function deviationPromptBlock(workflowTitle) {
  const title = line(workflowTitle, 160).replace(/["“”]/g, "'")
  return [
    `THIS CHECKLIST IS A WORKFLOW THE COMPANY PUBLISHED ("${title}"). Its steps are the company's approved way.`,
    'Also return "deviation": null when the screen matches what the current workflow step expects, or when the',
    'person simply slipped and is putting it right (a typo, a wrong click they can undo). Otherwise return',
    '{"kind":"ui_changed|error|blocked|untrained_path|skipped","why":"one sentence: what the step expects, what the screen shows instead",',
    '"extraStep":"only for untrained_path: the one missing step written as an instruction, naming the real control; else empty"}.',
    'ui_changed: the control the step names is renamed, moved or missing. error: an error or rejection the workflow does not cover.',
    'blocked: they cannot continue the way the workflow says. untrained_path: they had to go through a screen or step the',
    'workflow does not include. skipped: a workflow step was skipped and it matters for the result.',
    'Judge only from what is visible. Never put personal data, values from the screen that look private, or masked text in "why" or "extraStep".',
  ].join('\n')
}

// The navigator's parsed reply -> { kind, why, extraStep } or null.
export function parseDeviation(parsed) {
  const d = parsed && parsed.deviation
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const kind = String(d.kind || '').trim().toLowerCase()
  if (!DEVIATION_KINDS.includes(kind)) return null
  const why = line(scrubGuidance(String(d.why || '')), 300)
  if (!why) return null
  const extraStep = kind === 'untrained_path' ? line(scrubGuidance(String(d.extraStep || '')), 300) : ''
  return { kind, why, extraStep: extraStep || null }
}

// Navigator hook for workNavigate's `extra` option.
export function deviationHook(workflowTitle) {
  return { system: deviationPromptBlock(workflowTitle), parse: parseDeviation }
}

export default { DEVIATION_KINDS, deviationPromptBlock, parseDeviation, deviationHook }
