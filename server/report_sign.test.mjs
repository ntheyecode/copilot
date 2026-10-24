// Report authenticity: attestReport produces a hash + signature + timestamp +
// issuer; verifyReport confirms an untouched stamp and rejects a tampered one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-sign-'))
process.env.WORK_REPORT_SIGN_KEY = 'a-very-long-test-signing-key-32chars++'
const mod = await import('file://' + path.join(here, 'report_sign.js').replace(/\\/g, '/'))

test('a stamp carries hash, signature, timestamp, issuer and contacts', () => {
  const att = mod.attestReport({ a: 1, b: 'x' }, { kind: 'compliance', reportId: 'ws123' })
  assert.match(att.hash, /^[0-9a-f]{64}$/)
  assert.match(att.signature, /^[0-9a-f]{64}$/)
  assert.ok(att.issuedAt && !Number.isNaN(Date.parse(att.issuedAt)))
  assert.equal(att.issuer, mod.REPORT_ISSUER)
  assert.equal(att.alg, 'HMAC-SHA256')
  assert.ok(mod.REPORT_CONTACTS.includes('compliance@coesecurity.com'))
  assert.ok(mod.REPORT_CONTACTS.includes('compliance@admireveda.com'))
})

test('verifyReport accepts an untouched stamp', () => {
  const att = mod.attestReport('the exact report content', { kind: 'session', reportId: 'ws9' })
  const v = mod.verifyReport({ kind: 'session', reportId: 'ws9', hash: att.hash, issuedAt: att.issuedAt, signature: att.signature })
  assert.equal(v.valid, true)
})

test('verifyReport rejects a tampered hash, id, or signature', () => {
  const att = mod.attestReport('content', { kind: 'session', reportId: 'ws9' })
  assert.equal(mod.verifyReport({ kind: 'session', reportId: 'ws9', hash: att.hash.replace(/.$/, '0'), issuedAt: att.issuedAt, signature: att.signature }).valid, false)
  assert.equal(mod.verifyReport({ kind: 'session', reportId: 'OTHER', hash: att.hash, issuedAt: att.issuedAt, signature: att.signature }).valid, false)
  assert.equal(mod.verifyReport({ kind: 'session', reportId: 'ws9', hash: att.hash, issuedAt: att.issuedAt, signature: 'deadbeef' }).valid, false)
})

test('different content yields a different hash', () => {
  assert.notEqual(mod.attestReport('A', {}).hash, mod.attestReport('B', {}).hash)
})

test('attestationText footer includes the issuer, hash and contacts', () => {
  const att = mod.attestReport('x', { kind: 'audit', reportId: 'ws1' })
  const txt = mod.attestationText(att)
  assert.ok(txt.includes(att.hash))
  assert.ok(txt.includes('AdmireVeda'))
  assert.ok(txt.includes('compliance@coesecurity.com'))
})
