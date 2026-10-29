// BUILD GATE: no NEW hardcoded user-facing string in a *.jsx surface.
//
// Every string a user can read must come from the i18n catalog (t('ns.key'),
// t.rich, t.n) so the 14 translated locales stay complete (owner rule, 2026-10-29:
// "100% compliance on languages in full website dashboards"). A literal typed
// straight into JSX renders English in every locale and silently defeats that.
//
// This scan is a BASELINE gate: it flags literal JSX text nodes and literal
// user-facing attributes (title / aria-label / placeholder / alt) that are NOT
// wrapped in an expression. Anything already known-acceptable (brand words,
// dead/non-UI files, technical tokens) lives in scripts/i18n-allowed.json; the
// gate fails only on findings that are NOT in that allowlist, so a NEW hardcoded
// string breaks the build while the documented baseline passes (SUPREME RULE V:
// a gate, not a doc). Shrink the baseline by keying a string and deleting its
// allow entry; never grow it to dodge this check.
//
//   node scripts/check-hardcoded-strings.mjs            # gate (honors allowlist)
//   node scripts/check-hardcoded-strings.mjs --report   # list every finding, exit 0
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, relative, sep } from 'node:path'

const REPORT = process.argv.includes('--report')
const ROOT = resolve('src')
const ALLOW_PATH = resolve('scripts/i18n-allowed.json')

// Files we never treat as a translation surface: no reader-facing copy, or copy
// that is intentionally not localized (dev-only / logos / pure math wrappers).
const FILE_ALLOW = new Set(
  existsSync(ALLOW_PATH) ? (JSON.parse(readFileSync(ALLOW_PATH, 'utf8')).files || []) : [],
)
// Specific literal strings allowed anywhere (brand, provider, format tokens).
const TEXT_ALLOW = new Set(
  existsSync(ALLOW_PATH) ? (JSON.parse(readFileSync(ALLOW_PATH, 'utf8')).text || []) : [],
)

// A literal is "ignorable" when it carries no translatable language: brand and
// product names, single technical tokens, numbers/symbols, or ALL-CAPS acronyms.
const BRAND = /^(WorkCoPilot|AdmireVeda|COE Security(?: LLC)?|Stripe|Tavily|PCI|TikTok|Instagram|YouTube|Facebook|LinkedIn|OpenAI|Anthropic|Google|Microsoft|X \(Twitter\)|Twitter)$/
function ignorable(s) {
  const t = s.trim()
  if (!t) return true
  if (TEXT_ALLOW.has(t)) return true
  if (BRAND.test(t)) return true
  if (!/[A-Za-z]{2}/.test(t)) return true          // no real word (digits, dots, dashes)
  if (/^[A-Z0-9 ._\-/+%&()]+$/.test(t) && !/[a-z]/.test(t)) return true // ALL-CAPS token/acronym
  if (/^[A-Za-z][A-Za-z0-9.]*$/.test(t) && t.length <= 2) return true   // 1-2 char id
  return false
}

const findings = []
function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    const p = join(d, e.name)
    if (e.isDirectory()) { walk(p); continue }
    if (!e.name.endsWith('.jsx')) continue
    if (e.name.endsWith('.test.jsx')) continue
    const rel = relative(process.cwd(), p).split(sep).join('/')
    if (FILE_ALLOW.has(rel)) continue
    scan(p, rel)
  }
}

function scan(p, rel) {
  let src = readFileSync(p, 'utf8')
  // Drop block + line comments so commented copy is never flagged.
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
            .replace(/(^|[^:])\/\/[^\n]*/g, (m, a) => a + m.slice(a.length).replace(/[^\n]/g, ' '))
  const lineAt = (i) => src.slice(0, i).split('\n').length

  // (a) JSX text nodes: ">  Capitalized words  <" with no braces, tags, or code
  //     punctuation inside. Leading-capital + excluding ()=; keeps JS fragments
  //     (arrow bodies, comparisons, String(...).x) from matching as prose.
  const textRe = />\s*([A-Z][^<>{}()=;]*?)\s*</g
  let m
  while ((m = textRe.exec(src))) {
    const txt = m[1].replace(/\s+/g, ' ').trim()
    if (ignorable(txt)) continue
    findings.push({ rel, line: lineAt(m.index), kind: 'text', txt })
  }
  // (b) User-facing attributes with a plain string literal (not an expression).
  const attrRe = /\b(title|aria-label|placeholder|alt)\s*=\s*("([^"]*)"|'([^']*)')/g
  while ((m = attrRe.exec(src))) {
    const txt = (m[3] ?? m[4] ?? '').replace(/\s+/g, ' ').trim()
    if (ignorable(txt)) continue
    findings.push({ rel, line: lineAt(m.index), kind: m[1], txt })
  }
}

walk(ROOT)
findings.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line)

if (REPORT) {
  const byFile = {}
  for (const f of findings) (byFile[f.rel] ||= []).push(f)
  for (const [rel, list] of Object.entries(byFile)) {
    console.log(`\n${rel}  (${list.length})`)
    for (const f of list) console.log(`  ${f.line}  [${f.kind}] ${JSON.stringify(f.txt)}`)
  }
  console.log(`\n[hardcoded-strings] ${findings.length} finding(s) across ${Object.keys(byFile).length} file(s).`)
  process.exit(0)
}

if (findings.length) {
  console.error(`[hardcoded-strings] FAILED: ${findings.length} hardcoded user-facing string(s) not in scripts/i18n-allowed.json:`)
  for (const f of findings.slice(0, 60)) console.error(`  ${f.rel}:${f.line} [${f.kind}] ${JSON.stringify(f.txt)}`)
  if (findings.length > 60) console.error(`  ... and ${findings.length - 60} more`)
  console.error('\nKey each string with t(...) — do not add it to the allowlist to pass.')
  process.exit(1)
}
console.log('[hardcoded-strings] OK: no hardcoded user-facing strings outside the allowlist.')
