// The public "Try it on your task, live" widget, per edition (owner rules,
// 2026-10-31). Corporate (no personal plans): the widget never shows a plan, a
// price or a pricing link, the AI is never told about plans, and it ends in
// "talk to us" with the contact form filled in. Individuals: it recommends a
// plan and leads to pricing. Either way the visitor sees three detailed steps.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'

const TASK = 'Build a monthly expense summary in my spreadsheet'
const LEAD = { id: null, first: 'Dana', last: 'Lee', email: 'dana.lee@e2e-mail.net', phone: '5550100', country: 'US', company: 'E2E Corp' }

test('the live widget shows a three-step taste and ends where this edition sells', async ({ as, edition, server }) => {
  await server.ctl('ai.reset')
  const { context } = await as.context()
  // The lead was given earlier this session, so the widget goes straight to the check.
  await context.addInitScript((lead) => { try { sessionStorage.setItem('wc_lv_lead_v1', JSON.stringify(lead)) } catch { /* ignore */ } }, LEAD)
  const page = await context.newPage()
  // The individuals edition runs its own site (LinkNotes): the widget lives on its home page.
  await page.goto(capsOf(edition).has('individual_site') ? '/' : '/workcopilot/demo')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('wc:open-validate')))
  await page.locator('.lv-root textarea').fill(TASK)
  await page.getByRole('button', { name: /Watch it plan my task/ }).click()
  const cta = page.locator('.lv-cta')
  await expect(cta).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.lv-step')).toHaveCount(3)

  // The console is LIGHT by default; the one button in the dialog head switches
  // it to dark (aria-pressed) and the choice is remembered per browser.
  const root = page.locator('.lv-root')
  const themeBtn = page.getByRole('button', { name: 'Dark console' })
  await expect(themeBtn).toHaveAttribute('aria-pressed', 'false')
  await expect(root).not.toHaveClass(/lv-con-dark/)
  await themeBtn.click()
  await expect(themeBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(root).toHaveClass(/lv-con-dark/)
  expect(await page.evaluate(() => localStorage.getItem('wc_lv_con_theme_v1'))).toBe('dark')
  await themeBtn.click()
  await expect(root).not.toHaveClass(/lv-con-dark/)
  // The console's title bar names the product through the catalog (an edition may rename it).
  await expect(page.locator('.lv-con-head b')).not.toHaveText('')

  const cov = await server.ctl('ai.calls', { kind: 'coverage' })
  expect(cov.length, 'the widget asked the AI').toBeGreaterThan(0)

  if (!capsOf(edition).has('individual_plans')) {
    expect(cov.every((c) => !c.plansListed && c.orgOnly), 'the corporate prompt carries no plans').toBe(true)
    await expect(cta.locator('.lv-plan')).toHaveCount(0)
    await expect(cta).not.toContainText('$')
    await expect(page.locator('.lv-root a[href*="pricing"]')).toHaveCount(0)
    await expect(page.locator('.lv-root').getByRole('button', { name: /^Start with |Compare all plans/ })).toHaveCount(0)
    await cta.getByRole('link', { name: 'Talk to us about your team' }).click()
    await expect(page).toHaveURL(/\/workcopilot\/contact$/)
    await expect(page.locator('#wct-message')).toHaveValue(TASK)
    await expect(page.locator('input[name="email"]')).toHaveValue(LEAD.email)
  } else {
    expect(cov.every((c) => c.plansListed), 'the individuals prompt lists the plans').toBe(true)
    await expect(cta.locator('.lv-plan')).toBeVisible()
    await expect(cta.getByRole('button', { name: /^Start with / })).toBeVisible()
  }
  await context.close()
})
