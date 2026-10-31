// Gate: every surface takes the logo from the edition's brand
// (src/components/brand/BrandLogo.jsx). A page importing a product's logo
// directly would show AdmireVeda on LinkNotes (or the reverse).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ALLOWED = new Set([path.join('components', 'brand', 'BrandLogo.jsx')])
// The individuals site is LinkNotes-only by definition, so it may use the
// LinkNotes logo directly; nothing else may name a product's logo file.
const LN_OK = (rel) => rel.startsWith(path.join('sites', 'individuals')) || rel.startsWith(path.join('components', 'brand'))

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* files(p)
    else if (/\.(jsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) yield p
  }
}

test('logos come from the edition brand, never a product logo imported directly', () => {
  const bad = []
  for (const f of files(SRC)) {
    const rel = path.relative(SRC, f)
    const src = fs.readFileSync(f, 'utf8')
    if (/AdmireVedaLogo\.jsx['"]/.test(src) && !ALLOWED.has(rel)) bad.push(`${rel}: imports AdmireVedaLogo directly`)
    if (/LinkNotesLogo\.jsx['"]/.test(src) && !LN_OK(rel)) bad.push(`${rel}: imports LinkNotesLogo directly`)
  }
  assert.deepEqual(bad, [], 'import BrandLogo / BrandMark from src/components/brand/BrandLogo.jsx')
})
