import test from 'node:test'
import assert from 'node:assert/strict'
import * as wf from './workflows_rules.js'

test('validateMeta requires productName, title, owner, launchTarget; language defaults to en', () => {
  assert.equal(wf.validateMeta({}).ok, false)
  assert.deepEqual(wf.validateMeta({}).missing.sort(), [...wf.REQUIRED_META].sort())
  const ok = wf.validateMeta({ productName: 'Zamina', title: 'T', owner: 'O', launchTarget: 'x', language: '' })
  assert.equal(ok.ok, true)
  assert.equal(ok.meta.language, 'en')
})

test('steps need a non-empty instruction; an empty list is not publishable', () => {
  assert.equal(wf.validateSteps([]).ok, false)
  assert.equal(wf.validateSteps([{ instruction: 'go' }]).ok, true)
  const bad = wf.validateSteps([{ instruction: 'go' }, { instruction: '' }])
  assert.equal(bad.ok, false)
  assert.equal(bad.firstEmpty, 1)
  assert.equal(wf.normalizeStep({ instruction: 'go' }, 0).id, 's1')
})

test('lifecycle predicates and version bump', () => {
  assert.equal(wf.canEditContent('draft'), true)
  assert.equal(wf.canEditContent('published'), false)
  assert.equal(wf.canPublish('draft'), true)
  assert.equal(wf.canRetire('published'), true)
  assert.equal(wf.canRetire('draft'), false)
  assert.equal(wf.nextVersion([]), 1)
  assert.equal(wf.nextVersion([{ version: 1 }, { version: 2 }]), 3)
})

test('a step shot must be a lowercase frame ref; anything else is dropped', () => {
  const ref = `${'a'.repeat(32)}.jpg`
  assert.equal(wf.normalizeStep({ instruction: 'x', shot: ref }).shot, ref)
  assert.equal(wf.normalizeStep({ instruction: 'x', shot: '../../secret' }).shot, null)
  assert.equal(wf.isFrameRef(`${'A'.repeat(32)}.jpg`), false)
})

// carryReadings: a reading belongs to ITS step. Two steps can share a frame (a
// click that does not change the screen); keying readings by frame alone let
// the second step's reading replace the first's, and every save then dropped
// step 1's suggestion (found by E2E teach.spec "record a demonstration").
const F1 = 'a'.repeat(32) + '.jpg'
const F2 = 'b'.repeat(32) + '.jpg'
const rd = (label, shot, afterShot = null) => ({ controlLabel: label, controlKind: 'button', confidence: 0.9, shot, afterShot })

test('carryReadings keeps each step its own reading when two steps share a frame', () => {
  const prev = [
    { id: 's1', instruction: 'Click Save', shot: F1, reading: rd('Save', F1, null) },
    { id: 's2', instruction: 'Click Close', shot: F1, reading: rd('Close', F1, F2) },
    { id: 's3', instruction: 'Check', shot: F2, reading: rd('Done', F2, null) },
  ]
  const next = prev.map(({ reading, ...s }) => ({ ...s }))   // the editor sends steps back without readings
  const out = wf.carryReadings(prev, next)
  assert.equal(out[0].reading && out[0].reading.controlLabel, 'Save')
  assert.equal(out[1].reading && out[1].reading.controlLabel, 'Close')
  assert.equal(out[2].reading && out[2].reading.controlLabel, 'Done')
})

test('carryReadings drops a reading whose frame or after-frame changed', () => {
  const prev = [
    { id: 's1', instruction: 'a', shot: F1, reading: rd('Save', F1, F2) },
    { id: 's2', instruction: 'b', shot: F2, reading: rd('Done', F2, null) },
  ]
  // s2 re-recorded with another frame: s1's after-frame no longer matches, s2's frame changed.
  const F3 = 'c'.repeat(32) + '.png'
  const out = wf.carryReadings(prev, [{ id: 's1', instruction: 'a', shot: F1 }, { id: 's2', instruction: 'b', shot: F3 }])
  assert.equal(out[0].reading, null)
  assert.equal(out[1].reading, null)
})

test('carryReadings falls back to the frame when step ids changed, only where the after-frame fits', () => {
  const prev = [
    { id: 's1', instruction: 'a', shot: F1, reading: rd('Save', F1, null) },
    { id: 's2', instruction: 'b', shot: F1, reading: rd('Close', F1, F2) },
    { id: 's3', instruction: 'c', shot: F2, reading: rd('Done', F2, null) },
  ]
  const next = [{ id: 'x1', instruction: 'a', shot: F1 }, { id: 'x2', instruction: 'b', shot: F1 }, { id: 'x3', instruction: 'c', shot: F2 }]
  const out = wf.carryReadings(prev, next)
  assert.ok(out[0].reading, 'x1 gets a reading of its frame whose after-frame fits')
  assert.equal(out[0].reading.shot, F1)
  assert.equal(out[1].reading && out[1].reading.controlLabel, 'Close')
  assert.equal(out[2].reading && out[2].reading.controlLabel, 'Done')
})
