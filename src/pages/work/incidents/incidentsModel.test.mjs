import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  INCIDENT_KINDS, STATE_FILTERS, stateParam, normalizeFilter, kindKey, kindLabelKey, kindTint,
  isActive, stateLabelKey, stateTint, stepNumber, stateActions, draftHref, INBOX_PATH,
  summaryChips, activeByKind, activeTotal, workflowOptions, matchesWorkflow, visibleIncidents,
  replaceIncident, alertTitle, unreadAlerts, errorKey, shouldReload, relTime, cleanNote, NOTE_MAX,
} from './incidentsModel.js'
import { deepMergeEn } from '../../../i18n/deep_merge_en.js'

const err = (status, message = 'x') => Object.assign(new Error(message), { status })
const inc = (o = {}) => ({
  id: 'wi1', workflowRef: { id: 'w2', groupId: 'g1', version: 2, title: 'Create a purchase order', mode: 'run' },
  stepIndex: 2, stepText: 'Press New', kind: 'ui_changed', state: 'open', count: 1,
  lastAt: '2026-10-30T10:00:00.000Z', resolution: null, draftId: null, ...o,
})

test('kinds: every server kind has its own label; an unknown one reads as other', () => {
  assert.deepEqual(INCIDENT_KINDS, ['ui_changed', 'error', 'blocked', 'untrained_path', 'skipped'])
  assert.equal(kindLabelKey('blocked'), 'wfIssues.kind.blocked')
  assert.equal(kindKey('something_new'), 'other')
  assert.equal(kindLabelKey(undefined), 'wfIssues.kind.other')
  assert.equal(kindTint('error'), 'red')
  assert.equal(kindTint('untrained_path'), 'green')
  assert.equal(kindTint('nope'), 'neutral')
})

test('kinds stay in step with the server catalog (no parallel list drifts)', async () => {
  const { DEVIATION_KINDS } = await import(pathToFileURL(join(process.cwd(), 'server/workflow_deviation.js')).href)
  assert.deepEqual([...DEVIATION_KINDS].sort(), [...INCIDENT_KINDS].sort())
})

test('filters: active / resolved / dismissed / all, all sends no state', () => {
  assert.deepEqual(STATE_FILTERS, ['active', 'resolved', 'dismissed', 'all'])
  assert.equal(stateParam('active'), 'active')
  assert.equal(stateParam('all'), undefined)
  assert.equal(stateParam('bogus'), undefined)
  assert.equal(normalizeFilter('dismissed'), 'dismissed')
  assert.equal(normalizeFilter('open'), 'active')
  assert.equal(normalizeFilter(null), 'active')
})

test('state badge: adopted reads as added to draft, never a raw state', () => {
  assert.equal(stateLabelKey(inc()), 'wfIssues.state.open')
  assert.equal(stateLabelKey(inc({ state: 'acknowledged' })), 'wfIssues.state.acknowledged')
  assert.equal(stateLabelKey(inc({ state: 'resolved', resolution: 'adopted' })), 'wfIssues.state.adopted')
  assert.equal(stateLabelKey(inc({ state: 'weird' })), 'wfIssues.state.open')
  assert.equal(stateTint(inc({ state: 'resolved', resolution: 'adopted' })), 'green')
  assert.equal(stateTint(inc({ state: 'dismissed' })), 'neutral')
  assert.equal(isActive(inc({ state: 'acknowledged' })), true)
  assert.equal(isActive(inc({ state: 'resolved' })), false)
})

test('step number is 1-based, null without an index', () => {
  assert.equal(stepNumber(0), 1)
  assert.equal(stepNumber(4), 5)
  assert.equal(stepNumber(null), null)
  assert.equal(stepNumber(-1), null)
  assert.equal(stepNumber('2'), null)
})

test('state actions follow the lifecycle; a watcher gets none', () => {
  assert.deepEqual(stateActions(inc(), true).map((a) => a.action), ['acknowledge', 'resolve', 'dismiss'])
  assert.deepEqual(stateActions(inc({ state: 'acknowledged' }), true).map((a) => a.to), ['resolved', 'dismissed'])
  assert.deepEqual(stateActions(inc({ state: 'resolved' }), true), [{ action: 'reopen', to: 'open' }])
  assert.deepEqual(stateActions(inc({ state: 'dismissed' }), true), [{ action: 'reopen', to: 'open' }])
  assert.deepEqual(stateActions(inc(), false), [])
  assert.deepEqual(stateActions(null, true), [])
})

