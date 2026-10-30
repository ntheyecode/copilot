// The live recording controls: a recording / paused indicator, the timer, what
// has been captured so far, and Mark step / Pause / Stop / Discard. Rendered in
// the page, or in the pop-out window (`compact`) so the trainer can keep working
// in the app being taught. Discard asks once, inline. Presentational: every
// action comes from useDemoRecorder.
import React, { useEffect, useState } from 'react'
import { Flag, Pause, Play, Square, Trash2 } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { formatClock } from './recordModel.js'

export default function RecorderBar({ rec, compact = false }) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const [flash, setFlash] = useState(false)
  const paused = rec.phase === 'paused'

  // A short "Step marked" confirmation each time Mark step lands.
  useEffect(() => {
    if (!rec.marked) return undefined
    setFlash(true)
    const h = setTimeout(() => setFlash(false), 1400)
    return () => clearTimeout(h)
  }, [rec.marked])

  return (
    <div className={`tch-recbar${compact ? ' compact' : ''}`}>
      <div className="tch-recbar-top">
        <span className={`tch-recpill${paused ? ' paused' : ''}`} role="status">
          <span className="tch-recdot" aria-hidden="true" />
          {paused ? t('teach.capture.bar.paused') : t('teach.capture.bar.recording')}
        </span>
        <span className="tch-rectime" aria-label={t('teach.capture.bar.elapsedAria')}>{formatClock(rec.elapsed)}</span>
        <span className="tch-recstats">
          <span>{t.n('teach.capture.count.screens', rec.live.frames, { n: rec.live.frames })}</span>
          <span>{t.n('teach.capture.count.breaks', rec.live.cuts, { n: rec.live.cuts })}</span>
          {!compact && rec.mic === 'on' && <span>{t.n('teach.capture.count.lines', rec.live.lines, { n: rec.live.lines })}</span>}
        </span>
        {flash && <span className="tch-marked" role="status">{t('teach.capture.bar.marked')}</span>}
      </div>

      {asking ? (
        <div className="tch-recask">
          <span>{t('teach.capture.bar.discardAsk')}</span>
          <span className="tch-recbtns">
            <button type="button" className="wka-btn sm" onClick={() => setAsking(false)}>{t('teach.capture.bar.discardNo')}</button>
            <button type="button" className="wka-btn sm danger" onClick={() => { setAsking(false); rec.cancel() }}><Trash2 size={13} /> {t('teach.capture.bar.discardYes')}</button>
          </span>
        </div>
      ) : (
        <div className="tch-recbtns">
          <button type="button" className="wka-btn primary" disabled={paused} onClick={rec.markStep}><Flag size={14} /> {t('teach.capture.bar.mark')}</button>
          {paused
            ? <button type="button" className="wka-btn" onClick={rec.resume}><Play size={14} /> {t('teach.capture.bar.resume')}</button>
            : <button type="button" className="wka-btn" onClick={rec.pause}><Pause size={14} /> {t('teach.capture.bar.pause')}</button>}
          <button type="button" className="wka-btn" onClick={rec.stop}><Square size={13} /> {t('teach.capture.bar.stop')}</button>
          <button type="button" className="wka-btn ghost danger" aria-label={t('teach.capture.bar.discard')} title={t('teach.capture.bar.discard')} onClick={() => setAsking(true)}><Trash2 size={13} /> <span className="tch-narrow-hide">{t('teach.capture.bar.discard')}</span></button>
        </div>
      )}
    </div>
  )
}
