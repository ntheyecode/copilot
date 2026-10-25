// Password-encrypted data export (WCPX v1) + privacy-contact capture, end to end
// against the REAL key_derive / report_sign / store / brain modules in an isolated
// temp WORK_DATA_DIR. Proves:
//   - setting an export password stores ONLY a verifier (never the password);
//   - the wrong password is rejected (constant-time verifier);
//   - a WCPX archive round-trips with the right password and fails with the wrong one;
//   - the header HMAC verifies and header/body tampering is detected;
//   - the brain envelope round-trips (DEK re-wrapped under the password; sealed blobs
//     open with it) without re-materializing plaintext;
//   - once a password is set the plaintext-export gate predicate closes the side door;
//   - privacy-contact add/list works and is audited;
//   - individuals (no companyId) keep the plaintext path (no export password gate).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-export-'))
process.env.PORT = '0'
const here = path.dirname(fileURLToPath(import.meta.url))
const imp = (f) => import('file://' + path.join(here, f).replace(/\\/g, '/'))

const store = await imp('store.js')
const ce = await imp('customer_export.js')
const bc = await imp('brain_crypto.js')
const bs = await imp('brain_store.js')

// Wire the brain exactly as the server does at boot (platform custody by default).
bc.configureBrainCrypto({ getMasterKey: store.brainMasterKey })
bs.configureBrainStore({ getWrappedDek: store.getCompanyBrainDek, setWrappedDek: store.setCompanyBrainDek, getCustody: store.getCompanyBrainCustody })

const PASSWORD = 'super-secret-export-pw-123'
const WRONG = 'super-secret-export-pw-124'
const co = store.createCompany({ name: 'Export Co Test', seats: 5, adminSeats: 2 })
const CID = co.id
const DB_FILE = path.join(process.env.WORK_DATA_DIR, 'db.json')

function vec(seed) {
  const a = new Float32Array(384)
  for (let i = 0; i < 384; i++) a[i] = Math.sin(seed + i)
  let n = 0; for (const x of a) n += x * x; n = Math.sqrt(n)
  return Array.from(a, (x) => x / n)
}

test('setting an export password stores a verifier, never the password', () => {
  assert.equal(store.companyExportPasswordSet(CID), false)
  const status = store.setCompanyExportPassword(CID, PASSWORD)
  assert.equal(status.passwordSet, true)
  assert.ok(status.setAt)
  assert.equal(store.companyExportPasswordSet(CID), true)
  // The raw db on disk must NOT contain the plaintext password; the verifier is
  // encrypted at rest (enc:v1: via mapSecrets).
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  assert.ok(!raw.includes(PASSWORD), 'db.json must not contain the plaintext password')
  assert.ok(raw.includes('"verifierSalt"'), 'the verifier salt is persisted')
  assert.ok(raw.includes('enc:v1:'), 'secrets (incl. the verifier) are encrypted at rest')
})

test('a weak password is rejected (>= 8 chars)', () => {
  assert.throws(() => store.setCompanyExportPassword(CID, 'short'), (e) => e.status === 400)
  // The earlier strong password is unchanged.
  assert.equal(store.checkCompanyExportPassword(CID, PASSWORD), true)
})

test('the password verifier accepts the right password and rejects the wrong one', () => {
  assert.equal(store.checkCompanyExportPassword(CID, PASSWORD), true)
  assert.equal(store.checkCompanyExportPassword(CID, WRONG), false)
  assert.equal(store.checkCompanyExportPassword(CID, ''), false)
})

test('publicCompany exposes export STATUS + sensitivity but no verifier/salt/key', () => {
  const pub = store.getCompany(CID)
  assert.equal(pub.export.passwordSet, true)
  assert.ok(pub.export.setAt)
  assert.equal('verifier' in pub.export, false)
  assert.equal('verifierSalt' in pub.export, false)
  assert.ok(pub.sensitivity && Array.isArray(pub.sensitivity.recipients))
  assert.equal(pub.sensitivity.tier, 'standard')
  assert.ok(!JSON.stringify(pub).includes('verifier'))
})

test('privacy-contact add + list works and is audited', () => {
  const beforeActions = store.listAdminActions({ limit: 50 }).length
  const out = store.setCompanyPrivacyContacts(CID, [
    { name: 'Dana Privacy', email: 'dana@example.com', title: 'DPO', canReceivePassword: true, canRetrieveSensitive: true },
    { name: 'Lee Legal', email: 'lee@example.com', title: 'Counsel', canReceivePassword: false, canRetrieveSensitive: true },
  ], { byUserId: 'u-admin', reason: 'initial privacy contacts' })
  assert.equal(out.recipients.length, 2)
  assert.ok(out.recipients.every((r) => r.id))
  assert.equal(out.recipients[0].canReceivePassword, true)
  // Reload via the public getter.
  const got = store.getCompanySensitivity(CID)
  assert.equal(got.recipients.length, 2)
  assert.equal(got.recipients[1].email, 'lee@example.com')
  // Audited.
  const actions = store.listAdminActions({ limit: 50 })
  assert.ok(actions.length > beforeActions)
  assert.ok(actions.some((a) => a.action === 'privacy_contacts_update' && a.companyId === CID))
})

