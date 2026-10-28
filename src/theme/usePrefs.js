// React binding for the preferences store (src/theme/prefs.js): one hook that
// returns the current { accent, themeMode, a11y } and re-renders on any change,
// plus the setters. Thin on purpose: the store owns apply + persist.
import { useSyncExternalStore, useCallback } from 'react'
import { getPrefs, subscribe, setPrefs } from './prefs.js'

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, getPrefs, getPrefs)
  const setAccent = useCallback((key) => setPrefs({ accent: key || null }), [])
  const setThemeMode = useCallback((mode) => setPrefs({ themeMode: mode }), [])
  const setA11y = useCallback((patch) => setPrefs({ a11y: patch }), [])
  return { prefs, setAccent, setThemeMode, setA11y }
}
