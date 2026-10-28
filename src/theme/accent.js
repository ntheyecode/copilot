// ===========================================================================
// Brand combinations: the SINGLE SOURCE OF TRUTH (SUPREME RULE II).
//
// A user does not pick a free color any more; they pick ONE of the vetted
// COMBINATIONS below. Each combination is a primary + secondary pair, and every
// shade a surface needs is DERIVED here with a contrast guarantee, so whatever
// the pair, the result passes WCAG AA by construction:
//
//   --accent          the primary, used for marks, rings, icons, soft fills
//   --accent-solid    the lightest shade of the primary that carries WHITE text
//                     at >= 4.5:1 (a filled button face); equals the primary
//                     when the primary already passes
//   --accent-dark     a text / icon shade of the primary at >= 4.5:1 on white
//   --accent-light    a text shade of the primary at >= 4.5:1 on the dark panel
//   --accent-ink      the deepest shade (hover on solid fills, strong text)
//   --accent-soft / --accent-line / --accent-shadow   alpha tints of the primary
//   --accent-contrast the ink that reads on a plain primary fill
//   --accent-2, --accent-2-dark, --accent-2-light, --accent-2-soft,
//   --accent-2-line, --accent-2-contrast   the same set for the secondary
//
// Each design system's tokens derive from these with its own fallback, e.g. in
// src/pages/work/workApp.css.js: `--em:var(--accent,#0e9f6e)` and
// `--em-2:var(--accent-2,#0a6fb3)`. With no combination chosen, every surface
// keeps its default; when the user picks one, applyAccent() sets the vars on
// :root and every surface adopts the pair live. The choice is a combination KEY
// only (no hex), persisted per user on the server and in localStorage.
// ===========================================================================

// The vetted pairs. Primaries are the eight curated accents; each is paired with
// a secondary that sits apart on the hue wheel so marks stay distinguishable
// (the dashboard's "guided time" vs "tasks" pair, the rail vs the top-bar chip).
export const ACCENT_COMBOS = [
  { key: 'meadow',   name: 'Meadow',   primary: '#0e9f6e', secondary: '#0a6fb3' },   // product default pair (green / blue)
  { key: 'lagoon',   name: 'Lagoon',   primary: '#0d9488', secondary: '#4f46e5' },
  { key: 'harbor',   name: 'Harbor',   primary: '#0a84c2', secondary: '#0b7a53' },
  { key: 'twilight', name: 'Twilight', primary: '#4f46e5', secondary: '#0d9488' },
  { key: 'orchid',   name: 'Orchid',   primary: '#7c3aed', secondary: '#be123c' },
  { key: 'berry',    name: 'Berry',    primary: '#e11d48', secondary: '#4f46e5' },
  { key: 'honey',    name: 'Honey',    primary: '#b7791f', secondary: '#475569' },
  { key: 'graphite', name: 'Graphite', primary: '#475569', secondary: '#0a6fb3' },
]
// Back-compat name for callers that iterate the catalog.
export const ACCENT_PRESETS = ACCENT_COMBOS
const COMBO_BY_KEY = Object.fromEntries(ACCENT_COMBOS.map((c) => [c.key, c]))
export const DEFAULT_ACCENT_HEX = '#0e9f6e'
export const DEFAULT_ACCENT_2_HEX = '#0a6fb3'

// Every var applyAccent() may set; cleared together so no stale shade survives a reset.
const ACCENT_VARS = [
  '--accent', '--accent-solid', '--accent-dark', '--accent-light', '--accent-ink', '--accent-soft', '--accent-line', '--accent-shadow', '--accent-contrast',
  '--accent-2', '--accent-2-dark', '--accent-2-light', '--accent-2-soft', '--accent-2-line', '--accent-2-contrast',
]
const STORAGE_KEY = 'wc_accent'
// The dark theme's panel color (workApp.css.js [data-theme='dark'] --panel); the
// light text shades are guaranteed against it.
const DARK_PANEL = '#171a2c'
const WHITE = '#ffffff'
const AA = 4.5

const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)))
function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => clampByte(x).toString(16).padStart(2, '0')).join('')
// Mix toward black (target 0) or white (255) by t in [0,1].
function mix(hex, target, t) { const [r, g, b] = hexToRgb(hex); return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t) }
const darken = (hex, t) => mix(hex, 0, t)
const lighten = (hex, t) => mix(hex, 255, t)

// Relative luminance (WCAG 2.x) and the contrast ratio between two colors.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
// The first shade of `hex`, stepping toward black (`toward` = 0) or white (255)
// in 4% steps, that reaches `target` contrast against `bg`. Starts from the
// color itself, so a color that already passes is returned unchanged.
function ensureContrast(hex, bg, toward, target = AA) {
  let out = hex
  for (let i = 0; i <= 25; i++) {
    out = i === 0 ? hex : mix(hex, toward, Math.min(1, i * 0.04))
    if (contrastRatio(out, bg) >= target) return out
  }
  return out
}

