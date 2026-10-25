// Focused tests for server/brain_retrieve.js (Agent B-4).
//
// Deterministic + offline (BRAIN_EMBED_FAKE=1, throwaway WORK_DATA_DIR, test
// crypto key, in-memory wrapped-DEK accessor). We ingest a couple of sources,
// then assert that a matching goal returns provenance-bearing grounded hits and
// that an unmatched goal (and an empty tenant) returns the STATED fallback.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-retrieve-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto } = await import('./brain_crypto.js')
const { configureBrainStore } = await import('./brain_store.js')
const { ingestSource } = await import('./brain_ingest.js')
const { retrieveForGoal } = await import('./brain_retrieve.js')

const TEST_KEY = crypto.createHash('sha256').update('brain-retrieve-test-key').digest()
configureBrainCrypto({ getMasterKey: () => TEST_KEY })
const dekStore = new Map()
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
})

async function seed(companyId) {
  await ingestSource(companyId, {
    source: { id: 'exp', title: 'Expense Reimbursement Policy' }, version: 1, policy: null,
    extractedText: '# Expense Reimbursement\n\nSubmit expense receipts in the finance portal within thirty days. Finance approves each reimbursement within two weeks.\n',
  })
  await ingestSource(companyId, {
    source: { id: 'pto', title: 'Paid Time Off Policy' }, version: 1, policy: null,
    extractedText: '# Paid Time Off\n\nEmployees accrue vacation leave monthly and request time off through the human resources portal.\n',
  })
}

test('retrieveForGoal returns grounded, provenance-bearing hits for a matching goal', async () => {
  const companyId = 'co-match'
  await seed(companyId)

  const out = await retrieveForGoal({
    companyId,
    goal: 'how do I submit an expense reimbursement',
    app: 'finance portal',
    topK: 6,
  })

  assert.equal(out.grounded, true, 'a matching goal is grounded')
  assert.ok(out.hits.length >= 1, 'at least one hit')
  assert.ok(out.hits.every((h) => typeof h.sourceTitle === 'string' && h.sourceTitle.length > 0), 'every hit carries provenance')
  assert.equal(out.hits[0].sourceTitle, 'Expense Reimbursement Policy', 'best hit is the expense policy')
  assert.ok(out.hits[0].score >= 0.35, 'kept hit clears the MIN_SCORE floor')
  assert.ok(out.fallbackReason === undefined, 'no fallback reason on a grounded result')
})

test('retrieveForGoal caps at 2 hits per source (diversity)', async () => {
  const companyId = 'co-diverse'
  // One source with many chunks all mentioning "deployment".
  const body = ['# Deployment Runbook', '']
  for (let i = 1; i <= 8; i++) body.push(`Section ${i}: the deployment pipeline runs the deployment release deployment step ${i}.`, '')
  await ingestSource(companyId, { source: { id: 'dep', title: 'Deployment Runbook' }, version: 1, policy: null, extractedText: body.join('\n') })

  const out = await retrieveForGoal({ companyId, goal: 'deployment pipeline release', app: 'ci', topK: 6 })
  assert.equal(out.grounded, true)
  const fromDep = out.hits.filter((h) => String(h.sourceId) === 'dep').length
  assert.ok(fromDep <= 2, `source-diversity cap holds, got ${fromDep}`)
})

test('retrieveForGoal returns the STATED fallback when nothing matches', async () => {
  const companyId = 'co-nomatch'
  await seed(companyId)

  const out = await retrieveForGoal({
    companyId,
    goal: 'xylophone zebra quantum teleportation protocol',
    app: 'spaceship',
    topK: 6,
  })

  assert.equal(out.grounded, false, 'no real match is not grounded')
  assert.equal(out.fallbackReason, 'no_matching_sources', 'the fallback reason is stated, not silent')
  assert.equal(out.hits.length, 0, 'no fabricated source is returned')
})

test('retrieveForGoal returns the STATED fallback when there is no brain yet', async () => {
  const out = await retrieveForGoal({ companyId: 'co-empty', goal: 'anything at all', app: 'any' })
  assert.equal(out.grounded, false)
  assert.equal(out.fallbackReason, 'no_matching_sources')
  assert.equal(out.hits.length, 0)
})
