// BUILD GATE: no NEW hardcoded user-facing string in a *.jsx surface.
//
// Every string a user can read must come from the i18n catalog (t('ns.key'),
// t.rich, t.n) so the 14 translated locales stay complete (owner rule, 2026-10-29:
// "100% compliance on languages in full website dashboards"). A literal typed
// straight into JSX renders English in every locale and silently defeats that.
//
// Rules (each finding names its rule in [brackets]):
//   (a) text      JSX text between two tags:            <b>Hello there</b>
//   (b) attr      literal user-facing attribute:        title="Close the panel"
//   (c) jsx-expr  JSX text next to an expression:       <span>Step {n}</span>,
//                 {why}. Read it carefully before you run it.
//   (d) attr-tpl  template-literal user-facing attr:    aria-label={`Buddy (${name})`}
//   (e) label     English default / literal for a label-like prop or field:
//                 function X({ label = 'Copy' }), <X label="Copy all" />,
//                 { label: 'Notes' }
//   (f) prose     an English sentence in a string or template literal, e.g. a
//                 JSX ternary branch or an object field that renders:
//                 {a ? 'Continue with the updated plan' : 'Continue guiding'}
// (c)-(f) were added 2026-10-30 after the E2E i18n run found real English leaks on
// translated screens that (a)/(b) could not see (SUPREME RULE I: gate the class).
//
// What is NOT user copy, so the rules skip it by SHAPE (never by allowlisting text):
//   - brand / product names, acronyms, single technical tokens (ignorable());
//   - Title Case names with no lowercase word ('Segoe UI', 'Microsoft Teams');
//   - the English fallback in t('key', 'Fallback') / t.rich / t.n;
//   - console.* arguments, thrown Error messages, CSS (style blocks, className,
//     font-family), import paths, URLs/paths (anything with / \ _ = < > { } ...);
//   - a literal compared with data (=== 'X', case 'X':, .includes('X'));
//   - code-payload fields of demo data ({ file, old, new, code, cmd, command }).
// Text that is DATA sent to the server / planner belongs in a .js module, not in
// the .jsx surface (this gate scans .jsx only).
//
// This scan is a BASELINE gate: anything already known-acceptable (brand words,
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
const BRAND = /^(WorkCoPilot|AdmireVeda|Stripe|Tavily|PCI|TikTok|Instagram|YouTube|Facebook|LinkedIn|OpenAI|Anthropic|Google|Microsoft|X \(Twitter\)|Twitter)$/
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

