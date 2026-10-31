// The pure rules behind "Add documents" (company console, Company Brain):
// pre-flight mirrors the server's file rules, every server result becomes the
// right sentences in the right order, and every failure (pre-flight, each HTTP
// status the route answers, a network drop) maps to one actionable error key.
import test from 'node:test'
import assert from 'node:assert/strict'
import { preflight, resultLines, errorOf, keywordsOnly, classifyDoc, MAX_BYTES, ACCEPT } from './uploadModel.js'

const file = (name, size = 10, type = '') => ({ name, size, type })

test('pre-flight takes the same four kinds as the server and refuses the rest before sending', () => {
  assert.equal(preflight(file('SOP.pdf')), null)
  assert.equal(preflight(file('SOP.docx')), null)
  assert.equal(preflight(file('notes.TXT')), null)
  assert.equal(preflight(file('readme.markdown')), null)
  assert.equal(preflight(file('anything', 10, 'text/plain')), null)   // mime alone is enough, as on the server
  assert.equal(preflight(file('sheet.xlsx')), 'type')
  assert.equal(preflight(file('photo.png', 10, 'image/png')), 'type')
  assert.equal(preflight(file('big.pdf', MAX_BYTES + 1)), 'size')
  assert.equal(preflight(file('empty.txt', 0)), 'noText')
  assert.equal(preflight(null), 'read')
  for (const ext of ['.pdf', '.docx', '.txt', '.md']) assert.ok(ACCEPT.includes(ext), `accept lists ${ext}`)
  assert.equal(classifyDoc('x.PDF'), 'pdf')
})

test('a result reads as added / replaced / masked / not kept, or already up to date', () => {
  const lines = (r) => resultLines(r, 'Change Playbook.docx').map((l) => `${l.key}:${l.n}`)
  assert.deepEqual(lines({ accepted: 14, unchanged: 0, masked: 0, source: { replaced: false } }), ['added:14', 'notKept:1'])
  assert.deepEqual(lines({ accepted: 3, unchanged: 11, masked: 2, source: { replaced: true } }), ['added:3', 'replaced:1', 'masked:2', 'notKept:1'])
  assert.deepEqual(lines({ accepted: 0, unchanged: 14, masked: 0, source: { replaced: false } }), ['unchanged:14', 'notKept:1'])
  // An identical re-upload renews the source row (replaced: true) but stored nothing new: up to date, not "replaced".
  assert.deepEqual(lines({ accepted: 0, unchanged: 14, masked: 1, source: { replaced: true } }), ['unchanged:14', 'masked:1', 'notKept:1'])
  assert.equal(resultLines({ accepted: 1 }, 'A.txt')[0].vars.name, 'A.txt')
  assert.equal(resultLines({ accepted: 1, source: { title: 'From server.txt' } })[0].vars.name, 'From server.txt')
  assert.deepEqual(resultLines(null), [])
})

test('every failure maps to one actionable key; a locked brain is flagged for the unlock pointer', () => {
  const api = (status, data) => Object.assign(new Error('x'), { status, data })
  assert.deepEqual(errorOf(api(423, { code: 'BRAIN_LOCKED' })), { key: 'locked', locked: true, retry: true })
  assert.deepEqual(errorOf(api(409, { code: 'BRAIN_LOCKED' })).key, 'locked')   // the code wins over the status
  assert.equal(errorOf(api(415)).key, 'type')
  assert.equal(errorOf(api(413)).key, 'size')
  assert.equal(errorOf(api(422)).key, 'noText')
  assert.equal(errorOf(api(429)).key, 'rate')
  assert.equal(errorOf(api(403)).key, 'forbidden')
  assert.equal(errorOf(api(400)).key, 'read')
  assert.equal(errorOf(api(500)).key, 'server')
  assert.equal(errorOf(new TypeError('Failed to fetch')).key, 'server')
  assert.equal(errorOf(undefined).key, 'server')
  // Pre-flight keys pass through; only a browser read failure is worth a retry.
  assert.deepEqual(errorOf('type'), { key: 'type', locked: false, retry: false })
  assert.deepEqual(errorOf('read'), { key: 'read', locked: false, retry: true })
  // Permanent refusals never offer a retry; transient ones do.
  for (const s of [415, 413, 422, 403]) assert.equal(errorOf(api(s)).retry, false, String(s))
  for (const s of [429, 500, 423]) assert.equal(errorOf(api(s)).retry, true, String(s))
})

test('keyword-only retrieval is read from the server flag, never assumed', () => {
  assert.equal(keywordsOnly({ search: 'keywords' }), true)
  assert.equal(keywordsOnly({ search: 'meaning' }), false)
  assert.equal(keywordsOnly({}), false)
  assert.equal(keywordsOnly(null), false)
})
