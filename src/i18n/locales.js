// i18n locale registry - the ONE list of languages the site and app support
// (SUPREME RULE II: single source). Every consumer (LanguageMenu, the provider,
// the detector, the lazy dictionary loader) reads from here; nothing else
// enumerates locale codes.
//
//   code    stable key, also the dictionary file name (src/i18n/locales/<code>.js)
//           and the value persisted in localStorage / sent to the server.
//   name    the language in ITS OWN language (what the menu shows).
//   dir     'ltr' | 'rtl' - applied to <html dir>.
//   tag     BCP-47 tag for <html lang> and Intl formatting.
//   match   navigator.language prefixes that resolve to this locale, most
//           specific first (so 'pt-BR' wins over 'pt', 'en-GB' over 'en').
export const DEFAULT_LOCALE = 'en'

export const LOCALES = [
  { code: 'en',    name: 'English (US)',      dir: 'ltr', tag: 'en-US', match: ['en-us', 'en'] },
  { code: 'en-GB', name: 'English (UK)',      dir: 'ltr', tag: 'en-GB', match: ['en-gb', 'en-ie', 'en-au', 'en-nz', 'en-za', 'en-in'] },
  { code: 'es',    name: 'Español',           dir: 'ltr', tag: 'es',    match: ['es'] },
  { code: 'fr',    name: 'Français',          dir: 'ltr', tag: 'fr',    match: ['fr'] },
  { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', tag: 'pt-BR', match: ['pt-br', 'pt'] },
  { code: 'it',    name: 'Italiano',          dir: 'ltr', tag: 'it',    match: ['it'] },
  { code: 'de',    name: 'Deutsch',           dir: 'ltr', tag: 'de',    match: ['de'] },
  { code: 'tr',    name: 'Türkçe',            dir: 'ltr', tag: 'tr',    match: ['tr'] },
  { code: 'ru',    name: 'Русский',           dir: 'ltr', tag: 'ru',    match: ['ru'] },
  { code: 'ar',    name: 'العربية',           dir: 'rtl', tag: 'ar',    match: ['ar'] },
  { code: 'hi',    name: 'हिन्दी',             dir: 'ltr', tag: 'hi',    match: ['hi'] },
  { code: 'id',    name: 'Bahasa Indonesia',  dir: 'ltr', tag: 'id',    match: ['id', 'in'] },
  { code: 'vi',    name: 'Tiếng Việt',        dir: 'ltr', tag: 'vi',    match: ['vi'] },
  { code: 'zh',    name: '中文（简体）',        dir: 'ltr', tag: 'zh-CN', match: ['zh-cn', 'zh-hans', 'zh-sg', 'zh'] },
  { code: 'ja',    name: '日本語',             dir: 'ltr', tag: 'ja',    match: ['ja'] },
  { code: 'ko',    name: '한국어',              dir: 'ltr', tag: 'ko',    match: ['ko'] },
]

export const LOCALE_CODES = LOCALES.map((l) => l.code)

export function getLocaleMeta(code) {
  return LOCALES.find((l) => l.code === code) || LOCALES.find((l) => l.code === DEFAULT_LOCALE)
}

// Resolve any BCP-47-ish string ("pt-BR", "zh-Hans-CN", "EN_gb") to a supported
// code, or null when nothing matches. Exact code first, then the match list,
// then the bare language subtag.
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
