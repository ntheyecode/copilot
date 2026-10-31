// Closing band of /workcopilot/company-brain: the promise, "Talk to us"
// (the corporate site's one call to action, no prices) and the link to the
// full enterprise control list. Copy: companyBrainPage.final.*
import { ArrowRight } from 'lucide-react'
import { CONTACT_PATH } from '../../edition/surfaces.js'
import { useT } from '../../i18n/index.jsx'

export default function BrainFinal() {
  const t = useT()
  return (
    <section className="wcb-final">
      <h2>{t('companyBrainPage.final.h2')}</h2>
      <p>{t('companyBrainPage.final.p')}</p>
      <div className="wcb-ctas center">
        <a className="wcb-cta big" href={CONTACT_PATH}>{t('companyBrainPage.final.cta')} <ArrowRight size={17} aria-hidden="true" /></a>
        <a className="wcb-cta alt" href="/workcopilot/enterprise">{t('companyBrainPage.final.ctaEnterprise')} <ArrowRight size={15} aria-hidden="true" /></a>
      </div>
    </section>
  )
}
