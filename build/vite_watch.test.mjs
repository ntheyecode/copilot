// Gate: the dev server never watches build output or other worktrees, and a
// server started INSIDE a worktree still watches its own files. On Windows the
// watcher's handle on a new folder under out/ made compose's rename fail with
// EPERM for as long as a dev server ran; and the first fix ('**/.claude/
// worktrees/**') matched every file of a worktree's own server, so it never
// saw an edit (both 2026-10-31).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VITE_WATCH_IGNORED } from '../vite.config.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8')

test('the base Vite config ignores build output, test results and this checkout\'s worktrees', () => {
  for (const g of ['**/out/**', '**/dist/**', '**/.e2e-results/**']) assert.ok(VITE_WATCH_IGNORED.includes(g), `watch.ignored lacks ${g}`)
  const wt = VITE_WATCH_IGNORED.find((g) => g.includes('.claude/worktrees'))
  assert.equal(wt, `${ROOT.replace(/\\/g, '/')}/.claude/worktrees/**`, 'worktrees are ignored by this checkout\'s own path')
  assert.ok(!VITE_WATCH_IGNORED.some((g) => g.startsWith('**/.claude')), 'a **/.claude/... pattern ignores every file of a server running inside a worktree')
  assert.match(read('vite.config.js'), /watch: \{ ignored: VITE_WATCH_IGNORED \}/)
})

test('the verify config keeps the base watch settings', () => {
  assert.match(read('vite.verify.config.js'), /watch: b\.server && b\.server\.watch/)
})
