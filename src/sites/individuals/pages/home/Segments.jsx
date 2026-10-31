// Home WHO: five segment cards (students and new grads, career switchers,
// freelancers and solo founders, professionals leveling up, creators), each on
// its own soft tint with a white icon disc, one concrete line each, and the
// link to the use-cases page. Strings: indiv.home.who.*.
import { ArrowRight, GraduationCap, Compass, Store, TrendingUp, Clapperboard } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [GraduationCap, Compass, Store, TrendingUp, Clapperboard]
const TINTS = ['t-lav', 't-sage', 't-peach', 't-mint', 't-sky']

export default function Segments({ t }) {
  const cards = t('indiv.home.who.cards') || []
  return (
    <section className="ln-sec" aria-labelledby="lnhm-who">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <div className="lnhm-who-head">
          <SectionHead t={t} id="lnhm-who" eyebrow="indiv.home.who.eyebrow" h2="indiv.home.who.h2" />
          <a className="ln-btn link" href="/workcopilot/use-cases">{t('indiv.home.who.cta')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
        </div>
        <div className="ln-grid c5 lnhm-who">
          {cards.map((c, i) => { const Ic = ICONS[i] || Compass; return (
            <article className={'ln-card ' + TINTS[i % TINTS.length]} key={c.t} data-reveal style={{ transitionDelay: `${i * 40}ms` }}>
              <span className="ln-ic white"><Ic size={22} aria-hidden /></span>
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
.lnhm-who-head .ln-head{margin-bottom:36px}
.lnhm-who-head .ln-btn{margin-bottom:40px;flex:0 0 auto}
.lnhm-who .ln-card{padding:26px 22px}
.lnhm-who .ln-card h3{font-size:18px;margin-top:20px}
.lnhm-who .ln-card p{font-size:14.5px}
@media (max-width:1040px){.lnhm-who .ln-card:last-child{grid-column:1 / -1}}
@media (max-width:640px){.lnhm-who-head .ln-head,.lnhm-who-head .ln-btn{margin-bottom:20px}.lnhm-who .ln-card:last-child{grid-column:auto}}
`
