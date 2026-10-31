// The in-app help (/work/help): each role reads exactly the dashboard entries
// that apply to it, the annotated screenshots' callouts work from the
// keyboard, nothing overflows at 1280 or 640, and nothing shows a raw key.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { visibleTexts, rawKeys } from '../support/i18n-check.mjs'

// The expected entries per persona: an independent statement of the product's
// role rules (work_roles: flows, PM/Sr PM/GRC, trainer grant, executive), not a
// re-import of the code under test. Seeded flows: member/trainer mixed, worker
// worker, everyone else independent.
const BASE = ['home', 'start', 'projects', 'guide', 'reports']
const EXPECTED = {
  solo: BASE,
  member: [...BASE, 'queue', 'workflows'],
  worker: ['home', 'guide', 'reports', 'queue', 'workflows'],
  trainer: [...BASE, 'queue', 'workflows', 'teach', 'issues'],
  pm: [...BASE, 'pm', 'pmProject', 'workflows', 'issues'],
  srpm: [...BASE, 'pm', 'pmProject', 'srpm', 'grc', 'workflows', 'issues'],
  grc: [...BASE, 'grc', 'workflows', 'issues'],
  exec: [...BASE, 'workflows', 'issues', 'exec'],
  admin: [...BASE, 'pm', 'pmProject', 'srpm', 'grc', 'workflows', 'teach', 'issues', 'exec', 'admin'],
}
const ID_OF = (k) => `help-dash-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

async function entries(page) {
  await page.locator('section[id^="help-dash-"]').first().waitFor()
  return (await page.locator('section[id^="help-dash-"]').evaluateAll((els) => els.map((e) => e.id))).sort()
}

async function personas(seed, edition) {
  const caps = capsOf(edition)
  const out = {}
  if (caps.has('saas_companies')) Object.assign(out, (await seed.company()).users)
  if (caps.has('solo_signup')) out.solo = await seed.solo()
  return out
}

test('each role sees exactly its help entries', async ({ as, seed, edition }) => {
  test.setTimeout(180_000)
  const users = await personas(seed, edition)
  const keyId = (k) => (k === 'pmProject' ? 'help-dash-pm-project' : `help-dash-${k}`)
  for (const [who, user] of Object.entries(users)) {
    await test.step(who, async () => {
      const { page, context } = await as.page(user, { path: '/work/help' })
      expect(await entries(page), `${who} help entries`).toEqual(EXPECTED[who].map(keyId).sort())
      await context.close()
    })
  }
})

test('company-only entries never appear for a personal account', async ({ as, seed, edition }) => {
  // No personal accounts here: the same rule for a plain member, who holds none
  // of the roles those entries belong to (Company workflows is theirs, though).
  const plain = capsOf(edition).has('solo_signup') ? await seed.solo() : (await seed.company({ personas: ['member'] })).users.member
  const { page } = await as.page(plain, { path: '/work/help' })
  if (!capsOf(edition).has('solo_signup')) {
    await page.locator('section[id^="help-dash-"]').first().waitFor()
    for (const id of ['help-dash-teach', 'help-dash-issues', 'help-dash-exec', 'help-dash-admin', 'help-dash-pm']) await expect(page.locator(`#${id}`), id).toHaveCount(0)
    await expect(page.locator('#help-dash-workflows')).toHaveCount(1)
    return
  }
  const text = await page.locator('main, body').first().innerText()
  for (const title of ['Teach studio', 'Company workflows', 'Workflow issues', 'Executive dashboard']) expect(text, title).not.toContain(title)
  // Personal plans are sold here: the top-up lines are still shown (no regression).
  if (capsOf(edition).has('individual_plans')) await expect(page.getByText('Purchased top-up time never expires').first()).toBeVisible()
})

test('company members never read personal top-up lines', async ({ as, seed, edition }) => {
  if (!capsOf(edition).has('saas_companies')) {
    // No company members here: every account is personal and buys its own hours,
    // so the top-up lines must be there (the other side of the same rule).
    const { page } = await as.page(await seed.solo(), { path: '/work/help' })
    await expect(page.getByText('Purchased top-up time never expires').first()).toBeVisible()
    await expect(page.getByText('Add time').first()).toBeVisible()
    return
  }
  const co = await seed.company({ personas: ['member'] })
  const { page } = await as.page(co.users.member, { path: '/work/help' })
  await expect(page.getByRole('heading', { name: 'Your time and pausing' })).toBeVisible()
  await expect(page.getByText('Purchased top-up time never expires')).toHaveCount(0)
})

