// Managed projects across the PM roles: a PM creates and assigns, the worker
// starts from the queue, the Sr PM moves work, GRC watches risks read-only.
import { test, expect } from '../support/fixtures.mjs'
import { needCap } from '../support/editions.mjs'
import { PmPages } from '../pages/PmPages.mjs'
import { DEFAULT_PROJECT } from '../support/boot/responders.mjs'

const [T1, T2] = DEFAULT_PROJECT.tasks.map((t) => t.title)

test.beforeEach(({ edition }) => needCap(test, edition, 'saas_companies'))

async function createProjectApi(api, goal = 'Close the quarter books for the finance team') {
  const r = await api.post('/api/work/pm/projects', { goal, name: 'Quarter close' })
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  return r.data.project
}

test('a PM creates a project in the console and assigns a task; the worker starts it from the queue', async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['pm', 'worker'] })
  const pm = await as.page(co.users.pm, { path: null })
  const pmUi = new PmPages(pm.page)
  await pmUi.openPm()
  await pmUi.createProject({ goal: 'Close the quarter books for the finance team', name: 'Quarter close' })
  await expect(pm.page.getByText(T1).first()).toBeVisible()
  expect((await server.ctl('ai.calls', { kind: 'project' })).length, 'the project map came from the AI').toBeGreaterThan(0)

  const list = await pm.api.get('/api/work/pm/projects')
  const project = list.data.projects.find((p) => p.name === 'Quarter close')
  expect(project).toBeTruthy()
  const task = project.tasks.find((t) => t.title === T1)
  // Assign through the API the console uses (the select lists worker/mixed people).
  const a = await pm.api.post(`/api/work/pm/projects/${project.id}/tasks/${task.id}/assign`, { assigneeId: co.users.worker.id })
  expect(a.status).toBe(200)
  expect(a.data.task.assigneeId).toBe(co.users.worker.id)

  const worker = await as.page(co.users.worker, { path: null })
  const queue = new PmPages(worker.page)
  await queue.openQueue()
  const row = worker.page.locator('li, article, div').filter({ hasText: T1 }).filter({ has: worker.page.getByRole('button', { name: 'Start' }) }).last()
  await row.getByRole('button', { name: 'Start' }).click()
  await worker.page.waitForURL(/\/work\/session\/[^/]+$/, { timeout: 30_000 })
  await expect(worker.page.locator('section.gv-step').first()).toBeVisible({ timeout: 30_000 })

  const after = await pm.api.get(`/api/work/pm/projects/${project.id}`)
  const t1 = after.data.project.tasks.find((t) => t.id === task.id)
  expect(t1.sessionId, 'the started task is linked to the guided session').toBeTruthy()
  expect(t1.state).toBe('active')
})

test('the worker cannot start their own task, only assigned ones', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['worker'] })
  const w = await as.api(co.users.worker)
  const r = await w.post('/api/work/sessions', { goal: 'Do something on my own' })
  expect(r.status).toBe(403)
  expect(r.data.workerFlow).toBe(true)
})

test('a Sr PM moves a project to another manager and a task to another person', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['pm', 'srpm', 'worker', 'member'] })
  const pm = await as.api(co.users.pm)
  const project = await createProjectApi(pm)
  const task = project.tasks.find((t) => t.title === T2)
  expect((await pm.post(`/api/work/pm/projects/${project.id}/tasks/${task.id}/assign`, { assigneeId: co.users.worker.id })).status).toBe(200)

  const sr = await as.api(co.users.srpm)
  // A plain PM cannot move a project; the Sr PM can.
  const denied = await pm.post(`/api/work/pm/projects/${project.id}/reassign`, { managerId: co.users.srpm.id })
  expect(denied.status).toBe(403)
  const moved = await sr.post(`/api/work/pm/projects/${project.id}/reassign`, { managerId: co.users.srpm.id, reason: 'PM on leave' })
  expect(moved.status).toBe(200)
  expect(moved.data.project.managerId).toBe(co.users.srpm.id)
  // The task keeps its assignee through the move, then the Sr PM moves the task.
  const t = moved.data.project.tasks.find((x) => x.id === task.id)
  expect(t.assigneeId).toBe(co.users.worker.id)
  const re = await sr.post(`/api/work/pm/projects/${project.id}/tasks/${task.id}/assign`, { assigneeId: co.users.member.id })
  expect(re.status).toBe(200)
  expect(re.data.task.assigneeId).toBe(co.users.member.id)
  // The previous PM no longer sees it; the Sr PM dashboard does.
  expect((await pm.get(`/api/work/pm/projects/${project.id}`)).status).toBe(404)
  const ui = await as.page(co.users.srpm, { path: '/work/srpm' })
  await expect(ui.page.getByRole('heading', { name: 'Project managers' })).toBeVisible()
})

