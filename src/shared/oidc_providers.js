// SINGLE SOURCE OF TRUTH for the OpenID Connect identity providers the company
// SSO connector accepts (SUPREME RULE II: one list, no parallel copies). The
// engine is generic OIDC, so adding a row here makes it appear in every surface:
// the superadmin company card, the company console, and the setup guide. Brand
// names are not translated, so the label lives here as plain text, never in i18n.
//   id            - the value stored and sent to the backend
//   label         - the dropdown / badge label (brand name, same in every locale)
//   issuerExample - the placeholder / example issuer shown as a hint
export const OIDC_PROVIDERS = [
  { id: 'google', label: 'Google Workspace', issuerExample: 'https://accounts.google.com' },
  { id: 'microsoft', label: 'Microsoft Entra ID', issuerExample: 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0' },
  { id: 'okta', label: 'Okta', issuerExample: 'https://YOUR_ORG.okta.com' },
  { id: 'auth0', label: 'Auth0', issuerExample: 'https://YOUR_TENANT.us.auth0.com' },
  { id: 'onelogin', label: 'OneLogin', issuerExample: 'https://YOUR_ORG.onelogin.com/oidc/2' },
  { id: 'ping', label: 'Ping Identity (PingOne)', issuerExample: 'https://auth.pingone.com/ENV_ID/as' },
  { id: 'jumpcloud', label: 'JumpCloud', issuerExample: 'https://oauth.id.jumpcloud.com/' },
  { id: 'keycloak', label: 'Keycloak', issuerExample: 'https://YOUR_HOST/realms/YOUR_REALM' },
  { id: 'cognito', label: 'AWS Cognito', issuerExample: 'https://cognito-idp.REGION.amazonaws.com/POOL_ID' },
  { id: 'azuread_b2c', label: 'Microsoft Entra B2C', issuerExample: 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/v2.0' },
  { id: 'authentik', label: 'Authentik', issuerExample: 'https://YOUR_HOST/application/o/SLUG/' },
  { id: 'duo', label: 'Duo', issuerExample: 'https://sso.YOUR_ORG.duosecurity.com/oidc/CLIENT' },
  { id: 'centrify', label: 'Centrify', issuerExample: 'https://YOUR_TENANT.my.centrify.com/OIDC' },
  { id: 'oidc', label: 'Other (any OpenID Connect)', issuerExample: 'https://your-identity-provider/...' },
]
export const OIDC_PROVIDER_IDS = OIDC_PROVIDERS.map((p) => p.id)
export const OIDC_PROVIDER_LABELS = Object.fromEntries(OIDC_PROVIDERS.map((p) => [p.id, p.label]))
export const OIDC_ISSUER_EXAMPLES = Object.fromEntries(OIDC_PROVIDERS.map((p) => [p.id, p.issuerExample]))
export const oidcLabel = (id) => OIDC_PROVIDER_LABELS[id] || id
export const oidcIssuerExample = (id) => OIDC_ISSUER_EXAMPLES[id] || ''
