// Customer-held-key custody, end to end against the REAL brain_crypto + lock-aware
// brain_store: enable (re-parent the DEK in place), locked-refuses-query, unlock by
// passphrase and by the 24-word recovery phrase, wrong-passphrase rejection, and
// passphrase rotation. The whole point: once enabled, access requires the customer
// secret - a locked tenant serves nothing (never a silent empty corpus).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-custody-'))
const here = path.dirname(fileURLToPath(import.meta.url))
const bc = await import('file://' + path.join(here, 'brain_crypto.js').replace(/\\/g, '/'))
const bs = await import('file://' + path.join(here, 'brain_store.js').replace(/\\/g, '/'))

// In-memory stand-in for the company record (what store.js persists).
const recdb = new Map()   // companyId -> { custody, wrappedDek, salt, wrapPass, kdf, dekId }
const getWrappedDek = (cid) => (recdb.get(cid) || {}).wrappedDek || null
const setWrappedDek = (cid, w) => { const r = recdb.get(cid) || {}; r.wrappedDek = w; recdb.set(cid, r) }
const getCustody = (cid) => (recdb.get(cid) || {}).custody || 'platform'

const KEK = crypto.randomBytes(32)
bc.configureBrainCrypto({ getMasterKey: () => KEK })
bs.configureBrainStore({ getWrappedDek, setWrappedDek, getCustody })

const CID = 'coCustody'
const PASS = 'strong passphrase here'
function vec(seed) {
  const a = new Float32Array(384)
  for (let i = 0; i < 384; i++) a[i] = Math.sin(seed + i)
  let n = 0; for (const x of a) n += x * x; n = Math.sqrt(n)
  return Array.from(a, (x) => x / n)
}
const RECS = [{ chunkId: 'c1', sourceId: 's1', sourceTitle: 'Vendor SOP', ordinal: 0, text: 'vendor onboarding step one', vector: vec(1), contentHash: 'h1', chunkHash: 'ch1' }]
let enabled = null

test('platform custody: upsert + query works', async () => {
  await bs.brainStore.upsert(CID, RECS, { title: 'Vendor SOP' })
  const hits = await bs.brainStore.query(CID, vec(1), 3)
  assert.ok(hits.length === 1 && hits[0].text.includes('vendor onboarding'))
})

test('enable customer custody re-parents the SAME DEK; data still readable while unlocked', async () => {
  const platformWrapped = getWrappedDek(CID)
  enabled = bc.enableCustomerCustody(CID, { passphrase: PASS, platformWrappedDek: platformWrapped })
  assert.equal(enabled.recoveryPhrase.split(' ').length, 24)
  recdb.set(CID, { custody: 'customer', wrappedDek: enabled.wrappedDek, salt: enabled.salt, wrapPass: enabled.wrapPass, kdf: enabled.kdf, dekId: enabled.dekId })
  const hits = await bs.brainStore.query(CID, vec(1), 3)   // still unlocked after enable
  assert.ok(hits.length === 1 && hits[0].text.includes('vendor onboarding'))
})

test('a LOCKED customer brain refuses query with BRAIN_LOCKED (never an empty corpus)', async () => {
  bc.lock(CID)
  await assert.rejects(() => bs.brainStore.query(CID, vec(1), 3), (e) => e.code === 'BRAIN_LOCKED')
})

test('unlock with the passphrase restores access', async () => {
  const c = recdb.get(CID)
  bc.unlockWithPassphrase(CID, { passphrase: PASS, salt: c.salt, wrapPass: c.wrapPass, wrappedDek: c.wrappedDek, kdf: c.kdf })
  assert.equal((await bs.brainStore.query(CID, vec(1), 3)).length, 1)
})

test('a wrong passphrase is rejected and the brain stays locked', async () => {
  bc.lock(CID)
  const c = recdb.get(CID)
  assert.throws(() => bc.unlockWithPassphrase(CID, { passphrase: 'nope nope nope', salt: c.salt, wrapPass: c.wrapPass, wrappedDek: c.wrappedDek, kdf: c.kdf }))
  await assert.rejects(() => bs.brainStore.query(CID, vec(1), 3), (e) => e.code === 'BRAIN_LOCKED')
})

test('unlock with the 24-word recovery phrase restores access', async () => {
  const c = recdb.get(CID)
  bc.unlockWithRecovery(CID, { recoveryPhrase: enabled.recoveryPhrase, wrappedDek: c.wrappedDek })
  assert.equal((await bs.brainStore.query(CID, vec(1), 3)).length, 1)
})

test('rotate passphrase: new one unlocks, old one no longer works', async () => {
  const c = recdb.get(CID)
  const next = bc.changePassphrase(CID, { currentPassphrase: PASS, salt: c.salt, wrapPass: c.wrapPass, kdf: c.kdf, newPassphrase: 'a different passphrase' })
  recdb.set(CID, { ...c, salt: next.salt, wrapPass: next.wrapPass, kdf: next.kdf })
  const c2 = recdb.get(CID)
  bc.lock(CID)
  bc.unlockWithPassphrase(CID, { passphrase: 'a different passphrase', salt: c2.salt, wrapPass: c2.wrapPass, wrappedDek: c2.wrappedDek, kdf: c2.kdf })
  assert.equal((await bs.brainStore.query(CID, vec(1), 3)).length, 1)
  bc.lock(CID)
  assert.throws(() => bc.unlockWithPassphrase(CID, { passphrase: PASS, salt: c2.salt, wrapPass: c2.wrapPass, wrappedDek: c2.wrappedDek, kdf: c2.kdf }))
})
