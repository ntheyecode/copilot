// Focused tests for server/brain_query.js (the Wave 4 query interface).
//
// Deterministic + offline: BRAIN_EMBED_FAKE=1 (no model), a throwaway
// WORK_DATA_DIR, a test crypto key, and an in-memory wrapped-DEK map (the same
// setup the sibling brain tests use). We ingest a couple of sources through the
// REAL pipeline, then assert company scope, the scrubbed output shape, provenance,
// topK bounds, and that a locked / empty brain and a bad query each surface a
// STATED error (never a silent empty).

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-query-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore, brainStore } = await import('./brain_store.js')
const { queryBrain, BrainQueryError } = await import('./brain_query.js')

const TEST_KEY = crypto.createHash('sha256').update('brain-query-test-key').digest()
configureBrainCrypto({ getMasterKey: () => TEST_KEY })
const dekStore = new Map()
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
})

// Seed directly through the store with sourceMeta so we control provenance
// (revision) - ingestSource does not persist a revision; the /chunks route does,
// via sourceMeta. Vectors are deterministic one-hots; the matching query clears
// retrieve's floor on the keyword (BM25) arm (dense is fake in this mode). Text is
// what the store returns as a hit, already-scrubbed by construction here.
const DIM = 384
function oneHot(i) { const v = new Float32Array(DIM); v[i % DIM] = 1; return v }
async function seed(companyId) {
  await brainStore.upsert(companyId, [
    { chunkId: 'exp::0', sourceId: 'exp', sourceTitle: 'Expense Reimbursement Policy', ordinal: 0, text: 'Submit an expense reimbursement in the finance portal. Expense reimbursement receipts are approved by finance.', vector: oneHot(0), contentHash: 'h-exp', chunkHash: 'exp-0' },
  ], { title: 'Expense Reimbursement Policy', revision: 'v3', kind: 'doc' })
  await brainStore.upsert(companyId, [
    { chunkId: 'pto::0', sourceId: 'pto', sourceTitle: 'Paid Time Off Policy', ordinal: 0, text: 'Employees accrue vacation leave monthly through the human resources portal.', vector: oneHot(1), contentHash: 'h-pto', chunkHash: 'pto-0' },
  ], { title: 'Paid Time Off Policy', revision: 'v1', kind: 'doc' })
}

test('queryBrain returns scrubbed hits with provenance (source + revision) and a score', async () => {
  const companyId = 'q-match'
  await seed(companyId)

  const out = await queryBrain(companyId, { q: 'how do I submit an expense reimbursement' })

  assert.equal(out.matched, true)
  assert.ok(out.hits.length >= 1, 'at least one hit')
  const h = out.hits[0]
  // Output shape: ONLY text + score + source{sourceId,title,revision}. No vectors,
  // no chunkHash, no vectorScore - nothing internal leaks.
  assert.deepEqual(Object.keys(h).sort(), ['score', 'source', 'text'])
  assert.deepEqual(Object.keys(h.source).sort(), ['revision', 'sourceId', 'title'])
  assert.equal(h.source.title, 'Expense Reimbursement Policy')
  assert.equal(h.source.revision, 'v3', 'provenance carries the source revision')
  assert.equal(typeof h.text, 'string')
  assert.ok(h.text.length > 0)
  assert.equal(typeof h.score, 'number')
})

test('queryBrain is keyword-only (stated) when the embedder is not serving', async () => {
  const out = await queryBrain('q-match', { q: 'expense reimbursement finance portal' })
  assert.equal(out.semanticSearchReady, false, 'fake embedder is not ready')
  assert.ok(out.semanticNote && /keyword-only/i.test(out.semanticNote), 'the degraded mode is stated, not silent')
})

test('queryBrain clamps topK to [1,20] and defaults to 6', async () => {
  const def = await queryBrain('q-match', { q: 'reimbursement' })
  assert.equal(def.topK, 6)
  const one = await queryBrain('q-match', { q: 'reimbursement', topK: 1 })
  assert.equal(one.topK, 1)
  assert.ok(one.hits.length <= 1)
  const big = await queryBrain('q-match', { q: 'reimbursement', topK: 999 })
  assert.equal(big.topK, 20)
})

test('queryBrain states a no-match honestly (not a silent empty, nothing fabricated)', async () => {
  const out = await queryBrain('q-match', { q: 'xylophone zebra quantum teleportation protocol' })
  assert.equal(out.matched, false)
  assert.equal(out.hits.length, 0)
  assert.ok(out.note && /no company document matched/i.test(out.note))
})

test('queryBrain throws BRAIN_EMPTY for a tenant with no sources', async () => {
  await assert.rejects(
    () => queryBrain('q-empty', { q: 'anything' }),
    (e) => e instanceof BrainQueryError && e.code === 'BRAIN_EMPTY' && e.status === 409,
  )
})

test('queryBrain throws BAD_QUERY for an empty query', async () => {
  await assert.rejects(
    () => queryBrain('q-match', { q: '   ' }),
    (e) => e instanceof BrainQueryError && e.code === 'BAD_QUERY' && e.status === 400,
  )
})

test('queryBrain surfaces a locked brain as a STATED error (never a silent empty)', async () => {
  // Inject a store whose listSources throws the store's BRAIN_LOCKED error, exactly
  // as a locked customer-held tenant does via loadTenant.
  const lockedStore = {
    listSources: async () => { const e = new Error('Company Brain is locked'); e.code = 'BRAIN_LOCKED'; throw e },
  }
  await assert.rejects(
    () => queryBrain('q-locked', { q: 'anything' }, { store: lockedStore }),
    (e) => e instanceof BrainQueryError && e.code === 'BRAIN_LOCKED' && e.status === 423,
  )
})

test('queryBrain is company-scoped: it only ever reads the caller company', async () => {
  // A seeded company and an unseeded one must not bleed: the unseeded one is empty.
  await seed('q-scope-a')
  const a = await queryBrain('q-scope-a', { q: 'expense reimbursement' })
  assert.equal(a.matched, true)
  await assert.rejects(
    () => queryBrain('q-scope-b', { q: 'expense reimbursement' }),
    (e) => e instanceof BrainQueryError && e.code === 'BRAIN_EMPTY',
  )
})
