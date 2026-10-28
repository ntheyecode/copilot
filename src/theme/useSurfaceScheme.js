// React hook: the light|dark scheme a two-palette surface (floating guide
// panel, full-screen guide) should paint, following the user's APP theme
// preference rather than the OS. Source precedence, resolved by the one rule in
// src/theme/surface_scheme.js:
//   1. the mode this device stored (wc_theme_mode, read through the preferences
//      store's own reader; src/theme/prefs.js owns the key);
//   2. the mode the server holds for the user (user.themeMode, set on another
//      device): the prefs store records it when auth.jsx hands the signed-in user
//      from GET /api/work/me to initPrefs(), so no surface fetches it twice. A
//      surface that already holds its own user object may pass user.themeMode
//      explicitly instead;
//   3. prefers-color-scheme, only when nothing is chosen anywhere.
// Reactive on every signal: a preference change in this window and the profile
// (re)load (the store emits), one made in another window of the app (the
// `storage` event, which is how the pop-out / PiP documents hear the console),
// and an OS scheme flip while nothing is chosen.
import { useCallback, useSyncExternalStore } from 'react'
import { getStoredThemeMode, getServerThemeMode, subscribe as subscribePrefs } from './prefs.js'
import { resolveSurfaceMode, surfaceSchemeFor } from './surface_scheme.js'

const OS_DARK_QUERY = '(prefers-color-scheme: dark)'

function osDark() {
  try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(OS_DARK_QUERY).matches } catch { return false }
}

// `serverMode` (optional): a server-held mode the caller already has. When
// omitted, the one the prefs store recorded from the loaded profile is used.
export function readSurfaceScheme(serverMode) {
  const server = serverMode === undefined ? getServerThemeMode() : serverMode
  return surfaceSchemeFor(resolveSurfaceMode(getStoredThemeMode(), server), osDark())
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

export function useSurfaceScheme(serverMode) {
  const read = useCallback(() => readSurfaceScheme(serverMode), [serverMode])
  return useSyncExternalStore(subscribe, read, () => 'light')
}
