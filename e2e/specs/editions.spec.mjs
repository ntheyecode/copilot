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
// Reviewed for the organizations rule: a payment provider named as WORK a
// person is guided through (the same two keys the build scan lists as work
// content in scripts/edition_copy_scan.mjs), never as a way to pay us.
const ORGANIZATIONS_REVIEWED = [
  [/Budgets\s+Stripe\s+Procurement/g, 'home.marquee: apps and tasks people work in'],
  [/Add Stripe payment webhooks/g, 'useCases demo task: adding payment webhooks to an app'],
]
const withoutOrgReviewed = (text) => ORGANIZATIONS_REVIEWED.reduce((s, [re]) => s.replace(re, ' '), text)

// Each banned word with the text around it, so a failure names its source.
function bannedHits(text, re) {
  const g = new RegExp(re.source, 'gi')
  const out = new Set()
  for (const m of text.matchAll(g)) out.add(`"${m[0]}" in "...${text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ')}..."`)
  return [...out]
}

// Every test runs in every edition and checks THAT edition's contract: what it
// refuses, and what it keeps open.
const PLAN_BODY = { plan: 'basic', tier: 'basic', interval: 'month', hours: 5 }

test('personal plan and sign-up routes follow the edition, any letter case', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  const clients = { anonymous: await as.anon() }
  if (caps.has('saas_companies')) {
    const co = await seed.company({ personas: ['member', 'admin'] })
    clients.member = await as.api(co.users.member)
    clients.admin = await as.api(co.users.admin)
  }
  if (caps.has('solo_signup')) clients.solo = await as.api(await seed.solo())
  for (const [who, api] of Object.entries(clients)) {
    for (const [method, path] of INDIVIDUAL_PLAN_ROUTES) {
      for (const p of [path, mixedCase(path), `${path}/`]) {
        const r = await api.ctx.fetch(p, { method, data: PLAN_BODY, failOnStatusCode: false })
        const body = (await r.json().catch(() => ({}))) || {}
        if (caps.has('individual_plans')) expect(body.individualPlansDisabled, `${who} ${method} ${p} stays open on ${edition}`).toBeFalsy()
        else expect([r.status(), body.individualPlansDisabled], `${who} ${method} ${p} refused on ${edition}`).toEqual([403, true])
      }
    }
    for (const path of SIGNUP_ROUTES) {
      for (const p of [path, mixedCase(path)]) {
        const r = await api.post(p, { username: `${seed.prefix()}_x`, password: 'Signup-Pass-123!', email: `${seed.prefix()}@e2e-mail.net`, acceptTerms: true })
        if (caps.has('solo_signup')) expect(r.data && r.data.signupDisabled, `${who} POST ${p} stays open on ${edition}`).toBeFalsy()
        else expect([r.status, r.data && r.data.signupDisabled], `${who} POST ${p} refused on ${edition}`).toEqual([403, true])
      }
    }
  }
})

test('company route families follow the edition, any letter case', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  const callers = [['anonymous', await as.anon()]]
  if (caps.has('saas_companies')) callers.push(['company admin', await as.api((await seed.company({ personas: ['admin'] })).users.admin)])
  if (caps.has('solo_signup')) callers.push(['solo', await as.api(await seed.solo())])
  for (const pre of COMPANY_ROUTE_PREFIXES) {
    for (const p of [underPrefix(pre), mixedCase(underPrefix(pre))]) {
      for (const [who, api] of callers) {
        const r = await api.ctx.fetch(p, { method: 'GET', failOnStatusCode: false })
        const body = (await r.json().catch(() => ({}))) || {}
        if (caps.has('saas_companies')) expect(body.companiesDisabled, `${who} GET ${p} is not edition-refused on ${edition}`).toBeFalsy()
        else expect([r.status(), body.companiesDisabled], `${who} GET ${p} refused on ${edition}`).toEqual([403, true])
      }
    }
  }
  if (caps.has('saas_companies')) {
    const admin = callers.find(([w]) => w === 'company admin')[1]
    expect((await admin.get('/api/work/company/users')).status, 'the company console answers').toBe(200)
  }
})

test('public and account screens use the edition\'s wording and offers', async ({ as, seed, edition }) => {
  const caps = capsOf(edition)
  const problems = []
  const { context } = await as.context()
  const anon = await context.newPage()
  if (edition === 'saas') {
    const co = await seed.company({ personas: ['member'] })
    for (const path of PUBLIC_PAGES) {
      const { text } = await visibleText(anon, path)
      const hits = bannedHits(withoutOrgReviewed(text), ORGANIZATIONS_BANNED)
      if (hits.length) problems.push(`${path}: ${hits.join(', ')}`)
      if (/\$\s?\d+(?:\.\d{2})?\s*(?:\/|per)\s*(?:mo|month)/i.test(text) && /\b(Lite|Basic|Premium)\b/.test(text)) problems.push(`${path}: a personal plan price`)
      if (path === '/workcopilot/signup') expect(await anon.locator('form input[type="password"]').count(), 'the sign-up page is closed').toBe(0)
      if (path === '/workcopilot/login') expect(await anon.locator('a[href*="/workcopilot/signup"]').count(), 'no way to create an account').toBe(0)
    }
    const { page } = await as.page(co.users.member, { path: null })
    for (const path of APP_PAGES) {
      const { text } = await visibleText(page, path)
      const hits = bannedHits(withoutOrgReviewed(text), ORGANIZATIONS_BANNED)
      if (hits.length) problems.push(`member ${path}: ${hits.join(', ')}`)
    }
  } else if (edition === 'paid') {
    const solo = await seed.solo()
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
  } else {
    // all: both audiences on the site; both kinds of account reach their screens.
    const { text } = await visibleText(anon, '/workcopilot/pricing')
    if (!/Enterprise/.test(text)) problems.push('pricing: no Enterprise offer')
    if (!/\b(Basic|Premium)\b/.test(text)) problems.push('pricing: no personal plans')
    const { url: signupUrl } = await visibleText(anon, '/workcopilot/signup')
    if (!/signup/.test(signupUrl)) problems.push('sign-up page does not open')
    const co = await seed.company({ personas: ['admin'] })
    const admin = await as.page(co.users.admin, { path: '/work/company' })
    await expect(admin.page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    const solo = await as.page(await seed.solo(), { path: '/work' })
    await expect(solo.page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  }
  expect(caps.list().length).toBeGreaterThan(0)
  expect(problems, problems.join('\n')).toEqual([])
})
