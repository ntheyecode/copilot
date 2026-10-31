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

// E2E finding (e2e/FINDINGS.md #11): a recording can give two steps the SAME
// screenshot. Keyed by screenshot alone, the second step's reading overwrote the
// first's, so a save dropped step 1's reading (or gave it step 2's).
const A = 'a'.repeat(32) + '.jpg', B = 'b'.repeat(32) + '.jpg'
const rd = (label, shot, afterShot) => ({ controlLabel: label, controlKind: 'button', doneWhen: `${label} done`, confidence: 0.9, shot, afterShot, at: '2026-01-01T00:00:00.000Z' })
test('carryReadings keeps each step its own reading when two steps share a screenshot', () => {
  const prev = [
    { id: 's1', instruction: 'Open', shot: A, reading: rd('Open', A, A) },
    { id: 's2', instruction: 'Pick', shot: A, reading: rd('Pick', A, B) },
    { id: 's3', instruction: 'Save', shot: B, reading: rd('Save', B, null) },
  ]
  const next = prev.map(({ reading, ...s }) => s)          // a plain re-save, nothing changed
  const out = wf.carryReadings(prev, next)
  assert.deepEqual(out.map((s) => s.reading && s.reading.controlLabel), ['Open', 'Pick', 'Save'])
})
test('carryReadings: a reading follows its step id, never another step with the same screenshot', () => {
  const prev = [
    { id: 's1', instruction: 'Open', shot: A, reading: rd('Open', A, B) },
    { id: 's2', instruction: 'Pick', shot: A, reading: null },
    { id: 's3', instruction: 'Save', shot: B, reading: null },
  ]
  const out = wf.carryReadings(prev, [{ id: 's2', instruction: 'Pick', shot: A }, { id: 's3', instruction: 'Save', shot: B }])
  assert.equal(out[0].reading, null, 's2 never had a reading and must not borrow s1\'s')
  // A step whose id is new keeps a reading only when its screenshot is unique.
  const single = wf.carryReadings([{ id: 's9', shot: B, reading: rd('Save', B, null) }], [{ id: 'new1', instruction: 'Save', shot: B }])
  assert.equal(single[0].reading.controlLabel, 'Save')
})
