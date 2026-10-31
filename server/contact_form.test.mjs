import test from 'node:test'
import assert from 'node:assert/strict'
import { readContactForm, contactDetails, CONTACT_TOPICS } from './contact_form.js'

const ok = { name: 'Dana Lee', email: 'dana@corp.example', company: 'Northwind', jobTitle: 'IT Director', phone: '+1 415 555 0100', country: 'us', topic: 'Sales', message: 'We would like a rollout for 400 people.' }

test('a full submission is accepted and its details are laid out for the inbox', () => {
  const f = readContactForm(ok)
  assert.equal(f.topic, 'sales')
  assert.equal(f.country, 'US')
  const d = contactDetails(f)
  assert.match(d, /^Inquiry: Sales and business/)
  assert.match(d, /Company: Northwind/)
  assert.match(d, /Title: IT Director/)
  assert.match(d, /Phone: \+1 415 555 0100/)
  assert.match(d, /Country: United States \(US\)/)
  assert.ok(CONTACT_TOPICS.includes('partnership') && CONTACT_TOPICS.includes('billing'))
})

test('each bad field is refused with what to fix, and names the field', () => {
  const bad = (patch, field) => assert.throws(() => readContactForm({ ...ok, ...patch }), (e) => e.field === field)
  bad({ name: '' }, 'name')
  bad({ email: 'nope' }, 'email')
  bad({ topic: 'lottery' }, 'topic')
  bad({ phone: 'call me' }, 'phone')
  bad({ country: 'XX' }, 'country')
  bad({ message: 'hi' }, 'message')
  assert.equal(readContactForm({ ...ok, topic: '' }).topic, 'other', 'no topic picked: other')
  assert.doesNotThrow(() => readContactForm({ ...ok, phone: '', country: '', company: '', jobTitle: '' }))
})
