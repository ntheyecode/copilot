// The individuals marketing site (src/sites/individuals/): served at the usual
// public paths where the edition has `individual_site`, never elsewhere.
// Every test runs in every edition and checks THAT edition's contract:
//   paid     the individuals chrome and pages, the plan hand-off to sign-up,
//            no company wording, no sideways scroll at 1280/640 in light and
//            a dark system preference (the site stays light), no raw keys and no English left behind in German and Arabic
//   all/saas the organization pages exactly as before (no individuals chrome)
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { visibleTexts, englishLeaks, rawKeys } from '../support/i18n-check.mjs'
import { INDIVIDUALS_BANNED } from '../../scripts/edition_copy_scan.mjs'

const PAGES = [['home', '/'], ['how it works', '/workcopilot/how-it-works'], ['pricing', '/workcopilot/pricing'], ['who it is for', '/workcopilot/use-cases'], ['faq', '/workcopilot/faq'], ['privacy', '/workcopilot/security']]
// Shared pages that carry the site chrome (legal pages are linked, not
// rewritten). The sign-in page has its own card layout on every edition and
// carries neither site header; it is checked for the absence of both.
const SHARED = ['/workcopilot/terms', '/workcopilot/privacy', '/workcopilot/contact']
const LOGIN = '/workcopilot/login'
// Fixture values on the privacy visual (a card, a key, a phone): formats, not language.
const SAMPLE_DATA = ['Lite', 'Basic', 'Advanced', 'Premium', 'Stripe', 'support@admireveda.com', 'sk_live_51Hq9', '4242 4242 4242 4242', '+1 415 555 0133', 'AES-256-GCM']
const hasSite = (edition) => capsOf(edition).has('individual_site')

async function settle(page, path) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}

test('the public paths serve the individuals site only where individual_site is on', async ({ as, edition }) => {
  const { context } = await as.context()
  const page = await context.newPage()
  const problems = []
  for (const [name, path] of [...PAGES, ...SHARED.map((p) => [p, p])]) {
    await settle(page, path)
    const indiv = await page.locator('header.ivh').count()
    const org = await page.locator('header.wsh').count()
    if (hasSite(edition)) {
      if (indiv !== 1) problems.push(`${name}: expected the individuals header, found ${indiv}`)
      if (org) problems.push(`${name}: the organization header is still rendered`)
      if (PAGES.some(([, p]) => p === path)) {
        if (!(await page.locator('.iv main').count())) problems.push(`${name}: not an individuals page`)
        const text = await page.locator('body').innerText()
        const hit = text.match(new RegExp(INDIVIDUALS_BANNED.source, 'i'))
        if (hit) problems.push(`${name}: reads "${hit[0]}"`)
      }
    } else {
      if (indiv) problems.push(`${name}: the individuals header leaked onto the organization site`)
      if (org !== 1) problems.push(`${name}: expected the organization header, found ${org}`)
    }
  }
  await settle(page, LOGIN)
  if (await page.locator('header.ivh, header.wsh').count()) problems.push('sign-in: the sign-in card carries no site header on any edition')
  // The card opens on the Social tab; the email form sits one tab away.
  if (hasSite(edition) && !(await page.locator('#wl-tab-email').count())) problems.push('sign-in: the sign-in card is missing')
  expect(problems, problems.join('\n')).toEqual([])
  await context.close()
})

test('pricing hands the chosen plan and cycle to the existing sign-up, where the site is served', async ({ as, edition }) => {
  const { context } = await as.context()
  const page = await context.newPage()
  await settle(page, '/workcopilot/pricing')
  if (!hasSite(edition)) {
    await expect(page.locator('.ivp-card'), 'no individuals plan cards on the organization site').toHaveCount(0)
    await context.close()
    return
  }
  await expect(page.locator('.ivp-card')).toHaveCount(4)
  // Live prices landed (no skeleton left) and the Start buttons carry the plan.
  await expect(page.locator('.ivp-skel')).toHaveCount(0)
  for (const id of ['lite', 'basic', 'advanced', 'premium']) {
    await expect(page.locator(`#ivp-${id} a.iv-btn`)).toHaveAttribute('href', `/workcopilot/signup?plan=${id}`)
  }
  await page.locator('#ivp-advanced a.iv-btn').click()
  await page.waitForURL(/\/workcopilot\/signup\?plan=advanced/)
  // The subscribe onboarding opens on its account step (email + password).
  await expect(page.locator('#ob-email')).toBeVisible()
  // ?plan=<id> from the live check ribbons that plan.
  await settle(page, '/workcopilot/pricing?plan=basic')
  await expect(page.locator('#ivp-basic .ivp-ribbon')).toBeVisible()
  await context.close()
})

test('every individuals page: no sideways scroll at 1280 and 640, light and dark; German and Arabic read clean', async ({ as, edition }) => {
  test.setTimeout(240_000)
  if (!hasSite(edition)) {
    // The organization site keeps its own layout gate (layout.spec, help.spec);
    // here: the individuals stylesheet is not even loaded.
    const { context } = await as.context()
    const page = await context.newPage()
    await settle(page, '/')
    expect(await page.locator('.iv').count(), 'no individuals root on the organization site').toBe(0)
    await context.close()
    return
  }
  const problems = []
  for (const theme of ['light', 'dark']) {
    const { context } = await as.context({ theme, contextOptions: { colorScheme: theme } })
    const page = await context.newPage()
    for (const [name, path] of PAGES) {
      for (const width of [1280, 640]) {
        await page.setViewportSize({ width, height: 900 })
        await settle(page, path)
        const m = await page.evaluate(() => ({
          scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth,
          paper: getComputedStyle(document.querySelector('.iv')).backgroundColor,
        }))
        if (m.scroll > m.inner + 1) problems.push(`${name} ${theme} ${width}px: page is ${m.scroll}px wide`)
        // Public pages stay light even for a system that prefers dark (owner rule).
        if (/rgb\(15, 19, 28\)/.test(m.paper)) problems.push(`${name} ${theme} ${width}px: the public site turned dark (paper ${m.paper})`)
        if (width === 1280 && (await page.locator('header.ivh.folded').count())) problems.push(`${name} ${theme}: the header folded at 1280`)
      }
    }
    await context.close()
  }
  // Languages: the English texts are the baseline per page.
  const texts = async (locale, path) => {
    const { context } = await as.context({ locale })
    const page = await context.newPage()
    await settle(page, path)
    const out = { texts: await visibleTexts(page), dir: await page.locator('html').getAttribute('dir') }
    await context.close()
    return out
  }
  for (const [name, path] of PAGES) {
    const en = await texts('en', path)
    for (const locale of ['de', 'ar']) {
      const got = await texts(locale, path)
      for (const k of rawKeys(got.texts)) problems.push(`${name} ${locale}: raw key "${k}"`)
      for (const leak of englishLeaks(en.texts, got.texts, { data: SAMPLE_DATA })) problems.push(`${name} ${locale}: English left behind "${leak}"`)
      if (locale === 'ar' && got.dir !== 'rtl') problems.push(`${name} ar: dir is ${got.dir}`)
    }
  }
  expect(problems, problems.join('\n')).toEqual([])
})
