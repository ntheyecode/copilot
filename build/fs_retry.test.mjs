import test from 'node:test'
import assert from 'node:assert/strict'
import { renameWithRetry } from './fs_retry.js'

const failing = (codes) => {
  const calls = []
  return { calls, renameSync: (a, b) => { calls.push([a, b]); const c = codes.shift(); if (c) { const e = new Error(c); e.code = c; throw e } } }
}

test('a transient Windows lock is waited out', () => {
  const f = failing(['EPERM', 'EBUSY', 'EACCES'])
  const waits = []
  renameWithRetry('a', 'b', { fsImpl: f, wait: (ms) => waits.push(ms) })
  assert.equal(f.calls.length, 4)
  assert.deepEqual(waits, [25, 50, 100])
})

test('a real error throws at once, and a lock that never clears still fails', () => {
  const missing = failing(['ENOENT'])
  assert.throws(() => renameWithRetry('a', 'b', { fsImpl: missing, wait: () => {} }), /ENOENT/)
  assert.equal(missing.calls.length, 1)
  const stuck = failing(Array(20).fill('EPERM'))
  assert.throws(() => renameWithRetry('a', 'b', { fsImpl: stuck, wait: () => {}, attempts: 5 }), /EPERM/)
  assert.equal(stuck.calls.length, 5)
})

test('compose moves bundles only through the retrying rename', async () => {
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('./compose.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /fs\.renameSync\(/, 'use renameWithRetry from build/fs_retry.js')
})