test('GRC sees held, idle and overdue work as risks and cannot change anything', async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['pm', 'grc', 'worker'] })
  const pm = await as.api(co.users.pm)
  const project = await createProjectApi(pm)
  const [a, b] = project.tasks
  expect((await pm.post(`/api/work/pm/projects/${project.id}/tasks/${a.id}/assign`, { assigneeId: co.users.worker.id })).status).toBe(200)
  expect((await pm.post(`/api/work/pm/projects/${project.id}/hold`, { held: true, reason: 'Waiting for the auditor' })).status).toBe(200)

  // A second project nobody picked up: its first task (no dependencies) is idle.
  const idle = await createProjectApi(pm, 'Prepare the annual vendor review for procurement')

  const grc = await as.api(co.users.grc)
  let risks = (await grc.get('/api/work/grc/risks')).data.risks
  expect(risks.find((r) => r.kind === 'project_held').projectId).toBe(project.id)
  const idleRisks = risks.filter((r) => r.kind === 'unassigned_idle')
  // Only a task whose dependencies are met counts as idle: the first project's
  // later tasks wait on task 1, so only the untouched project's task 1 is listed.
  expect(idleRisks.map((r) => [r.projectId, r.taskId])).toEqual([[idle.id, idle.tasks[0].id]])
  expect(risks.some((r) => r.kind === 'sla_breach')).toBe(false)
  // Six days later the assigned task is past the 5 day SLA.
  await server.ctl('clock.advance', { ms: 6 * 86400_000 })
  expect((await grc.get('/api/work/grc/risks')).status, 'the 8 h session ended during those days').toBe(401)
  await grc.login(co.users.grc.username, co.password)
  risks = (await grc.get('/api/work/grc/risks')).data.risks
  const sla = risks.find((r) => r.kind === 'sla_breach')
  expect(sla && sla.taskId).toBe(a.id)

  // Read-only: every write is refused.
  expect((await grc.post('/api/work/pm/projects', { goal: 'Anything' })).status).toBe(403)
  expect((await grc.post(`/api/work/pm/projects/${project.id}/tasks/${b.id}/assign`, { assigneeId: co.users.worker.id })).status).toBe(403)
  expect((await grc.post(`/api/work/pm/projects/${project.id}/hold`, { held: false })).status).toBe(403)
  expect((await grc.post(`/api/work/pm/projects/${project.id}/reassign`, { managerId: co.users.pm.id })).status).toBe(403)
  expect((await grc.get('/api/work/grc/stats')).data.stats.total).toBeGreaterThan(0)

  const ui = await as.page(co.users.grc, { path: '/work/grc' })
  await expect(ui.page.getByRole('heading', { name: 'Oversight' })).toBeVisible()
  await expect(ui.page.getByText('Quarter close').first()).toBeVisible()
})

test('project permissions hold for every company role', async ({ as, seed }) => {
  const co = await seed.company()
  const pm = await as.api(co.users.pm)
  const project = await createProjectApi(pm)
  for (const key of ['member', 'worker', 'exec', 'trainer']) {
    const api = await as.api(co.users[key])
    expect((await api.post('/api/work/pm/projects', { goal: 'Try to create a project' })).status, `${key} creates`).toBe(403)
    expect((await api.get('/api/work/pm/projects')).data.projects, `${key} lists`).toEqual([])
    expect((await api.get('/api/work/grc/risks')).status, `${key} risks`).toBe(403)
  }
  // An independent-flow person can never be assigned work.
  const indep = await seed.company({ personas: ['pm'] })
  const other = await as.api(indep.users.pm)
  expect((await other.get(`/api/work/pm/projects/${project.id}`)).status, 'another company never sees it').toBe(404)
})
