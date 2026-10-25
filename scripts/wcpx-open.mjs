#!/usr/bin/env node
// scripts/wcpx-open.mjs - STANDALONE customer-side opener for WorkCoPilot's
// password-encrypted data export (WCPX v1).
//
// WHY THIS EXISTS
//   A company admin downloads a `.wcpx` archive from WorkCoPilot and needs to
//   open it with the export password they set. This script is SELF-CONTAINED:
//   it uses Node built-ins only (crypto, fs, readline) and imports NOTHING from
//   the server. A customer runs it with just this one file plus Node installed:
//
//     node scripts/wcpx-open.mjs <archive.wcpx> [--out <file.json>]
//
//   It reads the archive, validates the magic + version + header, prompts for
//   the password (hidden input, or the WCPX_PASSWORD environment variable),
//   derives the body key with scrypt, decrypts the AES-256-GCM body with the
//   header as additional authenticated data (AAD), and writes or prints the
//   inner JSON payload. A wrong password or a tampered archive makes GCM throw,
//   which is caught and reported as a clear error - there is never a silent or
//   partial output.
//
// WCPX v1 BYTE LAYOUT (read side reimplemented here, NOT imported)
//   magic "WCPX1\n" (6 bytes)
//   headerLen           uint32 big-endian (4 bytes)
//   header JSON         (headerLen bytes, UTF-8)
//   authTag             (16 bytes, the body GCM tag)
//   body                AES-256-GCM ciphertext of the inner JSON payload
//
//   header = {
//     v, companyId, createdAt,
//     kdf:    { alg:"scrypt", N, r, p, dkLen, archiveSalt(base64) },
//     cipher: "AES-256-GCM",
//     iv:     base64 (12 bytes),
//     brain:  { present, mode:"envelope"|"none", dekWrap?:{ salt(b64), wrapped(b64) } },
//     notes:  [ ... ],
//     hmac:   { alg, keyId, issuedAt, hash, sig }
//   }
//   inner payload JSON = { meta, profile, sensitivity, skills, learnings, brain? }
//
// KEY DERIVATION (mirrored EXACTLY from server/key_derive.js)
//   bodyKey = scrypt(password, base64Decode(header.kdf.archiveSalt), dkLen, {
//               N: header.kdf.N, r: header.kdf.r, p: header.kdf.p,
//               maxmem: 256 * N * r + (1 << 20)
//             })
//   Defaults when a field is absent: N = 2^16, r = 8, p = 1, dkLen = 32.
//   The body GCM uses header.iv (12 bytes) and the FULL raw header bytes (exactly
//   as they appear in the file) as AAD, so a tampered header fails the body tag.
//
// BRAIN ENVELOPE (optional)
//   When header.brain.mode === "envelope", the Company Brain's Data Encryption
//   Key (DEK) is wrapped under scrypt(password, header.brain.dekWrap.salt) using
//   the same kdf params as the body. dekWrap.wrapped (base64) = iv(12) | tag(16) |
//   ciphertext. This opener can optionally unwrap the DEK to confirm the brain is
//   present; the brain's sealed blobs themselves stay in the payload under that
//   DEK. The main job is decrypting the body.
//
// HEADER ATTESTATION - HONEST SCOPE
//   The header carries an hmac block (HMAC-SHA256 over a canonical hash of the
//   header). This opener recomputes header.hmac.hash from the header bytes and
//   confirms it matches, which detects header tampering WITHOUT the password.
//   It also confirms the hmac block is present and reports the key id / issued
//   time it claims. It CANNOT verify header.hmac.sig: that signature is an HMAC
//   under a PLATFORM-held key the customer does not have, so it attests platform
//   origin but is NOT customer-verifiable. This tool does not claim otherwise.
//
// CONSTRAINTS: Node built-ins only. No new dependency. US spelling. No silent
// fallback - every failure prints a clear reason and exits non-zero.

import crypto from 'node:crypto'
import fs from 'node:fs'
import readline from 'node:readline'

const WCPX_MAGIC = Buffer.from('WCPX1\n', 'utf8') // 6 bytes
const WCPX_VERSION = 1
const IV_BYTES = 12
const TAG_BYTES = 16

