// Gate for the single OIDC provider registry (SUPREME RULE II): if a copy drifts
// back or the list loses a field, this goes red. The admin surfaces derive their
// dropdown, labels and issuer hints from this one module.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OIDC_PROVIDERS, OIDC_PROVIDER_IDS, OIDC_PROVIDER_LABELS, oidcLabel, oidcIssuerExample } from '../src/shared/oidc_providers.js'

test('registry: 14 providers in order, each with a label and an example issuer', () => {
  const ids = ['google','microsoft','okta','auth0','onelogin','ping','jumpcloud','keycloak','cognito','azuread_b2c','authentik','duo','centrify','oidc']
  assert.equal(OIDC_PROVIDERS.length, ids.length)
  assert.deepEqual(OIDC_PROVIDER_IDS, ids)
  assert.equal(OIDC_PROVIDER_IDS[OIDC_PROVIDER_IDS.length - 1], 'oidc')   // generic catch-all last
  for (const p of OIDC_PROVIDERS) {
    assert.ok(p.id && typeof p.id === 'string', 'id')
    assert.ok(p.label && typeof p.label === 'string', p.id + ' needs a label')
    assert.ok(p.issuerExample && typeof p.issuerExample === 'string', p.id + ' needs an issuerExample')
  }
})
test('registry: derived maps + helpers', () => {
  assert.equal(OIDC_PROVIDER_LABELS.google, 'Google Workspace')
  assert.equal(oidcLabel('okta'), 'Okta')
  assert.equal(oidcLabel('made-up'), 'made-up')                           // falls back to the id
  assert.equal(oidcIssuerExample('google'), 'https://accounts.google.com')
  assert.equal(oidcIssuerExample('made-up'), '')
})
