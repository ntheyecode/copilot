// Module-level END-TO-END integration test for the WorkCoPilot Company Brain
// pipeline. No HTTP server is booted: the brain modules are imported directly and
// exercised as a library, exactly the way brain_custody.test.mjs + brain_ingest.
// test.mjs wire them. One deterministic, offline run proves the whole arc:
//
//   ingest (prose SOP + a code source)
//     -> retrieve (grounded w/ provenance; stated fallback for an unrelated goal)
//     -> customer custody (re-parent the DEK, 24-word recovery phrase)
//     -> lock (serves NOTHING: BRAIN_LOCKED, never a silent empty corpus)
//     -> unlock (by passphrase, and separately by the recovery phrase)
//     -> WCPX password-encrypted export + round-trip open (wrong password fails)
//
// Determinism + isolation: BRAIN_EMBED_FAKE=1 forces the hash-seeded embedder, a
// throwaway WORK_DATA_DIR isolates the encrypted store + the JSON db, brain_crypto
// gets a 32-byte test KEK, and brain_store gets in-memory wrappedDek/custody
// accessors (Maps) - the SAME wiring the store/custody self-tests use.
//
// NOTE on the fake embedder: BRAIN_EMBED_FAKE=1 yields independent hash-seeded unit
// vectors, so dense cosine between any two distinct texts is ~0 (<< the 0.30 raw-
// vector floor in brain_retrieve.js). Grounding therefore rides the BM25 keyword
// arm: a goal that shares corpus tokens clears the fused floor and is grounded; a
// goal with no corpus tokens has zero real evidence from either arm and falls to the
// stated 'no_matching_sources'. That is the retrieval contract on a NON-empty brain.
//
// NOTE on the WCPX step (the one approximation): customer_export.buildCompanyArchive
// pulls company data from store.js (getCompany/exportCompanySkills/exportCompany
// Learnings) and resolves the brain DEK through store's OWN brain accessors, which
// are a different source of truth from brain_store's injected Map. So for the export
// company we (a) create a real store company, (b) seed its skills/learnings via the
// store's own import helpers, and (c) bridge the platform-wrapped DEK that the Map
// holds into store via setCompanyBrainDek - all under the SAME test KEK - so the real
// builder envelopes the real sealed brain blobs. Nothing is faked past that bridge:
// the archive is built + parsed with the module's own exported functions.
//
// US spelling. No em dashes.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Set env BEFORE any brain/store module loads (brain_store + store read
// WORK_DATA_DIR at import time; brain_embed reads BRAIN_EMBED_FAKE per call).
process.env.BRAIN_EMBED_FAKE = '1'
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-e2e-'))
process.env.WORK_DATA_DIR = DATA_DIR
after(() => { try { fs.rmSync(DATA_DIR, { recursive: true, force: true }) } catch { /* best effort */ } })

const { configureBrainCrypto, enableCustomerCustody, lock, unlockWithPassphrase, unlockWithRecovery, isUnlocked } = await import('./brain_crypto.js')
const { configureBrainStore, brainStore } = await import('./brain_store.js')
const { ingestSource } = await import('./brain_ingest.js')
const { retrieveForGoal } = await import('./brain_retrieve.js')
const { EMBED } = await import('./brain_model.js')
const customerExport = await import('./customer_export.js')
const store = await import('./store.js')

// ---- shared wiring (mirror the store/custody self-tests) -------------------
const TEST_KEY = crypto.createHash('sha256').update('brain-e2e-test-key').digest() // 32 bytes
configureBrainCrypto({ getMasterKey: () => TEST_KEY })

const dekStore = new Map()       // companyId -> wrappedDek (platform or customer wrap)
const custodyStore = new Map()   // companyId -> 'platform' | 'customer'
configureBrainStore({
  getWrappedDek: (id) => dekStore.get(String(id)),
  setWrappedDek: (id, w) => { dekStore.set(String(id), w) },
  getCustody: (id) => custodyStore.get(String(id)) || 'platform',
})

const CID = 'coE2E'                  // the brain-pipeline tenant (steps 1-5)
const PASS = 'a strong test passphrase'
// Per-company custody record (salt/wrapPass/wrappedDek/kdf) the real caller would
// persist. In-memory here, keyed like the custody self-test's recdb.
let custodyRec = null

// Corpus the retrieval assertions depend on. The SOP carries the distinctive tokens
// the matching goal reuses; the unrelated goal shares none of them.
const SOP_TITLE = 'Vendor Refund Policy'
const SOP_TEXT = [
  '# Vendor Refund Policy',
  '',
  'This vendor refund policy governs how refunds are approved and issued to vendors.',
  'Step one: verify the vendor invoice before approving any refund.',
  'Step two: a manager must approve every refund over five hundred dollars.',
  'Refund requests are reviewed within three business days of submission.',
].join('\n')

