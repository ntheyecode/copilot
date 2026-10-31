// Gate: shifting a date by whole months with setUTCMonth / setMonth keeps the
// day of the month, so from the 29th-31st "one month back" lands back in the
// current month (2026-10-30: plan_allowance's "last month" was this month).
// Every month shift must start from a date pinned to the 1st: a startOf...()
// result, Date.UTC(y, m, 1), or setUTCDate(1) on one of the 3 lines before it.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['server', 'src']
const EXT = /\.(m?js|jsx)$/
const SHIFT = /\.set(UTC)?Month\(/
const PINNED = /startOf\w*\(|Date\.UTC\([^)]*,\s*1\s*\)|set(UTC)?Date\(\s*1\s*\)/

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else if (EXT.test(e.name)) yield p
  }
}

test('every month shift starts from the 1st of a month', () => {
  const hits = []
  for (const d of DIRS) {
    for (const f of files(path.join(ROOT, d))) {
      if (f.endsWith('month_shift_gate.test.mjs')) continue
      const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
      lines.forEach((line, i) => {
        if (!SHIFT.test(line)) return
        const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n')
        if (!PINNED.test(window)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`)
      })
    }
  }
  assert.deepEqual(hits, [])
})
