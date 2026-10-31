// Home RUNS: where it runs, three tiles (Windows desktop app, Android app,
// Float on top in the browser). Strings: indiv.home.runs.*.
import { Monitor, Smartphone, PictureInPicture2 } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const ICONS = [Monitor, Smartphone, PictureInPicture2]

export default function RunsStrip({ t }) {
  const items = t('indiv.home.runs.items') || []
  return (
    <section className="ln-sec" aria-labelledby="lnhm-runs">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <SectionHead t={t} id="lnhm-runs" eyebrow="indiv.home.runs.eyebrow" h2="indiv.home.runs.h2" center />
        <div className="ln-grid c3">
          {items.map((r, i) => { const Ic = ICONS[i] || Monitor; return (
            <article className="ln-card lnhm-run" key={r.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <span className={'ln-ic ' + (i === 1 ? 'lime' : i === 2 ? 'ink' : '')}><Ic size={22} aria-hidden /></span>
              <h3>{r.t}</h3><p>{r.d}</p>
            </article>
          ) })}
        </div>
      </div>
    </section>
  )
}

const CSS = `
.lnhm-run{text-align:center;display:flex;flex-direction:column;align-items:center;padding:32px 24px}
.lnhm-run .ln-ic{width:56px;height:56px;border-radius:18px}
.lnhm-run h3{font-size:19px}
`
