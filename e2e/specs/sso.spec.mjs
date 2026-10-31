// Company single sign-on (OIDC), end to end, against a local mock identity
// provider (support/boot/fake-oidc.mjs): discovery, JWKS and an RS256-signed
// id_token. The person signs in from the login page ("sign in with your
// company", by email domain); the browser goes to the provider and back
// through the product's real OIDC code (server/sso.js: PKCE, state, nonce,
// token exchange, signature check against the JWKS). The provider's https host
// is answered by the mock on both sides (net-fakes.mjs in the server; in the
// browser, pages/idp-route.mjs sends the start redirect to the mock's loopback
// address); nothing reaches a real provider.
// Editions without companies check company SSO as refused (no skips).
import { test, expect } from '../support/fixtures.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { LoginPage } from '../pages/LoginPage.mjs'
import { routeIdp } from '../pages/idp-route.mjs'
import { FAKE_IDP_ISSUER, FAKE_IDP_CLIENT } from '../support/boot/fake-oidc.mjs'

const REFUSED = {
  api: [['GET', '/api/work/company/sso'], ['POST', '/api/work/company/sso'], ['GET', '/api/work/sso/resolve?domain=example.com']],
  what: 'company single sign-on',
}

// A company with SSO connected to the mock provider, and one pre-provisioned
// person (invite-only: only provisioned emails may sign in).
async function companyWithSso({ seed, as }) {
  const co = await seed.company({ personas: ['admin'] })
  const domain = `${seed.prefix()}.e2e-corp.net`
  const admin = await as.api(co.users.admin)
  const cfg = await admin.post('/api/work/company/sso', { provider: 'oidc', issuer: FAKE_IDP_ISSUER, ...FAKE_IDP_CLIENT, domain })
  expect(cfg.status, JSON.stringify(cfg.data)).toBe(200)
  const email = `pat.lee@${domain}`
  const add = await admin.post('/api/work/company/users', { email, companyRole: 'member' })
  expect(add.status, JSON.stringify(add.data)).toBe(200)
  return { co, domain, email }
}

async function signInWithCompany(as, server, domain) {
  const { context } = await as.context()
  const idpSeen = await routeIdp(context, server.info.idpPort)
  const page = await context.newPage()
  const login = new LoginPage(page)
  await login.open()
  await page.locator('button.wl-ssoentry').click()
  await page.locator('#wl-sso-domain').fill(domain)
  await page.locator('.wl-ssostep form button[type=submit]').click()
  return { page, context, idpSeen }
}

companyTest(test, 'a company user signs in through the OIDC provider and lands in the app', REFUSED, async ({ as, seed, server }) => {
  const { co, domain, email } = await companyWithSso({ seed, as })
  await server.ctl('idp.configure', { email, mode: 'ok' })
  const { page, idpSeen } = await signInWithCompany(as, server, domain)

  await expect(page).toHaveURL(/\/work(\/|$|\?)/, { timeout: 20_000 })
  const me = await (await page.request.get('/api/work/me')).json()
  expect(me.signedIn).toBe(true)
  expect([me.user.companyId, String(me.user.ssoEmail || me.user.email || '').toLowerCase()]).toEqual([co.companyId, email])

  // The browser visited the provider's authorize page; the server read the
  // discovery document, exchanged the code with a PKCE verifier and fetched the
  // signing keys to check the id_token signature.
  expect(idpSeen).toContain('/authorize')
  const calls = (await server.ctl('idp.calls')).map((c) => c.path)
  expect(calls).toEqual(expect.arrayContaining(['/.well-known/openid-configuration', '/authorize', '/token', '/jwks']))
  expect((await server.ctl('idp.calls')).find((c) => c.path === '/token').pkce).toBe('ok')
})

companyTest(test, 'a token signed with the wrong key, or an email that was never provisioned, is refused', REFUSED, async ({ as, seed, server }) => {
  const { domain, email } = await companyWithSso({ seed, as })

  // Forged signature: the id_token is signed with a key the provider never published.
  await server.ctl('idp.configure', { email, mode: 'tamper' })
  let r = await signInWithCompany(as, server, domain)
  await expect(r.page).toHaveURL(/\/workcopilot\/login\?sso_error=/, { timeout: 20_000 })
  expect(decodeURIComponent(new URL(r.page.url()).searchParams.get('sso_error'))).toMatch(/could not be verified/)
  expect((await (await r.page.request.get('/api/work/me')).json()).signedIn).toBe(false)

  // A person the company never added (invite-only), with a valid token.
  await server.ctl('idp.configure', { email: `stranger@${domain}`, mode: 'ok' })
  r = await signInWithCompany(as, server, domain)
  await expect(r.page).toHaveURL(/\/workcopilot\/login\?sso_error=/, { timeout: 20_000 })
  expect((await (await r.page.request.get('/api/work/me')).json()).signedIn).toBe(false)
})