const CODE_TITLE = 'pricing.js'
const CODE_TEXT = [
  'export function computeTax(amount, rate) {',
  '  const tax = amount * rate',
  '  return Math.round(tax * 100) / 100',
  '}',
  '',
  'export function applyDiscount(price, percent) {',
  '  const discount = price * (percent / 100)',
  '  return price - discount',
  '}',
].join('\n')

const MATCHING_GOAL = 'What is our vendor refund policy and how are refunds approved?'
const UNRELATED_GOAL = 'giraffe constellation submarine volcano'

test('1) ingest a prose SOP source and a code source - both stored', async () => {
  const sop = await ingestSource(CID, {
    source: { id: 'sop1', title: SOP_TITLE }, version: 1, policy: null, extractedText: SOP_TEXT,
  })
  assert.ok(sop.accepted >= 1, `SOP accepted at least one chunk (got ${sop.accepted})`)

  const code = await ingestSource(CID, {
    source: { id: 'code1', title: CODE_TITLE, kind: 'code', path: CODE_TITLE }, version: 1, policy: null, extractedText: CODE_TEXT,
  })
  assert.ok(code.accepted >= 1, `code source accepted at least one chunk (got ${code.accepted})`)

  const sources = await brainStore.listSources(CID)
  const active = sources.filter((s) => s.status === 'active')
  const ids = new Set(active.map((s) => String(s.sourceId)))
  assert.ok(ids.has('sop1') && ids.has('code1'), 'both sources are active in the store')
  assert.equal(active.length, 2, 'exactly the two ingested sources are resident')
})

test('2a) retrieveForGoal on a matching goal - grounded with provenance', async () => {
  const res = await retrieveForGoal({ companyId: CID, goal: MATCHING_GOAL, app: 'Email' })
  assert.equal(res.grounded, true, 'a goal that shares corpus tokens is grounded')
  assert.ok(Array.isArray(res.hits) && res.hits.length >= 1, 'at least one grounding hit')
  // Provenance: every hit names its source, and the SOP is the one that matched.
  for (const h of res.hits) assert.ok(h.sourceTitle, 'each hit carries its source title (provenance)')
  assert.ok(res.hits.some((h) => h.sourceTitle === SOP_TITLE), 'the SOP source is the provenance')
})

test('2b) retrieveForGoal on an unrelated goal - grounded:false with the stated fallbackReason', async () => {
  const res = await retrieveForGoal({ companyId: CID, goal: UNRELATED_GOAL, app: 'Email' })
  assert.equal(res.grounded, false, 'no real evidence -> not grounded (never a fabricated source)')
  assert.equal(res.fallbackReason, 'no_matching_sources', 'the fallback reason is stated honestly')
  assert.deepEqual(res.hits, [], 'no hits are returned for the unrelated goal')
})

test('3) enableCustomerCustody re-parents the DEK, returns a 24-word phrase, still readable while unlocked', () => {
  const platformWrapped = dekStore.get(CID)
  assert.ok(platformWrapped, 'the tenant has a platform-wrapped DEK from ingestion')

  const enabled = enableCustomerCustody(CID, { passphrase: PASS, platformWrappedDek: platformWrapped })
  assert.equal(enabled.recoveryPhrase.split(' ').length, 24, 'a 24-word recovery phrase is minted')

  // Persist custody exactly as the real caller would, and flip the accessors.
  custodyRec = { salt: enabled.salt, wrapPass: enabled.wrapPass, wrappedDek: enabled.wrappedDek, kdf: enabled.kdf, recoveryPhrase: enabled.recoveryPhrase }
  dekStore.set(CID, enabled.wrappedDek)
  custodyStore.set(CID, 'customer')
  assert.ok(isUnlocked(CID), 'the DEK is left resident (unlocked) for the enabling session')
})

test('3b) still grounded while unlocked right after enabling custody', async () => {
  const res = await retrieveForGoal({ companyId: CID, goal: MATCHING_GOAL, app: 'Email' })
  assert.equal(res.grounded, true, 'customer-held but unlocked -> still answers')
})

test('4) a LOCKED customer brain refuses retrieve + query with BRAIN_LOCKED (never an empty corpus)', async () => {
  lock(CID)
  assert.equal(isUnlocked(CID), false, 'lock drops the resident DEK')
  await assert.rejects(
    () => retrieveForGoal({ companyId: CID, goal: MATCHING_GOAL, app: 'Email' }),
    (e) => e && e.code === 'BRAIN_LOCKED',
    'retrieveForGoal throws BRAIN_LOCKED rather than returning an empty/ungrounded result',
  )
  await assert.rejects(
    () => brainStore.query(CID, new Array(EMBED.dim).fill(0), 3),
    (e) => e && e.code === 'BRAIN_LOCKED',
    'the store itself throws BRAIN_LOCKED - a locked tenant serves nothing',
  )
})

test('5a) unlock with the passphrase restores access', async () => {
  const c = custodyRec
  unlockWithPassphrase(CID, { passphrase: PASS, salt: c.salt, wrapPass: c.wrapPass, wrappedDek: c.wrappedDek, kdf: c.kdf })
  assert.ok(isUnlocked(CID), 'passphrase unlock makes the DEK resident again')
  const res = await retrieveForGoal({ companyId: CID, goal: MATCHING_GOAL, app: 'Email' })
  assert.equal(res.grounded, true, 'grounded again after a passphrase unlock')
})