// Default scrypt params, matching server/key_derive.js KDF when a header omits a
// field. The real archive always carries header.kdf, so these are a safety net.
const KDF_DEFAULTS = { alg: 'scrypt', N: 1 << 16, r: 8, p: 1, dkLen: 32 }

// scrypt requires maxmem >= 128 * N * r. server/key_derive.js gives headroom with
// this exact formula; mirror it so scryptSync does not error on large N.
function maxmemFor(N, r) { return 256 * N * r + (1 << 20) }

// Derive the key with the EXACT algorithm server/key_derive.js uses.
// `salt` may be a Buffer or a base64 string.
function deriveKey(password, salt, params) {
  const p = { ...KDF_DEFAULTS, ...(params || {}) }
  const saltBuf = Buffer.isBuffer(salt) ? salt : Buffer.from(String(salt || ''), 'base64')
  if (!saltBuf.length) throw new Error('a non-empty salt is required for key derivation')
  return crypto.scryptSync(String(password == null ? '' : password), saltBuf, p.dkLen, {
    N: p.N, r: p.r, p: p.p, maxmem: maxmemFor(p.N, p.r),
  })
}

function gcmDecrypt(key, iv, tag, ct, aad) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  if (aad) decipher.setAAD(aad)
  decipher.setAuthTag(tag)
  // THROWS on a wrong key or tampered input - never a silent empty buffer.
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

// Deterministic JSON (recursively sorted keys), identical to the stableStringify
// in server/customer_export.js, so we recompute the SAME header hash it stamped.
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}'
}
function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex') }

// ---- parse the container ---------------------------------------------------
function splitArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < WCPX_MAGIC.length + 4 + TAG_BYTES) {
    throw new Error('this is not a WCPX archive (the file is too short)')
  }
  if (!buffer.subarray(0, WCPX_MAGIC.length).equals(WCPX_MAGIC)) {
    throw new Error('this is not a WCPX archive (the magic bytes do not match "WCPX1")')
  }
  const headerLen = buffer.readUInt32BE(WCPX_MAGIC.length)
  const headerStart = WCPX_MAGIC.length + 4
  const headerEnd = headerStart + headerLen
  if (headerEnd + TAG_BYTES > buffer.length) throw new Error('the WCPX archive is truncated (header length exceeds the file)')
  const headerBytes = buffer.subarray(headerStart, headerEnd)
  const tag = buffer.subarray(headerEnd, headerEnd + TAG_BYTES)
  const body = buffer.subarray(headerEnd + TAG_BYTES)
  let header
  try { header = JSON.parse(headerBytes.toString('utf8')) } catch { throw new Error('the WCPX header is not valid JSON') }
  return { header, headerBytes, tag, body }
}

// Recompute the header content hash and report attestation presence. Needs no
// password. Returns { hashOk, reason?, keyId?, issuedAt?, alg?, hasSig }.
function inspectHeaderAttestation(header) {
  const hmac = header && header.hmac
  if (!hmac || !hmac.hash) return { hashOk: false, reason: 'the header carries no attestation hash', hasSig: false }
  const { hmac: _omit, ...headerNoHmac } = header
  const recomputed = sha256Hex(stableStringify(headerNoHmac))
  const hashOk = recomputed === hmac.hash
  return {
    hashOk,
    reason: hashOk ? null : 'the header content hash does not match (the header has been altered)',
    keyId: hmac.keyId || null,
    issuedAt: hmac.issuedAt || null,
    alg: hmac.alg || null,
    hasSig: Boolean(hmac.sig),
  }
}

// Optionally unwrap the brain DEK to confirm the brain is present. Non-fatal:
// returns true/false and never aborts the main body decrypt.
function tryUnwrapBrainDek(header, password) {
  const dw = header && header.brain && header.brain.dekWrap
  if (!dw) return false
  try {
    const salt = Buffer.from(String(dw.salt || ''), 'base64')
    const raw = Buffer.from(String(dw.wrapped || ''), 'base64')
    if (raw.length < IV_BYTES + TAG_BYTES) return false
    const key = deriveKey(password, salt, header.kdf || KDF_DEFAULTS)
    try {
      const dek = gcmDecrypt(
        key,
        raw.subarray(0, IV_BYTES),
        raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES),
        raw.subarray(IV_BYTES + TAG_BYTES),
      )
      return Buffer.isBuffer(dek) && dek.length === 32
    } finally { try { key.fill(0) } catch { /* best-effort */ } }
  } catch { return false }
}

