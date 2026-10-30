// Wave 3 part B, store side, on the real store (temp data dir): a guided session
// built from a published workflow keeps the trainer's screenshot per step and the
// link to the workflow it follows.
import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

process.env.WORK_DATA_DIR = path.join(os.tmpdir(), 'wc-wfsession-' + Date.now())
process.env.PORT = '0'
const store = await import('./store.js')
const A = 'a'.repeat(32) + '.jpg'

test('session steps keep a valid frame ref and drop anything else', () => {
  const u = store.createWorkUser({ username: 'wfs' + Date.now(), password: 'Passw0rd!x', email: 'w@x.com' })
  const s = store.createWorkSession(u.id, { goal: 'Raise a transfer' })
  const out = store.setWorkSessionSteps(u.id, s.id, [
    { text: 'Open **Transfers**', validate: 'List shows', shot: A },
    { text: 'Fill in the amount', shot: '../../etc/passwd' },
    { text: 'Approve' },
  ])
  assert.equal(out.steps[0].shot, A)
  assert.equal('shot' in out.steps[1], false)
  assert.equal('shot' in out.steps[2], false)
})

test('the workflow link is stored, sanitized, and clearable', () => {
  const u = store.createWorkUser({ username: 'wfr' + Date.now(), password: 'Passw0rd!x', email: 'r@x.com' })
  const s = store.createWorkSession(u.id, { goal: 'Raise a transfer' })
  store.setWorkSessionWorkflowRef(u.id, s.id, { id: 'w1', groupId: 'g1', version: '2', title: 'Raise a transfer', extra: 'x' })
  assert.deepEqual(store.getWorkSession(u.id, s.id).workflowRef, { id: 'w1', groupId: 'g1', version: 2, title: 'Raise a transfer' })
  store.setWorkSessionWorkflowRef(u.id, s.id, null)
  assert.equal(store.getWorkSession(u.id, s.id).workflowRef, null)
  assert.throws(() => store.setWorkSessionWorkflowRef(u.id, 'nope', { id: 'w1' }), /Session not found/)
})
