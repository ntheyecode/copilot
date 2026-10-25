// server/brain_crypto_props.test.mjs - property + unit tests for the per-tenant envelope
// encryption primitives. NEW test file; does not modify any source.
// node --test, node:assert/strict.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  configureBrainCrypto,
  seal,
  open,
  ensureTenantDek,
  evictTenant,
  encryptForTenant,
  decryptForTenant,
  encryptVectorForTenant,
  decryptVectorForTenant,
  isUnlocked,
} from './brain_crypto.js'

// A fixed 32-byte test KEK, injected once. The module calls getMasterKey() lazily on each
// wrap/unwrap, so a stable function is all it needs.
const TEST_KEK = Buffer.alloc(32, 0xa5)
configureBrainCrypto({ getMasterKey: () => TEST_KEK })

// Each test uses a unique companyId so the module-global DEK cache cannot leak state between
// tests.
let _n = 0
function cid(tag) { return `test-co-${tag}-${++_n}` }

// Layout of a sealed blob: ver(1) | iv(12) | authTag(16) | ciphertext.
const OFF_VER = 0
const OFF_IV = 1
const OFF_TAG = 1 + 12
const OFF_CT = 1 + 12 + 16

test('seal/open round-trips random buffers exactly (incl. empty and 1 MB)', () => {
  const dek = crypto.randomBytes(32)
  const samples = [
    Buffer.alloc(0),
    Buffer.from('hello brain'),
    crypto.randomBytes(1),
    crypto.randomBytes(1024),
    crypto.randomBytes(1024 * 1024), // 1 MB
  ]
  for (const plain of samples) {
    const sealed = seal(plain, dek)
    assert.ok(Buffer.isBuffer(sealed))
    assert.equal(sealed[OFF_VER], 0x01, 'version byte is 0x01')
    assert.equal(sealed.length, OFF_CT + plain.length, 'sealed length = header + plaintext')
    const out = open(sealed, dek)
    assert.ok(out.equals(plain), `recovered plaintext must match exactly (len=${plain.length})`)
  }
})

test('seal uses a fresh IV per call (two seals of the same plaintext differ)', () => {
  const dek = crypto.randomBytes(32)
  const a = seal(Buffer.from('same'), dek)
  const b = seal(Buffer.from('same'), dek)
  assert.ok(!a.equals(b), 'IV reuse would make two seals identical; they must differ')
})

test('seal/open require a 32-byte DEK', () => {
  assert.throws(() => seal(Buffer.from('x'), Buffer.alloc(16)), /32-byte DEK/)
  assert.throws(() => open(Buffer.alloc(40), Buffer.alloc(16)), /32-byte DEK/)
})

test('open THROWS on a flipped auth-tag byte', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(crypto.randomBytes(64), dek)
  sealed[OFF_TAG] ^= 0x01
  assert.throws(() => open(sealed, dek))
})

test('open THROWS on a flipped ciphertext byte', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(crypto.randomBytes(64), dek)
  sealed[OFF_CT] ^= 0x01
  assert.throws(() => open(sealed, dek))
})

test('open THROWS on a flipped IV byte', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(crypto.randomBytes(64), dek)
  sealed[OFF_IV] ^= 0x01
  assert.throws(() => open(sealed, dek))
})

test('open THROWS on a wrong version byte', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(crypto.randomBytes(16), dek)
  sealed[OFF_VER] = 0x02
  assert.throws(() => open(sealed, dek), /unsupported seal version/)
})

test('open THROWS on truncation', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(crypto.randomBytes(64), dek)
  // Below the header minimum -> "truncated"; above header but short ciphertext -> auth fail.
  assert.throws(() => open(sealed.subarray(0, 10), dek), /truncated/)
  assert.throws(() => open(sealed.subarray(0, OFF_CT + 4), dek))
})

test('open THROWS under a wrong DEK', () => {
  const dek = crypto.randomBytes(32)
  const sealed = seal(Buffer.from('secret'), dek)
  assert.throws(() => open(sealed, crypto.randomBytes(32)))
})

test('encryptVectorForTenant/decryptVectorForTenant round-trip a Float32Array exactly', () => {
  const c = cid('vec')
  ensureTenantDek(c)
  const dim = 384
  const v = new Float32Array(dim)
  for (let i = 0; i < dim; i++) v[i] = Math.fround((Math.random() - 0.5) * 1000)
  v[0] = 0
  v[1] = -0
  v[2] = Math.fround(Math.PI)
  const sealed = encryptVectorForTenant(c, v)
  const out = decryptVectorForTenant(c, sealed, dim)
  assert.ok(out instanceof Float32Array)
  assert.equal(out.length, dim)
  for (let i = 0; i < dim; i++) assert.equal(out[i], v[i], `component ${i} must match exactly`)
})

