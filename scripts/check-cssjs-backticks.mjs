// BUILD GATE: no backtick inside a CSS /* ... */ comment in a *.css.js module.
//
// These modules export CSS as a JS TEMPLATE LITERAL (`export const css = ` ... ``).
// A backtick typed inside a CSS comment in that body silently CLOSES the template
// literal early: the file can still parse as valid JS, so the build passes, but the
// CSS string is truncated at that point and the stylesheet is broken when the
// component mounts. It surfaces only in render verification, not in the build.
// Caught 2026-10-28; one scan kills the class (SUPREME RULE I + V).
//
// Heuristic: within each *.css.js file, only the region from the first backtick
// (where the first template literal opens) onward can hit this. In that region,
// flag any `/* ... */` comment whose body contains a backtick.
//
//   node scripts/check-cssjs-backticks.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

let failures = 0
let checked = 0

function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    const p = join(d, e.name)
    if (e.isDirectory()) { walk(p); continue }
    if (!e.name.endsWith('.css.js')) continue
    checked++
    const src = readFileSync(p, 'utf8')
    const firstTick = src.indexOf('`')
    if (firstTick < 0) continue                 // no template literal, nothing to break
    // Scan /* ... */ comments that begin after the template opens.
    const re = /\/\*[\s\S]*?\*\//g
    let m
    while ((m = re.exec(src))) {
      if (m.index < firstTick) continue         // a header comment before the template is safe
      if (m[0].includes('`')) {
        failures++
        const line = src.slice(0, m.index).split('\n').length
        console.error(`[cssjs-backticks] ${p}:${line}: a backtick inside a CSS /* */ comment closes the template literal early (remove it; builds but breaks the stylesheet at render)`)
      }
    }
  }
}

walk(resolve('src'))
if (failures) { console.error(`\n[cssjs-backticks] FAILED: ${failures} backtick(s) inside css.js CSS comments.`); process.exit(1) }
console.log(`[cssjs-backticks] OK: ${checked} *.css.js file(s), no backtick inside a CSS comment.`)
