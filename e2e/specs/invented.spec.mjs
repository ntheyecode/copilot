// Invented scenarios: the awkward things real people and real networks do.
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import * as Paid from '../support/paid-scenarios.mjs'
import { makeWorkflow, pngDataUrl } from '../support/workflows.mjs'
import { FAKE_HOOK_HOST } from '../support/boot/net-fakes.mjs'
import { TeachStudio, PH } from '../pages/TeachStudio.mjs'


const bearer = (secret) => ({ authorization: `Bearer ${secret}` })

companyTest(test, 'two tabs editing the same draft: the second save does not silently erase the first', Paid.REFUSE_DRAFTS, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const api = await as.api(co.users.trainer)
  const wf = await makeWorkflow(api, { title: 'Two tab draft', publish: false, shots: false })
  // Both tabs loaded the same version of the draft.
  const tabA = (await api.get(`/api/work/workflows/${wf.id}`)).data.workflow
  const tabB = JSON.parse(JSON.stringify(tabA))
  // Tab A rewrites step 1 and saves.
  tabA.steps[0].instruction = 'Open Credit notes from the Billing menu.'
  const a = await api.patch(`/api/work/workflows/${wf.id}`, { steps: tabA.steps, baseUpdatedAt: tabA.updatedAt })
  expect(a.status).toBe(200)
  // Tab B, still on the old copy, changes the owner and saves its stale steps.
  const b = await api.patch(`/api/work/workflows/${wf.id}`, { meta: { owner: 'Billing team' }, steps: tabB.steps, baseUpdatedAt: tabB.updatedAt })
  expect(b.status, 'a stale save is refused, not applied over the newer one').toBe(409)
  expect(b.data.code).toBe('WORKFLOW_CHANGED')
  const now = (await api.get(`/api/work/workflows/${wf.id}`)).data.workflow
  expect(now.steps[0].instruction).toBe('Open Credit notes from the Billing menu.')
})

companyTest(test, 'two tabs in the browser: the stale tab is told to reload, and nothing is lost', Paid.REFUSE_DRAFTS, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const api = await as.api(co.users.trainer)
  await makeWorkflow(api, { title: 'Browser tabs draft', publish: false, shots: false })
  // Signing in through the browser ends the API session above (one live session
  // per account), so the checks below use the browser's own session.
  const { page, context, api: browserApi } = await as.page(co.users.trainer, { path: '/work/teach' })
  const page2 = await context.newPage()
  await page2.goto('/work/teach')
  for (const p of [page, page2]) {
    const studio = new TeachStudio(p)
    await studio.rowAction('Browser tabs draft', 'Edit')
    await studio.tab('Steps').click()
  }
  await page.getByPlaceholder(PH.instruction).first().fill('Tab one wrote this step.')
  await new TeachStudio(page).saveDraft()
  await page2.getByPlaceholder(PH.instruction).first().fill('Tab two wrote this step.')
  await page2.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page2.getByText(/changed in another tab|changed since you opened it/i).first()).toBeVisible()
  const wf = (await browserApi.get('/api/work/workflows')).data.workflows.find((w) => w.meta.title === 'Browser tabs draft')
  expect(wf.steps[0].instruction).toBe('Tab one wrote this step.')
})

companyTest(test, 'the network drops while a recording is being saved, and Try again recovers it', Paid.REFUSE_RECORDING, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const { page, context, api } = await as.page(co.users.trainer, { path: null, syntheticScreen: true })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.fillBasics({ productName: 'Billing portal', title: 'Offline recording', owner: 'Finance operations', launchTarget: 'Billing > Credit notes' })
  await studio.next(); await studio.next(); await studio.acknowledgeScope(); await studio.next()
  await page.getByRole('button', { name: 'Record a demonstration' }).first().click()
  const narrate = page.getByLabel('Narrate with my microphone')
  if (await narrate.isChecked()) await narrate.uncheck()
  await page.getByRole('button', { name: 'Share screen and start' }).click()
  // Same pacing as a real demonstration: each new screen settles before the mark.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__e2eScreen.act())
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Mark step' }).click()
    await page.waitForTimeout(700)
  }
  // The connection drops right as the trainer stops: the screenshots cannot upload.
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Stop and review' }).click()
  await expect(page.getByText('A screenshot could not be saved. Your recording is still here, so you can try again.').first()).toBeVisible({ timeout: 60_000 })
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Try again' }).first().click()
  await expect(page.getByRole('img', { name: /Screenshot for step 1/ })).toBeVisible({ timeout: 60_000 })
  await studio.saveDraft()
  const wf = (await api.get('/api/work/workflows')).data.workflows.find((w) => w.meta.title === 'Offline recording')
  expect(wf.steps.length).toBeGreaterThan(0)
  expect(wf.steps[0].shot).toMatch(/^[a-f0-9]{32}\./)
})

