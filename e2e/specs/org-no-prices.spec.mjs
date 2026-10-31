// admireveda.com publishes no prices (owner, 2026-10-31: "No pricing in
// admireveda, contact sales, that's it"). On an edition without personal plans:
// no public page shows a rate, the page shell's structured data carries no
// price, there is no Pricing link, and /workcopilot/pricing goes to contact.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'

const PRICE = /(\$|US\$|€|£|₹)\s?\d|\d\s?(\$|€|£|₹)|per user per month|USD\b/i
const PAGES = ['/', '/workcopilot/use-cases', '/workcopilot/how-it-works', '/workcopilot/security', '/workcopilot/faq', '/workcopilot/enterprise', '/workcopilot/company-brain', '/workcopilot/contact', '/workcopilot/fields', '/workcopilot/benchmark']

test('the organization site shows no price anywhere and sends pricing to sales', async ({ as, edition }) => {
  const { context } = await as.context()
  const page = await context.newPage()
  if (capsOf(edition).has('individual_plans')) {
    // Personal plans are sold here: the pricing page shows them (the rule is for organizations).
    await page.goto('/workcopilot/pricing')
    await expect(page).toHaveURL(/\/workcopilot\/pricing/)
    await context.close()
    return
  }
  for (const path of PAGES) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    const hit = text.match(PRICE)
    expect(hit, `${path} shows "${hit && hit[0]}"`).toBeNull()
    expect(await page.locator('a[href="/workcopilot/pricing"]').count(), `${path} links to a pricing page`).toBe(0)
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')
    expect(ld, `${path} structured data carries a price`).not.toMatch(/"price"\s*:|"priceCurrency"/)
  }
  await page.goto('/workcopilot/pricing')
  await expect(page).toHaveURL(/\/workcopilot\/contact$/)
  await context.close()
})
