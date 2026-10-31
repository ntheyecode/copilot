// Every public page, in every language, shows that language only (owner,
// 2026-10-31: "don't miss a single word, single context for all languages; the
// website must cover 100% of each locale"). For each locale this gate loads
// every public page and fails when the page shows an English sentence that the
// locale translates differently (a fallback, a hard-coded copy, an SVG label,
// a tooltip, an alt text, a placeholder, an aria-label), or a raw catalog key.
// Strings a locale leaves identical to English are the catalog scan's job
// (scripts/check-untranslated.mjs), not this one.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { test, expect } from '../support/fixtures.mjs'
import { capsOf } from '../support/editions.mjs'
import { REPO } from '../support/server.mjs'

const LOC = path.join(REPO, 'src', 'i18n', 'locales')
const CODES = fs.readdirSync(LOC).filter((f) => f.endsWith('.js') && !['en.js', 'en-GB.js'].includes(f)).map((f) => f.replace(/\.js$/, ''))
const load = async (f) => ((await import(pathToFileURL(f).href)).default) || {}

// The public pages of an edition: the sitemap's routes for the organization
// and base sites, the individuals site's own pages plus the shared legal pages.
function routesFor(caps) {
  const sitemap = fs.readFileSync(path.join(REPO, 'scripts', 'gen-sitemap.mjs'), 'utf8')
  const all = [...sitemap.matchAll(/loc: '([^']+)'/g)].map((m) => m[1])
  const legal = all.filter((r) => /privacy|terms|acceptable-use|cookie-policy|dpa|subprocessors|refund|disclaimer|accessibility/.test(r))
  if (caps.has('individual_site')) return ['/', '/workcopilot/how-it-works', '/workcopilot/use-cases', '/workcopilot/pricing', '/workcopilot/security', '/workcopilot/faq', '/workcopilot/login', ...legal.filter((r) => !/dpa/.test(r))]
  return all.filter((r) => !(r === '/affiliate' && !caps.has('individual_plans')))
}

const wholeWord = (s) => new RegExp(`(?<![\\p{L}\\p{N}])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u')
const plain = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const leaves = (v, p, out) => { if (typeof v === 'string') out.set(p, v); else if (Array.isArray(v)) v.forEach((x, i) => leaves(x, `${p}.${i}`, out)); else if (v && typeof v === 'object') for (const k of Object.keys(v)) leaves(v[k], p ? `${p}.${k}` : k, out); return out }

// The English sentences this locale must never show: whole strings and their
// sentences, at least 24 characters and 4 words, where the locale's value at the
// same key differs from English (so a match on the page is an English leak).
async function forbiddenEnglish(code, audience) {
  const { loadEnglish, loadOverlay } = await import(pathToFileURL(path.join(REPO, 'scripts', 'edition_copy_scan.mjs')).href)
  const { mergeOverlay } = await import(pathToFileURL(path.join(REPO, 'src', 'i18n', 'overlay_merge.js')).href)
  const { brandForAudience, rebrandCatalog } = await import(pathToFileURL(path.join(REPO, 'server', 'brand.js')).href)
  const brand = brandForAudience(audience)
  let en = await loadEnglish()
  let loc = await load(path.join(LOC, `${code}.js`))
  if (audience) {
    const enOv = (await loadOverlay(audience, 'en')) || {}
    en = mergeOverlay(en, enOv)
    loc = mergeOverlay(mergeOverlay(loc, enOv), (await loadOverlay(audience, code)) || {})
  }
  en = rebrandCatalog(en, brand); loc = rebrandCatalog(loc, brand)
  const E = leaves(en, '', new Map()), L = leaves(loc, '', new Map())
  const out = new Set()
  for (const [k, v] of E) {
    const lv = L.get(k)
    if (lv == null || lv === v || /\{/.test(v)) continue
    const p = plain(v)
    const parts = [p, ...p.split(/(?<=[.!?])\s+/)]
    for (const s of parts) if (s.length >= 24 && s.split(' ').length >= 4) out.add(s)
  }
  return [...out]
}

for (const code of CODES) {
  test(`every public page reads ${code} only`, async ({ as, edition }) => {
    test.setTimeout(240_000)
    const caps = capsOf(edition)
    const audience = !caps.has('saas_companies') ? 'individuals' : !caps.has('individual_plans') ? 'organizations' : null
    const english = await forbiddenEnglish(code, audience)
    const { context } = await as.context({ locale: code })
    await context.addInitScript((c) => { try { localStorage.setItem('wc_locale', c) } catch { /* ignore */ } }, code)
    const page = await context.newPage()
    const leaks = []
    for (const route of routesFor(caps)) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const seen = await page.evaluate(() => {
        const attrs = [...document.querySelectorAll('[title],[aria-label],[alt],[placeholder]')].flatMap((e) => ['title', 'aria-label', 'alt', 'placeholder'].map((a) => e.getAttribute(a)).filter(Boolean))
        const svg = [...document.querySelectorAll('svg text, svg title')].map((t) => t.textContent)
        return [document.body.innerText, ...attrs, ...svg].join('\n').replace(/\s+/g, ' ')
      })
      // Whole words only: Italian "terminale" contains English "terminal".
      for (const s of english) if (seen.includes(s) && wholeWord(s).test(seen)) leaks.push(`${route}: "${s.slice(0, 90)}"`)
      const raw = seen.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z0-9]+\.[a-zA-Z0-9.]+\b/g) || []
      for (const k of raw.filter((x) => !/\.(com|net|org|io|dev|test|js|json|md|pdf|docx|exe|msi)\b/.test(x))) leaks.push(`${route}: raw key ${k}`)
    }
    await context.close()
    expect([...new Set(leaks)], `${edition} ${code}: English or raw keys on the page`).toEqual([])
  })
}
