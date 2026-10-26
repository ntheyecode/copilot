// Server-side locale registry - a deploy-safe MIRROR of the client's canonical
// src/i18n/locales.js. The server runs raw from /opt/workcopilot/server in
// production and does NOT ship src/, so it must not import the client module
// (that caused an ERR_MODULE_NOT_FOUND boot failure). Keep the CODES here in sync
// with src/i18n/locales.js (16 locales). Only the data + pure helpers the server
// needs live here (code validation for the language endpoint + meta for the
// language-aware email layer); the client-only timezone/detection logic stays in
// src/i18n and is never needed server-side.
export const DEFAULT_LOCALE = 'en'

export const LOCALES = [
  { code: 'en',    name: 'English (US)',       dir: 'ltr', tag: 'en-US', match: ['en-us', 'en'] },
  { code: 'en-GB', name: 'English (UK)',       dir: 'ltr', tag: 'en-GB', match: ['en-gb', 'en-ie', 'en-au', 'en-nz', 'en-za', 'en-in'] },
  { code: 'es',    name: 'Español',            dir: 'ltr', tag: 'es',    match: ['es'] },
  { code: 'fr',    name: 'Français',           dir: 'ltr', tag: 'fr',    match: ['fr'] },
  { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', tag: 'pt-BR', match: ['pt-br', 'pt'] },
  { code: 'it',    name: 'Italiano',           dir: 'ltr', tag: 'it',    match: ['it'] },
  { code: 'de',    name: 'Deutsch',            dir: 'ltr', tag: 'de',    match: ['de'] },
  { code: 'tr',    name: 'Türkçe',             dir: 'ltr', tag: 'tr',    match: ['tr'] },
  { code: 'ru',    name: 'Русский',            dir: 'ltr', tag: 'ru',    match: ['ru'] },
  { code: 'ar',    name: 'العربية',            dir: 'rtl', tag: 'ar',    match: ['ar'] },
  { code: 'hi',    name: 'हिन्दी',              dir: 'ltr', tag: 'hi',    match: ['hi'] },
  { code: 'id',    name: 'Bahasa Indonesia',   dir: 'ltr', tag: 'id',    match: ['id', 'in'] },
  { code: 'vi',    name: 'Tiếng Việt',         dir: 'ltr', tag: 'vi',    match: ['vi'] },
  { code: 'zh',    name: '中文（简体）',         dir: 'ltr', tag: 'zh-CN', match: ['zh-cn', 'zh-hans', 'zh-sg', 'zh'] },
  { code: 'ja',    name: '日本語',              dir: 'ltr', tag: 'ja',    match: ['ja'] },
  { code: 'ko',    name: '한국어',               dir: 'ltr', tag: 'ko',    match: ['ko'] },
]

export const LOCALE_CODES = LOCALES.map((l) => l.code)

export function getLocaleMeta(code) {
  return LOCALES.find((l) => l.code === code) || LOCALES.find((l) => l.code === DEFAULT_LOCALE)
}

// Resolve any BCP-47-ish string ("pt-BR", "zh-Hans-CN", "EN_gb") to a supported
// code, or null when nothing matches. Mirrors the client resolveLocale exactly.
export function resolveLocale(input) {
  if (!input || typeof input !== 'string') return null
  const norm = input.trim().toLowerCase().replace(/_/g, '-')
  if (!norm) return null
  const exact = LOCALES.find((l) => l.code.toLowerCase() === norm)
  if (exact) return exact.code
  for (const l of LOCALES) if (l.match.some((m) => norm === m || norm.startsWith(m + '-'))) return l.code
  const base = norm.split('-')[0]
  for (const l of LOCALES) if (l.match.includes(base)) return l.code
  return null
}
