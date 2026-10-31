// The page shell every LinkNotes page renders through: the one site
// stylesheet, the header, a <main> landmark and the footer. It also runs the
// site-wide scroll reveal (src/reveal.js) over the page's [data-reveal] blocks.
// Pages pass their own small <style> blocks as children.
import { useEffect, useRef } from 'react'
import IndivHeader from './IndivHeader.jsx'
import IndivFooter from './IndivFooter.jsx'
import { LN_CSS } from './site.css.js'
import { revealOnScroll } from '../../reveal.js'

export default function IndivShell({ current, children, revealKey }) {
  const ref = useRef(null)
  useEffect(() => revealOnScroll(ref.current, (el) => el.classList.add('in')), [revealKey])
  return (
    <div className="ln" ref={ref}>
      <style>{LN_CSS}</style>
      <IndivHeader current={current} />
      <main id="ln-main">{children}</main>
      <IndivFooter />
    </div>
  )
}

// Section header used on every page: eyebrow, heading (rich: <em> allowed) and
// an optional lead paragraph.
export function SectionHead({ t, eyebrow, h2, p, center, id }) {
  return (
    <div className={'ln-head' + (center ? ' center' : '')} data-reveal>
      {eyebrow && <div className="ln-eyebrow">{t(eyebrow)}</div>}
      <h2 id={id}>{t.rich(h2)}</h2>
      {p && <p>{t(p)}</p>}
    </div>
  )
}
