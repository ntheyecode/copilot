// Home WHO: five segment cards (students and new grads, career switchers,
// freelancers and solo founders, professionals leveling up, creators), one
// concrete line each, and the link to the use-cases page. Strings:
// indiv.home.who.*.
import { ArrowRight, GraduationCap, Compass, Store, TrendingUp, Clapperboard } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [GraduationCap, Compass, Store, TrendingUp, Clapperboard]
const TONES = ['', 'lime', 'amber', '', 'lime']

export default function Segments({ t }) {
  const cards = t('indiv.home.who.cards') || []
  return (
    <section className="ln-sec tint" aria-labelledby="lnhm-who">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <div className="lnhm-who-head">
          <SectionHead t={t} id="lnhm-who" eyebrow="indiv.home.who.eyebrow" h2="indiv.home.who.h2" />
          <a className="ln-btn ghost sm" href="/workcopilot/use-cases">{t('indiv.home.who.cta')} <ArrowRight size={14} aria-hidden className="ln-arrow" /></a>
        </div>
        <div className="ln-grid c5 lnhm-who">
          {cards.map((c, i) => { const Ic = ICONS[i] || Compass; return (
            <article className="ln-card" key={c.t} data-reveal style={{ transitionDelay: `${i * 40}ms` }}>
              <span className={'ln-ic ' + TONES[i]}><Ic size={21} aria-hidden /></span>
              <h3>{c.t}</h3><p>{c.d}</p>
            </article>
          ) })}
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-who-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.lnhm-who-head .ln-head{margin-bottom:34px}
.lnhm-who-head .ln-btn{margin-bottom:34px;flex:0 0 auto}
.lnhm-who .ln-card h3{font-size:17px}
.lnhm-who .ln-card p{font-size:14px}
@media (max-width:640px){.lnhm-who-head .ln-head,.lnhm-who-head .ln-btn{margin-bottom:20px}}
`
