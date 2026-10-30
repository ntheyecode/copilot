// Status rows shared by "Record a demonstration" and "Import a recording":
// preparing (narration, masking, saving progress), the result reflection (what
// was captured + warnings by code), and a failure by code with Try again.
// Presentational only.
import React from 'react'
import { ShieldCheck, AlertTriangle, RotateCcw, Check, Video } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { captureErrorKey, formatClock, progressPct } from './recordModel.js'

export function FinalizingRow({ progress }) {
  const t = useT()
  const p = progress
  const label = !p ? t('teach.capture.finalize.align')
    : p.stage === 'voice' ? t('teach.capture.finalize.voice')
      : t('teach.capture.finalize.' + p.stage, { done: p.done, total: p.total })
  return (
    <div className="tch-rec-row">
      <span className="tch-rec-ikon"><Spinning /></span>
      <div className="tch-rec-txt">
        <div className="tch-rec-ttl">{t('teach.capture.finalize.title')}</div>
        <p>{label}</p>
        {p && p.total > 0 && (
          <div className="tch-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct(p)}>
            <span style={{ width: `${progressPct(p)}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

// A warning line: { key, vars } or a plural { key, n }.
export function WarningLine({ w }) {
  const t = useT()
  return <div className="tch-recline warn"><AlertTriangle size={15} /><span>{Number.isFinite(w.n) ? t.n(w.key, w.n, { n: w.n }) : t(w.key, w.vars)}</span></div>
}

export function ResultRow({ result, onAgain, againLabel, againIcon }) {
  const t = useT()
  const s = result.summary
  return (
    <div className="tch-rec-row">
      <span className={`tch-rec-ikon${s.steps ? ' ok' : ' warn'}`}>{s.steps ? <Check size={18} /> : <AlertTriangle size={18} />}</span>
      <div className="tch-rec-txt">
        {s.steps > 0 && (
          <>
            <div className="tch-rec-ttl">{t('teach.capture.done.summary', {
              time: formatClock(s.durationMs),
              steps: t.n('teach.capture.count.steps', s.steps, { n: s.steps }),
              screens: t.n('teach.capture.count.screens', s.frames, { n: s.frames }),
            })}</div>
            <p>
              {s.narrated > 0 && <>{t.n('teach.capture.done.narrated', s.narrated, { n: s.narrated })} </>}
              {result.mode === 'append' ? t('teach.capture.done.appended') : t('teach.capture.done.replaced')}
            </p>
            {result.masking && s.shots > 0 && <div className="tch-recline ok"><ShieldCheck size={15} /><span>{t('teach.capture.done.masked')}</span></div>}
          </>
        )}
        {result.warnings.map((w) => <WarningLine key={w.key} w={w} />)}
      </div>
      <div className="tch-rec-cta">
        <button type="button" className="wka-btn" onClick={onAgain}>{againIcon || <Video size={14} />} {againLabel}</button>
      </div>
    </div>
  )
}

export function ErrorRow({ code, canRetry, onRetry, onDiscard, onAgain, againLabel }) {
  const t = useT()
  return (
    <div className="tch-rec-row">
      <span className="tch-rec-ikon warn"><AlertTriangle size={18} /></span>
      <div className="tch-rec-txt">
        <div className="tch-rec-ttl">{t('teach.capture.err.title')}</div>
        <p>{t(captureErrorKey(code))}</p>
      </div>
      <div className="tch-rec-cta">
        {canRetry
          ? <button type="button" className="wka-btn primary" onClick={onRetry}><RotateCcw size={14} /> {t('teach.capture.err.retry')}</button>
          : <button type="button" className="wka-btn primary" onClick={onAgain}><Video size={14} /> {againLabel}</button>}
        {canRetry && <button type="button" className="wka-btn ghost danger" onClick={onDiscard}>{t('teach.capture.err.discard')}</button>}
      </div>
    </div>
  )
}

export default { FinalizingRow, WarningLine, ResultRow, ErrorRow }
