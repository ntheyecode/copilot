// URL helpers shared by every surface that turns a step's target into a link:
// the guiding console and its floating panel (Guiding.jsx), the work dashboard
// and the public "try it on your task, live" widget. One definition (SUPREME
// RULE II); pure functions with no imports, so the public bundle can take them
// without dragging the app's capture/scrub helpers along.

// The host of a URL for a short "Open calendar.google.com" label ('link' when
// the value cannot be parsed).
export const linkHost = (u) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return 'link' } }

// Normalize a step's target into a clickable href, or '' when it is not a URL.
// A full http(s) URL passes through; a bare host like "www.google.com" gets a
// https:// prefix so the link-out works (linkHost threw on the bare form, which
// rendered a broken relative <a href> - the #5 "plain text, no link" bug). A
// value that is not a URL (a command, a menu path) returns '' -> a copy button.
export function hrefForUrl(u) {
  const s = String(u || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (/\s/.test(s)) return ''
  if (/^(localhost|[a-z0-9-]+(\.[a-z0-9-]+)+)(:\d+)?(\/[^\s]*)?$/i.test(s)) return 'https://' + s
  return ''
}

// A click path inside an app ("Settings > Billing > Add card", "View › Week"):
// capitalised labels joined by a chevron. Used to tell a legacy single "cmd"
// field apart from a terminal command, which starts with a lowercase binary.
export const looksLikeClickPath = (s) => /\s(>|›|→)\s/.test(String(s || '')) && /^[A-ZÀ-ɏ]/.test(String(s || '').trim())
