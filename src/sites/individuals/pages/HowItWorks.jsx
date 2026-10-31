// LinkNotes: HOW IT WORKS. Hero + the loop visual, eight "what you get"
// cards, the depth switch, and the honest "is / is not" pair. Strings:
// indiv.how.*.
import { ArrowRight, Check, X, Terminal, Play, Wrench, AppWindow, BrainCircuit, FileCheck2, SlidersHorizontal, MonitorSmartphone, Zap } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import FinalBand from '../FinalBand.jsx'
import LoopVisual from '../visuals/LoopVisual.jsx'
import { START } from '../links.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const ICONS = [Terminal, Play, Wrench, AppWindow, BrainCircuit, FileCheck2, SlidersHorizontal, MonitorSmartphone]
const TONES = ['', 'lime', 'amber', '', 'ink', 'lime', '', '']

export default function HowItWorks() {
  const t = useT()
  useSeo(indivSeo(t, 'how'))
  const cards = t('indiv.how.cards') || []
  const levels = t('indiv.how.depth.levels') || []
  return (
    <IndivShell current="how">
      <style>{CSS}</style>
      <section className="ln-sec grid lnhw-hero" aria-labelledby="lnhw-h1">
        <div className="ln-wrap ln-band">
          <div>
            <div className="ln-eyebrow">{t('indiv.how.hero.eyebrow')}</div>
            <h1 id="lnhw-h1">{t.rich('indiv.how.hero.h1')}</h1>
            <p className="lnhw-lead">{t('indiv.how.hero.p')}</p>
            <div className="ln-ctas"><a className="ln-btn primary" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={16} aria-hidden className="ln-arrow" /></a><a className="ln-btn ghost" href="/"><Zap size={15} aria-hidden /> {t('indiv.common.tryLive')}</a></div>
          </div>
          <div className="ln-band-visual"><h2 className="lnhw-loop-h">{t('indiv.how.loop.h2')}</h2><LoopVisual /></div>
        </div>
      </section>

      <section className="ln-sec tint" aria-labelledby="lnhw-grid">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnhw-grid" h2="indiv.how.gridH2" />
          <div className="ln-grid c4">
            {cards.map((c, i) => { const Ic = ICONS[i] || Check; return (
              <article className="ln-card" key={c.t} data-reveal style={{ transitionDelay: `${(i % 4) * 40}ms` }}>
                <span className={'ln-ic ' + TONES[i]}><Ic size={20} aria-hidden /></span>
                <h3>{c.t}</h3><p>{c.d}</p>
              </article>
            ) })}
          </div>
        </div>
      </section>

      <section className="ln-sec" aria-labelledby="lnhw-depth">
        <div className="ln-wrap ln-band">
          <div data-reveal>
            <div className="ln-eyebrow">{t('indiv.nav.how')}</div>
            <h2 id="lnhw-depth">{t.rich('indiv.how.depth.h2')}</h2>
            <p className="lnhw-lead">{t('indiv.how.depth.p')}</p>
          </div>
          <div className="ln-band-visual" data-reveal>
            <div className="lnhw-depth" role="img" aria-label={t('indiv.how.depth.h2')}>
              {levels.map((l, i) => <span key={l} className={'lnhw-lvl' + (i === 1 ? ' on' : '')}>{l}</span>)}
              <span className="lnhw-track" aria-hidden><i /></span>
            </div>
          </div>
        </div>
      </section>

      <section className="ln-sec tint" aria-labelledby="lnhw-honest">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnhw-honest" h2="indiv.how.honest.h2" center />
          <div className="ln-grid c2 lnhw-isnot">
            <ul className="ln-card pop ln-checks" data-reveal>{(t('indiv.how.honest.is') || []).map((s) => <li key={s}><span className="ln-tick"><Check size={13} aria-hidden /></span> {s}</li>)}</ul>
            <ul className="ln-card ln-checks not" data-reveal>{(t('indiv.how.honest.not') || []).map((s) => <li key={s}><span className="ln-tick no"><X size={13} aria-hidden /></span> {s}</li>)}</ul>
          </div>
        </div>
      </section>

      <FinalBand t={t} id="lnhw-final" h2="indiv.how.cta.h2" p="indiv.how.cta.p" primary="indiv.common.choosePlan" />
    </IndivShell>
  )
}

const CSS = `
.lnhw-hero{padding-block:56px 72px}
.lnhw-lead{font-size:18px;margin:18px 0 26px;max-width:50ch}
.ln .lnhw-loop-h{font-family:var(--ln-mono);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-ink-3);margin-bottom:12px;text-align:center}
.lnhw-depth{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#fff;border:1.5px solid var(--ln-ink);border-radius:var(--ln-r);padding:26px 22px 44px;box-shadow:8px 8px 0 var(--ln-violet-soft);max-width:520px;margin-inline:auto}
.lnhw-lvl{text-align:center;font-weight:700;font-size:15px;color:var(--ln-ink-3);padding:12px 8px;border-radius:12px;border:1.5px dashed var(--ln-line-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lnhw-lvl.on{color:var(--ln-ink);background:var(--ln-lime);border:1.5px solid var(--ln-ink)}
.lnhw-track{position:absolute;inset-inline:22px;bottom:20px;height:6px;border-radius:3px;background:var(--ln-line)}
.lnhw-track i{position:absolute;inset-inline-start:50%;top:-8px;width:22px;height:22px;border-radius:50%;background:var(--ln-violet);border:2px solid var(--ln-ink);transform:translateX(-50%)}
[dir="rtl"] .lnhw-track i{transform:translateX(50%)}
.lnhw-isnot .ln-checks{gap:14px}
.lnhw-isnot .ln-tick.no{background:var(--ln-amber-soft);color:var(--ln-amber-ink)}
@media (max-width:1040px){.lnhw-hero{padding-block:40px 52px}}
`
