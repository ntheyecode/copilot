// Gate: the user's theme mode paints on EVERY signed-in console, from one
// route-level scope (ProductThemeScope). Origin: e2e/FINDINGS.md #4, where the
// Teach studio, Workflow issues, executive, company and admin consoles stayed
// light in dark mode because only the /work shell turned product theming on.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = fs.readFileSync(path.join(SRC, 'App.jsx'), 'utf8')

// The lines inside <Route element={<ProductThemeScope />}> ... its </Route>.
// App.jsx writes one <Route> per line: a line ending in "/>" is self-closing,
// any other <Route line opens a level.
function scopeBlock(name = 'ProductThemeScope') {
  const lines = app.split(/\r?\n/)
  const start = lines.findIndex((l) => l.includes(`<Route element={<${name} />}>`))
  assert.ok(start > 0, `App.jsx wraps the signed-in consoles in ${name}`)
  let depth = 0
  for (let i = start; i < lines.length; i++) {
    const l = lines[i].trim()
    if (l.startsWith('</Route>')) { depth -= 1; if (depth === 0) return lines.slice(start, i).join('\n') }
    else if (l.startsWith('<Route') && !l.endsWith('/>')) depth += 1
  }
  throw new Error('unbalanced <Route> in App.jsx')
}

test('every signed-in console renders inside the product theme scope', () => {
  const block = scopeBlock()
  for (const p of ['"/work"', '"/work/admin"', '"/work/company"', '"/work/exec"', '"/work/teach"', '"/work/workflow-issues"', '"/work/launch"']) {
    assert.ok(block.includes(`path=${p}`), `${p} is inside ProductThemeScope`)
  }
  // The buddy and full-guide windows follow their own surface scheme.
  for (const p of ['"/work/buddy"', '"/work/guide"']) assert.ok(!block.includes(`path=${p}`), `${p} stays outside`)
})

// Same shape for sign-in: a signed-out visitor to any console goes to sign-in
// (e2e/FINDINGS.md #5). The launch page parks its token first, so it handles
// its own sign-in hop; the buddy and full-guide windows say "sign in on the main
// window" instead.
test('every signed-in console sends a signed-out visitor to sign in, from one place', () => {
  const block = scopeBlock('RequireSignIn')
  for (const p of ['"/work"', '"/work/admin"', '"/work/company"', '"/work/exec"', '"/work/teach"', '"/work/workflow-issues"']) {
    assert.ok(block.includes(`path=${p}`), `${p} is inside RequireSignIn`)
  }
  for (const p of ['"/work/launch"', '"/work/buddy"', '"/work/guide"']) assert.ok(!block.includes(`path=${p}`), `${p} stays outside`)
})

test('only ProductThemeScope turns product theming on', () => {
  const callers = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!/\.(jsx?|mjs)$/.test(e.name) || /\.test\./.test(e.name)) continue
      const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      if (/setInProduct\(true\)/.test(code)) callers.push(path.relative(SRC, p).split(path.sep).join('/'))
    }
  }
  walk(SRC)
  assert.deepEqual(callers, ['theme/ProductThemeScope.jsx'])
})
