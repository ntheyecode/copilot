// Regression tests for the Compose authoring shaper (work.js shapeCompose).
// Compose WRITES the finished document (email/document/outline/table/code/notes),
// read-only. These lock in: a valid format is required (else 'document'); a table
// or code body is kept EXACT; prose is AI-language-scrubbed; an empty body yields
// a caveat; and an unparseable reply degrades safely.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shapeCompose } from './work.js'
const reply = (o) => JSON.stringify(o)

test('a valid format is kept; an unknown one falls back to document', () => {
  assert.equal(shapeCompose(reply({ format: 'email', body: 'Hi there,', title: 'Note' })).format, 'email')
  assert.equal(shapeCompose(reply({ format: 'banana', body: 'x' })).format, 'document')
})

test('a table body is kept EXACT (not prose-scrubbed)', () => {
  const md = '| A | B |\n| - | - |\n| 1 | 2 |'
  assert.equal(shapeCompose(reply({ format: 'table', body: md, title: 'T' })).body, md)
})

test('a code body is kept EXACT', () => {
  const code = 'def f(x):\n    return x * 1.0825'
  assert.equal(shapeCompose(reply({ format: 'code', body: code })).body, code)
})

test('an empty body produces a caveat and a default title', () => {
  const r = shapeCompose(reply({ format: 'document', body: '' }))
  assert.ok(r.caveat.length > 0)
  assert.equal(r.title, 'Draft')
})

test('an unparseable reply degrades safely to a document draft', () => {
  const r = shapeCompose('not json')
  assert.equal(r.format, 'document')
  assert.ok(r.caveat.length > 0)
})
