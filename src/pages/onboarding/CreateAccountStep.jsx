// Step 1: create the account. Only what the brief lists: plan summary, Google,
// Microsoft, "or continue with email", email, password (show/hide), the
// agreement line, one CTA, "Already have an account? Sign in". No name, company,
// phone or title. Social buttons leave through the server start URL carrying
// the plan (?flow=onboarding), so the callback lands on the pay step.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { api } from '../../api.js'
import SocialMark from '../../components/SocialMark.jsx'
import PlanSummary from './PlanSummary.jsx'
import PasswordField from './PasswordField.jsx'
import { saveIntent, intentQuery } from './planIntent.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SOCIAL = ['google', 'microsoft']

export default function CreateAccountStep({ state, intent, onIntent, onState, socialError = '' }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(socialError ? { msg: t('onboarding.account.socialErr') } : null)
  const providers = (state && state.providers) || {}
  const signInHref = `/workcopilot/login${intentQuery(intent, { mode: 'signin' })}`

  const startSocial = (id) => {
    saveIntent(intent)
    window.location.assign(api.workSocialOnboardingUrl(id, intent.plan, intent.cycle))
  }
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const em = email.trim().toLowerCase()
    if (!EMAIL_RE.test(em)) { setErr({ msg: t('onboarding.errors.email'), field: 'email' }); return }
    if (pw.length < 8) { setErr({ msg: t('onboarding.errors.password'), field: 'password' }); return }
    if (!agree) { setErr({ msg: t('onboarding.errors.legal'), field: 'legal' }); return }
    setBusy(true); setErr(null)
    try {
      const r = await api.onboardingSignup({ email: em, password: pw, plan: intent.plan || undefined, cycle: intent.cycle || undefined, acceptTerms: true })
      onState(r)   // -> verify step (or resumed)
    } catch (e2) {
      const d = (e2 && e2.data) || {}
      if (e2 && e2.status === 409 && d.accountExists) setErr({ msg: t('onboarding.errors.exists'), exists: true })
      else if (e2 && e2.status === 429) setErr({ msg: t('onboarding.errors.tooMany') })
      else if (e2 && e2.status === 400 && d.field) setErr({ msg: d.field === 'email' ? t('onboarding.errors.email') : t('onboarding.errors.password'), field: d.field })
      else if (e2 && e2.status === 400 && d.legalRequired) setErr({ msg: t('onboarding.errors.legal'), field: 'legal' })
      else setErr({ msg: t('onboarding.errors.generic') })
      setBusy(false)
    }
  }

  return (
    <>
      <PlanSummary state={state} intent={intent} onIntent={onIntent} onState={onState} hasAccount={false} />

      <div className="ob-social">
        {SOCIAL.map((id) => {
          const on = providers[id] === true
          return (
            <button key={id} type="button" className="ob-prov" disabled={!on || busy} onClick={() => on && startSocial(id)} title={on ? undefined : t('onboarding.account.socialSoon')}>
              <SocialMark id={id} /><span>{t(`onboarding.account.${id}`)}</span>{!on && <em>{t('onboarding.account.socialSoon')}</em>}
            </button>
          )
        })}
      </div>

      <div className="ob-or" role="separator" aria-label={t('onboarding.account.or')}><span>{t('onboarding.account.or')}</span></div>

      <form className="ob-form" onSubmit={submit} noValidate aria-busy={busy}>
        <div className="ob-field">
          <label htmlFor="ob-email">{t('onboarding.account.email')}</label>
          <input id="ob-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={t('onboarding.account.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} aria-invalid={err && err.field === 'email' ? true : undefined} aria-describedby={err ? 'ob-err' : undefined} />
        </div>
        <PasswordField id="ob-pw" value={pw} onChange={setPw} label={t('onboarding.account.password')} hint={t('onboarding.account.passwordHint')} disabled={busy} invalid={!!(err && err.field === 'password')} describedBy={err ? 'ob-err' : undefined} />

        <label className={`ob-agree${err && err.field === 'legal' ? ' bad' : ''}`}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={busy} aria-describedby={err && err.field === 'legal' ? 'ob-err' : undefined} />
          <span>{t('onboarding.account.legalPrefix')} <a href="/workcopilot/terms" target="_blank" rel="noopener">{t('onboarding.account.terms')}</a> {t('onboarding.account.and')} <a href="/workcopilot/privacy" target="_blank" rel="noopener">{t('onboarding.account.privacy')}</a></span>
        </label>

        {err && (
          <div id="ob-err" className="ob-err" role="alert">
            {err.msg}{err.exists && <> <Link to={signInHref} className="ob-err-link">{t('onboarding.errors.existsCta')}</Link></>}
          </div>
        )}

        <button type="submit" className="ob-cta" disabled={busy}>
          {busy ? <><Loader2 size={16} className="ob-spin" aria-hidden="true" /> {t('onboarding.account.creating')}</> : <>{t('onboarding.account.cta')} <ArrowRight size={16} aria-hidden="true" /></>}
        </button>
      </form>

      <p className="ob-switch">{t('onboarding.account.haveAccount')} <Link to={signInHref}>{t('onboarding.account.signIn')}</Link></p>
    </>
  )
}
