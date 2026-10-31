// Gates the page's pure rules: the file pre-check mirrors the server's list
// and cap, rows group learnings under their source with "Your sessions"
// always present, the result lines read a learn response honestly, and every
// documented API failure maps to its own actionable message key.
import test from 'node:test'
import assert from 'node:assert/strict'
import { checkFile, groupBySource, documentCount, docMeter, resultLines, errorKey, fileErrorKey, kindOf, MAX_BYTES } from './brainModel.js'

test('checkFile accepts pdf, docx, txt and md under 10 MB and refuses the rest', () => {
  assert.deepEqual(checkFile({ name: 'How I work.docx', size: 1200, type: '' }), { ok: true })
  assert.deepEqual(checkFile({ name: 'notes.TXT', size: 5, type: '' }), { ok: true })
  assert.deepEqual(checkFile({ name: 'readme', size: 5, type: 'text/markdown' }), { ok: true })
  assert.deepEqual(checkFile({ name: 'photo.png', size: 5, type: 'image/png' }), { ok: false, reason: 'type' })
  assert.deepEqual(checkFile({ name: 'big.pdf', size: MAX_BYTES + 1, type: 'application/pdf' }), { ok: false, reason: 'size' })
  assert.deepEqual(checkFile({ name: 'empty.md', size: 0, type: '' }), { ok: false, reason: 'empty' })
  assert.deepEqual(checkFile(null), { ok: false, reason: 'empty' })
})

test('groupBySource puts each learning under its source, newest source first, sessions always listed', () => {
  const data = {
    sources: [
      { id: 'ps1', name: 'How I work.docx', kind: 'document', learnedAt: '2026-10-30T10:00:00Z' },
      { id: 'sessions', name: 'Your sessions', kind: 'sessions', learnedAt: '2026-10-31T10:00:00Z' },
    ],
    learnings: [
      { id: 'a', text: 'Amounts are in euros.', kind: 'preference', sources: ['ps1'] },
      { id: 'b', text: 'Pivot by month.', kind: 'procedure', sources: ['ps1', 'sessions'] },
      { id: 'c', text: 'Exporting first worked.', kind: 'procedure', sources: ['sessions'] },
    ],
  }
  const rows = groupBySource(data)
  assert.deepEqual(rows.map((r) => [r.id, r.kind, r.learnings.map((l) => l.id)]), [['ps1', 'document', ['a', 'b']], ['sessions', 'sessions', ['b', 'c']]])
  // No sessions source yet: a placeholder row, so the page can explain it.
  const fresh = groupBySource({ sources: [{ id: 'ps1', name: 'x', kind: 'document' }], learnings: [] })
  assert.equal(fresh.length, 2)
  assert.equal(fresh[1].kind, 'sessions'); assert.equal(fresh[1].placeholder, true); assert.deepEqual(fresh[1].learnings, [])
  assert.deepEqual(groupBySource(null).map((r) => r.kind), ['sessions'])
})

test('the document meter counts documents only, against the plan cap', () => {
  const data = { sources: [{ id: 'a', kind: 'document' }, { id: 'b', kind: 'document' }, { id: 'sessions', kind: 'sessions' }], maxDocuments: 3 }
  assert.equal(documentCount(data), 2)
  assert.deepEqual(docMeter(data), { used: 2, max: 3, reached: false })
  assert.deepEqual(docMeter({ ...data, maxDocuments: 2 }), { used: 2, max: 2, reached: true })
  assert.deepEqual(docMeter({}), { used: 0, max: 0, reached: false })
})

test('resultLines says learned or refreshed, then merged, masked and truncated only when real', () => {
  const plain = resultLines({ source: { id: 'ps1', name: 'How I work.docx', refreshed: false }, added: 7, merged: 0, masked: 0, truncated: false })
  assert.deepEqual(plain, [{ key: 'learned', n: 7, vars: { name: 'How I work.docx', n: 7 } }])
  const full = resultLines({ source: { id: 'ps1', name: 'How I work.docx', refreshed: true }, added: 3, merged: 2, masked: 4, truncated: true })
  assert.deepEqual(full.map((l) => l.key), ['refreshed', 'merged', 'masked', 'truncated'])
  // The headline count is what the document taught, new or already known (= the row's count).
  assert.deepEqual(full[0].vars, { name: 'How I work.docx', n: 5 })
  assert.deepEqual(full[2].vars, { n: 4 })
  assert.deepEqual(resultLines({ source: { name: 'x', refreshed: false }, added: 0, merged: 2 })[0], { key: 'learned', n: 2, vars: { name: 'x', n: 2 } })
  assert.deepEqual(resultLines(null), [])
})

test('every documented API failure maps to its own message key', () => {
  const e = (status, data) => Object.assign(new Error('x'), { status, data })
  assert.deepEqual(errorKey(e(403, { capReached: true, upgrade: true, max: 3 })), { key: 'cap', upgrade: true, max: 3 })
  assert.deepEqual(errorKey(e(403, { code: 'COMPANY_ACCOUNT' })), { key: 'company', upgrade: false })
  assert.equal(errorKey(e(413, {})).key, 'tooLarge')
  assert.equal(errorKey(e(415, {})).key, 'type')
  assert.equal(errorKey(e(400, {})).key, 'badFile')
  assert.equal(errorKey(e(422, {})).key, 'unreadable')
  assert.equal(errorKey(e(422, { code: 'NOTHING_LEARNED' })).key, 'nothingLearned')
  assert.equal(errorKey(e(429, {})).key, 'hourly')
  assert.equal(errorKey(e(503, { code: 'AI_NOT_CONFIGURED' })).key, 'notReady')
  assert.equal(errorKey(e(401, {})).key, 'signedOut')
  assert.equal(errorKey(e(500, {})).key, 'generic')
  assert.equal(errorKey(null).key, 'generic')
  assert.equal(fileErrorKey('size'), 'tooLarge'); assert.equal(fileErrorKey('type'), 'type'); assert.equal(fileErrorKey('empty'), 'badFile')
})

test('kindOf reads the five kinds and falls back to fact', () => {
  assert.equal(kindOf({ kind: 'warning' }), 'warning')
  assert.equal(kindOf({ kind: 'nope' }), 'fact')
  assert.equal(kindOf(null), 'fact')
})
