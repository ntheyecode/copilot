// Orphan-frame sweep + company deletion on the real store (temp data dir; never
// the real server/data): uploaded frames land encrypted in the tenant folder, the
// sweep keeps the ones a workflow uses, and deleting the company purges the folder.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DATA = path.join(os.tmpdir(), 'wc-wfsweep-' + Date.now())
process.env.WORK_DATA_DIR = DATA
process.env.PORT = '0'
const store = await import('./store.js')

const uniq = (p) => p + Math.random().toString(36).slice(2, 8)
const JPG = 'data:image/jpeg;base64,' + Buffer.from('fakejpeg').toString('base64')
const META = { productName: 'Zamina', title: 'Raise a transfer', owner: 'Ops', launchTarget: 'https://zamina.internal' }
const age = (file, days) => { const t = (Date.now() - days * 24 * 3600 * 1000) / 1000; fs.utimesSync(file, t, t) }

test('sweep removes an old never-saved frame, keeps a workflow frame and a fresh upload; company delete purges the folder', () => {
  const co = store.createCompany({ name: uniq('SweepCo'), plan: 'premium', seats: 0 })
  const admin = store.createManagedUser({ username: uniq('sweepadm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin' })
  const kept = store.uploadWorkflowFrame(admin.id, JPG).ref
  const orphan = store.uploadWorkflowFrame(admin.id, JPG).ref
  const fresh = store.uploadWorkflowFrame(admin.id, JPG).ref
  const folder = path.join(DATA, 'workflow-frames', co.id)
  store.createWorkflow(admin.id, { meta: META, steps: [{ instruction: 'Open Transfers', shot: kept }] })
  age(path.join(folder, kept), 3)
  age(path.join(folder, orphan), 3)

  const r = store.sweepOrphanWorkflowFrames()
  assert.equal(r.removed, 1)
  assert.equal(fs.existsSync(path.join(folder, orphan)), false)
  assert.equal(fs.existsSync(path.join(folder, kept)), true)
  assert.equal(fs.existsSync(path.join(folder, fresh)), true)
  assert.ok(store.readWorkflowFrame(admin.id, kept))                   // still readable after the sweep

  const del = store.deleteCompany(co.id, { reason: 'company closed its account' })
  assert.equal(del.framesPurged, 2)
  assert.equal(fs.existsSync(folder), false)
})

test('deleting a company with no frames reports zero and does not throw', () => {
  const co = store.createCompany({ name: uniq('EmptyCo'), plan: 'basic', seats: 0 })
  assert.equal(store.deleteCompany(co.id, { reason: 'company closed its account' }).framesPurged, 0)
})
