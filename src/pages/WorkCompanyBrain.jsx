// WorkCoPilot - the Company Brain (dedicated public page of the organization
// site, /workcopilot/company-brain; route needs companies, so the individuals
// site never serves it). Linked from the home page's Company Brain section
// and the site footer.
//
// The page is thin wiring: SEO, the shared header, the sections (each its own
// module in src/pages/company_brain/), the shared footer. Copy lives in
// src/i18n/locales/en/companyBrainPage.js, whose header carries the honesty
// contract (every claim names the code it rests on; nothing designed-only is
// claimed). No prices anywhere: every call to action is the sales conversation.
import SiteHeader from '../components/SiteHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import useSeo from '../useSeo.js'
import { useT } from '../i18n/index.jsx'
import { CSS } from './company_brain/company_brain.css.js'
import BrainHero from './company_brain/BrainHero.jsx'
import BrainLearns from './company_brain/BrainLearns.jsx'
import BrainUsed from './company_brain/BrainUsed.jsx'
import BrainHow from './company_brain/BrainHow.jsx'
import BrainControl from './company_brain/BrainControl.jsx'
import BrainLeaders from './company_brain/BrainLeaders.jsx'
import BrainFinal from './company_brain/BrainFinal.jsx'

export const COMPANY_BRAIN_PATH = '/workcopilot/company-brain'

export default function WorkCompanyBrain() {
  const t = useT()
  useSeo({
    title: t('companyBrainPage.seo.title'),
    description: t('companyBrainPage.seo.description'),
    path: COMPANY_BRAIN_PATH,
  })
  return (
    <div className="wcb">
      <style>{CSS}</style>
      <SiteHeader />
      <div className="wcb-bg" aria-hidden />
      <BrainHero />
      <main className="wcb-wrap wcb-main">
        <BrainLearns />
        <BrainUsed />
        <BrainHow />
        <BrainControl />
        <BrainLeaders />
        <BrainFinal />
      </main>
      <SiteFooter />
    </div>
  )
}
