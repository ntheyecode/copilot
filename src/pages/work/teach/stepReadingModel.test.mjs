import test from 'node:test'
import assert from 'node:assert/strict'
import { hydrateStepIds, hydrateByKey, readingHolds, applyStepReading, acceptReading, rowsToRead, confidenceBand, readingDiffers } from './stepReadingModel.js'
import { stepsToForm, stepsToPayload } from './workflowModel.js'

const A = 'a'.repeat(32) + '.jpg'
const B = 'b'.repeat(32) + '.jpg'
const R = { controlLabel: 'Approve', controlKind: 'button', doneWhen: 'Approved badge shows', confidence: 0.9, shot: A }

test('hydrate: server ids line up with the rows that have an instruction', () => {
  const rows = [{ id: '', instruction: 'Open', shot: A }, { id: '', instruction: '  ', shot: '' }, { id: '', instruction: 'Save', shot: B }]
  const out = hydrateStepIds(rows, [{ id: 's1', shot: A }, { id: 's2', shot: B }])
  assert.deepEqual(out.map((r) => r.id), ['s1', '', 's2'])
})

test('hydrate: a row whose screenshot changed meanwhile keeps its own id', () => {
  const out = hydrateStepIds([{ id: '', instruction: 'Open', shot: B }], [{ id: 's1', shot: A }])
  assert.equal(out[0].id, '')
})

test('hydrate: the saved reading wins, so one the server dropped on save leaves the row too', () => {
  const rows = [{ id: 's1', instruction: 'Open', shot: A, reading: R }]
  assert.equal(hydrateStepIds(rows, [{ id: 's1', shot: A, reading: null }])[0].reading, null)
  assert.deepEqual(hydrateStepIds(rows, [{ id: 's1', shot: A, reading: R }])[0].reading, R)
})

test('apply: a reading lands only on its row, and only while the screenshot matches', () => {
  const rows = [{ id: 's1', instruction: 'Open', shot: A }, { id: 's2', instruction: 'Save', shot: B }]
  assert.equal(applyStepReading(rows, 's1', R)[0].reading, R)
  assert.equal(applyStepReading(rows, 's2', R)[1].reading, undefined)                 // other shot
  const moved = [{ id: 's1', instruction: 'Open', shot: B }]
  assert.equal(applyStepReading(moved, 's1', R)[0].reading, undefined)                // shot replaced
})

test('accept: copies the suggestion only on the trainer click, keeps fields it lacks', () => {
  const row = { id: 's1', instruction: 'Open', target: 'mine', doneWhen: 'my check', shot: A, reading: { ...R, doneWhen: null } }
  const out = acceptReading(row)
  assert.equal(out.target, 'Approve')
  assert.equal(out.doneWhen, 'my check')
  assert.equal(acceptReading({ target: 'x' }).target, 'x')
})

test('rowsToRead: saved rows with a screenshot and no current reading', () => {
  const rows = [
    { id: 's1', instruction: 'a', shot: A, reading: R },          // already read
    { id: 's2', instruction: 'b', shot: B },                      // to read
    { id: '', instruction: 'c', shot: B },                        // not saved yet
    { id: 's4', instruction: 'd', shot: '' },                     // no screenshot
    { id: 's5', instruction: 'e', shot: B, reading: R },          // stale reading (other shot)
  ]
  assert.deepEqual(rowsToRead(rows).map((r) => r.id), ['s2', 's5'])
  assert.deepEqual(rowsToRead(rows, { force: true }).map((r) => r.id), ['s1', 's2', 's5'])
})

test('bands and differs', () => {
  assert.equal(confidenceBand(R), 'high')
  assert.equal(confidenceBand({ ...R, confidence: 0.6 }), 'medium')
  assert.equal(confidenceBand({ ...R, confidence: 0.2 }), 'low')
  assert.equal(confidenceBand({ ...R, controlLabel: null }), 'none')
  assert.equal(readingDiffers({ target: 'approve', doneWhen: 'approved badge shows', reading: R }), false)
  assert.equal(readingDiffers({ target: '', reading: R }), true)
})

test('a stored reading hydrates into the row for display but is never sent back (server-written only)', () => {
  const rows = stepsToForm([{ id: 's1', instruction: 'Open', shot: A, reading: R }])
  assert.deepEqual(rows[0].reading, R)
  assert.equal(stepsToPayload(rows)[0].reading, undefined)
  assert.equal(stepsToForm([{ id: 's1', instruction: 'Open' }])[0].reading, null)
})

test('hydrateByKey: ids follow the rows that were sent, even if rows moved while saving', () => {
  const sent = [{ _k: 'a', instruction: 'Open', shot: A }, { _k: 'b', instruction: 'Save', shot: '' }]
  const sentHydrated = hydrateStepIds(sent, [{ id: 's1', shot: A }, { id: 's2', shot: '' }])
  // meanwhile: a new row was typed in first, and row b moved to the top
  const latest = [{ _k: 'b', instruction: 'Save', shot: '' }, { _k: 'n', instruction: 'New', shot: '' }, { _k: 'a', instruction: 'Open', shot: A }]
  const out = hydrateByKey(latest, sentHydrated)
  assert.deepEqual(out.map((r) => r.id), ['s2', undefined, 's1'])
  // a row whose screenshot changed meanwhile keeps its own id
  assert.equal(hydrateByKey([{ _k: 'a', instruction: 'Open', shot: B }], sentHydrated)[0].id, undefined)
})

test('readingHolds: mirrors the server, a reading read with the next screen needs that screen next', () => {
  const r = { ...R, afterShot: B }
  assert.equal(readingHolds({ shot: A, reading: r }, { shot: B }), true)
  assert.equal(readingHolds({ shot: A, reading: r }, { shot: '' }), false)        // reordered / removed
  assert.equal(readingHolds({ shot: A, reading: r }, null), false)                // now the last row
  assert.equal(readingHolds({ shot: A, reading: R }, null), true)                 // read without a next screen
  assert.equal(readingHolds({ shot: B, reading: R }, null), false)                // screenshot replaced
  const rows = [{ id: 's1', instruction: 'a', shot: A, reading: r }, { id: 's2', instruction: 'b', shot: '' }]
  assert.deepEqual(rowsToRead(rows).map((x) => x.id), ['s1'])
})
