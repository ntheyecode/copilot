// Corporate edition contract, end to end in every edition (no skips: where an
// edition does not offer a flow, the test checks it is refused and hidden):
//   * card payments (Stripe) and social sign-in: off on saas, on for all/paid
//   * the superadmin console shows only the sections the edition offers, and
//     the server refuses the hidden sections' admin APIs
//   * the company admin connects SAML (metadata import) and SCIM from the
//     console; a SCIM-provisioned person signs in with a signed SAML assertion
//     from a local test identity provider; SCIM deactivation signs them out
//   * AdmireVeda bills by contract: the superadmin issues an invoice, the
//     company admin sees it and downloads the PDF
//   * the organizations pricing shows the owner's prices with Talk to us only
// Screenshots of the new screens (1280 and 640, light and dark) are written to
// .e2e-results/shots/, and every one is checked for sideways scroll.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { companyTest } from '../support/edition-branch.mjs'
import { SUPERADMIN } from '../support/personas.mjs'
import { REPO } from '../support/server.mjs'
import { LegalGate } from '../pages/LegalGate.mjs'
import { ADMIN_SECTIONS, adminSectionAvailable, refusedAdminApiPrefixes } from '../../server/admin_sections.js'
import { STRIPE_ROUTE_PREFIXES } from '../../server/edition_route_gates.js'
import { ORG_PLANS, BANDS } from '../../server/org_pricing.js'
import superAdminEn from '../../src/i18n/locales/en/superAdmin.js'
import { makeIdp, buildResponse, signAssertion, b64, idpMetadata } from '../../server/test_saml_idp.mjs'

const SHOTS = path.join(REPO, '.e2e-results', 'shots')
const WIDTHS = [1280, 640]
const THEMES = ['light', 'dark']
const NAV = superAdminEn.superAdmin.nav

// Every theme x width: open, prepare, check no sideways scroll, screenshot.
async function shoot(as, user, { name, edition, path: p, ready, prepare }) {
  fs.mkdirSync(SHOTS, { recursive: true })
  const problems = []
  for (const theme of THEMES) {
    let page, context
    if (user) ({ page, context } = await as.page(user, { path: null, theme }))
    else { ({ context } = await as.context({ theme })); page = await context.newPage() }
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(p)
      await page.waitForLoadState('networkidle')
      if (ready) await page.locator(ready).first().waitFor()
      if (prepare) await prepare(page)
      await page.waitForTimeout(200)
      const m = await page.evaluate(() => ({ scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), inner: window.innerWidth }))
      if (m.scroll > m.inner + 1) problems.push(`${name} ${theme} ${width}px scrolls sideways (${m.scroll}px)`)
      await page.screenshot({ path: path.join(SHOTS, `${edition}-${name}-${width}-${theme}.png`), fullPage: true })
    }
    await context.close()
  }
  expect(problems, problems.join('\n')).toEqual([])
}

test('card payments and social sign-in follow the edition (off on saas)', async ({ as, edition }) => {
  const caps = capsOf(edition)
  const anon = await as.anon()
  for (const pre of STRIPE_ROUTE_PREFIXES) {
    const p = pre.replace(/\*/g, 'x').replace(/\/$/, '/x')
    const r = await anon.ctx.fetch(p, { method: 'POST', data: {}, failOnStatusCode: false })
    const body = (await r.json().catch(() => ({}))) || {}
    if (caps.has('stripe_billing')) expect(body.stripeDisabled, `${p} is not edition-refused on ${edition}`).toBeFalsy()
    else expect([r.status(), !!(body.stripeDisabled || body.individualPlansDisabled)], `${p} refused on ${edition}`).toEqual([403, true])
  }
  const prov = await anon.get('/api/work/social/providers')
  if (caps.has('social_login')) expect(prov.status).toBe(200)
  else expect([prov.status, prov.data && prov.data.socialDisabled]).toEqual([403, true])

  const { context } = await as.context()
  const page = await context.newPage()
  await page.goto('/workcopilot/login')
  await page.waitForLoadState('networkidle')
  const socialTab = page.getByRole('tab', { name: /Social/ })
  if (caps.has('social_login')) await expect(socialTab).toBeVisible()
  else {
    await expect(socialTab).toHaveCount(0)
    await expect(page.getByText(/Continue with (Google|Microsoft|Facebook)/)).toHaveCount(0)
  }
})

