// The title band every inner LinkNotes page opens with: a breadcrumb (Home >
// this page, from the nav keys the header already uses), the eyebrow, the H1,
// the lead, and whatever the page adds under them (a billing toggle, the
// jump chips, the search box). With `visual`, the band splits into copy and
// the visual side by side. A small star doodle sits at the start edge.
// Strings: the page's own indiv.<page>.hero.* keys, passed in.
import { ChevronRight } from 'lucide-react'
import { INDIV_LINKS } from './links.js'

function Star({ size = 34 }) {
  return (
    <svg className="ln-pt-star" width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <path d="M17 2c1.2 7.2 7.8 13.8 15 15-7.2 1.2-13.8 7.8-15 15-1.2-7.2-7.8-13.8-15-15C9.2 15.8 15.8 9.2 17 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M27 24c.4 2.4 2.6 4.6 5 5-2.4.4-4.6 2.6-5 5-.4-2.4-2.6-4.6-5-5 2.4-.4 4.6-2.6 5-5Z" fill="currentColor" />
    </svg>
  )
}

export default function PageTitle({ t, page, id, eyebrow, h1, p, visual, children }) {
  const link = INDIV_LINKS.find((l) => l.key === page)
  return (
    <section className="ln-pt" aria-labelledby={id}>
      <Star />
      <div className={'ln-wrap ln-pt-in' + (visual ? ' split' : '')}>
        <ol className="ln-crumbs" aria-label={t('indiv.nav.crumbs')}>
          <li><a href="/">{t('indiv.nav.home')}</a></li>
          <li aria-current="page"><ChevronRight size={14} aria-hidden="true" className="sep" />{t(link ? 'indiv.nav.' + link.key : 'indiv.nav.home')}</li>
        </ol>
        <div className="ln-pt-copy">
          {eyebrow && <div className="ln-eyebrow">{t(eyebrow)}</div>}
          <h1 id={id}>{t.rich(h1)}</h1>
          {p && <p className="ln-pt-lead">{t(p)}</p>}
          {children}
        </div>
        {visual && <div className="ln-band-visual">{visual}</div>}
      </div>
    </section>
  )
}
