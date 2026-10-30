import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readErrorKind, globalNoteKey, stepNoteKey, readingFromWorkflow, shownReading, shownNote,
  readCounts, kindKey, runSummary, READ_GLOBAL_KINDS, READ_STEP_KINDS,
} from './stepReadRun.js'

const A = 'a'.repeat(32) + '.jpg'
const B = 'b'.repeat(32) + '.jpg'
const R = { controlLabel: 'Approve', controlKind: 'button', doneWhen: 'Approved badge shows', confidence: 0.9, shot: A }
const err = (status, data) => Object.assign(new Error('x'), { status, data })

test('errors: every server answer of the read route maps to a scope and a kind', () => {
  assert.deepEqual(readErrorKind(err(503, { error: 'x', needsCompanyKey: true })), { scope: 'global', kind: 'companyKey' })
  assert.deepEqual(readErrorKind(err(400, { error: 'x', needsVision: true })), { scope: 'global', kind: 'vision' })
  assert.deepEqual(readErrorKind(err(503, { error: 'x', needsKey: true })), { scope: 'global', kind: 'userKey' })
  assert.deepEqual(readErrorKind(err(403, { error: 'x' })), { scope: 'global', kind: 'forbidden' })
  assert.deepEqual(readErrorKind(err(400, { error: 'x', code: 'STEP_READ_NO_FRAME' })), { scope: 'step', kind: 'noFrame' })
  assert.deepEqual(readErrorKind(err(422, { error: 'x', code: 'STEP_READ_UNREADABLE' })), { scope: 'step', kind: 'unreadable' })
  assert.deepEqual(readErrorKind(err(409, { error: 'x' })), { scope: 'step', kind: 'changed' })
  assert.deepEqual(readErrorKind(err(404, { error: 'x' })), { scope: 'step', kind: 'missing' })
  assert.deepEqual(readErrorKind(err(503, { error: 'x', busy: true })), { scope: 'global', kind: 'unavailable' })
  assert.deepEqual(readErrorKind(err(503, { error: 'x', needsKey: false })), { scope: 'global', kind: 'notConfigured' })
  assert.deepEqual(readErrorKind(err(401, { error: 'x', loggedOut: true })), { scope: 'global', kind: 'signedOut' })
  assert.deepEqual(readErrorKind(err(402, { error: 'x' })), { scope: 'global', kind: 'unavailable' })
  assert.deepEqual(readErrorKind(new TypeError('Failed to fetch')), { scope: 'global', kind: 'unavailable' })
  assert.deepEqual(readErrorKind(err(400, { error: 'x' })), { scope: 'step', kind: 'failed' })
})

test('errors: a key exists for every kind, unknown kinds fall back to a safe one', () => {
  for (const k of READ_GLOBAL_KINDS) assert.equal(globalNoteKey(k), `teach.read.global.${k}`)
  for (const k of READ_STEP_KINDS) assert.equal(stepNoteKey(k), `teach.read.note.${k}`)
  assert.equal(globalNoteKey('nope'), 'teach.read.global.unavailable')
  assert.equal(stepNoteKey('nope'), 'teach.read.note.failed')
})

test('readingFromWorkflow: the stored reading for that step id only', () => {
  const w = { steps: [{ id: 's1', reading: R }, { id: 's2', reading: null }] }
  assert.equal(readingFromWorkflow(w, 's1'), R)
  assert.equal(readingFromWorkflow(w, 's2'), null)
  assert.equal(readingFromWorkflow(w, 's9'), null)
  assert.equal(readingFromWorkflow(null, 's1'), null)
})

test('shownReading / shownNote: only for the screenshot the row shows now', () => {
  assert.equal(shownReading({ shot: A, reading: R }), R)
  assert.equal(shownReading({ shot: B, reading: R }), null)
  assert.equal(shownReading({ shot: '', reading: R }), null)
  assert.equal(shownReading({ shot: A, reading: { ...R, afterShot: B } }, { shot: A }), null)   // next screen moved
  const notes = { s1: { kind: 'unreadable', shot: A } }
  assert.equal(shownNote({ id: 's1', shot: A }, notes), 'unreadable')
  assert.equal(shownNote({ id: 's1', shot: B }, notes), null)
  assert.equal(shownNote({ id: '', shot: A }, notes), null)
})

test('readCounts: steps with a screenshot and an instruction, and those still unread', () => {
  const rows = [
    { instruction: 'a', shot: A, reading: R },
    { instruction: 'b', shot: B },
    { instruction: 'c', shot: B, reading: R },     // stale: other screenshot
    { instruction: 'd', shot: '' },
    { instruction: ' ', shot: A },
  ]
  assert.deepEqual(readCounts(rows), { withShot: 3, toRead: 2 })
  assert.deepEqual(readCounts(null), { withShot: 0, toRead: 0 })
})

test('kindKey and runSummary', () => {
  assert.equal(kindKey('button'), 'teach.read.kind.button')
  assert.equal(kindKey('other'), null)
  assert.equal(kindKey('none'), null)
  assert.deepEqual(runSummary({ read: 3, total: 4 }), { key: 'teach.read.summary.done', vars: { read: 3, total: 4 } })
  assert.deepEqual(runSummary({ read: 0, total: 4 }), { key: 'teach.read.summary.none', vars: {} })
  assert.deepEqual(runSummary({ read: 0, total: 0 }), { key: 'teach.read.summary.nothing', vars: {} })
  assert.deepEqual(runSummary({ read: 1, total: 4, stopped: true }), { key: 'teach.read.summary.stopped', vars: { read: 1, total: 4 } })
})
