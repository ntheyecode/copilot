// Step 2: verify the email with the six-digit code. Autofocused, paste-friendly,
// auto-submits at six digits. Resend with a visible cooldown, change-email
// inline, a spam hint, and clear expired / locked / invalid handling. The plan
// is already on the account, so nothing here depends on the URL.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { api } from '../../api.js'
import OtpInput from './OtpInput.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function VerifyEmailStep({ state, onState, onExpired }) {
  const t = useT()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)      // { msg, reason, attemptsLeft }
  const [notice, setNotice] = useState('')
  const [wait, setWait] = useState(Math.ceil(((state && state.otp && state.otp.resendInMs) || state.resendInMs || 0) / 1000))
  const [changing, setChanging] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const submitting = useRef(false)

  // Countdown for the resend cooldown.
  useEffect(() => {
    if (wait <= 0) return undefined
    const id = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [wait > 0])   // eslint-disable-line react-hooks/exhaustive-deps

  const expired = (e) => e && (e.status === 440 || (e.data && e.data.restart))
  const verify = async (value) => {
    const v = (value || code).replace(/\D/g, '')
    if (v.length !== 6 || submitting.current) return
    submitting.current = true
    setBusy(true); setErr(null); setNotice('')
    try {
      const r = await api.onboardingVerify(v)
      onState(r)
    } catch (e) {
      if (expired(e)) { onExpired(); return }
      const d = (e && e.data) || {}
      const reason = d.reason || (e && e.status === 429 ? 'tooMany' : 'generic')
      const msg = reason === 'expired' ? t('onboarding.verify.expired')
        : reason === 'locked' ? t('onboarding.verify.locked')
          : reason === 'missing' ? t('onboarding.verify.missing')
            : reason === 'invalid' ? t('onboarding.verify.invalid')
              : reason === 'tooMany' ? t('onboarding.errors.tooMany')
                : t('onboarding.errors.generic')
      setErr({ msg, reason, attemptsLeft: d.attemptsLeft })
      setCode('')
    } finally { setBusy(false); submitting.current = false }
  }
  const resend = async () => {
    if (wait > 0 || busy) return
    setBusy(true); setErr(null); setNotice('')
    try {
      const r = await api.onboardingResend()
      setWait(Math.ceil((r.resendInMs || 45000) / 1000)); setNotice(t('onboarding.verify.resent')); setCode('')
    } catch (e) {
      if (expired(e)) { onExpired(); return }
      const d = (e && e.data) || {}
      if (e && e.status === 429 && d.resendInMs) setWait(Math.ceil(d.resendInMs / 1000))
      else if (e && e.status === 409 && d.verified) { const r = await api.onboardingState().catch(() => null); if (r) onState(r) }
      else setErr({ msg: (e && e.status === 429) ? t('onboarding.errors.tooMany') : t('onboarding.errors.generic') })
    } finally { setBusy(false) }
  }
  const changeEmail = async (e) => {
    e.preventDefault()
    const em = newEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(em)) { setEmailErr(t('onboarding.errors.email')); return }
    setBusy(true); setEmailErr('')
    try {
      const r = await api.onboardingChangeEmail(em)
      onState(r); setChanging(false); setNewEmail(''); setCode(''); setErr(null)
      setWait(Math.ceil((r.resendInMs || 45000) / 1000)); setNotice(t('onboarding.verify.resent'))
    } catch (e2) {
      if (expired(e2)) { onExpired(); return }
      const d = (e2 && e2.data) || {}
      setEmailErr(e2 && e2.status === 409 ? (d.verified ? t('onboarding.errors.generic') : t('onboarding.errors.exists')) : t('onboarding.errors.email'))
    } finally { setBusy(false) }
  }
  const canRetry = err && (err.reason === 'expired' || err.reason === 'locked' || err.reason === 'missing')

  return (
    <>
      <p className="ob-sent">{t('onboarding.verify.sentTo', { email: state.email || '' })}</p>

      {changing ? (
        <form className="ob-form" onSubmit={changeEmail} noValidate aria-busy={busy}>
          <div className="ob-field">
            <label htmlFor="ob-new-email">{t('onboarding.verify.newEmail')}</label>
            <input id="ob-new-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required disabled={busy} autoFocus aria-invalid={emailErr ? true : undefined} aria-describedby={emailErr ? 'ob-email-err' : undefined} />
          </div>
          {emailErr && <div id="ob-email-err" className="ob-err" role="alert">{emailErr}</div>}
          <button type="submit" className="ob-cta" disabled={busy}>{busy ? <Loader2 size={16} className="ob-spin" aria-hidden="true" /> : null} {t('onboarding.verify.updateEmail')}</button>
          <button type="button" className="ob-link ob-center" onClick={() => { setChanging(false); setEmailErr('') }} disabled={busy}>{t('onboarding.verify.cancel')}</button>
        </form>
      ) : (
        <form className="ob-form" onSubmit={(e) => { e.preventDefault(); verify() }} noValidate aria-busy={busy}>
          <OtpInput id="ob-code" value={code} onChange={(v) => { setCode(v); if (err) setErr(null) }} onComplete={verify} label={t('onboarding.verify.codeLabel')} invalid={!!err} describedBy={err ? 'ob-code-err' : 'ob-code-hint'} disabled={busy} />
          <div id="ob-code-hint" className="ob-hint ob-center">{t('onboarding.verify.codeHint')}</div>
          {err && (
            <div id="ob-code-err" className="ob-err" role="alert">
              {err.msg}{err.reason === 'invalid' && typeof err.attemptsLeft === 'number' && err.attemptsLeft > 0 && <> {t('onboarding.verify.attemptsLeft', { n: err.attemptsLeft })}</>}
            </div>
          )}
          {notice && <div className="ob-ok" role="status">{notice}</div>}
          <button type="submit" className="ob-cta" disabled={busy || code.length !== 6}>
            {busy ? <><Loader2 size={16} className="ob-spin" aria-hidden="true" /> {t('onboarding.verify.checking')}</> : <>{t('onboarding.verify.cta')} <ArrowRight size={16} aria-hidden="true" /></>}
          </button>
          <div className="ob-verify-actions">
            <button type="button" className={`ob-link${canRetry ? ' ob-link-strong' : ''}`} onClick={resend} disabled={wait > 0 || busy} aria-live="polite">
              {wait > 0 ? t('onboarding.verify.resendIn', { s: wait }) : t('onboarding.verify.resend')}
            </button>
            <span className="ob-dot" aria-hidden="true">&middot;</span>
            <button type="button" className="ob-link" onClick={() => { setChanging(true); setNotice('') }} disabled={busy}>{t('onboarding.verify.changeEmail')}</button>
          </div>
          <p className="ob-hint ob-center">{t('onboarding.verify.spam')}</p>
        </form>
      )}
    </>
  )
}
