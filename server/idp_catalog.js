// ---------------------------------------------------------------------------
// The ONE catalog of identity providers a company can connect for single
// sign-on (SUPREME RULE II: one list, no parallel copies).
// ---------------------------------------------------------------------------
// Both engines are generic: OIDC (sso.js: discovery + Authorization Code +
// PKCE) and SAML 2.0 (saml_sso.js). So any standards-compliant provider works
// with the catch-all rows ('oidc', 'saml'); the named rows only add the brand
// label and a hint of what to paste. Adding a row makes it appear in every
// surface: the company console setup screens, the superadmin company card, the
// setup guide and the server's allowlist (store.setCompanySso).
//
// Pure data, no imports, so the SPA imports it directly (src/shared/
// oidc_providers.js re-exports the OIDC view). Brand names are never
// translated, so labels live here as plain text, never in i18n.
//
//   id    stored value and what the backend accepts
//   label dropdown / badge label (same in every locale)
//   oidc  example issuer for OpenID Connect, or null when the provider has no
//         OIDC sign-in for workforce apps
//   saml  true when the provider offers SAML 2.0 for workforce apps
// ---------------------------------------------------------------------------
export const IDENTITY_PROVIDERS = Object.freeze([
  { id: 'google', label: 'Google Workspace', oidc: 'https://accounts.google.com', saml: true },
  { id: 'microsoft', label: 'Microsoft Entra ID', oidc: 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0', saml: true },
  { id: 'okta', label: 'Okta', oidc: 'https://YOUR_ORG.okta.com', saml: true },
  { id: 'auth0', label: 'Auth0', oidc: 'https://YOUR_TENANT.us.auth0.com', saml: true },
  { id: 'onelogin', label: 'OneLogin', oidc: 'https://YOUR_ORG.onelogin.com/oidc/2', saml: true },
  { id: 'ping', label: 'Ping Identity (PingOne, PingFederate)', oidc: 'https://auth.pingone.com/ENV_ID/as', saml: true },
  { id: 'jumpcloud', label: 'JumpCloud', oidc: 'https://oauth.id.jumpcloud.com/', saml: true },
  { id: 'keycloak', label: 'Keycloak', oidc: 'https://YOUR_HOST/realms/YOUR_REALM', saml: true },
  { id: 'cognito', label: 'AWS Cognito', oidc: 'https://cognito-idp.REGION.amazonaws.com/POOL_ID', saml: false },
  { id: 'azuread_b2c', label: 'Microsoft Entra B2C', oidc: 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/v2.0', saml: false },
  { id: 'authentik', label: 'Authentik', oidc: 'https://YOUR_HOST/application/o/SLUG/', saml: true },
  { id: 'duo', label: 'Duo', oidc: 'https://sso.YOUR_ORG.duosecurity.com/oidc/CLIENT', saml: true },
  { id: 'centrify', label: 'CyberArk Identity (Centrify)', oidc: 'https://YOUR_TENANT.my.centrify.com/OIDC', saml: true },
  // Added 2026-10-30 (every major enterprise IdP in place).
  { id: 'adfs', label: 'Microsoft AD FS', oidc: 'https://adfs.YOUR_DOMAIN/adfs', saml: true },
  { id: 'ibm', label: 'IBM Security Verify', oidc: 'https://YOUR_TENANT.verify.ibm.com/oidc/endpoint/default', saml: true },
  { id: 'oracle', label: 'Oracle Identity Domains (OCI IAM)', oidc: 'https://idcs-YOUR_ID.identity.oraclecloud.com', saml: true },
  { id: 'forgerock', label: 'Ping Advanced Identity Cloud (ForgeRock)', oidc: 'https://YOUR_TENANT.forgeblocks.com/am/oauth2/realms/root/realms/alpha', saml: true },
  { id: 'salesforce', label: 'Salesforce Identity', oidc: 'https://YOUR_DOMAIN.my.salesforce.com', saml: true },
  { id: 'omnissa', label: 'Omnissa Access (Workspace ONE)', oidc: 'https://YOUR_TENANT.vmwareidentity.com/SAAS/auth', saml: true },
  { id: 'zitadel', label: 'ZITADEL', oidc: 'https://YOUR_INSTANCE.zitadel.cloud', saml: true },
  { id: 'fusionauth', label: 'FusionAuth', oidc: 'https://YOUR_HOST', saml: true },
  { id: 'wso2', label: 'WSO2 Identity Server', oidc: 'https://YOUR_HOST/oauth2/token', saml: true },
  { id: 'shibboleth', label: 'Shibboleth', oidc: null, saml: true },
  { id: 'rippling', label: 'Rippling', oidc: null, saml: true },
  // The catch-alls stay last.
  { id: 'oidc', label: 'Other (any OpenID Connect)', oidc: 'https://your-identity-provider/...', saml: false },
  { id: 'saml', label: 'Other (any SAML 2.0)', oidc: null, saml: true },
])

export const OIDC_PROVIDERS = Object.freeze(IDENTITY_PROVIDERS.filter((p) => p.oidc).map((p) => Object.freeze({ id: p.id, label: p.label, issuerExample: p.oidc })))
export const OIDC_PROVIDER_IDS = Object.freeze(OIDC_PROVIDERS.map((p) => p.id))
export const SAML_PROVIDERS = Object.freeze(IDENTITY_PROVIDERS.filter((p) => p.saml).map((p) => Object.freeze({ id: p.id, label: p.label })))
export const SAML_PROVIDER_IDS = Object.freeze(SAML_PROVIDERS.map((p) => p.id))
export const IDP_LABELS = Object.freeze(Object.fromEntries(IDENTITY_PROVIDERS.map((p) => [p.id, p.label])))
export const idpLabel = (id) => IDP_LABELS[id] || id
