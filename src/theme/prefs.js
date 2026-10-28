// ===========================================================================
// Per-user PREFERENCES: the one place that owns the three personalization
// groups (theme mode, brand combination, accessibility), applies them live and
// persists them (SUPREME RULE II: one concept, one owner).
//
//   themeMode  'light' (default, the owner's white law) | 'dark' | 'heavy'
//              -> `data-theme` on <html>, read by the token sheets
//                 (workApp.css.js [data-theme='dark'] / [data-theme='heavy'] .wd,
//                 styles/tokens.css). Applied only while a product shell is
//                 mounted (setInProduct), so the public site stays light.
//   accent     a combination KEY from src/theme/accent.js (applyAccent)
//   a11y       { textSize, reducedMotion, highContrast, largerTargets, readableFont }
//              -> `--wc-fs-app` (one root font-scale var) + data-a11y-* attributes
//                 on <html>; the token sheets layer their overrides on those.
//
// Persistence contract: localStorage first (instant, before the profile loads),
// then the server via api.workSetPrefs({ accent?, themeMode?, a11y? }) ->
// POST /api/work/profile/prefs, fire-and-forget and debounced. The server
// value, when the profile carries one, wins at init; the raw server theme mode
// is also kept (getServerThemeMode) for the two-palette surfaces, which honor
// stored -> server -> OS (surface_scheme.js). Defensive by design: if
// the endpoint or the profile fields are missing (server change not merged
// yet), everything still works from localStorage, and an accent-only patch
// falls back to the older /profile/accent endpoint.
// ===========================================================================
import { api } from '../api.js'
import { applyAccent, comboFor } from './accent.js'

export const THEME_MODES = ['light', 'dark', 'heavy']
export const TEXT_SIZES = { sm: 0.9, md: 1, lg: 1.15, xl: 1.3 }
export const DEFAULT_A11Y = Object.freeze({ textSize: 'md', reducedMotion: false, highContrast: false, largerTargets: false, readableFont: false })

const K_MODE = 'wc_theme_mode'
const K_A11Y = 'wc_a11y'
const PERSIST_DELAY_MS = 250

const state = { accent: null, themeMode: 'light', a11y: { ...DEFAULT_A11Y } }
// The theme mode the SERVER holds for the signed-in user (a choice made on any
// device), as last handed to initPrefs(); null when the profile carries none or
// nobody is signed in. Kept apart from state.themeMode (which defaults to
// 'light') so a surface can tell "the user chose dark elsewhere" from "chose
// nothing" (see getServerThemeMode / surface_scheme.js).
let serverThemeMode = null
let inProduct = false
const listeners = new Set()
let persistTimer = null
let pending = {}

export function normalizeMode(m) { return THEME_MODES.includes(m) ? m : 'light' }
export function normalizeA11y(a) {
  const src = a && typeof a === 'object' ? a : {}
  return {
    textSize: Object.prototype.hasOwnProperty.call(TEXT_SIZES, src.textSize) ? src.textSize : DEFAULT_A11Y.textSize,
    reducedMotion: !!src.reducedMotion,
    highContrast: !!src.highContrast,
    largerTargets: !!src.largerTargets,
    readableFont: !!src.readableFont,
  }
}

function readStored() {
  let mode = null, a11y = null
  try { mode = localStorage.getItem(K_MODE) } catch { /* private mode */ }
  try { const raw = localStorage.getItem(K_A11Y); a11y = raw ? JSON.parse(raw) : null } catch { a11y = null }
  return { mode: THEME_MODES.includes(mode) ? mode : null, a11y: a11y && typeof a11y === 'object' ? a11y : null }
}
function writeStored() {
  try { localStorage.setItem(K_MODE, state.themeMode) } catch { /* private mode */ }
  try { localStorage.setItem(K_A11Y, JSON.stringify(state.a11y)) } catch { /* private mode */ }
}

// ---- Apply ------------------------------------------------------------------
function applyThemeMode() {
  if (typeof document === 'undefined') return
  // Outside a product shell the site is always light; the choice still persists.
  document.documentElement.setAttribute('data-theme', inProduct ? state.themeMode : 'light')
}
function applyA11y() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const a = state.a11y
  root.style.setProperty('--wc-fs-app', String(TEXT_SIZES[a.textSize] || 1))
  root.setAttribute('data-a11y-text', a.textSize)
  const flag = (name, on, val = '1') => { if (on) root.setAttribute(name, val); else root.removeAttribute(name) }
  flag('data-a11y-motion', a.reducedMotion, 'reduce')
  flag('data-a11y-contrast', a.highContrast)
  flag('data-a11y-targets', a.largerTargets)
  flag('data-a11y-font', a.readableFont, 'readable')
}
function applyAll() {
  applyAccent(state.accent)
  applyThemeMode()
  applyA11y()
}
function emit() { for (const fn of listeners) { try { fn(getPrefs()) } catch { /* a listener must never break the others */ } } }

