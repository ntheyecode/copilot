// The OpenID Connect view of the ONE identity provider catalog
// (server/idp_catalog.js; SUPREME RULE II: one list, no parallel copies). The
// catalog lives in server/ so the server's allowlist and every admin surface
// read the same rows; this module only keeps the names the SPA already uses.
//   id            - the value stored and sent to the backend
//   label         - the dropdown / badge label (brand name, same in every locale)
//   issuerExample - the placeholder / example issuer shown as a hint
import { OIDC_PROVIDERS, OIDC_PROVIDER_IDS, SAML_PROVIDERS, SAML_PROVIDER_IDS, IDP_LABELS, idpLabel } from '../../server/idp_catalog.js'

export { OIDC_PROVIDERS, OIDC_PROVIDER_IDS, SAML_PROVIDERS, SAML_PROVIDER_IDS, IDP_LABELS, idpLabel }
export const OIDC_PROVIDER_LABELS = Object.fromEntries(OIDC_PROVIDERS.map((p) => [p.id, p.label]))
export const OIDC_ISSUER_EXAMPLES = Object.fromEntries(OIDC_PROVIDERS.map((p) => [p.id, p.issuerExample]))
export const oidcLabel = (id) => OIDC_PROVIDER_LABELS[id] || id
export const oidcIssuerExample = (id) => OIDC_ISSUER_EXAMPLES[id] || ''
