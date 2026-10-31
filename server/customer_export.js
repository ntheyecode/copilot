// server/customer_export.js - password-encrypted company data export (WCPX v1).
//
// WHAT THIS IS (honest claims):
//   A company admin sets an export password. This module builds a single encrypted
//   archive ("WCPX v1") the customer can open ONLY with that password. The body is
//   AES-256-GCM with a key DERIVED from the password via scrypt (server/key_derive.js
//   KDF - the SAME stretching used for the Company Brain customer-held key, so the two
//   can never diverge, SUPREME RULE II). Never "512-bit": it is AES-256-GCM, 256-bit
//   key, 128-bit tag, 96-bit IV, scrypt-stretched.
//
//   The archive HEADER is additionally attested by server/report_sign.js (HMAC-SHA256
//   with the platform report-sign key + a key id). That attests the PLATFORM produced
//   this archive at this time; it does NOT let the platform open the body. Opening the
//   body still requires the customer password, which is never stored (only a scrypt
//   verifier is - see store.setCompanyExportPassword).
//
//   The GCM auth tag is computed with the canonical header bytes as Additional
//   Authenticated Data (AAD), so the header and body are cryptographically bound: a
//   tampered header fails the body decrypt, and a tampered body fails the tag.
//
// WCPX v1 byte layout:
//   magic "WCPX1\n" (6) | headerLen uint32 BE (4) | header JSON (headerLen bytes) |
//   authTag (16) | body = AES-256-GCM ciphertext of the inner JSON payload.
//   header = {
//     v, companyId, createdAt,
//     kdf: { alg, N, r, p, dkLen, archiveSalt(b64) },
//     cipher: "AES-256-GCM", iv(b64, 12),
//     brain: { present, mode:"envelope"|"none", dekWrap?:{ salt(b64), wrapped(b64) } },
//     notes: [..],
//     hmac: { alg, keyId, issuedAt, hash, sig }   // over the canonical header minus hmac
//   }
//   inner payload JSON = { meta, profile, sensitivity, skills, learnings, brain? }
//
// BRAIN envelope (no plaintext re-materialization): the per-tenant Company Brain stays
//   sealed under its own Data Encryption Key (DEK). We copy the already-sealed blobs
//   (index/vectors/texts) into the payload and re-wrap ONLY the DEK under a key derived
//   from the export password (scrypt(password, dekWrapSalt)). Opening the brain later
//   needs the password -> DEK -> the brain_crypto seal format. If the tenant is on
//   customer-held custody and is LOCKED, the brain is SKIPPED (mode:"none") with a
//   stated note - the export never silently drops it and never fails the whole export.
//
// Single JSON payload (no tar dependency, SCA rule - node crypto + existing only). The
// whole inner payload is held in memory before encryption; for a very large brain this
// is a memory trade-off we accept to avoid a new archive dependency. Scrubbed-brain
// blobs are typically small (dim-384 vectors + de-identified chunk text).
//
// US spelling. No silent fallback. No new npm dependency.

import crypto from 'node:crypto'
import { deriveKey, randomSalt, KDF } from './key_derive.js'
import { attestReport, verifyReport } from './report_sign.js'
import * as store from './store.js'
import { ensureTenantDek, isUnlocked, open as brainOpen } from './brain_crypto.js'
import { readSealedBlobsForExport, readEmbeddingForExport } from './brain_store.js'

export const WCPX_MAGIC = Buffer.from('WCPX1\n', 'utf8')   // 6 bytes
export const WCPX_VERSION = 1
const IV_BYTES = 12
const TAG_BYTES = 16

// ---- small GCM helpers (AES-256-GCM, node crypto) --------------------------
function gcmEncrypt(key, plaintext, aad = null) {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  if (aad) cipher.setAAD(aad)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return { iv, tag: cipher.getAuthTag(), ct }
}
function gcmDecrypt(key, iv, tag, ct, aad = null) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  if (aad) decipher.setAAD(aad)
  decipher.setAuthTag(tag)
  // THROWS on a wrong key / tampered input - never a silent empty buffer.
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