companyTest(test, 'an expired API key is refused on /api/v1 while its replacement works', Paid.REFUSE_KEYS, async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['admin', 'trainer'] })
  await makeWorkflow(await as.api(co.users.trainer), { title: 'Expiry workflow' })
  const admin = await as.api(co.users.admin)
  const k = await admin.post('/api/work/company/api-keys', { name: 'Short lived', scopes: ['workflows:read'], expiresInDays: 30 })
  const old = k.data.secret
  const rot = await admin.post(`/api/work/company/api-keys/${k.data.key.id}/rotate`, { graceMinutes: 1 })
  expect(rot.status).toBe(200)
  const anon = await as.anon()
  expect((await anon.get('/api/v1/workflows', bearer(old))).status, 'old key works during the grace minute').toBe(200)
  await server.ctl('clock.advance', { ms: 2 * 60_000 })
  const r = await anon.get('/api/v1/workflows', bearer(old))
  expect(r.status).toBe(401)
  expect(r.data.code).toBe('KEY_EXPIRED')
  expect((await anon.get('/api/v1/workflows', bearer(rot.data.secret))).status).toBe(200)
  // And the 30 day expiry itself.
  await server.ctl('clock.advance', { ms: 31 * 86400_000 })
  expect((await anon.get('/api/v1/workflows', bearer(rot.data.secret))).data.code).toBe('KEY_EXPIRED')
})

companyTest(test, 'a member removed from the company mid-session is signed out at once', Paid.soloDisabledMidSession, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['admin', 'member'] })
  const member = await as.page(co.users.member, { path: '/work' })
  await expect(member.page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  const admin = await as.api(co.users.admin)
  const noReason = await admin.del(`/api/work/company/users/${co.users.member.id}`, {})
  expect(noReason.status, 'a reason is required').toBe(400)
  const del = await admin.del(`/api/work/company/users/${co.users.member.id}`, { reason: 'Left the company' })
  expect(del.status).toBe(200)
  const r = await member.api.get('/api/work/sessions')
  expect(r.status).toBe(401)
  expect(r.data.loggedOut).toBe(true)
  await member.page.goto('/work/teach')
  await expect(member.page).toHaveURL(/\/workcopilot/)
  // Signing in again works, but as a person with no company.
  await member.api.login(co.users.member.username, co.password)
  const me = await member.api.get('/api/work/me')
  expect(me.data.user.companyId).toBeFalsy()
  expect((await member.api.get('/api/work/workflows')).status).toBe(403)
})

companyTest(test, 'deleting a workflow while an employee runs it keeps their screenshots loading', Paid.REFUSE_RUN, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer', 'member'] })
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Deleted mid-run' })
  const emp = await as.page(co.users.member, { path: null })
  const start = await emp.api.post(`/api/work/workflows/${wf.id}/start`)
  expect(start.status).toBe(200)
  await emp.page.goto(`/work/session/${start.data.sessionId}`)
  await emp.page.locator('section.gv-step').first().waitFor()
  expect((await trainer.del(`/api/work/workflows/${wf.id}`)).status).toBe(200)
  for (const s of start.data.steps.filter((x) => x.shot)) {
    const r = await emp.api.get(`/api/work/workflows/frames/${s.shot}`)
    expect(r.status, `frame ${s.shot} still loads`).toBe(200)
  }
  await emp.page.reload()
  const shot = emp.page.locator('img[src*="/api/work/workflows/frames/"]').first()
  await expect.poll(() => shot.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
})

companyTest(test, 'a huge workflow (100 steps) is authored, published and run', Paid.soloHugePlan, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer', 'member'] })
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Hundred step workflow', steps: 100 })
  expect(wf.steps).toHaveLength(100)
  const studio = await as.page(co.users.trainer, { path: '/work/teach' })
  await expect(studio.page.getByText('100 steps').first()).toBeVisible()
  const t = new TeachStudio(studio.page)
  await t.rowAction('Hundred step workflow', 'Revise')
  await t.tab('Steps').click()
  await expect(studio.page.getByText('Step 100').first()).toBeAttached()
  const emp = await as.page(co.users.member, { path: null })
  const start = await emp.api.post(`/api/work/workflows/${wf.id}/start`)
  expect(start.data.steps).toHaveLength(100)
  await emp.page.goto(`/work/session/${start.data.sessionId}`)
  await expect(emp.page.getByText(/Step 1 of 100/).first()).toBeVisible()
})

