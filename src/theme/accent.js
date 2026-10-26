// ===========================================================================
// Dashboard accent theming — SINGLE SOURCE OF TRUTH (SUPREME RULE II).
//
// The whole platform's accent color is driven by ONE CSS variable set on the
// document root (`--accent` + derived shades). Each design system's accent token
// derives from it with its own color as the FALLBACK, e.g. in the CSS:
//
//     --wka-accent: var(--accent, #0e9f6e);     (company admin default: green)
//     .wka-super { --wka-accent: var(--accent, #0a84c2); }   (superadmin: blue)
//     .wd, .ws   { --em: var(--accent, #0e9f6e); ... }       (guide/app)
//
// So when no user accent is set, every surface keeps its own default; when the
// user picks one, `applyAccent()` sets `--accent` on :root and every surface adopts
// it live. The user's choice is a preset KEY (from ACCENT_PRESETS) or a #rrggbb hex
// (custom); it persists per-user on the server (follows them across devices) and in
// localStorage (instant, before the profile loads).
//
// This module owns the key->color mapping and the shade math. The picker UI and the
// token-remapping CSS consume this contract; they never hardcode accent colors.
// ===========================================================================

// The curated, contrast-tested palette. One base hex per preset; shades are derived.
export const ACCENT_PRESETS = [
  { key: 'green',  name: 'Green',  hex: '#0e9f6e' },   // product default
  { key: 'teal',   name: 'Teal',   hex: '#0d9488' },
  { key: 'blue',   name: 'Blue',   hex: '#0a84c2' },
  { key: 'indigo', name: 'Indigo', hex: '#4f46e5' },
  { key: 'purple', name: 'Purple', hex: '#7c3aed' },
  { key: 'rose',   name: 'Rose',   hex: '#e11d48' },
  { key: 'amber',  name: 'Amber',  hex: '#b7791f' },
  { key: 'slate',  name: 'Slate',  hex: '#475569' },
]
const PRESET_BY_KEY = Object.fromEntries(ACCENT_PRESETS.map((p) => [p.key, p]))
export const DEFAULT_ACCENT_HEX = '#0e9f6e'

const ACCENT_VARS = ['--accent', '--accent-dark', '--accent-ink', '--accent-soft', '--accent-line', '--accent-shadow', '--accent-contrast']
const STORAGE_KEY = 'wc_accent'

const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)))
function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => clampByte(x).toString(16).padStart(2, '0')).join('')
// Mix toward black (target 0) or white (255) by t in [0,1].
function mix(hex, target, t) { const [r, g, b] = hexToRgb(hex); return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t) }
const darken = (hex, t) => mix(hex, 0, t)

// Relative luminance (WCAG) — used to pick readable text on the accent.
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Resolve a preset key or a #rrggbb hex to a base hex. null for anything invalid.
export function accentHexFor(value) {
  if (!value) return null
  const v = String(value).trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  return PRESET_BY_KEY[v] ? PRESET_BY_KEY[v].hex : null
}

// The full CSS-variable set derived from a base hex.
export function deriveAccentVars(hex) {
  const [r, g, b] = hexToRgb(hex)
  const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`
  return {
    '--accent': hex,
    '--accent-dark': darken(hex, 0.18),
    '--accent-ink': darken(hex, 0.40),
    '--accent-soft': rgba(0.10),
    '--accent-line': rgba(0.32),
    '--accent-shadow': rgba(0.25),
    // Readable text on a solid accent fill (white on dark accents, near-black on light ones like amber).
    '--accent-contrast': luminance(hex) > 0.5 ? '#111827' : '#ffffff',
  }
}

// Apply an accent (preset key or hex) to the whole document, live. A null/invalid
// value clears back to each surface's own default. Safe to call before React mounts.
export function applyAccent(value) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const hex = accentHexFor(value)
  if (!hex) {
    root.removeAttribute('data-accent')
    for (const k of ACCENT_VARS) root.style.removeProperty(k)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* private mode */ }
    return
  }
  const vars = deriveAccentVars(hex)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.setAttribute('data-accent', /^#/.test(String(value)) ? 'custom' : String(value).trim().toLowerCase())
  try { localStorage.setItem(STORAGE_KEY, String(value)) } catch { /* private mode */ }
}

// The stored accent, if any (localStorage). The server preference takes precedence.
export function storedAccent() {
  try { return localStorage.getItem(STORAGE_KEY) || null } catch { return null }
}

// On app load: apply the server preference if present, else the localStorage value.
// Call this as early as possible (and again when the profile loads with the server
// value) so the accent is correct before the dashboards paint.
export function initAccent(serverAccent) {
  const v = serverAccent != null ? serverAccent : storedAccent()
  if (v) applyAccent(v)
}

// The preset key that matches a stored value, or 'custom' for a hex, or null.
export function currentAccentKey(value) {
  if (!value) return null
  const v = String(value).trim().toLowerCase()
  if (PRESET_BY_KEY[v]) return v
  if (/^#[0-9a-f]{6}$/.test(v)) return 'custom'
  return null
}
