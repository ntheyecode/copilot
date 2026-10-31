// "Not wired yet" items closed for editions without a public site or Stripe
// (docs/deployment-editions.md section 1), on the REAL app booted as onprem:
//   - annualReady goes through billing.js cfg(), so it is false where
//     stripe_billing is off even with annual price ids saved (it read db.billing
//     directly before);
//   - the superadmin Stripe billing panel is not offered (section registry);
//   - the public website's forms are refused where public_site is off.
// The page gate (marketing pages to sign-in) is tested on its own below with a
// shell file, because whether index.js serves dist/ depends on a build.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { bootEdition } from './edition_http_harness.mjs'
import { MARKETING_PAGE_PATHS, isMarketingPage } from './public_site_paths.js'

// Modules that read the edition are imported AFTER the boot sets it (static
// imports are hoisted and would fix the default edition first).
const app = await bootEdition('onprem', { STRIPE_PRICE_BASIC_ANNUAL: 'price_env_basic_y', STRIPE_PRICE_ADVANCED_ANNUAL: 'price_env_adv_y', STRIPE_PRICE_PREMIUM_ANNUAL: 'price_env_prem_y' })
after(app.close)
const { publicSitePageGate } = await import('./public_site_gate.js')
const { PUBLIC_SITE_ROUTES } = await import('./edition_route_gates.js')
const { req, jar, superadmin, store } = app

test('annualReady is false where Stripe is off, even with annual prices in the store and the env', async () => {
  store.setBillingConfig({ priceBasicAnnual: 'price_b_y', priceAdvancedAnnual: 'price_a_y', pricePremiumAnnual: 'price_p_y' })
  assert.equal(store.getBillingPublic().annualReady, true, 'the store view (superadmin) still shows what is saved')
  const r = await req(jar(), 'GET', '/api/work/pricing')
  assert.equal(r.status, 200)
  assert.equal(r.data.annualReady, false)
})

// Without stripe_billing the Stripe billing section is not offered at all: the
// one section registry (server/admin_sections.js) hides it in the console, which
// names it in its "not offered here" note, and refuses its admin API.
test('the superadmin Stripe billing panel is not offered without Stripe', async () => {
  const r = await req(await superadmin(), 'GET', '/api/work/admin/billing')
  assert.equal(r.status, 403)
  assert.equal(r.data.featureDisabled || r.data.companiesDisabled, true)
})

test('the public website forms are refused with a clear, actionable message', async () => {
  const bodies = {
    '/api/work/coverage': { question: 'How do I add a user in Okta?' },
    '/api/work/leads': { firstName: 'A', lastName: 'B', email: 'a@example.com', company: 'C', country: 'US' },
    '/api/work/contact': { name: 'A', email: 'a@example.com', message: 'Hello there' },
  }
  assert.deepEqual(PUBLIC_SITE_ROUTES.map(([, p]) => p).sort(), Object.keys(bodies).sort())
  const leadsBefore = (store.listWorkLeads ? store.listWorkLeads() : []).length
  for (const [p, b] of Object.entries(bodies)) {
    for (const path_ of [p, p.toUpperCase().replace('/API/', '/api/')]) {
      const r = await req(jar(), 'POST', path_, b)
      assert.equal(r.status, 403, path_)
      assert.equal(r.data.publicSiteDisabled, true, path_)
      assert.match(r.data.error, /Sign in/)
      assert.equal(r.data.signIn, '/workcopilot')
    }
  }
  assert.equal((store.listWorkLeads ? store.listWorkLeads() : []).length, leadsBefore, 'no lead stored')
})

test('page gate: marketing pages go to sign-in, sign-in is the plain shell, legal pages pass', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-shell-'))
  const shell = path.join(dir, 'index.html')
  fs.writeFileSync(shell, '<!doctype html><title>shell</title>')
  const off = { has: (c) => c !== 'public_site' }
  const on = { has: () => true }
  const mk = (caps) => {
    const a = express()
    a.use(publicSitePageGate({ shellFile: shell, caps }))
    a.use((q, s) => s.status(200).send('static:' + q.path))
    return new Promise((r) => { const s = a.listen(0, '127.0.0.1', () => r(s)) })
  }
  const sOff = await mk(off)
  const sOn = await mk(on)
  const get = async (s, p, method = 'GET') => {
    const r = await fetch(`http://127.0.0.1:${s.address().port}${p}`, { method, redirect: 'manual' })
    return { status: r.status, location: r.headers.get('location'), text: method === 'HEAD' ? '' : await r.text() }
  }
  try {
    for (const p of MARKETING_PAGE_PATHS) {
      const r = await get(sOff, p)
      assert.equal(r.status, 302, p)
      assert.equal(r.location, '/workcopilot')
    }
    assert.equal((await get(sOff, '/WorkCoPilot/Pricing/')).status, 302)
    assert.equal((await get(sOff, '/workcopilot/pricing/index.html')).status, 302)
    assert.equal((await get(sOff, '/workcopilot/faq', 'HEAD')).status, 302)
    assert.match((await get(sOff, '/workcopilot/')).text, /<title>shell<\/title>/)
    assert.match((await get(sOff, '/workcopilot/login')).text, /<title>shell<\/title>/)
    assert.equal((await get(sOff, '/workcopilot/terms')).text, 'static:/workcopilot/terms')
    assert.equal((await get(sOff, '/work')).text, 'static:/work')
    // public_site on: untouched
    assert.equal((await get(sOn, '/workcopilot/pricing')).text, 'static:/workcopilot/pricing')
    assert.equal((await get(sOn, '/workcopilot')).text, 'static:/workcopilot')
  } finally { sOff.close(); sOn.close() }
  assert.equal(isMarketingPage('/workcopilot/terms'), false)
})
