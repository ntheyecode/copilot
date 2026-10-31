// LinkNotes: HOME. One job per section, one visual per idea (owner's page
// design law), each section its own module under ./home/:
//   HERO      the promise, choose a plan / try it live, trust cues, the guide visual
//   WHO       five segments, one concrete line each
//   PILLARS   productivity, training, enablement
//   HOW       four moves + the honest line
//   BRAIN     the personal brain (dark band)
//   RUNS      Windows app, Android app, browser float
//   PRIVACY   three points + the masking visual
//   PLANS     the plan teaser (live numbers)
//   FINAL     choose a plan / sign in
// plus the live widget (src/components/LiveValidate.jsx), whose plan path
// leads to the LinkNotes pricing page with the recommended plan ribboned.
// Strings: indiv.home.* (src/i18n/locales/en/indivSite.js).
import IndivShell from '../IndivShell.jsx'
import FinalBand from '../FinalBand.jsx'
import LiveValidate from '../../../components/LiveValidate.jsx'
import Hero from './home/Hero.jsx'
import Segments from './home/Segments.jsx'
import Pillars from './home/Pillars.jsx'
import HowStrip from './home/HowStrip.jsx'
import BrainBand from './home/BrainBand.jsx'
import RunsStrip from './home/RunsStrip.jsx'
import PrivacyBand from './home/PrivacyBand.jsx'
import PlansTeaser from './home/PlansTeaser.jsx'
import { usePricing } from '../usePricing.js'
import { SIGN_IN, toPricing } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

export default function Home() {
  const t = useT()
  useSeo(indivSeo(t, 'home'))
  const { model, loading } = usePricing()
  return (
    <IndivShell current="home" revealKey={loading}>
      <Hero t={t} />
      <Segments t={t} />
      <Pillars t={t} />
      <HowStrip t={t} />
      <BrainBand t={t} />
      <RunsStrip t={t} />
      <PrivacyBand t={t} />
      <PlansTeaser t={t} model={model} loading={loading} />
      <FinalBand t={t} id="lnhm-final" h2="indiv.home.final.h2" p="indiv.home.final.p" primary="indiv.home.final.primary" secondary="indiv.home.final.secondary" secondaryHref={SIGN_IN} />
      <LiveValidate toPricing={toPricing} theme="light" source="linknotes" />
    </IndivShell>
  )
}
