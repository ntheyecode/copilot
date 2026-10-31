// Teach studio, as the trainer: author a workflow by hand through the wizard,
// publish, revise, retire and delete it; record a demonstration from a shared
// (synthetic) screen; have each step read against its screenshot; use a
// suggestion. Plus the access rule: only trainers and company admins author.
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { TeachStudio, PH } from '../pages/TeachStudio.mjs'
import { makeScreenRecording } from '../pages/media.mjs'

// Without company tenants (paid) each test checks this is refused and hidden.
const REFUSE = {
  what: 'the Teach studio (authoring, recording, importing, reading steps)',
  api: [['GET', '/api/work/workflows'], ['POST', '/api/work/workflows'], ['POST', '/api/work/workflows/frames']],
  pages: ['/work/teach'],
}


const BASICS = { productName: 'Billing portal', title: 'Raise a credit note', owner: 'Finance operations', launchTarget: 'Billing > Credit notes' }

companyTest(test, 'a trainer authors, publishes, revises, retires and deletes a workflow', REFUSE, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer', 'member'] })
  const { page, api } = await as.page(co.users.trainer, { path: null })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.fillBasics(BASICS)
  await studio.next()            // Details (optional)
  await studio.next()            // Scope & privacy
  await studio.acknowledgeScope()
  await studio.next()            // Steps
  await studio.writeSteps(['Open the Credit notes tab and choose New.', 'Pick the invoice to credit.', 'Click Save.'])
  await studio.saveDraft()

  let list = (await api.get('/api/work/workflows')).data.workflows
  const draft = list.find((w) => w.meta.title === BASICS.title)
  expect(draft.state).toBe('draft')
  expect(draft.steps.map((s) => s.instruction)).toHaveLength(3)

  // Saving returns to the list; publish from the draft's row.
  await studio.rowAction(BASICS.title, 'Publish')
  await expect(page.getByText(`Published "${BASICS.title}". Your team sees it now.`)).toBeVisible()
  list = (await api.get('/api/work/workflows')).data.workflows
  expect(list.find((w) => w.id === draft.id).state).toBe('published')
  // A plain member sees the published workflow (and only published ones).
  const member = await as.api(co.users.member)
  expect((await member.get('/api/work/workflows')).data.workflows.map((w) => w.id)).toContain(draft.id)

  // Revise -> a new draft v2 in the same group; the published v1 stays live.
  await studio.open()
  await studio.rowAction(BASICS.title, 'Revise')
  // The new draft opens straight in the wizard, prefilled from v1.
  await expect(page.getByText('Editing draft v2')).toBeVisible()
  await expect(studio.field(PH.title)).toHaveValue(BASICS.title)
  await studio.button('Cancel').click()
  list = (await api.get('/api/work/workflows')).data.workflows
  const v2 = list.find((w) => w.groupId === draft.groupId && w.version === 2)
  expect(v2.state).toBe('draft')
  expect(list.find((w) => w.id === draft.id).state).toBe('published')

  // Retire the published version (with the confirm dialog).
  await studio.open()
  const pubHead = page.locator('button.tch-rowhead', { hasText: BASICS.title }).filter({ hasText: 'Published' })
  await pubHead.click()
  await page.getByRole('button', { name: 'Retire', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Retire', exact: true }).click()
  await expect(page.getByText(`Retired "${BASICS.title}".`)).toBeVisible()
  expect((await api.get(`/api/work/workflows/${draft.id}`)).data.workflow.state).toBe('retired')
  expect((await member.get('/api/work/workflows')).data.workflows.map((w) => w.id)).not.toContain(draft.id)

  // Delete the v2 draft.
  const del = await api.del(`/api/work/workflows/${v2.id}`)
  expect(del.status).toBe(200)
  expect((await api.get(`/api/work/workflows/${v2.id}`)).status).toBe(404)
})

companyTest(test, 'the wizard holds the trainer to the required basics and the scope note', REFUSE, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const { page } = await as.page(co.users.trainer, { path: null })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.field(PH.productName).fill('Billing portal')
  await studio.next()
  await expect(page.getByText(/Add these before you continue/)).toBeVisible()
  await expect(studio.tab('Basics')).toHaveAttribute('aria-selected', 'true')
  await expect(studio.button('Publish').last()).toBeDisabled()
})

companyTest(test, 'only trainers and company admins can author', REFUSE, async ({ as, seed }) => {
  const co = await seed.company()
  const body = { meta: { ...BASICS }, steps: [{ instruction: 'Do it' }] }
  for (const key of ['member', 'worker', 'pm', 'srpm', 'grc', 'exec']) {
    const api = await as.api(co.users[key])
    const r = await api.post('/api/work/workflows', body)
    expect(r.status, `${key} cannot author`).toBe(403)
  }
  for (const key of ['trainer', 'admin']) {
    const api = await as.api(co.users[key])
    expect((await api.post('/api/work/workflows', body)).status, `${key} can author`).toBe(200)
  }
  // The studio itself tells a non-trainer who to ask.
  const { page } = await as.page(co.users.member, { path: '/work/teach' })
  await expect(page.getByText('The Teach studio is for trainers')).toBeVisible()
})