// ---- shared helpers for rules (c)-(f) --------------------------------------
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w))
// A word that is plainly English language (not a name, token or acronym).
const lowerWord = (s) => s.split(/[^A-Za-z']+/).some((w) => /^[a-z]{2,}$/.test(w))
// Characters that mark code, CSS, markup, paths or URLs rather than prose.
const CODE_CHARS = /[<>=_\\/{}|#@$;`[\]^~*]/
// Prose: starts with a capital, two or more real words, at least one of them a
// plain lowercase English word, and no code characters.
function isProse(s) {
  const t = s.replace(/\s+/g, ' ').trim()
  if (!/^[A-Z]/.test(t) || CODE_CHARS.test(t)) return false
  return words(t).length >= 2 && lowerWord(t) && !ignorable(t)
}
const JS_KEYWORD = /^(else|return|catch|finally|from|while|if|export|const|let|var|function|import|case|default|break|continue|try|async|await|new|typeof|instanceof|in|of|do|for|switch|throw|yield|class|extends|as)\b/
// Contexts (the source just BEFORE a literal) in which a literal is not copy.
const SKIP_BEFORE = [
  /\bt(?:\.rich|\.n)?\(\s*(['"`])[^'"`\n]*\1\s*,\s*$/,            // t('key', 'English fallback')
  /\bconsole\.\w+\([^;\n]*$/,                                      // console.warn('...')
  /(?:new\s+\w*Error\([^;\n]*|\bthrow\s+)$/,                       // new Error(x || '...'), throw '...'
  /(?:font-?[Ff]amily|className|class)\s*[:=]\s*\{?\s*$/,          // CSS / class names
  /(?:[!=]==?|\bcase)\s*$/,                                        // === 'X', case 'X':
  /\.(?:includes|startsWith|endsWith|indexOf|has|test|match|split|replace)\(\s*$/, // data checks
  /(?:^|[\s{,])(?:file|old|new|code|cmd|command)\s*:\s*$/,        // code payload of demo data
]
const SKIP_AFTER = /^\s*(?:[!=]==?)/                               // 'X' === y
const skipAt = (src, start, end) => {
  const before = src.slice(Math.max(0, start - 160), start)
  return SKIP_BEFORE.some((re) => re.test(before)) || SKIP_AFTER.test(src.slice(end, end + 8))
}
// Blank a span but keep its newlines, so line numbers stay true.
const blank = (m) => m.replace(/[^\n]/g, ' ')
const TEMPLATE = /`(?:[^`\\]|\\.)*`/g
// A regex literal: a slash in operand position (after ( , = : [ ! & | ? { ; or
// `return`), one line, honoring escapes and [...] classes. Division never starts
// in that position, so it is not matched; a JSX "/>" is excluded.
const REGEX_LITERAL = /(^|[=(,:[!&|?{;]|\breturn)(\s*\/(?![/*>])((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+)\/[dgimsuy]*)/gm
const QUOTED = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g

// Label-like prop / field names: their value is shown to the user as-is.
const LABEL_NAME = '(?:[a-z][A-Za-z]*)?(?:[Ll]abel|[Tt]itle|[Hh]eading|[Pp]laceholder|[Cc]aption|[Mm]essage|[Hh]int|[Cc]ta|[Ee]yebrow|[Ss]ubtitle|[Dd]escription|[Tt]ooltip|emptyText)'

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
    scan(readFileSync(p, 'utf8'), rel)
  }
}

function scan(src, rel, out = findings) {
  // Drop block + line comments so commented copy is never flagged.
  src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
            .replace(/(^|[^:])\/\/[^\n]*/g, (m, a) => a + m.slice(a.length).replace(/[^\n]/g, ' '))
  const lineAt = (i) => src.slice(0, i).split('\n').length
  const seen = new Set()
  const add = (i, kind, txt) => {
    const k = lineAt(i) + '|' + txt
    if (seen.has(k)) return
    seen.add(k)
    out.push({ rel, line: lineAt(i), kind, txt })
  }

  // (a) JSX text nodes: ">  Capitalized words  <" with no braces, tags, or code
  //     punctuation inside. Leading-capital + excluding ()=; keeps JS fragments
  //     (arrow bodies, comparisons, String(...).x) from matching as prose.
  const textRe = />\s*([A-Z][^<>{}()=;]*?)\s*</g
  let m
  while ((m = textRe.exec(src))) {
    const txt = m[1].replace(/\s+/g, ' ').trim()
    if (ignorable(txt)) continue
    add(m.index, 'text', txt)
  }
  // (b) User-facing attributes with a plain string literal (not an expression).
  const attrRe = /\b(title|aria-label|placeholder|alt)\s*=\s*("([^"]*)"|'([^']*)')/g
  while ((m = attrRe.exec(src))) {
    const txt = (m[3] ?? m[4] ?? '').replace(/\s+/g, ' ').trim()
    if (ignorable(txt)) continue
    add(m.index, m[1], txt)
  }

  // Views for (c)-(f): templates blanked (CSS blocks live there), and templates +
  // quoted strings blanked (so JSX-text rules never read inside a string).
  // Regex literals go first: a /```/ pattern must not open a fake template.
  src = src.replace(REGEX_LITERAL, (m0, pre, rest, body) => pre + rest.replace(body, blank(body)))
  const noTpl = src.replace(TEMPLATE, blank)
  const noStr = noTpl.replace(QUOTED, blank)

  // (c) JSX text next to an expression.
  //   c1: ">Step {n}"   text that opens a tag body and runs into an expression.
  const c1 = />[ \t]*\r?\n?\s*([A-Z][^<>{}()=;]*?)\s*\{/g
  while ((m = c1.exec(noStr))) {
    const txt = m[1].replace(/\s+/g, ' ').trim()
    if (!ignorable(txt)) add(m.index, 'jsx-expr', txt)
  }
  //   c2: "{why}. Read it carefully<" / "{n} steps left {" text after an expression.
  const c2 = /\}([^<>{}()=;|&*+$@?\\]*?)(?=[<{])/g
  while ((m = c2.exec(noStr))) {
    const raw = m[1].replace(/\s+/g, ' ').trim()
    const txt = raw.replace(/^[.,:;!?)\]\s]+/, '').trim()
    if (!txt || JS_KEYWORD.test(txt) || ignorable(txt.replace(/[.,:;!?]+$/, ''))) continue
    if (/\w\.\w|[a-z][A-Z]|\w:\S/.test(txt)) continue                 // property access / object keys, not text
    if (words(txt).length >= 2 || /^[A-Z][a-z]/.test(txt)) add(m.index, 'jsx-expr', raw)
  }

  // (d) Template-literal user-facing attributes: aria-label={`Buddy (${name})`}.
  const d = /\b(title|aria-label|aria-description|aria-valuetext|placeholder|alt|label)\s*=\s*\{\s*`((?:[^`\\]|\\.)*)`\s*\}/g
  while ((m = d.exec(src))) {
    const stat = m[2].replace(/\$\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim()
    if (stat.split(/[^A-Za-z]+/).some((w) => w.length >= 2 && !BRAND.test(w))) add(m.index, 'attr-tpl', m[2])
  }

  // (e) Label-like props / fields given an English literal (single words count:
  //     the prop name already says the value is shown).
  const e = [
    new RegExp(`[{,(]\\s*(${LABEL_NAME})\\s*=\\s*(['"])((?:(?!\\2)[^\\\\\\n]|\\\\.)*)\\2`, 'g'),            // ({ label = 'Copy' })
    new RegExp(`\\s(${LABEL_NAME}|text)\\s*=\\s*\\{?\\s*(['"])((?:(?!\\2)[^\\\\\\n]|\\\\.)*)\\2`, 'g'),       // <X label="Copy" />
    new RegExp(`[{,]\\s*(${LABEL_NAME})\\s*:\\s*(['"])((?:(?!\\2)[^\\\\\\n]|\\\\.)*)\\2`, 'g'),             // { label: 'Notes' }
  ]
  for (const re of e) {
    while ((m = re.exec(src))) {
      if (re === e[1] && (m[1] === 'title' || m[1] === 'placeholder')) continue // rule (b) owns title="..."
      const txt = m[3].replace(/\s+/g, ' ').trim()
      if (ignorable(txt) || CODE_CHARS.test(txt) || !/^[A-Z]/.test(txt)) continue
      add(m.index, 'label', `${m[1]}=${txt}`)
    }
  }

  // (f) English sentences in string literals (quoted) ...
  while ((m = QUOTED.exec(noTpl))) {
    const txt = (m[1] ?? m[2]).replace(/\s+/g, ' ').trim()
    if (!isProse(txt) || skipAt(noTpl, m.index, m.index + m[0].length)) continue
    add(m.index, 'prose', txt)
  }
  // ... and in template literals (static text; ${...} counts as a blank).
  while ((m = TEMPLATE.exec(src))) {
    const body = m[0].slice(1, -1)
    const stat = body.replace(/\$\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim()
    if (CODE_CHARS.test(stat.replace(/[{}$]/g, '')) || /[{};]/.test(stat)) continue
    if (/[A-Za-z]\(|\d(?:px|deg|%|ms|s)\b|\w\.\w/.test(stat)) continue  // CSS functions / units, i18n key paths
    if (words(stat).length < 2 || !lowerWord(stat) || ignorable(stat)) continue
    if (!/[A-Z]/.test(stat.replace(/\s.*$/, '')) && words(stat).length < 3) continue
    if (skipAt(src, m.index, m.index + m[0].length)) continue
    add(m.index, 'prose', body)
  }
}

// SELF-TEST (runs on every gate run, SUPREME RULE I): each rule must still fire on
// its signature leak, and each skip shape must stay quiet. If a later edit to a
// regex silently disables a rule, the build fails here instead of letting the
// class of leak back in.
const SELF_TEST = [
  "export function CopyAction({ text, label = 'Copy' }) { return <b>{label}</b> }",
  "const FORMAT = { notes: { label: 'Notes' } }",
  'export function F({ n, why, name, a, t }) {',
  "  console.warn('Image export failed badly')",
  "  const fb = t('ns.key', 'Some English fallback here')",
  "  if (a === 'Too short for this') return null",
  '  return (<div>',
  '    <span>Step {n}</span>',
  '    <span>{why}. Read it carefully before you run it.</span>',
  '    <button aria-label={`Buddy for you (${name})`}>x</button>',
  "    {a ? 'Continue with the updated plan' : 'Continue guiding'}",
  "    <span className={`wc-x${a ? ' on' : ''}`} style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }} />",
  '  </div>)',
  '}',
].join('\n')
{
  const got = []
  scan(SELF_TEST, '<self-test>', got)
  const has = (kind, txt) => got.some((f) => f.kind === kind && f.txt.includes(txt))
  const expect = [['label', 'label=Copy'], ['label', 'label=Notes'], ['jsx-expr', 'Step'], ['jsx-expr', 'Read it carefully'],
    ['attr-tpl', 'Buddy for you'], ['prose', 'Continue with the updated plan'], ['prose', 'Continue guiding']]
  const missing = expect.filter(([k, x]) => !has(k, x))
  const leaked = got.filter((f) => /Image export|English fallback|Too short|JetBrains|wc-x/.test(f.txt))
  if (missing.length || leaked.length) {
    console.error('[hardcoded-strings] SELF-TEST FAILED: a rule stopped firing or a skip shape started firing.')
    for (const [k, x] of missing) console.error(`  missing [${k}] ${x}`)
    for (const f of leaked) console.error(`  false positive [${f.kind}] ${f.txt}`)
    process.exit(1)
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
  console.error('\nKey each string with t(...); do not add it to the allowlist to pass.')
  process.exit(1)
}
console.log('[hardcoded-strings] OK: no hardcoded user-facing strings outside the allowlist.')
