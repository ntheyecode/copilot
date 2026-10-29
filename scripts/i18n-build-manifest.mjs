// Build per-locale translation manifests: for each full locale, the MINIMAL
// nested subtree of the English catalog containing exactly the keys that locale
// is missing or has at the wrong shape (the parity gap). Values are verbatim
// English, so a translator sees the real source string with its {vars},
// <b>/<em>/<a> tags and _one/_other plural keys intact.
//
//   node scripts/i18n-build-manifest.mjs <outDir>
//
// Writes <outDir>/<locale>.json (nested en subtree) + <outDir>/_summary.json.
// Pairs with scripts/i18n-merge-locale.mjs, which merges the translated subtree
// back into src/i18n/locales/<locale>.js.
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'

const outDir = resolve(process.argv[2] || 'i18n-manifest')
mkdirSync(outDir, { recursive: true })
const dir = resolve('src/i18n/locales')
const load = async (f) => (await import(pathToFileURL(join(dir, f)).href)).default

// English = base + every en/*.js partial, exactly as the runtime merges them.
const en = { ...(await load('en.js')) }
const pdir = join(dir, 'en')
for (const f of readdirSync(pdir).filter((x) => x.endsWith('.js')).sort())
  deepMergeEn(en, (await import(pathToFileURL(join(pdir, f)).href)).default || {})

const locales = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'en.js' && f !== 'en-GB.js')

// Return the subtree of `enVal` present wherever `locVal` lacks it (or shape
// differs). null means "nothing missing here". Arrays are atomic: a missing or
// wrong-length array is included whole (translator does every element).
function missingSubtree(enVal, locVal) {
  if (Array.isArray(enVal)) {
    if (!Array.isArray(locVal) || locVal.length !== enVal.length) return enVal
    return null
  }
  if (enVal && typeof enVal === 'object') {
    const out = {}
    for (const k of Object.keys(enVal)) {
      const sub = missingSubtree(enVal[k], locVal == null ? undefined : locVal[k])
      if (sub !== null) out[k] = sub
    }
    return Object.keys(out).length ? out : null
  }
  // primitive leaf: missing when the locale lacks it or has a non-string shape
  if (locVal === undefined || typeof locVal !== typeof enVal) return enVal
  return null
}

function countLeaves(v) {
  if (Array.isArray(v)) return v.reduce((n, x) => n + countLeaves(x), 0)
  if (v && typeof v === 'object') return Object.values(v).reduce((n, x) => n + countLeaves(x), 0)
  return 1
}

const summary = {}
let grand = 0
for (const f of locales) {
  const locale = f.replace(/\.js$/, '')
  const loc = await load(f)
  const sub = missingSubtree(en, loc) || {}
  const n = countLeaves(sub)
  grand += n
  summary[locale] = n
  writeFileSync(join(outDir, `${locale}.json`), JSON.stringify(sub, null, 2) + '\n')
}
writeFileSync(join(outDir, '_summary.json'), JSON.stringify({ total: grand, perLocale: summary }, null, 2) + '\n')
console.log(`[i18n-manifest] wrote ${locales.length} manifest(s) to ${outDir}`)
console.log(`[i18n-manifest] total leaves to translate: ${grand}`)
for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`)