// Deterministic JSON (recursively sorted keys) so the header HMAC is computed over a
// stable byte string on both build and verify, regardless of key insertion order.
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}'
}
function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex') }

// ---- brain envelope resolution --------------------------------------------
// Returns one of:
//   { present:false, mode:'none', note }                      (no brain / locked)
//   { present:true,  mode:'envelope', dek:Buffer, blobs, embedding, note? }  (ready to envelope)
//   embedding = { dim, model:{id,rev,dim,quant} }, the brain's CURRENT geometry
//   (follows a re-embed), or null with a note when it could not be read.
export function resolveBrainForExport(companyId) {
  const blobs = readSealedBlobsForExport(companyId)
  if (!blobs || !blobs.present) {
    return { present: false, mode: 'none', note: 'No Company Brain data to include in this export.' }
  }
  const custody = store.getCompanyBrainCustody(companyId)
  let dek = null
  if (custody === 'customer') {
    // Customer-held key: the DEK is wrapped under the customer secret, which the
    // platform cannot open. It must already be UNLOCKED (resident) to envelope it.
    if (!isUnlocked(companyId)) {
      return {
        present: false, mode: 'none',
        note: 'The Company Brain is encrypted under your own key and is currently locked, so it was NOT included. Unlock the brain and export again to include it.',
      }
    }
    const cr = store.getCompanyBrainCrypto(companyId)
    dek = ensureTenantDek(companyId, cr && cr.wrappedDek).dek
  } else {
    // Platform custody: unwrap the DEK under the platform KEK.
    const wrapped = store.getCompanyBrainDek(companyId)
    if (!wrapped) {
      return { present: false, mode: 'none', note: 'No Company Brain encryption key is set, so there was nothing to include.' }
    }
    dek = ensureTenantDek(companyId, wrapped).dek
  }
  if (!Buffer.isBuffer(dek) || dek.length !== 32) {
    return { present: false, mode: 'none', note: 'The Company Brain key could not be resolved, so it was NOT included.' }
  }
  // Label the brain with the model + dim it is ACTUALLY on (brain_store owns that
  // answer). Unreadable = no label plus a stated note, never a default guess.
  try {
    return { present: true, mode: 'envelope', dek, blobs, embedding: readEmbeddingForExport(companyId) }
  } catch {
    return { present: true, mode: 'envelope', dek, blobs, embedding: null, note: 'The Company Brain embedding model could not be read, so the archive does not label it.' }
  }
}

// Re-wrap the DEK under scrypt(password, dekWrapSalt) and return the header dekWrap
// descriptor. The DEK bytes themselves never leave this function in the clear.
function wrapDekForExport(dek, password, kdfParams) {
  const salt = randomSalt(16)
  const key = deriveKey(password, salt, kdfParams)
  try {
    const { iv, tag, ct } = gcmEncrypt(key, dek)
    const wrapped = Buffer.concat([iv, tag, ct])
    return { salt: salt.toString('base64'), wrapped: wrapped.toString('base64') }
  } finally {
    try { key.fill(0) } catch { /* best-effort */ }
  }
}

// Recover the brain DEK from a parsed header + the password (for export tooling / tests).
export function unwrapBrainDek(header, password) {
  const dw = header && header.brain && header.brain.dekWrap
  if (!dw) throw new Error('[customer_export] this archive has no brain envelope to unwrap')
  const salt = Buffer.from(String(dw.salt || ''), 'base64')
  const raw = Buffer.from(String(dw.wrapped || ''), 'base64')
  if (raw.length < IV_BYTES + TAG_BYTES) throw new Error('[customer_export] brain dekWrap is truncated')
  const key = deriveKey(password, salt, (header.kdf || KDF))
  try {
    return gcmDecrypt(key, raw.subarray(0, IV_BYTES), raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES), raw.subarray(IV_BYTES + TAG_BYTES))
  } finally {
    try { key.fill(0) } catch { /* best-effort */ }
  }
}

// Open one sealed brain blob with the recovered DEK (brain_crypto seal format).
export function openBrainBlob(sealedBuf, dek) { return brainOpen(sealedBuf, dek) }

