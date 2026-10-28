// Gate for the app-preference -> two-palette mapping used by the floating guide
// panel and the full-screen guide. Goes red if a surface ever regresses to
// "OS only" (a stored preference must win over the OS) or paints heavy as light.
import test from 'node:test'
import assert from 'node:assert/strict'
import { surfaceSchemeFor, SURFACE_SCHEMES } from './surface_scheme.js'

test('a stored preference beats the OS scheme in every combination', () => {
  for (const osDark of [true, false]) {
    assert.equal(surfaceSchemeFor('light', osDark), 'light')
    assert.equal(surfaceSchemeFor('dark', osDark), 'dark')
    assert.equal(surfaceSchemeFor('heavy', osDark), 'dark', 'heavy maps to the dark palette (no heavy variant on these surfaces)')
  }
})

test('nothing stored falls back to the OS scheme (the pre-existing behavior)', () => {
  for (const nothing of [null, undefined, '', 'bogus', 0]) {
    assert.equal(surfaceSchemeFor(nothing, true), 'dark')
    assert.equal(surfaceSchemeFor(nothing, false), 'light')
  }
})

test('the result is always one of the two surface schemes', () => {
  for (const mode of ['light', 'dark', 'heavy', null, 'x']) for (const osDark of [true, false]) {
    assert.ok(SURFACE_SCHEMES.includes(surfaceSchemeFor(mode, osDark)))
  }
})
