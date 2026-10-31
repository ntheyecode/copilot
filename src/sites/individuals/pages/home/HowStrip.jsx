// Home HOW: four moves as white cards on a rounded lavender band, one honest
// line under them. Strings: indiv.home.how.*.
import { MessageSquareText, MousePointerClick, ScanEye, FileCheck2, Hand } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [MessageSquareText, MousePointerClick, ScanEye, FileCheck2]

export default function HowStrip({ t }) {
  const steps = t('indiv.home.how.steps') || []
  return (
    <section className="ln-sec" aria-labelledby="lnhm-how">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <div className="ln-band-tint arcs">
          <SectionHead t={t} id="lnhm-how" eyebrow="indiv.home.how.eyebrow" h2="indiv.home.how.h2" />
          <ol className="lnhm-steps">
            {steps.map((s, i) => { const Ic = ICONS[i] || ScanEye; return (
              <li key={s.t} className="ln-card hov" data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
                <div className="lnhm-step-top"><span className="ln-num">{String(i + 1).padStart(2, '0')}</span><span className={'ln-ic ' + (i === 2 ? 'amber' : i === 3 ? 'lime' : '')}><Ic size={20} aria-hidden /></span></div>
                <h3>{s.t}</h3><p>{s.d}</p>
              </li>
            ) })}
          </ol>
          <p className="lnhm-honest" data-reveal><span className="lnhm-honest-ic"><Hand size={16} aria-hidden /></span> {t('indiv.home.how.honest')}</p>
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.lnhm-steps .ln-card{border-color:transparent;padding:24px}
.lnhm-step-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lnhm-steps h3{font-size:18px}
.lnhm-steps p{font-size:14.5px}
.lnhm-honest{margin-top:24px;display:flex;align-items:center;gap:12px;font-size:15.5px;font-weight:600;color:var(--ln-ink);padding:12px 20px 12px 12px;border-radius:999px;background:#fff;box-shadow:var(--ln-shadow);width:fit-content;max-width:100%}
.lnhm-honest-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--ln-lime);color:var(--ln-ink);flex:0 0 auto}
@media (max-width:1040px){.lnhm-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.lnhm-steps{grid-template-columns:1fr}.lnhm-honest{border-radius:18px;align-items:flex-start;padding:14px}}
`
