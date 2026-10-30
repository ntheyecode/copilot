import test from 'node:test'
import assert from 'node:assert/strict'
import { withRowKeys, newRowKey, initialOpenKeys, OPEN_ALL_UP_TO } from './stepRows.js'
import { stepsToPayload } from './workflowModel.js'

test('withRowKeys keys every row once and keeps existing keys', () => {
  const rows = withRowKeys([{ instruction: 'a' }, { instruction: 'b', _k: 'keep' }, null])
  assert.equal(rows.length, 3)
  assert.equal(rows[1]._k, 'keep')
  assert.ok(rows[0]._k && rows[2]._k)
  assert.equal(new Set(rows.map((r) => r._k)).size, 3)
  assert.deepEqual(withRowKeys(rows), rows)
  assert.notEqual(newRowKey(), newRowKey())
  assert.deepEqual(withRowKeys(undefined), [])
})

test('the client-only row key never reaches the server payload', () => {
  const out = stepsToPayload(withRowKeys([{ instruction: 'Open billing', shot: 'abc.jpg' }]))
  assert.deepEqual(out, [{ instruction: 'Open billing', shot: 'abc.jpg' }])
})

test('short lists start open, long lists start with only the first row open', () => {
  const short = withRowKeys(Array.from({ length: OPEN_ALL_UP_TO }, () => ({})))
  assert.equal(initialOpenKeys(short).size, OPEN_ALL_UP_TO)
  const long = withRowKeys(Array.from({ length: OPEN_ALL_UP_TO + 4 }, () => ({})))
  assert.deepEqual([...initialOpenKeys(long)], [long[0]._k])
  assert.equal(initialOpenKeys([]).size, 0)
})
