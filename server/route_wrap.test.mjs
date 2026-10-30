import test from 'node:test'
import assert from 'node:assert/strict'
import { makeWrap } from './route_wrap.js'

const res = () => ({ headersSent: false, code: 200, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; this.headersSent = true; return this } })
const send = (r, e) => r.status(e.status || 500).json({ error: e.message })

test('a sync throw is answered', () => {
  const r = res()
  makeWrap(send)(() => { throw Object.assign(new Error('Nope'), { status: 403 }) })({}, r)
  assert.deepEqual([r.code, r.body.error], [403, 'Nope'])
})

test('regression: an async rejection is answered, not left to crash the process', async () => {
  const r = res()
  makeWrap(send)(async () => { await null; throw Object.assign(new Error('Brain locked'), { status: 423 }) })({}, r)
  await new Promise((ok) => setImmediate(ok))
  assert.deepEqual([r.code, r.body.error], [423, 'Brain locked'])
})

test('success paths are untouched, and an error after the answer is not sent twice', async () => {
  const r = res()
  makeWrap(send)((_q, s) => { s.json({ ok: true }) })({}, r)
  assert.deepEqual(r.body, { ok: true })
  const r2 = res()
  makeWrap(send)(async (_q, s) => { s.json({ ok: 1 }); throw new Error('late') })({}, r2)
  await new Promise((ok) => setImmediate(ok))
  assert.deepEqual([r2.code, r2.body], [200, { ok: 1 }])
})