companyTest(test, 'import a screen recording: steps are drafted from its screens', REFUSE, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const { page, api } = await as.page(co.users.trainer, { path: null })
  const studio = new TeachStudio(page)
  await studio.open()
  const video = await makeScreenRecording(page, { screens: 4 })
  expect(video.length).toBeGreaterThan(10_000)
  await studio.newWorkflow()
  await studio.fillBasics({ ...BASICS, title: 'Imported credit note' })
  await studio.next(); await studio.next()
  await studio.acknowledgeScope()
  await studio.next()
  await page.getByRole('button', { name: 'Import a recording' }).first().click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose a video' }).click()
  await (await chooser).setFiles({ name: 'teams-call.webm', mimeType: 'video/webm', buffer: video })
  await page.getByRole('button', { name: 'Build steps from this video' }).click()
  await expect(page.getByRole('img', { name: /Screenshot for step 1/ })).toBeVisible({ timeout: 90_000 })
  // No soundtrack in this file: the importer says so and uses the screens only.
  await expect(page.getByText('The soundtrack could not be read, so the steps come from the screens only.').or(page.getByText('No speech was found in the soundtrack.')).first()).toBeVisible()
  await studio.saveDraft()
  const wf = (await api.get('/api/work/workflows')).data.workflows.find((w) => w.meta.title === 'Imported credit note')
  expect(wf.steps.length).toBeGreaterThanOrEqual(2)
  expect(wf.steps.every((s) => /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(s.shot || ''))).toBe(true)
})

companyTest(test, 'record a demonstration, read each step against its screenshot, use a suggestion', REFUSE, async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const { page, api } = await as.page(co.users.trainer, { path: null, syntheticScreen: true })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.fillBasics({ ...BASICS, title: 'Recorded credit note' })
  await studio.next(); await studio.next()
  await studio.acknowledgeScope()
  await studio.next()

  // Record: no microphone (narration off), share the synthetic screen.
  await page.getByRole('button', { name: 'Record a demonstration' }).first().click()
  const narrate = page.getByLabel('Narrate with my microphone')
  if (await narrate.isChecked()) await narrate.uncheck()
  await page.getByRole('button', { name: 'Share screen and start' }).click()
  await expect(page.getByText('Recording', { exact: true }).first()).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__e2eScreen.act())
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Mark step' }).click()
    await page.waitForTimeout(700)
  }
  // One more mark with no screen change: two steps share a screenshot (the case
  // that once lost a step's reading on save, e2e/FINDINGS.md #11).
  await page.getByRole('button', { name: 'Mark step' }).click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Stop and review' }).click()
  // Steps drafted with screenshots (masked on this device, uploaded encrypted).
  await expect(page.getByRole('img', { name: /Screenshot for step 1/ })).toBeVisible({ timeout: 60_000 })

  // Read the steps: the draft is saved first, then each step is read.
  await page.getByRole('button', { name: /^Read \d+ steps?$/ }).click()
  await expect(page.getByText(/Suggestions are ready for \d+ of \d+ steps/).first()).toBeVisible({ timeout: 60_000 })
  const reads = await server.ctl('ai.calls', { kind: 'stepRead' })
  expect(reads.length).toBeGreaterThan(0)
  expect(reads[0].images, 'the step reader saw the screenshot').toBeGreaterThan(0)

  // Open step 1 and use the suggestion: the target becomes the read label.
  const first = page.getByRole('button', { name: 'Show step details' }).first()
  if (await first.isVisible()) await first.click()
  await page.getByRole('button', { name: 'Use suggestion' }).first().click()
  await expect(studio.field(PH.target).first()).toHaveValue('Save')
  await expect(studio.field(PH.doneWhen).first()).toHaveValue('A confirmation banner reads Changes saved.')
  await studio.saveDraft()

  const wf = (await api.get('/api/work/workflows')).data.workflows.find((w) => w.meta.title === 'Recorded credit note')
  expect(wf.steps[0].shot).toMatch(/^[a-f0-9]{32}\.(jpg|png|webp)$/)
  expect(wf.steps[0].target).toBe('Save')
  expect(wf.steps[0].reading.controlLabel).toBe('Save')
  // Every step that was read still has its own reading after the save, even
  // where two steps share one screenshot.
  const shots = wf.steps.filter((s) => s.shot)
  expect(shots.filter((s) => !s.reading).map((s) => s.id), 'no reading lost on save').toEqual([])
  expect(new Set(shots.map((s) => s.shot)).size, 'this recording has two steps on one screenshot').toBeLessThan(shots.length)
  // The screenshot itself is served back to the company.
  const img = await api.get(`/api/work/workflows/frames/${wf.steps[0].shot}`)
  expect(img.status).toBe(200)
  expect(img.headers['content-type']).toMatch(/^image\//)
})
