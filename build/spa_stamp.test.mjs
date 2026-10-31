// build/spa_stamp.js: the per-edition SPA stamp (capability meta tag, audience
// copy in the static shell, prerendered routes, origin), on a fixture dist
// made from the real index.html.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeCaps } from '../server/edition_registry.js'
import { stampSpa, stampShell, DEFAULT_ORIGIN } from './spa_stamp.js'
import { INDIVIDUALS_BANNED } from '../scripts/edition_copy_scan.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHELL = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.jsx"></script>', '<script type="module" crossorigin src="/copilot-assets/index-AbCdEf12.js"></script>')

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-stamp-'))
  fs.writeFileSync(path.join(dir, 'index.html'), SHELL)
  return dir
}
// What a person or a crawler reads: text, plus JSON-LD string values (schema
// keywords such as "@type": "Organization" are vocabulary, not copy).
const visibleText = (html) => html.replace(/"@(type|id|context)"\s*:\s*"[^"]*"/g, '').replace(/https?:\/\/[^\s"'<>]+/g, '').replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('ld+json') ? m : '')).replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')

test('the default edition at the default origin is left byte for byte', () => {
  const dir = fixture()
  const r = stampSpa(dir, makeCaps('all').list())
  assert.equal(r.stamped, false)
  assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), SHELL)
  assert.deepEqual(fs.readdirSync(dir), ['index.html'], 'no page added')
})

test('saas: capability meta, organization offers, and prerendered routes for organizations', () => {
  const dir = fixture()
  const r = stampSpa(dir, makeCaps('saas').list())
  assert.equal(r.stamped, true)
  assert.equal(r.audience, 'organizations')
  assert.ok(r.prerenderedRoutes >= 6, `prerendered ${r.prerenderedRoutes}`)
  const shell = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  assert.match(shell, /<meta name="wcp-capabilities" content="saas_companies,platform_ai,brain_export,brain_query,public_site"/)
  // No personal plan, and the organization prices come from server/org_pricing.js.
  assert.doesNotMatch(shell, /"name":"(Lite|Basic|Advanced|Premium)"|Self-service plans/)
  assert.match(shell, /"text": "WorkCoPilot is sold to organizations/)
  assert.match(shell, /Hosted by AdmireVeda/)
  assert.match(shell, /\$199 for 100-1,000 users/)
  const login = fs.readFileSync(path.join(dir, 'workcopilot', 'index.html'), 'utf8')
  assert.match(login, /wcp-capabilities/)
  assert.doesNotMatch(login, /free to sign up/i)
  const pricing = fs.readFileSync(path.join(dir, 'workcopilot', 'pricing', 'index.html'), 'utf8')
  assert.match(pricing, /Plans for organizations/)
  assert.doesNotMatch(pricing, /Basic: 2 hours/)
})

test('paid: no company wording in the shell or any prerendered page a person reads', () => {
  const dir = fixture()
  stampSpa(dir, makeCaps('paid').list())
  const pages = []
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') pages.push(p) } }
  walk(dir)
  assert.ok(pages.length >= 7)
  for (const p of pages) {
    let html = fs.readFileSync(p, 'utf8')
    // The fields page lists the field roster (work content: "Red team
    // operations" is a discipline people get guided through, the same
    // exemption scripts/edition_copy_scan.mjs makes for fieldsPage.families).
    if (p.includes(`${path.sep}fields${path.sep}`)) html = html.replace(/<ul[\s\S]*?<\/ul>/, '')
    const text = visibleText(html)
    const m = text.match(INDIVIDUALS_BANNED)
    assert.equal(m, null, `${path.relative(dir, p)} reads "${m && m[0]}"`)
  }
})

test('a custom origin replaces admireveda.com in canonical, hreflang and JSON-LD', () => {
  const dir = fixture()
  stampSpa(dir, makeCaps('paid').list(), { origin: 'https://guide.example.com/' })
  for (const f of ['index.html', 'workcopilot/pricing/index.html']) {
    const h = fs.readFileSync(path.join(dir, ...f.split('/')), 'utf8')
    assert.ok(!h.includes(DEFAULT_ORIGIN), f)
    assert.match(h, /https:\/\/guide\.example\.com/)
  }
})

test('stamping is idempotent for the same set and refuses a second, different stamp', () => {
  const dir = fixture()
  stampSpa(dir, makeCaps('saas').list())
  assert.equal(stampSpa(dir, makeCaps('saas').list()).stamped, false)
  assert.throws(() => stampSpa(dir, makeCaps('paid').list()), /already stamped/)
  assert.throws(() => stampSpa(fixture(), makeCaps('paid').list(), { origin: 'ftp://x' }), /bare origin/)
})

test('a run that died before the prerender is finished by the next run, not reported as done', () => {
  const dir = fixture()
  stampSpa(dir, makeCaps('saas').list())
  fs.rmSync(path.join(dir, 'workcopilot'), { recursive: true, force: true })   // the prerender step "never ran"
  const r = stampSpa(dir, makeCaps('saas').list())
  assert.equal(r.resumed, true)
  assert.ok(r.prerenderedRoutes >= 6)
  assert.ok(fs.existsSync(path.join(dir, 'workcopilot', 'pricing', 'index.html')))
})

test('an edition without the public site gets the meta tag and no prerendered pages', () => {
  const dir = fixture()
  const r = stampSpa(dir, makeCaps('onprem').list())
  assert.equal(r.prerenderedRoutes, 0)
  assert.deepEqual(fs.readdirSync(dir), ['index.html'])
  assert.match(stampShell(SHELL, makeCaps('onprem').list()), /wcp-capabilities" content="single_company,offline_licensing,onprem_setup/)
})

// The individuals edition is LinkNotes (server/brand.js): its shell and every
// prerendered page a person reads carry the LinkNotes name and icons, never the
// corporate brand. Legal pages keep their text as written (owner decision).
test('paid: the shell and prerendered pages are branded LinkNotes', () => {
  const dir = fixture()
  stampSpa(dir, makeCaps('paid').list())
  const shell = fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  assert.match(shell, /href="\/brand\/linknotes\/favicon\.svg"/)
  assert.match(shell, /<meta property="og:site_name" content="LinkNotes"/)
  const LEGAL = /terms|privacy|refund|cookie|dpa|disclaimer|acceptable-use|subprocessors|accessibility/
  const pages = []
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') pages.push(p) } }
  walk(dir)
  for (const p of pages) {
    if (LEGAL.test(path.relative(dir, p))) continue
    const m = fs.readFileSync(p, 'utf8').match(/WorkCoPilot|AdmireVeda/)
    assert.equal(m, null, `${path.relative(dir, p)} still names "${m && m[0]}"`)
  }
})
