// The SPA's capability view must answer every question exactly like the server,
// for every edition, from nothing but the public capability list the server
// sends (GET /api/work/edition). Runs in `npm test` (src/shared/*.test.mjs).
import test from 'node:test'
import assert from 'node:assert/strict'
import { CAPABILITIES, EDITION_IDS, DEFAULT_EDITION, makeCaps, companyTenancy as serverTenancy, copyAudience as serverAudience } from '../../server/edition_registry.js'
import { publicEdition } from '../../server/edition.js'
import { capsFromList, parseCapsStamp, sameCaps, DEFAULT_CAPS, companyTenancy, copyAudience } from './edition_caps.js'

test('client caps built from the public payload match the server for every edition and capability', () => {
  for (const id of EDITION_IDS) {
    const server = makeCaps(id)
    const client = capsFromList(publicEdition(server).capabilities)
    for (const cap of Object.keys(CAPABILITIES)) assert.equal(client.has(cap), server.has(cap), `${id}: ${cap}`)
    assert.deepEqual(client.list(), server.list(), `${id}: list order`)
    assert.equal(companyTenancy(client), serverTenancy(server), `${id}: companyTenancy`)
    assert.equal(copyAudience(client), serverAudience(server), `${id}: copyAudience`)
  }
})

test('the three hosted editions speak to the audience the owner set (2026-10-30)', () => {
  const aud = (id) => copyAudience(capsFromList(makeCaps(id).list()))
  assert.equal(aud('all'), null, 'all: both audiences, the base catalog, nothing merged')
  assert.equal(aud('saas'), 'organizations')
  assert.equal(aud('paid'), 'individuals')
  const c = (id) => capsFromList(makeCaps(id).list())
  assert.equal(c('saas').has('individual_plans'), false, 'saas sells no personal plans')
  assert.equal(c('paid').has('individual_plans'), true)
  assert.equal(companyTenancy(c('paid')), false, 'paid has no company tenants')
})

test('an unstamped build assumes the default edition, which is today\'s product', () => {
  assert.deepEqual(DEFAULT_CAPS, makeCaps(DEFAULT_EDITION).list())
})

test('unknown ids from the server are dropped; an unknown id at a call site throws', () => {
  const warnings = []
  const c = capsFromList(['solo_signup', 'from_the_future', ''], { warn: (m) => warnings.push(m) })
  assert.deepEqual(c.list(), ['solo_signup'])
  assert.equal(warnings.length, 1)
  assert.throws(() => c.has('solo_sigup'), /unknown capability "solo_sigup"/)
})

test('the meta stamp parses, and set equality ignores order', () => {
  assert.equal(parseCapsStamp(null), null)
  assert.deepEqual(parseCapsStamp(' a, b ,,c '), ['a', 'b', 'c'])
  assert.ok(sameCaps(capsFromList(['public_site', 'solo_signup']), capsFromList(['solo_signup', 'public_site'])))
  assert.ok(!sameCaps(capsFromList(['solo_signup']), capsFromList(['public_site'])))
})
