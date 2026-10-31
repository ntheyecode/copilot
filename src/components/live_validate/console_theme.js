// The answer console's theme (light / dark), remembered per browser.
//
// Owner rule (2026-10-31): the console shows LIGHT by default and the visitor
// switches it with one button at the top of the dialog. The choice lives in
// localStorage (per browser, across sessions); every read and write is wrapped,
// so a private window or blocked storage simply means "light" and the switch
// still works for the open page. Pure functions, no React: the ONE place that
// names the storage key, the two theme ids and the default (SUPREME RULE II).
export const CONSOLE_THEME_KEY = 'wc_lv_con_theme_v1'
export const CONSOLE_THEMES = ['light', 'dark']
export const DEFAULT_CONSOLE_THEME = 'light'
// The class on .lv-root that paints the dark palette (console.css.js).
export const CONSOLE_DARK_CLASS = 'lv-con-dark'

export const isConsoleTheme = (v) => CONSOLE_THEMES.includes(v)

export function loadConsoleTheme(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    const v = s ? s.getItem(CONSOLE_THEME_KEY) : null
    return isConsoleTheme(v) ? v : DEFAULT_CONSOLE_THEME
  } catch { return DEFAULT_CONSOLE_THEME }
}

export function saveConsoleTheme(theme, storage) {
  if (!isConsoleTheme(theme)) return false
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!s) return false
    s.setItem(CONSOLE_THEME_KEY, theme)
    return true
  } catch { return false }   // blocked storage: the choice holds for this page only
}

export const otherConsoleTheme = (theme) => (theme === 'dark' ? 'light' : 'dark')
