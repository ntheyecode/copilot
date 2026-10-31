import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkflowFrames } from './workflow_frames.js'

// A fake cipher that is visibly not plaintext, so the test can prove sealing.
const TAG = Buffer.from('SEALED:')
const seal = (b) => Buffer.concat([TAG, b])
const open = (b) => { if (!b.subarray(0, TAG.length).equals(TAG)) throw new Error('not sealed'); return b.subarray(TAG.length) }
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wf-frames-'))

test('save seals the bytes in a tenant folder; read opens them', () => {
  const dir = tmpDir()
  const f = createWorkflowFrames({ dir, seal, open })
  const ref = f.save('c1', Buffer.from('jpegbytes'), 'jpg')
  assert.match(ref, /^[a-f0-9]{32}\.jpg$/)
  assert.ok(fs.readFileSync(path.join(dir, 'c1', ref)).subarray(0, TAG.length).equals(TAG))   // never plaintext at rest
  const out = f.read('c1', ref)
  assert.equal(out.buffer.toString(), 'jpegbytes')
  assert.equal(out.mime, 'image/jpeg')
})

test('tenant isolation and path safety', () => {
  const dir = tmpDir()
  const f = createWorkflowFrames({ dir, seal, open })
  const ref = f.save('c1', Buffer.from('x'), 'png')
  assert.equal(f.read('c2', ref), null)               // another company cannot read it
  assert.equal(f.read('c1', `../c1/${ref}`), null)    // not a valid ref
  assert.equal(f.read('c1', 'deadbeef.jpg'), null)
  assert.throws(() => f.save('', Buffer.from('x'), 'png'), /company id/)
  assert.throws(() => f.save('c1', Buffer.from('x'), 'gif'), /unsupported/)
  assert.throws(() => f.save('c1', Buffer.alloc(0), 'png'), /empty/)
})

test('remove deletes only valid refs in that tenant', () => {
  const dir = tmpDir()
  const f = createWorkflowFrames({ dir, seal, open })
  const a = f.save('c1', Buffer.from('a'), 'jpg')
  const b = f.save('c1', Buffer.from('b'), 'jpg')
  assert.equal(f.remove('c1', [a, 'junk', '../x']), 1)
  assert.equal(f.read('c1', a), null)
  assert.ok(f.read('c1', b))
  assert.equal(f.remove('c1', [a]), 0)   // already gone
})
