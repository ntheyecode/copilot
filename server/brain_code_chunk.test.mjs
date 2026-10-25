// Tests for the code-aware Brain chunker. node --test, no dependencies.
//
// Verifies the contract shared with brain_ingest.js chunkText:
//   - shape { ord, charStart, charEnd, text }, dense ords
//   - EXACT offsets: text.slice(charStart, charEnd) === chunk.text
//   - one chunk per top-level unit (symbol-boundary chunking, not fixed windows)
//   - no code chunk cuts mid-brace (balanced {} per non-windowed code chunk)
//   - the file-header chunk holds the imports
//   - an oversized unit is hard-windowed (with overlap)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkCode, detectLanguage, symbolOf } from './brain_code_chunk.js'

// ---- helpers --------------------------------------------------------------

// Every chunk's text must be exactly the slice its offsets name, ords dense.
function assertContract(src, chunks) {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    assert.equal(c.ord, i, `ord ${i} dense`)
    assert.equal(typeof c.charStart, 'number')
    assert.equal(typeof c.charEnd, 'number')
    assert.ok(c.charStart <= c.charEnd, `charStart <= charEnd at ${i}`)
    assert.equal(src.slice(c.charStart, c.charEnd), c.text, `exact offsets at chunk ${i}`)
  }
}

// Balanced curly braces within a chunk (code chunks that are whole units).
function braceBalanced(text) {
  let depth = 0
  for (const ch of text) {
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth < 0) return false }
  }
  return depth === 0
}

// ---- JS: imports + 3 top-level functions ----------------------------------

test('JS: imports become the header, each function is its own chunk', () => {
  const src = [
    "import { readFile } from 'node:fs/promises'",
    "import path from 'node:path'",
    '',
    'function alpha(a, b) {',
    '  if (a > b) {',
    '    return a',
    '  }',
    '  return b',
    '}',
    '',
    'function beta() {',
    '  return { ok: true }',
    '}',
    '',
    'const gamma = (x) => {',
    '  return x * 2',
    '}',
    '',
  ].join('\n')

  const chunks = chunkCode(src, { language: detectLanguage('util.js') })
  assertContract(src, chunks)

  // header + 3 units
  assert.equal(chunks.length, 4)

  // header holds the imports and no function body
  const header = chunks[0]
  assert.match(header.text, /import \{ readFile \}/)
  assert.match(header.text, /import path from/)
  assert.doesNotMatch(header.text, /function alpha/)

  // the three unit chunks, by recovered symbol
  const units = chunks.slice(1)
  const symbols = units.map((c) => symbolOf(c.text, 'js'))
  assert.deepEqual(symbols, ['alpha', 'beta', 'gamma'])

  // each unit holds exactly one top-level function/arrow and is brace-balanced
  for (const u of units) assert.ok(braceBalanced(u.text), `balanced: ${u.text.slice(0, 20)}`)
  assert.equal(units.filter((u) => /function |=>/.test(u.text)).length, 3)
})

// ---- Python: import header + 2 defs + a class ------------------------------

test('Python: 2 defs and a class each land in their own chunk', () => {
  const src = [
    'import os',
    '',
    'def load(path):',
    '    with open(path) as f:',
    '        return f.read()',
    '',
    'def save(path, data):',
    '    with open(path, "w") as f:',
    '        f.write(data)',
    '',
    'class Store:',
    '    def __init__(self):',
    '        self.items = {}',
    '',
    '    def put(self, k, v):',
    '        self.items[k] = v',
    '',
  ].join('\n')

  const chunks = chunkCode(src, { language: detectLanguage('store.py') })
  assertContract(src, chunks)

  // header + def load + def save + class Store
  assert.equal(chunks.length, 4)
  assert.match(chunks[0].text, /^import os/)

  const symbols = chunks.slice(1).map((c) => symbolOf(c.text, 'py'))
  assert.deepEqual(symbols, ['load', 'save', 'Store'])

  // the class chunk keeps its two methods together (one top-level unit)
  const classChunk = chunks[3]
  assert.match(classChunk.text, /def __init__/)
  assert.match(classChunk.text, /def put/)
})