test('encryptVectorForTenant requires a Float32Array', () => {
  const c = cid('vec-type')
  ensureTenantDek(c)
  assert.throws(() => encryptVectorForTenant(c, [1, 2, 3]), /Float32Array/)
  assert.throws(() => encryptVectorForTenant(c, new Float64Array(4)), /Float32Array/)
})

test('decryptVectorForTenant enforces the dim*4 length assertion (wrong dim throws)', () => {
  const c = cid('vec-dim')
  ensureTenantDek(c)
  const dim = 16
  const v = new Float32Array(dim)
  const sealed = encryptVectorForTenant(c, v)
  assert.ok(decryptVectorForTenant(c, sealed, dim).length === dim)
  assert.throws(() => decryptVectorForTenant(c, sealed, dim + 1), /expected/)
  assert.throws(() => decryptVectorForTenant(c, sealed, dim - 1), /expected/)
})

test('DEK wrap/unwrap under the KEK is stable (same wrappedDek -> same dekId)', () => {
  // Mint a DEK + its wrap for one tenant, then feed that same wrap to a second tenant.
  const minted = ensureTenantDek(cid('mint'))
  assert.equal(typeof minted.wrappedDek, 'string')
  assert.ok(minted.wrappedDek.startsWith('enc:v1:'))

  const c = cid('stable')
  const first = ensureTenantDek(c, minted.wrappedDek)     // unwrap path
  const second = ensureTenantDek(c, minted.wrappedDek)    // cached path
  assert.equal(first.dekId, minted.dekId, 'unwrapping the same wrap yields the original DEK id')
  assert.equal(second.dekId, first.dekId, 'a repeat call returns the identical resident DEK')
  assert.ok(first.dek.equals(second.dek))
})

test('evictTenant drops the DEK so a subsequent decryptForTenant throws "no DEK resident"', () => {
  const c = cid('evict')
  ensureTenantDek(c)
  const sealed = encryptForTenant(c, Buffer.from('payload'))
  assert.ok(decryptForTenant(c, sealed).equals(Buffer.from('payload')))

  assert.equal(isUnlocked(c), true)
  assert.equal(evictTenant(c), true)
  assert.equal(isUnlocked(c), false)
  assert.throws(() => decryptForTenant(c, sealed), /no DEK resident/)
  assert.throws(() => encryptForTenant(c, Buffer.from('x')), /no DEK resident/)
  // Evicting an absent tenant is a no-op returning false.
  assert.equal(evictTenant(c), false)
})

test('ensureTenantDek honors a DIFFERENT wrappedDek (no stale-cache shadowing)', () => {
  const c = cid('rotate')
  // Resident DEK #1 (born fresh).
  const one = ensureTenantDek(c)
  // An independent, different wrapped DEK, minted via a throwaway tenant.
  const foreign = ensureTenantDek(cid('foreign'))
  assert.notEqual(foreign.dekId, one.dekId, 'the foreign wrap must be a genuinely different DEK')

  // Presenting the foreign wrap to the already-hot tenant must NOT return the stale entry.
  const got = ensureTenantDek(c, foreign.wrappedDek)
  assert.equal(got.dekId, foreign.dekId, 'the foreign/rotated wrap must be honored, not shadowed')
  assert.notEqual(got.dekId, one.dekId)

  // And the resident DEK is now the foreign one: data sealed under it round-trips.
  const sealed = encryptForTenant(c, Buffer.from('after rotation'))
  assert.ok(decryptForTenant(c, sealed).equals(Buffer.from('after rotation')))
})

test('a blob sealed under one tenant DEK cannot be opened under another tenant', () => {
  const a = cid('cross-a')
  const b = cid('cross-b')
  const ea = ensureTenantDek(a)
  const eb = ensureTenantDek(b)
  // Guard: the two tenants genuinely hold different DEKs.
  assert.notEqual(ea.dekId, eb.dekId)
  const sealed = encryptForTenant(a, Buffer.from('tenant-a-only'))
  assert.throws(() => decryptForTenant(b, sealed), 'tenant B DEK must not open tenant A ciphertext')
})
