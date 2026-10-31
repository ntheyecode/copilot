// The centered card every onboarding step renders in: brand mark, one H1, one
// subline, the step's content, and the small legal/help links underneath.
// Nothing else (no marketing, no gradients, no step chrome). One primary action
// per screen is the step's job; the shell only frames it.
import { BrandMark as AVMark } from '../../components/brand/BrandLogo.jsx'   // the edition's brand mark
import { useT } from '../../i18n/index.jsx'

export default function OnboardingShell({ title, subtitle, children, aside = null, wide = false }) {
  const t = useT()
  return (
    <div className="ob">
      <main className="ob-main" id="main">
        <div className={`ob-card${wide ? ' ob-card-wide' : ''}`}>
          <a className="ob-brand" href="/" aria-label={t('onboarding.brandAria')}>
            <AVMark size={22} id="avob" glow={false} />
            <span className="ob-brand-t">Work<i>CoPilot</i></span>
            <span className="ob-brand-by">{t('onboarding.byAdmireVeda')}</span>
          </a>
          {aside}
          {title && <h1 className="ob-h1">{title}</h1>}
          {subtitle && <p className="ob-sub">{subtitle}</p>}
          {children}
        </div>
        <nav className="ob-foot" aria-label={t('onboarding.footerAria')}>
          <a href="/workcopilot/terms" target="_blank" rel="noopener">{t('onboarding.footer.terms')}</a>
          <a href="/workcopilot/privacy" target="_blank" rel="noopener">{t('onboarding.footer.privacy')}</a>
          <a href="/workcopilot/faq" target="_blank" rel="noopener">{t('onboarding.footer.help')}</a>
        </nav>
      </main>
    </div>
  )
}
