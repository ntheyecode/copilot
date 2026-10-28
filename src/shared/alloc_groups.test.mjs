import test from 'node:test'
import assert from 'node:assert/strict'
import { ALLOC_GROUPS, DEFAULT_ALLOC_GROUP, poolsFromRoster } from './alloc_groups.js'

test('registry: the three governed pools, member is the default', () => {
  assert.deepEqual(ALLOC_GROUPS, ['admin', 'supervisor', 'member'])
  assert.equal(DEFAULT_ALLOC_GROUP, 'member')
})

test('poolsFromRoster: canonical order, head counts, default always present', () => {
  const pools = poolsFromRoster([
    { id: 1, allocGroup: 'member' }, { id: 2, allocGroup: 'admin' }, { id: 3, allocGroup: 'member' },
  ])
  assert.deepEqual(pools, [{ id: 'admin', count: 1 }, { id: 'member', count: 2 }])
})

test('poolsFromRoster: empty roster still yields the default pool; missing group counts as default', () => {
  assert.deepEqual(poolsFromRoster([]), [{ id: 'member', count: 0 }])
  assert.deepEqual(poolsFromRoster(null), [{ id: 'member', count: 0 }])
  assert.deepEqual(poolsFromRoster([{ id: 1 }, { id: 2, allocGroup: null }]), [{ id: 'member', count: 2 }])
})

test('poolsFromRoster: a group id the server adds later is kept, not dropped', () => {
  const pools = poolsFromRoster([{ allocGroup: 'contractor' }, { allocGroup: 'supervisor' }])
  assert.deepEqual(pools.map((p) => p.id), ['supervisor', 'member', 'contractor'])
})
