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
