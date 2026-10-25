// Focused self-test for server/brain_crypto.js (node --test).
// Injects a fixed 32-byte test KEK so no real master key is touched.
import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  configureBrainCrypto, ensureTenantDek, seal, open,
  encryptForTenant, decryptForTenant,
  encryptVectorForTenant, decryptVectorForTenant,
  evictTenant, rotateTenantDek,
} from './brain_crypto.js'

const TEST_KEK = Buffer.alloc(32, 7)   // deterministic 32-byte test KEK
configureBrainCrypto({ getMasterKey: () => TEST_KEK })

const CO = 'company-test-1'

test('round-trip seal/open with a tenant DEK', () => {
  const { dek } = ensureTenantDek(CO)
  const msg = Buffer.from('hello company brain')
  const sealed = seal(msg, dek)
  assert.equal(sealed[0], 0x01, 'version byte')
  assert.ok(sealed.length > 1 + 12 + 16, 'has iv+tag+ct')
  assert.deepEqual(open(sealed, dek), msg)
})

test('encrypt/decrypt a buffer via tenant wrappers', () => {
  ensureTenantDek(CO)
  const buf = crypto.randomBytes(1234)
  const sealed = encryptForTenant(CO, buf)
  assert.deepEqual(decryptForTenant(CO, sealed), buf)
})

test('encrypt/decrypt a Float32Array vector (exact round-trip, length === dim*4)', () => {
  ensureTenantDek(CO)
  const dim = 384
  const v = new Float32Array(dim)
  for (let i = 0; i < dim; i++) v[i] = Math.sin(i) * 0.5
  const sealed = encryptVectorForTenant(CO, v)
  // ciphertext of the raw float bytes: payload (sealed minus 1+12+16 header) === dim*4
  assert.equal(sealed.length - (1 + 12 + 16), dim * 4, 'sealed payload === dim*4')
  const out = decryptVectorForTenant(CO, sealed, dim)
  assert.ok(out instanceof Float32Array)
  assert.equal(out.length, dim)
  for (let i = 0; i < dim; i++) assert.equal(out[i], v[i], `vector[${i}] exact`)
})

test('DEK wrap/unwrap stability (same dek -> same wrappedDek unwraps back)', () => {
  const a = ensureTenantDek('co-stable')
  // Re-run ensureTenantDek with the produced wrappedDek on a fresh tenant id -> same dek/dekId.
  const b = ensureTenantDek('co-stable-2', a.wrappedDek)
  assert.equal(b.dekId, a.dekId, 'dekId stable across unwrap')
  assert.ok(b.dek.equals(a.dek), 'unwrapped DEK equals original')
  // And the wrappedDek round-trips exactly.
  assert.equal(b.wrappedDek, a.wrappedDek)
})

test('open() throws on a tampered auth tag', () => {
  const { dek } = ensureTenantDek(CO)
  const sealed = seal(Buffer.from('sensitive chunk text'), dek)
  const tampered = Buffer.from(sealed)
  tampered[1 + 12] ^= 0xff   // flip a byte inside the auth tag region
  assert.throws(() => open(tampered, dek), /./)
})

test('open() throws on a tampered ciphertext (never returns empty)', () => {
  const { dek } = ensureTenantDek(CO)
  const sealed = seal(Buffer.from('payload bytes here'), dek)
  const tampered = Buffer.from(sealed)
  tampered[tampered.length - 1] ^= 0x01
  assert.throws(() => open(tampered, dek))
})

test('evictTenant drops the resident DEK', () => {
  ensureTenantDek('co-evict')
  assert.equal(evictTenant('co-evict'), true)
  // After eviction, tenant wrappers must refuse (no silent fallback).
  assert.throws(() => encryptForTenant('co-evict', Buffer.from('x')), /no DEK resident/)
})

test('rotateTenantDek issues a new DEK and re-encrypts old->new', () => {
  const orig = ensureTenantDek('co-rot')
  const sealedOld = encryptForTenant('co-rot', Buffer.from('rotate me'))
  const rot = rotateTenantDek('co-rot', orig.wrappedDek)
  assert.notEqual(rot.dekId, orig.dekId, 'new dekId')
  const n = rot.reEncrypt((openOld, sealNew) => {
    const plain = openOld(sealedOld)
    assert.deepEqual(plain, Buffer.from('rotate me'))
    const resealed = sealNew(plain)
    // The resealed blob must open under the NEW resident DEK.
    assert.deepEqual(decryptForTenant('co-rot', resealed), Buffer.from('rotate me'))
    return 1
  })
  assert.equal(n, 1)
})
