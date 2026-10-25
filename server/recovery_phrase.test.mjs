// server/recovery_phrase.test.mjs - unit + property tests for the BIP39 24-word recovery
// phrase codec. NEW test file; does not modify any source. node --test, node:assert/strict.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { encodeMnemonic, decodeMnemonic } from './recovery_phrase.js'
import { BIP39_WORDS } from './bip39_wordlist.js'

test('the bundled wordlist is the standard 2048-word BIP39 list', () => {
  assert.equal(BIP39_WORDS.length, 2048)
  assert.equal(BIP39_WORDS[0], 'abandon')
  assert.equal(BIP39_WORDS[2047], 'zoo')
})

test('encodeMnemonic returns exactly 24 words for a 32-byte buffer', () => {
  const buf = crypto.randomBytes(32)
  const words = encodeMnemonic(buf).split(' ')
  assert.equal(words.length, 24)
  for (const w of words) assert.ok(BIP39_WORDS.includes(w), `"${w}" is a valid BIP39 word`)
})

test('encodeMnemonic throws on a non-32-byte input', () => {
  assert.throws(() => encodeMnemonic(crypto.randomBytes(16)), /32-byte Buffer/)
  assert.throws(() => encodeMnemonic(crypto.randomBytes(33)), /32-byte Buffer/)
  assert.throws(() => encodeMnemonic(Buffer.alloc(0)), /32-byte Buffer/)
  assert.throws(() => encodeMnemonic('not a buffer'), /32-byte Buffer/)
  assert.throws(() => encodeMnemonic(null), /32-byte Buffer/)
})

test('round-trip: decode(encode(buf)) === buf for 200 random buffers', () => {
  for (let i = 0; i < 200; i++) {
    const buf = crypto.randomBytes(32)
    const round = decodeMnemonic(encodeMnemonic(buf))
    assert.ok(Buffer.isBuffer(round))
    assert.equal(round.length, 32)
    assert.ok(round.equals(buf), `round-trip must be exact (iteration ${i})`)
  }
})

test('round-trip holds for edge buffers (all-zero, all-0xff)', () => {
  for (const buf of [Buffer.alloc(32, 0x00), Buffer.alloc(32, 0xff)]) {
    assert.ok(decodeMnemonic(encodeMnemonic(buf)).equals(buf))
  }
})

test('decodeMnemonic rejects the wrong word count (23 and 25)', () => {
  const words = encodeMnemonic(crypto.randomBytes(32)).split(' ')
  const twentyThree = words.slice(0, 23).join(' ')
  const twentyFive = [...words, words[0]].join(' ')
  assert.throws(() => decodeMnemonic(twentyThree), /exactly 24 words/)
  assert.throws(() => decodeMnemonic(twentyFive), /exactly 24 words/)
})

test('decodeMnemonic rejects an unknown word', () => {
  const words = encodeMnemonic(crypto.randomBytes(32)).split(' ')
  words[5] = 'zzzznotarealword'
  assert.throws(() => decodeMnemonic(words.join(' ')), /not a valid recovery word/)
})

test('decodeMnemonic rejects a checksum failure (one word changed to another valid word)', () => {
  // Build a valid phrase, then replace word[0] with other valid words until decode throws.
  // ~255/256 of valid-word substitutions break the BIP39 checksum, so a throw is found in
  // the first couple of candidates with overwhelming probability.
  const words = encodeMnemonic(crypto.randomBytes(32)).split(' ')
  let threwChecksum = false
  for (let i = 0; i < 40 && !threwChecksum; i++) {
    const candidate = BIP39_WORDS[(BIP39_WORDS.indexOf(words[0]) + 1 + i) % 2048]
    if (candidate === words[0]) continue
    const mutated = [candidate, ...words.slice(1)].join(' ')
    try {
      decodeMnemonic(mutated)
      // The rare 1/256 case: substitution happened to keep a valid checksum; try next word.
    } catch (e) {
      assert.match(e.message, /checksum failed/, 'a valid-word substitution must fail the checksum, not the word lookup')
      threwChecksum = true
    }
  }
  assert.ok(threwChecksum, 'at least one valid-word substitution must trigger a checksum failure')
})

test('decodeMnemonic rejects a checksum failure (two valid words swapped)', () => {
  // Swapping two distinct words reorders the entropy, breaking the checksum ~255/256 of the
  // time. Retry with fresh random phrases until a swap yields a checksum failure.
  let threw = false
  for (let attempt = 0; attempt < 40 && !threw; attempt++) {
    const words = encodeMnemonic(crypto.randomBytes(32)).split(' ')
    if (words[0] === words[1]) continue
    const swapped = [words[1], words[0], ...words.slice(2)].join(' ')
    try {
      decodeMnemonic(swapped)
    } catch (e) {
      assert.match(e.message, /checksum failed/)
      threw = true
    }
  }
  assert.ok(threw, 'swapping two valid words must be detectable via the checksum')
})

test('tolerance: extra whitespace still decodes when words are valid', () => {
  const buf = crypto.randomBytes(32)
  const phrase = encodeMnemonic(buf)
  const messy = '   ' + phrase.split(' ').join('    ') + '\t\n  '
  assert.ok(decodeMnemonic(messy).equals(buf), 'leading/trailing/interior whitespace must be tolerated')
})

test('tolerance: upper and mixed case still decode when words are valid', () => {
  const buf = crypto.randomBytes(32)
  const phrase = encodeMnemonic(buf)
  const upper = phrase.toUpperCase()
  const mixed = phrase.split(' ').map((w, i) => (i % 2 ? w.toUpperCase() : w)).join(' ')
  assert.ok(decodeMnemonic(upper).equals(buf), 'all-uppercase must decode')
  assert.ok(decodeMnemonic(mixed).equals(buf), 'mixed-case must decode')
})
