// The individuals site's crawler copy comes from the pages' own source
// (src/sites/individuals/seo_pages.js over the `indiv` namespace): a stamped
// `paid` dist must carry, for every individuals page, the SAME title and
// description the page sets with useSeo, and its own heading. The
// organization editions keep their copy.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeCaps, EDITION_IDS } from '../server/edition_registry.js'
import { stampSpa } from './spa_stamp.js'
import { INDIV_SEO_PAGES, indivSeo, plainText } from '../src/sites/individuals/seo_pages.js'
import { loadEnCatalog, lookup } from '../scripts/en_catalog.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHELL = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.jsx"></script>', '<script type="module" crossorigin src="/copilot-assets/index-AbCdEf12.js"></script>')
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const pick = (html, re) => { const m = html.match(re); return m ? unesc(m[1]) : null }
const titleOf = (h) => pick(h, /<title>([\s\S]*?)<\/title>/)
const descOf = (h) => pick(h, /<meta name="description" content="([^"]*)"/)
const ogTitleOf = (h) => pick(h, /<meta property="og:title" content="([^"]*)"/)
const h1Of = (h) => pick(h, /<div id="prerender-seo"[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/)

function stamped(edition) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `wc-indiv-seo-${edition}-`))
  fs.writeFileSync(path.join(dir, 'index.html'), SHELL)
  stampSpa(dir, makeCaps(edition).list())
  return (p) => fs.readFileSync(p === '/' ? path.join(dir, 'index.html') : path.join(dir, ...p.split('/').filter(Boolean), 'index.html'), 'utf8')
}

const SITE_EDITIONS = EDITION_IDS.filter((id) => makeCaps(id).has('individual_site'))

test('every edition with the individuals site carries each page\'s own SEO title, description and heading', async () => {
  assert.ok(SITE_EDITIONS.length >= 1)
  for (const edition of SITE_EDITIONS) {
    const { copyAudience } = await import('../server/edition_registry.js')
    const t = lookup(await loadEnCatalog(copyAudience(makeCaps(edition))))
    const read = stamped(edition)
    for (const p of INDIV_SEO_PAGES) {
      const html = read(p.path)
      const seo = indivSeo(t, p.page)        // exactly what the page passes to useSeo
      assert.equal(titleOf(html), seo.title, `${edition} ${p.path}: <title> is the page's own SEO title`)
      assert.equal(descOf(html), seo.description, `${edition} ${p.path}: meta description`)
      assert.equal(ogTitleOf(html), seo.title, `${edition} ${p.path}: og:title`)
      if (p.path !== '/') assert.equal(h1Of(html), plainText(t(`indiv.${p.page}.hero.h1`)), `${edition} ${p.path}: the crawler heading is the page's hero`)
    }
  }
})

test('each individuals page sets its SEO through the shared table, at the path App.jsx routes it', () => {
  const sitePage = fs.readFileSync(path.join(ROOT, 'src', 'sites', 'individuals', 'SitePage.jsx'), 'utf8')
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8')
  const files = Object.fromEntries([...sitePage.matchAll(/(\w+): lazy\(\(\) => import\('\.\/pages\/(\w+)\.jsx'\)\)/g)].map((m) => [m[1], m[2]]))
  assert.deepEqual(Object.keys(files).sort(), INDIV_SEO_PAGES.map((p) => p.page).sort(), 'the SEO table lists every individuals page')
  for (const p of INDIV_SEO_PAGES) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'sites', 'individuals', 'pages', `${files[p.page]}.jsx`), 'utf8')
    assert.ok(src.includes(`useSeo(indivSeo(t, '${p.page}'))`), `${files[p.page]}.jsx reads its SEO from seo_pages.js`)
    assert.ok(!/useSeo\(\{/.test(src), `${files[p.page]}.jsx has no second, inline SEO object`)
    if (p.path === '/') assert.match(app, /<SitePage page="home"/)
    else assert.ok(app.includes(`<Route path="${p.path}" element={<SitePage page="${p.page}"`), `App.jsx routes ${p.page} at ${p.path}`)
  }
})

test('the organization editions keep the organization copy', async () => {
  const base = lookup(await loadEnCatalog('organizations'))
  const read = stamped('saas')
  assert.equal(titleOf(read('/workcopilot/how-it-works')), base('seo.how-it-works.title'))
  assert.doesNotMatch(read('/'), /indiv|For people who do the work themselves/)
  for (const p of INDIV_SEO_PAGES) {
    // No published prices for organizations: their pricing page is not prerendered (it redirects to contact).
    if (p.path === '/workcopilot/pricing') { assert.throws(() => read(p.path), /ENOENT/, 'saas has no prerendered pricing page'); continue }
    assert.notEqual(titleOf(read(p.path)), indivSeo(base, p.page).title, `saas ${p.path} is not the individuals copy`)
  }
})
