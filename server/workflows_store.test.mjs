import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkflows } from './workflows_store.js'

// A tiny in-memory harness: no real store, just the ctx the factory expects.
function harness(users, { withFrames = false } = {}) {
  const db = { workflows: [] }
  let seq = 0
  const byId = new Map(users.map((u) => [u.id, u]))
  // An in-memory stand-in for workflow_frames.js (same save/read/remove contract).
  const frameStore = new Map()
  let fseq = 0
  const frames = withFrames ? {
    save: (cid, buf, ext) => { const ref = `${String(++fseq).padStart(32, '0')}.${ext}`; frameStore.set(`${cid}/${ref}`, buf); return ref },
    read: (cid, ref) => (frameStore.has(`${cid}/${ref}`) ? { buffer: frameStore.get(`${cid}/${ref}`), mime: 'image/jpeg' } : null),
    remove: (cid, refs) => { let n = 0; for (const r of refs) if (frameStore.delete(`${cid}/${r}`)) n++; return n },
  } : null
  const api = createWorkflows({
    frames,
    db: () => db,
    persist: () => {},
    id: () => `id${++seq}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString(),   // monotonic
    httpErr: (code, msg) => { const e = new Error(msg); e.status = code; return e },
    getUser: (uid) => byId.get(uid) || null,
    emit: () => {},
  })
  return { db, api, frameStore }
}
const META = { productName: 'Zamina', title: 'Raise a transfer', owner: 'Ops', launchTarget: 'https://zamina.internal' }
const STEP = { instruction: 'Open Transfers' }

const admin = { id: 'a', companyId: 'c1', companyRole: 'company_admin', grants: [] }
const trainer = { id: 't', companyId: 'c1', companyRole: 'member', grants: ['trainer'] }
const pmTrainer = { id: 'pt', companyId: 'c1', companyRole: 'project_manager', grants: ['trainer'] }
const member = { id: 'm', companyId: 'c1', companyRole: 'member', grants: [] }
const other = { id: 'o', companyId: 'c2', companyRole: 'company_admin', grants: [] }

test('only a trainer or admin can author; a plain member cannot', () => {
  const { api } = harness([admin, trainer, member])
  assert.throws(() => api.createWorkflow('m', { meta: META, steps: [STEP] }), /trainer or company admin/)
  const w = api.createWorkflow('t', { meta: META, steps: [STEP] })
  assert.equal(w.state, 'draft')
  assert.equal(w.version, 1)
  assert.equal(w.authorId, 't')
})

test('create requires the four metadata fields', () => {
  const { api } = harness([trainer])
  assert.throws(() => api.createWorkflow('t', { meta: { title: 'x' }, steps: [] }), /Missing required/)
})

test('publish needs a step; a published workflow is visible to a plain member, a draft is not', () => {
  const { api } = harness([trainer, member])
  const d = api.createWorkflow('t', { meta: META, steps: [] })
  assert.throws(() => api.publishWorkflow('t', d.id), /at least one step/)
  api.updateWorkflow('t', d.id, { steps: [STEP] })
  assert.equal(api.publishWorkflow('t', d.id).state, 'published')
  assert.equal(api.listWorkflowsForUser('m').length, 1)        // member sees the published one
  api.createWorkflow('t', { meta: META, steps: [STEP] })       // a new draft (different group)
  assert.equal(api.listWorkflowsForUser('m').length, 1)        // still only the published one
  assert.equal(api.listWorkflowsForUser('t').length, 2)        // author also sees the draft
})

test('revise then publish supersedes the prior live version in the group', () => {
  const { api } = harness([trainer])
  const d = api.createWorkflow('t', { meta: META, steps: [STEP] })
  const v1 = api.publishWorkflow('t', d.id)
  const r = api.reviseWorkflow('t', v1.id)
  assert.equal(r.version, 2)
  assert.equal(r.groupId, v1.groupId)
  assert.equal(r.state, 'draft')
  assert.equal(api.publishWorkflow('t', r.id).state, 'published')
  const live = api.listWorkflowsForUser('t', { state: 'published' })
  assert.equal(live.length, 1)
  assert.equal(live[0].version, 2)
})

test('edit/delete need ownership; admin is the cross-trainer editor; company isolation holds', () => {
  const { api } = harness([admin, trainer, pmTrainer, other])
  const w = api.createWorkflow('t', { meta: META, steps: [STEP] })
  assert.throws(() => api.updateWorkflow('pt', w.id, { steps: [STEP, STEP] }), /author or a company admin/)
  const e = api.updateWorkflow('a', w.id, { steps: [STEP, { instruction: 'Enter amount' }] })
  assert.equal(e.steps.length, 2)
  assert.throws(() => api.getWorkflowForUser('o', w.id), /not found/)
  assert.equal(api.listWorkflowsForUser('o').length, 0)
  assert.deepEqual(api.deleteWorkflow('t', w.id), { ok: true, id: w.id })
})

test('only a draft can be edited; a published one must be revised', () => {
  const { api } = harness([trainer])
  const d = api.createWorkflow('t', { meta: META, steps: [STEP] })
  api.publishWorkflow('t', d.id)
  assert.throws(() => api.updateWorkflow('t', d.id, { steps: [STEP] }), /Only a draft/)
})

const JPG = 'data:image/jpeg;base64,' + Buffer.from('fakejpeg').toString('base64')

test('frames: only an author uploads; reads are company-scoped and ref-validated', () => {
  const { api } = harness([trainer, member, other], { withFrames: true })
  assert.throws(() => api.uploadWorkflowFrame('m', JPG), /trainer or company admin/)
  const { ref } = api.uploadWorkflowFrame('t', JPG)
  assert.match(ref, /^[a-f0-9]{32}\.jpg$/)
  assert.equal(api.readWorkflowFrame('m', ref).buffer.toString(), 'fakejpeg')   // same company can view
  assert.throws(() => api.readWorkflowFrame('o', ref), /Frame not found/)        // another company cannot
  assert.throws(() => api.readWorkflowFrame('t', '../etc/passwd'), /valid frame reference/)
})

test('frames: bad uploads are refused with a clear reason', () => {
  const { api } = harness([trainer], { withFrames: true })
  assert.throws(() => api.uploadWorkflowFrame('t', 'not-an-image'), /image data URL/)
  assert.throws(() => api.uploadWorkflowFrame('t', 'data:image/gif;base64,AAAA'), /JPEG, PNG or WebP/)
})

test('frames: edit and delete purge unreferenced frames but keep ones a revision still shares', () => {
  const { api, frameStore } = harness([trainer], { withFrames: true })
  const f1 = api.uploadWorkflowFrame('t', JPG).ref
  const f2 = api.uploadWorkflowFrame('t', JPG).ref
  const d = api.createWorkflow('t', { meta: META, steps: [{ instruction: 'a', shot: f1 }, { instruction: 'b', shot: f2 }] })
  const v1 = api.publishWorkflow('t', d.id)
  const r = api.reviseWorkflow('t', v1.id)                                  // v2 shares f1 + f2
  api.updateWorkflow('t', r.id, { steps: [{ instruction: 'a', shot: f1 }] }) // v2 drops f2
  assert.equal(frameStore.size, 2)                                          // f2 still used by v1 -> kept
  api.deleteWorkflow('t', v1.id)                                            // f2 now unreferenced -> purged
  assert.equal(frameStore.size, 1)
  assert.ok(api.readWorkflowFrame('t', f1))                                 // f1 still shared by v2
  api.deleteWorkflow('t', r.id)                                             // last reference gone
  assert.equal(frameStore.size, 0)
})

test('a step shot that is not a frame ref is dropped', () => {
  const { api } = harness([trainer])
  const w = api.createWorkflow('t', { meta: META, steps: [{ instruction: 'a', shot: '../../etc/passwd' }] })
  assert.equal(w.steps[0].shot, null)
})

test('without frame storage, frame calls fail clearly (never a silent success)', () => {
  const { api } = harness([trainer])
  assert.throws(() => api.uploadWorkflowFrame('t', JPG), /not configured/)
})

test('step reading: author of a draft only; tenant-scoped frames; saved beside trainer text', () => {
  const { api } = harness([trainer, member, other, admin], { withFrames: true })
  const f1 = api.uploadWorkflowFrame('t', JPG).ref
  const f2 = api.uploadWorkflowFrame('t', JPG).ref
  const w = api.createWorkflow('t', { meta: META, steps: [{ id: 's1', instruction: 'Open', target: 'Mine', shot: f1 }, { id: 's2', instruction: 'Save', shot: f2 }] })
  assert.throws(() => api.prepareStepRead('m', w.id, 's1'), /trainer or company admin/)
  assert.throws(() => api.prepareStepRead('o', w.id, 's1'), /not found/)
  assert.throws(() => api.prepareStepRead('t', w.id, 'nope'), /Step not found/)
  const p = api.prepareStepRead('t', w.id, 's1')
  assert.equal(p.nextStep.shot, f2)
  assert.equal(p.total, 2)
  assert.match(p.loadFrame(f1), /^data:image\/jpeg;base64,/)
  assert.throws(() => p.loadFrame('f'.repeat(32) + '.jpg'), /missing/)
  const saved = api.saveStepReading('t', w.id, 's1', { controlLabel: 'Transfers', doneWhen: 'List shows', confidence: 0.9, shot: f1, afterShot: f2 })
  assert.equal(saved.steps[0].target, 'Mine')                       // trainer text untouched
  assert.equal(saved.steps[0].reading.controlLabel, 'Transfers')
  // a reading for a frame the step no longer shows is refused, not stored
  assert.throws(() => api.saveStepReading('t', w.id, 's1', { controlLabel: 'X', confidence: 1, shot: f2 }), /changed while it was being read/)
  // the reading survives an ordinary edit that keeps the frame, and travels with a revision
  const edited = api.updateWorkflow('t', w.id, { steps: saved.steps })
  assert.equal(edited.steps[0].reading.controlLabel, 'Transfers')
  api.publishWorkflow('t', w.id)
  assert.throws(() => api.prepareStepRead('t', w.id, 's1'), /Only a draft/)
  const rev = api.reviseWorkflow('t', w.id)
  assert.equal(rev.steps[0].reading.controlLabel, 'Transfers')
})

test('regression: a reading cannot be forged through a save; the server copy is kept by screenshot', () => {
  const { api } = harness([trainer], { withFrames: true })
  const f1 = api.uploadWorkflowFrame('t', JPG).ref
  const forged = { controlLabel: 'Forged', confidence: 1, shot: f1 }
  const w = api.createWorkflow('t', { meta: META, steps: [{ id: 's1', instruction: 'Open', shot: f1, reading: forged }] })
  assert.equal(w.steps[0].reading, null)                          // create drops client readings
  api.saveStepReading('t', w.id, 's1', { controlLabel: 'Real', confidence: 0.7, shot: f1 })
  const out = api.updateWorkflow('t', w.id, { steps: [{ id: 's1', instruction: 'Open now', shot: f1, reading: forged }] })
  assert.equal(out.steps[0].reading.controlLabel, 'Real')         // server copy kept, forged one ignored
  const cleared = api.updateWorkflow('t', w.id, { steps: [{ id: 's1', instruction: 'Open now', shot: null }] })
  assert.equal(cleared.steps[0].reading, null)                    // screenshot removed -> reading gone
})

test('regression: a reading whose after screen is no longer the next step is dropped', () => {
  const { api } = harness([trainer], { withFrames: true })
  const [f1, f2, f3] = [1, 2, 3].map(() => api.uploadWorkflowFrame('t', JPG).ref)
  const w = api.createWorkflow('t', { meta: META, steps: [{ id: 's1', instruction: 'a', shot: f1 }, { id: 's2', instruction: 'b', shot: f2 }] })
  api.saveStepReading('t', w.id, 's1', { controlLabel: 'Go', doneWhen: 'B shows', confidence: 0.9, shot: f1, afterShot: f2 })
  const kept = api.updateWorkflow('t', w.id, { steps: [{ id: 's1', instruction: 'a', shot: f1 }, { id: 's2', instruction: 'b2', shot: f2 }] })
  assert.equal(kept.steps[0].reading.controlLabel, 'Go')
  const swapped = api.updateWorkflow('t', w.id, { steps: [{ id: 's1', instruction: 'a', shot: f1 }, { id: 's3', instruction: 'c', shot: f3 }] })
  assert.equal(swapped.steps[0].reading, null)
  // and a save racing a read: the after frame changed in flight -> refused
  assert.throws(() => api.saveStepReading('t', w.id, 's1', { controlLabel: 'Go', confidence: 0.9, shot: f1, afterShot: f2 }), /changed while it was being read/)
})

test('regression: repeated step ids are made unique, so a read can never land on another step', () => {
  const { api } = harness([trainer])
  const w = api.createWorkflow('t', { meta: META, steps: [{ id: 's2', instruction: 'a' }, { id: 's3', instruction: 'b' }, { instruction: 'c' }] })
  const ids = w.steps.map((s) => s.id)
  assert.equal(new Set(ids).size, 3)
  assert.deepEqual(ids.slice(0, 2), ['s2', 's3'])
})

test('regression: deleting a workflow keeps the frames a running session still shows', () => {
  const db = { workflows: [] }
  let seq = 0
  const store = new Map()
  const frames = {
    save: (cid, buf, ext) => { const ref = `${String(++seq).padStart(32, '0')}.${ext}`; store.set(`${cid}/${ref}`, buf); return ref },
    read: (cid, ref) => (store.has(`${cid}/${ref}`) ? { buffer: store.get(`${cid}/${ref}`), mime: 'image/jpeg' } : null),
    remove: (cid, refs) => { let n = 0; for (const r of refs) if (store.delete(`${cid}/${r}`)) n++; return n },
  }
  let inUse = new Set()
  const api = createWorkflows({
    frames, framesInUse: () => inUse, db: () => db, persist: () => {}, id: () => `id${++seq}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString(),
    httpErr: (code, msg) => { const e = new Error(msg); e.status = code; return e },
    getUser: (uid) => (uid === 't' ? trainer : null), emit: () => {},
  })
  const f1 = api.uploadWorkflowFrame('t', JPG).ref
  const f2 = api.uploadWorkflowFrame('t', JPG).ref
  const w = api.createWorkflow('t', { meta: META, steps: [{ instruction: 'a', shot: f1 }, { instruction: 'b', shot: f2 }] })
  inUse = new Set([f1])                                   // an employee is mid-run on step 1
  api.deleteWorkflow('t', w.id)
  assert.ok(api.readWorkflowFrame('t', f1))               // still served to the running session
  assert.throws(() => api.readWorkflowFrame('t', f2), /not found/)   // the unused one is purged
})
