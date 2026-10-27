// Apply a translation patch to ONE full locale file (src/i18n/locales/<code>.js)
// TEXTUALLY and MINIMALLY: comments and formatting are preserved; the diff is
// limited to the touched keys. Placement follows the English catalog's key
// order. This is a superset of i18n-apply-patch.mjs: a `set` value may be a
// string (single line) OR any JSON value (array / object), which is serialized
// as a multi-line JS literal. Verify is deep-equal; on any failure the original
// text is restored (i18n is a release gate, never left half-edited).
//
//   node scripts/i18n-apply-patch-json.mjs <locale> <patch.json> [--dry]
//
// patch.json = { "set": { "a.b.key": <any JSON>, ... }, "delete": ["a.b.key"] }
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { deepMergeEn } from '../src/i18n/deep_merge_en.js'

const [locale, patchFile, flag] = process.argv.slice(2)
if (!locale || !patchFile) { console.error('usage: node scripts/i18n-apply-patch-json.mjs <locale> <patch.json> [--dry]'); process.exit(2) }
const dry = flag === '--dry'
const dir = resolve('src/i18n/locales')
const file = join(dir, `${locale}.js`)
const patch = JSON.parse(readFileSync(patchFile, 'utf8'))
const original = readFileSync(file, 'utf8')
const EOL = original.includes('\r\n') ? '\r\n' : '\n'
let lines = original.split(/\r?\n/)

const load = async (f) => (await import(pathToFileURL(f).href + `?t=${Date.now()}${Math.random()}`)).default
const en = { ...(await load(join(dir, 'en.js'))) }
for (const f of readdirSync(join(dir, 'en')).filter((x) => x.endsWith('.js')).sort()) deepMergeEn(en, (await load(join(dir, 'en', f))) || {})
const dig = (o, p) => p.reduce((x, k) => (x == null ? undefined : x[k]), o)

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

// Serialize any JSON value to a JS literal; first line carries no indent, the
// caller adds the trailing comma. `pad` is the indent of the closing bracket.
function serialize(value, pad) {
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const padc = pad + '  '
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return '[\n' + value.map((v) => padc + serialize(v, padc)).join(',\n') + ',\n' + pad + ']'
  }
  const keys = Object.keys(value)
  if (keys.length === 0) return '{}'
  return '{\n' + keys.map((k) => padc + keyText(k) + ': ' + serialize(value[k], padc)).join(',\n') + ',\n' + pad + '}'
}

function depths() { const d = []; let cur = 0; for (const l of lines) { d.push(cur); cur += net(l) } return d }
function blockEnd(i, childDepth) { const d = depths(); for (let j = i + 1; j < lines.length; j++) if (d[j] === childDepth && net(lines[j]) < 0) return j; throw new Error(`unterminated block at line ${i + 1}`) }
function childLine(block, key) { const d = depths(); const re = keyRe(key); for (let i = block.start + 1; i < block.end; i++) if (d[i] === block.depth + 1 && re.test(lines[i])) return i; return -1 }
function topBlock() { const d = depths(); let open = -1; for (let i = 0; i < lines.length; i++) if (d[i] === 0 && /export\s+default\s*\{/.test(stripCode(lines[i]))) { open = i; break } if (open < 0) throw new Error('no `export default {` found'); return { start: open, end: blockEnd(open, 1), depth: 0 } }
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
function insertionIndex(parent, parentPath, key) {
  const sibs = Object.keys(dig(en, parentPath) || {})
  const idx = sibs.indexOf(key)
  for (let i = idx - 1; i >= 0; i--) { const at = childLine(parent, sibs[i]); if (at >= 0) return (net(lines[at]) > 0 ? blockEnd(at, parent.depth + 2) : at) + 1 }
  for (let i = idx + 1; i < sibs.length; i++) { const at = childLine(parent, sibs[i]); if (at >= 0) return at }
  return parent.end
}
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

const actions = []
for (const [dotted, value] of Object.entries(patch.set || {})) {
  const path = dotted.split('.'); const key = path.pop()
  const parent = ensureParent(path)
  const indent = ' '.repeat((parent.depth + 1) * 2)
  const at = childLine(parent, key)
  const body = serialize(value, indent)
  const text = `${indent}${keyText(key)}: ${body},`
  const newLines = text.split('\n')
  if (at >= 0) {
    const end = net(lines[at]) > 0 ? blockEnd(at, parent.depth + 2) : at
    lines.splice(at, end - at + 1, ...newLines)
    actions.push(`replace ${dotted} @${at + 1}${end > at ? `-${end + 1}` : ''}`)
  } else {
    const i = insertionIndex(parent, path, key)
    lines.splice(i, 0, ...newLines)
    actions.push(`insert  ${dotted} @${i + 1}`)
  }
}
for (const dotted of patch.delete || []) {
  const path = dotted.split('.'); const key = path.pop()
  const parent = path.length ? findBlock(path) : topBlock()
  if (!parent) { actions.push(`skip    ${dotted} (parent absent)`); continue }
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
  for (const [dotted, value] of Object.entries(patch.set || {})) { const got = dig(mod, dotted.split('.')); if (JSON.stringify(got) !== JSON.stringify(value)) throw new Error(`verify: ${dotted} reads back ${JSON.stringify(got)}`) }
  for (const dotted of patch.delete || []) { if (dig(mod, dotted.split('.')) !== undefined) throw new Error(`verify: ${dotted} still present`) }
  console.log(`${locale}: ${actions.length} action(s) applied and verified`)
} catch (e) {
  writeFileSync(file, original)
  console.error(`${locale}: FAILED, original restored: ${e.message}`)
  process.exit(1)
}
