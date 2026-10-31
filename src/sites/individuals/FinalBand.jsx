// The closing band every LinkNotes page ends with: heading, one line, the
// primary call to action and an optional second one. Keys are passed in, so
// each page keeps its own words (indiv.<page>.cta.* or indiv.home.final.*).
import { ArrowRight } from 'lucide-react'
import { START } from './links.js'

export default function FinalBand({ t, h2, p, primary, primaryHref = START, secondary, secondaryHref, id }) {
  return (
    <section className="ln-sec tight" aria-labelledby={id}>
      <div className="ln-wrap">
        <div className="ln-final" data-reveal>
          <h2 id={id}>{t.rich(h2)}</h2>
          <p>{t(p)}</p>
          <div className="ln-ctas">
            <a className="ln-btn primary" href={primaryHref}>{t(primary)} <ArrowRight size={16} aria-hidden className="ln-arrow" /></a>
            {secondary && <a className="ln-btn ghost" href={secondaryHref}>{t(secondary)}</a>}
          </div>
        </div>
      </div>
    </section>
  )
}
