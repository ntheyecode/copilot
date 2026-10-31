// Auth across editions: sign-in per role, sign-up and company creation per
// edition rule, sign-out, session expiry, and one live session per account.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { hasCompanies, hasSolo, companyFeatureRefused, personalAccountsRefused } from '../support/edition-branch.mjs'
import { LANDING, SUPERADMIN } from '../support/personas.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'
import { WorkShell } from '../pages/WorkShell.mjs'
import { LegalGate } from '../pages/LegalGate.mjs'

test('the edition endpoint reports exactly the registry capabilities', async ({ as, edition }) => {
  const anon = await as.anon()
  const r = await anon.get('/api/work/edition')
  expect(r.status).toBe(200)
  expect(r.data.edition).toBe(edition)
  expect(r.data.capabilities.sort()).toEqual(capsOf(edition).list().sort())
})

test.describe('sign in through the login page', () => {
  test('superadmin lands on the admin console', async ({ as }) => {
    const { context } = await as.context()
    const page = await context.newPage()
    const login = new LoginPage(page)
    await login.open()
    await login.signIn(SUPERADMIN.username, SUPERADMIN.password)
    await expect(page).toHaveURL(LANDING.superadmin.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(LANDING.superadmin.heading)
  })

  test('every company role lands on its home', async ({ as, seed, edition }) => {
    if (!hasCompanies(edition)) {
      return companyFeatureRefused({ as, seed, edition }, {
        what: 'company roles and their consoles',
        api: [['GET', '/api/work/company/users'], ['GET', '/api/work/my-company']],
        pages: ['/work/company', '/work/exec', '/work/pm', '/work/srpm', '/work/grc', '/work/queue', '/work/teach', '/work/workflow-issues'],
      })
    }
    const co = await seed.company()
    for (const key of ['admin', 'exec', 'pm', 'srpm', 'grc', 'member', 'worker', 'trainer']) {
      await test.step(key, async () => {
        const { context } = await as.context()
        const page = await context.newPage()
        const login = new LoginPage(page)
        await login.open()
        await login.signIn(co.users[key].username, co.password)
        await expect(page).toHaveURL(LANDING[key].path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(LANDING[key].heading)
        await context.close()
      })
    }
  })

  test('a solo user lands on the dashboard', async ({ as, seed, edition }) => {
    if (!hasSolo(edition)) return personalAccountsRefused({ as, seed, edition })
    const solo = await seed.solo()
    const { context } = await as.context()
    const page = await context.newPage()
    const login = new LoginPage(page)
    await login.open()
    await login.signIn(solo.username, solo.password)
    await expect(page).toHaveURL(LANDING.solo.path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(LANDING.solo.heading)
  })

  test('a paying solo user picks their language once, on first sign-in', async ({ as, seed, edition }) => {
    if (!hasSolo(edition)) {
      // No personal accounts here: a company member's chosen language is pinned
      // to the account and follows them on every load.
      const co = await seed.company({ personas: ['member'] })
      const { page, api } = await as.page(co.users.member, { pinLanguage: false })
      expect((await api.post('/api/work/profile/language', { language: 'ja' })).status).toBe(200)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', /^ja/)
      const me = await api.get('/api/work/me')
      expect([me.data.user.languagePinned, me.data.user.language]).toEqual([true, 'ja'])
      return
    }
    const solo = await seed.solo()
    const { page, api } = await as.page(solo, { pinLanguage: false })
    const dialog = page.getByRole('dialog', { name: 'Choose your language' })
    await expect(dialog).toBeVisible()
    await dialog.locator('[role=option][lang^=de]').click()
    await dialog.getByRole('button').last().click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('html')).toHaveAttribute('lang', /^de/)
    const me = await api.get('/api/work/me')
    expect(me.data.user.languagePinned).toBe(true)
    expect(me.data.user.language).toBe('de')
    await page.reload()
    await expect(page.getByRole('dialog', { name: /./ }).filter({ has: page.locator('#lpm-title') })).toHaveCount(0)
  })

  test('an account that has not accepted the agreements meets the consent gate once', async ({ as, seed, edition }) => {
    const user = capsOf(edition).has('saas_companies')
      ? (await seed.company({ personas: ['member'], legal: false })).users.member
      : await seed.solo({ legal: false })
    const { page, api } = await as.page(user)
    const gate = new LegalGate(page)
    await expect(gate.dialog()).toBeVisible()
    // Guided work is refused until accepted.
    const before = await api.post('/api/work/sessions', { goal: 'Anything' })
    expect(before.status).toBe(403)
    expect(before.data.legalRequired).toBe(true)
    await gate.accept()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
    await expect(gate.dialog()).toHaveCount(0)
  })

  test('a wrong password is refused with a message and no session', async ({ as, seed, edition }) => {
    const user = capsOf(edition).has('saas_companies') ? (await seed.company({ personas: ['member'] })).users.member : await seed.solo()
    const { context } = await as.context()
    const page = await context.newPage()
    const login = new LoginPage(page)
    await login.open()
    await login.signIn(user.username, 'not-the-password')
    await expect(login.error()).toBeVisible()
    await expect(page).toHaveURL(/\/workcopilot/)
    const me = await (await as.anon()).get('/api/work/me')
    expect(me.data.signedIn).toBeFalsy()
  })
})

test('a signed-out visitor to any console is sent to sign in', async ({ as }) => {
  const { context } = await as.context()
  const page = await context.newPage()
  for (const path of ['/work', '/work/start', '/work/teach', '/work/workflow-issues', '/work/exec', '/work/company', '/work/admin']) {
    await test.step(path, async () => {
      await page.goto(path)
      await expect(page, `${path} sends a signed-out visitor to sign in`).toHaveURL(/\/workcopilot(\/login)?(\?|$)/)
    })
  }
})

test.describe('sign-up and tenancy follow the edition', () => {
  test('self sign-up is open only where the edition allows individuals', async ({ as, seed, edition }) => {
    const anon = await as.anon()
    const p = seed.prefix()
    const r = await anon.post('/api/work/signup', { username: `${p}_new`, password: 'Signup-Pass-123!', email: `${p}.new@e2e-mail.net`, name: 'New Person', acceptTerms: true })
    if (capsOf(edition).has('solo_signup')) {
      expect(r.status).toBe(200)
      expect(r.data.user.username).toBe(`${p}_new`)
      const me = await anon.get('/api/work/me')
      expect(me.data.signedIn).toBe(true)
    } else {
      expect(r.status).toBe(403)
      expect(r.data.signupDisabled).toBe(true)
    }
  })

  test('company tenants exist only where the edition hosts companies', async ({ as, seed, edition }) => {
    const sa = await as.api(SUPERADMIN)
    const r = await sa.post('/api/work/admin/companies', { name: `${seed.prefix()} Tenant`, plan: 'basic', seats: 5 })
    if (capsOf(edition).has('saas_companies')) {
      expect(r.status).toBe(200)
      expect(r.data.id).toBeTruthy()
    } else {
      expect(r.status).toBe(403)
      expect(r.data.companiesDisabled).toBe(true)
    }
  })
})

test.describe('session lifetime', () => {
  async function anyUser(seed, edition) {
    return capsOf(edition).has('saas_companies') ? (await seed.company({ personas: ['member'] })).users.member : await seed.solo()
  }

  test('sign out from the shell ends the session', async ({ as, seed, edition }) => {
    const user = await anyUser(seed, edition)
    const { page, api } = await as.page(user)
    await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
    await new WorkShell(page).signOut()
    const me = await api.get('/api/work/me')
    expect(me.data.signedIn).toBeFalsy()
    await page.goto('/work')
    await expect(page).toHaveURL(/\/workcopilot/)
  })

  test('a session expires 8 hours after sign-in, server side', async ({ as, seed, edition, server }) => {
    const user = await anyUser(seed, edition)
    const api = await as.api(user)
    expect((await api.get('/api/work/me')).data.signedIn).toBe(true)
    await server.ctl('clock.advance', { ms: 7 * 3600_000 })
    expect((await api.get('/api/work/me')).data.signedIn, 'still valid at 7 h').toBe(true)
    await server.ctl('clock.advance', { ms: 3600_000 + 60_000 })
    const me = await api.get('/api/work/me')
    expect(me.data.signedIn, 'expired after 8 h').toBeFalsy()
    const r = await api.get('/api/work/sessions')
    expect(r.status).toBe(401)
  })

  test('signing in again elsewhere signs the first session out', async ({ as, seed, edition }) => {
    const user = await anyUser(seed, edition)
    const first = await as.api(user)
    const second = await as.api(user)
    expect((await second.get('/api/work/me')).data.signedIn).toBe(true)
    const r = await first.get('/api/work/sessions')
    expect(r.status).toBe(401)
    expect(r.data.loggedOut).toBe(true)
  })
})
