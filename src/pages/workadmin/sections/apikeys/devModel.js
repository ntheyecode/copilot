// Pure helpers shared by the company console's API keys and Webhooks sections
// (sections/ApiKeys.jsx, sections/Webhooks.jsx): label lookup for the server's
// scope / event registries, the closed option sets (expiry, rotation grace),
// IP-list parsing, status derivation and the error-code -> i18n-key map. No
// React, no I/O. The server registries (api_scopes.js, webhook_events.js) are
// the single source of ids; this file only decides how an id reads on screen.

// 'brain:query' -> 'brain_query', 'workflow.published' -> 'workflow_published'
export const labelKeyOf = (id) => String(id || '').replace(/[:.]/g, '_')

// A registry entry reads from the catalog key when the active locale has it,
// else from the server's English description, else the raw id (never blank).
export function registryLabel(t, ns, entry) {
  const id = entry && entry.id != null ? String(entry.id) : ''
  const key = `${ns}.${labelKeyOf(id)}`
  if (id && t.has(key)) return t(key)
  return (entry && entry.description) || id
}

// Expiry choices for a new key (days; null = never). Ids are the catalog keys.
export const EXPIRY_OPTIONS = [
  { id: 'd30', days: 30 },
  { id: 'd90', days: 90 },
  { id: 'd365', days: 365 },
  { id: 'never', days: null },
]
// How long the previous key keeps working after a rotation (minutes).
export const GRACE_OPTIONS = [
  { id: 'none', minutes: 0 },
  { id: 'h1', minutes: 60 },
  { id: 'h24', minutes: 1440 },
]

// "203.0.113.4, 198.51.100.0/24\n2001:db8::/32" -> unique trimmed entries.
export function parseIpList(text) {
  const seen = new Set()
  return String(text || '').split(/[\n,;]+/).map((s) => s.trim()).filter((s) => {
    if (!s || seen.has(s)) return false
    seen.add(s); return true
  })
}

// Light client-side shape check so an obvious typo is caught before the round
// trip; the server stays the authority (BAD_IP).
const V4 = /^(\d{1,3})(\.\d{1,3}){3}(\/\d{1,2})?$/
const V6 = /^[0-9a-f:]+(\/\d{1,3})?$/i
export const looksLikeIp = (s) => V4.test(s) || (s.includes(':') && V6.test(s))

// A key's effective status: the server's word, except an active key past its
// expiry reads as expired even before the server sweeps it.
export function keyStatus(k) {
  const s = (k && k.status) || 'active'
  if (s === 'active' && k && k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return 'expired'
  return s
}
export const STATUS_BADGE = { active: 'active', revoked: 'canceled', expired: 'paused' }

// Active keys first, then newest first.
export function sortKeys(keys) {
  const rank = (k) => (keyStatus(k) === 'active' ? 0 : 1)
  return [...(Array.isArray(keys) ? keys : [])].sort((a, b) => rank(a) - rank(b) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function hostOf(url) {
  try { return new URL(String(url)).host } catch { return String(url || '') }
}
export const isHttpsUrl = (s) => { try { const u = new URL(String(s || '').trim()); return u.protocol === 'https:' && !!u.host } catch { return false } }

// Server error code -> the catalog key under `<ns>.err.*`; null when the code
// is unknown (the caller falls back to the server's own 4xx sentence).
const CODE_KEY = {
  BAD_NAME: 'name', BAD_SCOPES: 'scopes', BAD_EXPIRY: 'expiry', BAD_IP: 'ip',
  BAD_URL: 'url', BAD_EVENTS: 'events', NOT_FOUND: 'notFound', KEY_REVOKED: 'revoked',
  LIMIT_REACHED: 'limit', STEP_UP_REQUIRED: 'stepUp',
}
export const codeOf = (err) => (err && err.data && err.data.code) || ''
export const isStepUp = (err) => !!err && err.status === 401 && codeOf(err) === 'STEP_UP_REQUIRED'
// 429 after too many wrong codes: the step-up is locked (~15 min). The UI shows
// the server's sentence calmly, disables the code field and never retries.
export const isStepUpLocked = (err) => codeOf(err) === 'STEP_UP_LOCKED'
export const stepUpLockedText = (t, err) => (err && err.message) || t('apiKeys.err.stepUpLocked')
// 429 on webhook test / retry: too many deliveries waiting (a gentle notice).
export const isQueueFull = (err) => codeOf(err) === 'QUEUE_FULL'
export function errorText(t, ns, err) {
  const k = CODE_KEY[codeOf(err)]
  if (k && t.has(`${ns}.err.${k}`)) return t(`${ns}.err.${k}`)
  const status = err && err.status
  if (typeof status === 'number' && status >= 400 && status < 500 && err.message) return err.message
  return t(`${ns}.err.generic`)
}

// Dates: a short absolute date, a date+time, and a relative "3 hours ago" in the
// active locale (Intl, so no library), falling back to the absolute form.
export function fmtDate(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d)) return ''
  try { return d.toLocaleDateString(locale || undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d.toDateString() }
}
export function fmtDateTime(iso, locale) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d)) return ''
  try { return d.toLocaleString(locale || undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return d.toString() }
}
export function fmtRelative(iso, locale, now = Date.now()) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d)) return ''
  const diff = (d.getTime() - now) / 1000
  const abs = Math.abs(diff)
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  try {
    const rtf = new Intl.RelativeTimeFormat(locale || undefined, { numeric: 'auto' })
    for (const [unit, secs] of units) if (abs >= secs) return rtf.format(Math.round(diff / secs), unit)
    return rtf.format(Math.round(diff), 'second')
  } catch { return fmtDateTime(iso, locale) }
}
