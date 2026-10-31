// The edition route gates (server/edition_route_gates.js), pure: which request
// each edition refuses, and that the default edition refuses nothing. The same
// rules on the real app are in edition_<name>_routes.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeCaps, EDITION_IDS, companyTenancy } from './edition_registry.js'
import { routeRefusal, matchesPrefix, INDIVIDUAL_PLAN_ROUTES, COMPANY_ROUTE_PREFIXES, STRIPE_ROUTE_PREFIXES } from './edition_route_gates.js'

const COMPANY_SAMPLES = [
  ['GET', '/api/work/company/users'], ['POST', '/api/work/company/api-keys'], ['POST', '/api/work/company/webhooks/w1/test'],
  ['GET', '/api/work/team/pool'], ['POST', '/api/work/team/allocation'], ['GET', '/api/work/my-company'],
  ['GET', '/api/work/exec/overview'], ['GET', '/api/work/pm/projects'], ['GET', '/api/work/grc/risks'],
  ['POST', '/api/work/brain/query'], ['POST', '/api/work/brain/export'], ['POST', '/api/work/workflows'],
  ['GET', '/api/work/workflows/abc'], ['GET', '/api/work/workflow-incidents'], ['GET', '/api/work/workflow-incidents-alerts'],
  ['POST', '/api/work/templates'], ['GET', '/api/work/kb-spaces'], ['POST', '/api/work/launch/redeem'],
  ['GET', '/api/work/sso/resolve'], ['GET', '/api/v1/openapi.json'], ['POST', '/api/v1/brain/query'],
  ['GET', '/api/work/customers'], ['GET', '/api/work/my/assigned'], ['POST', '/api/work/my/assigned/p1/t1/expand'], ['GET', '/api/work/app/msi'],
]
const PERSONAL = [
  ['GET', '/api/work/me'], ['POST', '/api/work/sessions'], ['GET', '/api/work/projects'], ['POST', '/api/work/docs'],
  ['GET', '/api/work/policy'], ['GET', '/api/work/subscription'], ['GET', '/api/work/invoices'], ['POST', '/api/work/billing/portal'],
  ['GET', '/api/work/pricing'], ['GET', '/api/work/edition'], ['POST', '/api/work/login'], ['GET', '/api/work/skills'],
  // lookalikes that are NOT company routes
  ['GET', '/api/work/companyx'], ['GET', '/api/work/teams'], ['GET', '/api/work/brainstorm'],
]

test('the default edition refuses nothing (today\'s product)', () => {
  const c = makeCaps('all')
  for (const [m, p] of [...COMPANY_SAMPLES, ...PERSONAL, ...INDIVIDUAL_PLAN_ROUTES]) assert.equal(routeRefusal(m, p, c), null, `${m} ${p}`)
})

// Stripe paths: refused wherever stripe_billing is off (saas bills by contract).
const STRIPE_SAMPLES = [
  ['POST', '/api/work/stripe/webhook'], ['POST', '/api/work/checkout'], ['POST', '/api/work/checkout/credits'],
  ['POST', '/api/work/onboarding/checkout'], ['POST', '/api/work/subscription/change'], ['POST', '/api/work/billing/portal'],
  ['GET', '/api/work/invoices'], ['GET', '/api/work/admin/users/u1/invoices'], ['POST', '/api/work/admin/users/u1/refund'],
  ['POST', '/api/work/admin/users/u1/cancel-subscription'], ['POST', '/api/work/admin/finance/transactions/t1/refund'],
  ['GET', '/api/work/affiliate/connect/refresh'],
]
const SOCIAL_SAMPLES = [['GET', '/api/work/social/providers'], ['GET', '/api/work/social/google/start'], ['GET', '/api/work/social/callback'], ['POST', '/api/work/social/complete'], ['GET', '/api/work/admin/social'], ['POST', '/api/work/admin/social/google']]

test('saas (organizations): personal-plan purchase is refused with an actionable message; company routes stay open', () => {
  const c = makeCaps('saas')
  for (const [m, p] of INDIVIDUAL_PLAN_ROUTES) {
    const r = routeRefusal(m, p, c)
    assert.equal(r && r.status, 403, `${m} ${p}`)
    assert.equal(r.body.individualPlansDisabled, true)
    assert.match(r.body.error, /organizations/)
    assert.equal(r.body.contact, '/workcopilot/contact')
  }
  // GET of the same paths (reading) is not a purchase
  assert.equal(routeRefusal('GET', '/api/work/subscription', c), null)
  const personalNoStripe = PERSONAL.filter(([m, p]) => !STRIPE_SAMPLES.some(([sm, sp]) => sm === m && sp === p))
  for (const [m, p] of [...COMPANY_SAMPLES, ...personalNoStripe]) assert.equal(routeRefusal(m, p, c), null, `${m} ${p}`)
})

test('saas: no Stripe path is reachable (contract + invoice billing), every one refused', () => {
  const c = makeCaps('saas')
  for (const [m, p] of STRIPE_SAMPLES) {
    const r = routeRefusal(m, p, c)
    assert.equal(r && r.status, 403, `${m} ${p}`)
    assert.ok(r.body.stripeDisabled || r.body.individualPlansDisabled, `${m} ${p}`)
  }
  for (const id of EDITION_IDS) {
    const cc = makeCaps(id)
    for (const pre of STRIPE_ROUTE_PREFIXES) {
      const p = pre.replace(/\*/g, 'x').replace(/\/$/, '/x')
      assert.equal(!!routeRefusal('POST', p, cc), !cc.has('stripe_billing') || (!cc.has('individual_plans') && INDIVIDUAL_PLAN_ROUTES.some(([, rp]) => rp === p)), `${id}: ${p}`)
    }
  }
})

