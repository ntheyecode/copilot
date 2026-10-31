// /workcopilot/signup on an edition without personal sign-up (organizations
// only). Never a silent redirect or a dead end: it says who WorkCoPilot is for
// and offers the two real next steps, talk to us or sign in with a company
// account. The server refuses every sign-up path the same way
// (server/edition.js soloSignupRefusal).
import { Navigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useEditionView } from '../../edition/useCaps.js'
import { useT } from '../../i18n/index.jsx'
import useSeo from '../../useSeo.js'
import OnboardingShell from './OnboardingShell.jsx'
import './onboarding.css'

export default function SignupClosed() {
  const t = useT()
  const ed = useEditionView()
  useSeo({ title: t('edition.signupClosed.metaTitle'), description: t('edition.signupClosed.p'), path: '/workcopilot/signup' })
  // A customer's own install has no sales conversation: its people sign in.
  if (!ed.publicSite) return <Navigate to="/workcopilot" replace />
  return (
    <OnboardingShell title={t('edition.signupClosed.h1')} subtitle={t('edition.signupClosed.p')}>
      <div className="ob-status">
        <Building2 size={24} className="ob-status-ic" aria-hidden="true" />
        <p className="ob-sub">{t('edition.signupClosed.member')}</p>
        <a className="ob-cta" href="/workcopilot/contact">{t('edition.signupClosed.talk')}</a>
        <a className="ob-link" href="/workcopilot">{t('edition.signupClosed.signIn')}</a>
      </div>
    </OnboardingShell>
  )
}
