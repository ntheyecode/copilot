import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import { setScrubEnabled } from './scrub.js'

// ---------------------------------------------------------------------------
// WorkCoPilot auth - work-only, no 2FA, no multi-product entitlement. A
// WorkCoPilot account IS the account. Session hydrates from /api/work/me; a
// signed-in user is whatever that endpoint returns as { signedIn, access, user }.
// ---------------------------------------------------------------------------
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false) // false until the first /api/work/me check resolves

  const refresh = useCallback(async () => {
    try {
      const r = await api.workMe()
      const u = (r && r.signedIn && r.user) ? r.user : null
      setUser(u)
      setScrubEnabled(!!(u && u.scrub))   // apply the user's superadmin-set PII/PHI scrub policy client-side
    } catch (e) {
      // Only a DEFINITIVE server refusal ends the session: we reached the server
      // and it said no (401 not-signed-in / 403 suspended). A transient network
      // error (offline, DNS blip, aborted request) has no e.status, and must NOT
      // null an established user.
      if (e && e.status) setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  // Hydrate once on mount.
  useEffect(() => { refresh() }, [refresh])

  // Refresh the instant this window/tab regains focus - the desktop shell runs
  // the dashboard and the buddy window as separate OS windows sharing one
  // session, so a sign-in in one is picked up by the other without a reload.
  useEffect(() => {
    const onFocus = () => refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const login = async (username, password) => {
    const r = await api.workLogin(username, password)
    await refresh()
    return r // { user }
  }
  const signup = async (username, password) => {
    const r = await api.workSignup(username, password)
    await refresh()
    return r // { user }
  }
  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
