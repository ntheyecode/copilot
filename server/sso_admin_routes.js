// ---------------------------------------------------------------------------
// Company console + superadmin routes for single sign-on setup: the SAML
// connection, SCIM provisioning tokens, the test sign-in result and the
// superadmin's "single sign-on required" switch. The OIDC config routes stay in
// sso.js (unchanged contract).
//
// Every company route is scoped to the caller's OWN company (req.workUser.
// companyId); a company admin can never read or change another tenant.
// Creating a SCIM token needs an MFA step-up on the hosted service (the shared
// policy in mfa_step_up.js, same as API keys). Secrets never reach a log.
// ---------------------------------------------------------------------------
import { publicOrigin, callbackUrl } from './sso.js'
import { spValues, parseIdpMetadata, normalizeCerts } from './saml_rules.js'
import { SCIM_BASE_PATH } from './scim.js'
import { makeMfaStepUp } from './mfa_step_up.js'
import { registerScimRoleRoutes } from './scim_role_routes.js'

export function registerSsoAdminRoutes(app, deps = {}) {
  const { store, requireAuth, requireWorkAuth, requireSuperAdmin, requireCompanyAdmin, wrap, hosted = false } = deps
  if (!app || !store || !requireAuth || !requireWorkAuth || !requireSuperAdmin || !requireCompanyAdmin || !wrap) throw new Error('registerSsoAdminRoutes: missing required deps')
  const stepUp = makeMfaStepUp({ verifyMfa: (u, t) => store.verifyUserMfa(u.id, t), hosted, mfaGloballyEnabled: () => store.mfaGloballyEnabled() })
  const who = (req) => (req.user && (req.user.username || req.user.id)) || 'unknown'

  // Everything the setup screens show for one company: the copy-ready SP values
  // for OIDC, SAML and SCIM, the live status of each, and the last test result.
  function overview(req, companyId) {
    const c = store.getCompany(companyId)
    if (!c) { const e = new Error('Company not found.'); e.status = 404; throw e }
    const origin = publicOrigin(req)
    const oidc = store.getCompanySsoConfig(companyId)
    return {
      companyId,
      provisioning: c.ssoProvisioning,
      ssoRequired: !!c.ssoRequired,
      oidc: {
        redirectUri: callbackUrl(req),
        status: oidc ? { provider: oidc.provider || null, connected: !!oidc.connected, domain: oidc.domain || '', issuer: oidc.issuer || '', clientId: oidc.clientId || '', hasSecret: !!oidc.clientSecret } : null,
      },
      saml: { sp: spValues(origin, companyId), status: store.samlStatus(companyId) },
      scim: { baseUrl: origin + SCIM_BASE_PATH, tokens: store.listScimTokens(companyId) },
      lastTest: store.lastSsoTest(companyId),
    }
  }

  // ---- company admin (own company) ----------------------------------------
  app.get('/api/work/company/sso/overview', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(overview(req, req.workUser.companyId))
  }))
  // Read a pasted IdP metadata document (or certificate) WITHOUT saving it, so
  // the screen can show what was found before the admin saves.
  app.post('/api/work/company/sso/saml/parse', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const b = req.body || {}
    if (b.metadataXml) {
      const md = parseIdpMetadata(b.metadataXml)
      const certs = normalizeCerts(md.certs.join('\n\n'))
      return res.json({ idpEntityId: md.entityId, idpSsoUrl: md.ssoUrl, certs: certs.map(({ fingerprint, subject, notAfter, expired }) => ({ fingerprint, subject, notAfter, expired })) })
    }
    const certs = normalizeCerts(b.idpCert || '')
    res.json({ certs: certs.map(({ fingerprint, subject, notAfter, expired }) => ({ fingerprint, subject, notAfter, expired })) })
  }))
  app.post('/api/work/company/sso/saml', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ saml: store.setCompanySaml(req.workUser.companyId, req.body || {}, { by: who(req) }) })
  }))
  app.delete('/api/work/company/sso/saml', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.clearCompanySaml(req.workUser.companyId, { by: who(req) }))
  }))
  app.get('/api/work/company/sso/test-result', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ result: store.lastSsoTest(req.workUser.companyId) })
  }))
  app.get('/api/work/company/scim/tokens', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json({ tokens: store.listScimTokens(req.workUser.companyId), baseUrl: publicOrigin(req) + SCIM_BASE_PATH })
  }))
  app.post('/api/work/company/scim/tokens', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    const b = req.body || {}
    stepUp.assertStepUp(req.user, b.mfaToken, { message: 'Enter a current authenticator code to create a provisioning token.' })
    // The secret is in this response only; it is never stored or logged.
    res.json(store.createScimToken(req.workUser.companyId, req.workUser.id, { name: b.name }))
  }))
  app.delete('/api/work/company/scim/tokens/:id', requireWorkAuth, requireCompanyAdmin, wrap((req, res) => {
    res.json(store.revokeScimToken(req.workUser.companyId, req.params.id, req.workUser.id))
  }))
  // Group -> role mappings (their own module; same company scope and gates).
  registerScimRoleRoutes(app, { store, requireWorkAuth, requireCompanyAdmin, wrap })

  // ---- superadmin --------------------------------------------------------------
  app.get('/api/work/admin/companies/:id/sso-overview', requireAuth, requireSuperAdmin, wrap((req, res) => {
    res.json(overview(req, req.params.id))
  }))
  app.post('/api/work/admin/companies/:id/saml', requireAuth, requireSuperAdmin, wrap((req, res) => {
    res.json({ saml: store.setCompanySaml(req.params.id, req.body || {}, { by: who(req) }) })
  }))
  // Require single sign-on for every account of this company (password
  // sign-in refused). Only AdmireVeda (the superadmin) sets this.
  app.post('/api/work/admin/companies/:id/sso-required', requireAuth, requireSuperAdmin, wrap((req, res) => {
    const b = req.body || {}
    res.json(store.setCompanySsoRequired(req.params.id, !!b.required, { by: who(req), reason: b.reason }))
  }))
}

export default { registerSsoAdminRoutes }
