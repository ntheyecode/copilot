// Step 4: welcome, then into the app. "Get Started" asks the server to open the
// session: with MFA on (the default), the brand-new account sets up its
// authenticator here through the SAME MfaGate + /login/mfa endpoints every login
// uses; an existing account verifies its code. Then the auth context refreshes
// and the app opens, no second login. The `already` variant is for an account
// that already had an active plan (never charged again).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Check } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { useAuth } from '../../auth.jsx'
import { api, friendlyError } from '../../api.js'
import MfaGate from '../../components/MfaGate.jsx'
import { clearIntent } from './planIntent.js'

export default function WelcomeStep({ state, variant = 'welcome', onExpired }) {
  const t = useT()
  const nav = useNavigate()
  const { refresh } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [mfa, setMfa] = useState(null)           // { mode:'setup'|'verify', enroll?, username }
  const [mfaBusy, setMfaBusy] = useState(false)
  const [backupCodes, setBackupCodes] = useState(null)

  const enterApp = async () => {
    clearIntent()
    try { await refresh() } catch { /* the app shell re-checks on mount */ }
    nav('/work', { replace: true })
  }
  const start = async () => {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const r = await api.onboardingEnter()
      if (r && r.mfaSetup) { setMfa({ mode: 'setup', enroll: r.enroll, username: r.username || state.email || '' }); setBusy(false); return }
      if (r && r.mfaRequired) { setMfa({ mode: 'verify', username: r.username || state.email || '' }); setBusy(false); return }
      await enterApp()
    } catch (e) {
      if (e && (e.status === 440 || (e.data && e.data.restart))) { onExpired(); return }
      setErr(friendlyError(e, t('onboarding.errors.generic')))
      setBusy(false)
    }
  }
  // Already-subscribed + signed in: the Stripe customer portal (existing
  // endpoint) to manage or cancel; falls back to the dashboard's billing card.
  const [portalBusy, setPortalBusy] = useState(false)
  const manage = async () => {
    if (portalBusy) return
    setPortalBusy(true)
    try { const r = await api.workBillingPortal(); if (r && r.url) { window.location.assign(r.url); return } } catch { /* fall back below */ }
    setPortalBusy(false)
    nav('/work', { replace: true })
  }
  // MfaGate contract: THROW on a bad code so it shows the message inline.
  const handleMfaSubmit = async (code) => {
    setMfaBusy(true)
    try {
      if (mfa.mode === 'setup') { const r = await api.workLoginMfaSetup(code); setBackupCodes(r.backupCodes || []) }
      else { await api.workLoginMfa(code); await enterApp() }
    } catch (e) {
      if (e && (e.status === 440 || (e.data && e.data.restart))) { setMfa(null); setBackupCodes(null); setErr(t('onboarding.errors.expiredSession')) }
      throw e
    } finally { setMfaBusy(false) }
  }

  if (mfa) {
    return (
      <>
        <h2 className="ob-h2">{t('onboarding.welcome.secureH1')}</h2>
        <p className="ob-sub">{t('onboarding.welcome.secureP')}</p>
        <MfaGate mode={mfa.mode} enroll={mfa.enroll} username={mfa.username} backupCodes={backupCodes} busy={mfaBusy} onSubmit={handleMfaSubmit} onDone={enterApp} />
      </>
    )
  }
  const already = variant === 'already'
  return (
    <div className="ob-status">
      <div className="ob-ok-ic" aria-hidden="true"><Check size={22} /></div>
      <h2 className="ob-h2">{already ? t('onboarding.pay.already.h1') : (state.billingConfigured === false ? t('onboarding.pay.billingOff.h1') : t('onboarding.welcome.h1'))}</h2>
      <p className="ob-sub">{already ? t('onboarding.pay.already.p') : (state.billingConfigured === false ? t('onboarding.pay.billingOff.p') : t('onboarding.welcome.p'))}</p>
      {state.email && <p className="ob-hint ob-center">{t('onboarding.welcome.signedInAs', { email: state.email })}</p>}
      {err && <div className="ob-err" role="alert">{err}</div>}
      <button type="button" className="ob-cta" onClick={start} disabled={busy} autoFocus>
        {busy ? <><Loader2 size={16} className="ob-spin" aria-hidden="true" /> {t('onboarding.welcome.opening')}</> : <>{already ? t('onboarding.pay.already.open') : t('onboarding.welcome.cta')} <ArrowRight size={16} aria-hidden="true" /></>}
      </button>
      {already && state.signedIn && (
        <button type="button" className="ob-link ob-center ob-manage" onClick={manage} disabled={portalBusy}>{t('onboarding.pay.already.manage')}</button>
      )}
    </div>
  )
}
