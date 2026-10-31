import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkflowIncidents, alertInboxOf } from './workflow_incidents.js'
import { createWorkflows } from './workflows_store.js'

const USERS = [
  { id: 'trainer', companyId: 'c1', companyRole: 'member', grants: ['trainer'], name: 'Tara' },
  { id: 'trainer2', companyId: 'c1', companyRole: 'member', grants: ['trainer'] },
  { id: 'pm', companyId: 'c1', companyRole: 'project_manager', grants: [] },
  { id: 'exec', companyId: 'c1', companyRole: 'executive', grants: [] },
  { id: 'grc', companyId: 'c1', companyRole: 'grc', grants: [] },
  { id: 'admin', companyId: 'c1', companyRole: 'company_admin', grants: [] },
  { id: 'emp', companyId: 'c1', companyRole: 'member', grants: [], name: 'Eli' },
  { id: 'emp2', companyId: 'c1', companyRole: 'member', grants: [] },
  { id: 'off', companyId: 'c1', companyRole: 'project_manager', grants: [], disabled: true },
  { id: 'other', companyId: 'c2', companyRole: 'company_admin', grants: [] },
]
const JPG = 'data:image/jpeg;base64,' + Buffer.from('fakejpeg').toString('base64')
const META = { productName: 'Zamina', title: 'Raise a transfer', owner: 'Ops', launchTarget: 'https://zamina.internal' }

