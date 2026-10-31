// Hero of /workcopilot/company-brain: what the Company Brain is in one line,
// the two CTAs (talk to us, see how it works), four proof lines, and the one
// hero visual: a guided step as a person sees it, with the company document
// it came from and the private-to-your-company badge. Copy: companyBrainPage.hero.*
import { BrainCircuit, ArrowRight, Check, Lock, BookOpen, ScanEye } from 'lucide-react'
import { CONTACT_PATH } from '../../edition/surfaces.js'
import { useT } from '../../i18n/index.jsx'
import { HL } from './rich.jsx'

function HeroCard() {
  const t = useT()
  const c = (k) => t(`companyBrainPage.hero.card.${k}`)
  return (
    <div className="wcb-card" role="img" aria-label={c('aria')}>
      <div className="wcb-card-bar" aria-hidden="true">
        <i /><i /><i />
        <b>{c('app')}</b>
        <span className="wcb-card-lock"><Lock size={11} /> {c('private')}</span>
      </div>
      <div className="wcb-card-body" aria-hidden="true">
        <span className="wcb-card-k">{c('step')}</span>
        <div className="wcb-card-step"><p>{c('title')}</p></div>
        <div className="wcb-card-from"><BookOpen size={14} /> {c('from')}</div>
        <div className="wcb-card-check"><ScanEye size={14} /> {c('check')}</div>
      </div>
    </div>
  )
}

export default function BrainHero() {
  const t = useT()
  return (
    <section className="wcb-hero">
      <div className="wcb-wrap wcb-hero-in">
        <div>
          <div className="wcb-eyebrow"><BrainCircuit size={14} aria-hidden="true" /> {t('companyBrainPage.hero.eyebrow')}</div>
          <h1>{t.rich('companyBrainPage.hero.h1', null, HL)}</h1>
          <p className="wcb-sub">{t('companyBrainPage.hero.sub')}</p>
          <div className="wcb-ctas">
            <a className="wcb-cta" href={CONTACT_PATH}>{t('companyBrainPage.hero.cta')} <ArrowRight size={16} aria-hidden="true" /></a>
            <a className="wcb-cta alt" href="#how">{t('companyBrainPage.hero.ctaHow')} <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <ul className="wcb-proof" aria-label={t('companyBrainPage.hero.proofAria')}>
            {t('companyBrainPage.hero.proof').map((p) => <li key={p}><Check size={14} aria-hidden="true" /> {p}</li>)}
          </ul>
        </div>
        <HeroCard />
      </div>
    </section>
  )
}
