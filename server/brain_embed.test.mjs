// Tests for server/brain_embed.js - deterministic fallback mode.
// Forces BRAIN_EMBED_FAKE=1 so no model/library is needed (sibling modules are
// testable without the ~33 MB model). Run:
//   BRAIN_EMBED_FAKE=1 node --test server/brain_embed.test.mjs
// The test sets the env itself so it also passes under a plain `node --test`.
import test from 'node:test'
import assert from 'node:assert/strict'

process.env.BRAIN_EMBED_FAKE = '1'

const { embedPassages, embedQuery, embedderReady } = await import('./brain_embed.js')
const { EMBED } = await import('./brain_model.js')

const DIM = 384

function l2norm(vec) {
  let s = 0
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i]
  return Math.sqrt(s)
}

test('EMBED.dim is 384', () => {
  assert.equal(EMBED.dim, DIM)
})

test('embedPassages: one dim-384 Float32Array per input', async () => {
  const vecs = await embedPassages(['first passage', 'second passage', 'third'])
  assert.equal(vecs.length, 3)
  for (const v of vecs) {
    assert.ok(v instanceof Float32Array)
    assert.equal(v.length, DIM)
  }
})

test('embedPassages: vectors are L2-normalized (unit length)', async () => {
  const [v] = await embedPassages(['normalize me please'])
  assert.ok(Math.abs(l2norm(v) - 1) < 1e-5, `norm was ${l2norm(v)}`)
})

test('embedPassages: stable for the same input', async () => {
  const [a] = await embedPassages(['deterministic text'])
  const [b] = await embedPassages(['deterministic text'])
  assert.deepEqual(Array.from(a), Array.from(b))
})

test('embedPassages: different inputs give different vectors', async () => {
  const [a] = await embedPassages(['alpha content'])
  const [b] = await embedPassages(['beta content'])
  assert.notDeepEqual(Array.from(a), Array.from(b))
})

test('embedPassages: empty array -> empty result', async () => {
  const vecs = await embedPassages([])
  assert.deepEqual(vecs, [])
})

test('embedQuery: single dim-384 L2-normalized Float32Array', async () => {
  const v = await embedQuery('what is the refund policy')
  assert.ok(v instanceof Float32Array)
  assert.equal(v.length, DIM)
  assert.ok(Math.abs(l2norm(v) - 1) < 1e-5, `norm was ${l2norm(v)}`)
})

test('embedQuery: stable for the same input', async () => {
  const a = await embedQuery('same query')
  const b = await embedQuery('same query')
  assert.deepEqual(Array.from(a), Array.from(b))
})

test('embedQuery applies the search prefix, so it differs from the bare passage', async () => {
  // embedQuery(text) prefixes "Represent this sentence...": its vector must NOT
  // equal embedPassages([text]) for the same raw text (prefix behavior), but
  // MUST equal embedPassages([prefix + " " + text]) (same effective input).
  const raw = 'quarterly onboarding checklist'
  const q = await embedQuery(raw)
  const [bare] = await embedPassages([raw])
  assert.notDeepEqual(Array.from(q), Array.from(bare))

  const prefix = 'Represent this sentence for searching relevant passages:'
  const [prefixed] = await embedPassages([prefix + ' ' + raw])
  assert.deepEqual(Array.from(q), Array.from(prefixed))
})

test('embedderReady: false in deterministic-fallback mode', () => {
  assert.equal(embedderReady(), false)
})
