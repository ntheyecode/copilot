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

// The same class, other shape (2026-10-30, editions work): a scripted edit
// turned the `\b` of a regex into a literal BACKSPACE character (0x08), which is
// invisible in a terminal and makes the regex never match (company-only FAQ
// links stayed visible on the individuals edition). No source file has a reason
// to hold an ASCII control character other than tab, CR and LF.
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
test('no source file holds an ASCII control character (a lost escape such as \\b turned into 0x08)', () => {
  const hits = []
  for (const d of [...DIRS, 'scripts', 'build', 'editions']) {
    const dir = path.join(ROOT, d)
    if (!fs.existsSync(dir)) continue
    for (const f of files(dir)) {
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        const m = line.match(CONTROL)
        if (m) hits.push(`${path.relative(ROOT, f)}:${i + 1} (0x${m[0].charCodeAt(0).toString(16).padStart(2, '0')})`)
      })
    }
  }
  assert.deepEqual(hits, [])
})

test('the control-character gate catches what it exists for', () => {
  assert.ok(CONTROL.test('/(enterprise|dpa)' + String.fromCharCode(8) + '|x/'))
  assert.ok(!CONTROL.test('/(enterprise|dpa)\\b|x/\t'))
})

// The same class, third shape (2026-10-31, the live widget E2E fake): a
// scripted edit turned the `\n` of a regex into a real line break. That is a
// syntax error, but nothing parsed the e2e/ files until a Playwright run, so
// every e2e module is syntax-checked here, inside npm test.
test('every e2e module parses (a lost \n escape breaks a regex across lines)', async () => {
  const { spawnSync } = await import('node:child_process')
  const bad = []
  for (const f of files(path.join(ROOT, 'e2e'))) {
    if (!/\.mjs$/.test(f)) continue
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' })
    if (r.status !== 0) bad.push(`${path.relative(ROOT, f)}: ${(r.stderr || '').split('\n').find((l) => /Error/.test(l)) || 'does not parse'}`)
  }
  assert.deepEqual(bad, [])
})
