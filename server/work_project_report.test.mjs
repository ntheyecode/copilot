// Project report aggregation (pure): success rolls up completed tasks' steps/outcome
// + end-state; security collects destructive steps + flags; error collects incomplete
// tasks + flags.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProjectReport, REPORT_KINDS } from './work_project_report.js'

const project = {
  name: 'ServiceNow rollout', goal: 'Fresh ITSM', endState: { done: 'All users live', checks: ['SLAs active'] },
  tasks: [
    { id: 't1', title: 'Instance', doneState: 'instance reachable', state: 'done', outcome: 'ok', sessionId: 's1' },
    { id: 't2', title: 'Go-live', doneState: 'users live', state: 'active', sessionId: 's2' },
  ],
}
const sessions = {
  s1: { steps: [{ text: 'Open console', validate: 'console shown', status: 'done' }, { text: 'half', status: 'active' }], events: [] },
  s2: {
    steps: [{ text: 'Drop the old table', status: 'active', destructive: true, destructiveWhy: 'drops a database object' }],
    events: [{ kind: 'flag', text: 'Verification failed on the SLA' }, { kind: 'ai', text: 'noise' }],
  },
}

test('success report rolls up completed tasks + their confirmed steps + end state', () => {
  const r = buildProjectReport(project, sessions, 'success')
  assert.equal(r.kind, 'success')
  assert.equal(r.sections.length, 1)                         // only the done task
  assert.equal(r.sections[0].task, 'Instance')
  assert.equal(r.sections[0].steps.length, 1)                // only the done step
  assert.equal(r.sections[0].outcome, 'ok')
  assert.match(r.markdown, /All users live/)                 // end state present
  assert.match(r.markdown, /Open console/)
})

test('security report collects destructive steps + flags', () => {
  const r = buildProjectReport(project, sessions, 'security')
  assert.equal(r.kind, 'security')
  const go = r.sections.find((s) => s.task === 'Go-live')
  assert.ok(go && go.destructive.length === 1 && /drops a database/.test(go.destructive[0].why))
  assert.ok(go.flags.includes('Verification failed on the SLA'))
})

test('error report lists incomplete tasks + flags, omits clean done tasks', () => {
  const r = buildProjectReport(project, sessions, 'error')
  assert.ok(r.sections.some((s) => s.task === 'Go-live' && s.incomplete))
  assert.ok(!r.sections.some((s) => s.task === 'Instance'))  // done + no flags -> omitted
})

test('unknown kind falls back to success; empty project is safe', () => {
  assert.equal(buildProjectReport(project, sessions, 'garbage').kind, 'success')
  const empty = buildProjectReport({ name: 'E', tasks: [] }, {}, 'success')
  assert.equal(empty.sections.length, 0)
  assert.match(empty.markdown, /No tasks are completed yet/)
  assert.deepEqual(REPORT_KINDS, ['success', 'security', 'error'])
})
