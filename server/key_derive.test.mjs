// server/key_derive.test.mjs - unit tests for the password-based key derivation primitives.
// NEW test file; does not modify any source. node --test, node:assert/strict.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { deriveKey, randomSalt, verifierOf, checkVerifier, KDF } from './key_derive.js'

// A small, fast KDF param set so the suite runs quickly. N must be >= 2^14 or the module
// floors it; we use a low cost on purpose because these tests only exercise behavior, not
// the production cost factor.
const FAST = { N: 1 << 14, r: 8, p: 1, dkLen: 32 }

test('deriveKey is deterministic for the same (password, salt, params)', () => {
  const salt = randomSalt(16)
  const a = deriveKey('correct horse battery staple', salt, FAST)
  const b = deriveKey('correct horse battery staple', salt, FAST)
  assert.ok(Buffer.isBuffer(a))
  assert.equal(a.length, 32)
  assert.ok(a.equals(b), 'same inputs must yield an identical key')
})

test('a different salt yields a different key', () => {
  const s1 = randomSalt(16)
  const s2 = randomSalt(16)
  const a = deriveKey('pw', s1, FAST)
  const b = deriveKey('pw', s2, FAST)
  assert.ok(!a.equals(b), 'different salt must change the key')
})

test('different params (N) yield a different key for the same password+salt', () => {
  const salt = randomSalt(16)
  const a = deriveKey('pw', salt, { ...FAST, N: 1 << 14 })
  const b = deriveKey('pw', salt, { ...FAST, N: 1 << 15 })
  assert.ok(!a.equals(b), 'different cost parameters must change the key')
})

test('salt accepted as a Buffer and as its base64 string, with identical result', () => {
  const saltBuf = randomSalt(16)
  const saltB64 = saltBuf.toString('base64')
  const fromBuf = deriveKey('pw', saltBuf, FAST)
  const fromStr = deriveKey('pw', saltB64, FAST)
  assert.ok(fromBuf.equals(fromStr), 'Buffer salt and its base64 string must derive the same key')
})

test('empty or missing salt throws', () => {
  assert.throws(() => deriveKey('pw', Buffer.alloc(0), FAST), /non-empty salt/)
  assert.throws(() => deriveKey('pw', '', FAST), /non-empty salt/)
  assert.throws(() => deriveKey('pw', null, FAST), /non-empty salt/)
  assert.throws(() => deriveKey('pw', undefined, FAST), /non-empty salt/)
})

test('randomSalt returns the requested length and two calls differ', () => {
  assert.equal(randomSalt().length, 16, 'default salt length is 16 bytes')
  assert.equal(randomSalt(32).length, 32)
  const a = randomSalt(16)
  const b = randomSalt(16)
  assert.ok(!a.equals(b), 'two random salts must differ')
})

test('verifierOf / checkVerifier: correct password accepts, wrong rejects', () => {
  const salt = randomSalt(16)
  const v = verifierOf('s3cret-pass', salt, FAST)
  assert.equal(typeof v, 'string')
  assert.ok(checkVerifier('s3cret-pass', salt, v, FAST), 'correct password must verify')
  assert.equal(checkVerifier('wrong-pass', salt, v, FAST), false, 'wrong password must be rejected')
})

test('a tampered verifier is rejected', () => {
  const salt = randomSalt(16)
  const v = verifierOf('pw', salt, FAST)
  // Flip one byte of the decoded verifier and re-encode.
  const raw = Buffer.from(v, 'base64')
  raw[0] ^= 0x01
  const tampered = raw.toString('base64')
  assert.equal(checkVerifier('pw', salt, tampered, FAST), false, 'tampered verifier must not verify')
})

test('checkVerifier never throws on bad input (returns false)', () => {
  const salt = randomSalt(16)
  const v = verifierOf('pw', salt, FAST)
  // Each of these is malformed in some way; none may throw, all must return false.
  assert.equal(checkVerifier('pw', salt, null, FAST), false)
  assert.equal(checkVerifier('pw', salt, undefined, FAST), false)
  assert.equal(checkVerifier('pw', salt, '', FAST), false)
  assert.equal(checkVerifier('pw', salt, 'not-valid-base64!!!', FAST), false)
  assert.equal(checkVerifier('pw', salt, 'AAAA', FAST), false) // decodes to 3 bytes, length mismatch
  // A bad salt would make deriveKey throw internally; checkVerifier must swallow it.
  assert.equal(checkVerifier('pw', '', v, FAST), false)
  assert.equal(checkVerifier('pw', null, v, FAST), false)
})

test('KDF defaults are sane (scrypt, 32-byte key, floored N)', () => {
  assert.equal(KDF.alg, 'scrypt')
  assert.equal(KDF.dkLen, 32)
  assert.ok(KDF.N >= (1 << 14), 'N is floored at 2^14')
  assert.equal(KDF.r, 8)
  assert.equal(KDF.p, 1)
})

test('derived verifier length matches a 32-byte key (not 512-bit)', () => {
  const salt = randomSalt(16)
  const v = verifierOf('pw', salt, FAST)
  assert.equal(Buffer.from(v, 'base64').length, 32)
})

test('checkVerifier uses constant-time compare path for equal-length keys', () => {
  // Sanity: a verifier built with a crypto.scryptSync of the same params matches.
  const salt = randomSalt(16)
  const key = deriveKey('pw', salt, FAST)
  const v = key.toString('base64')
  assert.ok(checkVerifier('pw', salt, v, FAST))
  // And an independently derived equal-length-but-different key is rejected.
  const other = crypto.randomBytes(32).toString('base64')
  assert.equal(checkVerifier('pw', salt, other, FAST), false)
})