test('5b) unlock with the 24-word recovery phrase restores access', async () => {
  const c = custodyRec
  lock(CID)
  assert.equal(isUnlocked(CID), false, 'locked again before the recovery-phrase unlock')
  unlockWithRecovery(CID, { recoveryPhrase: c.recoveryPhrase, wrappedDek: c.wrappedDek })
  assert.ok(isUnlocked(CID), 'recovery-phrase unlock makes the DEK resident again')
  const res = await retrieveForGoal({ companyId: CID, goal: MATCHING_GOAL, app: 'Email' })
  assert.equal(res.grounded, true, 'grounded again after a recovery-phrase unlock')
})

test('6) WCPX export of the company data round-trips; a wrong password fails', async () => {
  // (a) A real store company (buildCompanyArchive pulls its data from store.js).
  const company = store.createCompany({ name: 'E2E Export Co ' + Date.now() })
  const EXPORT_CID = company.id

  // (b) Seed exportable company data through the store's own helpers.
  store.importCompanyLearnings(EXPORT_CID, [
    { app: 'Email', fact: 'Always verify the vendor invoice before issuing any refund to a vendor.', kind: 'fresh' },
  ])

  // (c) Ingest a small brain for the export company (platform custody: no custody
  //     entry -> getCustody defaults to 'platform'). The Map holds the platform-
  //     wrapped DEK that brain_crypto minted under the test KEK; bridge it into the
  //     store so resolveBrainForExport can unwrap it under the SAME KEK. (The one
  //     approximation: brain_store and store keep separate DEK accessors by design.)
  await ingestSource(EXPORT_CID, {
    source: { id: 'exp-sop', title: 'Export SOP' }, version: 1, policy: null,
    extractedText: '# Export SOP\n\nPackage the quarterly vendor report and send it to finance for review.\n',
  })
  const exportWrapped = dekStore.get(EXPORT_CID)
  assert.ok(exportWrapped, 'the export tenant has a platform-wrapped DEK')
  store.setCompanyBrainDek(EXPORT_CID, exportWrapped)
  assert.equal(store.getCompanyBrainCustody(EXPORT_CID), 'platform', 'export company is on platform custody')

  // (d) Build the password-encrypted WCPX archive via the module's own builder.
  const PW = 'Export-Password-123!'
  const built = customerExport.buildCompanyArchive({ companyId: EXPORT_CID, password: PW })
  assert.ok(Buffer.isBuffer(built.buffer) && built.buffer.length > 0, 'an archive buffer is produced')
  assert.equal(built.brainIncluded, true, 'the sealed brain was enveloped into the archive')
  assert.equal(built.brainMode, 'envelope', 'brain envelope mode')

  // (e) Open it with the right password and confirm the inner JSON matches the store.
  const { header, payload } = customerExport.parseArchive(built.buffer, PW)
  assert.equal(payload.meta.product, 'WorkCoPilot')
  assert.equal(payload.meta.companyId, EXPORT_CID, 'inner payload names the right company')
  assert.equal(payload.meta.companyName, company.name, 'company name round-trips')
  const fresh = store.getCompany(EXPORT_CID)
  assert.equal(JSON.stringify(payload.profile), JSON.stringify(fresh.profile || null), 'profile round-trips')
  assert.equal(JSON.stringify(payload.sensitivity), JSON.stringify(fresh.sensitivity || null), 'sensitivity round-trips')
  assert.equal(JSON.stringify(payload.learnings), JSON.stringify(store.exportCompanyLearnings(EXPORT_CID)), 'learnings round-trip')
  assert.equal(JSON.stringify(payload.skills), JSON.stringify(store.exportCompanySkills(EXPORT_CID)), 'skills round-trip')
  assert.equal(header.brain.present, true, 'the header advertises the brain envelope')

  // (f) The enveloped brain opens with the password-derived DEK (full crypto path).
  const dek = customerExport.unwrapBrainDek(header, PW)
  assert.ok(Buffer.isBuffer(dek) && dek.length === 32, 'the brain DEK unwraps to 32 bytes under the password')
  const sealedIndex = Buffer.from(payload.brain.files.index, 'base64')
  const manifest = JSON.parse(customerExport.openBrainBlob(sealedIndex, dek).toString('utf8'))
  assert.ok(Array.isArray(manifest.sources) && manifest.sources.some((s) => s.title === 'Export SOP'),
    'the opened brain index carries the ingested source')

  // (g) A WRONG password fails both the archive open and the DEK unwrap.
  assert.throws(() => customerExport.parseArchive(built.buffer, 'the wrong password'),
    /wrong password|could not open/i, 'a wrong password cannot open the archive body')
  assert.throws(() => customerExport.unwrapBrainDek(header, 'the wrong password'),
    'a wrong password cannot unwrap the brain DEK')
})
