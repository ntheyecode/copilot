// No skips: a test whose flow an edition does not offer checks, in that
// edition, that the flow is REFUSED and HIDDEN (the edition's own contract),
// instead of skipping. Every test therefore runs a real check in every edition.
import { expect, test } from '@playwright/test'
import { capsOf } from './editions.mjs'

export const hasCompanies = (edition) => capsOf(edition).has('saas_companies')
export const hasSolo = (edition) => capsOf(edition).has('solo_signup')

function note(text) { try { test.info().annotations.push({ type: 'edition', description: text }) } catch { /* outside a test */ } }

// Company feature on an edition without company tenants: a personal account
// gets 403 { companiesDisabled } from every listed API route, and every listed
// page sends it back to /work.
export async function companyFeatureRefused({ as, seed, edition }, { api = [], pages = [], absentText = [], what = 'this company feature' }) {
  note(`${edition} has no company tenants: checked that ${what} is refused by the API and its pages are not reachable.`)
  const solo = await seed.solo()
  const client = await as.api(solo)
  for (const [method, path] of api) {
    const r = await client.ctx.fetch(path, { method, data: method === 'GET' ? undefined : {}, failOnStatusCode: false })
    const body = (await r.json().catch(() => ({}))) || {}
    expect([r.status(), body.companiesDisabled], `${method} ${path}`).toEqual([403, true])
  }
  if (pages.length || absentText.length) {
    const { page } = await as.page(solo, { path: null })
    for (const path of pages) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(new URL(page.url()).pathname, `${path} is not reachable without companies`).toBe('/work')
    }
    for (const [path, text] of absentText) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(text, { exact: false }), `${path} shows no "${text}"`).toHaveCount(0)
    }
  }
}

// Personal-account flow on an edition without individuals: nobody can create
// one (API and login page), and personal plans cannot be bought.
export async function personalAccountsRefused({ as, seed, edition }, { what = 'personal accounts' } = {}) {
  note(`${edition} has no personal accounts: checked that ${what} cannot be created or bought.`)
  const anon = await as.anon()
  const p = seed.prefix()
  for (const path of ['/api/work/signup', '/api/work/onboarding/signup']) {
    const r = await anon.post(path, { username: `${p}_x`, password: 'Signup-Pass-123!', email: `${p}@e2e-mail.net`, acceptTerms: true })
    expect([r.status, r.data && r.data.signupDisabled], path).toEqual([403, true])
  }
  const r = await anon.post('/api/work/checkout', { plan: 'basic' })
  expect([r.status, r.data && r.data.individualPlansDisabled], 'personal checkout').toEqual([403, true])
  const { context } = await as.context()
  const page = await context.newPage()
  await page.goto('/workcopilot/login')
  await page.waitForLoadState('networkidle')
  expect(await page.locator('a[href*="/workcopilot/signup"]').count(), 'no way to create an account on the login page').toBe(0)
  await context.close()
}

// A company test that never skips: with company tenants it runs `fn`; without
// them it runs `otherwise`, either a refusal spec for companyFeatureRefused or
// a function (that edition's own version of the scenario).
export function companyTest(test, title, otherwise, fn) {
  test(title, async ({ as, seed, edition, server, browser }, testInfo) => {
    const fx = { as, seed, edition, server, browser }
    if (hasCompanies(edition)) return fn(fx, testInfo)
    if (typeof otherwise === 'function') return otherwise(fx, testInfo)
    return companyFeatureRefused(fx, otherwise)
  })
}
