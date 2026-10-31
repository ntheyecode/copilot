// What each hosted edition must and must not offer, end to end: the API
// refusals (from the server's own route lists, with mixed-case URLs too) and
// the RENDERED screens (scanned with the same audience wording rules the build
// gate applies to the catalogs, scripts/edition_copy_scan.mjs).
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { INDIVIDUAL_PLAN_ROUTES, COMPANY_ROUTE_PREFIXES } from '../../server/edition_route_gates.js'
import { INDIVIDUALS_BANNED, ORGANIZATIONS_BANNED } from '../../scripts/edition_copy_scan.mjs'

const SIGNUP_ROUTES = ['/api/work/signup', '/api/work/onboarding/signup']
const PUBLIC_PAGES = ['/', '/workcopilot/pricing', '/workcopilot/login', '/workcopilot/signup', '/workcopilot/faq', '/workcopilot/how-it-works', '/workcopilot/use-cases', '/workcopilot/security', '/workcopilot/contact']
const APP_PAGES = ['/work', '/work/start', '/work/tasks', '/work/help', '/work/support']

// "/api/work/checkout" -> "/API/Work/CheckOut": Express matches routes without
// case, so a gate that compared case-sensitively would be bypassed.
const mixedCase = (p) => p.split('/').map((s, i) => (i % 2 ? s.toUpperCase() : s.replace(/^./, (c) => c.toUpperCase()))).join('/')
// A concrete URL under each gated prefix.
const underPrefix = (pre) => (pre.endsWith('/') ? `${pre}probe` : pre)

async function visibleText(page, path) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
  return { url: page.url(), text: await page.locator('body').innerText() }
}
// Reviewed: words the individuals rule bans for company tenancy, used here for a
// FIELD OF WORK a person is guided through (like LOCAL_REVIEWED in the scan).
const INDIVIDUALS_REVIEWED = [
  [/ServiceNow admin/g, 'a job role in a guided ServiceNow task'],
  [/Healthcare admin/g, 'a field of work (front-desk healthcare tasks)'],
  [/finance and admin/gi, 'fields of work: "from cloud and code to finance and admin"'],
  [/Support, admin, back office/g, 'a field family: operations work'],
  [/SSO \/ OAuth/g, 'a technical topic WorkCoPilot guides (configuring sign-in in your own app)'],
]
const withoutReviewed = (text) => INDIVIDUALS_REVIEWED.reduce((s, [re]) => s.replace(re, ' '), text)

// Each banned word with the text around it, so a failure names its source.
function bannedHits(text, re) {
  const g = new RegExp(re.source, 'gi')
  const out = new Set()
  for (const m of text.matchAll(g)) out.add(`"${m[0]}" in "...${text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ')}..."`)
  return [...out]
}

test.describe('saas: organizations only', () => {
  test.beforeEach(({ edition }) => test.skip(edition !== 'saas', 'saas edition only'))

  test('every personal plan and sign-up route is refused, any letter case, signed in or not', async ({ as, seed }) => {
    const co = await seed.company({ personas: ['member', 'admin'] })
    const clients = { anonymous: await as.anon(), member: await as.api(co.users.member), admin: await as.api(co.users.admin) }
    for (const [who, api] of Object.entries(clients)) {
      for (const [method, path] of INDIVIDUAL_PLAN_ROUTES) {
        for (const p of [path, mixedCase(path), `${path}/`]) {
          const r = await api.ctx.fetch(p, { method, data: { plan: 'basic', tier: 'basic', interval: 'month', hours: 5 }, failOnStatusCode: false })
          const body = await r.json().catch(() => ({}))
          expect([r.status(), body.individualPlansDisabled], `${who} ${method} ${p}`).toEqual([403, true])
        }
      }
      for (const path of SIGNUP_ROUTES) {
        for (const p of [path, mixedCase(path)]) {
          const r = await api.post(p, { username: `${seed.prefix()}_x`, password: 'Signup-Pass-123!', email: `${seed.prefix()}@e2e-mail.net`, acceptTerms: true })
          expect([r.status, r.data && r.data.signupDisabled], `${who} POST ${p}`).toEqual([403, true])
        }
      }
    }
  })

  test('no personal plan, price, sign-up or upgrade path on any public or member screen', async ({ as, seed }) => {
    const co = await seed.company({ personas: ['member'] })
    const problems = []
    const { context } = await as.context()
    const anon = await context.newPage()
    for (const path of PUBLIC_PAGES) {
      const { url, text } = await visibleText(anon, path)
      const hits = bannedHits(text, ORGANIZATIONS_BANNED)
      if (hits.length) problems.push(`${path}: ${hits.join(', ')}`)
      if (/\$\s?\d+(?:\.\d{2})?\s*(?:\/|per)\s*(?:mo|month)/i.test(text) && /\b(Lite|Basic|Premium)\b/.test(text)) problems.push(`${path}: a personal plan price`)
      if (path === '/workcopilot/signup') expect(await anon.locator('form input[type="password"]').count(), 'the sign-up page is closed').toBe(0)
      if (path === '/workcopilot/login') expect(await anon.locator('a[href*="/workcopilot/signup"]').count(), 'no way to create an account').toBe(0)
      expect(url.startsWith('http'), path).toBe(true)
    }
    const { page } = await as.page(co.users.member, { path: null })
    for (const path of APP_PAGES) {
      const { text } = await visibleText(page, path)
      const hits = bannedHits(text, ORGANIZATIONS_BANNED)
      if (hits.length) problems.push(`member ${path}: ${hits.join(', ')}`)
    }
    expect(problems, problems.join('\n')).toEqual([])
  })
})

