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
  assert.deepEqual(store.getWorkSession(u.id, s.id).workflowRef, { id: 'w1', groupId: 'g1', version: 2, title: 'Raise a transfer', mode: 'run' })
  store.setWorkSessionWorkflowRef(u.id, s.id, null)
  assert.equal(store.getWorkSession(u.id, s.id).workflowRef, null)
  assert.throws(() => store.setWorkSessionWorkflowRef(u.id, 'nope', { id: 'w1' }), /Session not found/)
})

// Wave 3 part C on the real store: encrypted incident screenshots, the separate
// alert inbox saved with the data, the company screenshot setting, and the
// delete cascade through deleteWorkSession / deleteCompany.
test('incidents on the real store: alerts, screenshot setting, delete cascade', () => {
  const co = store.createCompany({ name: 'Incident Co ' + Date.now(), seats: 5, adminSeats: 2 })
  const admin = store.createManagedUser({ username: 'inc_admin' + Date.now(), password: 'Passw0rd!x', companyId: co.id, companyRole: 'company_admin' })
  const emp = store.createManagedUser({ username: 'inc_emp' + Date.now(), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member' })
  const JPG = 'data:image/jpeg;base64,' + Buffer.from('fakejpeg-bytes').toString('base64')
  const ref = { id: 'w1', groupId: 'g1', version: 1, title: 'Raise a transfer', mode: 'run' }
  const s1 = store.createWorkSession(emp.id, { goal: 'Raise a transfer' })
  const out = store.recordWorkflowIncident({ userId: emp.id, sessionId: s1.id, workflowRef: ref, stepIndex: 0, stepText: 'Open', deviation: { kind: 'error', why: 'A red error appeared' }, frameDataUrl: JPG, masked: false })
  assert.equal(out.created, true)
  const f = store.readWorkflowIncidentFrame(admin.id, out.incident.id)
  assert.equal(f.buffer.toString(), 'fakejpeg-bytes')                      // stored encrypted, read back intact
  assert.equal(store.unreadWorkflowAlerts(admin.id), 1)
  assert.equal(store.listWorkflowAlerts(admin.id)[0].kind, 'error')
  assert.equal(store.unreadNotificationCount(admin.id), 0)                 // billing inbox untouched
  // company turns screenshots off: a new incident keeps no screen
  store.setCompanyReportShots(co.id, false)
  const s2 = store.createWorkSession(emp.id, { goal: 'Raise a transfer' })
  const noShot = store.recordWorkflowIncident({ userId: emp.id, sessionId: s2.id, workflowRef: ref, stepIndex: 3, deviation: { kind: 'blocked', why: 'Cannot continue' }, frameDataUrl: JPG })
  assert.throws(() => store.readWorkflowIncidentFrame(admin.id, noShot.incident.id), /no screenshot/)
  // deleting the session that supplied the screenshot removes it and its occurrence
  store.deleteWorkSession(emp.id, s1.id, 'test cleanup')
  assert.equal(store.listWorkflowIncidents(admin.id).incidents.some((x) => x.id === out.incident.id), false)
  // deleting the company removes every incident it had (a second purge finds nothing left)
  assert.equal(store.listWorkflowIncidents(admin.id).incidents.length, 1)
  store.deleteCompany(co.id, { reason: 'test cleanup', by: 'test' })
  assert.equal(store.purgeWorkflowIncidents({ companyId: co.id }), 0)
})
