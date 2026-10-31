// The console theme contract: light by default, the visitor's choice remembered
// per browser, and blocked or broken storage never breaks the switch (the
// default wins, the write fails quietly).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConsoleTheme, saveConsoleTheme, otherConsoleTheme, isConsoleTheme, CONSOLE_THEME_KEY, DEFAULT_CONSOLE_THEME } from './console_theme.js'

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }
const blocked = { getItem() { throw new Error('SecurityError') }, setItem() { throw new Error('SecurityError') } }

test('light by default, and when nothing or junk is stored', () => {
  assert.equal(DEFAULT_CONSOLE_THEME, 'light')
  assert.equal(loadConsoleTheme(memStorage()), 'light')
  const s = memStorage(); s.setItem(CONSOLE_THEME_KEY, 'neon')
  assert.equal(loadConsoleTheme(s), 'light')
  assert.equal(loadConsoleTheme(null), 'light', 'no storage at all (no window) is light')
})

test('the choice is saved and read back', () => {
  const s = memStorage()
  assert.equal(saveConsoleTheme('dark', s), true)
  assert.equal(s.getItem(CONSOLE_THEME_KEY), 'dark')
  assert.equal(loadConsoleTheme(s), 'dark')
  assert.equal(saveConsoleTheme('light', s), true)
  assert.equal(loadConsoleTheme(s), 'light')
})

test('an unknown theme is never written', () => {
  const s = memStorage()
  assert.equal(saveConsoleTheme('neon', s), false)
  assert.equal(s.getItem(CONSOLE_THEME_KEY), null)
})

test('blocked storage: light, and a failed write is reported, never thrown', () => {
  assert.equal(loadConsoleTheme(blocked), 'light')
  assert.doesNotThrow(() => saveConsoleTheme('dark', blocked))
  assert.equal(saveConsoleTheme('dark', blocked), false)
})

test('the toggle flips between the two themes only', () => {
  assert.equal(otherConsoleTheme('light'), 'dark')
  assert.equal(otherConsoleTheme('dark'), 'light')
  assert.equal(isConsoleTheme('light') && isConsoleTheme('dark') && !isConsoleTheme(''), true)
})
