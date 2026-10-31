import test from 'node:test'
import assert from 'node:assert/strict'
import { contactPrefillFrom, setContactPrefill, takeContactPrefill } from './contact_prefill.js'

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), size: () => m.size } }

test('the widget lead and task become the contact form fields', () => {
  const f = contactPrefillFrom({ lead: { first: 'Ana', last: 'Ruiz', email: 'ana@corp.example' }, task: 'Onboard a new hire in Okta\nand assign their apps' })
  assert.deepEqual(f, { name: 'Ana Ruiz', email: 'ana@corp.example', subject: 'Onboard a new hire in Okta', message: 'Onboard a new hire in Okta\nand assign their apps' })
})

test('the hand-off is read once and removed, and never needs a URL', () => {
  const s = memStore()
  setContactPrefill(contactPrefillFrom({ lead: { first: 'Ana', email: 'a@b.example' }, task: 'x' }), s)
  assert.equal(takeContactPrefill(s).name, 'Ana')
  assert.equal(takeContactPrefill(s), null, 'gone after the first read')
  assert.equal(s.size(), 0)
})

test('blocked or garbled storage opens an empty form instead of failing', () => {
  const blocked = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => {} }
  assert.doesNotThrow(() => setContactPrefill({ name: 'x' }, blocked))
  assert.equal(takeContactPrefill(blocked), null)
  const s = memStore(); s.setItem('wc_contact_prefill_v1', '{not json')
  assert.equal(takeContactPrefill(s), null)
})
