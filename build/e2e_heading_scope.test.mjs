// The signed-in app's top bar repeats the page name as an <h2>
// (WorkAppLayout.jsx: the workShell.nav.* title), and the page itself shows a
// heading with the same words. An E2E locator like
//   page.getByRole('heading', { name: 'Projects I manage' })
// therefore matches ONE element while the page loads and TWO once it has
// loaded: strict mode fails, or passes, depending on timing (the Sr PM test
// failed this way on 2026-10-31). Every heading locator named after a shell
// title must look inside <main>: page.getByRole('main').getByRole('heading', ...).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import shell from '../src/i18n/locales/en/workShell.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) files(p, out); else if (/\.m?js$/.test(e.name)) out.push(p) } return out }

test('E2E heading locators named after a shell title are scoped to <main>', () => {
  const nav = (shell.workShell && shell.workShell.nav) || {}
  const titles = new Set(Object.values(nav).filter((v) => typeof v === 'string'))
  assert.ok(titles.has('Projects I manage') && titles.has('Project managers'), 'the shell titles are read from the catalog')
  const bad = []
  for (const f of files(path.join(ROOT, 'e2e'))) {
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/(\.getByRole\('main'\)\s*)?\.getByRole\('heading', \{ name: '([^']+)'/g)) {
        if (!m[1] && titles.has(m[2])) bad.push(`${path.relative(ROOT, f)}:${i + 1} "${m[2]}"`)
      }
    })
  }
  assert.deepEqual(bad, [], `scope these to getByRole('main'):\n${bad.join('\n')}`)
})
