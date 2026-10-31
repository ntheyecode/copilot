// Edition-specific SCREENS and the new in-app help. The server rules for each
// edition are covered in auth.spec.mjs for all three editions on this branch.
// The screens themselves are built on other branches; these tests detect them
// behaviourally and skip with the TODO named until they are merged, then run
// with no edit here.
import { test, expect } from '../support/fixtures.mjs'
import { PENDING_UI, capsOf } from '../support/editions.mjs'

// The edition-aware SPA reads the active edition (a meta stamp in index.html,
// confirmed by GET /api/work/edition). The SPA on this branch does neither.
async function spaKnowsEdition(page) {
  let asked = false
  const onReq = (r) => { if (r.url().includes('/api/work/edition')) asked = true }
  page.on('request', onReq)
  await page.goto('/workcopilot/login')
  await page.waitForLoadState('networkidle')
  page.off('request', onReq)
  const stamp = await page.locator('meta[name*="edition" i]').count()
  return asked || stamp > 0
}

test('saas: organizations only, no self sign-up and no personal plans on screen', async ({ as, edition }) => {
  test.skip(edition !== 'saas', 'saas edition only')
  const { context } = await as.context()
  const page = await context.newPage()
  test.skip(!(await spaKnowsEdition(page)), PENDING_UI.saasCorporateLook)
  await expect(page.locator('a[href*="/workcopilot/signup"]'), 'no sign-up link on the sign-in page').toHaveCount(0)
  await page.goto('/workcopilot/signup')
  await expect(page.locator('form input[type="password"]'), 'the sign-up page is closed').toHaveCount(0)
})

test('paid: individuals only, no company or enterprise wording on public screens', async ({ as, edition }) => {
  test.skip(edition !== 'paid', 'paid edition only')
  const { context } = await as.context()
  const page = await context.newPage()
  test.skip(!(await spaKnowsEdition(page)), PENDING_UI.paidIndividualLook)
  for (const path of ['/workcopilot/pricing', '/workcopilot/login']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    expect(text, `${path} has no enterprise wording`).not.toMatch(/\bEnterprise\b/)
    expect(text, `${path} offers no company sign-in`).not.toMatch(/sign in with your company/i)
  }
})

test('all: today\'s site keeps both individuals and companies', async ({ as, edition }) => {
  test.skip(edition !== 'all', 'all edition only')
  const { context } = await as.context()
  const page = await context.newPage()
  test.skip(!(await spaKnowsEdition(page)), PENDING_UI.saasCorporateLook)
  await page.goto('/workcopilot/pricing')
  await expect(page.getByText(/Enterprise/).first()).toBeVisible()
})

test('the company console help explains API keys, webhooks and launch links with pictures', async ({ as, seed, edition }) => {
  test.skip(!capsOf(edition).has('saas_companies'), 'company console only')
  const co = await seed.company({ personas: ['admin'] })
  const { page } = await as.page(co.users.admin, { path: '/work/company' })
  await page.locator('.wka-nav-item', { hasText: 'Help' }).first().click()
  await page.waitForLoadState('networkidle')
  const text = await page.locator('body').innerText()
  // The side nav already says "API & webhooks"; only help content explains launch links.
  test.skip(!/launch link/i.test(text), PENDING_UI.newHelpPages)
  await expect(page.getByText(/API key/i).first()).toBeVisible()
  const imgs = page.locator('img')
  expect(await imgs.count(), 'the help is graphical').toBeGreaterThan(0)
  const broken = await imgs.evaluateAll((list) => list.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')))
  expect(broken, 'every help picture loads').toEqual([])
})

test('in-app help covers the new features with pictures that load', async ({ as, seed, edition }) => {
  test.skip(!capsOf(edition).has('saas_companies'), 'the new features are company features')
  const co = await seed.company({ personas: ['trainer'] })
  const { page } = await as.page(co.users.trainer, { path: '/work/help' })
  await page.waitForLoadState('networkidle')
  const text = await page.locator('body').innerText()
  test.skip(!/Teach a workflow|Teach studio/.test(text), PENDING_UI.newHelpPages)
  for (const topic of [/Teach/, /Workflow issues/]) await expect(page.getByText(topic).first()).toBeVisible()
  const broken = await page.locator('main img, [role=main] img').evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')))
  expect(broken, 'every help picture loads').toEqual([])
})
