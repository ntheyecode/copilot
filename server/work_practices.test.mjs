// Recommended Practices pure core: discipline matching, dedupe against the plan,
// the cap, and the guarantee that every proposed task passes the zero-tolerance
// real-task gate (so rope-in through injectWorkProjectTask is never rejected).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { suggestPractices, matchDisciplines, PRACTICE_DEFAULT_MAX } from './work_practices.js'
import { isRealTask } from './work_project_validate.js'

test('matches a domain from the project text', () => {
  const d = matchDisciplines('Migrate our workloads to AWS and set up a VPC')
  assert.ok(d.some((x) => x.key === 'cloud'))
  assert.equal(matchDisciplines('Write a birthday poem for my friend').length, 0)
})

test('suggests domain practices as add_task with a screen-visible done-state', () => {
  const out = suggestPractices({ goal: 'Migrate our app to AWS', tasks: [{ title: 'Provision', goal: 'Create the servers' }] })
  assert.ok(out.length > 0)
  for (const s of out) {
    assert.equal(s.kind, 'add_task')
    assert.equal(s.source, 'discipline_catalog')
    assert.ok(s.rationale && s.title)
    // The proposed task must pass the real-task gate so rope-in is never rejected.
    assert.equal(isRealTask(s.proposed.taskDescriptor), true)
    assert.ok(s.proposed.taskDescriptor.doneState)
  }
})

test('does not suggest what the plan already covers (dedupe)', () => {
  // A map that already stages in a sandbox should not be told to stage in a sandbox.
  const withSandbox = suggestPractices({
    goal: 'Deploy the service to the cloud',
    tasks: [{ title: 'Stage in sandbox', goal: 'Run the change in a staging or sandbox environment first' }],
  })
  assert.ok(!withSandbox.some((s) => s.id === 'cloud-sandbox'))
})

test('respects the cap and returns nothing off-topic', () => {
  const out = suggestPractices({ goal: 'Harden the server and migrate the database', tasks: [] }, { max: 2 })
  assert.ok(out.length <= 2)
  assert.equal(suggestPractices({ goal: 'Plan a dinner party', tasks: [] }).length, 0)
})

test('no duplicate practice ids across matched disciplines', () => {
  const out = suggestPractices({ goal: 'Secure cloud data migration with backups', tasks: [] }, { max: 99 })
  const ids = out.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length)
})