test('links: the draft opens in the Teach studio, the inbox has one path', () => {
  assert.equal(draftHref('d 1'), '/work/teach?draft=d%201')
  assert.equal(draftHref(null), null)
  assert.equal(INBOX_PATH, '/work/workflow-issues')
})

test('summary chips: open + acknowledged always, kinds only when active', () => {
  const chips = summaryChips({ open: 3, acknowledged: 1, resolved: 9, dismissed: 2, byKind: { error: 2, untrained_path: 2, skipped: 0 } })
  assert.deepEqual(chips.map((c) => [c.key, c.n]), [
    ['wfIssues.summary.open', 3], ['wfIssues.summary.acknowledged', 1],
    ['wfIssues.kind.error', 2], ['wfIssues.kind.untrained_path', 2],
  ])
  assert.deepEqual(summaryChips(null).map((c) => c.n), [0, 0])
})

test('executive counts: every kind present, total = open + acknowledged', () => {
  assert.deepEqual(activeByKind({ byKind: { blocked: 4 } }).map((x) => x.n), [0, 0, 4, 0, 0])
  assert.equal(activeTotal({ open: 2, acknowledged: 3, resolved: 7 }), 5)
  assert.equal(activeTotal(undefined), 0)
})

test('workflow filter: options by group, sorted, a chosen key is never dropped', () => {
  const list = [
    inc({ id: 'a', workflowRef: { id: 'w2', groupId: 'g1', title: 'Purchase order' } }),
    inc({ id: 'b', workflowRef: { id: 'w1', groupId: 'g1', title: 'Purchase order (old)' } }),
    inc({ id: 'c', workflowRef: { id: 'w5', groupId: 'g2', title: 'Close the month' } }),
  ]
  assert.deepEqual(workflowOptions(list).map((o) => o.key), ['g2', 'g1'])
  assert.deepEqual(workflowOptions(list, 'g9').map((o) => o.key), ['g9', 'g2', 'g1'])
  assert.equal(matchesWorkflow(list[1], 'g1'), true)
  assert.equal(matchesWorkflow(list[1], 'w1'), true)
  assert.equal(matchesWorkflow(list[2], 'g1'), false)
  assert.deepEqual(visibleIncidents(list, 'g1').map((x) => x.id), ['a', 'b'])
})

test('newest first, and a local update replaces in place', () => {
  const list = [inc({ id: 'old', lastAt: '2026-10-01T00:00:00Z' }), inc({ id: 'new', lastAt: '2026-10-29T00:00:00Z' })]
  assert.deepEqual(visibleIncidents(list, '').map((x) => x.id), ['new', 'old'])
  const next = replaceIncident(list, { id: 'old', state: 'resolved' })
  assert.equal(next.find((x) => x.id === 'old').state, 'resolved')
  assert.equal(next.find((x) => x.id === 'old').stepText, 'Press New')
  assert.equal(replaceIncident(list, null), list)
})

test('alert titles are worded from structured fields, with or without a step', () => {
  assert.deepEqual(alertTitle({ kind: 'error', workflowTitle: ' Pay a bill ', stepIndex: 0 }), { key: 'wfIssues.alert.withStep.error', vars: { workflow: 'Pay a bill', step: 1 }, untitled: false })
  assert.equal(alertTitle({ kind: 'skipped', workflowTitle: 'X', stepIndex: null }).key, 'wfIssues.alert.noStep.skipped')
  assert.equal(alertTitle({ kind: 'mystery', workflowTitle: '' }).key, 'wfIssues.alert.noStep.other')
  assert.equal(alertTitle({}).untitled, true)
  assert.deepEqual(unreadAlerts([{ id: 1, read: true }, { id: 2, read: false }, null]).map((a) => a.id), [2])
})