// ---- build the archive -----------------------------------------------------
// Gathers the company's exportable data from the store and returns the WCPX Buffer.
// Assumes the caller has already verified the export password.
export function buildCompanyArchive({ companyId, password } = {}) {
  if (!companyId) throw httpErr(400, 'A company id is required.')
  if (!password) throw httpErr(400, 'A password is required to build the export.')
  const company = store.getCompany(companyId)
  if (!company) throw httpErr(404, 'Company not found.')

  const kdfParams = { alg: KDF.alg, N: KDF.N, r: KDF.r, p: KDF.p, dkLen: KDF.dkLen }
  const notes = []

  // 1) Brain envelope (header dekWrap + payload sealed blobs), or a stated skip.
  const brainRes = resolveBrainForExport(companyId)
  let headerBrain = { present: false, mode: 'none' }
  let payloadBrain = null
  if (brainRes.note) notes.push(brainRes.note)
  if (brainRes.present) {
    const dekWrap = wrapDekForExport(brainRes.dek, password, kdfParams)
    headerBrain = { present: true, mode: 'envelope', dekWrap, embedding: brainRes.embedding }
    payloadBrain = {
      mode: 'envelope',
      seal: 'brain_crypto-v1 (ver(1)=0x01|iv(12)|tag(16)|ciphertext) under the DEK in header.brain.dekWrap',
      dim: brainRes.embedding ? brainRes.embedding.dim : null,
      model: brainRes.embedding ? brainRes.embedding.model : null,
      files: {
        index: brainRes.blobs.index ? brainRes.blobs.index.toString('base64') : null,
        vectors: brainRes.blobs.vectors ? brainRes.blobs.vectors.toString('base64') : null,
        texts: brainRes.blobs.texts ? brainRes.blobs.texts.toString('base64') : null,
      },
    }
  }

  // 2) Inner payload (held in memory; a single JSON, no tar dependency).
  const inner = {
    meta: {
      product: 'WorkCoPilot',
      format: 'WCPX',
      formatVersion: WCPX_VERSION,
      companyId,
      companyName: company.name || '',
      createdAt: new Date().toISOString(),
    },
    profile: company.profile || null,
    sensitivity: company.sensitivity || null,
    skills: store.exportCompanySkills(companyId),
    learnings: store.exportCompanyLearnings(companyId),
    ...(payloadBrain ? { brain: payloadBrain } : {}),
  }
  const innerBuf = Buffer.from(JSON.stringify(inner), 'utf8')

  // 3) Archive body key + IV (the IV lives in the header; the body GCM uses it).
  const archiveSalt = randomSalt(16)
  const bodyKey = deriveKey(password, archiveSalt, kdfParams)
  const bodyIv = crypto.randomBytes(IV_BYTES)

  // 4) Header (without hmac), then attest it, then serialize the FINAL header bytes.
  const header = {
    v: WCPX_VERSION,
    companyId,
    createdAt: inner.meta.createdAt,
    kdf: { ...kdfParams, archiveSalt: archiveSalt.toString('base64') },
    cipher: 'AES-256-GCM',
    iv: bodyIv.toString('base64'),
    brain: headerBrain,
    notes,
  }
  const canonical = stableStringify(header)                 // header minus hmac (hmac not set yet)
  const att = attestReport(canonical, { kind: 'wcpx', reportId: String(companyId) })
  header.hmac = { alg: att.alg, keyId: att.keyId, issuedAt: att.issuedAt, hash: att.hash, sig: att.signature }
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8')

  // 5) Encrypt the body with the header IV and the full header bytes as AAD (binds
  //    header+body: a tampered header fails the tag; a tampered body fails the tag).
  let tag, ct
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', bodyKey, bodyIv)
    cipher.setAAD(headerBytes)
    ct = Buffer.concat([cipher.update(innerBuf), cipher.final()])
    tag = cipher.getAuthTag()
  } finally {
    try { bodyKey.fill(0) } catch { /* best-effort */ }
  }

  // 6) Assemble: magic | headerLen | header | tag | body.
  const headerLen = Buffer.alloc(4)
  headerLen.writeUInt32BE(headerBytes.length, 0)
  const buffer = Buffer.concat([WCPX_MAGIC, headerLen, headerBytes, tag, ct])

  const date = inner.meta.createdAt.slice(0, 10)
  return {
    buffer,
    filename: `workcopilot-export-${companyId}-${date}.wcpx`,
    brainMode: headerBrain.mode,
    brainIncluded: headerBrain.present,
    notes,
  }
}

