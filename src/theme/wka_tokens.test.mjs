// Gate: every console color token a component reads (var(--wka-...)) is
// defined by the console stylesheet. An undefined token silently falls back
// (RecRow read --wka-ink, which never existed, so its values were #111 on the
// dark theme and unreadable, found 2026-10-31). Class fix: no undefined token.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else if (/\.(jsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) yield p
  }
}

test('every var(--wka-*) used in src is defined somewhere in src', () => {
  const defined = new Set()
  const used = new Map()
  for (const f of files(ROOT)) {
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(/(--wka-[a-z0-9-]+)\s*:/g)) defined.add(m[1])
    for (const m of src.matchAll(/var\(\s*(--wka-[a-z0-9-]+)/g)) if (!used.has(m[1])) used.set(m[1], path.relative(ROOT, f))
  }
  const missing = [...used].filter(([k]) => !defined.has(k)).map(([k, f]) => `${k} (first used in ${f})`)
  assert.deepEqual(missing, [])
})
