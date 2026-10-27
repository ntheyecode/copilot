// WorkCoPilot i18n - a small, dependency-free localization system.
//
// WHY HOMEGROWN: our SCA rule says no new npm dependency when ~200 lines cover
// the need. This gives us: a React context (LocaleProvider), a t() function with
// {var} interpolation, plural forms, inline rich text (<b>, <em>, <a>) rendered
// as React nodes (never innerHTML), per-locale dictionaries loaded lazily, and
// <html lang>/<html dir> management (Arabic is right-to-left).
//
// USAGE
//   const t = useT()
//   t('nav.pricing')                              -> 'Pricing'
//   t('home.fields.sub', { total: 120 })          -> interpolated string
//   t('home.roi.rows')                            -> the translated ARRAY (lists translate as units)
//   t.n('common.hour', 2)                         -> 'hours' plural form ('{n} hours' with _one/_two/_other)
//   t.rich('home.roi.lead')                       -> React nodes; <b>..</b> in the string becomes <b>
//   t.rich('login.newWeb', null, { a: (c) => <a href="...">{c}</a> })
//
// FALLBACK: a key missing in the active locale falls back to English, then to
// the key itself (so a gap is visible, never a blank). Missing keys are logged
// once in dev.
//
// PERSISTENCE: the choice is kept in localStorage under STORAGE_KEY and applied
// before the first paint of the next visit. First visit: navigator.languages.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import enBase from './locales/en.js'
import { deepMergeEn } from './deep_merge_en.js'
import { DEFAULT_LOCALE, LOCALES, getLocaleMeta, resolveLocale, localeFromTimezone, localeFromTimezoneExplicit } from './locales.js'

// Per-section English key partials (src/i18n/locales/en/*.js). This lets MANY i18n
// waves add keys AT THE SAME TIME, each writing its OWN partial file under a distinct
// top-level namespace, without colliding on the single large en.js. Every partial is
// deep-merged into the English base here (eager, since English is the always-bundled
// fallback). A non-English locale that lacks a key still falls back to this merged
// English, so a newly keyed string reads in English until it is translated.
const EN_PARTIALS = import.meta.glob('./locales/en/*.js', { eager: true })
const en = Object.values(EN_PARTIALS).reduce((acc, m) => deepMergeEn(acc, (m && m.default) || {}), { ...enBase })

export { LOCALES, DEFAULT_LOCALE, getLocaleMeta, resolveLocale }

export const STORAGE_KEY = 'wc_locale'

// Lazy per-locale dictionaries: Vite splits each file into its own chunk, so a
// visitor downloads only the language they read. English is bundled (fallback).
const LOADERS = import.meta.glob(['./locales/*.js', '!./locales/en.js'])
const cache = { en }

async function loadDictionary(code) {
  if (cache[code]) return cache[code]
  const loader = LOADERS[`./locales/${code}.js`]
  if (!loader) return en
  try {
    const mod = await loader()
    cache[code] = (mod && mod.default) || en
  } catch {
    cache[code] = en   // network hiccup: keep reading in English rather than blank
  }
  return cache[code]
}

