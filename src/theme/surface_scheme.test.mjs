// Gate for the app-preference -> two-palette mapping used by the floating guide
// panel and the full-screen guide. Goes red if a surface ever regresses to
// "OS only" (a stored preference must win over the OS), ignores a choice made on
// another device (the server mode must win over the OS when nothing is stored
// here), lets the server override what this device stored, or paints heavy as
// light.
import test from 'node:test'
import assert from 'node:assert/strict'
import { surfaceSchemeFor, resolveSurfaceMode, SURFACE_SCHEMES } from './surface_scheme.js'

const MODES = ['light', 'dark', 'heavy']
const NOTHING = [null, undefined, '', 'bogus', 0]

// The full chain a surface runs: stored -> server -> OS.
const scheme = (stored, server, osDark) => surfaceSchemeFor(resolveSurfaceMode(stored, server), osDark)

test('a stored preference beats the OS scheme in every combination', () => {
  for (const osDark of [true, false]) {
    assert.equal(surfaceSchemeFor('light', osDark), 'light')
    assert.equal(surfaceSchemeFor('dark', osDark), 'dark')
    assert.equal(surfaceSchemeFor('heavy', osDark), 'dark', 'heavy maps to the dark palette (no heavy variant on these surfaces)')
  }
})

test('nothing chosen anywhere falls back to the OS scheme (the pre-existing behavior)', () => {
  for (const stored of NOTHING) for (const server of NOTHING) {
    assert.equal(resolveSurfaceMode(stored, server), null)
    assert.equal(scheme(stored, server, true), 'dark')
    assert.equal(scheme(stored, server, false), 'light')
  }
})

test('the stored mode wins over the server mode, whatever the server says', () => {
  for (const stored of MODES) for (const server of [...MODES, ...NOTHING]) {
    assert.equal(resolveSurfaceMode(stored, server), stored)
  }
  // the cross-device case the owner hit: stored light here, dark on the server
  for (const osDark of [true, false]) {
    assert.equal(scheme('light', 'dark', osDark), 'light')
    assert.equal(scheme('light', 'heavy', osDark), 'light')
    assert.equal(scheme('dark', 'light', osDark), 'dark')
  }
})

test('the server mode wins over the OS when this device stored nothing', () => {
  for (const stored of NOTHING) {
    for (const server of MODES) assert.equal(resolveSurfaceMode(stored, server), server)
    for (const osDark of [true, false]) {
      assert.equal(scheme(stored, 'dark', osDark), 'dark', 'dark chosen on another device paints dark even on a light OS')
      assert.equal(scheme(stored, 'heavy', osDark), 'dark', 'heavy from the server maps to the dark palette')
      assert.equal(scheme(stored, 'light', osDark), 'light', 'light chosen on another device paints light even on a dark OS')
    }
  }
})

test('an unknown server mode is ignored, not painted', () => {
  for (const bad of ['neon', 'auto', 1, {}, 'DARK']) {
    assert.equal(resolveSurfaceMode(null, bad), null)
    assert.equal(scheme(null, bad, true), 'dark')
    assert.equal(scheme(null, bad, false), 'light')
  }
})

test('the result is always one of the two surface schemes', () => {
  for (const stored of [...MODES, null, 'x']) for (const server of [...MODES, null, 'x']) for (const osDark of [true, false]) {
    assert.ok(SURFACE_SCHEMES.includes(scheme(stored, server, osDark)))
  }
})
