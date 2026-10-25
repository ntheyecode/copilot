// Tests for server/brain_model.js - pure, deterministic helpers.
// Run: node --test server/brain_model.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EMBED,
  normalizeText,
  tokenize,
  contentHashOf,
  chunkHashOf,
  policyVersionOf,
} from './brain_model.js'

test('EMBED is the frozen pin', () => {
  assert.deepEqual(EMBED, { id: 'Xenova/bge-small-en-v1.5', rev: 'main', dim: 384, quant: 'int8' })
})

test('normalizeText: CRLF and lone CR become LF', () => {
  assert.equal(normalizeText('a\r\nb\rc'), 'a\nb\nc')
})

test('normalizeText: strips per-line trailing whitespace', () => {
  assert.equal(normalizeText('a   \nb\t\nc'), 'a\nb\nc')
})

test('normalizeText: collapses 3+ blank lines to one, trims ends', () => {
  // 4 newlines = 3 blank lines -> 2 newlines (one blank line)
  assert.equal(normalizeText('a\n\n\n\nb'), 'a\n\nb')
  // 2 blank lines (3 newlines) are preserved
  assert.equal(normalizeText('a\n\n\nb'), 'a\n\n\nb')
  assert.equal(normalizeText('  \n  hello  \n  '), 'hello')
})

test('normalizeText: null/undefined -> empty string', () => {
  assert.equal(normalizeText(null), '')
  assert.equal(normalizeText(undefined), '')
})

test('tokenize: lowercase, split on non-alphanumeric, drop length<=2', () => {
  // "a1" and "to" are length 2 -> dropped; the rest kept in order.
  assert.deepEqual(tokenize('The Quick, brown-FOX a1 to it works'), ['the', 'quick', 'brown', 'fox', 'works'])
})

test('tokenize: concrete cases', () => {
  assert.deepEqual(tokenize('Hello, World!'), ['hello', 'world'])
  assert.deepEqual(tokenize('a bb ccc dddd'), ['ccc', 'dddd'])
  assert.deepEqual(tokenize('SOP-123 revision_v2'), ['sop', '123', 'revision'])
  assert.deepEqual(tokenize(''), [])
  assert.deepEqual(tokenize(null), [])
})

test('contentHashOf: deterministic sha256 hex of normalized text', () => {
  const h = contentHashOf('a\r\nb  ')
  assert.match(h, /^[0-9a-f]{64}$/)
  // normalization means these two inputs hash identically
  assert.equal(contentHashOf('a\r\nb  '), contentHashOf('a\nb'))
  // different content -> different hash
  assert.notEqual(contentHashOf('a'), contentHashOf('b'))
  // stable across calls
  assert.equal(contentHashOf('hello world'), contentHashOf('hello world'))
})

test('chunkHashOf: deterministic and sensitive to every field', () => {
  const base = { modelId: 'Xenova/bge-small-en-v1.5', rev: 'main', policyVersion: 'p1', text: 'hi there' }
  const h = chunkHashOf(base)
  assert.match(h, /^[0-9a-f]{64}$/)
  assert.equal(chunkHashOf(base), chunkHashOf({ ...base }))
  assert.notEqual(h, chunkHashOf({ ...base, modelId: 'other' }))
  assert.notEqual(h, chunkHashOf({ ...base, rev: 'v2' }))
  assert.notEqual(h, chunkHashOf({ ...base, policyVersion: 'p2' }))
  assert.notEqual(h, chunkHashOf({ ...base, text: 'bye' }))
  // normalization applies to text
  assert.equal(chunkHashOf({ ...base, text: 'hi there' }), chunkHashOf({ ...base, text: 'hi there  \n' }))
})

test('chunkHashOf: missing policyVersion treated as empty, stable', () => {
  const a = chunkHashOf({ modelId: 'm', rev: 'r', text: 't' })
  const b = chunkHashOf({ modelId: 'm', rev: 'r', policyVersion: '', text: 't' })
  assert.equal(a, b)
})

test('policyVersionOf: empty for no policy, short stable sha otherwise', () => {
  assert.equal(policyVersionOf(null), '')
  assert.equal(policyVersionOf(undefined), '')
  assert.equal(policyVersionOf({}), '')
  const v = policyVersionOf({ redactEmail: true, level: 2 })
  assert.match(v, /^[0-9a-f]{12}$/)
  // key order does not matter (stable JSON)
  assert.equal(policyVersionOf({ redactEmail: true, level: 2 }), policyVersionOf({ level: 2, redactEmail: true }))
  // different policy -> different version
  assert.notEqual(policyVersionOf({ level: 2 }), policyVersionOf({ level: 3 }))
})
