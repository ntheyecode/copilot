// The ONE rule that maps the app theme preference onto a two-palette surface
// (the floating guide panel and the full-screen guide carry light + dark only,
// no heavy variant). Pure, so it is unit-tested without a DOM.
//
// Source precedence (resolveSurfaceMode): the mode this device STORED
// (wc_theme_mode, a choice made here) wins; else the mode the SERVER holds for
// the user (user.themeMode, a choice made on another device, which this device
// has not stored yet); else null, which means "chose nothing".
//
// Palette (surfaceSchemeFor):
//   'light'          -> 'light'
//   'dark' | 'heavy' -> 'dark'   (heavy is a dark variant; these surfaces show dark)
//   nothing chosen   -> the OS scheme (prefers-color-scheme), the pre-existing
//                       behavior for a visitor who has chosen nothing anywhere
// Consumers never branch on the raw modes themselves (SUPREME RULE II: one
// concept, one owner); they call these two. The browser-side reader that feeds
// them (localStorage, the prefs store's server value, matchMedia) lives in
// useSurfaceScheme.js.
import { THEME_MODES } from './prefs.js'

export const SURFACE_SCHEMES = ['light', 'dark']

// The mode a surface should honor: stored (this device) over server (another
// device), ignoring anything that is not a known mode. null = nothing chosen.
export function resolveSurfaceMode(storedMode, serverMode) {
  if (THEME_MODES.includes(storedMode)) return storedMode
  if (THEME_MODES.includes(serverMode)) return serverMode
  return null
}

export function surfaceSchemeFor(mode, osDark) {
  if (THEME_MODES.includes(mode)) return mode === 'light' ? 'light' : 'dark'
  return osDark ? 'dark' : 'light'
}
