// The Company Brain page (/workcopilot/company-brain) and the home page's
// Company Brain section, per edition:
//   with companies (all, saas)   the page renders with its hero, the home
//                                section links to it, the footer links to it,
//                                no price anywhere on it, no sideways scroll
//                                at 1280 / 768 / 375;
//   without companies (paid)     the route is not part of the individuals site
//                                (it redirects, exactly like /workcopilot/enterprise)
//                                and the home page carries no link to it.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'

const PATH = '/workcopilot/company-brain'
const PRICE = /(\$|US\$|€|£|₹)\s?\d|\d\s?(\$|€|£|₹)|per user per month|USD\b/i
const WIDTHS = [1280, 768, 375]

async function settle(page, path) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}

test('the Company Brain page and its home section follow the edition', async ({ as, edition }) => {
  test.setTimeout(180_000)
  const { context } = await as.context()
  const page = await context.newPage()
  const companies = capsOf(edition).has('saas_companies') || capsOf(edition).has('single_company')

  if (!companies) {
    await settle(page, PATH)
    expect(new URL(page.url()).pathname, `${PATH} still opens on ${edition}`).not.toMatch(/company-brain/)
    await settle(page, '/')
    expect(await page.locator(`a[href="${PATH}"]`).count(), 'the individuals home links to the Company Brain page').toBe(0)
    await context.close()
    return
  }

  // The page: hero, every section, the sales CTA, no price, no pricing link.
  await settle(page, PATH)
  await expect(page).toHaveURL(/\/workcopilot\/company-brain$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Guidance that knows')
  for (const id of ['learn', 'use', 'how', 'control', 'leaders']) await expect(page.locator(`section#${id}`)).toBeVisible()
  await expect(page.locator('.wcb-final a[href="/workcopilot/contact"]')).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text.match(PRICE), 'the Company Brain page shows a price').toBeNull()
  // The page itself never links to pricing; the shared chrome shows a Pricing
  // link only where personal plans are sold (the `all` edition), by design.
  if (!capsOf(edition).has('individual_plans')) expect(await page.locator('a[href="/workcopilot/pricing"]').count()).toBe(0)
  await expect(page).toHaveTitle(/Company Brain/)

  // Render gate: no sideways scroll at desktop, tablet and phone widths.
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(150)
    const m = await page.evaluate(() => ({ scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth }))
    expect(m.scroll, `${PATH} at ${width}px is ${m.scroll}px wide (scrolls sideways)`).toBeLessThanOrEqual(m.inner + 1)
  }
  await page.setViewportSize({ width: 1280, height: 800 })

  // The home section links to the page; so does the footer.
  await settle(page, '/')
  const section = page.locator('section#company-brain')
  await expect(section).toBeVisible()
  await expect(section.locator(`a[href="${PATH}"]`)).toBeVisible()
  await expect(page.locator(`footer a[href="${PATH}"]`)).toBeVisible()
  await context.close()
})
