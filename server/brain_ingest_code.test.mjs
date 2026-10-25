// Focused tests for the CODE-aware ingestion path in server/brain_ingest.js.
//
// Sibling to brain_ingest.test.mjs (which it does NOT touch): same offline,
// deterministic wiring - BRAIN_EMBED_FAKE=1 forces the hash-seeded embedder, a
// throwaway WORK_DATA_DIR isolates the encrypted store, brain_crypto gets a
// 32-byte test key, and brain_store gets an in-memory wrapped-DEK accessor.
//
// We assert that a source ingested with kind 'code' is chunked by SYMBOL (one
// chunk per top-level function) rather than by the ~1800-char prose window - a
// prose window would keep this small file as a single chunk, so "accepted == 3"
// is itself proof the code chunker fired - and that retrieveForGoal naming one
// function returns a hit whose text contains that function.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Must be set BEFORE the brain modules load (brain_store reads WORK_DATA_DIR at
// import time; brain_embed reads BRAIN_EMBED_FAKE per call). Hence dynamic import.
process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-ingest-code-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore, brainStore } = await import('./brain_store.js')
const { ingestSource } = await import('./brain_ingest.js')
const { retrieveForGoal } = await import('./brain_retrieve.js')

// Wire crypto + store exactly like the store self-test / brain_ingest.test.mjs.
const TEST_KEY = crypto.createHash('sha256').update('brain-ingest-code-test-key').digest() // 32 bytes
configureBrainCrypto({ getMasterKey: () => TEST_KEY })
const dekStore = new Map()
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
})

// A JS file with exactly three named top-level functions, each starting at
// column 0 and all well under the code chunker's cap, so symbol chunking yields
// one chunk per function. No header banner, so there is no file-header chunk.
const CODE = [
  'function computeInvoiceTotal(items) {',
  '  // sums every invoice line amount into one grand total',
  '  let total = 0',
  '  for (const it of items) total += it.amount',
  '  return total',
  '}',
  '',
  'function validateEmailAddress(email) {',
  '  // checks the email has an at-sign and a domain part',
  '  return /.+@.+\\..+/.test(String(email))',
  '}',
  '',
  'function formatCurrencyUsd(cents) {',
  '  // formats an integer number of cents as US dollars',
  '  return "$" + (cents / 100).toFixed(2)',
  '}',
  '',
].join('\n')

test('CODE source is chunked by symbol: one chunk per function', async () => {
  const companyId = 'co-code'
  const res = await ingestSource(companyId, {
    source: { id: 'code1', title: 'helpers.js', kind: 'code', path: 'src/helpers.js' },
    version: 1,
    extractedText: CODE,
    policy: null,
  })

  // Prose windowing would leave this ~400-char file as ONE chunk; three accepted
  // chunks is the signature of symbol-boundary chunking.
  assert.equal(res.accepted, 3, 'one chunk accepted per top-level function')

  // Cross-check via the stored source inventory (per-source chunk hashes).
  const sources = await brainStore.listSources(companyId)
  const active = sources.filter((s) => s.status === 'active' && String(s.sourceId) === 'code1')
  assert.equal(active.length, 1, 'exactly one active revision of the code source')
  assert.equal((active[0].chunkHashes || []).length, 3, 'three stored chunks, one per function')
})

test('retrieveForGoal naming one function returns a hit containing that function', async () => {
  const companyId = 'co-code-retrieve'
  await ingestSource(companyId, {
    source: { id: 'code2', title: 'helpers.js', kind: 'code', path: 'src/helpers.js' },
    version: 1,
    extractedText: CODE,
    policy: null,
  })

  const out = await retrieveForGoal({ companyId, goal: 'computeInvoiceTotal', topK: 3 })
  assert.equal(out.grounded, true, 'a goal naming a function grounds on the code brain')
  assert.ok(out.hits.length >= 1, 'at least one hit returned')
  assert.ok(
    out.hits.some((h) => (h.text || '').includes('computeInvoiceTotal')),
    'a returned hit contains the named function',
  )
})
