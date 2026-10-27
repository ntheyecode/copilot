// Apply a translation patch to ONE full locale file (src/i18n/locales/<code>.js)
// TEXTUALLY: comments and formatting are preserved and the diff is limited to
// the touched lines. Placement follows the English catalog's key order, so a
// translated key lands next to the same neighbours it has in English.
//
//   node scripts/i18n-apply-patch.mjs <locale> <patch.json> [--dry]
//
// patch.json = { "set": { "a.b.key": "value", ... }, "delete": ["a.b.key", ...] }
//   set    : replaces the value when the key exists (single-line string values),
//            else inserts it after its nearest PRECEDING English sibling that the
//            locale already has, else before the nearest FOLLOWING one, else at
//            the end of the parent block. Missing parents are created, so the
//            first key of a brand-new namespace creates its block.
//   delete : removes the key's line, or its whole block when the value is an
//            object/array.
//
// SAFETY: after writing, the file is re-imported and every set key must read
// back exactly and every deleted key must be gone; otherwise the original text
// is restored and the run fails. A cut-off or a bad anchor can never leave a
// locale half-edited (i18n is a release gate).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'

const [locale, patchFile, flag] = process.argv.slice(2)
if (!locale || !patchFile) { console.error('usage: node scripts/i18n-apply-patch.mjs <locale> <patch.json> [--dry]'); process.exit(2) }
const dry = flag === '--dry'
const dir = resolve('src/i18n/locales')
const file = join(dir, `${locale}.js`)
const patch = JSON.parse(readFileSync(patchFile, 'utf8'))
const original = readFileSync(file, 'utf8')
const EOL = original.includes('\r\n') ? '\r\n' : '\n'
let lines = original.split(/\r?\n/)

// English catalog exactly as the runtime builds it (base + every partial).
const load = async (f) => (await import(pathToFileURL(f).href + `?t=${Date.now()}`)).default
const en = { ...(await load(join(dir, 'en.js'))) }
for (const f of readdirSync(join(dir, 'en')).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, (await load(join(dir, 'en', f))) || {})
const dig = (o, p) => p.reduce((x, k) => (x == null ? undefined : x[k]), o)

