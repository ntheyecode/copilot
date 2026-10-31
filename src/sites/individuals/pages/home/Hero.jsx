// Home HERO: the promise, two calls to action (choose a plan; try it live,
// which opens the live widget), three trust cues and the guide-on-screen
// visual on a lavender stage. The band is the soft lavender-to-white gradient
// with faint arcs; the floating header sits over it. Strings: indiv.home.hero.*.
import { ArrowRight, Check, Zap } from 'lucide-react'
import HeroScreen from '../../visuals/HeroScreen.jsx'
import { START, openLiveWidget } from '../../links.js'

export default function Hero({ t }) {
  return (
    <section className="lnhm-hero" aria-labelledby="lnhm-h1">
      <style>{CSS}</style>
      <div className="ln-wrap lnhm-hero-in">
        <div className="lnhm-copy">
          <div className="ln-eyebrow">{t('indiv.home.hero.eyebrow')}</div>
          <h1 id="lnhm-h1">{t.rich('indiv.home.hero.h1')}</h1>
          <p className="lnhm-lead">{t('indiv.home.hero.p')}</p>
          <div className="ln-ctas">
            <a className="ln-btn primary" href={START}>{t('indiv.home.hero.primary')} <ArrowRight size={16} aria-hidden className="ln-arrow" /></a>
            <button type="button" className="ln-btn lime" onClick={openLiveWidget}><Zap size={16} aria-hidden /> {t('indiv.common.tryLive')}</button>
          </div>
          <ul className="lnhm-trust" aria-label={t('indiv.home.hero.eyebrow')}>
            {(t('indiv.home.hero.trust') || []).map((s) => <li key={s}><span className="ln-tick soft"><Check size={12} aria-hidden /></span> {s}</li>)}
          </ul>
        </div>
        <div className="lnhm-visual"><div className="ln-stage lnhm-stage"><HeroScreen /></div></div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-hero{position:relative;margin-top:-86px;padding-block:150px 96px;background:linear-gradient(180deg,#ebe9fb 0%,#f5f4fd 55%,#ffffff 100%);overflow:hidden}
.lnhm-hero::before{content:"";position:absolute;inset:0;background:var(--ln-arcs);pointer-events:none}
.lnhm-hero-in{position:relative;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:56px;align-items:center}
.lnhm-copy{min-width:0}
.lnhm-lead{font-size:19px;margin:22px 0 30px;max-width:50ch}
.lnhm-trust{list-style:none;margin:30px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:12px 22px}
.lnhm-trust li{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:500;color:var(--ln-ink-2)}
.lnhm-trust .ln-tick{width:22px;height:22px}
.lnhm-visual{min-width:0}
.lnhm-stage{padding:36px 28px 28px}
@media (max-width:1040px){.lnhm-hero-in{grid-template-columns:1fr;gap:40px}.lnhm-hero{padding-block:130px 64px}}
@media (max-width:880px){.lnhm-hero{margin-top:-74px;padding-block:112px 56px}}
@media (max-width:640px){.lnhm-lead{font-size:17px;margin:18px 0 24px}.lnhm-hero{padding-block:100px 48px}.lnhm-stage{padding:22px 14px 14px}}
`