test('a duplicate recipient email is rejected', () => {
  assert.throws(() => store.setCompanyPrivacyContacts(CID, [
    { name: 'A', email: 'dup@example.com', canReceivePassword: true },
    { name: 'B', email: 'dup@example.com' },
  ], { byUserId: 'u-admin', reason: 'dup test' }), (e) => e.status === 400)
})

test('a WCPX archive round-trips with the right password (skills + learnings)', () => {
  store.importCompanySkills(CID, [{ title: 'Vendor SOP', content: 'Step one, open the vendor portal and verify the PO.' }], { replace: true })
  store.importCompanyLearnings(CID, [{ app: 'Zendesk', fact: 'Bulk reassign keeps the SLA timers when done from the views page.', kind: 'fresh' }], { replace: true })

  const { buffer, filename, brainMode } = ce.buildCompanyArchive({ companyId: CID, password: PASSWORD })
  assert.ok(buffer.length > 0)
  assert.match(filename, /^workcopilot-export-.+\.wcpx$/)
  assert.ok(buffer.subarray(0, 6).equals(ce.WCPX_MAGIC))
  assert.equal(brainMode, 'none')   // no brain yet

  const { header, payload } = ce.parseArchive(buffer, PASSWORD)
  assert.equal(header.v, 1)
  assert.equal(header.cipher, 'AES-256-GCM')
  assert.equal(payload.meta.companyId, CID)
  assert.equal(payload.skills.length, 1)
  assert.ok(payload.skills[0].content.includes('vendor portal'))
  assert.equal(payload.learnings.length, 1)
  assert.equal(payload.learnings[0].app, 'Zendesk')
  assert.ok(Array.isArray(payload.sensitivity.recipients) && payload.sensitivity.recipients.length === 2)
})

test('the wrong password fails to open the archive (GCM auth)', () => {
  const { buffer } = ce.buildCompanyArchive({ companyId: CID, password: PASSWORD })
  assert.throws(() => ce.parseArchive(buffer, WRONG), /wrong password or tampered/)
})

test('the header HMAC verifies and tampering is detected', () => {
  const { buffer } = ce.buildCompanyArchive({ companyId: CID, password: PASSWORD })
  assert.equal(ce.verifyArchiveHeader(buffer).valid, true)

  // Flip a byte inside the header JSON region (after magic+len) -> HMAC/hash fails.
  const tampered = Buffer.from(buffer)
  const headerStart = 6 + 4
  tampered[headerStart + 5] = tampered[headerStart + 5] ^ 0x01
  const v = ce.verifyArchiveHeader(tampered)
  assert.equal(v.valid, false)
  assert.throws(() => ce.parseArchive(tampered, PASSWORD), /header verification failed/)

  // Flip a byte in the body -> header still verifies, but the body GCM tag fails.
  const bodyTampered = Buffer.from(buffer)
  bodyTampered[bodyTampered.length - 1] = bodyTampered[bodyTampered.length - 1] ^ 0x01
  assert.equal(ce.verifyArchiveHeader(bodyTampered).valid, true)
  assert.throws(() => ce.parseArchive(bodyTampered, PASSWORD), /wrong password or tampered/)
})

test('the Company Brain is enveloped (DEK re-wrapped under the password; blobs open)', async () => {
  const RECS = [{ chunkId: 'c1', sourceId: 's1', sourceTitle: 'Vendor SOP', ordinal: 0, text: 'vendor onboarding step one', vector: vec(1), contentHash: 'h1', chunkHash: 'ch1' }]
  await bs.brainStore.upsert(CID, RECS, { title: 'Vendor SOP' })

  const { buffer, brainMode, brainIncluded } = ce.buildCompanyArchive({ companyId: CID, password: PASSWORD })
  assert.equal(brainMode, 'envelope')
  assert.equal(brainIncluded, true)

  const { header, payload } = ce.parseArchive(buffer, PASSWORD)
  assert.equal(header.brain.present, true)
  assert.equal(header.brain.mode, 'envelope')
  assert.ok(header.brain.dekWrap && header.brain.dekWrap.salt && header.brain.dekWrap.wrapped)
  assert.ok(payload.brain && payload.brain.files.index)

  // Recover the DEK with the password and open the sealed index blob (no plaintext
  // was stored; it only opens WITH the password-derived key).
  const dek = ce.unwrapBrainDek(header, PASSWORD)
  assert.equal(dek.length, 32)
  const indexBuf = Buffer.from(payload.brain.files.index, 'base64')
  const indexJson = JSON.parse(ce.openBrainBlob(indexBuf, dek).toString('utf8'))
  assert.ok(indexJson && typeof indexJson === 'object')
  assert.ok(JSON.stringify(indexJson).includes('c1'), 'the sealed index references the stored chunk')

  // The wrong password cannot recover the DEK.
  assert.throws(() => ce.unwrapBrainDek(header, WRONG))
})

test('once a password is set, the plaintext-export gate predicate is true', () => {
  // The index.js plaintext routes return 409 when this is true (single chokepoint).
  assert.equal(store.companyExportPasswordSet(CID), true)
})

test('individuals (no companyId) keep the plaintext path (no export-password gate)', () => {
  const solo = store.createWorkUser({ username: 'solo_export', password: 'Passw0rd!x' })
  assert.ok(!solo.companyId, 'a solo user has no companyId')
  // The gate is keyed on a company; it never fires for an individual.
  assert.equal(store.companyExportPasswordSet(''), false)
  assert.equal(store.companyExportPasswordSet(null), false)
})
