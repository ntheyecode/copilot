// Mid-guiding clarification: the user answers a question the guide asked, and the
// answer is folded into the session scope so the NEXT plan sees it like a scope-
// wizard answer. This is the store-level contract (appendWorkScopeAnswer) that the
// POST .../clarify endpoint drives. Caps + trimming match createWorkSession.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-clarify-'))
process.env.PORT = '0'
const store = await import(storePath)

const mk = () => store.createWorkUser({ username: 'cl_' + Math.random().toString(36).slice(2, 8), password: 'Passw0rd!x' })

test('a clarification answer is folded into the session scope', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'Taxes', goal: 'File my state taxes' })
  store.appendWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?', 'US, South Carolina')
  const after = store.getWorkSession(u.id, s.id)
  assert.equal(after.scope.length, 1)
  assert.deepEqual(after.scope[0], { q: 'Which jurisdiction?', a: 'US, South Carolina' })
})

test('it appends onto existing scope-wizard answers, not replaces them', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g', scope: [{ q: 'Software?', a: 'TurboTax' }] })
  store.appendWorkScopeAnswer(u.id, s.id, 'State?', 'SC')
  const after = store.getWorkSession(u.id, s.id)
  assert.equal(after.scope.length, 2)
  assert.equal(after.scope[0].a, 'TurboTax')
  assert.equal(after.scope[1].a, 'SC')
})

test('empty question or answer is ignored (no blank scope entry)', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g' })
  store.appendWorkScopeAnswer(u.id, s.id, 'Q?', '')
  store.appendWorkScopeAnswer(u.id, s.id, '', 'A')
  assert.equal((store.getWorkSession(u.id, s.id).scope || []).length, 0)
})

test('scope is capped at 12 answers, keeping the most recent', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g' })
  for (let i = 1; i <= 15; i++) store.appendWorkScopeAnswer(u.id, s.id, `Q${i}`, `A${i}`)
  const after = store.getWorkSession(u.id, s.id)
  assert.equal(after.scope.length, 12)
  assert.equal(after.scope[0].a, 'A4')     // oldest kept
  assert.equal(after.scope[11].a, 'A15')   // newest kept
})

test('long question / answer are trimmed to their caps', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g' })
  store.appendWorkScopeAnswer(u.id, s.id, 'Q'.repeat(400), 'A'.repeat(900))
  const e = store.getWorkSession(u.id, s.id).scope[0]
  assert.equal(e.q.length, 240)
  assert.equal(e.a.length, 600)
})

test('unknown session is a no-op (returns null), never throws', () => {
  const u = mk()
  assert.equal(store.appendWorkScopeAnswer(u.id, 'ws_nope', 'Q?', 'A'), null)
})

test('back/undo removes the last answer to that question, so it can be re-asked', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g' })
  store.appendWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?', 'India')   // a mis-tap
  const removed = store.removeLastWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?')
  assert.equal(removed.a, 'India')
  assert.equal((store.getWorkSession(u.id, s.id).scope || []).length, 0)
})

test('undo only removes the matching question, never an earlier wizard answer', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g', scope: [{ q: 'Software?', a: 'TurboTax' }] })
  store.appendWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?', 'India')
  store.removeLastWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?')
  const scope = store.getWorkSession(u.id, s.id).scope
  assert.equal(scope.length, 1)
  assert.equal(scope[0].a, 'TurboTax')   // the unrelated wizard answer is untouched
})

test('undo with no matching question returns null (nothing to revert)', () => {
  const u = mk()
  const s = store.createWorkSession(u.id, { title: 'T', goal: 'g', scope: [{ q: 'Software?', a: 'TurboTax' }] })
  assert.equal(store.removeLastWorkScopeAnswer(u.id, s.id, 'Which jurisdiction?'), null)
  assert.equal(store.getWorkSession(u.id, s.id).scope.length, 1)   // untouched
})
