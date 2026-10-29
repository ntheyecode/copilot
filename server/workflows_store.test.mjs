import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkflows } from './workflows_store.js'

// A tiny in-memory harness: no real store, just the ctx the factory expects.
function harness(users) {
  const db = { workflows: [] }
  let seq = 0
  const byId = new Map(users.map((u) => [u.id, u]))
  const api = createWorkflows({
    db: () => db,
    persist: () => {},
    id: () => `id${++seq}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString(),   // monotonic
    httpErr: (code, msg) => { const e = new Error(msg); e.status = code; return e },
    getUser: (uid) => byId.get(uid) || null,
    emit: () => {},
  })
  return { db, api }
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