test('social sign-in routes are refused exactly where social_login is off', () => {
  for (const id of EDITION_IDS) {
    const c = makeCaps(id)
    for (const [m, p] of SOCIAL_SAMPLES) assert.equal(!!routeRefusal(m, p, c), !c.has('social_login'), `${id}: ${m} ${p}`)
  }
  assert.equal(routeRefusal('GET', '/api/work/social/providers', makeCaps('saas')).body.socialDisabled, true)
})

// Class gate: the edition gate must run before EVERY route. A route mounted
// above it (the Stripe webhook once was) silently escaped every refusal.
test('index.js mounts the edition gate before any route or body parser', async () => {
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8')
  const gate = src.indexOf('app.use(editionRouteGate())')
  assert.ok(gate > 0, 'the gate is mounted')
  const first = src.search(/\bapp\.(get|post|put|patch|delete|all|use)\(/)
  assert.equal(first, gate, 'nothing is registered before the gate')
})

test('a "*" segment matches exactly one segment; lookalikes are not caught', () => {
  assert.ok(matchesPrefix('/api/work/admin/users/u1/refund', '/api/work/admin/users/*/refund'))
  assert.ok(!matchesPrefix('/api/work/admin/users/refund', '/api/work/admin/users/*/refund'))
  assert.ok(!matchesPrefix('/api/work/admin/users/u1/refunds', '/api/work/admin/users/*/refund'))
  assert.ok(!matchesPrefix('/api/work/admin/users/u1', '/api/work/admin/users/*/refund'))
  assert.ok(matchesPrefix('/api/work/invoices', '/api/work/invoices'))
  assert.ok(!matchesPrefix('/api/work/invoicesx', '/api/work/invoices'))
  assert.ok(!matchesPrefix('/api/work/company/invoices/i1.pdf', '/api/work/invoices'))
})

test('SAML, SCIM and company billing routes are company routes: open on saas and all, refused on paid', () => {
  const samples = [['GET', '/api/work/sso/saml/co1/metadata'], ['POST', '/api/work/sso/saml/co1/acs'], ['GET', '/api/work/scim/v2/Users'], ['GET', '/api/work/company/billing'], ['GET', '/api/work/company/invoices/i1.pdf'], ['POST', '/api/work/company/scim/tokens']]
  for (const [m, p] of samples) {
    assert.equal(routeRefusal(m, p, makeCaps('saas')), null, `saas ${p}`)
    assert.equal(routeRefusal(m, p, makeCaps('all')), null, `all ${p}`)
    assert.equal(routeRefusal(m, p, makeCaps('paid')).body.companiesDisabled, true, `paid ${p}`)
  }
})

test('paid (individuals): every company route family is refused with neutral wording; personal routes stay open', () => {
  const c = makeCaps('paid')
  for (const [m, p] of COMPANY_SAMPLES) {
    const r = routeRefusal(m, p, c)
    assert.equal(r && r.status, 403, `${m} ${p}`)
    assert.equal(r.body.companiesDisabled, true)
    assert.doesNotMatch(r.body.error, /compan|team|enterprise|organi[sz]ation/i, 'no company wording in a refusal an individual could see')
  }
  for (const [m, p] of [...PERSONAL, ...INDIVIDUAL_PLAN_ROUTES]) assert.equal(routeRefusal(m, p, c), null, `${m} ${p}`)
})

test('every edition: company routes are refused exactly where there are no company tenants', () => {
  for (const id of EDITION_IDS) {
    const c = makeCaps(id)
    for (const pre of COMPANY_ROUTE_PREFIXES) {
      const p = pre.endsWith('/') ? pre + 'x' : pre
      assert.equal(!!routeRefusal('GET', p, c), !companyTenancy(c), `${id}: ${p}`)
    }
    for (const [m, p] of INDIVIDUAL_PLAN_ROUTES) assert.equal(!!routeRefusal(m, p, c), !c.has('individual_plans'), `${id}: ${m} ${p}`)
  }
})

test('query strings and trailing slashes do not slip past', () => {
  const c = makeCaps('paid')
  assert.ok(routeRefusal('GET', '/api/work/team/pool/?x=1', c))
  assert.ok(routeRefusal('GET', '/api/work/my-company?full=1', c))
  assert.ok(routeRefusal('post', '/api/work/checkout/', makeCaps('saas')))
})

test('a changed letter case meets the same refusal (Express routes case-insensitively)', () => {
  const saas = makeCaps('saas'), paid = makeCaps('paid')
  for (const p of ['/api/work/Checkout/Credits', '/API/work/subscription/change', '/api/work/ONBOARDING/checkout']) assert.ok(routeRefusal('POST', p, saas), p)
  for (const p of ['/api/work/Company/users', '/api/V1/tasks', '/api/work/My-Company', '/API/WORK/BRAIN/query']) assert.ok(routeRefusal('GET', p, paid), p)
})
