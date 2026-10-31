// The edition registry (server/edition_registry.js) and the shared edition
// rules (server/edition.js). Pure: no app boot. The route behaviour per edition
// is covered by edition_<name>_routes.test.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAPABILITIES, EDITIONS, EDITION_IDS, DEFAULT_EDITION, makeCaps, resolveEditionId } from './edition_registry.js'
import { publicEdition, soloSignupRefusal, companyCreationRefusal, stripeOffReason } from './edition.js'
import { importsOf } from '../build/import_check.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(here, '..')

test('no config means the all edition, which keeps every capability the product has today', () => {
  assert.equal(DEFAULT_EDITION, 'all')
  assert.equal(resolveEditionId(undefined), 'all')
  assert.equal(resolveEditionId(''), 'all')
  assert.equal(resolveEditionId('  SaaS '), 'saas')
  // Pinned on purpose: this is today's product. Changing `all` changes what an
  // unconfigured server does, so it must be a deliberate edit of this list too.
  // individual_plans (2026-10-30) names what `all` already did: sell personal plans.
  assert.deepEqual(makeCaps('all').list(), ['solo_signup', 'saas_companies', 'individual_plans', 'stripe_billing', 'platform_ai', 'brain_export', 'brain_query', 'public_site'])
})

test('an unknown edition or capability fails loudly, never reads as off', () => {
  assert.throws(() => resolveEditionId('enterprise'), /unknown edition "enterprise".*all, saas, paid, onprem, managed/)
  assert.throws(() => makeCaps('nope'), /unknown edition/)
  assert.throws(() => makeCaps('all').has('solo_sigup'), /unknown capability "solo_sigup"/)
})

test('every edition lists only known capabilities, no duplicates, no excluded pair', () => {
  for (const id of EDITION_IDS) {
    const ed = EDITIONS[id]
    assert.ok(ed.label && ed.summary, `${id} has a label and summary`)
    for (const cap of ed.capabilities) assert.ok(Object.hasOwn(CAPABILITIES, cap), `${id}: ${cap} is a known capability`)
    assert.equal(new Set(ed.capabilities).size, ed.capabilities.length)
    const c = makeCaps(id)
    assert.ok(!(c.has('saas_companies') && c.has('single_company')), `${id}: many tenants and one tenant exclude each other`)
    assert.ok(!(c.has('stripe_billing') && c.has('offline_licensing')), `${id}: Stripe and offline licensing exclude each other`)
    assert.deepEqual(c.list(), Object.keys(CAPABILITIES).filter((k) => ed.capabilities.includes(k)))
  }
  for (const cap of Object.keys(CAPABILITIES)) assert.ok(EDITION_IDS.some((id) => EDITIONS[id].capabilities.includes(cap)), `${cap} is used`)
})

test('the individuals site is a capability of paid only, and always comes with a public site', () => {
  assert.equal(makeCaps('paid').has('individual_site'), true)
  for (const id of EDITION_IDS.filter((x) => x !== 'paid')) assert.equal(makeCaps(id).has('individual_site'), false, `${id} keeps the organization pages`)
  for (const id of EDITION_IDS) if (makeCaps(id).has('individual_site')) assert.equal(makeCaps(id).has('public_site'), true, `${id}: the individuals site is a public site`)
  assert.match(CAPABILITIES.individual_site, /individuals site/)
})

test('the registry is frozen (no runtime edits to an edition)', () => {
  assert.ok(Object.isFrozen(EDITIONS) && Object.isFrozen(CAPABILITIES))
  for (const id of EDITION_IDS) assert.ok(Object.isFrozen(EDITIONS[id]) && Object.isFrozen(EDITIONS[id].capabilities))
})

test('publicEdition exposes the id, label and on-capabilities only', () => {
  const p = publicEdition(makeCaps('onprem'))
  assert.deepEqual(Object.keys(p).sort(), ['capabilities', 'edition', 'label'])
  assert.equal(p.edition, 'onprem')
  assert.deepEqual(p.capabilities, makeCaps('onprem').list())
})

test('self sign-up: allowed where solo_signup is on, one refusal body elsewhere', () => {
  for (const id of EDITION_IDS) {
    const c = makeCaps(id)
    const r = soloSignupRefusal(c)
    if (c.has('solo_signup')) assert.equal(r, null, `${id} allows sign-up`)
    else {
      assert.equal(r.status, 403, `${id} refuses sign-up`)
      assert.equal(r.body.signupDisabled, true)
      assert.match(r.body.error, /company administrator/)
    }
  }
})

test('company creation: many, exactly one, or none; the count is read only when it matters', () => {
  let reads = 0
  const count = (n) => () => { reads++; return n }
  assert.equal(companyCreationRefusal(count(5), makeCaps('all')), null)
  assert.equal(companyCreationRefusal(count(5), makeCaps('saas')), null)
  assert.equal(reads, 0, 'editions with many tenants never count companies')
  assert.equal(companyCreationRefusal(count(0), makeCaps('onprem')), null)
  assert.equal(companyCreationRefusal(count(1), makeCaps('onprem')).body.singleCompany, true)
  assert.equal(companyCreationRefusal(count(1), makeCaps('managed')).status, 409)
  const none = companyCreationRefusal(count(0), makeCaps('paid'))
  assert.equal(none.status, 403)
  assert.equal(none.body.companiesDisabled, true)
})