// ---- Read -------------------------------------------------------------------
// The raw STORED mode, or null when this device holds no choice. For surfaces
// that need to tell "chose light" from "chose nothing" (the floating guide and
// the full-screen guide fall back to the OS scheme only in the latter case; see
// surface_scheme.js). getPrefs().themeMode cannot express that: it defaults to
// 'light'. This is the one reader of the key; nothing else touches localStorage.
export function getStoredThemeMode() { return readStored().mode }
// The raw SERVER mode from the loaded profile (user.themeMode via GET
// /api/work/me, recorded by initPrefs), or null. Second in the surfaces'
// precedence: a device with nothing stored still honors a choice made on
// another device instead of falling back to the OS. One reader; nothing else
// re-fetches the profile for it.
export function getServerThemeMode() { return serverThemeMode }

let snapshot = null
export function getPrefs() {
  if (!snapshot) snapshot = { accent: state.accent, themeMode: state.themeMode, a11y: { ...state.a11y } }
  return snapshot
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }

// ---- Init (boot + every profile refresh) -----------------------------------
// Server values win when present (they follow the user across devices); else
// what this device stored; else the defaults. Applies, never persists.
export function initPrefs(user) {
  const u = user && typeof user === 'object' ? user : null
  const stored = readStored()
  let storedAccent = null
  try { storedAccent = localStorage.getItem('wc_accent') } catch { /* private mode */ }
  state.accent = (u && comboFor(u.accent)) ? u.accent : (comboFor(storedAccent) ? storedAccent : null)
  serverThemeMode = u && THEME_MODES.includes(u.themeMode) ? u.themeMode : null
  state.themeMode = normalizeMode(serverThemeMode || stored.mode)
  state.a11y = normalizeA11y(u && u.a11y && typeof u.a11y === 'object' ? u.a11y : stored.a11y)
  snapshot = null
  applyAll()
  emit()
}

// ---- Set (the panel) ---------------------------------------------------------
// Merge a patch, apply it live, store it, and persist it (debounced). The a11y
// patch is merged field by field, so one toggle never resets the others.
export function setPrefs(patch, opts = {}) {
  const p = patch && typeof patch === 'object' ? patch : {}
  const out = {}
  if (Object.prototype.hasOwnProperty.call(p, 'accent')) { state.accent = comboFor(p.accent) ? String(p.accent) : null; out.accent = state.accent }
  if (Object.prototype.hasOwnProperty.call(p, 'themeMode')) { state.themeMode = normalizeMode(p.themeMode); out.themeMode = state.themeMode }
  if (p.a11y && typeof p.a11y === 'object') { state.a11y = normalizeA11y({ ...state.a11y, ...p.a11y }); out.a11y = { ...state.a11y } }
  snapshot = null
  applyAll()
  writeStored()
  emit()
  if (opts.persist !== false) persist(out)
  return getPrefs()
}

// Fire-and-forget; the choice is already live and stored. A refused save
// (offline, signed out, endpoint not deployed yet) is swallowed, and an accent
// change additionally tries the older accent endpoint so it still follows the
// user across devices on a server that predates /profile/prefs.
function persist(out) {
  pending = { ...pending, ...out, ...(out.a11y ? { a11y: { ...(pending.a11y || {}), ...out.a11y } } : {}) }
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const body = pending; pending = {}
    if (!body || Object.keys(body).length === 0) return
    const fallback = () => {
      if (!Object.prototype.hasOwnProperty.call(body, 'accent')) return
      try { if (typeof api.workSetAccent === 'function') Promise.resolve(api.workSetAccent(body.accent)).catch(() => {}) } catch { /* ignore */ }
    }
    try {
      if (typeof api.workSetPrefs !== 'function') { fallback(); return }
      Promise.resolve(api.workSetPrefs(body)).catch(fallback)
    } catch { fallback() }
  }, PERSIST_DELAY_MS)
}

// A product shell (the signed-in app) calls setInProduct(true) on mount and
// false on unmount, so the user's theme mode paints inside the product only.
export function setInProduct(on) {
  inProduct = !!on
  applyThemeMode()
}
export function isInProduct() { return inProduct }
