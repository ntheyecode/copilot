import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import { setScrubEnabled, setGovPolicy } from './scrub.js'
import { initAccent } from './theme/accent.js'

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
      setScrubEnabled(!!(u && u.scrub))   // legacy on/off scrub
      setGovPolicy(u && u.govPolicy)      // armed governance policy: scrub-with-policy or on-device tokenize
      initAccent(u && u.accent)           // per-user dashboard accent (server value, else localStorage)
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

  // Login may not complete immediately: with MFA on, it returns { mfaSetup } (first
  // login - set up an authenticator) or { mfaRequired } (enter a code). Only load
  // the signed-in user once the second factor has actually been satisfied.
  const login = async (username, password) => {
    const r = await api.workLogin(username, password)
    if (r && !r.mfaSetup && !r.mfaRequired) await refresh()
    return r // { user } | { mfaSetup, enroll } | { mfaRequired }
  }
  const signup = async (body) => {
    const r = await api.workSignup(body)
    if (r && !r.mfaSetup && !r.mfaRequired) await refresh()
    return r // always { mfaSetup, enroll } now (MFA on first login)
  }
  // Finish first-login authenticator setup; returns { user, backupCodes }. Does
  // NOT refresh the signed-in user yet - the form shows the one-time backup codes
  // first, then calls refresh() to enter the app (otherwise the app would navigate
  // away before the codes are shown).
  const loginMfaSetup = async (code) => {
    return api.workLoginMfaSetup(code)
  }
  // Verify an authenticator (or backup) code to finish signing in.
  const loginMfa = async (code) => {
    const r = await api.workLoginMfa(code)
    await refresh()
    return r
  }
  const logout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, signup, loginMfa, loginMfaSetup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
