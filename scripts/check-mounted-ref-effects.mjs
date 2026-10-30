// BUILD GATE: a "still mounted" ref must be set true in its effect's BODY, not
// only flipped false in the effect's cleanup.
//
// React StrictMode (src/main.jsx) mounts, unmounts and re-mounts every component
// once in development. An effect written as
//   useEffect(() => () => { alive.current = false }, [])
// runs that cleanup on the simulated unmount and never sets the flag back, so
// every async run guarded by `if (!alive.current) return` silently stops after
// its first await. Caught 2026-10-30 in render verification of the Teach "Read
// steps" pass (stuck on "Saving your draft first"); unit tests cannot see it.
// The fix is the pattern the sibling hooks already use:
//   useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
//
// Heuristic, covering every form of the class: for each useEffect /
// useLayoutEffect whose cleanup assigns `<ref>.current = false` (arrow-returned
// cleanup or `return () => ...`), the effect's own text before that cleanup must
// also assign `<ref>.current = true`.
//
//   node scripts/check-mounted-ref-effects.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const root = resolve('src')
const files = []
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(jsx?|mjs)$/.test(f) && !/\.test\.mjs$/.test(f)) files.push(p)
  }
}
walk(root)

const effectRe = /use(?:Layout)?Effect\(\s*\(\)\s*=>/g
const cleanupRe = /(?:=>\s*|return\s*)\(\)\s*=>/
const depsRe = /\}\s*,\s*\[|\)\s*,\s*\[\]\s*\)/
let failures = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  let m
  while ((m = effectRe.exec(src))) {
    // The effect's text up to its dependency list.
    const rest = src.slice(m.index, m.index + 1500)
    const end = rest.search(depsRe)
    const body = end > 0 ? rest.slice(0, end) : rest
    const cleanupAt = body.search(cleanupRe)
    if (cleanupAt < 0) continue
    const before = body.slice(0, cleanupAt)
    const falseRe = /\b(\w+)\.current\s*=\s*false\b/g
    let h
    while ((h = falseRe.exec(body.slice(cleanupAt)))) {
      const name = h[1]
      if (new RegExp('\\b' + name + '\\.current\\s*=\\s*true\\b').test(before)) continue
      const line = src.slice(0, m.index).split('\n').length
      console.error(`[mounted-ref-effects] ${relative(process.cwd(), f)}:${line} effect cleanup sets ${name}.current = false but its body never sets it true (StrictMode re-mount leaves it false).`)
      failures++
    }
  }
}
if (failures) { console.error(`[mounted-ref-effects] FAIL: ${failures} mounted-ref effect(s) without a body that sets the ref true.`); process.exit(1) }
console.log(`[mounted-ref-effects] OK: ${files.length} file(s), every mounted-ref cleanup is paired with a body that sets it true.`)
