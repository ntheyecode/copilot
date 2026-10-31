// Who floats the steps from the browser (owner rule, 2026-10-31): individuals
// keep the web floater ("Float on top"), it is a key part of their product;
// company members float through the desktop software only, so in the browser
// they get a link to the desktop app instead of any web floating window.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { StartTaskPage } from '../pages/StartTaskPage.mjs'
import { GuidingPage } from '../pages/GuidingPage.mjs'

async function openSession(as, user) {
  const { page } = await as.page(user, { path: null, syntheticScreen: true })
  const start = new StartTaskPage(page)
  await start.open()
  await start.startTask({ title: 'Monthly expense summary', goal: 'Build a monthly expense summary in my spreadsheet' })
  await new GuidingPage(page).waitForPlan()
  return page
}

test('individuals get the web floater; company members get the desktop app instead', async ({ as, seed, edition, server }) => {
  const caps = capsOf(edition)
  await server.ctl('ai.reset')
  if (caps.has('solo_signup')) {
    await test.step('individual', async () => {
      const page = await openSession(as, await seed.solo())
      await expect(page.getByRole('button', { name: /Float on top|Pop out/ })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Float with the desktop app' })).toHaveCount(0)
    })
  }
  if (caps.has('saas_companies')) {
    await test.step('company member', async () => {
      const page = await openSession(as, (await seed.company({ personas: ['member'] })).users.member)
      const desktop = page.getByRole('link', { name: 'Float with the desktop app' })
      await expect(desktop).toBeVisible()
      await expect(desktop).toHaveAttribute('href', '/api/work/desktop-setup.exe')
      await expect(page.getByRole('button', { name: /Float on top|Pop out/ }), 'no web floating window for company members').toHaveCount(0)
    })
  }
})
