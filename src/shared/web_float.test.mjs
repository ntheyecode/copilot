import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { webFloatAllowed, desktopFloatPointer } from './web_float.js'

test('individuals get the web floater; company members only the desktop app', () => {
  assert.equal(webFloatAllowed({ user: { id: 'u1' } }), true)
  assert.equal(webFloatAllowed({ user: { id: 'u2', companyId: 'c1' } }), false)
  assert.equal(desktopFloatPointer({ user: { id: 'u2', companyId: 'c1' } }), true)
  assert.equal(desktopFloatPointer({ user: { id: 'u1' } }), false)
})

test('the desktop app and phones never get the web floater or the pointer', () => {
  for (const env of [{ desktop: true }, { mobile: true }]) {
    assert.equal(webFloatAllowed({ user: { id: 'u1' }, ...env }), false)
    assert.equal(desktopFloatPointer({ user: { id: 'u2', companyId: 'c1' }, ...env }), false)
  }
})

// The one rule must stay the one rule: the console opens the web float only
// through webFloatAllowed, never a hand-rolled check of its own.
test('the guiding console decides the web floater through this module', () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pages', 'work', 'Guiding.jsx'), 'utf8')
  assert.match(src, /const floatCapable = webFloatAllowed\(/)
  assert.match(src, /from '\.\.\/\.\.\/shared\/web_float\.js'/)
})
