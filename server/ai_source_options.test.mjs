// The 3-way company AI setup registry (src/shared/ai_source_options.js): the
// one list behind the superadmin create form, the superadmin company card and
// the company console. Guards: exactly three options, the stored-source mapping,
// which option a public company payload resolves to (owner tells the two
// 'company' options apart; the operator's pending pick covers the no-key case),
// and readiness derived the way the server reports aiReady.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AI_SETUP_OPTIONS, AI_SETUP_IDS, aiSourceFor, aiSetupOf, aiReadiness, isAiSetupId } from '../src/shared/ai_source_options.js'

test('registry: three options, two share aiSource company, one is platform', () => {
  assert.deepEqual(AI_SETUP_IDS, ['client', 'managed', 'platform'])
  assert.equal(AI_SETUP_OPTIONS.filter((o) => o.aiSource === 'company').length, 2)
  assert.equal(AI_SETUP_OPTIONS.filter((o) => o.aiSource === 'platform').length, 1)
  assert.ok(Object.isFrozen(AI_SETUP_OPTIONS), 'registry is read-only')
})

test('aiSourceFor maps every option to a stored source the server accepts', () => {
  assert.equal(aiSourceFor('client'), 'company')
  assert.equal(aiSourceFor('managed'), 'company')
  assert.equal(aiSourceFor('platform'), 'platform')
  assert.equal(aiSourceFor(''), null)
  assert.equal(aiSourceFor('bogus'), null)
  assert.equal(isAiSetupId('platform'), true)
  assert.equal(isAiSetupId('bogus'), false)
})

test('aiSetupOf: platform wins, owner tells client from managed, pending covers no-key', () => {
  assert.equal(aiSetupOf({ aiSource: 'platform' }), 'platform')
  assert.equal(aiSetupOf({ aiSource: 'platform', companyAi: { owner: 'corporate' } }), 'platform', 'stored source is authoritative over a leftover key owner')
  assert.equal(aiSetupOf({ aiSource: 'company', companyAi: { owner: 'company', keyMasked: '••••1234' } }), 'client')
  assert.equal(aiSetupOf({ aiSource: 'company', companyAi: { owner: 'corporate', keyMasked: '••••1234' } }), 'managed')
  // No key yet: the operator's pick for the session, defaulting to client.
  assert.equal(aiSetupOf({ aiSource: 'company', companyAi: null }), 'client')
  assert.equal(aiSetupOf({ aiSource: 'company', companyAi: null }, 'managed'), 'managed')
  assert.equal(aiSetupOf({ aiSource: 'company', companyAi: null }, 'platform'), 'client', 'a pending pick that contradicts the stored source is ignored')
  // Not selected yet.
  assert.equal(aiSetupOf({ aiSource: null }), null)
  assert.equal(aiSetupOf({ aiSource: null }, 'platform'), 'platform', 'a pending pick shows before the patch lands')
  assert.equal(aiSetupOf(null), null)
  assert.equal(aiSetupOf(null, 'bogus'), null)
})

test('aiReadiness mirrors publicCompany.aiReady', () => {
  assert.equal(aiReadiness({}, 'platform'), 'ready', 'platform keys are ready at once')
  assert.equal(aiReadiness({ hasCompanyAi: false }, 'client'), 'needs_key')
  assert.equal(aiReadiness({ hasCompanyAi: false }, 'managed'), 'needs_key')
  assert.equal(aiReadiness({ hasCompanyAi: true }, 'client'), 'ready')
  assert.equal(aiReadiness({ companyAi: { keyMasked: '••••1234' } }, 'managed'), 'ready', 'the narrowed company-admin payload (keyMasked only) still reads as ready')
  assert.equal(aiReadiness({}, ''), 'unselected')
  assert.equal(aiReadiness(null, null), 'unselected')
})