test('the superadmin console shows only what the edition offers; hidden sections are refused', async ({ as, edition }) => {
  const caps = capsOf(edition)
  const { page, api } = await as.page(SUPERADMIN, { path: '/work/admin' })
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  if (await new LegalGate(page).dialog().isVisible()) await new LegalGate(page).accept()
  const navText = await page.locator('.wka-nav').innerText()
  const hidden = []
  for (const s of ADMIN_SECTIONS) {
    const label = NAV[s.id]
    if (!label) continue
    const shown = navText.split('\n').map((x) => x.trim()).includes(label)
    expect(shown, `${s.id} (${label}) on ${edition}`).toBe(adminSectionAvailable(s.id, caps))
    if (!adminSectionAvailable(s.id, caps)) hidden.push(label)
  }
  if (hidden.length) {
    const note = page.getByTestId('wa-not-offered')
    await expect(note).toBeVisible()
    for (const label of hidden) await expect(note).toContainText(label)
  } else await expect(page.getByTestId('wa-not-offered')).toHaveCount(0)
  for (const pre of refusedAdminApiPrefixes(caps)) {
    const r = await api.ctx.fetch(pre.endsWith('/') ? `${pre}probe` : pre, { method: 'GET', failOnStatusCode: false })
    expect(r.status(), `${pre} refused on ${edition}`).toBe(403)
  }
  await shoot(as, SUPERADMIN, { name: 'superadmin-overview', edition, path: '/work/admin', ready: '.wka-nav' })
})

const SSO_REFUSE = {
  what: 'company single sign-on setup (OIDC, SAML), SCIM provisioning and company billing',
  api: [['GET', '/api/work/company/sso/overview'], ['POST', '/api/work/company/sso/saml'], ['GET', '/api/work/company/scim/tokens'], ['GET', '/api/work/scim/v2/Users'], ['GET', '/api/work/company/billing']],
  pages: ['/work/company'],
}

