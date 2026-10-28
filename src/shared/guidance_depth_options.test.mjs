import test from 'node:test'
import assert from 'node:assert/strict'
import { WORK_DEPTHS, normalizeDepth, depthRank, depthWithinCeiling, effectivePoolDepth } from './guidance_depth_options.js'

test('depth ids: exactly standard and deep, unknown normalizes to standard', () => {
  assert.deepEqual(WORK_DEPTHS, ['standard', 'deep'])
  assert.equal(normalizeDepth('deep'), 'deep')
  assert.equal(normalizeDepth('premium'), 'standard')
  assert.equal(normalizeDepth(undefined), 'standard')
  assert.ok(depthRank('deep') > depthRank('standard'))
})

test('a pool can never exceed the company ceiling', () => {
  assert.equal(depthWithinCeiling('deep', 'standard'), false)
  assert.equal(depthWithinCeiling('standard', 'standard'), true)
  assert.equal(depthWithinCeiling('deep', 'deep'), true)
  assert.equal(depthWithinCeiling('standard', 'deep'), true)
})

test('effective pool depth: unassigned inherits the ceiling, assigned is clamped', () => {
  assert.equal(effectivePoolDepth(null, 'deep'), 'deep')
  assert.equal(effectivePoolDepth(undefined, 'standard'), 'standard')
  assert.equal(effectivePoolDepth('', 'deep'), 'deep')
  assert.equal(effectivePoolDepth('standard', 'deep'), 'standard')
  assert.equal(effectivePoolDepth('deep', 'standard'), 'standard')
  assert.equal(effectivePoolDepth('deep', 'deep'), 'deep')
})
