// Guidance depth entitlement (pure logic). Locks: individual tier mapping, and the
// company ceiling clamping a pool assignment so a company admin can never grant a
// pool beyond the superadmin's grant (SUPREME II/III/VI).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveGuidanceDepth, clampDepth, normalizeDepth, depthRank, canUseProjects } from './guidance_depth.js'

test('individual tiers: Premium = deep (Projects), Lite/Basic/Advanced = standard', () => {
  assert.equal(resolveGuidanceDepth({ tier: 'premium' }), 'deep')
  for (const t of ['lite', 'basic', 'advanced', 'unknown', undefined]) {
    assert.equal(resolveGuidanceDepth({ tier: t }), 'standard', `tier ${t} -> standard`)
  }
})

test('company ceiling clamps the pool - admin can never exceed the grant', () => {
  // ceiling standard: a deep pool is capped back to standard
  assert.equal(resolveGuidanceDepth({ isCompanyMember: true, companyCeiling: 'standard', poolDepth: 'deep' }), 'standard')
  // ceiling deep: pool choices honored
  assert.equal(resolveGuidanceDepth({ isCompanyMember: true, companyCeiling: 'deep', poolDepth: 'standard' }), 'standard')
  assert.equal(resolveGuidanceDepth({ isCompanyMember: true, companyCeiling: 'deep', poolDepth: 'deep' }), 'deep')
  // unset pool defaults to the ceiling
  assert.equal(resolveGuidanceDepth({ isCompanyMember: true, companyCeiling: 'deep', poolDepth: null }), 'deep')
  assert.equal(resolveGuidanceDepth({ isCompanyMember: true, companyCeiling: 'standard', poolDepth: null }), 'standard')
})

test('clampDepth / normalizeDepth / depthRank / canUseProjects', () => {
  assert.equal(clampDepth('deep', 'standard'), 'standard')
  assert.equal(clampDepth('standard', 'deep'), 'standard')
  assert.equal(clampDepth('deep', 'deep'), 'deep')
  assert.equal(normalizeDepth('garbage'), 'standard')
  assert.equal(normalizeDepth('deep'), 'deep')
  assert.ok(depthRank('deep') > depthRank('standard'))
  assert.equal(canUseProjects('deep'), true)
  assert.equal(canUseProjects('standard'), false)
})
