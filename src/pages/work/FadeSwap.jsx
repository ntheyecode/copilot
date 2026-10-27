import { useEffect, useRef, useState } from 'react'

// Cross-fade between keyed content: when `k` changes, the OLD content is held
// on screen and fades out, then the NEW content fades in. Same key = live
// update in place (no animation), so a guidance refresh on the same step never
// flickers. Honors prefers-reduced-motion (instant swap). Pure presentation;
// the keyframes live in guideView.css.js (.gv-swap.in / .out).
const reducedMotion = () => {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}

export default function FadeSwap({ k, children, duration = 180, className = '' }) {
  const [out, setOut] = useState(null)              // { k, node } held while it fades out
  const last = useRef({ k, node: children })
  useEffect(() => {
    if (last.current.k === k) { last.current = { k, node: children }; return undefined }
    const prev = last.current
    last.current = { k, node: children }
    if (reducedMotion()) { setOut(null); return undefined }
    setOut(prev)
    const t = setTimeout(() => setOut(null), duration)
    return () => clearTimeout(t)
  })
  const phase = out ? 'out' : 'in'
  return (
    <div key={out ? 'o:' + String(out.k) : 'i:' + String(k)} className={`gv-swap ${phase}${className ? ' ' + className : ''}`} aria-busy={out ? 'true' : undefined}>
      {out ? out.node : children}
    </div>
  )
}