// ---- detection + persistence -------------------------------------------------
export function getStoredLocale() {
  try { return resolveLocale(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

// The signed-in user's PINNED language (first-login attestation). It is the
// HIGHEST-precedence signal: once the app knows who is signed in and that they
// pinned a language, that language supersedes our detection everywhere. It is not
// known until /api/work/me resolves, so the app calls setPinnedUserLocale() with
// the user's code on load (see LanguagePinModal). Module-scoped so detectLocale()
// and getLocale() - which run outside React too (api.js) - honor it immediately.
let pinnedUserLocale = null
export function setPinnedUserLocale(code) {
  pinnedUserLocale = resolveLocale(code) || null
  return pinnedUserLocale
}
export function getPinnedUserLocale() { return pinnedUserLocale }

// The `?lang=<code>` query parameter: the TOP-priority signal, so a shared or
// crawled URL (e.g. https://admireveda.com/workcopilot/pricing?lang=de) renders
// that language deterministically - Google runs our JS, so ?lang=de renders
// German. It beats the stored choice, the browser language and the location, and
// it is PERSISTED (the provider writes `locale` to localStorage on mount), so the
// rest of the visit stays in that language even after the param is gone. We read
// `lang` first, then `hl` (the de-facto web convention) as an alias.
export function localeFromQuery() {
  if (typeof window === 'undefined' || !window.location) return null
  try {
    const q = new URLSearchParams(window.location.search)
    return resolveLocale(q.get('lang')) || resolveLocale(q.get('hl'))
  } catch { return null }
}

export function detectLocale() {
  // 0) A signed-in user's PINNED language supersedes everything (owner: language
  // is pinned at first login and we always honor it). Set once /api/work/me loads.
  if (pinnedUserLocale) return pinnedUserLocale
  // 1) ?lang= wins over the rest and persists (see localeFromQuery).
  const byQuery = localeFromQuery()
  if (byQuery) return byQuery
  const stored = getStoredLocale()
  if (stored) return stored
  // Browser language preference (first supported in the ordered list).
  let byLang = null
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language]
    for (const l of langs) { const hit = resolveLocale(l); if (hit) { byLang = hit; break } }
  } catch { /* no navigator (SSR/test) */ }
  // Where the visitor's LOCATION is an English-professional region that we map
  // deliberately (India, Pakistan, Singapore, UK, Anglophone Africa, the US, ...),
  // English is the default EVEN IF the browser is set to a non-English language:
  // those markets use the product in English, and a Hindi (or other) browser
  // locale there is not a request for the product in that language. The visitor
  // can still choose any language from the menu, which is stored and wins above.
  // Owner rule: India -> English by default. We use the EXPLICIT mapping (null when
  // unmapped) so an unmapped zone still lets a supported browser language through.
  const tzExplicit = localeFromTimezoneExplicit()
  if (tzExplicit === 'en' || tzExplicit === 'en-GB') return tzExplicit
  // Elsewhere a deliberate non-English browser language is an explicit preference
  // and wins over location; otherwise the visitor's location decides (English for
  // unmapped/English-professional zones, the local professional language for
  // Japan / Germany / Brazil / ...). localeFromTimezone always resolves to en-GB.
  if (byLang && byLang !== 'en' && byLang !== 'en-GB') return byLang
  return localeFromTimezone() || byLang || 'en-GB'
}

// The locale to send to the server (plan / coverage requests) - usable outside
// React, e.g. from api.js. Falls back to the detected one.
export function getLocale() {
  return getStoredLocale() || detectLocale()
}

// Warm the active locale's dictionary into the module cache BEFORE first paint,
// so a non-English visitor never flashes a frame of English fallback on load or
// on a full-page navigation: LocaleProvider initializes its dict from `cache`,
// which is already populated once this resolves. Safe to await in the entrypoint
// - it never rejects (loadDictionary swallows a failed import and keeps English).
export async function preloadActiveLocale() {
  try { const code = getLocale(); await loadDictionary(code); return code } catch { return null }
}

// <html lang> + <html dir>. Arabic flips the document to right-to-left; every
// other supported locale is left-to-right. Also sets a data-locale attribute so
// CSS can target a language if it ever needs to (e.g. a font stack).
export function applyDocumentLocale(code) {
  if (typeof document === 'undefined') return
  const meta = getLocaleMeta(code)
  const el = document.documentElement
  el.setAttribute('lang', meta.tag)
  el.setAttribute('dir', meta.dir)
  el.setAttribute('data-locale', meta.code)
}

// ---- lookup helpers ----------------------------------------------------------
function lookup(dict, key) {
  if (!dict) return undefined
  let cur = dict
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[part]
  }
  return cur
}

const warned = new Set()
function warnMissing(locale, key) {
  if (!import.meta.env || !import.meta.env.DEV) return
  const k = locale + ':' + key
  if (warned.has(k)) return
  warned.add(k)
  console.warn(`[i18n] missing key "${key}" for locale "${locale}" (fell back)`)
}

export function interpolate(str, vars) {
  if (typeof str !== 'string' || !vars) return str
  return str.replace(/\{(\w+)\}/g, (m, name) => (vars[name] == null ? m : String(vars[name])))
}

