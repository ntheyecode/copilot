// Respond in the user's language: one prepended prompt instruction, shared by
// every AI prompt builder (moved out of work.js so small modules can use it
// without importing the whole guidance engine).

// ---- Respond in the user's language --------------------------------------
// The client picks a UI language and sends its locale with each guidance call.
// We turn that locale into ONE prepended instruction telling the model to write
// its prose in that language, while leaving everything exact (commands, code,
// paths, URLs, brand/UI names, placeholders) untouched. Everything here is a
// no-op for English / unknown locales, so it stays safe until the client sends
// a locale. Minimal, single source of truth: the map below is the only place
// locale codes are listed, and localeInstruction is the only prompt text.
const LOCALE_LANGUAGE = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', ar: 'Arabic',
  'pt-BR': 'Portuguese', it: 'Italian', ru: 'Russian', tr: 'Turkish',
  hi: 'Hindi', id: 'Indonesian', vi: 'Vietnamese', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean',
}
// Resolve a locale code to a language name, or null when unknown. Tries an exact
// match first, then a case-insensitive match, then the base subtag (so an
// Accept-Language tag like "pt-br", "zh-CN" or "fr-FR" still resolves). Unknown
// locales return null and are treated as English (no instruction is added).
export function languageForLocale(locale) {
  const code = String(locale || '').trim()
  if (!code) return null
  if (LOCALE_LANGUAGE[code]) return LOCALE_LANGUAGE[code]
  const lower = code.toLowerCase()
  for (const k of Object.keys(LOCALE_LANGUAGE)) {
    if (k.toLowerCase() === lower) return LOCALE_LANGUAGE[k]
  }
  const base = lower.split('-')[0]
  for (const k of Object.keys(LOCALE_LANGUAGE)) {
    if (k.toLowerCase().split('-')[0] === base) return LOCALE_LANGUAGE[k]
  }
  return null
}
// The one shared prompt instruction. Empty string for English / unknown locales,
// so prepending it is a safe no-op. Keeps commands, code, paths, URLs, product
// and brand names, English UI labels, and placeholders exactly as-is.
export function localeInstruction(locale) {
  const name = languageForLocale(locale)
  if (!name || name === 'English') return ''
  return 'Respond in ' + name + ' using simple, professional, everyday wording a real ' +
    'person would use. Never translate or alter commands, code, file paths, URLs, product ' +
    'or brand names, on-screen UI labels that appear in English, or placeholders like ' +
    '[[SECRET_1]] - keep all of those exactly as-is.'
}
// Prepend the language instruction to a system prompt (no-op for English/unknown).
export function withLocale(system, locale) {
  const ins = localeInstruction(locale)
  return ins ? ins + '\n\n' + String(system || '') : String(system || '')
}
