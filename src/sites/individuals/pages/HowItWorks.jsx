// Individuals site: HOW IT WORKS. The loop visual, eight benefit cards, the
// depth switch, and the honest "is / is not" pair. Strings: indiv.how.*.
import { ArrowRight, Check, X, Terminal, Play, Wrench, AppWindow, FileText, FileCheck2, BookOpen, MonitorSmartphone, SlidersHorizontal } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import LoopVisual from '../visuals/LoopVisual.jsx'
import { START } from '../IndivHeader.jsx'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const ICONS = [Terminal, Play, Wrench, AppWindow, FileText, FileCheck2, BookOpen, MonitorSmartphone]

export default function HowItWorks() {
  const t = useT()
  useSeo(indivSeo(t, 'how'))
  const cards = t('indiv.how.cards') || []
  const levels = t('indiv.how.depth.levels') || []
  return (
    <IndivShell current="how">
      <style>{CSS}</style>
      <section className="iv-wrap ivhw-hero iv-band" aria-labelledby="ivhw-h1">
        <div>
          <div className="iv-eyebrow">{t('indiv.how.hero.eyebrow')}</div>
          <h1 id="ivhw-h1">{t.rich('indiv.how.hero.h1')}</h1>
          <p className="ivhw-lead">{t('indiv.how.hero.p')}</p>
          <div className="iv-ctas"><a className="iv-btn primary" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a><a className="iv-btn ghost" href="/demo">{t('indiv.common.demo')}</a></div>
        </div>
        <div className="iv-band-visual"><h2 className="ivhw-loop-h">{t('indiv.how.loop.h2')}</h2><LoopVisual /></div>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivhw-grid">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivhw-grid" h2="indiv.how.gridH2" />
          <div className="iv-grid c4">
            {cards.map((c, i) => { const Ic = ICONS[i] || Check; return (
              <article className="iv-card flat" key={c.t} data-reveal>
                <span className="iv-ic"><Ic size={20} aria-hidden /></span>
                <h3>{c.t}</h3><p>{c.d}</p>
              </article>
            ) })}
          </div>
        </div>
      </section>

      <section className="iv-sec" aria-labelledby="ivhw-depth">
        <div className="iv-wrap iv-band">
          <div data-reveal>
            <div className="iv-eyebrow"><SlidersHorizontal size={14} aria-hidden /> {t('indiv.nav.how')}</div>
            <h2 id="ivhw-depth">{t.rich('indiv.how.depth.h2')}</h2>
            <p className="ivhw-lead">{t('indiv.how.depth.p')}</p>
          </div>
          <div className="iv-band-visual" data-reveal>
            <div className="ivhw-depth" role="img" aria-label={t('indiv.how.depth.h2')}>
              {levels.map((l, i) => <span key={l} className={'ivhw-lvl' + (i === 1 ? ' on' : '')}>{l}</span>)}
              <span className="ivhw-track" aria-hidden><i /></span>
            </div>
          </div>
        </div>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivhw-honest">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivhw-honest" h2="indiv.how.honest.h2" center />
          <div className="iv-grid c2 ivhw-isnot">
            <ul className="iv-card iv-checks" data-reveal>{(t('indiv.how.honest.is') || []).map((s) => <li key={s}><Check size={16} aria-hidden /> {s}</li>)}</ul>
            <ul className="iv-card iv-checks not" data-reveal>{(t('indiv.how.honest.not') || []).map((s) => <li key={s}><X size={16} aria-hidden /> {s}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="iv-sec tight"><div className="iv-wrap"><div className="iv-final" data-reveal>
        <h2>{t.rich('indiv.how.cta.h2')}</h2><p>{t('indiv.how.cta.p')}</p>
        <div className="iv-ctas"><a className="iv-btn primary" href={START}>{t('indiv.common.choosePlan')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a></div>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.ivhw-hero{padding-block:56px 64px}
.ivhw-lead{font-size:17.5px;margin:16px 0 24px;max-width:50ch}
.ivhw-loop-h{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--iv-ink-3);margin-bottom:12px;text-align:center}
.ivhw-depth{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:var(--iv-r);padding:26px 22px 42px;box-shadow:var(--iv-shadow);max-width:520px;margin-inline:auto}
.ivhw-lvl{text-align:center;font-weight:700;font-size:15px;color:var(--iv-ink-3);padding:12px 8px;border-radius:12px;border:1px dashed var(--iv-line-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivhw-lvl.on{color:var(--iv-mint-ink);background:var(--iv-mint-soft);border:2px solid var(--iv-mint)}
.ivhw-track{position:absolute;inset-inline:22px;bottom:20px;height:6px;border-radius:3px;background:var(--iv-line)}
.ivhw-track i{position:absolute;inset-inline-start:50%;top:-7px;width:20px;height:20px;border-radius:50%;background:var(--iv-mint);border:3px solid var(--iv-paper-2);box-shadow:0 2px 8px rgba(0,0,0,.2);transform:translateX(-50%)}
[dir="rtl"] .ivhw-track i{transform:translateX(50%)}
.ivhw-isnot .iv-checks.not li svg{color:var(--iv-coral)}
.ivhw-isnot .iv-checks{gap:14px}
@media (max-width:980px){.ivhw-hero{padding-block:40px 48px}}
`