// Inline rich text: "<b>bold</b> and <em>gradient</em> and <a>link</a>" ->
// React nodes. Tags are rendered by `tags[name](children)` when provided,
// otherwise b/strong/em/i/u/s/small/code map to their HTML element and any
// other unknown tag just renders its text. One level of nesting is enough for
// our copy; it is a parser for OUR strings, not arbitrary HTML.
const DEFAULT_TAGS = {
  b: (c) => <b>{c}</b>, strong: (c) => <strong>{c}</strong>, em: (c) => <em>{c}</em>, i: (c) => <i>{c}</i>,
  u: (c) => <u>{c}</u>, s: (c) => <s>{c}</s>, small: (c) => <small>{c}</small>, code: (c) => <code>{c}</code>,
}
export function renderRich(str, tags) {
  if (typeof str !== 'string') return str
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g
  const out = []
  let last = 0, m, i = 0
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index))
    const name = m[1]
    const fn = (tags && tags[name]) || DEFAULT_TAGS[name]
    const inner = renderRich(m[2], tags)
    out.push(<React.Fragment key={i++}>{fn ? fn(inner) : inner}</React.Fragment>)
    last = m.index + m[0].length
  }
  if (last < str.length) out.push(str.slice(last))
  return out.length === 1 ? out[0] : out
}

// Build a translator for a (dictionary, locale) pair. Pure, so it also works
// outside React (e.g. tests or non-component code).
export function makeT(dict, locale) {
  const get = (key) => {
    let v = lookup(dict, key)
    if (v === undefined && dict !== en) { v = lookup(en, key); if (v !== undefined) warnMissing(locale, key) }
    if (v === undefined) { warnMissing(locale, key); return key }
    return v
  }
  // t(key, vars) is the normal call. As a convenience a page may pass an inline
  // English fallback string as the 2nd arg - t(key, fallback, vars) - so a key
  // not yet in any dictionary reads as that fallback instead of the raw key
  // (SUPREME RULE III: never a silent blank). An object 2nd arg is vars, exactly
  // as before (backward compatible), so this ONE translator serves every surface
  // and no page needs its own fallback wrapper.
  const t = (key, a, b) => {
    const hasFb = typeof a === 'string'
    const vars = hasFb ? b : a
    if (hasFb && lookup(dict, key) === undefined && lookup(en, key) === undefined) return interpolate(a, vars)
    const v = get(key)
    return typeof v === 'string' ? interpolate(v, vars) : v
  }
  // Plural: key_one / key_two (optional) / key_other, with {n} available.
  t.n = (key, n, vars) => {
    const form = n === 1 ? 'one' : n === 2 ? 'two' : 'other'
    let v = lookup(dict, `${key}_${form}`)
    if (v === undefined && form === 'two') v = lookup(dict, `${key}_other`)
    if (v === undefined) v = lookup(en, `${key}_${form}`) ?? lookup(en, `${key}_other`)
    if (v === undefined) return `${n}`
    return interpolate(v, { n, ...(vars || {}) })
  }
  t.rich = (key, vars, tags) => renderRich(t(key, vars), tags)
  t.has = (key) => lookup(dict, key) !== undefined
  t.locale = locale
  return t
}

// ---- React -------------------------------------------------------------------
const LocaleContext = createContext(null)

export function LocaleProvider({ children, initial }) {
  const [locale, setLocaleState] = useState(() => initial || detectLocale())
  const [dict, setDict] = useState(() => cache[locale] || en)
  const [loading, setLoading] = useState(() => !cache[locale])

  // Reflect the locale on <html> immediately and persist it.
  useEffect(() => {
    applyDocumentLocale(locale)
    try { localStorage.setItem(STORAGE_KEY, locale) } catch { /* private window */ }
  }, [locale])

  // Load the dictionary (no-op for English and anything already cached).
  useEffect(() => {
    let alive = true
    if (cache[locale]) { setDict(cache[locale]); setLoading(false); return undefined }
    setLoading(true)
    loadDictionary(locale).then((d) => { if (alive) { setDict(d); setLoading(false) } })
    return () => { alive = false }
  }, [locale])

  const setLocale = useCallback((code) => {
    const next = resolveLocale(code)
    if (next) setLocaleState(next)
  }, [])

  const t = useMemo(() => makeT(dict, locale), [dict, locale])
  const meta = getLocaleMeta(locale)
  const value = useMemo(() => ({ locale, setLocale, t, dir: meta.dir, tag: meta.tag, meta, loading, locales: LOCALES }), [locale, setLocale, t, meta, loading])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (ctx) return ctx
  // Rendered outside the provider (a stray test harness): behave as English so
  // nothing blanks - never throw in the UI.
  return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: makeT(en, DEFAULT_LOCALE), dir: 'ltr', tag: 'en-US', meta: getLocaleMeta(DEFAULT_LOCALE), loading: false, locales: LOCALES }
}

export function useT() { return useLocale().t }
