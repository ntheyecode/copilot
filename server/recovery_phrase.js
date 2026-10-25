// server/recovery_phrase.js - BIP39 24-word recovery phrase for a 256-bit key (the Customer
// Master Key). Encodes/decodes a 32-byte buffer to/from the standard BIP39 English mnemonic,
// WITH the BIP39 checksum, so a mistyped word or wrong word order is detected on decode
// (never a silent wrong key). Pure JS over Node crypto + the bundled wordlist, zero deps.
import crypto from 'node:crypto'
import { BIP39_WORDS } from './bip39_wordlist.js'

// encodeMnemonic(buf32) -> "word1 word2 ... word24"
export function encodeMnemonic(buf) {
  if (!Buffer.isBuffer(buf) || buf.length !== 32) throw new Error('[recovery_phrase] encodeMnemonic requires a 32-byte Buffer')
  const cs = crypto.createHash('sha256').update(buf).digest()   // checksum = first 8 bits of sha256(entropy)
  let bits = ''
  for (const b of buf) bits += b.toString(2).padStart(8, '0')   // 256 entropy bits
  bits += cs[0].toString(2).padStart(8, '0')                    // + 8 checksum bits = 264
  const words = []
  for (let i = 0; i < bits.length; i += 11) words.push(BIP39_WORDS[parseInt(bits.slice(i, i + 11), 2)])
  return words.join(' ')
}

// decodeMnemonic("word1 ... word24") -> Buffer(32). THROWS on an unknown word, wrong count,
// or checksum mismatch, so a transcription error surfaces instead of yielding a wrong key.
export function decodeMnemonic(phrase) {
  const words = String(phrase || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length !== 24) throw new Error('[recovery_phrase] a recovery phrase must be exactly 24 words')
  let bits = ''
  for (const w of words) {
    const idx = BIP39_WORDS.indexOf(w)
    if (idx < 0) throw new Error(`[recovery_phrase] "${w}" is not a valid recovery word`)
    bits += idx.toString(2).padStart(11, '0')
  }
  const entBits = bits.slice(0, 256)
  const csBits = bits.slice(256)
  const buf = Buffer.alloc(32)
  for (let i = 0; i < 32; i++) buf[i] = parseInt(entBits.slice(i * 8, i * 8 + 8), 2)
  const want = crypto.createHash('sha256').update(buf).digest()[0].toString(2).padStart(8, '0')
  if (csBits !== want) throw new Error('[recovery_phrase] recovery phrase checksum failed - check the words and their order')
  return buf
}
