// Home PILLARS: the three ways it pays off (productivity, training,
// enablement) as three tall white cards, each with its kicker, a numbered
// disc, title, one paragraph and a proof pill. Strings: indiv.home.pillars.*.
import { Rocket, BookOpenCheck, BrainCircuit } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [Rocket, BookOpenCheck, BrainCircuit]
const TONES = ['', 'lime', 'ink']

export default function Pillars({ t }) {
  const items = t('indiv.home.pillars.items') || []
  return (
    <section className="ln-sec tint" aria-labelledby="lnhm-pil">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <SectionHead t={t} id="lnhm-pil" eyebrow="indiv.home.pillars.eyebrow" h2="indiv.home.pillars.h2" center />
        <div className="ln-grid c3 lnhm-pil">
          {items.map((p, i) => { const Ic = ICONS[i] || Rocket; return (
            <article className="ln-card hov lnhm-pil-card" key={p.k} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="lnhm-pil-top">
                <span className={'ln-ic ' + TONES[i]}><Ic size={22} aria-hidden /></span>
                <span className="lnhm-pil-k">{p.k}</span>
              </div>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <span className="ln-pill violet lnhm-pil-proof">{p.proof}</span>
            </article>
          ) })}
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-pil-card{display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:30px}
.lnhm-pil-top{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.lnhm-pil-k{font-size:14px;font-weight:600;color:var(--ln-violet)}
.lnhm-pil-card h3{font-size:23px;margin-top:18px}
.lnhm-pil-card p{font-size:15.5px;margin-top:10px;flex:1 0 auto}
.lnhm-pil-proof{margin-top:22px;max-width:100%;white-space:normal;height:auto;min-height:34px;padding-block:7px;line-height:1.3}
`
