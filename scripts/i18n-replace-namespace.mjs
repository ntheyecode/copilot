// Replace ONE top-level namespace block of a full locale file
// (src/i18n/locales/<code>.js) with the translation in a JSON file, textually:
// only the lines of that block change, every other line of the 13k-line file
// (comments, formatting, the other namespaces) is untouched.
//
//   node scripts/i18n-replace-namespace.mjs <locale> <namespace> <translated.json> [--dry]
//
// translated.json holds the namespace's value (the object under the key), for
// example the `indiv` object for the LinkNotes site. It is printed in the
// repo's locale style (2-space indent, unquoted identifier keys, single-quoted
// strings). The file's own line endings are kept.
//
// Why a separate tool: i18n-apply-patch.mjs sets single keys and
// i18n-merge-locale.mjs reprints the WHOLE file; a site rewrite replaces a whole
// namespace (new keys, dropped keys, reordered lists), which neither does
// without a sprawling diff or stale keys left behind for the parity gate.
//
// SAFETY: the block is found by its exact top-level line (`  <ns>: {`) and
// closed at the next `  },` at the same indentation; the span is asserted to be
// balanced before anything is written, and the file is re-imported afterwards:
// the namespace must read back deep-equal to the JSON or the original text is
// restored and the run fails (i18n is a release gate).
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const [locale, ns, jsonPath, flag] = process.argv.slice(2)
if (!locale || !ns || !jsonPath) { console.error('usage: node scripts/i18n-replace-namespace.mjs <locale> <namespace> <translated.json> [--dry]'); process.exit(2) }
const dry = flag === '--dry'
const file = join(resolve('src/i18n/locales'), `${locale}.js`)
const value = JSON.parse(readFileSync(resolve(jsonPath), 'utf8'))
if (!value || typeof value !== 'object' || Array.isArray(value)) { console.error('[i18n-replace] the JSON must hold the namespace object'); process.exit(2) }

const original = readFileSync(file, 'utf8')
const EOL = original.includes('\r\n') ? '\r\n' : '\n'
const lines = original.split(/\r?\n/)

const ID = /^[A-Za-z_$][\w$]*$/
function str(s) {
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
      if (inline.length <= 110) return inline
    }
    return '[' + EOL + v.map((x) => pad1 + val(x, ind + 1)).join(',' + EOL) + ',' + EOL + pad + ']'
  }
  const keys = Object.keys(v)
  if (keys.length === 0) return '{}'
  return '{' + EOL + keys.map((k) => pad1 + (ID.test(k) ? k : str(k)) + ': ' + val(v[k], ind + 1)).join(',' + EOL) + ',' + EOL + pad + '}'
}

// Locate the block: the top-level key line and its closing line.
const open = lines.findIndex((l) => l === `  ${ns}: {` || l === `  '${ns}': {`)
let close = -1
if (open >= 0) {
  for (let i = open + 1; i < lines.length; i++) {
    if (lines[i] === '  },' || lines[i] === '  }') { close = i; break }
    if (/^  [A-Za-z_$'"]/.test(lines[i])) break   // another top-level key before a close: not balanced
  }
}
let out
if (open >= 0 && close > open) {
  const block = (`  ${ns}: ` + val(value, 1) + ',').split(EOL)
  out = [...lines.slice(0, open), ...block, ...lines.slice(close + 1)]
} else {
  // No block yet: insert before the final `}` of the export.
  const end = lines.map((l, i) => (l === '}' ? i : -1)).filter((i) => i >= 0).pop()
  if (end == null) { console.error(`[i18n-replace] ${locale}: cannot find the end of the export`); process.exit(1) }
  const block = (`  ${ns}: ` + val(value, 1) + ',').split(EOL)
  out = [...lines.slice(0, end), ...block, ...lines.slice(end)]
}
const text = out.join(EOL)
if (dry) { console.log(`[i18n-replace] ${locale}.${ns}: ${open >= 0 ? `would replace lines ${open + 1}-${close + 1}` : 'would append'} (${text.length} chars)`); process.exit(0) }

writeFileSync(file, text)
try {
  const mod = (await import(pathToFileURL(file).href + `?t=${Date.now()}`)).default
  if (!isDeepStrictEqual(mod[ns], value)) throw new Error('the namespace does not read back equal to the JSON')
} catch (e) {
  writeFileSync(file, original)
  console.error(`[i18n-replace] ${locale}.${ns}: FAILED (${e.message}); original restored`)
  process.exit(1)
}
console.log(`[i18n-replace] ${locale}.${ns}: ${open >= 0 ? `replaced lines ${open + 1}-${close + 1}` : 'appended'}`)
