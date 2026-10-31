// Company admin: grant the trainer role, API keys (create in the console, scope
// enforced on /api/v1, revoke), a signed webhook delivery to the local receiver,
// and a launch link an employee opens straight into a guided workflow.
import crypto from 'node:crypto'
import { test, expect } from '../support/fixtures.mjs'
import { needCap } from '../support/editions.mjs'
import { CompanyAdmin } from '../pages/CompanyAdmin.mjs'
import { makeWorkflow } from '../support/workflows.mjs'
import { FAKE_HOOK_HOST } from '../support/boot/net-fakes.mjs'

test.beforeEach(({ edition }) => needCap(test, edition, 'saas_companies'))

const bearer = (secret) => ({ authorization: `Bearer ${secret}` })

test('the company admin grants the trainer role and it opens the Teach studio', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['admin', 'member'] })
  const { page, api } = await as.page(co.users.admin, { path: null })
  const console_ = new CompanyAdmin(page)
  await console_.open()
  await console_.section('Team')
  const row = console_.personRow(co.users.member.username)
  // The box reflects the saved state: it ticks once the server confirms.
  await row.getByLabel('Trainer').click()
  await expect(row.getByLabel('Trainer')).toBeChecked()
  await expect.poll(async () => {
    const r = await api.get('/api/work/company/users')
    const u = (r.data.users || r.data).find((x) => x.id === co.users.member.id)
    return u && u.grants
  }).toEqual(['trainer'])
  // The member now reaches the Teach studio (fresh sign-in picks up the grant).
  const m = await as.page(co.users.member, { path: '/work/teach' })
  await expect(m.page.getByRole('heading', { level: 1, name: 'Teach a workflow' })).toBeVisible()
})

test('API keys: created in the console, scope enforced on /api/v1, revoked', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['admin', 'trainer'] })
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Key scoped workflow' })
  const { page, api } = await as.page(co.users.admin, { path: null })
  const console_ = new CompanyAdmin(page)
  await console_.open()
  await console_.section('API & webhooks', 'API keys and webhooks')
  const secret = await console_.createApiKey({ name: 'Reporting sync', scopes: ['Read workflows'] })
  expect(secret).toMatch(/^wcp_live_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/)

  const anon = await as.anon()
  const list = await anon.get('/api/v1/workflows', bearer(secret))
  expect(list.status).toBe(200)
  expect(list.data.workflows.map((w) => w.id)).toContain(wf.id)
  expect((await anon.get(`/api/v1/workflows/${wf.id}`, bearer(secret))).status).toBe(200)
  // Scopes it was not given are refused with the scope named.
  const inc = await anon.get('/api/v1/incidents', bearer(secret))
  expect(inc.status).toBe(403)
  expect(inc.data.code).toBe('INSUFFICIENT_SCOPE')
  expect(inc.data.error).toContain('incidents:read')
  expect((await anon.post(`/api/v1/workflows/${wf.id}/launch`, { employee: { id: co.users.trainer.id } }, bearer(secret))).data.code).toBe('INSUFFICIENT_SCOPE')
  expect((await anon.post('/api/v1/brain/query', { q: 'refund policy' }, bearer(secret))).data.code).toBe('INSUFFICIENT_SCOPE')
  // No key, a malformed key.
  expect((await anon.get('/api/v1/workflows')).data.code).toBe('MISSING_KEY')
  expect((await anon.get('/api/v1/workflows', bearer('wcp_live_nothing'))).data.code).toBe('INVALID_KEY')

  // Revoke from the console list; the key stops working at once.
  const keys = (await api.get('/api/work/company/api-keys')).data.keys
  const key = keys.find((k) => k.name === 'Reporting sync')
  // Key rows are collapsed; open it, then confirm the revoke inline.
  await page.locator('button[aria-expanded]').filter({ hasText: 'Reporting sync' }).first().click()
  await page.getByRole('button', { name: 'Revoke', exact: true }).first().click()
  await page.getByRole('button', { name: 'Revoke key' }).click()
  await expect(page.getByText('Reporting sync revoked').first()).toBeVisible()
  const after = await anon.get('/api/v1/workflows', bearer(secret))
  expect(after.status).toBe(401)
  expect(after.data.code).toBe('KEY_REVOKED')
  expect((await api.get('/api/work/company/api-keys')).data.keys.find((k) => k.id === key.id).status).toBe('revoked')
})

test('a webhook endpoint receives a signed workflow.published delivery', async ({ as, seed, server }) => {
  const co = await seed.company({ personas: ['admin', 'trainer'] })
  const admin = await as.api(co.users.admin)
  await server.ctl('hooks.clear')
  const url = `https://${FAKE_HOOK_HOST}/workcopilot/${seed.prefix()}`
  const created = await admin.post('/api/work/company/webhooks', { url, events: ['workflow.published'], description: 'E2E receiver' })
  expect(created.status, JSON.stringify(created.data)).toBe(201)
  const { endpoint, secret } = created.data
  expect(secret).toMatch(/^whsec_/)

  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Hooked workflow' })

  await expect.poll(async () => (await server.ctl('hooks.deliveries')).filter((d) => d.path === new URL(url).pathname).length, { timeout: 20_000 }).toBeGreaterThan(0)
  const d = (await server.ctl('hooks.deliveries')).find((x) => x.path === new URL(url).pathname)
  const body = JSON.parse(d.body)
  expect(d.headers['x-workcopilot-event']).toBe('workflow.published')
  expect(body.type).toBe('workflow.published')
  expect(body.data.workflow ? body.data.workflow.id : body.data.id).toBe(wf.id)
  // The signature verifies with the endpoint secret (the receiver's recipe).
  const sig = Object.fromEntries(d.headers['x-workcopilot-signature'].split(',').map((p) => p.split('=')))
  const expected = crypto.createHmac('sha256', secret).update(`${sig.t}.${d.body}`).digest('hex')
  expect(sig.v1).toBe(expected)

  const deliveries = await admin.get(`/api/work/company/webhooks/${endpoint.id}/deliveries`)
  expect(deliveries.data.deliveries.some((x) => x.event === 'workflow.published' && x.status === 'delivered')).toBe(true)
})

test('a launch link opens the workflow for the named employee, once', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['admin', 'trainer', 'member', 'worker'] })
  const trainer = await as.api(co.users.trainer)
  const wf = await makeWorkflow(trainer, { title: 'Launch link workflow' })
  const admin = await as.api(co.users.admin)
  const key = await admin.post('/api/work/company/api-keys', { name: 'Launcher', scopes: ['workflows:run'], expiresInDays: 30 })
  expect(key.status).toBe(201)
  const anon = await as.anon()
  const link = await anon.post(`/api/v1/workflows/${wf.id}/launch`, { employee: { id: co.users.member.id } }, bearer(key.data.secret))
  expect(link.status).toBe(201)
  const token = link.data.url.split('#')[1]

  // Someone else opening it is refused and the link is not used up.
  const other = await as.page(co.users.worker, { path: `/work/launch#${token}` })
  await expect(other.page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible()
  // The named employee lands in the guided session.
  const emp = await as.page(co.users.member, { path: `/work/launch#${token}` })
  await emp.page.waitForURL(/\/work\/session\/[^/]+$/, { timeout: 20_000 })
  await expect(emp.page.locator('section.gv-step').first()).toContainText('Credit notes')
  // Used once: a second redeem is refused.
  const again = await emp.api.post('/api/work/launch/redeem', { token })
  expect(again.status).toBe(410)
  expect(again.data.code).toBe('LAUNCH_USED')
})