test('annotated screenshot callouts are reachable and usable from the keyboard', async ({ as, seed, edition }) => {
  if (!capsOf(edition).has('saas_companies')) {
    // The annotated screenshots belong to company features. A personal account's
    // help is still keyboard-usable: every section link is a button in the tab
    // order, and Enter on one marks it current.
    const { page } = await as.page(await seed.solo(), { path: '/work/help' })
    const nav = page.locator('.wd-help-nav button')
    await nav.first().waitFor()
    await expect(page.locator('button.hs-pin'), 'no company callouts for a personal account').toHaveCount(0)
    const n = await nav.count()
    for (let i = 0; i < n; i++) expect(await nav.nth(i).evaluate((el) => el.tabIndex >= 0 && !el.disabled), `section link ${i + 1} is in the tab order`).toBe(true)
    const target = nav.nth(Math.min(2, n - 1))
    await target.focus()
    await page.keyboard.press('Enter')
    await expect(target).toHaveAttribute('aria-current', 'true')
    return
  }
  const co = await seed.company({ personas: ['admin'] })
  const { page } = await as.page(co.users.admin, { path: '/work/help' })
  const pins = page.locator('button.hs-pin')
  await pins.first().waitFor({ state: 'attached' })
  const n = await pins.count()
  expect(n, 'the new help has numbered callouts').toBeGreaterThan(0)
  for (let i = 0; i < n; i++) {
    const pin = pins.nth(i)
    expect(await pin.evaluate((el) => el.tabIndex >= 0 && !el.disabled), `callout ${i + 1} is in the tab order`).toBe(true)
    await expect(pin).toHaveAttribute('aria-label', /^Callout \d+$/)
    expect(await pin.getAttribute('aria-describedby'), 'each callout names its description').toBeTruthy()
  }
  // Real keyboard: Tab from the element just before the first callout lands on it,
  // and Enter pins it (aria-pressed).
  const first = pins.first()
  await first.scrollIntoViewIfNeeded()
  await first.evaluate((el) => {
    const all = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent)
    const prev = all[all.indexOf(el) - 1]
    if (prev) prev.focus()
  })
  await page.keyboard.press('Tab')
  expect(await first.evaluate((el) => el === document.activeElement), 'Tab reaches the first callout').toBe(true)
  await page.keyboard.press('Enter')
  await expect(first).toHaveAttribute('aria-pressed', 'true')
})

test('help pages: no overflow at 1280 and 640, no raw keys in en, de and ar', async ({ as, seed, edition }) => {
  test.setTimeout(180_000)
  const caps = capsOf(edition)
  const views = []
  if (caps.has('saas_companies')) {
    const co = await seed.company({ personas: ['admin', 'trainer'] })
    views.push(['admin /work/help', co.users.admin, '/work/help'], ['trainer /work/help', co.users.trainer, '/work/help'], ['admin console help', co.users.admin, '/work/company#help'])
  }
  if (caps.has('solo_signup')) views.push(['solo /work/help', await seed.solo(), '/work/help'])
  const problems = []
  for (const [name, user, path] of views) {
    for (const locale of ['en', 'de', 'ar']) {
      const { page, context } = await as.page(user, { path: null, locale })
      for (const width of [1280, 640]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path.replace('#help', ''))
        await page.waitForLoadState('networkidle')
        if (path.endsWith('#help')) await page.locator('.wka-nav-item').filter({ hasText: locale === 'en' ? 'Help' : /./ }).last().click()
        await page.waitForTimeout(300)
        const m = await page.evaluate(() => ({ scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth }))
        if (m.scroll > m.inner + 1) problems.push(`${name} ${locale} ${width}px: page is ${m.scroll}px wide`)
        const wide = await page.locator('section[id^="help-"] img, .hs-shot, figure').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length)
        if (wide) problems.push(`${name} ${locale} ${width}px: ${wide} picture(s) run off the screen`)
        for (const k of rawKeys(await visibleTexts(page))) problems.push(`${name} ${locale}: raw key "${k}"`)
      }
      await context.close()
    }
  }
  expect(problems, problems.join('\n')).toEqual([])
})
