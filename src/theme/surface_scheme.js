// The ONE rule that maps the app theme preference onto a two-palette surface
// (the floating guide panel and the full-screen guide carry light + dark only,
// no heavy variant). Pure, so it is unit-tested without a DOM:
//   'light'          -> 'light'
//   'dark' | 'heavy' -> 'dark'   (heavy is a dark variant; these surfaces show dark)
//   nothing stored   -> the OS scheme (prefers-color-scheme), the pre-existing
//                       behavior for a visitor who has chosen nothing yet
// Consumers never branch on the raw mode themselves (SUPREME RULE II: one
// concept, one owner); they call surfaceSchemeFor(). The browser-side reader
// that feeds it lives in useSurfaceScheme.js.
import { THEME_MODES } from './prefs.js'

export const SURFACE_SCHEMES = ['light', 'dark']

export function surfaceSchemeFor(mode, osDark) {
  if (THEME_MODES.includes(mode)) return mode === 'light' ? 'light' : 'dark'
  return osDark ? 'dark' : 'light'
}