// ---- hidden password prompt (Node built-ins only) --------------------------
function promptPasswordHidden(promptText) {
  return new Promise((resolve, reject) => {
    const input = process.stdin
    const output = process.stdout
    if (!input.isTTY) {
      // No interactive terminal (piped / non-TTY). Read one line without hiding;
      // we cannot mute a non-TTY stream. Document this honestly rather than hang.
      const rl = readline.createInterface({ input, output })
      output.write(promptText + ' (input is not a TTY, so it will not be hidden): ')
      rl.question('', (answer) => { rl.close(); resolve(answer) })
      return
    }
    output.write(promptText + ': ')
    let value = ''
    const onData = (chunk) => {
      const s = chunk.toString('utf8')
      for (const ch of s) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') { // enter / Ctrl-D
          cleanup()
          output.write('\n')
          resolve(value)
          return
        } else if (ch === '\u0003') { // Ctrl-C
          cleanup()
          output.write('\n')
          reject(new Error('cancelled'))
          return
        } else if (ch === '\u007f' || ch === '\b') { // backspace / delete
          value = value.slice(0, -1)
        } else {
          value += ch
        }
      }
    }
    const cleanup = () => {
      input.removeListener('data', onData)
      try { input.setRawMode(false) } catch { /* best-effort */ }
      input.pause()
    }
    try { input.setRawMode(true) } catch { /* best-effort */ }
    input.resume()
    input.on('data', onData)
  })
}

// ---- CLI -------------------------------------------------------------------
function parseArgs(argv) {
  const args = { archive: null, out: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out' || a === '-o') { args.out = argv[++i] || null }
    else if (a === '--help' || a === '-h') { args.help = true }
    else if (!args.archive) { args.archive = a }
    else { throw new Error(`unexpected argument: ${a}`) }
  }
  return args
}

function usage() {
  return [
    'WorkCoPilot WCPX v1 opener',
    '',
    'Usage:',
    '  node scripts/wcpx-open.mjs <archive.wcpx> [--out <file.json>]',
    '',
    'Options:',
    '  --out, -o <file>   Write the decrypted inner JSON to <file> (pretty-printed).',
    '                     Without --out, the JSON is printed to stdout.',
    '  --help, -h         Show this help.',
    '',
    'Password:',
    '  Set WCPX_PASSWORD in the environment, or you will be prompted (hidden input).',
  ].join('\n')
}