companyTest(test, 'rapid double clicks on Publish and Run make one version and one session', Paid.soloDoubleBegin, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer', 'member'] })
  const { page, api } = await as.page(co.users.trainer, { path: null })
  const studio = new TeachStudio(page)
  await studio.open()
  await studio.newWorkflow()
  await studio.fillBasics({ productName: 'Billing portal', title: 'Double click publish', owner: 'Finance operations', launchTarget: 'Billing > Credit notes' })
  await studio.next(); await studio.next(); await studio.acknowledgeScope(); await studio.next()
  await studio.writeSteps(['Open the Credit notes tab and choose New.'])
  await page.getByRole('button', { name: 'Publish', exact: true }).last().dblclick()
  await expect(page.getByText(/Published/).first()).toBeVisible()
  const mine = (await api.get('/api/work/workflows')).data.workflows.filter((w) => w.meta.title === 'Double click publish')
  expect(mine, 'one workflow, one version').toHaveLength(1)
  expect(mine[0].state).toBe('published')

  const emp = await as.page(co.users.member, { path: '/work' })
  await expect(emp.page.getByText('Double click publish').first()).toBeVisible()
  const before = ((await emp.api.get('/api/work/sessions')).data.sessions || []).length
  await emp.page.getByRole('button', { name: /^Run\b/ }).first().dblclick()
  await emp.page.waitForURL(/\/work\/session\/[^/]+$/)
  await emp.page.waitForTimeout(1500)
  const after = ((await emp.api.get('/api/work/sessions')).data.sessions || []).length
  expect(after - before, 'one run, one session').toBe(1)
})

