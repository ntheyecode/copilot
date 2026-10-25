// Gate: catch a JSX component that is USED but neither imported nor defined.
// ---------------------------------------------------------------------------
// vite/esbuild do NOT catch this - an unknown <Foo/> is treated as a runtime
// global, so the build passes but the page white-screens with
// "ReferenceError: Foo is not defined" (HTTP 200, blank body). This static check
// flags any capitalized JSX tag whose name appears ONLY as a JSX tag in its file
// (i.e. never imported, declared, destructured or passed as a prop). Conservative
// by design: if the name is referenced anywhere else in the file, it is assumed
// bound, so false positives are rare.
//
// Run before every frontend build/deploy.  node scripts/check-jsx-imports.mjs
// (Introduced 2026-10-24 after a missing `import SiteFooter` white-screened the
// whole marketing site in production.)
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'src'
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.jsx$/.test(e.name)) out.push(p)
  }
  return out
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const files = fs.existsSync(SRC) ? walk(SRC) : []
const problems = []
for (const f of files) {
  // Strip comments first so a JSX-looking name inside a comment is not flagged.
  // Only strip FULL-LINE `//` comments (the original CoverageChat false positive
  // was one). We deliberately do NOT strip `/* ... */` block comments: these
  // files embed CSS in template literals that contain `/* ... */`, and a regex
  // block-strip spans from one marker to a distant one and eats real code
  // (imports included), which is what produced a wave of false positives.
  const src = fs.readFileSync(f, 'utf8')
    .replace(/^[ \t]*\/\/.*$/gm, '')
  // Every capitalized JSX tag used in the file (the root of a member tag too).
  const used = new Set()
  for (const m of src.matchAll(/<([A-Z][\w$]*)/g)) used.add(m[1])
  for (const name of used) {
    const n = esc(name)
    const total = (src.match(new RegExp('\\b' + n + '\\b', 'g')) || []).length
    const asTag = (src.match(new RegExp('<\\/?' + n + '(?=[\\s/>])', 'g')) || []).length
    // If the name appears ONLY as a JSX open/close tag, it was never imported,
    // declared or otherwise bound in this file -> undefined at runtime.
    if (total <= asTag) problems.push(`${f}: <${name}> is used but never imported or defined (would throw "ReferenceError: ${name} is not defined")`)
  }
}

if (problems.length) {
  console.error(`check-jsx-imports: FAIL - ${problems.length} undefined JSX component(s):`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log(`check-jsx-imports: PASS (${files.length} .jsx files; every JSX component is imported or defined)`)