async function main() {
  let args
  try { args = parseArgs(process.argv.slice(2)) } catch (e) { process.stderr.write(`Error: ${e.message}\n\n${usage()}\n`); process.exit(2) }
  if (args.help || !args.archive) { process.stdout.write(usage() + '\n'); process.exit(args.help ? 0 : 2) }

  // Read the archive.
  let buffer
  try { buffer = fs.readFileSync(args.archive) }
  catch (e) { process.stderr.write(`Error: could not read "${args.archive}": ${e.message}\n`); process.exit(1) }

  // Parse + validate the container and header.
  let parts
  try { parts = splitArchive(buffer) }
  catch (e) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1) }
  const { header, headerBytes, tag, body } = parts

  if (header.v !== WCPX_VERSION) {
    process.stderr.write(`Error: unsupported WCPX version ${JSON.stringify(header.v)} (this opener handles v${WCPX_VERSION}).\n`)
    process.exit(1)
  }
  if (header.cipher && header.cipher !== 'AES-256-GCM') {
    process.stderr.write(`Error: unsupported cipher ${JSON.stringify(header.cipher)} (this opener handles AES-256-GCM).\n`)
    process.exit(1)
  }

  // Header attestation: recompute the content hash (tamper detection, no password
  // needed) and report the platform-origin seal honestly.
  const att = inspectHeaderAttestation(header)
  process.stdout.write(`Archive:      ${args.archive}\n`)
  process.stdout.write(`WCPX version: ${header.v}\n`)
  process.stdout.write(`Company id:   ${header.companyId != null ? header.companyId : '(not stated)'}\n`)
  process.stdout.write(`Created (UTC):${header.createdAt ? ' ' + header.createdAt : ' (not stated)'}\n`)
  if (att.hashOk) {
    process.stdout.write('Header check: OK - the header content matches its stamped hash (not altered).\n')
  } else {
    // A bad header hash means the header was altered. The body decrypt below also
    // uses the header as AAD and will fail, but surface the reason clearly now.
    process.stderr.write(`Error: ${att.reason}. The archive has been altered; not opening it.\n`)
    process.exit(1)
  }
  if (att.hasSig) {
    process.stdout.write(
      `Attestation:  present (${att.alg || 'HMAC-SHA256'}, key ${att.keyId || '?'}` +
      (att.issuedAt ? `, issued ${att.issuedAt}` : '') + ').\n' +
      '              This HMAC attests the PLATFORM produced the archive. It is signed\n' +
      '              with a platform-held key, so it is NOT customer-verifiable here and\n' +
      '              this tool does not claim to verify its origin.\n')
  } else {
    process.stdout.write('Attestation:  none present in the header.\n')
  }
  if (Array.isArray(header.notes) && header.notes.length) {
    process.stdout.write('Notes from the export:\n')
    for (const n of header.notes) process.stdout.write(`  - ${n}\n`)
  }
  const brainMode = header.brain && header.brain.mode ? header.brain.mode : 'none'
  process.stdout.write(`Brain:        mode "${brainMode}"${header.brain && header.brain.present ? ' (included)' : ''}\n`)

  // Password: env first, else hidden prompt.
  let password = process.env.WCPX_PASSWORD
  if (password == null || password === '') {
    try { password = await promptPasswordHidden('Export password') }
    catch (e) { process.stderr.write(`\nError: ${e.message}\n`); process.exit(1) }
  }
  if (!password) { process.stderr.write('Error: a password is required to open the archive.\n'); process.exit(1) }

  // Derive the body key and GCM-decrypt the body with the header bytes as AAD.
  const kdf = header.kdf || KDF_DEFAULTS
  const archiveSalt = Buffer.from(String(kdf.archiveSalt || ''), 'base64')
  const iv = Buffer.from(String(header.iv || ''), 'base64')
  if (iv.length !== IV_BYTES) { process.stderr.write(`Error: the header IV is not ${IV_BYTES} bytes; the archive is malformed.\n`); process.exit(1) }

  let plain
  const key = deriveKey(password, archiveSalt, kdf)
  try {
    plain = gcmDecrypt(key, iv, tag, body, headerBytes)
  } catch {
    // GCM authentication failed. This is the wrong-password / tampered path.
    process.stderr.write('Error: wrong password or the file is corrupted. The archive was NOT opened.\n')
    process.exit(1)
  } finally { try { key.fill(0) } catch { /* best-effort */ } }

  let payload
  try { payload = JSON.parse(plain.toString('utf8')) }
  catch { process.stderr.write('Error: the archive opened but its payload is not valid JSON (the file may be corrupted).\n'); process.exit(1) }

  // Confirm the brain, if any, is really present (optional, non-fatal).
  if (brainMode === 'envelope') {
    const ok = tryUnwrapBrainDek(header, password)
    process.stdout.write(ok
      ? 'Brain:        envelope unwrapped - the Company Brain is present and recoverable with this password.\n'
      : 'Brain:        envelope present but the DEK did not unwrap with this password (the brain may need the same password).\n')
  }

  // Output.
  const pretty = JSON.stringify(payload, null, 2)
  if (args.out) {
    try { fs.writeFileSync(args.out, pretty + '\n', { encoding: 'utf8' }) }
    catch (e) { process.stderr.write(`Error: could not write "${args.out}": ${e.message}\n`); process.exit(1) }
    process.stdout.write(`\nDecrypted payload written to: ${args.out}\n`)
  } else {
    process.stdout.write('\n--- decrypted inner JSON ---\n')
    process.stdout.write(pretty + '\n')
  }
  process.exit(0)
}

main().catch((e) => { process.stderr.write(`Error: ${e && e.message ? e.message : String(e)}\n`); process.exit(1) })
