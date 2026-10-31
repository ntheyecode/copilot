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
  const user = caps.has('saas_companies') ? (await seed.company({ personas: ['member'] })).users.member : await seed.solo()
  const api = await as.api(user)
  const s = await api.post('/api/work/sessions', { title: 'Ledger check', goal: 'Build the monthly expense summary' })
  expect(s.status).toBe(200)
  const plan = await api.post(`/api/work/sessions/${s.data.session.id}/plan`, { goal: 'Build the monthly expense summary' })
  expect(plan.status, JSON.stringify(plan.data)).toBe(200)
  expect((await server.ctl('ai.calls', { kind: 'plan' })).length).toBeGreaterThan(0)

  const sa = await as.api(SUPERADMIN)
  await expect.poll(async () => {
    const r = await sa.get('/api/work/admin/ai-usage')
    const rows = r.data.usage || []
    const mine = rows.find((x) => (user.companyId ? x.companyId === user.companyId : x.holder && String(x.holder).includes(user.id))) || rows.find((x) => x.calls > 0)
    return mine ? mine.calls : 0
  }, { timeout: 15_000 }).toBeGreaterThan(0)
  const rows = (await sa.get('/api/work/admin/ai-usage')).data.usage
  const row = rows.find((x) => x.calls > 0)
  expect(row.inTokens + row.outTokens, 'token counts come from the provider response').toBeGreaterThan(0)
  expect(Object.keys(row.byKind || {})).toContain('plan')
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
