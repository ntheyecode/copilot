// MFA where it applies: a hosted server with MFA on. First sign-in enrolls an
// authenticator; later sign-ins ask for a code (or a backup code); sensitive
// admin actions (creating an API key, replacing the export passphrase) need a
// fresh code even inside a signed-in session.
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { hostedClient } from '../support/hosted-client.mjs'
import { currentToken } from '../../server/totp.js'
import { LoginPage } from '../pages/LoginPage.mjs'
import { SUPERADMIN } from '../support/personas.mjs'

test.use({ serverEnv: { WORK_HOSTED: '1', WORK_MFA_DISABLED: '0' } })

// Sign in for the first time: enroll, confirm with a code, keep the secret.
async function enroll(client, user) {
  const r = await client.post('/api/work/login', { username: user.username, password: user.password || 'E2e-User-Pass-123!' })
  expect(r.status).toBe(200)
  expect(r.data.mfaSetup, 'first sign-in asks to set up an authenticator').toBe(true)
  const secret = r.data.enroll.secret
  const ok = await client.post('/api/work/login/mfa/setup', { code: currentToken(secret) })
  expect(ok.status).toBe(200)
  expect(ok.data.user.username).toBe(user.username)
  expect(ok.data.backupCodes.length).toBeGreaterThan(3)
  return { secret, backupCodes: ok.data.backupCodes }
}

test('first sign-in enrolls an authenticator; later sign-ins need a code or a backup code', async ({ server, seed, edition }) => {
  const user = capsOf(edition).has('saas_companies') ? (await seed.company({ personas: ['member'] })).users.member : await seed.solo()
  const c1 = hostedClient(server.baseURL)
  const { secret, backupCodes } = await enroll(c1, user)
  expect((await c1.get('/api/work/me')).data.signedIn).toBe(true)
  const sid = [...c1.cookies().keys()].find((k) => k === 'workcopilot.sid')
  expect(sid, 'the hosted session cookie is set over https').toBeTruthy()

  const c2 = hostedClient(server.baseURL)
  const r = await c2.post('/api/work/login', { username: user.username, password: 'E2e-User-Pass-123!' })
  expect(r.data.mfaRequired).toBe(true)
  expect((await c2.get('/api/work/me')).data.signedIn, 'no session before the second factor').toBeFalsy()
  expect((await c2.post('/api/work/login/mfa', { code: '000000' })).status).toBe(401)
  expect((await c2.post('/api/work/login/mfa', { code: currentToken(secret) })).status).toBe(200)
  expect((await c2.get('/api/work/me')).data.signedIn).toBe(true)

  const c3 = hostedClient(server.baseURL)
  await c3.post('/api/work/login', { username: user.username, password: 'E2e-User-Pass-123!' })
  expect((await c3.post('/api/work/login/mfa', { code: backupCodes[0] })).status, 'a backup code works once').toBe(200)
  const c4 = hostedClient(server.baseURL)
  await c4.post('/api/work/login', { username: user.username, password: 'E2e-User-Pass-123!' })
  expect((await c4.post('/api/work/login/mfa', { code: backupCodes[0] })).status, 'and not twice').toBe(401)
})

test('creating an API key and replacing the export passphrase need a fresh code', async ({ server, seed, edition }) => {
  if (!capsOf(edition).has('saas_companies')) {
    // No company keys or Company Brain here: an enrolled personal account is
    // refused them even with a valid fresh code (the edition, not the code, decides).
    const solo = await seed.solo()
    const c = hostedClient(server.baseURL)
    const s = await enroll(c, solo)
    for (const [path, body] of [['/api/work/company/api-keys', { name: 'x', scopes: ['workflows:read'], expiresInDays: 30 }], ['/api/work/brain/export/key', { passphrase: 'first passphrase here' }]]) {
      const r = await c.post(path, { ...body, mfaToken: currentToken(s.secret) })
      expect([r.status, r.data && r.data.companiesDisabled], path).toEqual([403, true])
    }
    return
  }
  const co = await seed.company({ personas: ['admin', 'exec'] })
  const admin = hostedClient(server.baseURL)
  const a = await enroll(admin, co.users.admin)
  const noCode = await admin.post('/api/work/company/api-keys', { name: 'Needs step up', scopes: ['workflows:read'], expiresInDays: 30 })
  expect(noCode.status).toBe(401)
  expect(noCode.data.code).toBe('STEP_UP_REQUIRED')
  expect((await admin.post('/api/work/company/api-keys', { name: 'Needs step up', scopes: ['workflows:read'], expiresInDays: 30, mfaToken: '123456' })).status).toBe(401)
  const ok = await admin.post('/api/work/company/api-keys', { name: 'Needs step up', scopes: ['workflows:read'], expiresInDays: 30, mfaToken: currentToken(a.secret) })
  expect(ok.status).toBe(201)

  const exec = hostedClient(server.baseURL)
  const e = await enroll(exec, co.users.exec)
  expect((await exec.post('/api/work/brain/export/key', { passphrase: 'first passphrase here' })).status, 'setting the first passphrase is free').toBe(200)
  expect((await exec.post('/api/work/brain/export/key', { passphrase: 'second passphrase here' })).status, 'replacing it needs a code').toBe(401)
  expect((await exec.post('/api/work/brain/export/key', { passphrase: 'second passphrase here', mfaToken: currentToken(e.secret) })).status).toBe(200)
})

