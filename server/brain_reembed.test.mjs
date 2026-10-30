// Focused tests for server/brain_reembed.js + the dimension-aware store
// (server/brain_store.js reembed / dim handling).
//
// Deterministic + offline: BRAIN_EMBED_FAKE=1 (the fallback embedder produces a
// vector at the TARGET model's dim, so a re-embed to bge-base yields real 768-dim
// vectors without any model download), a throwaway WORK_DATA_DIR, a test crypto
// key, and an in-memory wrapped-DEK map.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-reembed-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore, brainStore } = await import('./brain_store.js')
const { ingestSource, buildManifest } = await import('./brain_ingest.js')
const { retrieveForGoal } = await import('./brain_retrieve.js')
const { reembedTenant, ReembedError } = await import('./brain_reembed.js')

const TEST_KEY = crypto.createHash('sha256').update('brain-reembed-test-key').digest()
configureBrainCrypto({ getMasterKey: () => TEST_KEY })
const dekStore = new Map()
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
})

async function seed(companyId) {
  await ingestSource(companyId, {
    source: { id: 'exp', title: 'Expense Reimbursement Policy', revision: 'v3' }, version: 1, policy: null,
    extractedText: '# Expense Reimbursement\n\nSubmit expense receipts in the finance portal within thirty days. Finance approves each reimbursement within two weeks.\n',
  })
  await ingestSource(companyId, {
    source: { id: 'pto', title: 'Paid Time Off Policy', revision: 'v1' }, version: 1, policy: null,
    extractedText: '# Paid Time Off\n\nEmployees accrue vacation leave monthly through the human resources portal.\n',
  })
}

test('re-embed rebuilds vectors under a larger model, updating dim + manifest model', async () => {
  const cid = 'rb-main'
  await seed(cid)

  const before = await brainStore.stats(cid)
  assert.equal(before.dims, 384, 'starts on the default dim')
  const srcBefore = await brainStore.listSources(cid)
  const expHashesBefore = srcBefore.find((s) => s.sourceId === 'exp').chunkHashes.slice()
  // ingestSource does not stamp a pinned model (the /chunks route does); the
  // re-embed is what stamps it. So before, it is not yet the bge-base version.
  assert.ok(srcBefore.every((s) => s.embeddingModelVersion !== 'Xenova/bge-base-en-v1.5@main'))

  const progress = []
  const out = await reembedTenant(cid, {
    model: 'bge-base-en-v1.5',
    batchSize: 1,
    onProgress: (p) => progress.push(p),
  })

  assert.equal(out.dim, 768, 're-embedded to the larger model dim')
  assert.equal(out.model.name, 'bge-base-en-v1.5')
  assert.ok(out.chunks >= 2)
  assert.equal(out.batches, out.chunks, 'batchSize 1 -> one batch per chunk')
  // progress surfaced, monotonically reaching total, never truncated
  assert.ok(progress.length >= 1)
  assert.equal(progress[progress.length - 1].done, out.chunks)
  assert.equal(progress[progress.length - 1].total, out.chunks)

  const after = await brainStore.stats(cid)
  assert.equal(after.dims, 768, 'the store now reports the new geometry')
  assert.equal(after.chunks, before.chunks, 'no chunk was added or lost')

  const man = await buildManifest(cid)
  assert.equal(man.model.dim, 768, 'the manifest reports the tenant actual model')
  assert.equal(man.model.id, 'Xenova/bge-base-en-v1.5')

  const srcAfter = await brainStore.listSources(cid)
  assert.ok(srcAfter.every((s) => s.embeddingModelVersion === 'Xenova/bge-base-en-v1.5@main'), 'pinned model stamped on every source')
  const expHashesAfter = srcAfter.find((s) => s.sourceId === 'exp').chunkHashes
  assert.notDeepEqual(expHashesAfter, expHashesBefore, 'chunkHash is rebound to the new model')
})

test('retrieval still works after a re-embed (query is embedded at the new dim)', async () => {
  const out = await retrieveForGoal({ companyId: 'rb-main', goal: 'how do I submit an expense reimbursement', app: 'finance portal', topK: 6 })
  assert.equal(out.grounded, true, 'a matching goal is still grounded after re-embed')
  assert.equal(out.hits[0].sourceTitle, 'Expense Reimbursement Policy')
})

test('regression: an incremental manifest (since = latest cursor) still reports the re-embedded model, never the default', async () => {
  const full = await buildManifest('rb-main')
  const inc = await buildManifest('rb-main', { since: full.cursor })
  assert.equal(inc.sources.length, 0, 'nothing newer than the cursor')
  assert.equal(inc.model.dim, 768)
  assert.equal(inc.model.id, 'Xenova/bge-base-en-v1.5')
})

test('re-embed is abortable before the swap and leaves the brain unchanged', async () => {
  const cid = 'rb-abort'
  await seed(cid)
  const dimBefore = (await brainStore.stats(cid)).dims
  await assert.rejects(
    () => reembedTenant(cid, { model: 'bge-large-en-v1.5', signal: { aborted: true } }),
    (e) => e instanceof ReembedError && e.code === 'ABORTED',
  )
  assert.equal((await brainStore.stats(cid)).dims, dimBefore, 'an aborted re-embed does not change the brain')
})

test('re-embed throws BRAIN_EMPTY for a tenant with no sources', async () => {
  await assert.rejects(
    () => reembedTenant('rb-empty', { model: 'bge-base-en-v1.5' }),
    (e) => e instanceof ReembedError && e.code === 'BRAIN_EMPTY',
  )
})

test('re-embed rejects an unknown target model (stated, never a silent default)', async () => {
  const cid = 'rb-unknown'
  await seed(cid)
  await assert.rejects(() => reembedTenant(cid, { model: 'totally-made-up-model' }), /unknown embedding model/)
})

test('store.reembed never silently truncates: it requires one vector per chunk', async () => {
  const cid = 'rb-truncate'
  await seed(cid)
  const n = (await brainStore.stats(cid)).chunks
  assert.ok(n >= 2)
  // Supply fewer records than chunks -> must throw before any write.
  const tooFew = [{ chunkId: 'exp::0', vector: new Float32Array(768), chunkHash: 'x' }]
  await assert.rejects(() => brainStore.reembed(cid, { dim: 768, records: tooFew }), /expected .* records/)
  assert.equal((await brainStore.stats(cid)).dims, 384, 'the failed re-embed changed nothing')
})

test('dimension-aware store: a fresh tenant adopts the first vector dim; a query mismatch throws', async () => {
  const cid = 'rb-dim'
  const v = (i, dim) => { const a = new Float32Array(dim); a[i % dim] = 1; return a }
  await brainStore.upsert(cid, [
    { chunkId: 'c0', sourceId: 's', sourceTitle: 'S', ordinal: 0, text: 'hello', vector: v(0, 512), contentHash: 'h', chunkHash: 'ch0' },
  ])
  assert.equal((await brainStore.stats(cid)).dims, 512, 'the tenant adopted dim 512 from its first vector')
  // A query vector of the wrong dim must throw, not read past the end and score NaN.
  await assert.rejects(() => brainStore.query(cid, v(0, 384), 3), /dim/)
  // A matching-dim query works.
  const hits = await brainStore.query(cid, v(0, 512), 1)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].chunkId, 'c0')
})
