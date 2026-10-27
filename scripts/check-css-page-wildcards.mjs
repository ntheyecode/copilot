// BUILD GATE: no public page may set `min-width:0` through a wildcard rule on
// its own root (`.wpr *{...min-width:0...}`), because the shared SiteHeader
// renders INSIDE that root and its nowrap nav links then shrink below their
// text and overlap (the header's measured fold never triggers: the row no
// longer overflows, it squeezes). Caught in render verification on
// /workcopilot/pricing at 640px, 2026-10-27. `min-width:0` belongs on the
// page's own grid/flex children (`.wpr-plan *`, `.wm-hero-grid>*`), never on a
// page-root wildcard.
//
// Heuristic, deliberately simple: for every src/pages/*.jsx that imports
// SiteHeader, take the root class (the first className on the returned tree)
// and fail on any `.<root> *{` / `.<root> * {` rule whose body sets min-width:0.
//
//   node scripts/check-css-page-wildcards.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dir = resolve('src/pages')
let failures = 0
let checked = 0
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsx')).sort()) {
  const src = readFileSync(join(dir, f), 'utf8')
  if (!/import\s+SiteHeader\s+from/.test(src)) continue
  checked++
  const m = src.match(/return\s*\(\s*<div\s+className=\{?["'`]([a-zA-Z0-9_-]+)/)
  if (!m) continue
  const root = m[1]
  const re = new RegExp(`\\.${root.replace(/[-]/g, '\\-')}\\s*\\*\\s*\\{([^}]*)\\}`, 'g')
  let hit
  while ((hit = re.exec(src))) {
    if (/min-width\s*:\s*0/.test(hit[1])) {
      failures++
      console.error(`[css-page-wildcards] ${f}: ".${root} *{...}" sets min-width:0 (it reaches the shared header; scope it to the page's own grid children)`)
    }
  }
}
if (failures) { console.error(`\n[css-page-wildcards] FAILED: ${failures} page-root wildcard rule(s) set min-width:0.`); process.exit(1) }
console.log(`[css-page-wildcards] OK: ${checked} public page(s) with SiteHeader, no page-root wildcard sets min-width:0.`)
