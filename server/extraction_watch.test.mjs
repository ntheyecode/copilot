// IP-04 extraction watch: alerts on a burst, respects cooldown, ignores normal use.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noteGeneration, _reset } from './extraction_watch.js'

test('normal interactive pace never alerts', () => {
  _reset()
  let alerts = 0
  for (let i = 0; i < 20; i++) { if (noteGeneration('u1')) alerts++ }
  assert.equal(alerts, 0, '20 calls (< threshold 30) must not alert')
})

test('a burst past the threshold raises exactly one alert (cooldown holds)', () => {
  _reset()
  let alerts = null
  for (let i = 0; i < 60; i++) { const a = noteGeneration('u2'); if (a) alerts = alerts ? alerts : a }
  assert.ok(alerts, 'a 60-call burst must alert')
  assert.ok(alerts.count >= 30, 'alert reports the count')
  // Further immediate calls must NOT re-alert (cooldown).
  let more = 0
  for (let i = 0; i < 40; i++) { if (noteGeneration('u2')) more++ }
  assert.equal(more, 0, 'cooldown suppresses repeat alerts')
})

test('different users are tracked independently', () => {
  _reset()
  let aAlert = 0, bAlert = 0
  for (let i = 0; i < 40; i++) { if (noteGeneration('a')) aAlert++ }
  for (let i = 0; i < 5; i++) { if (noteGeneration('b')) bAlert++ }
  assert.ok(aAlert >= 1, 'heavy user a alerts')
  assert.equal(bAlert, 0, 'light user b does not alert')
})

test('null/empty userId is ignored', () => {
  _reset()
  assert.equal(noteGeneration(null), null)
  assert.equal(noteGeneration(''), null)
})
