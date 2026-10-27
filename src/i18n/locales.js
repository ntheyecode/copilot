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

// ---- Location signal: the browser's IANA time zone ---------------------------
// A privacy-safe, client-side proxy for the visitor's LOCATION (no IP, nothing
// sent anywhere, no dependency): Intl...timeZone is where the device is, which
// usually matches the country.
//
// LOGIC (owner): map a zone to its PROFESSIONAL / business language, not simply
// the majority native tongue.
//   - A country gets a non-English language ONLY where that language (one we
//     support) is the professional language: Japan->ja, Germany->de, Brazil->
//     pt-BR, Spain/LatAm->es, Russia->ru, Turkey->tr, Japan/Korea/China/etc.
//   - Where ENGLISH is the professional language (India, Pakistan, Singapore,
//     Nigeria, the Philippines, Hong Kong, the UK, ...), OR we do not support the
//     local language, show ENGLISH: US English for the USA & Canada, UK English
//     everywhere else. Unmapped zones therefore default to en-GB.
// So India -> English (not Hindi); Hindi stays reachable via a Hindi browser
// language or the menu. A supported non-English BROWSER language still wins over
// location (handled in detectLocale) - an explicit preference is honored.
const TZ_LOCALE = {
  // India & neighbours: English is the professional/business lingua franca.
  'Asia/Kolkata': 'en-GB', 'Asia/Calcutta': 'en-GB', 'Asia/Kathmandu': 'en-GB', 'Asia/Thimphu': 'en-GB',
  // Japanese / Korean
  'Asia/Tokyo': 'ja', 'Asia/Seoul': 'ko', 'Asia/Pyongyang': 'ko',
  // Simplified Chinese (mainland + Macau; Singapore/Hong Kong use English in business)
  'Asia/Shanghai': 'zh', 'Asia/Chongqing': 'zh', 'Asia/Chungking': 'zh', 'Asia/Harbin': 'zh', 'Asia/Urumqi': 'zh', 'Asia/Macau': 'zh', 'Asia/Macao': 'zh',
  // Indonesian
  'Asia/Jakarta': 'id', 'Asia/Pontianak': 'id', 'Asia/Makassar': 'id', 'Asia/Jayapura': 'id',
  // Vietnamese
  'Asia/Ho_Chi_Minh': 'vi', 'Asia/Saigon': 'vi',
  // Turkish
  'Europe/Istanbul': 'tr', 'Asia/Istanbul': 'tr',
  // Russian (Russia + much of the CIS)
  'Europe/Moscow': 'ru', 'Europe/Samara': 'ru', 'Europe/Volgograd': 'ru', 'Europe/Saratov': 'ru', 'Europe/Astrakhan': 'ru', 'Europe/Ulyanovsk': 'ru', 'Europe/Kaliningrad': 'ru', 'Europe/Kirov': 'ru', 'Europe/Minsk': 'ru', 'Asia/Yekaterinburg': 'ru', 'Asia/Omsk': 'ru', 'Asia/Novosibirsk': 'ru', 'Asia/Novokuznetsk': 'ru', 'Asia/Krasnoyarsk': 'ru', 'Asia/Irkutsk': 'ru', 'Asia/Chita': 'ru', 'Asia/Yakutsk': 'ru', 'Asia/Vladivostok': 'ru', 'Asia/Magadan': 'ru', 'Asia/Sakhalin': 'ru', 'Asia/Kamchatka': 'ru', 'Asia/Anadyr': 'ru', 'Asia/Almaty': 'ru', 'Asia/Tashkent': 'ru',
  // German
  'Europe/Berlin': 'de', 'Europe/Vienna': 'de', 'Europe/Zurich': 'de', 'Europe/Busingen': 'de', 'Europe/Vaduz': 'de', 'Europe/Luxembourg': 'de',
  // French
  'Europe/Paris': 'fr', 'Europe/Monaco': 'fr', 'Indian/Reunion': 'fr', 'America/Martinique': 'fr', 'America/Guadeloupe': 'fr',
  // Italian
  'Europe/Rome': 'it', 'Europe/Vatican': 'it', 'Europe/San_Marino': 'it', 'Europe/Malta': 'it',
  // Portuguese (Brazil)
  'America/Sao_Paulo': 'pt-BR', 'America/Bahia': 'pt-BR', 'America/Fortaleza': 'pt-BR', 'America/Recife': 'pt-BR', 'America/Belem': 'pt-BR', 'America/Maceio': 'pt-BR', 'America/Manaus': 'pt-BR', 'America/Cuiaba': 'pt-BR', 'America/Porto_Velho': 'pt-BR', 'America/Boa_Vista': 'pt-BR', 'America/Rio_Branco': 'pt-BR', 'America/Noronha': 'pt-BR', 'Europe/Lisbon': 'pt-BR', 'Atlantic/Azores': 'pt-BR', 'Atlantic/Madeira': 'pt-BR',
  // Spanish (Spain + Spanish-speaking Latin America)
  'Europe/Madrid': 'es', 'Africa/Ceuta': 'es', 'Atlantic/Canary': 'es', 'America/Mexico_City': 'es', 'America/Monterrey': 'es', 'America/Merida': 'es', 'America/Cancun': 'es', 'America/Chihuahua': 'es', 'America/Hermosillo': 'es', 'America/Mazatlan': 'es', 'America/Tijuana': 'es', 'America/Bogota': 'es', 'America/Lima': 'es', 'America/Santiago': 'es', 'America/Argentina/Buenos_Aires': 'es', 'America/Argentina/Cordoba': 'es', 'America/Argentina/Mendoza': 'es', 'America/Caracas': 'es', 'America/La_Paz': 'es', 'America/Guayaquil': 'es', 'America/Asuncion': 'es', 'America/Montevideo': 'es', 'America/Guatemala': 'es', 'America/Tegucigalpa': 'es', 'America/Managua': 'es', 'America/Costa_Rica': 'es', 'America/Panama': 'es', 'America/El_Salvador': 'es', 'America/Santo_Domingo': 'es', 'America/Havana': 'es', 'America/Puerto_Rico': 'es',
  // Arabic (MENA)
  'Asia/Riyadh': 'ar', 'Asia/Dubai': 'ar', 'Asia/Qatar': 'ar', 'Asia/Bahrain': 'ar', 'Asia/Kuwait': 'ar', 'Asia/Baghdad': 'ar', 'Asia/Amman': 'ar', 'Asia/Beirut': 'ar', 'Asia/Damascus': 'ar', 'Asia/Aden': 'ar', 'Asia/Muscat': 'ar', 'Africa/Cairo': 'ar', 'Africa/Tripoli': 'ar', 'Africa/Tunis': 'ar', 'Africa/Algiers': 'ar', 'Africa/Casablanca': 'ar', 'Africa/Khartoum': 'ar',
  // English as the professional language: UK English (en-GB). UK/Ireland,
  // Oceania, South Asia, SE-Asian English hubs (Singapore/Malaysia/Philippines/
  // Hong Kong), and Anglophone Africa.
  'Europe/London': 'en-GB', 'Europe/Dublin': 'en-GB', 'Europe/Isle_of_Man': 'en-GB', 'Europe/Jersey': 'en-GB', 'Europe/Guernsey': 'en-GB', 'Europe/Gibraltar': 'en-GB',
  'Australia/Sydney': 'en-GB', 'Australia/Melbourne': 'en-GB', 'Australia/Brisbane': 'en-GB', 'Australia/Perth': 'en-GB', 'Australia/Adelaide': 'en-GB', 'Australia/Hobart': 'en-GB', 'Pacific/Auckland': 'en-GB',
  'Asia/Karachi': 'en-GB', 'Asia/Dhaka': 'en-GB', 'Asia/Colombo': 'en-GB', 'Asia/Singapore': 'en-GB', 'Asia/Kuala_Lumpur': 'en-GB', 'Asia/Kuching': 'en-GB', 'Asia/Manila': 'en-GB', 'Asia/Hong_Kong': 'en-GB',
  'Africa/Johannesburg': 'en-GB', 'Africa/Lagos': 'en-GB', 'Africa/Nairobi': 'en-GB', 'Africa/Accra': 'en-GB', 'Africa/Kampala': 'en-GB', 'Africa/Dar_es_Salaam': 'en-GB', 'Africa/Lusaka': 'en-GB', 'Africa/Harare': 'en-GB', 'Africa/Kigali': 'en-GB', 'Africa/Gaborone': 'en-GB',
  // US English (en) for the USA & Canada (owner).
  'America/New_York': 'en', 'America/Detroit': 'en', 'America/Chicago': 'en', 'America/Denver': 'en', 'America/Phoenix': 'en', 'America/Los_Angeles': 'en', 'America/Anchorage': 'en', 'America/Toronto': 'en', 'America/Vancouver': 'en', 'America/Edmonton': 'en', 'America/Winnipeg': 'en', 'America/Halifax': 'en', 'America/St_Johns': 'en', 'Pacific/Honolulu': 'en',
}

// Best-effort supported locale for the device's time zone, or null.
export function localeFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return null
    if (TZ_LOCALE[tz]) return TZ_LOCALE[tz]
    // Owner: a country whose language we do not support - or where English is the
    // professional language - shows English. US/Canada are mapped to US English
    // above; every other unmapped zone defaults to UK English. (A supported
    // non-English browser language still wins over this in detectLocale.)
    return 'en-GB'
  } catch { return 'en-GB' }
}

// The EXPLICIT time-zone mapping, with NO default: the supported locale a zone is
// deliberately mapped to, or null when the zone is not in the table. detectLocale
// uses this to tell a CONFIDENT region (e.g. India -> English) from an unmapped
// zone that merely falls back to English, so that in an English-professional
// region English wins even over a non-English browser language, while an unmapped
// zone still lets a supported browser language through (owner: India -> English by
// default; do not regress unmapped regions).
export function localeFromTimezoneExplicit() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return (tz && TZ_LOCALE[tz]) || null
  } catch { return null }
}
