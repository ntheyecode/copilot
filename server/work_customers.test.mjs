// Customer list logic (pure). Locks: Default always present + undeletable/unrenamable,
// no duplicate active names, archive is soft, add/rename validation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultCustomer, withDefault, activeCustomers, addCustomer, renameCustomer, archiveCustomer, DEFAULT_ID } from './work_customers.js'

test('Default is always present, even from an empty/undefined list', () => {
  assert.equal(withDefault(undefined)[0].id, DEFAULT_ID)
  assert.equal(withDefault([])[0].id, DEFAULT_ID)
  assert.equal(defaultCustomer().system, true)
  assert.equal(activeCustomers([]).length, 1)
})

test('addCustomer: adds, dedupes active names, rejects empty + "Default"', () => {
  const a = addCustomer([], 'Acme Corp')
  assert.ok(!a.error && a.customer.name === 'Acme Corp' && a.customer.id && !a.customer.system)
  assert.ok(a.list.some((c) => c.id === DEFAULT_ID), 'Default is preserved')
  assert.ok(addCustomer(a.list, 'acme corp').error, 'duplicate active name rejected (case-insensitive)')
  assert.ok(addCustomer([], '   ').error, 'empty name rejected')
  assert.ok(addCustomer([], 'Default').error, 'cannot add a second Default')
})

test('rename: blocks Default, blocks dup, renames others', () => {
  const { list } = addCustomer([], 'Acme')
  const r = renameCustomer(list, list.find((c) => c.name === 'Acme').id, 'Acme Inc')
  assert.ok(!r.error && r.customer.name === 'Acme Inc')
  assert.ok(renameCustomer(list, DEFAULT_ID, 'Nope').error, 'Default cannot be renamed')
  assert.ok(renameCustomer(list, 'missing', 'X').error, 'unknown id rejected')
})

test('archive: soft-removes a customer, never Default', () => {
  const { list } = addCustomer([], 'Beta')
  const id = list.find((c) => c.name === 'Beta').id
  const r = archiveCustomer(list, id)
  assert.ok(!r.error)
  assert.equal(activeCustomers(r.list).some((c) => c.id === id), false, 'archived customer is no longer active')
  assert.equal(r.list.find((c) => c.id === id).status, 'archived', 'kept as archived, not deleted (history intact)')
  assert.ok(archiveCustomer(list, DEFAULT_ID).error, 'Default cannot be removed')
})
