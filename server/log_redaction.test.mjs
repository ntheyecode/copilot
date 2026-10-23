// Log / outbound redaction (DAT-06). The DLP scrubber removes seeded secrets,
// emails and card numbers from text BEFORE it is sent to the AI or written to
// the audit log, and the human-readable audit download never exposes the model
// name. SYNTHETIC values only (fake sk-test keys, example.com, 4242 test card).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scrubSensitive, tokenizeSensitive, rehydrate } from './work-scrub.js'
import { cleanAlways } from '../src/scrub.js'

process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-logred-'))
process.env.PORT = '0'
const store = await import(new URL('./store.js', import.meta.url).href)

const API_KEY = 'sk-test-ABCDEF0123456789abcdef0123456789'
const STRIPE_KEY = 'sk_test_51Abcdefghij1234567890XYZ'
const AWS_KEY = 'AKIAABCDEFGHIJKLMNOP'
const GH = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'
const EMAIL = 'jane.doe@example.com'
const CARD = '4242 4242 4242 4242'
const SSN = '123-45-6789'
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.c2lnbmF0dXJlMDEyMzQ'
const PEM = '-----BEGIN RSA PRIVATE KEY-----\nFAKE_TEST_KEY_NOT_A_REAL_SECRET_000000000000000000\n-----END RSA PRIVATE KEY-----'

const SEEDED = [API_KEY, STRIPE_KEY, AWS_KEY, GH, EMAIL, CARD, SSN, JWT, 'MIIBOgIBAAJBAKj34Gk']

test('seeded secrets, emails and card numbers are removed from outbound text', () => {
  const text = [
    `Use key ${API_KEY} and ${STRIPE_KEY} for the call.`,
    `AWS ${AWS_KEY}, token ${GH}.`,
    `Mail ${EMAIL}, card ${CARD}, ssn ${SSN}.`,
    `Auth: ${JWT}`,
    PEM,
  ].join('\n')
  for (const out of [scrubSensitive(text).clean, cleanAlways(text)]) {
    for (const secret of SEEDED) assert.ok(!out.includes(secret), `leaked: ${secret.slice(0, 12)}...`)
    assert.match(out, /\[SECRET\]/)
    assert.match(out, /\[EMAIL\]/)
    assert.match(out, /\[CARD\]/)
    assert.match(out, /\[SSN\]/)
    assert.match(out, /\[PRIVATE_KEY\]/)
  }
})

test('labelled passwords and tokens lose the value but keep the label', () => {
  const r = scrubSensitive('password: Tr0ub4dor3xyz and api_key=abcd1234efgh5678 and token=zzzzzzzz9999').clean
  assert.ok(!/Tr0ub4dor3xyz|abcd1234efgh5678|zzzzzzzz9999/.test(r))
  assert.match(r, /password: \[REDACTED\]/)
})

test('a number that merely looks like a card (fails Luhn) is not over-redacted', () => {
  assert.equal(scrubSensitive('order 4242 4242 4242 4241').counts.card || 0, 0)
  assert.equal(scrubSensitive(`pay with ${CARD}`).counts.card, 1)
})

test('tokenize mode keeps secrets off the wire: the outbound text has none of the values', () => {
  const map = {}
  const t = tokenizeSensitive(`email ${EMAIL} key ${API_KEY} card ${CARD}`, { map })
  for (const secret of [EMAIL, API_KEY, CARD]) assert.ok(!t.clean.includes(secret), 'value must not be in the outbound text')
  assert.equal(rehydrate(t.clean, map), `email ${EMAIL} key ${API_KEY} card ${CARD}`, 'device-side rehydrate restores it')
})

test('the downloadable audit log keeps the transmitted (already-redacted) text and omits the model name', () => {
  const sid = 'wsLOGTEST1'
  const sent = scrubSensitive(`deploy with ${API_KEY} and mail ${EMAIL}`).clean
  store.appendWorkAudit(sid, { call: 'plan', model: 'internal-model-name-xyz', scrub: true, redacted: 2, sent })
  const raw = store.readWorkAuditRaw(sid)
  assert.ok(raw.includes('internal-model-name-xyz'), 'sanity: the raw superadmin entry keeps the model')
  assert.ok(!raw.includes(API_KEY) && !raw.includes(EMAIL), 'no seeded secret ever reached the log file')
  const readable = store.formatWorkAuditLog(sid, { goal: 'test goal' })
  assert.ok(!readable.includes('internal-model-name-xyz'), 'model name is never in the user-facing download')
  assert.ok(!readable.includes(API_KEY) && !readable.includes(EMAIL))
  assert.match(readable, /\[SECRET\]/)
  store.deleteWorkAudit(sid)
})

// DAT-06: incident messages (superadmin-only monitoring) are redacted at rest,
// so an upstream provider error that echoes a key or email is never stored raw.
test('recordWorkIncident message is redacted of secrets + PII (DAT-06)', () => {
  const dirty = 'provider 401: key sk-test-ABCD1234EFGH5678 for user jane@example.com failed; -----BEGIN PRIVATE KEY----- x -----END PRIVATE KEY----- password=hunter2'
  const clean = store.redactIncidentText(dirty)
  assert.ok(!/sk-test-ABCD1234EFGH5678/.test(clean), 'api key removed')
  assert.ok(!/jane@example\.com/.test(clean), 'email removed')
  assert.ok(!/hunter2/.test(clean), 'labelled password value removed')
  assert.ok(!/BEGIN PRIVATE KEY/.test(clean), 'PEM block removed')
  assert.ok(/401/.test(clean), 'non-sensitive context kept')
})
