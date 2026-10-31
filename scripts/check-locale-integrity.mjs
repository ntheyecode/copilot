// BUILD GATE: every locale dictionary must have ZERO undefined/null holes in any
// array. A sparse-override locale (e.g. en-GB) that positionally indexes the en
// base array (`en.home.roi.rows[5]`) silently produces an `undefined` element when
// the base array changes length. That hole later crashes a render `.map(x => x.t)`
// with "Cannot read properties of undefined", which - with no error boundary -
// BLANKS THE WHOLE SITE for every visitor on that locale.
//
// This actually shipped: 2026-10-27, en-GB (served to India by region) referenced
// roi.rows[5] after the base was trimmed to 5 rows, blanking the site for all
// en-GB users on any browser. This gate fails the build so it can never recur.
// Wired as part of `prebuild`, so it runs before every `vite build`.
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const dir = resolve('src/i18n/locales')
const files = readdirSync(dir).filter((f) => f.endsWith('.js'))
let holes = 0

// A positional override can also DUPLICATE a row instead of leaving a hole: on
// 2026-10-30 en-GB's roi.rows patched "index 3" after the base order shifted,
// showing Onboarding twice and dropping Mistakes. So an array of titled objects
// (t / k / title / q / name / label) must not repeat a title.
const TITLE_KEYS = ['t', 'k', 'title', 'q', 'name', 'label']
function dupTitles(arr, path, locale) {
  if (!arr.length || !arr.every((el) => el && typeof el === 'object' && !Array.isArray(el))) return
  const key = TITLE_KEYS.find((k) => arr.every((el) => typeof el[k] === 'string'))
  if (!key) return
  const seen = new Set()
  for (const el of arr) {
    if (seen.has(el[key])) {
      console.error(`[locale-integrity] ${locale}: duplicate ${key} "${el[key]}" in ${path} - a positional override repeating a base row (and hiding another). Override by title, not by index.`)
      holes++
    }
    seen.add(el[key])
  }
}

function walk(val, path, locale) {
  if (Array.isArray(val)) {
    dupTitles(val, path, locale)
    val.forEach((el, i) => {
      if (el === undefined || el === null) {
        console.error(`[locale-integrity] ${locale}: undefined/null element at ${path}[${i}] - a positional index into a base array that no longer exists. This blanks the site for this locale.`)
        holes++
      } else walk(el, `${path}[${i}]`, locale)
    })
  } else if (val && typeof val === 'object') {
    for (const k of Object.keys(val)) walk(val[k], path ? `${path}.${k}` : k, locale)
  }
}

for (const f of files) {
  const locale = f.replace(/\.js$/, '')
  let mod
  try {
    mod = await import(pathToFileURL(join(dir, f)).href)
  } catch (e) {
    console.error(`[locale-integrity] ${locale}: failed to import (${e.message})`)
    holes++
    continue
  }
  walk(mod && mod.default, '', locale)
}

if (holes) {
  console.error(`\n[locale-integrity] FAILED: ${holes} array hole(s) or duplicate row(s). Fix the locale(s) above (override by title, not by index) before building.`)
  process.exit(1)
}
console.log(`[locale-integrity] OK: ${files.length} locale file(s), no array holes, no duplicate rows.`)
