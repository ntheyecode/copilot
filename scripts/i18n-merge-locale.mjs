// Merge a translated manifest subtree back into a full locale file.
//
//   node scripts/i18n-merge-locale.mjs <locale> <translated.json>
//
// Reads src/i18n/locales/<locale>.js, deep-merges the translated nested object
// into its default export, and rewrites the file with a printer that matches the
// repo's locale style (2-space indent, unquoted identifier keys, single-quoted
// strings). New keys land natively; existing values keep their text. The leading
// comment block of the locale file is preserved.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'

const locale = process.argv[2]
const jsonPath = process.argv[3]
if (!locale || !jsonPath) { console.error('usage: i18n-merge-locale.mjs <locale> <translated.json>'); process.exit(2) }

const dir = resolve('src/i18n/locales')
const file = join(dir, `${locale}.js`)
const current = (await import(pathToFileURL(file).href)).default
const translated = JSON.parse(readFileSync(resolve(jsonPath), 'utf8'))

// deep-merge: translated values win where present, everything else is kept.
const merged = deepMergeEn({ ...current }, translated)

// Preserve the file's leading comment block (everything before `export default`).
const srcText = readFileSync(file, 'utf8')
const idx = srcText.indexOf('export default')
const header = idx > 0 ? srcText.slice(0, idx) : ''

const ID = /^[A-Za-z_$][\w$]*$/
function str(s) {
  // single-quote unless the string has a single quote but no double quote
  if (s.includes("'") && !s.includes('"')) return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"
}
function val(v, ind) {
  if (v === null) return 'null'
  if (typeof v === 'string') return str(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  const pad = '  '.repeat(ind), pad1 = '  '.repeat(ind + 1)
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    const prim = v.every((x) => x === null || typeof x !== 'object')
    if (prim) {
      const inline = '[' + v.map((x) => val(x, ind + 1)).join(', ') + ']'
      if (inline.length <= 100) return inline
    }
    return '[\n' + v.map((x) => pad1 + val(x, ind + 1)).join(',\n') + ',\n' + pad + ']'
  }
  const keys = Object.keys(v)
  if (keys.length === 0) return '{}'
  return '{\n' + keys.map((k) => pad1 + (ID.test(k) ? k : str(k)) + ': ' + val(v[k], ind + 1)).join(',\n') + ',\n' + pad + '}'
}

writeFileSync(file, `${header}export default ${val(merged, 0)}\n`)
console.log(`[i18n-merge] ${locale}: merged ${jsonPath} -> ${file}`)
