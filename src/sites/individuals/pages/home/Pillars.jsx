// Home PILLARS: the three ways it pays off (productivity, training,
// enablement) as a bento of three tall cards, each with its kicker, title,
// one paragraph and a proof pill. Strings: indiv.home.pillars.*.
import { Rocket, BookOpenCheck, BrainCircuit } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [Rocket, BookOpenCheck, BrainCircuit]

export default function Pillars({ t }) {
  const items = t('indiv.home.pillars.items') || []
  return (
    <section className="ln-sec" aria-labelledby="lnhm-pil">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <SectionHead t={t} id="lnhm-pil" eyebrow="indiv.home.pillars.eyebrow" h2="indiv.home.pillars.h2" center />
        <div className="ln-grid c3 lnhm-pil">
          {items.map((p, i) => { const Ic = ICONS[i] || Rocket; return (
            <article className={'ln-card lnhm-pil-card p' + i} key={p.k} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="lnhm-pil-top">
                <span className="ln-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="lnhm-pil-k">{p.k}</span>
              </div>
              <span className={'ln-ic ' + (i === 1 ? 'lime' : i === 2 ? 'ink' : '')}><Ic size={22} aria-hidden /></span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <span className="ln-pill mono lnhm-pil-proof">{p.proof}</span>
            </article>
          ) })}
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-pil-card{display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:28px}
.lnhm-pil-card.p2{background:var(--ln-ink);color:var(--ln-on-dark);border-color:var(--ln-ink);box-shadow:6px 6px 0 var(--ln-lime)}
.lnhm-pil-card.p2 h3{color:#fff}
.lnhm-pil-card.p2 p{color:var(--ln-on-dark-2)}
.lnhm-pil-top{display:flex;align-items:center;gap:10px;margin-bottom:22px}
.lnhm-pil-k{font-family:var(--ln-mono);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-violet-ink)}
.lnhm-pil-card.p2 .lnhm-pil-k{color:var(--ln-lime)}
.lnhm-pil-card.p2 .ln-num{background:var(--ln-lime);color:var(--ln-ink)}
.lnhm-pil-card h3{font-size:22px;margin-top:18px;letter-spacing:-.025em}
.lnhm-pil-card p{font-size:15px;margin-top:10px;flex:1 0 auto}
.lnhm-pil-proof{margin-top:22px;max-width:100%;white-space:normal;height:auto;min-height:32px;padding-block:6px;line-height:1.3}
.lnhm-pil-card.p2 .lnhm-pil-proof{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.25);color:#fff}
`
