// Home HERO: the promise, two calls to action (choose a plan; try it live,
// which opens the live widget), three trust cues and the guide-on-screen
// visual. Strings: indiv.home.hero.*.
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
            {(t('indiv.home.hero.trust') || []).map((s) => <li key={s}><span className="ln-tick"><Check size={12} aria-hidden /></span> {s}</li>)}
          </ul>
        </div>
        <div className="lnhm-visual"><HeroScreen /></div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-hero{position:relative;padding-block:56px 80px;background-image:radial-gradient(var(--ln-line-2) 1.1px,transparent 1.1px);background-size:22px 22px}
.lnhm-hero::after{content:"";position:absolute;inset:auto 0 0 0;height:120px;background:linear-gradient(transparent,var(--ln-bg));pointer-events:none}
.lnhm-hero-in{position:relative;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:44px;align-items:center}
.lnhm-copy{min-width:0}
.lnhm-lead{font-size:19px;margin:22px 0 30px;max-width:50ch}
.lnhm-trust{list-style:none;margin:30px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:12px 22px}
.lnhm-trust li{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ln-ink-2)}
.lnhm-trust .ln-tick{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);color:var(--ln-ink);flex:0 0 auto}
.lnhm-visual{min-width:0;padding-top:12px}
@media (max-width:1040px){.lnhm-hero-in{grid-template-columns:1fr;gap:36px}.lnhm-hero{padding-block:44px 60px}}
@media (max-width:640px){.lnhm-lead{font-size:17px;margin:18px 0 24px}.lnhm-hero{padding-block:36px 48px}}
`
