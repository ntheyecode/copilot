// BUILD GATE: every full locale carries every key the English catalog has (and
// no stray extras), so a new or changed UI string can never ship English-only
// in one language and translated in another (the i18n release gate). en-GB is
// a sparse override onto en and is skipped. Arrays are compared by length.
//
//   node scripts/check-locale-parity.mjs            whole catalog
//   node scripts/check-locale-parity.mjs widgets    one namespace (dot path)
//
// Prints every gap as locale: path, exits 1 when any locale is missing a key in
// the checked scope. Extra keys (in a locale, not in en) are listed too, since
// they are dead copy nobody can reach.
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const dir = resolve('src/i18n/locales')
const scope = process.argv[2] || ''
const files = readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'en.js' && f !== 'en-GB.js')
const load = async (f) => (await import(pathToFileURL(join(dir, f)).href)).default
const dig = (obj, p) => p.split('.').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), obj)

function keys(val, path, out) {
  if (Array.isArray(val)) { out.set(path, `array[${val.length}]`); return out }
  if (val && typeof val === 'object') { for (const k of Object.keys(val)) keys(val[k], path ? `${path}.${k}` : k, out); return out }
  out.set(path, typeof val)
  return out
}

const en = await load('en.js')
const base = keys(dig(en, scope), scope, new Map())
let missing = 0, extra = 0
for (const f of files) {
  const locale = f.replace(/\.js$/, '')
  const mine = keys(dig(await load(f), scope), scope, new Map())
  for (const [k, kind] of base) {
    const got = mine.get(k)
    if (got === undefined) { console.error(`[locale-parity] ${locale}: missing ${k}`); missing++ }
    else if (got !== kind) { console.error(`[locale-parity] ${locale}: ${k} is ${got}, en has ${kind}`); missing++ }
  }
  for (const k of mine.keys()) if (!base.has(k)) { console.error(`[locale-parity] ${locale}: extra ${k} (not in en)`); extra++ }
}
if (missing) {
  console.error(`\n[locale-parity] FAILED: ${missing} missing/mismatched key(s)${extra ? `, ${extra} extra` : ''} in ${files.length} locale(s)${scope ? ` under ${scope}` : ''}.`)
  process.exit(1)
}
console.log(`[locale-parity] OK: ${files.length} locale(s) carry all ${base.size} en key(s)${scope ? ` under ${scope}` : ''}${extra ? ` (${extra} extra key(s) listed above)` : ''}.`)