companyTest(test, 'Back inside the wizard keeps what was typed, and browser Back leaves cleanly', Paid.soloWizardBack, async ({ as, seed }) => {
  const co = await seed.company({ personas: ['trainer'] })
  const { page, api } = await as.page(co.users.trainer, { path: '/work' })
  await page.goto('/work/teach')
  const studio = new TeachStudio(page)
  await studio.newWorkflow()
  const basics = { productName: 'Billing portal', title: 'Back button draft', owner: 'Finance operations', launchTarget: 'Billing > Credit notes' }
  await studio.fillBasics(basics)
  await studio.next(); await studio.next(); await studio.acknowledgeScope(); await studio.next()
  await studio.writeSteps(['First step written.'])
  for (let i = 0; i < 3; i++) await studio.back()
  await expect(studio.tab('Basics')).toHaveAttribute('aria-selected', 'true')
  await expect(studio.field(PH.title)).toHaveValue(basics.title)
  await studio.tab('Steps').click()
  await expect(studio.field(PH.instruction).first()).toHaveValue('First step written.')
  // Browser Back from the studio goes to the previous page without a crash and
  // without saving a half-made workflow behind the trainer's back.
  await page.goBack()
  await expect(page).toHaveURL(/\/work$/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  expect((await api.get('/api/work/workflows')).data.workflows.some((w) => w.meta.title === basics.title)).toBe(false)
})

companyTest(test, 'a webhook endpoint that is down is retried, then dead-lettered', Paid.REFUSE_HOOKS, async ({ as, seed, server }) => {
  test.setTimeout(150_000)
  const co = await seed.company({ personas: ['admin', 'trainer'] })
  const admin = await as.api(co.users.admin)
  await server.ctl('hooks.mode', { mode: 'down' })
  const url = `https://${FAKE_HOOK_HOST}/down/${seed.prefix()}`
  const ep = (await admin.post('/api/work/company/webhooks', { url, events: ['workflow.published'] })).data.endpoint
  await makeWorkflow(await as.api(co.users.trainer), { title: 'Down hook workflow' })
  const delivery = async () => (await admin.get(`/api/work/company/webhooks/${ep.id}/deliveries`)).data.deliveries.find((d) => d.event === 'workflow.published')
  await expect.poll(async () => (await delivery() || {}).attempts || 0, { timeout: 20_000 }).toBeGreaterThan(0)
  // Each retry waits 30 s, 2 min, 10 min ... 6 h; move the clock past each one.
  for (let i = 0; i < 8; i++) {
    const d = await delivery()
    if (d.status === 'dead') break
    await server.ctl('clock.advance', { ms: 7 * 3600_000 })
    await admin.login(co.users.admin.username, co.password)   // the 8 h session ends along the way
    await expect.poll(async () => (await delivery()).attempts, { timeout: 15_000 }).toBeGreaterThan(d.attempts)
  }
  const d = await delivery()
  expect(d.status).toBe('dead')
  expect(d.attempts).toBe(7)
  expect(d.lastHttpStatus).toBe(503)
  const hits = (await server.ctl('hooks.deliveries')).filter((x) => x.path === new URL(url).pathname)
  expect(hits.length, 'every attempt really reached the endpoint').toBe(7)
  // Once it is back, a manual retry delivers.
  await server.ctl('hooks.mode', { mode: 'ok' })
  expect((await admin.post(`/api/work/company/webhooks/deliveries/${d.id}/retry`)).status).toBe(200)
  await expect.poll(async () => (await delivery()).status, { timeout: 15_000 }).toBe('delivered')
})

companyTest(test, 'company A can never read or change company B, by key or by session', Paid.soloCrossAccount, async ({ as, seed }) => {
  const A = await seed.company({ personas: ['admin', 'trainer', 'pm', 'member'] })
  const B = await seed.company({ personas: ['admin', 'trainer', 'pm', 'member'] })
  const bTrainer = await as.api(B.users.trainer)
  const bWf = await makeWorkflow(bTrainer, { title: 'Company B secret workflow' })
  const bShot = bWf.steps[0].shot
  const bPm = await as.api(B.users.pm)
  // Setup must say why it failed (2026-10-31: once, under a 4-worker full run,
  // this create returned no project and the test died later on a TypeError).
  const bCreate = await bPm.post('/api/work/pm/projects', { goal: 'Close the quarter books for the finance team' })
  expect([bCreate.status, !!(bCreate.data && bCreate.data.project)], `setup: company B's project (${JSON.stringify(bCreate.data).slice(0, 300)})`).toEqual([200, true])
  const bProject = bCreate.data.project
  const bMember = await as.api(B.users.member)
  const bSession = (await bMember.post(`/api/work/workflows/${bWf.id}/start`)).data.sessionId
  const bAdmin = await as.api(B.users.admin)
  const bHook = (await bAdmin.post('/api/work/company/webhooks', { url: `https://${FAKE_HOOK_HOST}/b`, events: ['workflow.published'] })).data.endpoint

  // A's API key.
  const aAdmin = await as.api(A.users.admin)
  const aKey = (await aAdmin.post('/api/work/company/api-keys', { name: 'A key', scopes: ['workflows:read', 'workflows:run', 'incidents:read', 'webhooks:manage'], expiresInDays: 30 })).data.secret
  const anon = await as.anon()
  expect((await anon.get(`/api/v1/workflows/${bWf.id}`, bearer(aKey))).status).toBe(404)
  expect((await anon.get('/api/v1/workflows', bearer(aKey))).data.workflows.map((w) => w.id)).not.toContain(bWf.id)
  expect((await anon.post(`/api/v1/workflows/${bWf.id}/launch`, { employee: { id: B.users.member.id } }, bearer(aKey))).status).toBe(404)
  expect((await anon.patch(`/api/v1/webhooks/${bHook.id}`, { enabled: false }, bearer(aKey))).status).toBe(404)
  expect((await anon.get(`/api/v1/webhooks/${bHook.id}/deliveries`, bearer(aKey))).status).toBe(404)

  // A's people, by session.
  const aTrainer = await as.api(A.users.trainer)
  expect((await aTrainer.get(`/api/work/workflows/${bWf.id}`)).status).toBe(404)
  expect((await aTrainer.patch(`/api/work/workflows/${bWf.id}`, { meta: { title: 'Hijacked' } })).status).toBe(404)
  expect((await aTrainer.del(`/api/work/workflows/${bWf.id}`)).status).toBe(404)
  expect((await aTrainer.get(`/api/work/workflows/frames/${bShot}`)).status).toBe(404)
  const aMember = await as.api(A.users.member)
  expect((await aMember.post(`/api/work/workflows/${bWf.id}/start`)).status).toBe(404)
  expect((await aMember.get(`/api/work/sessions/${bSession}`)).status).toBe(404)
  const aPm = await as.api(A.users.pm)
  expect((await aPm.get(`/api/work/pm/projects/${bProject.id}`)).status).toBe(404)
  expect((await aPm.post(`/api/work/pm/projects/${bProject.id}/tasks/${bProject.tasks[0].id}/assign`, { assigneeId: A.users.member.id })).status).toBe(404)
  expect((await aAdmin.patch(`/api/work/company/users/${B.users.member.id}`, { companyRole: 'company_admin' })).status).toBe(404)
  expect((await aAdmin.del(`/api/work/company/users/${B.users.member.id}`, { reason: 'Not mine' })).status).toBe(404)
  expect((await aAdmin.del(`/api/work/company/webhooks/${bHook.id}`)).status).toBe(404)
  expect((await aAdmin.get(`/api/work/company/webhooks/${bHook.id}/deliveries`)).status).toBe(404)
  // B's data is untouched.
  expect((await bTrainer.get(`/api/work/workflows/${bWf.id}`)).data.workflow.meta.title).toBe('Company B secret workflow')
  expect((await bAdmin.get('/api/work/company/users')).data.users.find((u) => u.id === B.users.member.id).companyRole).toBe('member')
})
