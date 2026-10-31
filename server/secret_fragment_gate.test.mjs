// Gate: tests must not take a secret's random part with split('_').pop().
// Our secrets end in base64url, which can contain '_', so that yields a short
// fragment that other text (a last4, an id) can contain by chance: a test that
// fails about once in a few hundred runs (api_keys.test, 2026-10-31). Take the
// random part from the token's own shape (its regex or fixed prefix) instead.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PATTERN = /\.split\(\s*['"]_['"]\s*\)\.pop\(\)/

function* tests(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* tests(p)
    else if (/\.test\.mjs$/.test(e.name)) yield p
  }
}

test("no test takes a secret's random part with split('_').pop()", () => {
  const hits = []
  for (const d of ['server', 'src', 'e2e', 'build', 'editions']) {
    const dir = path.join(ROOT, d)
    if (!fs.existsSync(dir)) continue
    for (const f of tests(dir)) {
      if (f.endsWith('secret_fragment_gate.test.mjs')) continue
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => { if (PATTERN.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`) })
    }
  }
  assert.deepEqual(hits, [])
})
