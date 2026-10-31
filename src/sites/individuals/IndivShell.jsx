// The page shell every individuals-site page renders through: the one site
// stylesheet, the header, a <main> landmark and the footer. It also runs the
// site-wide scroll reveal (src/reveal.js) over the page's [data-reveal] blocks.
// Pages pass their own small <style> blocks as children.
import { useEffect, useRef } from 'react'
import IndivHeader from './IndivHeader.jsx'
import IndivFooter from './IndivFooter.jsx'
import { IV_CSS } from './site.css.js'
import { revealOnScroll } from '../../reveal.js'

export default function IndivShell({ current, children, revealKey }) {
  const ref = useRef(null)
  useEffect(() => revealOnScroll(ref.current, (el) => el.classList.add('in')), [revealKey])
  return (
    <div className="iv" ref={ref}>
      <style>{IV_CSS}</style>
      <IndivHeader current={current} />
      <main id="iv-main">{children}</main>
      <IndivFooter />
    </div>
  )
}

// Section header used on every page: eyebrow, heading (rich: <em> allowed) and
// an optional lead paragraph.
export function SectionHead({ t, eyebrow, h2, p, center, id }) {
  return (
    <div className={'iv-head' + (center ? ' center' : '')} data-reveal>
      {eyebrow && <div className="iv-eyebrow">{t(eyebrow)}</div>}
      <h2 id={id}>{t.rich(h2)}</h2>
      {p && <p>{t(p)}</p>}
    </div>
  )
}