// Brace counting that ignores string literals and line comments.
function stripCode(line) {
  let out = '', q = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '\\') { i++; continue } if (c === q) q = null; continue }
    if (c === "'" || c === '"' || c === '`') { q = c; continue }
    if (c === '/' && line[i + 1] === '/') break
    out += c
  }
  return out
}
const opens = (s) => (s.match(/[{[]/g) || []).length
const closes = (s) => (s.match(/[}\]]/g) || []).length
const net = (line) => { const s = stripCode(line); return opens(s) - closes(s) }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const keyRe = (k) => new RegExp(`^(\\s*)(?:'${esc(k)}'|"${esc(k)}"|${esc(k)})\\s*:`)
const keyText = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k.replace(/'/g, "\\'")}'`)
const quote = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`

// Depth BEFORE each line (top-level keys inside `export default {` are depth 1).
function depths() {
  const d = []; let cur = 0
  for (const l of lines) { d.push(cur); cur += net(l) }
  return d
}
// Closing line of the block that opens on line i (whose children sit at childDepth).
function blockEnd(i, childDepth) {
  const d = depths()
  for (let j = i + 1; j < lines.length; j++) if (d[j] === childDepth && net(lines[j]) < 0) return j
  throw new Error(`unterminated block at line ${i + 1}`)
}
// First child key line of `key` inside a block (depth = block.depth + 1), or -1.
function childLine(block, key) {
  const d = depths(); const re = keyRe(key)
  for (let i = block.start + 1; i < block.end; i++) if (d[i] === block.depth + 1 && re.test(lines[i])) return i
  return -1
}
// The block {start,end,depth} for an object path; null when absent; single:true
// when the path ends on a single-line value. depth = depth of the key line.
function findBlock(path) {
  let block = topBlock()
  for (const k of path) {
    const at = childLine(block, k)
    if (at < 0) return null
    if (net(lines[at]) <= 0) return { start: at, end: at, depth: block.depth + 1, single: true }
    block = { start: at, end: blockEnd(at, block.depth + 2), depth: block.depth + 1 }
  }
  return block
}
function topBlock() {
  const d = depths()
  let open = -1
  for (let i = 0; i < lines.length; i++) if (d[i] === 0 && /export\s+default\s*\{/.test(stripCode(lines[i]))) { open = i; break }
  if (open < 0) throw new Error('no `export default {` found')
  return { start: open, end: blockEnd(open, 1), depth: 0 }
}
// Where a NEW key goes inside its parent block, following English order.
function insertionIndex(parent, parentPath, key) {
  const sibs = Object.keys(dig(en, parentPath) || {})
  const idx = sibs.indexOf(key)
  for (let i = idx - 1; i >= 0; i--) { const at = childLine(parent, sibs[i]); if (at >= 0) return (net(lines[at]) > 0 ? blockEnd(at, parent.depth + 2) : at) + 1 }
  for (let i = idx + 1; i < sibs.length; i++) { const at = childLine(parent, sibs[i]); if (at >= 0) return at }
  return parent.end
}
// The block for path, creating missing objects along the way.
function ensureParent(path) {
  if (path.length === 0) return topBlock()
  const b = findBlock(path)
  if (b && !b.single) return b
  if (b && b.single) throw new Error(`${path.join('.')} is a single-line value, cannot nest into it`)
  const parent = ensureParent(path.slice(0, -1))
  const key = path[path.length - 1]
  const indent = ' '.repeat((parent.depth + 1) * 2)
  const at = insertionIndex(parent, path.slice(0, -1), key)
  lines.splice(at, 0, `${indent}${keyText(key)}: {`, `${indent}},`)
  return findBlock(path)
}

// A parent written on ONE line, `key: { a: 'x', b: 'y' },`: edit it in place.
const inlineKeyRe = (key) => new RegExp(`([{,]\\s*)(?:'${esc(key)}'|"${esc(key)}"|${esc(key)})(\\s*:\\s*)(['"])((?:\\\\.|(?!\\3).)*)\\3`)
function inlineSet(i, key, value, dotted) {
  const re = inlineKeyRe(key)
  if (re.test(lines[i])) { lines[i] = lines[i].replace(re, (m, pre, colon) => `${pre}${keyText(key)}${colon}${quote(value)}`); return `replace ${dotted} @${i + 1} (inline)` }
  const close = lines[i].lastIndexOf('}')
  if (close < 0) throw new Error(`${dotted}: parent is not an inline object (line ${i + 1})`)
  const before = lines[i].slice(0, close).replace(/\s*$/, '')
  const sep = /\{$/.test(before) ? ' ' : ', '
  lines[i] = `${before}${sep}${keyText(key)}: ${quote(value)} ${lines[i].slice(close)}`
  return `insert  ${dotted} @${i + 1} (inline)`
}
function inlineDelete(i, key, dotted) {
  const re = new RegExp(`(?:'${esc(key)}'|"${esc(key)}"|${esc(key)})\\s*:\\s*(['"])(?:\\\\.|(?!\\1).)*\\1\\s*,?\\s*`)
  if (!re.test(lines[i])) return `skip    ${dotted} (absent, inline)`
  lines[i] = lines[i].replace(re, '').replace(/,\s*\}/, ' }').replace(/\{\s*,/, '{ ').replace(/,\s*,/, ',')
  return `delete  ${dotted} @${i + 1} (inline)`
}

const actions = []
for (const [dotted, value] of Object.entries(patch.set || {})) {
  const path = dotted.split('.'); const key = path.pop()
  const direct = path.length ? findBlock(path) : null
  if (direct && direct.single) { actions.push(inlineSet(direct.start, key, value, dotted)); continue }
  const parent = ensureParent(path)
  const at = childLine(parent, key)
  const indent = ' '.repeat((parent.depth + 1) * 2)
  if (at >= 0) {
    const m = lines[at].match(/^(\s*(?:'[^']*'|"[^"]*"|[\w$]+)\s*:\s*)(['"])((?:\\.|(?!\2).)*)\2(\s*,?)\s*$/)
    if (!m) throw new Error(`${dotted}: existing value is not a single-line string (line ${at + 1}); delete it first`)
    lines[at] = `${m[1]}${quote(value)}${m[4] || ','}`
    actions.push(`replace ${dotted} @${at + 1}`)
  } else {
    const i = insertionIndex(parent, path, key)
    lines.splice(i, 0, `${indent}${keyText(key)}: ${quote(value)},`)
    actions.push(`insert  ${dotted} @${i + 1}`)
  }
}
for (const dotted of patch.delete || []) {
  const path = dotted.split('.'); const key = path.pop()
  const parent = path.length ? findBlock(path) : topBlock()
  if (!parent) { actions.push(`skip    ${dotted} (parent absent)`); continue }
  if (parent.single) { actions.push(inlineDelete(parent.start, key, dotted)); continue }
  const at = childLine(parent, key)
  if (at < 0) { actions.push(`skip    ${dotted} (absent)`); continue }
  const end = net(lines[at]) > 0 ? blockEnd(at, parent.depth + 2) : at
  lines.splice(at, end - at + 1)
  actions.push(`delete  ${dotted} @${at + 1}${end > at ? `-${end + 1}` : ''}`)
}
for (const a of actions) console.log(a)
if (dry) { console.log(`[dry] ${locale}: ${actions.length} action(s), nothing written`); process.exit(0) }
writeFileSync(file, lines.join(EOL))
try {
  const mod = await load(file)
  for (const [dotted, value] of Object.entries(patch.set || {})) { const got = dig(mod, dotted.split('.')); if (got !== value) throw new Error(`verify: ${dotted} reads back ${JSON.stringify(got)}`) }
  for (const dotted of patch.delete || []) { if (dig(mod, dotted.split('.')) !== undefined) throw new Error(`verify: ${dotted} still present`) }
  console.log(`${locale}: ${actions.length} action(s) applied and verified`)
} catch (e) {
  writeFileSync(file, original)
  console.error(`${locale}: FAILED, original restored: ${e.message}`)
  process.exit(1)
}
