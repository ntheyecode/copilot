// sync_bridge: synchronous calls into an async worker. Replies, errors, and the
// timeout that poisons the bridge so nothing writes on top of an unknown state.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createSyncBridge } from './sync_bridge.js'

const WORKER = new URL('./test_echo_worker.mjs', import.meta.url)

test('calls return the worker value synchronously, in order, async handlers included', () => {
  const b = createSyncBridge(WORKER)
  try {
    assert.deepEqual(b.call('echo', { a: [1, 'x'] }, 5000), { a: [1, 'x'] })
    assert.equal(b.call('later', 21, 5000), 42)
    for (let i = 0; i < 200; i++) assert.equal(b.call('echo', i, 5000), i)
  } finally { b.terminate() }
})

test('a worker error comes back as a thrown error with its code; the bridge stays usable', () => {
  const b = createSyncBridge(WORKER)
  try {
    assert.throws(() => b.call('fail', null, 5000), (e) => e.message === 'nope from the worker' && e.code === 'E_TEST')
    assert.throws(() => b.call('nosuchop', null, 5000), /unknown operation "nosuchop"/)
    assert.equal(b.call('echo', 'still fine', 5000), 'still fine')
  } finally { b.terminate() }
})

test('a timeout fails the call and every later call until restart', () => {
  const b = createSyncBridge(WORKER)
  try {
    assert.throws(() => b.call('sleep', 2000, 100), /did not answer "sleep" within 100 ms/)
    assert.throws(() => b.call('echo', 1, 5000), /did not answer "sleep"/)
  } finally { b.terminate() }
})

test('a worker that exits or throws mid-call fails the call at once with the reason, not at the timeout', () => {
  for (const [op, why] of [['die', /exit code 3/], ['throwLater', /boom in the worker/]]) {
    const b = createSyncBridge(WORKER)
    try {
      const t0 = Date.now()
      assert.throws(() => b.call(op, null, 20000), (e) => /stopped unexpectedly/.test(e.message) && why.test(e.message), op)
      assert.ok(Date.now() - t0 < 5000, `${op}: noticed in ${Date.now() - t0} ms`)
      assert.throws(() => b.call('echo', 1, 5000), /restart the server/, 'and the bridge stays failed')
    } finally { b.terminate() }
  }
})

// Regression: a Worker inherits the parent's Node flags by default; under
// `node --input-type=module -e` that kept the worker from loading at all and
// the first call hung until its timeout.
test('the worker starts even when the process runs with -e / --input-type flags', () => {
  const probe = `
    const { createSyncBridge } = await import(${JSON.stringify(new URL('./sync_bridge.js', import.meta.url).href)})
    const b = createSyncBridge(new URL(${JSON.stringify(WORKER.href)}))
    console.log('GOT ' + b.call('echo', 'ok', 5000))
    process.exit(0)
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { encoding: 'utf8', timeout: 30000 })
  assert.match(r.stdout || '', /GOT ok/, r.stderr)
})
