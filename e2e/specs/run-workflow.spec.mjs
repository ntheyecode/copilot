// An employee finds and runs a published workflow from the dashboard; while
// they follow it, the screen shows a path the workflow does not cover, so a
// deviation becomes a workflow incident. Trainers, PMs and executives are
// alerted; viewers cannot act; the trainer adopts the missing step into a draft.
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { makeWorkflow } from '../support/workflows.mjs'

// Without company tenants (paid) each test checks this is refused and hidden.
const REFUSE = {
  what: 'company workflows and workflow issues',
  api: [['GET', '/api/work/workflows?state=published'], ['GET', '/api/work/workflow-incidents'], ['GET', '/api/work/workflow-incidents-alerts']],
  pages: ['/work/workflow-issues', '/work/exec'],
  absentText: [['/work', 'Company workflows']],
}


const DEVIATION = {
  completed: [], current: 1, guidance: 'Close the approval dialog first.', observation: 'An approval dialog is open.', flag: '', done: false,
  deviation: { kind: 'untrained_path', why: 'The step expects the Credit notes list, but an approval dialog appeared first.', extraStep: 'Click Approve in the approval dialog.' },
}

companyTest(test, 'an employee runs a published workflow, a deviation alerts the right people, the trainer adopts the step', REFUSE, async ({ as, seed, server }) => {
  const co = await seed.company()
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Credit note run' })

  // The employee finds it on the dashboard and runs it.
  await server.ctl('ai.script', { rules: [{ kind: 'watch', times: 1, content: DEVIATION }] })
  const emp = await as.page(co.users.member, { path: '/work', syntheticScreen: true })
  await expect(emp.page.getByRole('heading', { name: 'Company workflows' })).toBeVisible()
  await expect(emp.page.getByText('Credit note run').first()).toBeVisible()
  await emp.page.getByRole('button', { name: /^Run\b/ }).first().click()
  await emp.page.waitForURL(/\/work\/session\/[^/]+$/)
  const sessionId = emp.page.url().split('/').pop()
  // The steps are the trainer's, with the trainer's screenshot; no AI plan call.
  await expect(emp.page.locator('section.gv-step').first()).toContainText('Credit notes')
  await expect(emp.page.getByText('What the screen should look like').first()).toBeVisible()
  const shot = emp.page.locator('img[src*="/api/work/workflows/frames/"]').first()
  await expect.poll(() => shot.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
  expect(await server.ctl('ai.calls', { kind: 'plan' }), 'a published workflow is not re-planned').toHaveLength(0)
  const sess = await emp.api.get(`/api/work/sessions/${sessionId}`)
  expect((sess.data.session || sess.data).workflowRef.id).toBe(wf.id)

  // The watch loop reads the screen: deviation -> incident.
  await expect.poll(async () => (await trainer.get('/api/work/workflow-incidents')).data.incidents.length, { timeout: 30_000 }).toBe(1)
  const inc = (await trainer.get('/api/work/workflow-incidents')).data.incidents[0]
  expect(inc.kind).toBe('untrained_path')
  expect(inc.extraStep).toBe('Click Approve in the approval dialog.')
  expect(inc.canAdopt).toBe(true)

  // Who is alerted: trainer, PM, Sr PM, GRC, admin, executive; never the employee or a worker.
  for (const key of ['trainer', 'pm', 'srpm', 'grc', 'admin', 'exec']) {
    const api = await as.api(co.users[key])
    const a = await api.get('/api/work/workflow-incidents-alerts')
    expect(a.data.unread, `${key} is alerted`).toBeGreaterThan(0)
  }
  for (const key of ['member', 'worker']) {
    const api = key === 'member' ? emp.api : await as.api(co.users[key])
    expect((await api.get('/api/work/workflow-incidents-alerts')).data.unread, `${key} is not alerted`).toBe(0)
    expect((await api.get('/api/work/workflow-incidents')).status, `${key} cannot list incidents`).toBe(403)
  }
  // Viewers (GRC, executive) see it but cannot act.
  for (const key of ['grc', 'exec']) {
    const api = await as.api(co.users[key])
    expect((await api.get('/api/work/workflow-incidents')).data.incidents).toHaveLength(1)
    expect((await api.patch(`/api/work/workflow-incidents/${inc.id}`, { state: 'acknowledged' })).status, `${key} cannot act`).toBe(403)
  }

  // The trainer adopts the step in the Workflow issues inbox.
  const tp = await as.page(co.users.trainer, { path: '/work/workflow-issues' })
  await expect(tp.page.getByRole('heading', { level: 1, name: 'Workflow issues' })).toBeVisible()
  const head = tp.page.locator('button[aria-expanded]').filter({ hasText: 'Credit note run' }).first()
  await expect(head).toContainText('Open the Credit notes tab and choose New.')
  await expect(head, 'step text shows without the guide markup').not.toContainText('**')
  await head.click()
  await tp.page.getByRole('button', { name: 'Add this step to the workflow draft' }).first().click()
  await tp.page.getByRole('dialog').getByRole('button', { name: 'Add to draft' }).click()
  await expect(tp.page.getByText('Added to the draft. Review and publish it in the Teach studio.').first()).toBeVisible()

  const incAfter = (await tp.api.get('/api/work/workflow-incidents?state=all')).data.incidents.find((x) => x.id === inc.id)
  expect(incAfter.state).toBe('resolved')
  expect(incAfter.resolution).toBe('adopted')
  const draft = (await tp.api.get(`/api/work/workflows/${incAfter.draftId}`)).data.workflow
  expect(draft.state).toBe('draft')
  expect(draft.groupId).toBe(wf.groupId)
  expect(draft.steps.map((s) => s.instruction)).toContain('Click Approve in the approval dialog.')
  // The live version keeps running unchanged until the draft is published.
  expect((await tp.api.get(`/api/work/workflows/${wf.id}`)).data.workflow.state).toBe('published')
})

companyTest(test, 'an executive sees active issues on the executive dashboard card', REFUSE, async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['trainer', 'member', 'exec'] })
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Exec card run' })
  const emp = await as.api(co.users.member)
  const start = await emp.post(`/api/work/workflows/${wf.id}/start`)
  expect(start.status).toBe(200)
  await server.ctl('ai.script', { rules: [{ kind: 'watch', content: { ...DEVIATION, deviation: { kind: 'error', why: 'The Save button shows an error the workflow does not cover.', extraStep: '' } } }] })
  const frame = (await import('../support/workflows.mjs')).pngDataUrl([200, 40, 40])
  const w = await emp.post(`/api/work/sessions/${start.data.sessionId}/watch`, { frame })
  expect(w.status).toBe(200)
  const ex = await as.page(co.users.exec, { path: '/work/exec' })
  await expect(ex.page.getByRole('heading', { level: 1, name: 'Productivity' })).toBeVisible()
  await expect(ex.page.getByText('Workflow issues').first()).toBeVisible()
})
