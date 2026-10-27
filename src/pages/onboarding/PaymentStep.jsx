// Step 3: payment. One CTA to Stripe Checkout; back from Stripe this screen
// CONFIRMS with the server (which asks Stripe), polling while a webhook or an
// async payment method settles, and shows honest states: confirming, delayed,
// canceled (retry without re-registering), expired, already subscribed. The
// button is disabled while a session is being created, and the server reuses
// one open Checkout Session, so a double click never makes two.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, Lock, RefreshCw } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { api, friendlyError } from '../../api.js'
import PlanSummary from './PlanSummary.jsx'

const POLL_MS = 3000
const POLL_MAX = 20   // ~60 s of automatic checks before "check again"

export default function PaymentStep({ state, intent, onIntent, onState, onActivated, onExpired, checkoutParam = '', sessionId = '' }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // confirm phases: '' | 'confirming' | 'delayed' | 'expired' | 'invalid' | 'canceled'
  const [phase, setPhase] = useState(checkoutParam === 'success' && sessionId ? 'confirming' : checkoutParam === 'cancel' ? 'canceled' : '')
  const polls = useRef(0)
  const timer = useRef(null)

  // One polling run per 'confirming' phase. `alive` is flipped by the cleanup so
  // a request that resolves after a phase change / unmount can neither set state
  // nor re-arm the timer (no leaked polls).
  useEffect(() => {
    if (phase !== 'confirming') return undefined
    let alive = true
    polls.current = 0
    const confirm = async () => {
      try {
        const r = await api.onboardingConfirm(sessionId)
        if (!alive) return
        if (r.status === 'active') { onActivated(r); return }
        if (r.status === 'expired') { setPhase('expired'); return }
      } catch (e) {
        if (!alive) return
        if (e && (e.status === 440 || (e.data && e.data.restart))) { onExpired(); return }
        // A definitive refusal (bad or foreign reference) is not transient: stop.
        if (e && e.status >= 400 && e.status < 500) { setPhase('invalid'); return }
      }
      polls.current += 1
      if (polls.current >= POLL_MAX) { setPhase('delayed'); return }
      timer.current = setTimeout(confirm, POLL_MS)   // open / processing / transient: keep checking
    }
    confirm()
    return () => { alive = false; if (timer.current) clearTimeout(timer.current) }
  }, [phase])   // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const r = await api.onboardingCheckout()
      if (r && r.url) { window.location.assign(r.url); return }
      setErr(t('onboarding.errors.generic')); setBusy(false)
    } catch (e) {
      const d = (e && e.data) || {}
      if (e && (e.status === 440 || d.restart)) { onExpired(); return }
      if (d.alreadySubscribed || d.needsVerification) { const s = await api.onboardingState().catch(() => null); if (s) onState(s); setBusy(false); return }
      if (d.needsPlan) setErr(t('onboarding.pay.needsPlan'))
      else if (d.annualUnavailable) { setErr(t('onboarding.plan.annualUnavailable')); try { const s = await api.onboardingPlan(state.plan, 'monthly'); onState(s) } catch { /* shown above */ } }
      else setErr(friendlyError(e, t('onboarding.errors.generic')))
      setBusy(false)
    }
  }
  const checkAgain = () => { polls.current = 0; setPhase('confirming') }

  if (phase === 'confirming') {
    return (
      <div className="ob-status" role="status" aria-live="polite">
        <Loader2 size={26} className="ob-spin ob-status-ic" aria-hidden="true" />
        <h2 className="ob-h2">{t('onboarding.pay.confirmingH1')}</h2>
        <p className="ob-sub">{t('onboarding.pay.confirmingP')}</p>
      </div>
    )
  }
  if (phase === 'delayed') {
    return (
      <div className="ob-status" role="status" aria-live="polite">
        <h2 className="ob-h2">{t('onboarding.pay.delayedH1')}</h2>
        <p className="ob-sub">{t('onboarding.pay.delayedP')}</p>
        <button type="button" className="ob-cta" onClick={checkAgain}><RefreshCw size={16} aria-hidden="true" /> {t('onboarding.pay.retryConfirm')}</button>
      </div>
    )
  }

  const canceled = phase === 'canceled'
  const expired = phase === 'expired' || phase === 'invalid'
  return (
    <>
      {(canceled || expired) && (
        <div className="ob-banner" role="status">
          <b>{t('onboarding.pay.canceledH1')}</b>
          <span>{phase === 'invalid' ? t('onboarding.pay.invalidP') : expired ? t('onboarding.pay.expiredP') : t('onboarding.pay.canceledP')}</span>
        </div>
      )}
      <PlanSummary state={state} intent={intent} onIntent={onIntent} onState={onState} hasAccount />
      {err && <div className="ob-err" role="alert">{err}</div>}
      <button type="button" className="ob-cta" onClick={pay} disabled={busy || !state.plan}>
        {busy ? <><Loader2 size={16} className="ob-spin" aria-hidden="true" /> {t('onboarding.pay.opening')}</>
          : <>{canceled || expired ? t('onboarding.pay.retry') : t('onboarding.pay.cta')} <ArrowRight size={16} aria-hidden="true" /></>}
      </button>
      <p className="ob-secure"><Lock size={12} aria-hidden="true" /> {t('onboarding.pay.secureNote')}</p>
      <p className="ob-hint ob-center">{t('onboarding.pay.promo')}</p>
    </>
  )
}