// ---- read side (verification + decrypt; used by tooling + tests) -----------
function splitArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < WCPX_MAGIC.length + 4 + TAG_BYTES) {
    throw new Error('[customer_export] not a WCPX archive (too short)')
  }
  if (!buffer.subarray(0, WCPX_MAGIC.length).equals(WCPX_MAGIC)) {
    throw new Error('[customer_export] not a WCPX archive (bad magic)')
  }
  const headerLen = buffer.readUInt32BE(WCPX_MAGIC.length)
  const headerStart = WCPX_MAGIC.length + 4
  const headerEnd = headerStart + headerLen
  if (headerEnd + TAG_BYTES > buffer.length) throw new Error('[customer_export] WCPX archive is truncated')
  const headerBytes = buffer.subarray(headerStart, headerEnd)
  const tag = buffer.subarray(headerEnd, headerEnd + TAG_BYTES)
  const body = buffer.subarray(headerEnd + TAG_BYTES)
  let header
  try { header = JSON.parse(headerBytes.toString('utf8')) } catch { throw new Error('[customer_export] WCPX header is not valid JSON') }
  return { header, headerBytes, tag, body }
}

// Verify the header attestation (platform origin) + detect header tampering.
// Returns { valid, reason?, issuer?, issuedAt?, keyId? }. Does NOT need the password.
export function verifyArchiveHeader(buffer) {
  let parts
  try { parts = splitArchive(buffer) } catch (e) { return { valid: false, reason: e.message } }
  const { header } = parts
  const hmac = header && header.hmac
  if (!hmac || !hmac.hash || !hmac.sig || !hmac.issuedAt) return { valid: false, reason: 'missing header attestation' }
  const { hmac: _omit, ...headerNoHmac } = header
  const recomputed = sha256Hex(stableStringify(headerNoHmac))
  if (recomputed !== hmac.hash) return { valid: false, reason: 'header hash mismatch (tampered)' }
  const r = verifyReport({ kind: 'wcpx', reportId: String(header.companyId || ''), hash: hmac.hash, issuedAt: hmac.issuedAt, signature: hmac.sig })
  if (!r.valid) return { valid: false, reason: 'header signature does not verify' }
  return { valid: true, issuer: r.issuer, issuedAt: r.issuedAt, keyId: r.keyId }
}

// Decrypt + parse. Verifies the header attestation first (throws on tamper), then
// decrypts the body with a key derived from the password (throws on a wrong password).
export function parseArchive(buffer, password) {
  const v = verifyArchiveHeader(buffer)
  if (!v.valid) throw new Error(`[customer_export] header verification failed: ${v.reason}`)
  const { header, headerBytes, tag, body } = splitArchive(buffer)
  const kdf = header.kdf || KDF
  const archiveSalt = Buffer.from(String(kdf.archiveSalt || ''), 'base64')
  const iv = Buffer.from(String(header.iv || ''), 'base64')
  const key = deriveKey(password, archiveSalt, kdf)
  let plain
  try {
    plain = gcmDecrypt(key, iv, tag, body, headerBytes)
  } catch {
    throw new Error('[customer_export] could not open the archive (wrong password or tampered data)')
  } finally {
    try { key.fill(0) } catch { /* best-effort */ }
  }
  let payload
  try { payload = JSON.parse(plain.toString('utf8')) } catch { throw new Error('[customer_export] archive payload is not valid JSON') }
  return { header, payload }
}

function httpErr(status, message) { const e = new Error(message); e.status = status; return e }