test('errors: every status maps to a reader-facing key, never the server text', () => {
  assert.equal(errorKey(err(403), 'load'), 'wfIssues.err.notRecipient')
  assert.equal(errorKey(err(403), 'state'), 'wfIssues.err.cannotManage')
  assert.equal(errorKey(err(403), 'adopt'), 'wfIssues.err.notAuthor')
  assert.equal(errorKey(err(404), 'state'), 'wfIssues.err.notFound')
  assert.equal(errorKey(err(409, 'This incident is already closed.'), 'adopt'), 'wfIssues.err.closed')
  assert.equal(errorKey(err(409, 'This step is already in a draft waiting for review.'), 'adopt'), 'wfIssues.err.inDraft')
  assert.equal(errorKey(err(409, 'That workflow version is no longer live. Add the step to its newest version instead.'), 'adopt'), 'wfIssues.err.notLive')
  assert.equal(errorKey(err(409, 'This incident has no step to add.'), 'adopt'), 'wfIssues.err.noStep')
  assert.equal(errorKey(err(409, 'Something else'), 'state'), 'wfIssues.err.conflict')
  assert.equal(errorKey(err(500), 'load'), 'wfIssues.err.load')
  assert.equal(errorKey(new TypeError('Failed to fetch'), 'adopt'), 'wfIssues.err.adopt')
  assert.equal(errorKey(null, 'state'), 'wfIssues.err.save')
  assert.equal(shouldReload(err(409)), true)
  assert.equal(shouldReload(err(404)), true)
  assert.equal(shouldReload(err(403)), false)
})

test('the server 409 messages the mapping reads are still the ones it sends', () => {
  const src = readFileSync(join(process.cwd(), 'server/workflow_incidents.js'), 'utf8').toLowerCase()
  for (const s of ['already closed', 'waiting for review', 'no longer live', 'no step to add']) assert.ok(src.includes(s), s)
})

test('relative time is localized by Intl and safe on bad input', () => {
  const now = Date.parse('2026-10-30T12:00:00Z')
  assert.equal(relTime('2026-10-30T09:00:00Z', now, 'en'), '3 hours ago')
  assert.equal(relTime('2026-10-29T12:00:00Z', now, 'en'), 'yesterday')
  assert.equal(relTime('2026-10-30T11:59:40Z', now, 'en'), 'now')
  assert.equal(relTime('not a date', now, 'en'), '')
  assert.ok(relTime('2026-10-30T09:00:00Z', now, 'de').length > 0)
})

test('notes are trimmed and bounded like the server', () => {
  assert.equal(cleanNote('  fixed in v3  '), 'fixed in v3')
  assert.equal(cleanNote(null), '')
  assert.equal(cleanNote('x'.repeat(900)).length, NOTE_MAX)
})

// Every key the model can produce exists in English, so no label can render a raw key.
test('every key the model produces exists in the English catalog', async () => {
  const dir = join(process.cwd(), 'src/i18n/locales')
  const en = { ...(await import(pathToFileURL(join(dir, 'en.js')).href)).default }
  for (const f of readdirSync(join(dir, 'en')).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, (await import(pathToFileURL(join(dir, 'en', f)).href)).default || {})
  const has = (k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), en) !== undefined
  const keys = new Set()
  for (const kind of [...INCIDENT_KINDS, 'other']) {
    keys.add(kindLabelKey(kind)); keys.add(alertTitle({ kind, stepIndex: 1 }).key); keys.add(alertTitle({ kind }).key)
  }
  for (const state of ['open', 'acknowledged', 'resolved', 'dismissed']) keys.add(stateLabelKey({ state }))
  keys.add(stateLabelKey({ state: 'resolved', resolution: 'adopted' }))
  for (const c of summaryChips({})) keys.add(c.key)
  for (const s of [403, 404, 409, 500]) for (const op of ['load', 'state', 'adopt']) keys.add(errorKey(err(s), op))
  for (const m of ['already closed', 'waiting for review', 'no longer live', 'no step to add']) keys.add(errorKey(err(409, m), 'adopt'))
  for (const a of ['acknowledge', 'resolve', 'dismiss', 'reopen']) keys.add(`wfIssues.act.${a}`)
  for (const f of STATE_FILTERS) keys.add(`wfIssues.filter.${f}`)
  const missing = [...keys].filter((k) => !has(k))
  assert.deepEqual(missing, [])
})
