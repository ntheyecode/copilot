// The superadmin console per edition (server/admin_sections.js): one registry
// says which sections an edition offers; the console hides the rest and the
// route gate refuses their admin APIs. Both read the same rows, tested here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { makeCaps, EDITION_IDS } from './edition_registry.js'
import { ADMIN_SECTIONS, ADMIN_SECTION_IDS, adminSectionAvailable, unavailableAdminSections, refusedAdminApiPrefixes } from './admin_sections.js'
import { routeRefusal } from './edition_route_gates.js'

const hidden = (id) => unavailableAdminSections(makeCaps(id))

test('all: every section is offered (today\'s product, unchanged)', () => {
  assert.deepEqual(hidden('all'), [])
})

test('saas: no individual-only, Stripe or social sections; company sections stay', () => {
  assert.deepEqual(hidden('saas').sort(), ['affiliates', 'billing', 'cancelled', 'pricing', 'social', 'subscribers'].sort())
  for (const id of ['companies', 'invoices', 'governance', 'notifications', 'users', 'finance', 'leads', 'hero']) assert.ok(adminSectionAvailable(id, makeCaps('saas')), id)
})

test('paid: no company sections; individual, Stripe and social sections stay', () => {
  assert.deepEqual(hidden('paid').sort(), ['companies', 'governance', 'invoices', 'notifications'].sort())
  for (const id of ['subscribers', 'cancelled', 'pricing', 'billing', 'social', 'affiliates']) assert.ok(adminSectionAvailable(id, makeCaps('paid')), id)
})

test('an unknown section id fails loudly (a console tab added without a registry row)', () => {
  assert.throws(() => adminSectionAvailable('made-up', makeCaps('all')), /unknown section/)
})

test('the server refuses exactly the admin API families of the hidden sections', () => {
  for (const id of EDITION_IDS) {
    const c = makeCaps(id)
    const refused = new Set(refusedAdminApiPrefixes(c))
    for (const s of ADMIN_SECTIONS) {
      for (const pre of s.api) {
        const p = pre.endsWith('/') ? pre + 'x' : pre
        assert.equal(!!routeRefusal('GET', p, c), refused.has(pre), `${id}: ${p}`)
      }
    }
  }
  // spot checks with the real paths the console calls
  assert.equal(routeRefusal('GET', '/api/work/admin/subscribers', makeCaps('saas')).status, 403)
  assert.equal(routeRefusal('GET', '/api/work/admin/subscribers/cancelled', makeCaps('saas')).status, 403)
  assert.equal(routeRefusal('POST', '/api/work/admin/pricing', makeCaps('saas')).status, 403)
  assert.equal(routeRefusal('GET', '/api/work/admin/affiliate-config', makeCaps('saas')).status, 403)
  assert.equal(routeRefusal('GET', '/api/work/admin/affiliates', makeCaps('saas')).status, 403)
  assert.equal(routeRefusal('GET', '/api/work/admin/companies', makeCaps('paid')).body.companiesDisabled, true)
  assert.equal(routeRefusal('GET', '/api/work/admin/companies/co1/billing', makeCaps('paid')).body.companiesDisabled, true)
  assert.equal(routeRefusal('GET', '/api/work/admin/notifications', makeCaps('paid')).body.companiesDisabled, true)
  assert.equal(routeRefusal('GET', '/api/work/admin/b2b/invoices', makeCaps('paid')).body.companiesDisabled, true)
  assert.equal(routeRefusal('GET', '/api/work/admin/companies', makeCaps('saas')), null)
  assert.equal(routeRefusal('GET', '/api/work/admin/users', makeCaps('saas')), null)
})

test('every section of the superadmin console has a registry row (no unregistered tab)', () => {
  const src = fs.readFileSync(new URL('../src/pages/workadmin/WorkAdmin.jsx', import.meta.url), 'utf8')
  const block = src.slice(src.indexOf('const SECTIONS = ['), src.indexOf(']', src.indexOf('const SECTIONS = [') + 20))
  const ids = [...block.matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1])
  assert.ok(ids.length >= 20, 'found the console sections')
  assert.deepEqual([...ids].sort(), [...ADMIN_SECTION_IDS].sort())
})
