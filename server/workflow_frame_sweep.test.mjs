// Orphan workflow-frame sweep: real frame store on a temp dir, the real
// workflows_store referenced-set rule, fake mtimes. Proves the sweep removes
// only old unreferenced frames and never one a workflow or running session uses.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createWorkflowFrames } from './workflow_frames.js'
import { createWorkflows } from './workflows_store.js'
import { createWorkflowFrameSweep, scheduleFrameSweep, FRAME_SWEEP_GRACE_MS } from './workflow_frame_sweep.js'

const NOW = Date.UTC(2026, 9, 30, 12, 0, 0)
const OLD = NOW - FRAME_SWEEP_GRACE_MS - 60 * 1000     // just past the grace period
const NEW = NOW - 60 * 60 * 1000                       // one hour old: mid-recording
const id = (c) => c.repeat(32)
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wf-sweep-'))
const plain = { seal: (b) => b, open: (b) => b }

function put(dir, cid, name, mtimeMs) {
  fs.mkdirSync(path.join(dir, cid), { recursive: true })
  const p = path.join(dir, cid, name)
  fs.writeFileSync(p, 'x')
  fs.utimesSync(p, mtimeMs / 1000, mtimeMs / 1000)
}
const exists = (dir, cid, name) => fs.existsSync(path.join(dir, cid, name))

const META = { productName: 'Zamina', title: 'Raise a transfer', owner: 'Ops', launchTarget: 'https://zamina.internal' }
const trainer = { id: 't', companyId: 'c1', companyRole: 'member', grants: ['trainer'] }

// The real workflows store over an in-memory db, so the sweep reads the exact
// rule edit/delete purge uses.
function rig({ inUse = new Set(), companies = ['c1'] } = {}) {
  const dir = tmpDir()
  const frames = createWorkflowFrames({ dir, ...plain })
  const db = { workflows: [] }
  let seq = 0
  const wfs = createWorkflows({
    frames, framesInUse: () => inUse, db: () => db, persist: () => {}, id: () => `id${++seq}`,
    now: () => new Date(NOW).toISOString(), httpErr: (c, m) => Object.assign(new Error(m), { status: c }),
    getUser: (uid) => (uid === 't' ? trainer : null), emit: () => {},
  })
  const sweep = createWorkflowFrameSweep({ frames, referencedFrames: wfs.referencedFrames, companyIds: () => companies, now: () => NOW })
  return { dir, frames, wfs, sweep, db }
}

test('removes old unreferenced frames and stale temps; keeps young, referenced, in-use and unknown files', () => {
  const inUse = new Set([`${id('d')}.jpg`])
  const { dir, wfs, sweep } = rig({ inUse })
  const draftShot = `${id('a')}.jpg`, retiredShot = `${id('b')}.png`
  const orphanOld = `${id('c')}.webp`, orphanNew = `${id('e')}.jpg`, sessionShot = `${id('d')}.jpg`
  for (const n of [draftShot, retiredShot, orphanOld, sessionShot]) put(dir, 'c1', n, OLD)
  put(dir, 'c1', orphanNew, NEW)
  put(dir, 'c1', `${id('f')}.jpg.tmp`, OLD)        // interrupted save, old
  put(dir, 'c1', `${id('9')}.jpg.tmp`, NEW)        // save in flight
  put(dir, 'c1', 'notes.txt', OLD)                 // not ours: never touched
  wfs.createWorkflow('t', { meta: META, steps: [{ instruction: 'Open Transfers', shot: draftShot }] })
  const pub = wfs.createWorkflow('t', { meta: META, steps: [{ instruction: 'Approve', shot: retiredShot }] })
  wfs.publishWorkflow('t', pub.id); wfs.retireWorkflow('t', pub.id)

  const r = sweep.sweepAll()
  assert.deepEqual(r, { companies: 1, scanned: 7, removed: 2, kept: 5, skipped: 0 })
  assert.equal(exists(dir, 'c1', orphanOld), false)
  assert.equal(exists(dir, 'c1', `${id('f')}.jpg.tmp`), false)
  for (const n of [draftShot, retiredShot, sessionShot, orphanNew, `${id('9')}.jpg.tmp`, 'notes.txt']) {
    assert.equal(exists(dir, 'c1', n), true, `${n} must survive`)
  }
  // Counts only: the result carries no file names, so logging it leaks nothing.
  assert.ok(!JSON.stringify(r).includes('.jpg'))
})

