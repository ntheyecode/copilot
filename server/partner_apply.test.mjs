import test from 'node:test'
import assert from 'node:assert/strict'
import { readPartnerApplication, partnerMessage, PARTNER_TYPES } from './partner_apply.js'

const ok = { name: 'Dana Lee', email: 'dana@si.example', company: 'Northwind SI', website: 'northwind.example', type: 'Implementation', regions: 'EMEA', industries: 'Manufacturing, Pharma', teamSize: '50-200', note: 'We run MES rollouts.' }

test('a complete application is accepted and laid out for the inbox', () => {
  const a = readPartnerApplication(ok)
  assert.equal(a.type, 'implementation')
  const m = partnerMessage(a)
  assert.match(m, /^Partner application \(implementation\)/)
  assert.match(m, /Company: Northwind SI/)
  assert.match(m, /Industries: Manufacturing, Pharma/)
  assert.deepEqual([...PARTNER_TYPES], ['reseller', 'implementation', 'referral', 'technology'])
})

test('missing basics, a bad email, an unknown type or a bad website are refused with what to fix', () => {
  assert.throws(() => readPartnerApplication({ ...ok, company: '' }), /company are required/)
  assert.throws(() => readPartnerApplication({ ...ok, email: 'nope' }), /valid email/)
  assert.throws(() => readPartnerApplication({ ...ok, type: 'investor' }), /how you would like to partner/)
  assert.throws(() => readPartnerApplication({ ...ok, website: 'not a site' }), /company website/)
  assert.doesNotThrow(() => readPartnerApplication({ ...ok, website: '' }))
})
