// Regression tests for the Compose shaper (work.js shapeCompose).
// POLICY (cost-saving): Compose no longer writes finished documents. It gives
// either code/a short snippet directly, OR a ready-to-use PROMPT for the user's
// own AI. Valid formats are prompt/code/bullets/table/outline/notes; anything
// else falls back to 'prompt'. A table, code, or prompt body is kept EXACT; prose
// snippets are AI-language-scrubbed; an empty body yields a caveat; and an
// unparseable reply degrades safely.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shapeCompose } from './work.js'
const reply = (o) => JSON.stringify(o)

test('a valid format is kept; an unknown (or retired document) one falls back to prompt', () => {
  assert.equal(shapeCompose(reply({ format: 'code', body: 'print(1)', title: 'Note' })).format, 'code')
  assert.equal(shapeCompose(reply({ format: 'prompt', body: 'Draft an email...', title: 'P' })).format, 'prompt')
  assert.equal(shapeCompose(reply({ format: 'banana', body: 'x' })).format, 'prompt')
  // 'document'/'email' are retired; they must NOT be honored as document output.
  assert.equal(shapeCompose(reply({ format: 'document', body: 'x' })).format, 'prompt')
  assert.equal(shapeCompose(reply({ format: 'email', body: 'x' })).format, 'prompt')
})

test('a table body is kept EXACT (not prose-scrubbed)', () => {
  const md = '| A | B |\n| - | - |\n| 1 | 2 |'
  assert.equal(shapeCompose(reply({ format: 'table', body: md, title: 'T' })).body, md)
})

test('a code body is kept EXACT', () => {
  const code = 'def f(x):\n    return x * 1.0825'
  assert.equal(shapeCompose(reply({ format: 'code', body: code })).body, code)
})

test('a prompt body is kept EXACT (not prose-scrubbed)', () => {
  const p = 'Write a vendor follow-up email. Use [NAME] and [DATE] as placeholders. Do not include real secrets.'
  assert.equal(shapeCompose(reply({ format: 'prompt', body: p })).body, p)
})

test('an empty body produces a caveat and a default title', () => {
  const r = shapeCompose(reply({ format: 'prompt', body: '' }))
  assert.ok(r.caveat.length > 0)
  assert.equal(r.title, 'Draft')
})

test('an unparseable reply degrades safely to a prompt', () => {
  const r = shapeCompose('not json')
  assert.equal(r.format, 'prompt')
  assert.ok(r.caveat.length > 0)
})
