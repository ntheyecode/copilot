// The sign-in HOP for a launch link. A launch URL is <origin>/work/launch#<token>:
// the token rides in the fragment so no server or log ever sees it. When the
// person is not signed in yet, the normal sign-in page cannot carry a fragment
// back, so the token is parked in sessionStorage (this tab only, short-lived)
// for exactly that hop, and the login page's routing effect sends the person
// back to /work/launch where it is taken (and cleared) again. Pure storage
// helpers; no React.
const KEY = 'wc_launch'
const TTL_MS = 15 * 60 * 1000

export function stashLaunchToken(token) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ token: String(token), until: Date.now() + TTL_MS })) } catch { /* private window: the hash path still works */ }
}
export function peekLaunchToken() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return ''
    const v = JSON.parse(raw)
    if (!v || !v.token || !(v.until > Date.now())) { clearLaunchToken(); return '' }
    return String(v.token)
  } catch { return '' }
}
export function clearLaunchToken() { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } }
export const hasLaunchHop = () => !!peekLaunchToken()

// The token from the current URL fragment ("#<token>" or "#token=<token>").
export function tokenFromHash(hash) {
  const h = String(hash || '').replace(/^#/, '').trim()
  if (!h) return ''
  if (h.startsWith('token=')) { try { return decodeURIComponent(h.slice(6)) } catch { return h.slice(6) } }
  return h
}
