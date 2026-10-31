// Customer-run editions (onprem, managed): boot and sign-in only. The server
// starts as the edition, reports its capabilities, hosts exactly one company,
// refuses self sign-up, and both the superadmin and a company member sign in
// through the real login page.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'

test('boots as the edition, one company, no self sign-up, and everyone signs in', async ({ as, edition, seed }) => {
  const anon = await as.anon()
  const ed = await anon.get('/api/work/edition')
  expect(ed.status).toBe(200)
  expect(ed.data.edition).toBe(edition)
  expect(ed.data.capabilities.sort()).toEqual(capsOf(edition).list().sort())
  expect(capsOf(edition).has('single_company')).toBe(true)

  const signup = await anon.post('/api/work/signup', { username: `${seed.prefix()}_new`, password: 'Signup-Pass-123!', email: `${seed.prefix()}@e2e-mail.net`, acceptTerms: true })
  expect([signup.status, signup.data.signupDisabled]).toEqual([403, true])

  // The installation's one company, created by the superadmin; a second is refused.
  const sa = await as.api(SUPERADMIN)
  const existing = (await sa.get('/api/work/admin/companies')).data.companies
  let company = existing[0]
  if (!company) {
    const c = await sa.post('/api/work/admin/companies', { name: 'Customer Corp', plan: 'advanced', seats: 20, licenseMode: 'flexible' })
    expect(c.status, JSON.stringify(c.data)).toBe(200)
    company = c.data
  }
  const second = await sa.post('/api/work/admin/companies', { name: `${seed.prefix()} Second Corp`, plan: 'basic', seats: 5 })
  expect([second.status, second.data.singleCompany]).toEqual([409, true])
  const username = `${seed.prefix()}_member`
  const u = await sa.post('/api/work/admin/users', { username, password: 'E2e-User-Pass-123!', companyId: company.id, companyRole: 'member', tier: 'advanced' })
  expect(u.status, JSON.stringify(u.data)).toBe(200)

  for (const [who, user, landing] of [['superadmin', SUPERADMIN, /\/work\/admin$/], ['member', { username, password: 'E2e-User-Pass-123!' }, /\/work$/]]) {
    await test.step(who, async () => {
      const { context } = await as.context()
      const page = await context.newPage()
      const login = new LoginPage(page)
      await login.open()
      await login.signIn(user.username, user.password)
      await expect(page).toHaveURL(landing)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await context.close()
    })
  }
})
