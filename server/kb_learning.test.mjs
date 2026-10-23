// Cross-session learning / KB: scope (company private vs platform for solo),
// redaction, dedupe, and relevance retrieval.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-kb-'))
process.env.PORT = '0'
const store = await import(storePath)

test('solo users contribute to and read the PLATFORM KB (our property)', () => {
  const u = store.createWorkUser({ username: 'solo1', password: 'Passw0rd!x' })
  store.addLearning(u.id, { app: 'Make.com', fact: 'Scenarios now live in the left sidebar, not the top bar', kind: 'fresh' })
  const got = store.getLearningsFor(u.id, { goal: 'build a scenario in Make.com', app: 'Make.com' })
  assert.equal(store.getLearningsScope(u.id).kind, 'global')
  assert.ok(got.some((l) => /left sidebar/.test(l.fact)), 'solo user reads the platform KB learning')
  // A second solo user benefits from the first (platform-wide dependability).
  const u2 = store.createWorkUser({ username: 'solo2', password: 'Passw0rd!x' })
  const got2 = store.getLearningsFor(u2.id, { goal: 'Make.com scenario', app: 'Make.com' })
  assert.ok(got2.some((l) => /left sidebar/.test(l.fact)), 'another solo user sees the same platform learning')
})

test('company users have a PRIVATE company KB, not shared across companies', () => {
  const coA = store.createCompany({ name: 'KbCoA', plan: 'premium' })
  const coB = store.createCompany({ name: 'KbCoB', plan: 'premium' })
  const a = store.createManagedUser({ username: 'kbA', password: 'Passw0rd!x', companyId: coA.id, tier: 'basic' })
  const b = store.createManagedUser({ username: 'kbB', password: 'Passw0rd!x', companyId: coB.id, tier: 'basic' })
  store.addLearning(a.id, { app: 'Internal Portal', fact: 'The approvals queue moved under Admin > Workflow' })
  assert.equal(store.getLearningsScope(a.id).kind, 'company')
  assert.ok(store.getLearningsFor(a.id, { app: 'Internal Portal' }).some((l) => /approvals queue/.test(l.fact)), 'company A sees its own learning')
  assert.equal(store.getLearningsFor(b.id, { app: 'Internal Portal' }).length, 0, 'company B cannot see company A learnings')
})

test('learnings are redacted of secrets/PII and deduped', () => {
  const u = store.createWorkUser({ username: 'solo3', password: 'Passw0rd!x' })
  const rec = store.addLearning(u.id, { app: 'CLI', fact: 'Use the token sk-test-ABCD1234EFGH5678 for jane@example.com to log in' })
  assert.ok(!/sk-test-ABCD1234EFGH5678/.test(rec.fact), 'secret redacted in the stored learning')
  assert.ok(!/jane@example\.com/.test(rec.fact), 'email redacted')
  const again = store.addLearning(u.id, { app: 'CLI', fact: 'Use the token sk-test-ABCD1234EFGH5678 for jane@example.com to log in' })
  assert.equal(again.id, rec.id, 'identical learning is deduped, not duplicated')
  assert.ok(again.hits >= 2, 'dedupe bumps the hit count')
})

test('too-short or empty learnings are ignored', () => {
  const u = store.createWorkUser({ username: 'solo4', password: 'Passw0rd!x' })
  assert.equal(store.addLearning(u.id, { app: 'X', fact: 'ok' }), null)
  assert.equal(store.addLearning(u.id, { app: 'X', fact: '' }), null)
})
