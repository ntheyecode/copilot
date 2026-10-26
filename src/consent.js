// WorkCoPilot - cookie / storage consent (GDPR / CCPA), dependency-free.
//
// WHAT WE ACTUALLY SET (audited):
//   - express-session cookie 'workcopilot.sid'  -> STRICTLY NECESSARY (sign-in).
//     Always allowed; sign-in must keep working, so it is never gated.
//   - 'affref' referral cookie (server/affiliate.js) -> NON-ESSENTIAL
//     (Analytics / Attribution). Gated behind consent: the server only sets it
//     when this module has recorded attribution consent, and the client sets it
//     (from a captured ?ref) only after consent. Revoked -> deleted.
//   - localStorage keys (wc_locale, theme, guide font scale, pet/char, lead +
//     anon id, coach flags, wc_open, product key, ...) -> first-party FUNCTIONAL.
//
// THREE CATEGORIES: necessary (locked on), functional, analytics (attribution).
// The choice lives in localStorage under CONSENT_KEY, and a COPY of the decision
// is mirrored into a first-party 'wc_consent' cookie so the server can read the
// attribution bit on a referral hit. A consent record is itself exempt (you must
// be able to store the choice), so that cookie is allowed before any decision.
//
// Reject must be as easy as Accept (same one click) - the banner wires both to
// writeConsent() with all-off vs all-on.

export const CONSENT_KEY = 'wc_consent_v1'
export const CONSENT_COOKIE = 'wc_consent'
export const CONSENT_VERSION = 1
export const CATEGORIES = ['necessary', 'functional', 'analytics']
export const PENDING_REF_KEY = 'wc_pending_ref'
const CHANGE_EVENT = 'wc:consent-change'
const OPEN_EVENT = 'wc:open-consent'

// ---- low-level cookie helpers (first-party, path=/) --------------------------
function setCookie(name, value, days) {
  try {
    const maxAge = Math.round((days || 180) * 24 * 3600)
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`
  } catch { /* no document / blocked */ }
}
function getCookie(name) {
  try {
    for (const part of String(document.cookie || '').split(';')) {
      const [k, ...v] = part.trim().split('=')
      if (k === name) return decodeURIComponent(v.join('=') || '')
    }
  } catch { /* noop */ }
  return ''
}
function delCookie(name) {
  try { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax` } catch { /* noop */ }
}

// ---- read -------------------------------------------------------------------
// Returns the stored decision at the CURRENT version, or null if none / stale.
export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (!c || c.version !== CONSENT_VERSION) return null
    return { version: CONSENT_VERSION, necessary: true, functional: !!c.functional, analytics: !!c.analytics, ts: c.ts || null }
  } catch { return null }
}

export function hasDecision() { return readConsent() != null }

export function allows(category) {
  if (category === 'necessary') return true
  const c = readConsent()
  return !!(c && c[category])
}

// ---- write ------------------------------------------------------------------
// Persist the decision (localStorage + mirror cookie), run side effects, and
// notify listeners. `necessary` is always true.
export function writeConsent({ functional = false, analytics = false } = {}) {
  const decision = { version: CONSENT_VERSION, necessary: true, functional: !!functional, analytics: !!analytics, ts: new Date().toISOString() }
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(decision)) } catch { /* private window */ }
  // Mirror a compact, server-readable record (exempt consent cookie), 1 year.
  setCookie(CONSENT_COOKIE, `v${CONSENT_VERSION}:n1:f${decision.functional ? 1 : 0}:a${decision.analytics ? 1 : 0}`, 365)
  applyAttribution(decision.analytics)
  try { window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: decision })) } catch { /* noop */ }
  return decision
}

export const acceptAll = () => writeConsent({ functional: true, analytics: true })
export const rejectNonEssential = () => writeConsent({ functional: false, analytics: false })

// ---- attribution (affref) side effect ---------------------------------------
// With attribution consent, promote a captured referral code to the affref
// cookie so the server can bind it at signup. Without it, drop affref + pending.
function applyAttribution(analytics) {
  if (analytics) {
    const ref = pendingRef()
    if (ref) setCookie('affref', ref, 180)
  } else {
    delCookie('affref')
    try { sessionStorage.removeItem(PENDING_REF_KEY) } catch { /* noop */ }
  }
}

function pendingRef() {
  let code = ''
  try {
    const q = new URLSearchParams(window.location.search)
    code = (q.get('ref') || '').toUpperCase().slice(0, 16)
  } catch { /* noop */ }
  if (!code) { try { code = (sessionStorage.getItem(PENDING_REF_KEY) || '').toUpperCase().slice(0, 16) } catch { /* noop */ } }
  return code
}

// Capture a ?ref=CODE referral on load WITHOUT setting a non-essential cookie
// yet: hold it in sessionStorage (transient, per-tab, cleared on close). If
// attribution is already consented, promote it to the affref cookie now. Call
// once from the app shell. Returns the captured code (or '').
export function capturePendingRef() {
  let code = ''
  try {
    const q = new URLSearchParams(window.location.search)
    code = (q.get('ref') || '').toUpperCase().slice(0, 16)
  } catch { /* noop */ }
  if (code) { try { sessionStorage.setItem(PENDING_REF_KEY, code) } catch { /* noop */ } }
  if (allows('analytics')) applyAttribution(true)
  return code
}

// ---- open the preferences panel (footer link, re-open) -----------------------
export function openPreferences() {
  try { window.dispatchEvent(new CustomEvent(OPEN_EVENT)) } catch { /* noop */ }
}

export const CONSENT_CHANGE_EVENT = CHANGE_EVENT
export const CONSENT_OPEN_EVENT = OPEN_EVENT
