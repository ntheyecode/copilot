// BUILD GATE: every i18n key the code names as a string literal must exist in
// the English catalog (en.js + every en/*.js partial, merged exactly as the
// runtime does via deep_merge_en.js) AND resolve to text. A missing key renders
// as the raw key ("workShell.nav.teach") in the UI for every locale, and no other
// gate sees it: locale-parity compares locales to English, so a key absent from
// English too passes silently. That shipped: the Teach studio rail entry showed
// "workShell.nav.teach" from the Wave 1 UI (5a78a0e) until 2026-10-30.
//
// Scanned: t('a.b'), t.rich('a.b'), t.n('a.b', n) (plural: a.b_one or a.b_other
// must exist), in single quotes, double quotes or a backtick literal without
// ${}, plus any `<name>Key: 'a.b'` object value (labelKey, helpKey, msgKey...).
// A dotted literal whose first segment is not a catalog namespace is reported
// too (a namespace typo is the same bug). t(key, 'English fallback') is not an
// exception: the fallback shows English in every other locale, so the key must
// still exist. A key built at run time (`'x.' + id`, a template with ${}) is out
// of reach for a static scan: review those call sites. Wired into `prebuild`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve, relative } from 'node:path'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'

const ROOT = resolve('.')
const dir = resolve('src/i18n/locales')
const load = async (f) => (await import(pathToFileURL(f).href)).default
const en = { ...(await load(join(dir, 'en.js'))) }
for (const f of readdirSync(join(dir, 'en')).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, (await load(join(dir, 'en', f))) || {})
const at = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), en)
// Any defined value counts: besides strings and keyed lists, pages read whole
// structured blocks through t() on purpose (t('guide.scenarios.hr') -> object).
const has = (key) => at(key) !== undefined
const hasPlural = (key) => has(key) || has(key + '_one') || has(key + '_other')

function files(d, out = []) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (name === 'i18n' || name === 'node_modules') continue
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.(jsx?|mjs)$/.test(name) && !/\.test\.mjs$/.test(name)) out.push(p)
  }
  return out
}

const NS = new Set(Object.keys(en))
const KEY = String.raw`([A-Za-z][\w]*(?:\.[\w-]+)+)`
const Q = String.raw`(?:'${KEY}'|"${KEY}"|\x60${KEY}\x60)`
const CALL = new RegExp(String.raw`(?<![\w$.])t(\.rich|\.n)?\(\s*` + Q, 'g')
const PROP = new RegExp(String.raw`\b\w*Key\s*:\s*` + Q, 'g')
const keyOf = (m, first) => m[first] || m[first + 1] || m[first + 2]

const missing = []
for (const f of files(join(ROOT, 'src'))) {
  const src = readFileSync(f, 'utf8')
  const lineOf = (i) => src.slice(0, i).split('\n').length
  const report = (i, key, why) => missing.push(`${relative(ROOT, f)}:${lineOf(i)}  ${key}${why ? '  (' + why + ')' : ''}`)
  const check = (i, key, plural) => {
    if (!NS.has(key.split('.')[0])) return report(i, key, 'unknown namespace')
    if (!(plural ? hasPlural(key) : has(key))) report(i, key, '')
  }
  for (const m of src.matchAll(CALL)) check(m.index, keyOf(m, 2), m[1] === '.n')
  for (const m of src.matchAll(PROP)) {
    const key = keyOf(m, 1)
    if (NS.has(key.split('.')[0])) check(m.index, key, false)   // a *Key prop holding a non-i18n dotted value (a path) is not ours
  }
}

if (missing.length) {
  console.error(`[i18n-keys] ${missing.length} key(s) used in code are missing from the English catalog (they render as the raw key):`)
  for (const m of missing) console.error('  ' + m)
  process.exit(1)
}
console.log('[i18n-keys] OK: every literal i18n key used in src exists in the English catalog.')
