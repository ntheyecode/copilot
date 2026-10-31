// The edition route gates (server/edition_route_gates.js), pure: which request
// each edition refuses, and that the default edition refuses nothing. The same
// rules on the real app are in edition_<name>_routes.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeCaps, EDITION_IDS, companyTenancy } from './edition_registry.js'
import { routeRefusal, INDIVIDUAL_PLAN_ROUTES, COMPANY_ROUTE_PREFIXES } from './edition_route_gates.js'

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
  for (const [m, p] of [...COMPANY_SAMPLES, ...PERSONAL]) assert.equal(routeRefusal(m, p, c), null, `${m} ${p}`)
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