test.describe('paid: individuals only', () => {
  test.beforeEach(({ edition }) => test.skip(edition !== 'paid', 'paid edition only'))

  test('every company route family is refused, any letter case', async ({ as, seed }) => {
    const solo = await as.api(await seed.solo())
    const anon = await as.anon()
    for (const pre of COMPANY_ROUTE_PREFIXES) {
      for (const p of [underPrefix(pre), mixedCase(underPrefix(pre))]) {
        for (const [who, api] of [['solo', solo], ['anonymous', anon]]) {
          const r = await api.ctx.fetch(p, { method: 'GET', failOnStatusCode: false })
          const body = await r.json().catch(() => ({}))
          expect([r.status(), body.companiesDisabled], `${who} GET ${p}`).toEqual([403, true])
        }
      }
    }
    // Company tenants cannot be created either (superadmin), covered in auth.spec.
  })

  test('no company wording on any public or account screen, and no company page opens', async ({ as, seed }) => {
    const solo = await seed.solo()
    const problems = []
    const { context } = await as.context()
    const anon = await context.newPage()
    for (const path of PUBLIC_PAGES) {
      const { text } = await visibleText(anon, path)
      const hits = bannedHits(withoutReviewed(text), INDIVIDUALS_BANNED)
      if (hits.length) problems.push(`${path}: ${hits.join(', ')}`)
    }
    for (const path of ['/enterprise', '/workcopilot/enterprise']) {
      const { url } = await visibleText(anon, path)
      if (/enterprise/.test(new URL(url).pathname)) problems.push(`${path} still opens`)
    }
    const { page } = await as.page(solo, { path: null })
    for (const path of APP_PAGES) {
      const { text } = await visibleText(page, path)
      const hits = bannedHits(withoutReviewed(text.split(solo.username).join(' ')), INDIVIDUALS_BANNED)
      if (hits.length) problems.push(`solo ${path}: ${hits.join(', ')}`)
    }
    for (const path of ['/work/company', '/work/exec', '/work/teach', '/work/workflow-issues', '/work/pm', '/work/queue']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      if (new URL(page.url()).pathname !== '/work') problems.push(`${path} opens instead of returning to /work`)
    }
    expect(problems, problems.join('\n')).toEqual([])
  })
})

test.describe('all: individuals and companies, as before', () => {
  test.beforeEach(({ edition }) => test.skip(edition !== 'all', 'all edition only'))

  test('personal plans and company routes are both open, and both appear on the site', async ({ as, seed }) => {
    const co = await seed.company({ personas: ['admin'] })
    const solo = await as.api(await seed.solo())
    for (const [method, path] of INDIVIDUAL_PLAN_ROUTES) {
      const r = await solo.ctx.fetch(path, { method, data: {}, failOnStatusCode: false })
      const body = await r.json().catch(() => ({}))
      expect(body.individualPlansDisabled, `${method} ${path} is not edition-refused`).toBeFalsy()
    }
    const admin = await as.api(co.users.admin)
    expect((await admin.get('/api/work/company/users')).status).toBe(200)
    expect((await solo.post('/api/work/signup', {})).data.signupDisabled).toBeFalsy()
    const { context } = await as.context()
    const page = await context.newPage()
    const { text } = await visibleText(page, '/workcopilot/pricing')
    expect(text).toMatch(/Enterprise/)
    expect(text).toMatch(/\b(Basic|Premium)\b/)
  })
})
