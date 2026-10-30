// Wave 3 step reading, run side: pure helpers for the "Read steps" pass in the
// wizard (useStepReader.js + StepReadCard.jsx + StepReadingPanel.jsx). What a
// read failure means for the trainer, which reading to show on a row, and the
// counts the card reflects. No React, no I/O; unit-tested in stepReadRun.test.mjs.
//
// Failures come in two scopes. A GLOBAL one (no company key, an AI that cannot
// see images, no permission, the service unavailable) stops the pass and shows
// one banner with where to fix it. A STEP one (no screenshot, unreadable, the
// step changed meanwhile) is a calm note on that row and the pass moves on.
// The UI shows each by its i18n key, never the server's own text.

import { readingHolds } from './stepReadingModel.js'

const hasText = (r) => String((r && r.instruction) || '').trim() !== ''

export const READ_GLOBAL_KINDS = ['companyKey', 'vision', 'userKey', 'notConfigured', 'signedOut', 'forbidden', 'unavailable']
export const READ_STEP_KINDS = ['noFrame', 'unreadable', 'changed', 'missing', 'failed']

// A failed workflowReadStep (src/api.js error: { status, data }) -> { scope, kind }.
export function readErrorKind(err) {
  const status = err && err.status
  const d = (err && err.data) || {}
  if (d.needsCompanyKey) return { scope: 'global', kind: 'companyKey' }
  if (d.needsVision) return { scope: 'global', kind: 'vision' }
  if (d.needsKey) return { scope: 'global', kind: 'userKey' }
  if (status === 401) return { scope: 'global', kind: 'signedOut' }
  if (status === 403) return { scope: 'global', kind: 'forbidden' }
  if (d.code === 'STEP_READ_NO_FRAME') return { scope: 'step', kind: 'noFrame' }
  if (d.code === 'STEP_READ_UNREADABLE' || status === 422) return { scope: 'step', kind: 'unreadable' }
  if (status === 409) return { scope: 'step', kind: 'changed' }
  if (status === 404) return { scope: 'step', kind: 'missing' }
  // No answer at all (offline), busy, not configured, or plan / hours limits:
  // every next step would fail the same way, so stop and say it once.
  // A 503 that is not "busy" is the AI service not set up at all (an administrator
  // must turn it on); trying again later would not help.
  if (status === 503 && !d.busy && !d.code) return { scope: 'global', kind: 'notConfigured' }
  if (!status || status === 402 || status === 429 || status >= 500) return { scope: 'global', kind: 'unavailable' }
  return { scope: 'step', kind: 'failed' }
}
export const globalNoteKey = (kind) => `teach.read.global.${READ_GLOBAL_KINDS.includes(kind) ? kind : 'unavailable'}`
export const stepNoteKey = (kind) => `teach.read.note.${READ_STEP_KINDS.includes(kind) ? kind : 'failed'}`

// The reading the server stored for one step, from a { workflow } response.
export function readingFromWorkflow(workflow, stepId) {
  const steps = (workflow && Array.isArray(workflow.steps)) ? workflow.steps : []
  const s = steps.find((x) => x && x.id === stepId)
  return s && s.reading && typeof s.reading === 'object' ? s.reading : null
}

// The reading to show on a row: only one that still holds for the row and the
// row after it (a replaced screenshot or a reorder hides it until the next save
// drops it). `next` is the row below, or null for the last row.
export function shownReading(row, next) {
  return readingHolds(row, next) ? row.reading : null
}

// A step note to show on a row: only while it still describes the row's screenshot.
export function shownNote(row, notes) {
  const n = row && row.id && notes ? notes[row.id] : null
  return n && n.shot === String(row.shot || '') ? n.kind : null
}

// What the card reflects before a pass. Saved or not (ids come with the save):
// withShot = steps that have a screenshot and an instruction; toRead = those
// without a current reading.
export function readCounts(rows) {
  const all = Array.isArray(rows) ? rows : []
  const list = all.map((r, i) => [r, all[i + 1]]).filter(([r]) => r && r.shot && hasText(r))
  return { withShot: list.length, toRead: list.filter(([r, next]) => !shownReading(r, next)).length }
}

// The control kind word worth showing beside the label ('other' / 'none' say nothing).
const KIND_WORDS = ['button', 'link', 'menu', 'tab', 'field', 'checkbox', 'option', 'icon']
export const kindKey = (kind) => (KIND_WORDS.includes(kind) ? `teach.read.kind.${kind}` : null)

// The summary line after a pass -> { key, vars }.
export function runSummary({ read = 0, total = 0, stopped = false } = {}) {
  if (total === 0) return { key: 'teach.read.summary.nothing', vars: {} }
  if (stopped) return { key: 'teach.read.summary.stopped', vars: { read, total } }
  if (total > 0 && read === 0) return { key: 'teach.read.summary.none', vars: {} }
  return { key: 'teach.read.summary.done', vars: { read, total } }
}
