import React, { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, ScanEye } from 'lucide-react'
import { useT } from '../i18n/index.jsx'
import { shouldRevealAtOnce } from '../reveal.js'

// RedactionSweep - the security page's "watch it protect" moment. Wraps the two
// mock screens (before / after) and plays what the frame redactor does on the
// device: a scan line sweeps down the "after" screen and each sensitive field
// is masked as the line passes, then a "protected before it left the device"
// seal lands. Plays once when scrolled into view; Replay restarts it. Reduced
// motion and crawlers get the finished (masked) state at once.
//
// It owns no copy about the data itself: the children are the page's own
// ScreenMock components; this component only drives a `data-sweep` phase on
// its root that the page CSS and the mock react to, plus the labels around it
// (security.sweep*).

export default function RedactionSweep({ before, after }) {
  const t = useT()
  const ref = useRef(null)
  const [phase, setPhase] = useState(() => (shouldRevealAtOnce() ? 'done' : 'idle'))   // idle | sweep | done
  const timer = useRef(null)
  const play = () => {
    clearTimeout(timer.current)
    setPhase('sweep')
    timer.current = setTimeout(() => setPhase('done'), 2600)
  }
  useEffect(() => {
    if (phase !== 'idle') return undefined
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver((ents) => { if (ents.some((e) => e.isIntersecting)) { io.disconnect(); play() } }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [phase]) // eslint-disable-line
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div className="rs" ref={ref} data-sweep={phase}>
      <div className="rs-grid">
        <div className="rs-col">
          <div className="rs-lab before">{t('security.sweepBefore')}</div>
          {before}
        </div>
        <div className="rs-col rs-after">
          <div className="rs-lab after">
            {phase === 'done' ? <><Check size={13} strokeWidth={3} aria-hidden="true" /> {t('security.sweepDone')}</> : <><ScanEye size={13} aria-hidden="true" /> {t('security.sweepTitle')}</>}
          </div>
          <div className="rs-stage">
            {after}
            <span className="rs-line" aria-hidden="true" />
            {phase === 'done' && <span className="rs-seal" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
          </div>
        </div>
      </div>
      <div className="rs-foot">
        <span className="rs-note">{t('security.sweepNote')}</span>
        <button type="button" className="rs-replay" onClick={play}><RotateCcw size={13} aria-hidden="true" /> {t('security.replay')}</button>
      </div>
    </div>
  )
}
