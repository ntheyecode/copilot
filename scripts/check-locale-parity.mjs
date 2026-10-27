// BUILD GATE: every FULL locale carries every key path the English base
// carries (i18n is a release gate: a key missing in a locale renders the
// English fallback, which is how German headings showed up in English on the
// home page, 2026-10-27). en-GB is a sparse override that deep-merges onto en
// at runtime, so it passes by construction; every other locale is a complete
// catalog and must match en.js key for key.
//
// Arrays are compared by LENGTH too (a translated list that lost or gained an
// item is a drift: cards, rows and scenario steps are indexed by position).
// Plural forms (_one/_two/_other) are plain keys and must match as well.
//
//   node scripts/check-locale-parity.mjs            fail on any missing path
//   node scripts/check-locale-parity.mjs --extra    also list keys a locale has
//                                                   that en lacks (stale copy)
//   node scripts/check-locale-parity.mjs --all      also require the per-section
//                                                   English partials (locales/en/*.js,
//                                                   the signed-in app) in every locale
//
// By default the English BASE (en.js: the public site, login, consent, the
// company console) is the reference, which is what the public release gate
// needs; the partials are the app's own waves and are reported with --all.
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const dir = resolve('src/i18n/locales')
const listExtra = process.argv.includes('--extra')
const withPartials = process.argv.includes('--all')
const SPARSE = new Set(['en-GB'])   // deep-merged onto en at runtime

// Same deep merge the runtime applies (src/i18n/index.jsx) when it folds the
// English partials into the base, so the reference matches what ships.
function deepMergeEn(target, src) {
  for (const k of Object.keys(src || {})) {
    const v = src[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) target[k] = deepMergeEn({ ...(target[k] || {}) }, v)
    else target[k] = v
  }
  return target
}

function paths(val, p = '', out = []) {
  if (Array.isArray(val)) {
    out.push(`${p}[]=${val.length}`)
    val.forEach((el, i) => paths(el, `${p}[${i}]`, out))
  } else if (val && typeof val === 'object') {
    for (const k of Object.keys(val)) paths(val[k], p ? `${p}.${k}` : k, out)
  } else out.push(p)
  return out
}

let en = { ...(await import(pathToFileURL(join(dir, 'en.js')).href)).default }
if (withPartials) {
  const pdir = join(dir, 'en')
  for (const f of readdirSync(pdir).filter((x) => x.endsWith('.js')).sort()) {
    en = deepMergeEn(en, (await import(pathToFileURL(join(pdir, f)).href)).default)
  }
}
const enPaths = paths(en)
const enSet = new Set(enPaths)
let failures = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'en.js').sort()) {
  const code = f.replace(/\.js$/, '')
  let mod
  try { mod = (await import(pathToFileURL(join(dir, f)).href)).default } catch (e) {
    console.error(`[locale-parity] ${code}: failed to import (${e.message})`); failures++; continue
  }
  const have = new Set(paths(mod))
  if (SPARSE.has(code)) { console.log(`[locale-parity] ${code}: sparse override, inherits en (${have.size} paths)`); continue }
  const missing = enPaths.filter((p) => !have.has(p))
  const extra = listExtra ? [...have].filter((p) => !enSet.has(p)) : []
  if (missing.length) {
    failures++
    console.error(`[locale-parity] ${code}: MISSING ${missing.length} of ${enPaths.length} en paths`)
    for (const p of missing.slice(0, 40)) console.error(`    - ${p}`)
    if (missing.length > 40) console.error(`    ... ${missing.length - 40} more`)
  } else console.log(`[locale-parity] ${code}: OK (${enPaths.length} paths)`)
  if (extra.length) {
    console.log(`[locale-parity] ${code}: ${extra.length} extra path(s) not in en (stale copy)`)
    for (const p of extra.slice(0, 20)) console.log(`    + ${p}`)
  }
}
if (failures) { console.error(`\n[locale-parity] FAILED: ${failures} locale(s) are not at parity with en.js. Translate the missing keys before building.`); process.exit(1) }
console.log(`[locale-parity] OK: every full locale carries all ${enPaths.length} en paths.`)
