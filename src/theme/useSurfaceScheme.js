// React hook: the light|dark scheme a two-palette surface (floating guide
// panel, full-screen guide) should paint, following the user's APP theme
// preference rather than the OS. Reads the stored preference through the
// preferences store's own reader (src/theme/prefs.js owns the key), maps it
// with surfaceSchemeFor(), and falls back to prefers-color-scheme only when
// nothing is stored. Reactive on all three signals: a preference change in this
// window (the store emits), one made in another window of the app (the
// `storage` event, which is how the pop-out / PiP documents hear the console),
// and an OS scheme flip while nothing is stored.
import { useSyncExternalStore } from 'react'
import { getStoredThemeMode, subscribe as subscribePrefs } from './prefs.js'
import { surfaceSchemeFor } from './surface_scheme.js'

const OS_DARK_QUERY = '(prefers-color-scheme: dark)'

function osDark() {
  try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(OS_DARK_QUERY).matches } catch { return false }
}

export function readSurfaceScheme() {
  return surfaceSchemeFor(getStoredThemeMode(), osDark())
}

function subscribe(onChange) {
  const offPrefs = subscribePrefs(onChange)
  let mq = null
  try { mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(OS_DARK_QUERY) : null } catch { mq = null }
  try { window.addEventListener('storage', onChange) } catch { /* no window */ }
  try { mq && mq.addEventListener && mq.addEventListener('change', onChange) } catch { /* older engines */ }
  return () => {
    offPrefs()
    try { window.removeEventListener('storage', onChange) } catch { /* ignore */ }
    try { mq && mq.removeEventListener && mq.removeEventListener('change', onChange) } catch { /* ignore */ }
  }
}

export function useSurfaceScheme() {
  return useSyncExternalStore(subscribe, readSurfaceScheme, () => 'light')
}