test('the sweep and edit/delete purge share one rule: a frame referenced after a sweep is still safe', () => {
  const { dir, wfs, sweep } = rig()
  const shot = `${id('a')}.jpg`
  put(dir, 'c1', shot, OLD)
  const w = wfs.createWorkflow('t', { meta: META, steps: [{ instruction: 'Open', shot }] })
  assert.ok(wfs.referencedFrames('c1').has(shot))
  sweep.sweepAll()
  assert.equal(exists(dir, 'c1', shot), true)
  wfs.updateWorkflow('t', w.id, { steps: [{ instruction: 'Open' }] })   // edit drops it -> purge removes it
  assert.equal(exists(dir, 'c1', shot), false)
})

test('a folder whose company no longer exists is swept, grace still applies', () => {
  const { dir, wfs, sweep } = rig({ companies: [] })
  const shot = `${id('a')}.jpg`, young = `${id('b')}.jpg`
  put(dir, 'c1', shot, OLD); put(dir, 'c1', young, NEW)
  wfs.createWorkflow('t', { meta: META, steps: [{ instruction: 'Open', shot }] })   // a leftover workflow row
  const r = sweep.sweepAll()
  assert.equal(r.removed, 1)
  assert.equal(exists(dir, 'c1', shot), false)
  assert.equal(exists(dir, 'c1', young), true)
})

test('if the referenced set cannot be computed, nothing in that company is deleted', () => {
  const dir = tmpDir()
  const frames = createWorkflowFrames({ dir, ...plain })
  put(dir, 'c1', `${id('a')}.jpg`, OLD)
  put(dir, 'c2', `${id('b')}.jpg`, OLD)
  const sweep = createWorkflowFrameSweep({
    frames, now: () => NOW, companyIds: () => ['c1', 'c2'],
    referencedFrames: (cid) => { if (cid === 'c1') throw new Error('db not ready'); return new Set() },
  })
  const r = sweep.sweepAll()
  assert.equal(r.skipped, 1)
  assert.equal(exists(dir, 'c1', `${id('a')}.jpg`), true)
  assert.equal(exists(dir, 'c2', `${id('b')}.jpg`), false)
})

test('no frames folder yet is a clean no-op', () => {
  const frames = createWorkflowFrames({ dir: path.join(tmpDir(), 'missing'), ...plain })
  const sweep = createWorkflowFrameSweep({ frames, referencedFrames: () => new Set(), now: () => NOW })
  assert.deepEqual(sweep.sweepAll(), { companies: 0, scanned: 0, removed: 0, kept: 0, skipped: 0 })
})

test('removeCompany deletes the tenant folder and reports its file count', () => {
  const dir = tmpDir()
  const frames = createWorkflowFrames({ dir, ...plain })
  put(dir, 'c1', `${id('a')}.jpg`, NEW); put(dir, 'c1', `${id('b')}.jpg`, OLD); put(dir, 'c2', `${id('c')}.jpg`, OLD)
  assert.equal(frames.removeCompany('c1'), 2)
  assert.equal(fs.existsSync(path.join(dir, 'c1')), false)
  assert.equal(exists(dir, 'c2', `${id('c')}.jpg`), true)          // other tenants untouched
  assert.equal(frames.removeCompany('c1'), 0)                       // already gone
  assert.throws(() => frames.removeCompany('../..'), /company id is required/)
})

test('scheduleFrameSweep runs once after the first delay and stops cleanly', async () => {
  let runs = 0
  const h = scheduleFrameSweep(() => { runs++ }, { firstDelayMs: 5, everyMs: 60 * 60 * 1000 })
  await new Promise((r) => setTimeout(r, 40))
  h.stop()
  assert.equal(runs, 1)
})