// The local identity provider answers the AuthnRequest with a signed
// assertion, posted back to the ACS like a real IdP's auto-submit page.
async function routeIdp(page, { idp, idpEntityId, idpHost, sp, email, name }) {
  await page.route(`https://${idpHost}/**`, async (route) => {
    const u = new URL(route.request().url())
    const raw = zlib.inflateRawSync(Buffer.from(u.searchParams.get('SAMLRequest'), 'base64')).toString('utf8')
    const id = /\sID="([^"]+)"/.exec(raw)[1]
    const xml = signAssertion(buildResponse({ idpEntityId, audience: sp.entityId, recipient: sp.acsUrl, inResponseTo: id, email, name }), idp)
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    await route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><form method="post" action="${esc(sp.acsUrl)}"><input type="hidden" name="SAMLResponse" value="${esc(b64(xml))}"><input type="hidden" name="RelayState" value="${esc(u.searchParams.get('RelayState'))}"></form><script>document.forms[0].submit()</script>` })
  })
}

companyTest(test, 'the company admin connects SAML and SCIM; a provisioned person signs in with SAML and is signed out on deactivation', SSO_REFUSE, async ({ as, seed, edition }) => {
  const co = await seed.company({ personas: ['admin'] })
  const domain = `${co.companyId}.e2e-corp.test`.toLowerCase()
  const idp = makeIdp()
  const idpHost = 'idp.e2e-corp.test'
  const idpEntityId = `https://${idpHost}/saml/${co.companyId}`
  const { page, api } = await as.page(co.users.admin, { path: '/work/company?section=sso' })
  await expect(page.getByTestId('sso-setup')).toBeVisible()
  await page.getByTestId('sso-tab-saml').click()
  const ov = (await api.get('/api/work/company/sso/overview')).data
  await expect(page.getByTestId('sso-saml-acs')).toContainText(`/api/work/sso/saml/${co.companyId}/acs`)
  await expect(page.getByTestId('sso-saml-entity')).toContainText(ov.saml.sp.entityId)

  // Paste the IdP metadata, read it, save.
  await page.getByTestId('saml-metadata').fill(idpMetadata({ entityId: idpEntityId, ssoUrl: `https://${idpHost}/sso`, certB64: idp.certB64 }))
  await page.getByRole('button', { name: 'Read metadata' }).click()
  await expect(page.getByTestId('saml-parsed')).toContainText(idpEntityId)
  await page.getByLabel('Email domain').fill(domain)
  await page.getByTestId('saml-save').click()
  await expect(page.getByTestId('sso-tab-saml')).toContainText('Connected')

  // SCIM: create a token in the console (shown once), then provision a person.
  await page.getByTestId('sso-tab-scim').click()
  await expect(page.getByTestId('sso-scim-base')).toContainText('/api/work/scim/v2')
  await page.getByLabel('Token name').fill('Okta')
  await page.getByTestId('scim-create').click()
  const secret = (await page.getByTestId('scim-secret').locator('code').innerText()).trim()
  expect(secret).toMatch(/^wcp_scim_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/)
  const anon = await as.anon()
  const scim = (method, p, data) => anon.ctx.fetch(`/api/work/scim/v2${p}`, { method, data, headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/scim+json' }, failOnStatusCode: false })
  const email = `jane@${domain}`
  const created = await scim('POST', '/Users', { schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], userName: email, name: { givenName: 'Jane', familyName: 'Roe' }, emails: [{ primary: true, value: email }], active: true })
  expect(created.status()).toBe(201)
  const janeId = (await created.json()).id

  // Screens: SAML and SCIM tabs, 1280 / 640, light / dark.
  await shoot(as, co.users.admin, { name: 'sso-saml', edition, path: '/work/company?section=sso', ready: '[data-testid="sso-setup"]', prepare: (p) => p.getByTestId('sso-tab-saml').click() })
  await shoot(as, co.users.admin, { name: 'sso-scim', edition, path: '/work/company?section=sso', ready: '[data-testid="sso-setup"]', prepare: (p) => p.getByTestId('sso-tab-scim').click() })
  await shoot(as, co.users.admin, { name: 'sso-oidc', edition, path: '/work/company?section=sso', ready: '[data-testid="sso-setup"]', prepare: (p) => p.getByTestId('sso-tab-oidc').click() })

  // The sign-in page resolves the domain to SAML.
  const resolved = await anon.get(`/api/work/sso/resolve?domain=${encodeURIComponent(domain)}`)
  expect([resolved.data.protocol, resolved.data.startUrl]).toEqual(['saml', `/api/work/sso/saml/${co.companyId}/login`])

  // Jane signs in through the (local) identity provider.
  const { context } = await as.context()
  const jane = await context.newPage()
  await routeIdp(jane, { idp, idpEntityId, idpHost, sp: ov.saml.sp, email, name: 'Jane Roe' })
  // Playwright routes only the first request of a redirect chain, so the SP
  // redirect is read here (same cookie jar as the page) and the browser then
  // navigates to the identity provider, which the route above answers.
  const start = await jane.request.get(resolved.data.startUrl, { maxRedirects: 0 })
  expect(start.status()).toBe(302)
  const idpUrl = start.headers().location
  expect(idpUrl.startsWith(`https://${idpHost}/sso?`)).toBe(true)
  await jane.goto(idpUrl)
  await jane.waitForURL((u) => new URL(u).pathname.startsWith('/work'))
  const me = await (await jane.request.get('/api/work/me')).json()
  expect(me.user && me.user.id).toBe(janeId)

  // The identity provider turns her off: her session ends at once.
  const off = await scim('PATCH', `/Users/${janeId}`, { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', value: { active: false } }] })
  expect(off.status()).toBe(200)
  const after = await (await jane.request.get('/api/work/me')).json()
  expect(after.user).toBeNull()
})

const ROLES_REFUSE = {
  what: 'SCIM group to role mappings',
  api: [['GET', '/api/work/company/scim/role-mappings'], ['POST', '/api/work/company/scim/role-mappings'], ['PATCH', '/api/work/scim/v2/Groups/x']],
  pages: ['/work/company'],
}

companyTest(test, 'a SCIM group mapped to project manager: adding a person to the group gives them the PM dashboard', ROLES_REFUSE, async ({ as, seed, edition }) => {
  const co = await seed.company({ personas: ['admin', 'member'] })
  const { page } = await as.page(co.users.admin, { path: '/work/company?section=sso' })
  await expect(page.getByTestId('sso-setup')).toBeVisible()
  await page.getByTestId('sso-tab-scim').click()
  await page.getByLabel('Token name').fill('Okta')
  await page.getByTestId('scim-create').click()
  const secret = (await page.getByTestId('scim-secret').locator('code').innerText()).trim()
  const anon = await as.anon()
  const scim = (method, p, data) => anon.ctx.fetch(`/api/work/scim/v2${p}`, { method, data, headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/scim+json' }, failOnStatusCode: false })

  // The identity provider pushes the group (empty), then the admin maps it in the console.
  const g = await scim('POST', '/Groups', { schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'], displayName: 'Project managers', members: [] })
  expect(g.status()).toBe(201)
  const groupId = (await g.json()).id
  await expect(page.getByTestId('scim-roles')).toBeVisible()
  await page.getByLabel('Group in your identity provider').fill('Project managers')
  await page.getByLabel('WorkCoPilot role or grant').selectOption('project_manager')
  await page.getByTestId('scim-role-add').click()
  const row = page.getByTestId('scim-role-mapping').first()
  await expect(row).toContainText('Project managers')
  await expect(row).toContainText('Project manager')
  await expect(row).toContainText('People in this group: 0')

  // Before: the member has no PM dashboard.
  const member = await as.page(co.users.member, { path: '/work' })
  await member.page.goto('/work/pm')
  await expect(member.page.getByRole('heading', { name: 'Projects I manage' })).toHaveCount(0)

  // Okta adds the member to the group over SCIM.
  const add = await scim('PATCH', `/Groups/${groupId}`, { schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'add', path: 'members', value: [{ value: co.users.member.id }] }] })
  expect(add.status()).toBe(200)

  // The same signed-in session now gets the PM dashboard on its next load.
  await member.page.goto('/work/pm')
  await expect(member.page.getByRole('heading', { name: 'Projects I manage' })).toBeVisible()

  // The console shows the role as managed by the identity provider and locks it.
  await page.goto('/work/company?section=team')
  const managed = page.getByTestId('idp-managed')
  await expect(managed).toHaveCount(1)
  await expect(managed).toContainText('Managed by your identity provider')

  await shoot(as, co.users.admin, { name: 'sso-scim-roles', edition, path: '/work/company?section=sso', ready: '[data-testid="sso-setup"]', prepare: async (p) => { await p.getByTestId('sso-tab-scim').click(); await p.getByTestId('scim-role-mapping').first().waitFor(); await p.getByTestId('scim-roles').scrollIntoViewIfNeeded() } })
  await shoot(as, co.users.admin, { name: 'company-team-idp', edition, path: '/work/company?section=team', ready: '[data-testid="idp-managed"]' })
})

const BILL_REFUSE = { what: 'company billing (contract and invoices)', api: [['GET', '/api/work/company/billing'], ['GET', '/api/work/company/invoices/x.pdf']], pages: ['/work/company'] }

companyTest(test, 'AdmireVeda bills by contract: the superadmin issues an invoice and the company admin downloads it', BILL_REFUSE, async ({ as, seed, edition }) => {
  const co = await seed.company({ personas: ['admin'] })
  const sa = await as.api(SUPERADMIN)
  expect((await sa.post(`/api/work/admin/b2b/companies/${co.companyId}/contract`, { plan: 'hosted', users: 1200, startDate: '2026-01-01', termMonths: 12, billingCycle: 'monthly', reference: 'PO-1' })).status).toBe(200)
  const inv = await sa.post(`/api/work/admin/b2b/companies/${co.companyId}/invoices`, { periodStart: '2026-01-01', periodEnd: '2026-01-31', issueDate: '2026-02-01', lines: [{ description: 'Hosted by AdmireVeda, 1,200 users, January', qty: 1200, unitAmount: 149 }] })
  expect(inv.status).toBe(200)
  expect((await sa.post(`/api/work/admin/b2b/companies/${co.companyId}/invoices/${inv.data.invoice.id}/status`, { status: 'issued' })).status).toBe(200)

  const { page } = await as.page(co.users.admin, { path: '/work/company?section=billing' })
  await expect(page.getByTestId('company-billing')).toBeVisible()
  await expect(page.getByText('$149.00 per user per month')).toBeVisible()
  const row = page.getByTestId('company-invoice').first()
  await expect(row).toContainText(inv.data.invoice.number)
  await expect(row).toContainText('$178,800.00')
  const pdf = await page.request.get(`/api/work/company/invoices/${inv.data.invoice.id}.pdf`)
  expect([pdf.status(), pdf.headers()['content-type']]).toEqual([200, 'application/pdf'])
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-')
  // No card anywhere on the billing screen.
  await expect(page.getByText(/credit card|card payment|Stripe/i)).toHaveCount(0)
  await shoot(as, co.users.admin, { name: 'company-billing', edition, path: '/work/company?section=billing', ready: '[data-testid="company-invoice"]' })

  // The superadmin Invoices section lists it.
  const s = await as.page(SUPERADMIN, { path: '/work/admin' })
  await expect(s.page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  if (await new LegalGate(s.page).dialog().isVisible()) await new LegalGate(s.page).accept()
  await s.page.locator('.wka-nav-item', { hasText: NAV.invoices }).first().click()
  await s.page.getByLabel('Company').selectOption({ label: co.name })
  await expect(s.page.getByTestId('b2b-invoice').first()).toContainText(inv.data.invoice.number)
  await expect(s.page.getByTestId('b2b-calc')).toContainText('$149.00')
  await shoot(as, SUPERADMIN, {
    name: 'superadmin-invoices', edition, path: '/work/admin', ready: '.wka-nav',
    prepare: async (p) => { await p.locator('.wka-nav-item', { hasText: NAV.invoices }).first().click(); await p.getByLabel('Company').selectOption({ label: co.name }); await p.getByTestId('b2b-invoice').first().waitFor() },
  })
})

test('pricing follows the edition: organization prices with Talk to us only on saas', async ({ as, edition }) => {
  const caps = capsOf(edition)
  const { context } = await as.context()
  const page = await context.newPage()
  await page.goto('/workcopilot/pricing')
  await page.waitForLoadState('networkidle')
  if (caps.has('individual_plans')) {
    await expect(page.locator('[data-testid^="orgp-"]')).toHaveCount(0)
    return
  }
  for (const p of ORG_PLANS) {
    const card = page.getByTestId(`orgp-${p.id}`)
    await expect(card).toBeVisible()
    if (p.flat != null) await expect(card).toContainText(`$${p.flat}`)
    else for (const b of BANDS) await expect(card).toContainText(`$${p.rates[b.id]}`)
    await expect(card.getByRole('link', { name: /Talk to us/ })).toHaveAttribute('href', '/workcopilot/contact')
  }
  await expect(page.getByText(/at least 100 users/)).toBeVisible()
  await expect(page.getByRole('button', { name: /checkout|subscribe|buy/i })).toHaveCount(0)
  await shoot(as, null, { name: 'pricing', edition, path: '/workcopilot/pricing', ready: '[data-testid="orgp-hosted"]' })
})
