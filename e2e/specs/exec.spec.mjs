// The executive surface: productivity dashboard with project and performer
// drill-downs, and the executive-only Company Brain export behind a passphrase.
import { test, expect } from '../support/fixtures.mjs'
import { needCap } from '../support/editions.mjs'

test.beforeEach(({ edition }) => needCap(test, edition, 'saas_companies'))

test('the executive dashboard shows productivity with project and performer drill-downs', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['exec', 'pm', 'worker'] })
  const pm = await as.api(co.users.pm)
  const project = (await pm.post('/api/work/pm/projects', { goal: 'Close the quarter books for the finance team', name: 'Quarter close' })).data.project
  await pm.post(`/api/work/pm/projects/${project.id}/tasks/${project.tasks[0].id}/assign`, { assigneeId: co.users.worker.id })

  const { page, api } = await as.page(co.users.exec, { path: '/work' })
  await page.getByRole('link', { name: 'Executive dashboard' }).click()
  await expect(page).toHaveURL(/\/work\/exec$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Productivity' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Projects' }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Top performers' }).first()).toBeVisible()
  await expect(page.getByText('Quarter close').first()).toBeVisible()

  const ov = await api.get('/api/work/exec/overview?days=30')
  expect(ov.status).toBe(200)
  expect(ov.data.projects.total).toBe(1)
  expect(Object.keys(ov.data)).toEqual(expect.arrayContaining(['productivity', 'projects', 'performers']))
  const csv = await api.get('/api/work/exec/productivity.csv')
  expect(csv.status).toBe(200)
})

test('only an executive downloads the Company Brain, with the export passphrase', async ({ as, seed }) => {
  const co = await seed.company({ personas: ['exec', 'admin', 'pm'] })
  const { page, api } = await as.page(co.users.exec, { path: '/work/exec' })
  await expect(page.getByRole('heading', { name: 'Company Brain' })).toBeVisible()

  // No passphrase yet: the server refuses with needKey.
  const early = await api.post('/api/work/brain/export')
  expect(early.status).toBe(409)
  expect(early.data.needKey).toBe(true)

  // Too short is refused; 10+ characters is saved.
  const short = await api.post('/api/work/brain/export/key', { passphrase: 'short' })
  expect(short.status).toBe(400)
  await page.getByPlaceholder('Choose a strong passphrase').fill('correct horse battery staple')
  await page.getByRole('button', { name: 'Save passphrase' }).click()
  await expect(page.getByText('Export passphrase saved.').or(page.getByText('Your export passphrase is set.')).first()).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Company Brain' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^workcopilot-export-.+\.wcpx$/)
  const bytes = await file.createReadStream().then((s) => new Promise((res) => { let n = 0; s.on('data', (c) => { n += c.length }); s.on('end', () => res(n)) }))
  expect(bytes).toBeGreaterThan(100)

  // The company admin sees the dashboard but not the export; others neither.
  const admin = await as.api(co.users.admin)
  expect((await admin.get('/api/work/exec/overview')).status).toBe(200)
  expect((await admin.post('/api/work/brain/export')).status).toBe(403)
  const pm = await as.api(co.users.pm)
  expect((await pm.get('/api/work/exec/overview')).status).toBe(403)
  expect((await pm.post('/api/work/brain/export')).status).toBe(403)
  const adminUi = await as.page(co.users.admin, { path: '/work/exec' })
  await expect(adminUi.page.getByRole('heading', { level: 1, name: 'Productivity' })).toBeVisible()
  await expect(adminUi.page.getByRole('heading', { name: 'Company Brain' })).toHaveCount(0)
})