// ---- Oversized single unit must be hard-windowed with overlap --------------

test('oversized unit falls back to a hard character window with overlap', () => {
  const body = Array.from({ length: 400 }, (_, i) => `  const v${i} = compute(${i}) + noise(${i});`).join('\n')
  const src = ['function huge() {', body, '}', ''].join('\n')
  assert.ok(src.length > 2400, 'sample is actually oversized')

  const chunks = chunkCode(src, { language: 'js' })
  assertContract(src, chunks)

  // no header here (file starts at the declaration), so all chunks are the unit
  assert.ok(chunks.length > 1, 'oversized unit produced multiple windows')

  // windows must tile the whole unit with overlap: each next window starts
  // before the previous one ended.
  for (let i = 1; i < chunks.length; i++) {
    assert.ok(chunks[i].charStart < chunks[i - 1].charEnd, `window ${i} overlaps previous`)
    assert.ok(chunks[i].charStart >= chunks[i - 1].charStart, `window ${i} advances`)
  }
  // coverage: first window starts at 0, last ends at EOF
  assert.equal(chunks[0].charStart, 0)
  assert.equal(chunks[chunks.length - 1].charEnd, src.length)
})

// ---- detectLanguage --------------------------------------------------------

test('detectLanguage maps common extensions and defaults to text', () => {
  assert.equal(detectLanguage('a/b/login.ts'), 'ts')
  assert.equal(detectLanguage('C:\\proj\\app.jsx'), 'jsx')
  assert.equal(detectLanguage('server/main.py'), 'py')
  assert.equal(detectLanguage('pkg/handler.go'), 'go')
  assert.equal(detectLanguage('src/lib.rs'), 'rs')
  assert.equal(detectLanguage('Main.java'), 'java')
  assert.equal(detectLanguage('README'), 'text')
  assert.equal(detectLanguage('notes.'), 'text')
  assert.equal(detectLanguage(''), 'text')
  assert.equal(detectLanguage(null), 'text')
})

// ---- robustness: never throws, degrades sanely -----------------------------

test('odd input never throws and keeps exact offsets', () => {
  for (const bad of ['', '   \n\n', '}}}{{{', 'no structure here at all, just prose', null, undefined]) {
    const chunks = chunkCode(bad, { language: 'js' })
    assert.ok(Array.isArray(chunks))
    const src = String(bad == null ? '' : bad)
    assertContract(src, chunks)
  }
})

test('a file with no declarations degrades to blank-line / window splitting', () => {
  const src = 'alpha line one\nalpha line two\n\nbeta block line\n\ngamma block line\n'
  const chunks = chunkCode(src, { language: 'text' })
  assertContract(src, chunks)
  assert.ok(chunks.length >= 1)
})

// ---- symbolOf edge cases ---------------------------------------------------

test('symbolOf returns provenance names, blank when none', () => {
  assert.equal(symbolOf('function validateToken(req) {\n  return true\n}', 'js'), 'validateToken')
  assert.equal(symbolOf('class SessionStore {\n}', 'ts'), 'SessionStore')
  assert.equal(symbolOf('const parse = (s) => s.trim()', 'js'), 'parse')
  assert.equal(symbolOf('def handler(event):\n    pass', 'py'), 'handler')
  assert.equal(symbolOf('func ServeHTTP(w, r) {', 'go'), 'ServeHTTP')
  assert.equal(symbolOf('pub fn run(cfg: Config) {', 'rs'), 'run')
  assert.equal(symbolOf('public int add(int a, int b) {', 'java'), 'add')
  assert.equal(symbolOf('// just a comment\n', 'js'), '')
  assert.equal(symbolOf('import os\n', 'py'), '')
  assert.equal(symbolOf('', 'js'), '')
})
