// /workcopilot/signup[/verify|/pay|/welcome] - the subscribe onboarding host.
//
// The SERVER state decides which step renders (GET /api/work/onboarding/state);
// the URL only mirrors it, so a refresh, the back button, a closed browser or a
// provider redirect always land on the right screen and never re-run a finished
// step. Transitions use replace, so the flow is one history entry and Back
// returns to where the visitor came from (pricing). The plan intent travels
// URL -> localStorage -> the account record (planIntent.js + the server).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import useSeo from '../../useSeo.js'
import OnboardingShell from './OnboardingShell.jsx'
import CreateAccountStep from './CreateAccountStep.jsx'
import VerifyEmailStep from './VerifyEmailStep.jsx'
import PaymentStep from './PaymentStep.jsx'
import WelcomeStep from './WelcomeStep.jsx'
import useOnboarding from './useOnboarding.js'
import { resolveIntent, intentQuery } from './planIntent.js'
import './onboarding.css'

const STEP_PATH = { account: '/workcopilot/signup', verify: '/workcopilot/signup/verify', pay: '/workcopilot/signup/pay', welcome: '/workcopilot/signup/welcome' }

export default function OnboardingPage() {
  const t = useT()
  const nav = useNavigate()
  const { step: urlStep } = useParams()
  const [sp] = useSearchParams()
  useSeo({ title: t('onboarding.meta.title'), description: t('onboarding.meta.description'), path: '/workcopilot/signup' })

  // The intent for this load (URL wins, else the saved copy); editable by the plan picker.
  const [intent, setIntent] = useState(() => resolveIntent(sp))
  const { state, error, apply } = useOnboarding(intent)
  const [expired, setExpired] = useState(false)
  const [justActivated, setJustActivated] = useState(false)
  const checkoutParam = sp.get('checkout') || ''
  const sessionId = sp.get('session_id') || ''
  const socialError = sp.get('social_error') || ''

  // Which screen the server state maps to.
  const screen = useMemo(() => {
    if (!state) return null
    if (expired) return 'expired'
    if (state.step === 'account') return 'account'
    if (state.step === 'verify') return 'verify'
    if (state.step === 'pay') return 'pay'
    // 'active': the welcome after a fresh activation, or "already have a plan".
    if (justActivated || state.fresh) return 'welcome'
    return 'already'
  }, [state, expired, justActivated])

  // Keep the URL in step with the screen (replace: one history entry for the flow).
  useEffect(() => {
    if (!screen || screen === 'expired') return
    const want = screen === 'already' ? 'welcome' : screen
    const cur = urlStep || 'account'
    if (cur === want) return
    // Leaving the pay step drops the Stripe return params; the intent query stays
    // on the account step only (after that the server holds the plan).
    const q = want === 'account' ? intentQuery(intent) : ''
    nav(STEP_PATH[want] + q, { replace: true })
  }, [screen, urlStep])   // eslint-disable-line react-hooks/exhaustive-deps

  const onExpired = () => setExpired(true)
  const onIntent = (next) => setIntent((prev) => ({ ...prev, ...next }))

  if (!state) {
    return (
      <OnboardingShell>
        <div className="ob-status" role="status" aria-live="polite">
          <Loader2 size={24} className="ob-spin ob-status-ic" aria-hidden="true" />
          {error && <p className="ob-sub">{t('onboarding.errors.generic')}</p>}
        </div>
      </OnboardingShell>
    )
  }
  if (screen === 'expired') {
    return (
      <OnboardingShell title={t('onboarding.account.h1')}>
        <div className="ob-err" role="alert">{t('onboarding.errors.expiredSession')}</div>
        <a className="ob-cta" href={`/workcopilot/signup${intentQuery(intent)}`}>{t('onboarding.errors.startOver')}</a>
        <p className="ob-switch">{t('onboarding.account.haveAccount')} <a href={`/workcopilot/login${intentQuery(intent, { mode: 'signin' })}`}>{t('onboarding.account.signIn')}</a></p>
      </OnboardingShell>
    )
  }
  if (screen === 'account') {
    return (
      <OnboardingShell title={t('onboarding.account.h1')} subtitle={t('onboarding.account.sub')}>
        <CreateAccountStep state={state} intent={intent} onIntent={onIntent} onState={apply} socialError={socialError} />
      </OnboardingShell>
    )
  }
  if (screen === 'verify') {
    return (
      <OnboardingShell title={t('onboarding.verify.h1')} subtitle={t('onboarding.verify.p')}>
        <VerifyEmailStep state={state} onState={apply} onExpired={onExpired} />
      </OnboardingShell>
    )
  }
  if (screen === 'pay') {
    const confirming = checkoutParam === 'success' && !!sessionId
    return (
      <OnboardingShell title={confirming ? null : t('onboarding.pay.h1')} subtitle={confirming ? null : t('onboarding.pay.sub')}>
        <PaymentStep state={state} intent={intent} onIntent={onIntent} onState={apply} onExpired={onExpired}
          onActivated={(r) => { setJustActivated(true); apply(r) }}
          checkoutParam={checkoutParam} sessionId={sessionId} />
      </OnboardingShell>
    )
  }
  return (
    <OnboardingShell>
      <WelcomeStep state={state} variant={screen === 'already' ? 'already' : 'welcome'} onExpired={onExpired} />
    </OnboardingShell>
  )
}
