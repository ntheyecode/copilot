// Downloads live in the signed-in dashboard (owner, 2026-10-31): the public
// site offers no installer and the installer route refuses a visitor who is
// not signed in. The MSI (silent network install) is for company admins only.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'

test('no installer from the public site; the installer needs a sign-in and the MSI a company admin', async ({ as, seed, edition }) => {
  const anon = await as.anon()
  for (const p of ['/api/work/desktop-setup.exe', '/api/work/app/desktop', '/api/work/app/msi']) {
    // 401 (sign in first), or 403 where this edition has no such route at all.
    expect([401, 403], `${p} refuses a visitor`).toContain((await anon.get(p)).status)
  }
  const { context } = await as.context()
  const page = await context.newPage()
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(await page.locator('a[href*="desktop-setup"], a[href*="/api/work/app/"], a[href$=".exe"], a[href$=".msi"]').count(), 'no download link on the public home page').toBe(0)
  await context.close()
  if (capsOf(edition).has('saas_companies')) {
    const co = await seed.company({ personas: ['admin', 'member'] })
    const member = await as.api(co.users.member)
    expect((await member.get('/api/work/app/msi')).status, 'the MSI is for company admins').toBe(403)
    const admin = await as.api(co.users.admin)
    expect([200, 404], 'a company admin may fetch the MSI (404 only when no build is published here)').toContain((await admin.get('/api/work/app/msi')).status)
  }
})
