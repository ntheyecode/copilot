// The invented scenarios as they exist for PERSONAL accounts (the paid edition
// has no companies). Where the same risk exists for a person, the scenario runs
// for real; where the feature is company-only, the edition's refusal is checked.
import { expect } from '@playwright/test'
import { SUPERADMIN } from './personas.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'

export const REFUSE_DRAFTS = { what: 'workflow drafts (the Teach studio)', api: [['GET', '/api/work/workflows'], ['POST', '/api/work/workflows']], pages: ['/work/teach'] }
export const REFUSE_RECORDING = { what: 'recording a demonstration (screenshots of a workflow)', api: [['POST', '/api/work/workflows/frames']], pages: ['/work/teach'] }
export const REFUSE_KEYS = { what: 'company API keys and the integration API', api: [['GET', '/api/work/company/api-keys'], ['POST', '/api/work/company/api-keys'], ['GET', '/api/v1/workflows']] }
export const REFUSE_RUN = { what: 'running a company workflow', api: [['GET', '/api/work/workflows?state=published'], ['POST', '/api/work/workflows/probe/start']], absentText: [['/work', 'Company workflows']] }
export const REFUSE_HOOKS = { what: 'webhooks', api: [['GET', '/api/work/company/webhooks'], ['POST', '/api/work/company/webhooks'], ['GET', '/api/v1/webhooks']] }

const BIG_PLAN = { appContext: 'Spreadsheet app in a browser', overview: 'A long checklist.', steps: Array.from({ length: 100 }, (_, i) => ({ text: `Check row ${i + 1} of the **Expenses** sheet.`, validate: `Row ${i + 1} is checked.`, url: '', commands: [] })) }

// Removed mid-session, for a person: the superadmin disables the account.
export async function soloDisabledMidSession({ as, seed }) {
  const solo = await seed.solo()
  const me = await as.page(solo, { path: '/work' })
  await expect(me.page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  const sa = await as.api(SUPERADMIN)
  expect((await sa.post(`/api/work/admin/users/${solo.id}/disable`, { disabled: true, reason: 'Chargeback under review' })).status).toBe(200)
  const r = await me.api.get('/api/work/sessions')
  expect(r.status).toBe(401)
  await me.page.goto('/work/start')
  await expect(me.page).toHaveURL(/\/workcopilot/)
  const again = await (await as.anon()).post('/api/work/login', { username: solo.username, password: solo.password })
  expect(again.status, 'a disabled account cannot sign in').toBe(403)
  expect((await sa.post(`/api/work/admin/users/${solo.id}/disable`, { disabled: false, reason: 'Review closed' })).status).toBe(200)
  expect((await (await as.anon()).post('/api/work/login', { username: solo.username, password: solo.password })).status, 'and can again once re-enabled').toBe(200)
}

// A huge plan, for a person: the AI returns 100 steps and the console runs them.
export async function soloHugePlan({ as, seed, server }) {
  await server.ctl('ai.script', { rules: [{ kind: 'plan', content: BIG_PLAN }, { kind: 'harden', content: BIG_PLAN }] })
  const { page, api } = await as.page(await seed.solo(), { path: null, syntheticScreen: true })
  const start = new StartTaskPage(page)
  await start.open()
  const id = await start.startTask({ title: 'Hundred checks', goal: 'Go through the expense rows one by one' })
  await page.locator('section.gv-step').first().waitFor({ timeout: 30_000 })
  await expect(page.getByText(/^Step 1 of 100$/).filter({ visible: true }).first()).toBeVisible()
  const s = await api.get(`/api/work/sessions/${id}`)
  expect(((s.data.session || s.data).steps || []).length).toBe(100)
}

// Rapid double click, for a person: "Begin guiding" starts ONE session.
export async function soloDoubleBegin({ as, seed }) {
  const { page, api } = await as.page(await seed.solo(), { path: null, syntheticScreen: true })
  const before = ((await api.get('/api/work/sessions')).data.sessions || []).length
  const start = new StartTaskPage(page)
  await start.open()
  await page.locator('#wd-name').fill('Double click')
  await page.locator('#wd-goal').fill('Build a monthly expense summary in my spreadsheet')
  await start.next('Continue')
  await start.next('Looks right, continue')
  await page.getByRole('button', { name: /Quick/ }).first().click()
  for (let i = 0; i < 8 && !(await page.locator('.wd-wz-begin').isVisible()); i++) {
    const option = page.getByRole('button', { name: 'Excel', exact: true })
    if (await option.isVisible()) await option.click()
    const next = page.getByRole('button', { name: /^(Next|Review|Continue|Skip)$/ }).last()
    if (await next.isVisible()) await next.click()
    await page.waitForTimeout(150)
  }
  await page.locator('.wd-wz-begin').dblclick()
  await page.waitForURL(/\/work\/session\/[^/]+$/)
  await page.waitForTimeout(1500)
  const after = ((await api.get('/api/work/sessions')).data.sessions || []).length
  expect(after - before, 'one double click, one session').toBe(1)
}

// Back in a wizard, for a person: the Start a task wizard keeps what was typed,
// and browser Back leaves it without creating anything.
export async function soloWizardBack({ as, seed }) {
  const { page, api } = await as.page(await seed.solo(), { path: '/work' })
  const before = ((await api.get('/api/work/sessions')).data.sessions || []).length
  const start = new StartTaskPage(page)
  await start.open()
  await page.locator('#wd-name').fill('Back button task')
  await page.locator('#wd-goal').fill('Reconcile the October invoices')
  await start.next('Continue')
  await page.getByRole('button', { name: 'Back', exact: true }).first().click()
  await expect(page.locator('#wd-name')).toHaveValue('Back button task')
  await expect(page.locator('#wd-goal')).toHaveValue('Reconcile the October invoices')
  await page.goBack()
  await expect(page).toHaveURL(/\/work$/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  expect(((await api.get('/api/work/sessions')).data.sessions || []).length, 'nothing was created').toBe(before)
}

// Cross-tenant, for people: one personal account never reads or changes another's.
export async function soloCrossAccount({ as, seed }) {
  const bUser = await seed.solo()
  const b = await as.api(bUser)
  const s = await b.post('/api/work/sessions', { title: 'B private task', goal: 'Build the monthly expense summary' })
  expect(s.status).toBe(200)
  const id = s.data.session.id
  expect((await b.post(`/api/work/sessions/${id}/plan`, { goal: 'Build the monthly expense summary' })).status).toBe(200)
  const a = await as.api(await seed.solo())
  for (const [method, path] of [['GET', `/api/work/sessions/${id}`], ['GET', `/api/work/sessions/${id}/report.txt`], ['GET', `/api/work/sessions/${id}/report.pdf`], ['GET', `/api/work/sessions/${id}/audit.log`], ['POST', `/api/work/sessions/${id}/step`], ['POST', `/api/work/sessions/${id}/finalize`], ['DELETE', `/api/work/sessions/${id}`]]) {
    // A delete needs a reason (audited); give one so the ownership rule is what answers.
    const r = await a.ctx.fetch(path, { method, data: method === 'GET' ? undefined : { index: 0, status: 'done', reason: 'Cleaning up my list' }, failOnStatusCode: false })
    expect(r.status(), `${method} ${path} by another account`).toBe(404)
  }
  expect(((await a.get('/api/work/sessions')).data.sessions || []).map((x) => x.id)).not.toContain(id)
  const still = await b.get(`/api/work/sessions/${id}`)
  expect(still.status).toBe(200)
  expect((still.data.session || still.data).title).toBe('B private task')
}
