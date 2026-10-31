// Email, end to end: the product's own mailer (server/mailer.js) delivers over
// a real SMTP conversation to a local relay (support/boot/fake-smtp.mjs), and
// the tests act on what arrived, the way a person acts on the email:
//   - an invite: the company admin adds a person, the person sets a password
//     from the emailed link and signs in;
//   - a password reset: forgot password, the emailed link, the new password
//     works and the old one does not, and a "password changed" notice arrives;
//   - an alert: a company admin asks for more hours and the owner alert arrives.
// The superadmin points the email settings at the relay through the real API.
// This file runs on its own server (a distinct serverEnv), so no other spec
// sends real mail. Editions without companies check the company flows as
// refused (support/edition-branch.mjs); the reset runs everywhere.
import { test, expect } from '../support/fixtures.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'

const OWNER = 'owner.alerts@e2e-mail.net'
test.use({ serverEnv: { E2E_MAIL_RELAY: '1', OWNER_ALERT_EMAILS: OWNER } })

async function useRelay(as, server) {
  const admin = await as.api(SUPERADMIN)
  const r = await admin.post('/api/work/admin/smtp', { host: '127.0.0.1', port: server.info.smtpPort, security: 'starttls', fromEmail: 'noreply@e2e-mail.net', fromName: 'WorkCoPilot' })
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  return admin
}

// The newest message to `to` that passes `pred`, waiting for delivery.
async function mailTo(server, to, pred = () => true, what = '') {
  let found = null
  await expect.poll(async () => {
    const all = (await server.ctl('smtp.messages')).filter((m) => m.to.includes(to) && pred(m))
    found = all[all.length - 1] || null
    return !!found
  }, { message: `an email to ${to}${what ? ` (${what})` : ''}`, timeout: 15_000 }).toBe(true)
  return found
}
const tokenIn = (msg) => {
  const m = /\/work\/set-password\?token=([A-Za-z0-9_%.-]+)/.exec(msg.text)
  expect(m, `a set-password link in: ${msg.text.slice(0, 300)}`).toBeTruthy()
  return decodeURIComponent(m[1])
}

companyTest(test, 'invite: the new person sets a password from the emailed link and signs in', {
  api: [['POST', '/api/work/company/users']], what: 'inviting a person to a company',
}, async ({ as, seed, server }) => {
  await useRelay(as, server)
  const co = await seed.company({ personas: ['admin'] })
  const admin = await as.api(co.users.admin)
  const p = seed.prefix()
  const email = `${p}.invited@e2e-mail.net`
  const add = await admin.post('/api/work/company/users', { username: `${p}_invited`, email, companyRole: 'member' })
  expect(add.status, JSON.stringify(add.data)).toBe(200)

  const msg = await mailTo(server, email)
  expect(msg.from).toBe('noreply@e2e-mail.net')
  expect(msg.text).toContain(co.name)
  const token = tokenIn(msg)

  // The person opens the link: the page greets them and sets the password.
  const { context } = await as.context()
  const page = await context.newPage()
  await page.goto(`/work/set-password?token=${encodeURIComponent(token)}`)
  await expect(page.getByText(`${p}_invited`).first()).toBeVisible()
  const fields = page.locator('form input')
  await fields.nth(0).fill('Invited-Pass-123!')
  await fields.nth(1).fill('Invited-Pass-123!')
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('a.wsp-btn[href="/workcopilot"]')).toBeVisible()

  const login = new LoginPage(page)
  await login.open()
  await login.signIn(`${p}_invited`, 'Invited-Pass-123!')
  await expect(page).toHaveURL(/\/work(\/|$|\?)/)
})

test('password reset: the emailed link sets a new password, the old one stops working, a notice arrives', async ({ as, seed, server }) => {
  await useRelay(as, server)
  const solo = await seed.solo()
  const email = `${solo.username.replace(/_solo$/, '')}.solo@e2e-mail.net`
  const anon = await as.anon()
  const forgot = await anon.post('/api/work/password/forgot', { login: solo.username })
  expect([forgot.status, forgot.data.ok]).toEqual([200, true])
  // The same answer for an unknown account (no enumeration), and nothing is sent.
  expect((await anon.post('/api/work/password/forgot', { login: 'nobody_here_e2e' })).data.ok).toBe(true)

  const msg = await mailTo(server, email)
  const token = tokenIn(msg)
  const peek = await anon.get(`/api/work/password/token/${encodeURIComponent(token)}`)
  expect([peek.status, peek.data.username]).toEqual([200, solo.username])
  const set = await anon.post('/api/work/password/set', { token, password: 'Reset-Pass-456!' })
  expect(set.status, JSON.stringify(set.data)).toBe(200)
  // One-time: the link cannot be used again.
  expect((await anon.post('/api/work/password/set', { token, password: 'Another-Pass-789!' })).status).toBe(400)

  await expect(as.api(solo)).rejects.toThrow(/login .* failed/)
  const me = await as.api({ ...solo, password: 'Reset-Pass-456!' })
  expect(me.user.username).toBe(solo.username)
  // The security notice: a second, different email to the same person.
  const notice = await mailTo(server, email, (m) => m.subject !== msg.subject, 'password changed notice')
  expect(notice.subject).toMatch(/password/i)
  expect((await server.ctl('smtp.messages')).filter((m) => m.to.some((t) => /nobody_here_e2e/.test(t)))).toEqual([])
})

companyTest(test, 'alert: a company asks for more hours and the owner alert email arrives', {
  api: [['POST', '/api/work/team/hour-requests']], what: 'company hour requests and their alerts',
}, async ({ as, seed, server }) => {
  await useRelay(as, server)
  const co = await seed.company({ personas: ['admin'] })
  const admin = await as.api(co.users.admin)
  const r = await admin.post('/api/work/team/hour-requests', { hours: 25, note: 'Quarter-end close' })
  expect(r.status, JSON.stringify(r.data)).toBe(200)
  const msg = await mailTo(server, OWNER, (m) => m.subject.includes(co.name), 'hours request alert')
  expect(msg.text).toContain('25')
})