test('the login page asks for the authenticator code and signs in with it', async ({ server, seed, edition, browser }) => {
  const user = capsOf(edition).has('saas_companies') ? (await seed.company({ personas: ['member'] })).users.member : await seed.solo()
  const { secret } = await enroll(hostedClient(server.baseURL), user)
  // The browser reaches the server as "localhost" behind the same https proxy header.
  const context = await browser.newContext({ baseURL: server.baseURL.replace('127.0.0.1', 'localhost'), extraHTTPHeaders: { 'x-forwarded-proto': 'https' } })
  await context.addInitScript(() => { try { localStorage.setItem('wc_consent_v1', JSON.stringify({ version: 1, necessary: true, functional: false, analytics: false })); localStorage.setItem('wc_locale', 'en') } catch { /* ignore */ } })
  const page = await context.newPage()
  const login = new LoginPage(page)
  await login.open()
  await login.signIn(user.username, 'E2e-User-Pass-123!')
  await expect(page.getByText('Enter your authenticator code')).toBeVisible()
  // Six digits submit the form by themselves (no Verify click needed).
  await page.locator('input[name="mfa-code"]').fill(currentToken(secret))
  await expect(page).toHaveURL(/\/work$/)
  await expect(page.getByRole('heading', { level: 1 }).first()).toHaveText(/^Hello/)
  await context.close()
})

// Owner rule (2026-10-31): the company admin and the superadmin can reset a
// person's authenticator when they need to. A reset signs the person out
// everywhere and their next sign-in sets up a new authenticator; an admin of
// another company cannot touch them.
test('the company admin and the superadmin reset an authenticator; the person sets it up again', async ({ server, seed, edition }) => {
  const reason = 'Lost their phone'
  const sa = hostedClient(server.baseURL)
  await enroll(sa, { username: SUPERADMIN.username, password: SUPERADMIN.password })
  const signsInFresh = async (user) => {
    const r = await hostedClient(server.baseURL).post('/api/work/login', { username: user.username, password: 'E2e-User-Pass-123!' })
    expect(r.data.mfaSetup, `${user.username} sets up a new authenticator after the reset`).toBe(true)
  }
  if (!capsOf(edition).has('saas_companies')) {
    const solo = await seed.solo()
    const c = hostedClient(server.baseURL)
    await enroll(c, solo)
    expect((await sa.post(`/api/work/admin/users/${solo.id}/mfa/reset`, { reason })).status).toBe(200)
    expect((await c.get('/api/work/me')).data.signedIn, 'the reset signs them out').toBeFalsy()
    return signsInFresh(solo)
  }
  const a = await seed.company({ personas: ['admin', 'member'] })
  const b = await seed.company({ personas: ['admin'] })
  const adminA = hostedClient(server.baseURL); await enroll(adminA, a.users.admin)
  const adminB = hostedClient(server.baseURL); await enroll(adminB, b.users.admin)
  const member = hostedClient(server.baseURL); await enroll(member, a.users.member)
  const path = `/api/work/company/users/${a.users.member.id}/mfa/reset`
  expect((await adminB.post(path, { reason })).status, 'another company\'s admin is refused').toBe(403)
  expect((await member.post(`/api/work/company/users/${a.users.admin.id}/mfa/reset`, { reason })).status, 'a member cannot reset anyone').toBe(403)
  expect((await adminA.post(path, { reason })).status).toBe(200)
  expect((await member.get('/api/work/me')).data.signedIn, 'the reset signs them out').toBeFalsy()
  await signsInFresh(a.users.member)
  expect((await sa.post(`/api/work/admin/users/${b.users.admin.id}/mfa/reset`, { reason })).status, 'the superadmin can reset anyone').toBe(200)
  await signsInFresh(b.users.admin)
})
