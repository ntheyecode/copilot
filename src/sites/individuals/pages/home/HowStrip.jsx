// Home HOW: four moves on a numbered rail, one honest line under them.
// Strings: indiv.home.how.*.
import { MessageSquareText, MousePointerClick, ScanEye, FileCheck2, Hand } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [MessageSquareText, MousePointerClick, ScanEye, FileCheck2]

export default function HowStrip({ t }) {
  const steps = t('indiv.home.how.steps') || []
  return (
    <section className="ln-sec tint grid" aria-labelledby="lnhm-how">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <SectionHead t={t} id="lnhm-how" eyebrow="indiv.home.how.eyebrow" h2="indiv.home.how.h2" />
        <ol className="lnhm-steps">
          {steps.map((s, i) => { const Ic = ICONS[i] || ScanEye; return (
            <li key={s.t} className="ln-card" data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
              <div className="lnhm-step-top"><span className="ln-num">{String(i + 1).padStart(2, '0')}</span><span className={'ln-ic ' + (i === 2 ? 'amber' : i === 3 ? 'lime' : '')}><Ic size={20} aria-hidden /></span></div>
              <h3>{s.t}</h3><p>{s.d}</p>
            </li>
          ) })}
        </ol>
        <p className="lnhm-honest" data-reveal><Hand size={16} aria-hidden /> {t('indiv.home.how.honest')}</p>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.lnhm-step-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lnhm-steps h3{font-size:17.5px}
.lnhm-steps p{font-size:14.5px}
.lnhm-honest{margin-top:22px;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:var(--ln-ink);padding:14px 18px;border-radius:999px;background:var(--ln-lime);border:1.5px solid var(--ln-ink);width:fit-content;max-width:100%}
.lnhm-honest svg{flex:0 0 auto}
@media (max-width:1040px){.lnhm-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.lnhm-steps{grid-template-columns:1fr}.lnhm-honest{border-radius:16px;align-items:flex-start}}
`
