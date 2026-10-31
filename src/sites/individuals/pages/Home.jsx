// Individuals site: HOME. Sections, each with one job and one visual:
//   HERO     the promise, two CTAs, three trust cues, the guide-on-screen visual
//   WHO      five cards: freelancers, students, job seekers, solo businesses, switchers
//   HOW      four moves, one honest line
//   HOURS    pay for guided time: the plan teaser (live numbers)
//   PRIVACY  three points + the masking visual
//   FINAL    choose a plan / sign in
// Strings: indiv.home.* (src/i18n/locales/en/indivSite.js).
import { ArrowRight, Check, Briefcase, GraduationCap, Search, Store, Compass, MessageSquare, MousePointerClick, ScanEye, FileCheck2 } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import GuideScreen from '../visuals/GuideScreen.jsx'
import MaskVisual from '../visuals/MaskVisual.jsx'
import PlanCards from '../PlanCards.jsx'
import { usePricing } from '../usePricing.js'
import { START, SIGN_IN } from '../IndivHeader.jsx'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const WHO_ICONS = [Briefcase, GraduationCap, Search, Store, Compass]
const HOW_ICONS = [MessageSquare, MousePointerClick, ScanEye, FileCheck2]

export default function Home() {
  const t = useT()
  useSeo(indivSeo(t, 'home'))
  const { model, loading } = usePricing()
  const who = t('indiv.home.who.cards') || []
  const how = t('indiv.home.how.steps') || []
  const priv = t('indiv.home.privacy.points') || []
  return (
    <IndivShell current="home" revealKey={loading}>
      <style>{CSS}</style>
      <section className="ivhm-hero iv-wrap" aria-labelledby="ivhm-h1">
        <div className="ivhm-copy">
          <div className="iv-eyebrow">{t('indiv.home.hero.eyebrow')}</div>
          <h1 id="ivhm-h1">{t.rich('indiv.home.hero.h1')}</h1>
          <p className="ivhm-lead">{t('indiv.home.hero.p')}</p>
          <div className="iv-ctas">
            <a className="iv-btn primary" href={START}>{t('indiv.home.hero.primary')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a>
            <a className="iv-btn ghost" href="/workcopilot/how-it-works">{t('indiv.home.hero.secondary')}</a>
          </div>
          <ul className="ivhm-trust" aria-label={t('indiv.home.hero.eyebrow')}>
            {(t('indiv.home.hero.trust') || []).map((s) => <li key={s}><Check size={14} aria-hidden /> {s}</li>)}
          </ul>
        </div>
        <div className="ivhm-visual"><GuideScreen /></div>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivhm-who">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivhm-who" eyebrow="indiv.home.who.eyebrow" h2="indiv.home.who.h2" />
          <div className="iv-grid c5">
            {who.map((c, i) => { const Ic = WHO_ICONS[i] || Briefcase; return (
              <article className="iv-card flat" key={c.t} data-reveal>
                <span className="iv-ic"><Ic size={20} aria-hidden /></span>
                <h3>{c.t}</h3><p>{c.d}</p>
              </article>
            ) })}
          </div>
          <div className="ivhm-more"><a className="iv-btn ghost sm" href="/workcopilot/use-cases">{t('indiv.home.who.cta')} <ArrowRight size={14} aria-hidden className="iv-arrow" /></a></div>
        </div>
      </section>

      <section className="iv-sec" aria-labelledby="ivhm-how">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivhm-how" eyebrow="indiv.home.how.eyebrow" h2="indiv.home.how.h2" />
          <ol className="ivhm-steps">
            {how.map((s, i) => { const Ic = HOW_ICONS[i] || Check; return (
              <li key={s.t} className="iv-card" data-reveal>
                <span className="ivhm-num" aria-hidden>{i + 1}</span>
                <span className="iv-ic sun"><Ic size={20} aria-hidden /></span>
                <h3>{s.t}</h3><p>{s.d}</p>
              </li>
            ) })}
          </ol>
          <p className="ivhm-honest" data-reveal><ScanEye size={16} aria-hidden /> {t('indiv.home.how.honest')}</p>
        </div>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivhm-hours">
        <div className="iv-wrap">
          <div className="ivhm-hours-head" data-reveal>
            <div>
              <div className="iv-eyebrow">{t('indiv.home.hours.eyebrow')}</div>
              <h2 id="ivhm-hours">{t.rich('indiv.home.hours.h2')}</h2>
              <p>{t('indiv.home.hours.p')}</p>
            </div>
            <a className="iv-btn mint" href="/workcopilot/pricing">{t('indiv.home.hours.cta')} <ArrowRight size={15} aria-hidden className="iv-arrow" /></a>
          </div>
          <PlanCards model={model} loading={loading} compact />
        </div>
      </section>

      <section className="iv-sec" aria-labelledby="ivhm-priv">
        <div className="iv-wrap iv-band">
          <div data-reveal>
            <div className="iv-eyebrow">{t('indiv.home.privacy.eyebrow')}</div>
            <h2 id="ivhm-priv">{t.rich('indiv.home.privacy.h2')}</h2>
            <ul className="ivhm-priv">
              {priv.map((p) => <li key={p.t}><Check size={16} aria-hidden /><div><b>{p.t}</b><span>{p.d}</span></div></li>)}
            </ul>
            <a className="iv-btn ghost sm" href="/workcopilot/security">{t('indiv.home.privacy.cta')} <ArrowRight size={14} aria-hidden className="iv-arrow" /></a>
          </div>
          <div className="iv-band-visual" data-reveal><MaskVisual compact /></div>
        </div>
      </section>

      <section className="iv-sec tight" aria-labelledby="ivhm-final">
        <div className="iv-wrap">
          <div className="iv-final" data-reveal>
            <h2 id="ivhm-final">{t.rich('indiv.home.final.h2')}</h2>
            <p>{t('indiv.home.final.p')}</p>
            <div className="iv-ctas">
              <a className="iv-btn primary" href={START}>{t('indiv.home.final.primary')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a>
              <a className="iv-btn ghost" href={SIGN_IN}>{t('indiv.home.final.secondary')}</a>
            </div>
          </div>
        </div>
      </section>
    </IndivShell>
  )
}

const CSS = `
.ivhm-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:40px;align-items:center;padding-block:64px 72px;position:relative}
.ivhm-hero::before{content:"";position:absolute;inset:-40px -20% auto -20%;height:420px;background:radial-gradient(600px 300px at 20% 30%,var(--iv-sun),transparent 70%),radial-gradient(500px 260px at 85% 20%,var(--iv-mint-soft),transparent 70%);z-index:-1;pointer-events:none}
.ivhm-lead{font-size:18px;margin:18px 0 26px;max-width:52ch}
.ivhm-trust{list-style:none;margin:26px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px 22px}
.ivhm-trust li{display:flex;align-items:center;gap:7px;font-size:14px;font-weight:600;color:var(--iv-ink-2)}
.ivhm-trust li svg{color:var(--iv-mint-ink)}
.ivhm-visual{min-width:0;padding-top:16px}
.ivhm-more{margin-top:22px}
.ivhm-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;counter-reset:s}
.ivhm-steps li{position:relative}
.ivhm-num{position:absolute;top:18px;inset-inline-end:18px;font-family:var(--iv-display);font-size:34px;font-weight:800;color:var(--iv-line-2);line-height:1}
.ivhm-honest{margin-top:22px;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:var(--iv-ink);padding:14px 18px;border-radius:14px;background:var(--iv-mint-soft)}
.ivhm-honest svg{color:var(--iv-mint-ink);flex:0 0 auto}
.ivhm-hours-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:30px;flex-wrap:wrap}
.ivhm-hours-head>div{max-width:600px}
.ivhm-hours-head p{margin-top:12px;font-size:17px}
.ivhm-hours-head .iv-btn{flex:0 0 auto}
.ivhm-priv{list-style:none;margin:22px 0 26px;padding:0;display:flex;flex-direction:column;gap:16px}
.ivhm-priv li{display:flex;gap:12px;align-items:flex-start}
.ivhm-priv li>svg{flex:0 0 auto;margin-top:3px;color:var(--iv-mint-ink)}
.ivhm-priv b{display:block;font-size:16px;color:var(--iv-ink)}
.ivhm-priv span{display:block;font-size:15px;color:var(--iv-ink-2);margin-top:2px;line-height:1.5}
@media (max-width:980px){.ivhm-hero{grid-template-columns:1fr;gap:28px;padding-block:44px 56px}.ivhm-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.ivhm-steps{grid-template-columns:1fr}.ivhm-lead{font-size:16.5px}.ivhm-hours-head .iv-btn{width:100%}}
`
