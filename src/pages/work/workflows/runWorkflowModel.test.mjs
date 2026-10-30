import test from 'node:test'
import assert from 'node:assert/strict'
import { workflowRow, categoriesOf, filterRows, runErrorKey, runErrorReloads, isWorkflowSource } from './runWorkflowModel.js'

const W = {
  id: '7', version: 3, state: 'published',
  meta: { title: 'Create a purchase order', productName: 'Zamina', category: 'Procurement', owner: 'Procurement team', launchTarget: 'Zamina > Orders', prerequisites: 'A supplier account', durationMin: '8' },
  steps: [{ instruction: 'Open Orders' }, { instruction: '  ' }, { instruction: 'Press New' }],
}
const err = (status, data) => Object.assign(new Error('x'), { status, data })

test('workflowRow: what a row shows, counting only steps with an instruction', () => {
  const r = workflowRow(W)
  assert.equal(r.steps, 2)
  assert.equal(r.version, 3)
  assert.equal(r.durationMin, 8)
  assert.equal(r.prerequisites, 'A supplier account')
  assert.equal(workflowRow({ meta: {} }).durationMin, null)
  assert.equal(workflowRow(null).steps, 0)
})

test('categoriesOf + filterRows: case-insensitive category, every search word must match', () => {
  const rows = [workflowRow(W), workflowRow({ id: '8', meta: { title: 'Approve an invoice', productName: 'Ledgerly', category: 'procurement', owner: 'Finance' } }),
    workflowRow({ id: '9', meta: { title: 'Reset a password', productName: 'Okta', category: 'IT' } })]
  assert.deepEqual(categoriesOf(rows), ['IT', 'Procurement'])
  assert.deepEqual(filterRows(rows, { category: 'Procurement' }).map((r) => r.id), ['7', '8'])
  assert.deepEqual(filterRows(rows, { q: 'zamina order' }).map((r) => r.id), ['7'])
  assert.deepEqual(filterRows(rows, { q: 'finance' }).map((r) => r.id), ['8'])
  assert.deepEqual(filterRows(rows, { q: 'nothing like this' }), [])
  assert.equal(filterRows(rows).length, 3)
})

test('run errors about the workflow itself, by code; the gate flags are not handled here', () => {
  assert.equal(runErrorKey(err(409, { code: 'WORKFLOW_NOT_PUBLISHED' })), 'workDashboard.workflows.err.notPublished')
  assert.equal(runErrorKey(err(409, { code: 'WORKFLOW_EMPTY' })), 'workDashboard.workflows.err.empty')
  assert.equal(runErrorKey(err(404, {})), 'workDashboard.workflows.err.gone')
  assert.equal(runErrorKey(err(403, {})), 'workDashboard.workflows.err.gone')            // retired: visibility is checked first
  assert.equal(runErrorKey(err(403, { disabled: true })), null)                          // the account, not the workflow
  assert.equal(runErrorReloads(err(403, { disabled: true })), false)
  assert.equal(runErrorKey(err(409, { tooManyOpen: true })), null)
  assert.equal(runErrorReloads(err(409, { code: 'WORKFLOW_NOT_PUBLISHED' })), true)
  assert.equal(runErrorReloads(err(409, { code: 'WORKFLOW_EMPTY' })), false)
})

test('isWorkflowSource: matches the session workflowRef in the server shape only', () => {
  const ref = { id: '7', version: 3, title: 'Create a purchase order' }
  assert.equal(isWorkflowSource('Create a purchase order (v3)', ref), true)
  assert.equal(isWorkflowSource('Create a purchase order', ref), true)
  assert.equal(isWorkflowSource('Your document: Runbook', ref), false)
  assert.equal(isWorkflowSource('Create a purchase order (v3)', null), false)
})