test('Stripe-off reason: null where Stripe is on, a license or invoice reason elsewhere', () => {
  assert.equal(stripeOffReason(makeCaps('all')), null)
  assert.match(stripeOffReason(makeCaps('onprem')), /license/)
  assert.match(stripeOffReason(makeCaps('managed')), /invoiced/)
})

test('the edition table in docs/deployment-editions.md matches the registry', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'deployment-editions.md'), 'utf8')
  for (const id of EDITION_IDS) {
    const row = md.split(/\r?\n/).find((l) => l.startsWith(`| \`${id}\``))
    assert.ok(row, `docs table has a row for ${id}`)
    const listed = row.split('|')[3].split(',').map((s) => s.trim()).filter(Boolean)
    assert.deepEqual(listed, makeCaps(id).list(), `docs row for ${id} matches the registry`)
  }
})

// ---- class gates --------------------------------------------------------------
function codeFiles(dirs, { skip = () => false } = {}) {
  const out = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'release', 'release-workcopilot'].includes(e.name) || e.name.startsWith('.')) continue
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(m?js|cjs|jsx|ts|tsx)$/.test(e.name)) { const rel = path.relative(ROOT, p).split(path.sep).join('/'); if (!skip(rel)) out.push({ abs: p, rel }) }
    }
  }
  for (const d of dirs) walk(path.join(ROOT, d))
  return out
}

// Call sites ask for capabilities, never edition names, and only
// server/edition.js reads WORK_EDITION. Tests are exempt (they pick editions on
// purpose); the HTTP harness is the one test helper that sets WORK_EDITION.
// The registry, the resolver, and the edition plumbing (start an edition,
// compose an edition) are the only places that handle edition ids by design.
const REGISTRY_FILES = new Set(['server/edition_registry.js', 'server/edition.js', 'editions/profile.js', 'editions/start.mjs', 'build/compose.js', 'build/compose.mjs', 'build/stamp_spa.mjs'])
const isTest = (rel) => /\.test\.m?js$/.test(rel) || rel === 'server/edition_http_harness.mjs'
const ids = EDITION_IDS.join('|')
const QUOTED_ID = new RegExp(`['"\`](${ids})['"\`]`)
const RULES = [
  { why: 'compares or switches on an edition name', test: (line) => /edition/i.test(line) && QUOTED_ID.test(line) },
  { why: 'reads an edition id (ask caps.has() instead)', test: (line) => /\.\s*edition\b|\{\s*edition\b/.test(line) },
  { why: 'builds its own capability set (use caps from server/edition.js)', test: (line) => /\bmakeCaps\s*\(/.test(line) },
  { why: 'reads WORK_EDITION', test: (line) => /WORK_EDITION/.test(line) },
]
function offenders(files) {
  const out = []
  for (const f of files) {
    const lines = fs.readFileSync(f.abs, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => { for (const r of RULES) if (r.test(line)) out.push(`${f.rel}:${i + 1} ${r.why}`) })
  }
  return out
}

test('the edition gate catches the shapes it exists for', () => {
  const bad = [
    "if (caps.edition === 'onprem') x()", "if ('saas' !== caps.edition)", "activeEdition === 'onprem'",
    "switch (caps.edition) {", "['onprem', 'managed'].includes(caps.edition)", "const c = makeCaps('onprem')",
    'const { WORK_EDITION } = process.env', 'process.env?.WORK_EDITION', 'import.meta.env.VITE_WORK_EDITION',
    "publicEdition().edition !== 'saas'", 'switch (info.edition) {', 'const ed = data.edition', 'const { edition } = caps',
  ]
  for (const line of bad) assert.ok(RULES.some((r) => r.test(line)), `gate catches: ${line}`)
  for (const line of ["caps.has('solo_signup')", "x === 'all'", "case 'all':", "const edition = publicEdition()"]) assert.ok(!RULES.some((r) => r.test(line)), `gate allows: ${line}`)
})

test('no code outside the registry branches on an edition or reads WORK_EDITION', () => {
  const files = codeFiles(['server', 'src', 'scripts', 'workcopilot', 'editions', 'build'], { skip: (rel) => REGISTRY_FILES.has(rel) || isTest(rel) })
  assert.deepEqual(offenders(files), [])
})

// Deploy contract: the server is deployed by copying server/ (and dist/), see
// docs/WORKCOPILOT-HANDOFF.md. A server module that imports from outside
// server/ would deploy fine and then fail to start. Tests are exempt (they are
// not deployed). The import scanner is the one build/compose.js also uses.
test('server modules import nothing outside server/ (other than packages)', () => {
  const SERVER = path.join(ROOT, 'server')
  const bad = []
  for (const f of codeFiles(['server'], { skip: isTest })) {
    for (const imp of importsOf(f.abs)) if (!imp.target.startsWith(SERVER + path.sep)) bad.push(`${f.rel} imports ${imp.spec}`)
  }
  assert.deepEqual(bad, [])
})
