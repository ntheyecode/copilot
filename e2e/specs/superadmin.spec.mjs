// Superadmin: the companies and users consoles, and the AI usage ledger that
// books each provider call to the company (or solo account) that made it.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { LegalGate } from '../pages/LegalGate.mjs'

test('the superadmin finds companies and users in the console', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  const co = caps.has('saas_companies') ? await seed.company({ personas: ['admin', 'member'] }) : null
  const solo = caps.has('solo_signup') ? await seed.solo() : null
  const { page, api } = await as.page(SUPERADMIN, { path: '/work/admin' })
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  if (await new LegalGate(page).dialog().isVisible()) await new LegalGate(page).accept()

  if (co) {
    await page.locator('.wka-nav-item', { hasText: 'Companies' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Companies' })).toBeVisible()
    await expect(page.getByText(co.name).first()).toBeVisible()
    const detail = await api.get(`/api/work/admin/companies/${co.companyId}`)
    expect(detail.status).toBe(200)
    expect(detail.data.users.map((u) => u.username)).toEqual(expect.arrayContaining([co.users.admin.username, co.users.member.username]))
  }
  await page.locator('.wka-nav-item', { hasText: 'Users' }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible()
  const who = solo ? solo.username : co.users.member.username
  const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first()
  if (await search.count()) await search.fill(who)
  await expect(page.getByText(who).first()).toBeVisible()
})

test('every AI call is booked to whoever made it in the usage ledger', async ({ as, seed, edition, server }) => {
  const caps = capsOf(edition)
  let user, holder
  if (caps.has('saas_companies')) { const co = await seed.company({ personas: ['member'] }); user = co.users.member; holder = `c:${co.companyId}` }
  else { user = await seed.solo(); holder = `u:${user.id}` }
  const api = await as.api(user)
  const s = await api.post('/api/work/sessions', { title: 'Ledger check', goal: 'Build the monthly expense summary' })
  expect(s.status).toBe(200)
  const plan = await api.post(`/api/work/sessions/${s.data.session.id}/plan`, { goal: 'Build the monthly expense summary' })
  expect(plan.status, JSON.stringify(plan.data)).toBe(200)
  expect((await server.ctl('ai.calls', { kind: 'plan' })).length).toBeGreaterThan(0)

  // This test's own holder (company or solo account), never another test's row.
  const sa = await as.api(SUPERADMIN)
  const mine = async () => ((await sa.get('/api/work/admin/ai-usage')).data.usage || []).find((x) => x.holder === holder)
  await expect.poll(async () => ((await mine()) || {}).calls || 0, { timeout: 15_000 }).toBeGreaterThan(0)
  const row = await mine()
  expect(row.inTokens + row.outTokens, 'token counts come from the provider response').toBeGreaterThan(0)
  // Booked against the model that actually answered (the provider saw it), not
  // the one configured: planning runs on the stronger model by design.
  const ran = (await server.ctl('ai.calls', { kind: 'plan' })).at(-1).model
  expect((row.byModel || []).map((m) => m.model), 'booked against the model that ran').toContain(ran)
})

test('superadmin routes refuse everyone else', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  const users = []
  if (caps.has('saas_companies')) { const co = await seed.company({ personas: ['admin', 'exec'] }); users.push(co.users.admin, co.users.exec) }
  if (caps.has('solo_signup')) users.push(await seed.solo())
  for (const u of users) {
    const api = await as.api(u)
    for (const path of ['/api/work/admin/companies', '/api/work/admin/ai-usage']) {
      const r = await api.get(path)
      expect(r.status, `${u.username} ${path}`).toBe(403)
    }
  }
})
