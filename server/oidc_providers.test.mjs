// Gate for the single identity provider catalog (SUPREME RULE II): if a copy
// drifts back or the list loses a field, this goes red. The admin surfaces
// derive their dropdowns, labels and issuer hints from this one module, and the
// store's allowlist is the same list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OIDC_PROVIDERS, OIDC_PROVIDER_IDS, OIDC_PROVIDER_LABELS, oidcLabel, oidcIssuerExample, SAML_PROVIDER_IDS } from '../src/shared/oidc_providers.js'
import { IDENTITY_PROVIDERS } from './idp_catalog.js'

test('registry: every OIDC provider has a label and an example issuer; the generic catch-all is last', () => {
  assert.equal(OIDC_PROVIDER_IDS[OIDC_PROVIDER_IDS.length - 1], 'oidc')
  for (const p of OIDC_PROVIDERS) {
    assert.ok(p.id && typeof p.id === 'string', 'id')
    assert.ok(p.label && typeof p.label === 'string', p.id + ' needs a label')
    assert.ok(p.issuerExample && typeof p.issuerExample === 'string', p.id + ' needs an issuerExample')
  }
  assert.equal(new Set(IDENTITY_PROVIDERS.map((p) => p.id)).size, IDENTITY_PROVIDERS.length, 'ids are unique')
})
test('registry: every major enterprise identity provider is present (OIDC and SAML)', () => {
  for (const id of ['google', 'microsoft', 'okta', 'adfs', 'ping', 'onelogin', 'jumpcloud', 'keycloak', 'auth0', 'duo', 'centrify', 'ibm', 'oracle', 'forgerock', 'salesforce', 'omnissa']) {
    assert.ok(OIDC_PROVIDER_IDS.includes(id), `OIDC: ${id}`)
    assert.ok(SAML_PROVIDER_IDS.includes(id), `SAML: ${id}`)
  }
  for (const id of ['shibboleth', 'rippling', 'saml']) assert.ok(SAML_PROVIDER_IDS.includes(id), `SAML: ${id}`)
  assert.equal(SAML_PROVIDER_IDS[SAML_PROVIDER_IDS.length - 1], 'saml')
})
test('registry: the server allowlist is the catalog (no parallel list)', async () => {
  process.env.WORK_DATA_DIR = process.env.WORK_DATA_DIR || (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'wcp-idp-'))
  const store = await import('./store.js')
  assert.deepEqual([...store.SSO_PROVIDERS], [...OIDC_PROVIDER_IDS])
})
test('registry: derived maps + helpers', () => {
  assert.equal(OIDC_PROVIDER_LABELS.google, 'Google Workspace')
  assert.equal(oidcLabel('okta'), 'Okta')
  assert.equal(oidcLabel('adfs'), 'Microsoft AD FS')
  assert.equal(oidcLabel('made-up'), 'made-up')                           // falls back to the id
  assert.equal(oidcIssuerExample('google'), 'https://accounts.google.com')
  assert.equal(oidcIssuerExample('made-up'), '')
})
