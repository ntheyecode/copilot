// Gate: the dev server never watches build output or other worktrees. On
// Windows the watcher's handle on a new folder under out/ made compose's rename
// fail with EPERM for as long as a dev server ran (2026-10-31).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

test('the base Vite config ignores build output, worktrees and test results', () => {
  const src = read('vite.config.js')
  for (const g of ['**/out/**', '**/dist/**', '**/.claude/worktrees/**', '**/.e2e-results/**']) assert.ok(src.includes(`'${g}'`), `vite.config.js watch.ignored lacks ${g}`)
  assert.match(src, /watch: \{ ignored: VITE_WATCH_IGNORED \}/)
})

test('the verify config keeps the base watch settings', () => {
  assert.match(read('vite.verify.config.js'), /watch: b\.server && b\.server\.watch/)
})
