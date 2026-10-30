// Gate: code generated through a shell script or a JS string can silently lose a
// backslash. Twice on 2026-10-30 a regex lost its escapes (`/^\d{4}-\d{2}$/`
// became `/^d{4}-d{2}$/`, which matches the letter d and so never matched a real
// month). A bare `d{N}` quantifier is never what anyone means, so it fails here.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['server', 'src']
const EXT = /\.(m?js|jsx)$/
const LOST_DIGIT_ESCAPE = /(^|[^\\a-zA-Z0-9_])d\{\d/

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else if (EXT.test(e.name)) yield p
  }
}

test('no regex digit class lost its backslash (d{N} instead of \\d{N})', () => {
  const hits = []
  for (const d of DIRS) {
    for (const f of files(path.join(ROOT, d))) {
      if (f.endsWith('escape_loss_gate.test.mjs')) continue
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (LOST_DIGIT_ESCAPE.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`)
      })
    }
  }
  assert.deepEqual(hits, [])
})
