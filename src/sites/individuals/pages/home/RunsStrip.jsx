// Home RUNS: where it runs, three tiles (Windows desktop app, Android app,
// Float on top in the browser) and, across the row below them, the camera
// card on a lavender tint: point a camera at another screen or a machine
// (items[3], marked New). Strings: indiv.home.runs.*.
import { Monitor, Smartphone, PictureInPicture2, Camera } from 'lucide-react'
import { SectionHead } from '../../IndivShell.jsx'

const TILES = [{ ic: Monitor, tone: '' }, { ic: Smartphone, tone: 'lime' }, { ic: PictureInPicture2, tone: 'ink' }]

export default function RunsStrip({ t }) {
  const items = t('indiv.home.runs.items') || []
  const tiles = items.slice(0, TILES.length)
  const cam = items[TILES.length]
  return (
    <section className="ln-sec" aria-labelledby="lnhm-runs">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <SectionHead t={t} id="lnhm-runs" eyebrow="indiv.home.runs.eyebrow" h2="indiv.home.runs.h2" center />
        <div className="ln-grid c3">
          {tiles.map((r, i) => { const { ic: Ic, tone } = TILES[i]; return (
            <article className="ln-card hov lnhm-run" key={r.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <span className={'ln-ic ' + tone}><Ic size={24} aria-hidden /></span>
              <h3>{r.t}</h3><p>{r.d}</p>
            </article>
          ) })}
        </div>
        {cam && (
          <article className="ln-card t-lav lnhm-cam" data-reveal style={{ transitionDelay: `${TILES.length * 60}ms` }}>
            <span className="ln-ic white"><Camera size={24} aria-hidden /></span>
            <div className="lnhm-cam-body">
              <div className="lnhm-cam-head"><h3>{cam.t}</h3><span className="ln-pill lime">{t('indiv.common.new')}</span></div>
              <p>{cam.d}</p>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}

const CSS = `
.lnhm-run{text-align:center;display:flex;flex-direction:column;align-items:center;padding:34px 24px}
.lnhm-run .ln-ic{width:60px;height:60px;border-radius:20px}
.lnhm-run h3{font-size:20px}
.lnhm-cam{margin-top:20px;display:flex;gap:22px;align-items:flex-start;padding:32px}
.lnhm-cam .ln-ic{width:60px;height:60px;border-radius:20px}
.lnhm-cam-body{min-width:0;flex:1 1 auto}
.lnhm-cam-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.lnhm-cam h3{margin-top:0;font-size:22px;min-width:0}
.lnhm-cam p{margin-top:8px;font-size:15.5px;max-width:72ch}
@media (max-width:640px){.lnhm-cam{flex-direction:column;gap:14px;padding:22px}.lnhm-cam h3{font-size:19px}}
`
