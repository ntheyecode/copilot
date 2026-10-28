// Per-user personalization persistence: theme mode + brand combination +
// accessibility prefs, validated against closed sets, partial-merge, and exposed
// on the public user. The free-hex brand path is gone (combination key only).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const storePath = 'file://' + path.join(here, 'store.js').replace(/\\/g, '/')
process.env.WORK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-prefs-'))
process.env.PORT = '0'
const store = await import(storePath)
const uniq = (p) => p + Math.random().toString(36).slice(2, 7)
const user = () => store.createWorkUser({ username: uniq('pf'), password: 'Passw0rd!x' })

test('theme mode is validated and exposed on the public user', () => {
  const u = user()
  const pub = store.setWorkUserPrefs(u.id, { themeMode: 'dark' })
  assert.equal(pub.themeMode, 'dark')
  assert.throws(() => store.setWorkUserPrefs(u.id, { themeMode: 'neon' }), /theme mode/i)
  assert.equal(store.setWorkUserPrefs(u.id, { themeMode: null }).themeMode, null)   // clears back to default
})

test('brand accepts a combination key but rejects a free hex (no custom colors)', () => {
  const u = user()
  assert.equal(store.setWorkUserPrefs(u.id, { accent: 'teal-slate' }).accent, 'teal-slate')
  assert.throws(() => store.setWorkUserPrefs(u.id, { accent: '#0a84c2' }), /brand selection/i)   // free hex removed
})

test('a11y is a partial merge against a closed set; md text size stores nothing', () => {
  const u = user()
  store.setWorkUserPrefs(u.id, { a11y: { textSize: 'xl', highContrast: true } })
  let pub = store.setWorkUserPrefs(u.id, { a11y: { reducedMotion: true } })   // merge, not replace
  assert.equal(pub.a11y.textSize, 'xl')
  assert.equal(pub.a11y.highContrast, true)
  assert.equal(pub.a11y.reducedMotion, true)
  pub = store.setWorkUserPrefs(u.id, { a11y: { highContrast: false, textSize: 'md' } })   // unset flag + default size
  assert.equal(pub.a11y.highContrast, undefined)
  assert.equal(pub.a11y.textSize, undefined)                                   // md is the default, not stored
  assert.throws(() => store.setWorkUserPrefs(u.id, { a11y: { textSize: 'huge' } }), /text size/i)
})

test('a patch only touches the keys present', () => {
  const u = user()
  store.setWorkUserPrefs(u.id, { accent: 'green-teal', themeMode: 'heavy' })
  const pub = store.setWorkUserPrefs(u.id, { a11y: { largerTargets: true } })   // does not clear accent/mode
  assert.equal(pub.accent, 'green-teal')
  assert.equal(pub.themeMode, 'heavy')
  assert.equal(pub.a11y.largerTargets, true)
})
