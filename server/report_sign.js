// ---------------------------------------------------------------------------
// WorkCoPilot - report authenticity (hash + signature)
//
// SINGLE SOURCE OF TRUTH (SUPREME RULE II). EVERY report WorkCoPilot emits -
// compliance report, session report, review deliverables, audit log, CSV
// exports - is stamped by this module with:
//   * a SHA-256 hash of the report's canonical content (what it asserts),
//   * an HMAC-SHA256 authenticity signature over that hash + timestamp + issuer,
//   * the issue date and timestamp,
//   * the issuer: AdmireVeda.
// A third party verifies a report by POSTing the stamp to
// /api/work/reports/verify, which re-computes the signature with the same
// server-held key. Tampering with the content changes the hash; tampering with
// the stamp fails the signature.
//
// HONESTY: this attests that WorkCoPilot issued THIS content at THIS time. It is
// an integrity + origin seal, not a legal e-signature or a compliance
// certification.
//
// Key: WORK_REPORT_SIGN_KEY (env, >=32 chars) else a random 32-byte key
// persisted once to <DATA_DIR>/.report-sign.key (0600). BACK IT UP (or set the
// env) - lose it and previously issued reports can no longer be verified.
// ---------------------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolveDataDir } from './data_dir.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolveDataDir()   // data_dir.js: the one resolver
const KEY_FILE = path.join(DATA_DIR, '.report-sign.key')

export const REPORT_ISSUER = 'AdmireVeda'
// Where to reach the issuers about a report (compliance questions, verification,
// disputes). Shown on every report.
export const REPORT_CONTACTS = ['compliance@admireveda.com']

function loadKey() {
  const env = process.env.WORK_REPORT_SIGN_KEY
  if (env && env.length >= 32) return Buffer.from(env, 'utf8')
  try { if (fs.existsSync(KEY_FILE)) { const b = fs.readFileSync(KEY_FILE); if (b && b.length >= 32) return b } } catch { /* fall through */ }
  const key = crypto.randomBytes(32)
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(KEY_FILE, key, { mode: 0o600 }) } catch { /* in-memory fallback */ }
  return key
}
const KEY = loadKey()
// A short, non-secret key fingerprint, so a report names WHICH key signed it
// (supports key rotation: an old report still says which key to verify with).
const KEY_ID = crypto.createHash('sha256').update(KEY).digest('hex').slice(0, 10)

function canonical(payload) {
  if (typeof payload === 'string') return payload
  try { return JSON.stringify(payload) } catch { return String(payload) }
}
function base(kind, reportId, hash, issuedAt) {
  return `WorkCoPilot|${kind}|${reportId}|${hash}|${issuedAt}|${REPORT_ISSUER}`
}

// Stamp a report. `payload` is the canonical content (string or an object that
// is JSON-stringified). Returns the attestation block to render + persist.
export function attestReport(payload, { reportId = '', kind = 'report' } = {}) {
  const hash = crypto.createHash('sha256').update(canonical(payload)).digest('hex')
  const issuedAt = new Date().toISOString()
  const signature = crypto.createHmac('sha256', KEY).update(base(kind, reportId, hash, issuedAt)).digest('hex')
  return { issuer: REPORT_ISSUER, kind, reportId: String(reportId || ''), hash, issuedAt, signature, keyId: KEY_ID, alg: 'HMAC-SHA256' }
}

// Verify a stamp. Returns { valid, issuer, issuedAt }.
export function verifyReport({ kind = 'report', reportId = '', hash, issuedAt, signature } = {}) {
  if (!hash || !issuedAt || !signature) return { valid: false, reason: 'missing fields' }
  const expect = crypto.createHmac('sha256', KEY).update(base(kind, String(reportId || ''), String(hash), String(issuedAt))).digest('hex')
  const a = Buffer.from(expect), b = Buffer.from(String(signature))
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b)
  return { valid, issuer: REPORT_ISSUER, issuedAt, keyId: KEY_ID }
}

// A compact human line for a text report footer (audit log, CSV).
export function attestationText(att) {
  return [
    '', '-'.repeat(74),
    `Authenticity: issued by ${att.issuer}`,
    `Issued (UTC): ${att.issuedAt}`,
    `Content SHA-256: ${att.hash}`,
    `Signature (${att.alg}, key ${att.keyId}): ${att.signature}`,
    'Verify this report at https://admireveda.com/api/work/reports/verify',
    `Contact: ${REPORT_CONTACTS.join('  |  ')}`,
  ].join('\n')
}