// The combination for a key (or a combination object), else null. A free hex is
// deliberately NOT accepted: the picker offers vetted pairs only.
export function comboFor(value) {
  if (!value) return null
  if (typeof value === 'object' && value.key && COMBO_BY_KEY[value.key]) return COMBO_BY_KEY[value.key]
  const v = String(value).trim().toLowerCase()
  return COMBO_BY_KEY[v] || null
}
// The primary hex for a combination key, or null for anything unknown.
export function accentHexFor(value) {
  const c = comboFor(value)
  return c ? c.primary : null
}

// The full CSS-variable set derived from a primary + secondary pair (hex strings).
// Pure, so a picker can preview a pair without applying it.
export function deriveAccentVars(primary, secondary = DEFAULT_ACCENT_2_HEX) {
  const set = (hex, prefix) => {
    const [r, g, b] = hexToRgb(hex)
    const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`
    const out = {
      [`${prefix}`]: hex,
      [`${prefix}-dark`]: ensureContrast(darken(hex, 0.18), WHITE, 0),
      [`${prefix}-light`]: ensureContrast(lighten(hex, 0.12), DARK_PANEL, 255),
      [`${prefix}-soft`]: rgba(0.10),
      [`${prefix}-line`]: rgba(0.32),
      // Readable text on a plain fill of this color (white on dark colors, near-black on light ones).
      [`${prefix}-contrast`]: luminance(hex) > 0.5 ? '#111827' : WHITE,
    }
    return out
  }
  const p = set(primary, '--accent')
  const s = set(secondary, '--accent-2')
  const [r, g, b] = hexToRgb(primary)
  return {
    ...p,
    '--accent-solid': ensureContrast(primary, WHITE, 0),
    '--accent-ink': darken(primary, 0.40),
    '--accent-shadow': `rgba(${r}, ${g}, ${b}, 0.25)`,
    ...s,
  }
}

// The derived set for a combination key (what applyAccent writes). Null for an
// unknown key, so a caller can fall back to the surface defaults.
export function accentVarsFor(value) {
  const c = comboFor(value)
  return c ? deriveAccentVars(c.primary, c.secondary) : null
}

// A contrast report for one combination (used by the picker's title and the
// verification script): the ratios that matter for text on each shade.
export function contrastReport(value) {
  const c = comboFor(value)
  if (!c) return null
  const v = deriveAccentVars(c.primary, c.secondary)
  const r2 = (x) => Math.round(x * 100) / 100
  return {
    key: c.key,
    solidFillWhiteInk: r2(contrastRatio(v['--accent-solid'], WHITE)),
    primaryTextOnWhite: r2(contrastRatio(v['--accent-dark'], WHITE)),
    primaryTextOnDark: r2(contrastRatio(v['--accent-light'], DARK_PANEL)),
    secondaryTextOnWhite: r2(contrastRatio(v['--accent-2-dark'], WHITE)),
    secondaryTextOnDark: r2(contrastRatio(v['--accent-2-light'], DARK_PANEL)),
  }
}

// Apply a combination (by key) to the whole document, live. A null / unknown
// value clears back to each surface's own default. Safe to call before React
// mounts. Writes localStorage so the next load on this device paints correctly
// before the profile arrives (the server value, when present, wins at init).
export function applyAccent(value) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const c = comboFor(value)
  if (!c) {
    root.removeAttribute('data-accent')
    for (const k of ACCENT_VARS) root.style.removeProperty(k)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* private mode */ }
    return
  }
  const vars = deriveAccentVars(c.primary, c.secondary)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.setAttribute('data-accent', c.key)
  try { localStorage.setItem(STORAGE_KEY, c.key) } catch { /* private mode */ }
}

// The stored combination key, if any (localStorage). The server preference takes precedence.
export function storedAccent() {
  try { const v = localStorage.getItem(STORAGE_KEY); return comboFor(v) ? v : null } catch { return null }
}

// On app load: apply the server preference if present, else the localStorage
// value. Kept for callers that only know about the accent; the preferences
// module (src/theme/prefs.js) calls it as part of initPrefs().
export function initAccent(serverAccent) {
  const v = comboFor(serverAccent) ? serverAccent : storedAccent()
  if (v) applyAccent(v)
}

// The combination key that matches a stored value, or null (no free-hex state).
export function currentAccentKey(value) {
  const c = comboFor(value)
  return c ? c.key : null
}
