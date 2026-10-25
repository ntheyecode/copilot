// Focused self-test for server/brain_store.js (node --test).
//
// Runs fully in-memory + a throwaway temp dir: no db.json, no network, no model.
// The sibling brain_crypto.js is dependency-injected with a 32-byte test master
// key; the company-record DEK accessors are a plain Map. Vectors are one-hot unit
// vectors so cosine ranking is exact and predictable.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// WORK_DATA_DIR must be set BEFORE importing brain_store (it reads it at module load).
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstore-'))
process.env.WORK_DATA_DIR = TMP

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { brainStore, configureBrainStore } = await import('./brain_store.js')

const DIM = 384
const TEST_KEY = Buffer.alloc(32, 7) // deterministic 32-byte test KEK
configureBrainCrypto({ getMasterKey: () => TEST_KEY })

const wrapped = new Map() // companyId -> wrappedDek (stands in for the company record)
configureBrainStore({
  getWrappedDek: (cid) => wrapped.get(cid),
  setWrappedDek: (cid, w) => { wrapped.set(cid, w) },
})

function oneHot(i) {
  const v = new Float32Array(DIM)
  v[i] = 1 // already unit length
  return v
}

const CO = 'acme'

test('upsert + cosine ranking by dot product', async () => {
  const r = await brainStore.upsert(CO, [
    { chunkId: 'c0', sourceId: 's1', sourceTitle: 'Doc One', ordinal: 0, text: 'alpha text', vector: oneHot(0), contentHash: 'h1', chunkHash: 'ch0' },
    { chunkId: 'c1', sourceId: 's1', sourceTitle: 'Doc One', ordinal: 1, text: 'beta text', vector: oneHot(1), contentHash: 'h1', chunkHash: 'ch1' },
    { chunkId: 'c2', sourceId: 's2', sourceTitle: 'Doc Two', ordinal: 0, text: 'gamma text', vector: oneHot(2), contentHash: 'h2', chunkHash: 'ch2' },
  ])
  assert.equal(r.upserted, 3)
  assert.ok(r.bytes > 0)

  const hits = await brainStore.query(CO, oneHot(1), 2)
  assert.equal(hits.length, 2)
  assert.equal(hits[0].chunkId, 'c1')          // exact one-hot match ranks first
  assert.ok(hits[0].vectorScore > 0.99)
  assert.equal(hits[0].text, 'beta text')       // text decrypted for returned hit
  assert.equal(hits[0].score, hits[0].vectorScore)
  assert.ok(hits[1].vectorScore < 0.01)         // orthogonal vectors score ~0
})

test('upsert is idempotent by chunkId (replace in place)', async () => {
  await brainStore.upsert(CO, [
    { chunkId: 'c0', sourceId: 's1', sourceTitle: 'Doc One', ordinal: 0, text: 'alpha v2', vector: oneHot(0), contentHash: 'h1b', chunkHash: 'ch0b' },
  ])
  const s = await brainStore.stats(CO)
  assert.equal(s.chunks, 3) // still 3, not 4
  const hits = await brainStore.query(CO, oneHot(0), 1)
  assert.equal(hits[0].text, 'alpha v2')
})

test('query honors filterSourceIds and minScore', async () => {
  const onlyS2 = await brainStore.query(CO, oneHot(0), 5, { filterSourceIds: ['s2'] })
  assert.ok(onlyS2.every((h) => h.sourceId === 's2'))
  const floored = await brainStore.query(CO, oneHot(0), 5, { minScore: 0.5 })
  assert.equal(floored.length, 1) // only the exact match clears 0.5
  assert.equal(floored[0].chunkId, 'c0')
})

test('supersede replaces one source atomically', async () => {
  const r = await brainStore.supersede(CO, 's1', [
    { chunkId: 'c0n', sourceId: 's1', sourceTitle: 'Doc One v2', ordinal: 0, text: 'rewritten one', vector: oneHot(0), contentHash: 'h1c', chunkHash: 'ch0c' },
  ])
  assert.equal(r.removed, 2)   // old c0 + c1
  assert.equal(r.upserted, 1)
  const s = await brainStore.stats(CO)
  assert.equal(s.chunks, 2)    // c0n + c2
  const sources = await brainStore.listSources(CO)
  const s1 = sources.find((x) => x.sourceId === 's1')
  assert.equal(s1.version, 2)
  assert.equal(s1.title, 'Doc One v2')
  assert.deepEqual(s1.chunkHashes, ['ch0c'])
  // old chunk gone
  const old = await brainStore.query(CO, oneHot(1), 5)
  assert.ok(!old.some((h) => h.chunkId === 'c1'))
})

test('delete by ids and by sourceId; exactly one selector', async () => {
  await assert.rejects(() => brainStore.delete(CO, {}), /exactly one selector/)
  await assert.rejects(() => brainStore.delete(CO, { ids: ['x'], sourceId: 's2' }), /exactly one selector/)

  const d1 = await brainStore.delete(CO, { ids: ['c0n'] })
  assert.equal(d1.removed, 1)
  const d2 = await brainStore.delete(CO, { sourceId: 's2' })
  assert.equal(d2.removed, 1)
  const s = await brainStore.stats(CO)
  assert.equal(s.chunks, 0)
  assert.equal(s.sources, 0)
})

test('persistence across LRU eviction (reload from sealed disk)', async () => {
  const CO2 = 'beta-co'
  await brainStore.upsert(CO2, [
    { chunkId: 'k0', sourceId: 'z1', sourceTitle: 'Z', ordinal: 0, text: 'persisted', vector: oneHot(5), contentHash: 'zh', chunkHash: 'zc0' },
  ])
  // Force reload by exceeding the LRU (default 8) with throwaway tenants.
  for (let i = 0; i < 10; i++) {
    await brainStore.upsert('filler-' + i, [
      { chunkId: 'f', sourceId: 'f', sourceTitle: 'f', ordinal: 0, text: 'f', vector: oneHot(10), contentHash: 'f', chunkHash: 'f' },
    ])
  }
  const hits = await brainStore.query(CO2, oneHot(5), 1) // reloaded + decrypted from disk
  assert.equal(hits.length, 1)
  assert.equal(hits[0].text, 'persisted')
})

test('decrypt failure throws (never an empty corpus)', async () => {
  const CO3 = 'corrupt-co'
  await brainStore.upsert(CO3, [
    { chunkId: 'd0', sourceId: 'q', sourceTitle: 'Q', ordinal: 0, text: 'secret', vector: oneHot(3), contentHash: 'q', chunkHash: 'qc0' },
  ])
  // Evict so the next access must read from disk, then corrupt the sealed index.
  for (let i = 0; i < 10; i++) {
    await brainStore.upsert('evict-' + i, [
      { chunkId: 'e', sourceId: 'e', sourceTitle: 'e', ordinal: 0, text: 'e', vector: oneHot(11), contentHash: 'e', chunkHash: 'e' },
    ])
  }
  const idxPath = path.join(TMP, 'brain', CO3, 'index.sealed')
  const buf = fs.readFileSync(idxPath)
  buf[buf.length - 1] ^= 0xff // flip a ciphertext byte -> GCM auth must fail
  fs.writeFileSync(idxPath, buf)
  await assert.rejects(() => brainStore.stats(CO3)) // throws, does not serve empty
})
