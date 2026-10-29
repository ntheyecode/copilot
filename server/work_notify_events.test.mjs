// Enterprise assignment notifications: the store must EMIT an event (which the
// email layer turns into a localized message) when a PM assigns a task, hands a
// project to a PM, or assigns a procedure - and never notify the actor themselves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-notify-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)

const events = []
store.onStoreEvent((type, payload) => { if (String(type).startsWith('work_')) events.push({ type, payload }) })
const last = (type) => [...events].reverse().find((e) => e.type === type)

test('assignment events fire for task / project / template, not to the actor', () => {
  const co = store.createCompany({ name: uniq('Co') })
  const srpm = store.createManagedUser({ username: uniq('sr'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'senior_project_manager', tier: 'premium' })
  const pm = store.createManagedUser({ username: uniq('pm'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const pm2 = store.createManagedUser({ username: uniq('pm2'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'project_manager', tier: 'premium' })
  const m1 = store.createManagedUser({ username: uniq('m1'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  store.setUserCompany(m1.id, co.id, 'member', 'worker')

  // A Sr PM creates a project managed by a DIFFERENT PM -> that PM is notified.
  const p = store.createCompanyProject(srpm.id, { name: 'Portal', goal: 'launch the portal end to end', managerId: pm.id, tasks: [{ title: 'Do step', goal: 'Do the step', doneState: 'Done' }] })
  let e = last('work_project_assigned')
  assert.ok(e && String(e.payload.managerId) === String(pm.id) && String(e.payload.byId) === String(srpm.id), 'project assigned to the PM fires')

  // The PM assigns a task to the worker -> the worker is notified.
  store.assignProjectTask(pm.id, p.id, p.tasks[0].id, m1.id)
  e = last('work_task_assigned')
  assert.ok(e && String(e.payload.assigneeId) === String(m1.id) && e.payload.taskTitle, 'task assigned to the member fires with a title')

  // Reassign the whole project to another PM -> that PM is notified.
  store.reassignProject(srpm.id, p.id, pm2.id)
  e = last('work_project_assigned')
  assert.ok(e && String(e.payload.managerId) === String(pm2.id) && e.payload.reassigned === true, 'project reassignment fires')

  // Assign a template to the member -> the member is notified.
  const tpl = store.createProjectTemplate(pm2.id, { name: 'Onboarding', goal: 'Onboard a new hire', tasks: [{ title: 'Account', goal: 'Create the account', doneState: 'Exists' }] })
  store.assignTemplate(pm2.id, tpl.id, [m1.id])
  e = last('work_template_assigned')
  assert.ok(e && String(e.payload.userId) === String(m1.id) && e.payload.templateName === 'Onboarding', 'template assignment fires to the member')

  // No self-notification: a PM (on mixed flow, so assignable) assigning a task
  // to THEMSELVES, in a project they created, emits nothing.
  store.setUserCompany(pm.id, co.id, 'project_manager', 'mixed')
  const before = events.length
  const p2 = store.createCompanyProject(pm.id, { name: 'Solo', goal: 'a project the PM runs alone end to end', tasks: [{ title: 'T', goal: 'Do it', doneState: 'Done' }] })
  store.assignProjectTask(pm.id, p2.id, p2.tasks[0].id, pm.id)
  assert.equal(events.length, before, 'no event when the actor assigns to themselves / is their own manager')

  // --- the full set of notification types ---
  // Task reassigned away from the old holder -> work_task_unassigned to m1.
  const m2 = store.createManagedUser({ username: uniq('m2'), password: 'Passw0rd!x', companyId: co.id, companyRole: 'member', tier: 'premium' })
  store.setUserCompany(m2.id, co.id, 'member', 'worker')
  store.assignProjectTask(pm2.id, p.id, p.tasks[0].id, m2.id)   // was m1
  let u = last('work_task_unassigned'); assert.ok(u && String(u.payload.assigneeId) === String(m1.id), 'old assignee notified of unassignment')

  // Task completed -> work_task_completed to the project manager (pm2). The
  // project is owned by its creator (srpm); drive state via the owner, then the
  // assignee finalizes (owner-agnostic by sessionId, as the worker-run path does).
  store.setWorkProjectTaskState(srpm.id, p.id, p.tasks[0].id, 'active')
  store.linkWorkProjectTaskSession(srpm.id, p.id, p.tasks[0].id, 'sess-done-1')
  store.completeProjectTaskForSession(m2.id, 'sess-done-1', { outcome: 'done' })
  u = last('work_task_completed'); assert.ok(u && String(u.payload.managerId) === String(pm2.id) && String(u.payload.assigneeId) === String(m2.id), 'manager notified a task was completed')

  // Project reassignment already notified the old PM earlier -> work_project_unassigned.
  u = last('work_project_unassigned'); assert.ok(u && String(u.payload.managerId) === String(pm.id), 'old PM notified a project moved away')

  // Hold / resume -> work_project_held / resumed to the assignee (m2).
  store.holdProject(pm2.id, p.id, true, 'waiting on access')
  u = last('work_project_held'); assert.ok(u && String(u.payload.userId) === String(m2.id) && u.payload.reason, 'assignee notified of hold with reason')
  store.holdProject(pm2.id, p.id, false)
  u = last('work_project_resumed'); assert.ok(u && String(u.payload.userId) === String(m2.id), 'assignee notified of resume')

  // Role / flow change -> work_access_changed to the member.
  store.updateCompanyMember(co.id, m1.id, { companyRole: 'project_manager' })
  u = last('work_access_changed'); assert.ok(u && String(u.payload.userId) === String(m1.id) && u.payload.role === 'project_manager', 'member notified their access changed')

  // Hours granted -> work_hours_granted to the member.
  store.grantCompanyPoolSeconds(co.id, 3600)
  store.allocateCompanyPoolToUser(co.id, m2.id, 1800)
  u = last('work_hours_granted'); assert.ok(u && String(u.payload.userId) === String(m2.id) && u.payload.minutes === 30, 'member notified of granted hours')

  // Removed from the company -> work_member_removed to the person.
  store.removeCompanyMember(co.id, m2.id, { reason: 'left the team', byUserId: srpm.id })
  u = last('work_member_removed'); assert.ok(u && String(u.payload.userId) === String(m2.id), 'removed member notified')
})
