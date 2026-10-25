// Focused tests for server/brain_ingest.js (Agent B-4).
//
// Deterministic + offline: BRAIN_EMBED_FAKE=1 forces the hash-seeded embedder,
// a throwaway WORK_DATA_DIR isolates the encrypted store, brain_crypto gets a
// 32-byte test key, and brain_store gets an in-memory wrapped-DEK accessor -
// the SAME wiring the store self-test uses. We assert the privacy invariant
// (raw PII is scrubbed BEFORE it is stored), content-hash dedupe, and that a
// newer version supersedes.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Must be set BEFORE the brain modules load (brain_store reads WORK_DATA_DIR at
// import time; brain_embed reads BRAIN_EMBED_FAKE per call). Hence dynamic import.
process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-ingest-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore, brainStore } = await import('./brain_store.js')
const { embedQuery } = await import('./brain_embed.js')
const { chunkText, ingestSource, buildManifest } = await import('./brain_ingest.js')

// Wire crypto + store exactly like the store self-test.
const TEST_KEY = crypto.createHash('sha256').update('brain-ingest-test-key').digest() // 32 bytes
configureBrainCrypto({ getMasterKey: () => TEST_KEY })
const dekStore = new Map()
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
})

// Read every stored chunk's (decrypted) text back out of the sealed store.
async function allStoredText(companyId) {
  const hits = await brainStore.query(companyId, await embedQuery('read everything back'), 50)
  return hits.map((h) => h.text).join('\n')
}

test('ingest scrubs raw PII BEFORE storing (stored chunk is redacted)', async () => {
  const companyId = 'co-scrub'
  const raw = [
    '# Refund policy',
    '',
    'Contact billing at jane.doe@acme.com or call 415-555-0199 for help.',
    'Verify the customer SSN 123-45-6789 before issuing any refund.',
  ].join('\n')

  const res = await ingestSource(companyId, {
    source: { id: 's1', title: 'Refund SOP' },
    version: 1,
    extractedText: raw,
    policy: null,
  })

  assert.ok(res.accepted >= 1, 'at least one chunk accepted')
  assert.ok(res.redacted >= 3, `email + phone + ssn redacted, got ${res.redacted}`)

  const stored = await allStoredText(companyId)
  assert.ok(!stored.includes('jane.doe@acme.com'), 'raw email must not be stored')
  assert.ok(!stored.includes('123-45-6789'), 'raw SSN must not be stored')
  assert.ok(!stored.includes('415-555-0199'), 'raw phone must not be stored')
  assert.ok(stored.includes('[EMAIL]') && stored.includes('[SSN]'), 'typed placeholders kept')
})

test('dedupe: an unchanged re-ingest is skipped, nothing re-stored', async () => {
  const companyId = 'co-dedupe'
  const doc = { source: { id: 'd1', title: 'Onboarding' }, version: 1, policy: null, extractedText: '# Onboarding\n\nRequest a laptop from IT and set up single sign on access.\n' }

  const first = await ingestSource(companyId, doc)
  assert.ok(first.accepted >= 1, 'first ingest accepts chunks')
  assert.equal(first.skipped, 0)

  const second = await ingestSource(companyId, doc)
  assert.equal(second.accepted, 0, 'unchanged re-ingest accepts nothing')
  assert.ok(second.skipped >= 1, 'unchanged chunks are skipped by content hash')
  assert.equal(second.superseded, 0, 'same version does not supersede')
})

test('a newer version supersedes and tombstones the old chunks', async () => {
  const companyId = 'co-supersede'
  const v1 = await ingestSource(companyId, {
    source: { id: 'p1', title: 'Pricing' }, version: 1, policy: null,
    extractedText: '# Pricing\n\nThe starter plan costs twenty dollars per seat each month.\n',
  })
  assert.ok(v1.accepted >= 1)

  const v2 = await ingestSource(companyId, {
    source: { id: 'p1', title: 'Pricing' }, version: 2, policy: null,
    extractedText: '# Pricing\n\nThe starter plan now costs thirty dollars per seat each month after the increase.\n',
  })
  assert.ok(v2.superseded >= 1, 'new version superseded the source')
  assert.ok(v2.tombstoned >= 1, 'old version chunks were tombstoned')
  assert.ok(v2.accepted >= 1, 'changed chunks counted as accepted')

  const sources = await brainStore.listSources(companyId)
  const active = sources.filter((s) => s.status === 'active' && String(s.sourceId) === 'p1')
  assert.equal(active.length, 1, 'exactly one active revision of the source remains')

  const stored = await allStoredText(companyId)
  assert.ok(stored.includes('thirty dollars'), 'new content is resident')
  assert.ok(!stored.includes('twenty dollars'), 'old content is gone')
})

test('chunkText never cuts through a numbered or bulleted step', async () => {
  // A long tight list (no blank lines) that must exceed one chunk target.
  const steps = []
  for (let i = 1; i <= 60; i++) {
    steps.push(`${i}. Step ${i}: perform configuration action number ${i} carefully and confirm the result before moving on.`)
  }
  const text = '# Runbook\n' + steps.join('\n') + '\n'
  const chunks = chunkText(text)

  assert.ok(chunks.length > 1, 'long runbook splits into multiple chunks')
  chunks.forEach((c, i) => assert.equal(c.ord, i, 'ords are dense + sequential'))
  // Every step appears INTACT inside at least one chunk (never split across a boundary).
  for (const step of steps) {
    assert.ok(chunks.some((c) => c.text.includes(step)), `step kept whole: ${step.slice(0, 24)}...`)
  }
})

test('buildManifest reports sources, the pinned model, and policy version', async () => {
  const companyId = 'co-manifest'
  await ingestSource(companyId, {
    source: { id: 'm1', title: 'Security Guide' }, version: 1, policy: null,
    extractedText: '# Security\n\nEnable multi factor authentication on every administrator account.\n',
  })
  const manifest = await buildManifest(companyId, {})
  assert.ok(Array.isArray(manifest.sources) && manifest.sources.length === 1)
  assert.equal(manifest.model.id, 'Xenova/bge-small-en-v1.5')
  assert.equal(manifest.model.dim, 384)
  assert.equal(typeof manifest.cursor, 'number')
  assert.equal(typeof manifest.policyVersion, 'string')
})