function harness({ shots = true } = {}) {
  const db = { workflows: [] }
  let seq = 0
  const byId = new Map(USERS.map((u) => [u.id, u]))
  const notes = []
  const frameStore = new Map()
  const frames = {
    save: (cid, buf, ext) => { const ref = `${String(++seq).padStart(32, '0')}.${ext}`; frameStore.set(`${cid}/${ref}`, buf); return ref },
    read: (cid, ref) => (frameStore.has(`${cid}/${ref}`) ? { buffer: frameStore.get(`${cid}/${ref}`), mime: 'image/jpeg' } : null),
    remove: (cid, refs) => { let n = 0; for (const r of refs) if (frameStore.delete(`${cid}/${r}`)) n++; return n },
  }
  const common = {
    db: () => db, persist: () => {}, id: () => `id${++seq}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString(),
    httpErr: (code, msg) => { const e = new Error(msg); e.status = code; return e },
    getUser: (uid) => byId.get(uid) || null, emit: () => {},
  }
  const workflows = createWorkflows(common)
  const inc = createWorkflowIncidents({
    ...common, frames, workflows, shotsAllowed: () => shots,
    companyUsers: (cid) => USERS.filter((u) => u.companyId === cid),
    inbox: { add: (box, n) => notes.push({ box, ...n }) },
  })
  return { inc, workflows, notes, frameStore, db }
}
const REF = { id: 'w1', groupId: 'g1', version: 1, title: 'Raise a transfer', mode: 'run' }
const DEV = { kind: 'ui_changed', why: 'Expected Approve, saw Submit', extraStep: null }
const UNTRAINED = { kind: 'untrained_path', why: 'A consent page appeared', extraStep: 'Click Accept on the consent page' }
const rec = (inc, o) => inc.recordWorkflowIncident({ userId: 'emp', sessionId: 'ws1', workflowRef: REF, stepIndex: 1, deviation: DEV, ...o })

function published(workflows, steps = [{ instruction: 'Open Transfers' }, { instruction: 'Click Approve' }]) {
  const w = workflows.createWorkflow('trainer', { meta: META, steps })
  return workflows.publishWorkflow('trainer', w.id)
}

test('a new incident alerts trainers, PMs and above, admins and executives in their own alert inbox; structured, no English title', () => {
  const { inc, notes } = harness()
  const out = rec(inc, { stepIndex: 2, frameDataUrl: JPG, masked: true })
  assert.equal(out.created, true)
  assert.deepEqual(notes.map((n) => n.box).sort(), ['admin', 'exec', 'grc', 'pm', 'trainer', 'trainer2'].map(alertInboxOf).sort())
  assert.deepEqual(Object.keys(notes[0]).sort(), ['box', 'incidentId', 'kind', 'stepIndex', 'type', 'why', 'workflowId', 'workflowTitle'].sort())
  assert.equal(notes[0].type, 'workflow_incident')
  assert.equal(out.incident.masked, true)
  assert.ok(out.incident.frameRef)
})

test('regression: no screenshot is kept when the company does not keep screenshots', () => {
  const { inc, frameStore } = harness({ shots: false })
  const out = rec(inc, { frameDataUrl: JPG })
  assert.equal(out.incident.frameRef, null)
  assert.equal(frameStore.size, 0)
})

test('repeats are one incident with a count: same session once, another session adds one, no new alert', () => {
  const { inc, notes } = harness()
  rec(inc)
  const before = notes.length
  assert.equal(rec(inc).incident.count, 1)
  assert.equal(rec(inc, { userId: 'emp2', sessionId: 'ws2' }).incident.count, 2)
  assert.equal(notes.length, before)
  assert.equal(rec(inc, { stepIndex: 3 }).created, true)        // another step is its own incident
})

test('regression: a dismissed incident stays quiet; a repeat after RESOLVED is a new incident (a regression)', () => {
  const { inc, notes } = harness()
  const a = rec(inc).incident
  inc.setWorkflowIncidentState('pm', a.id, { state: 'dismissed' })
  const n0 = notes.length
  const again = rec(inc, { userId: 'emp2', sessionId: 'ws2' })
  assert.equal(again.created, false)
  assert.equal(again.incident.id, a.id)
  assert.equal(again.incident.state, 'dismissed')
  assert.equal(notes.length, n0)
  inc.setWorkflowIncidentState('pm', a.id, { state: 'resolved' })
  const regress = rec(inc, { sessionId: 'ws3' })
  assert.equal(regress.created, true)
  assert.ok(notes.length > n0)
})

test('plan-mode sessions key by step text and carry no workflow step index', () => {
  const { inc } = harness()
  const r = rec(inc, { workflowRef: { ...REF, mode: 'plan' }, stepIndex: 4, stepText: 'Open the **Ledger**' })
  assert.equal(r.incident.stepIndex, null)
  assert.match(r.incident.key, /\|p:open the ledger\|ui_changed$/)
})

test('one session raises at most 10 incidents, counting occurrences it added to existing ones', () => {
  const { inc } = harness()
  for (let i = 0; i < 5; i++) rec(inc, { userId: 'emp2', sessionId: 'other', stepIndex: i })
  for (let i = 0; i < 12; i++) rec(inc, { stepIndex: i })          // 5 joins + 5 new = 10, then capped
  const mine = inc.listWorkflowIncidents('pm').incidents.filter((x) => x.occurrences.some((o) => o.userId === 'emp'))
  assert.equal(mine.length, 10)
  assert.equal(inc.recordWorkflowIncident({ userId: 'emp', sessionId: 'x', workflowRef: null, deviation: DEV }), null)
  assert.equal(inc.recordWorkflowIncident({ userId: 'emp', sessionId: 'x', workflowRef: REF, deviation: { kind: 'nope', why: 'x' } }), null)
})

test('regression: a session pushed out of the 50 shown occurrences is still the same session (no inflated count)', () => {
  const { inc } = harness()
  rec(inc, { sessionId: 's0' })
  for (let i = 1; i <= 60; i++) rec(inc, { userId: 'emp2', sessionId: `s${i}` })
  const x = rec(inc, { sessionId: 's0' }).incident
  assert.equal(x.count, 61)
  assert.equal(x.occurrences.length, 50)
})

test('who sees and who acts: members 403, other companies see nothing, GRC and executives read only', () => {
  const { inc } = harness()
  const { incident } = rec(inc, { frameDataUrl: JPG })
  assert.throws(() => inc.listWorkflowIncidents('emp'), /trainers, project managers, admins and executives/)
  assert.equal(inc.listWorkflowIncidents('other').incidents.length, 0)
  const exec = inc.listWorkflowIncidents('exec')
  assert.equal(exec.canManage, false)
  assert.equal(exec.summary.open, 1)
  assert.equal(exec.incidents[0].occurrences[0].name, 'Eli')
  assert.throws(() => inc.setWorkflowIncidentState('exec', incident.id, { state: 'resolved' }), /Only trainers/)
  assert.throws(() => inc.setWorkflowIncidentState('grc', incident.id, { state: 'resolved' }), /Only trainers/)
  assert.throws(() => inc.setWorkflowIncidentState('pm', incident.id, { state: 'bogus' }), /Unknown incident state/)
  assert.throws(() => inc.setWorkflowIncidentState('other', incident.id, { state: 'resolved' }), /not found/)
  assert.equal(inc.setWorkflowIncidentState('trainer', incident.id, { state: 'acknowledged', note: 'Looking' }).state, 'acknowledged')
  assert.equal(inc.listWorkflowIncidents('pm', { state: 'active' }).incidents.length, 1)
  inc.setWorkflowIncidentState('pm', incident.id, { state: 'resolved' })
  assert.equal(inc.listWorkflowIncidents('pm', { state: 'active' }).incidents.length, 0)
})

test('the screenshot is served only to recipients in the same company', () => {
  const { inc } = harness()
  const a = rec(inc, { frameDataUrl: JPG }).incident
  const b = rec(inc, { stepIndex: 2 }).incident
  assert.equal(inc.readWorkflowIncidentFrame('exec', a.id).mime, 'image/jpeg')
  assert.throws(() => inc.readWorkflowIncidentFrame('emp', a.id), /trainers, project managers/)
  assert.throws(() => inc.readWorkflowIncidentFrame('other', a.id), /not found/)
  assert.throws(() => inc.readWorkflowIncidentFrame('pm', b.id), /no screenshot/)
})

test('adopt: the author puts the untrained step into a NEW DRAFT before the blocked step; the live version keeps running', () => {
  const { inc, workflows } = harness()
  const w = published(workflows)
  const { incident } = rec(inc, { workflowRef: { ...REF, id: w.id, groupId: w.groupId }, stepIndex: 1, deviation: UNTRAINED })
  assert.equal(inc.listWorkflowIncidents('trainer').incidents[0].canAdopt, true)
  assert.equal(inc.listWorkflowIncidents('trainer2').incidents[0].canAdopt, false)   // a trainer who is not the author
  assert.equal(inc.listWorkflowIncidents('pm').incidents[0].canAdopt, false)
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer2', incident.id), /author or a company admin/)
  const out = inc.adoptWorkflowIncidentStep('trainer', incident.id)
  assert.equal(out.workflow.state, 'draft')
  assert.deepEqual(out.workflow.steps.map((s) => s.instruction), ['Open Transfers', 'Click Accept on the consent page', 'Click Approve'])
  assert.equal(workflows.getWorkflowForUser('trainer', w.id).state, 'published')
  assert.equal(out.incident.resolution, 'adopted')
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer', incident.id), /already closed/)
  // reopening does not allow a second copy while the draft waits for review
  inc.setWorkflowIncidentState('trainer', incident.id, { state: 'open' })
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer', incident.id), /already in a draft/)
})

test('adopt: several adopted steps share ONE draft, each anchored to its workflow step', () => {
  const { inc, workflows } = harness()
  const w = published(workflows, [{ instruction: 'A' }, { instruction: 'B' }, { instruction: 'C' }])
  const ref = { ...REF, id: w.id, groupId: w.groupId }
  const i1 = rec(inc, { workflowRef: ref, stepIndex: 2, deviation: { ...UNTRAINED, extraStep: 'Before C' } }).incident
  const i2 = rec(inc, { workflowRef: ref, stepIndex: 1, sessionId: 'ws2', deviation: { ...UNTRAINED, extraStep: 'Before B' } }).incident
  const d1 = inc.adoptWorkflowIncidentStep('admin', i1.id).workflow
  const d2 = inc.adoptWorkflowIncidentStep('admin', i2.id).workflow
  assert.equal(d1.id, d2.id)
  assert.deepEqual(d2.steps.map((s) => s.instruction), ['A', 'Before B', 'B', 'Before C', 'C'])
})

test('adopt: a failed update leaves no orphan draft; nothing to add or a retired version is refused', () => {
  const { inc, workflows, db } = harness()
  const w = published(workflows)
  const ref = { ...REF, id: w.id, groupId: w.groupId }
  const plain = rec(inc, { workflowRef: ref, stepIndex: 0 }).incident
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer', plain.id), /no step to add/)
  const u = rec(inc, { workflowRef: ref, stepIndex: 0, sessionId: 'ws2', deviation: UNTRAINED }).incident
  const realUpdate = workflows.updateWorkflow
  workflows.updateWorkflow = () => { throw Object.assign(new Error('disk full'), { status: 500 }) }
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer', u.id), /disk full/)
  workflows.updateWorkflow = realUpdate
  assert.equal(db.workflows.filter((x) => x.state === 'draft').length, 0)
  workflows.retireWorkflow('trainer', w.id)
  assert.throws(() => inc.adoptWorkflowIncidentStep('trainer', u.id), /no longer live/)
})

test('privacy: deleting a session, an account or a company removes what it contributed', () => {
  const { inc, frameStore } = harness()
  const a = rec(inc, { frameDataUrl: JPG }).incident                     // ws1 supplied the screenshot
  rec(inc, { userId: 'emp2', sessionId: 'ws2' })                          // joins a
  const solo = rec(inc, { stepIndex: 5, sessionId: 'ws9' }).incident
  inc.purgeWorkflowIncidents({ sessionId: 'ws1' })
  const after = inc.listWorkflowIncidents('pm').incidents.find((x) => x.id === a.id)
  assert.equal(after.count, 1)
  assert.equal(after.hasFrame, false)
  assert.equal(frameStore.size, 0)
  inc.purgeWorkflowIncidents({ userId: 'emp' })
  assert.equal(inc.listWorkflowIncidents('pm').incidents.some((x) => x.id === solo.id), false)
  inc.purgeWorkflowIncidents({ companyId: 'c1' })
  assert.equal(inc.listWorkflowIncidents('pm').incidents.length, 0)
})

// E2E finding (e2e/FINDINGS.md #2): a run session's step text carries Guide's
// **bold** control markup, and the Workflow issues inbox showed it raw.
test('the incident step text is plain text, also for records saved before the fix', () => {
  const { inc, db } = harness()
  rec(inc, { stepText: 'Click **Approve** in the `Transfers` tab' })
  assert.equal(db.workflowIncidents[0].stepText, 'Click Approve in the Transfers tab', 'stored plain')
  assert.equal(inc.listWorkflowIncidents('pm').incidents[0].stepText, 'Click Approve in the Transfers tab')
  // A record written before the fix still carries the markup on disk.
  db.workflowIncidents[0].stepText = 'Click **Approve**'
  assert.equal(inc.listWorkflowIncidents('pm').incidents[0].stepText, 'Click Approve')
})
