// The "Check each step against its screenshot" card in the wizard's Steps phase
// (Wave 3). Invites the trainer to read the recorded steps, shows live progress
// one step at a time with Stop, reflects the outcome, and turns a global failure
// (no key, an AI that cannot see images) into one banner that says where to fix
// it. Writing steps by hand keeps working with no AI at all. Presentational: the
// wizard owns the reader (useStepReader.js) and the rows.
//
// Accessibility: one polite live region stays mounted for progress and the end
// result, and when the pressed button is swapped out (Read -> Stop -> Read) focus
// moves to the button that replaced it instead of falling back to the page.
import React, { useEffect, useRef } from 'react'
import { ScanSearch, RotateCcw, Square, AlertTriangle, Check, Info, X } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { progressPct } from './recordModel.js'
import { globalNoteKey, readCounts, runSummary } from './stepReadRun.js'

const focusLost = () => !document.activeElement || document.activeElement === document.body

export default function StepReadCard({ rows, reader, disabled, holdTitle }) {
  const t = useT()
  const stopBtn = useRef(null)
  const ctaBtn = useRef(null)
  const wasActive = useRef(reader.active)
  useEffect(() => {
    if (wasActive.current === reader.active) return
    wasActive.current = reader.active
    const target = reader.active ? stopBtn.current : ctaBtn.current
    if (target && focusLost()) target.focus({ preventScroll: true })
  }, [reader.active])

  const { withShot, toRead } = readCounts(rows)
  if (withShot === 0 && !reader.globalKind) return null       // nothing has a screenshot: nothing to read

  const summary = !reader.active && reader.last && !reader.globalKind ? runSummary(reader.last) : null
  const progressText = reader.phase === 'saving' ? t('teach.read.saving') : t('teach.read.progress', { n: reader.done + 1, total: reader.total })
  const live = reader.active ? progressText
    : reader.globalKind ? t(globalNoteKey(reader.globalKind))
      : summary ? t(summary.key, summary.vars) : ''
  const liveRegion = <p className="tch-sr" aria-live="polite">{live}</p>

  if (reader.active) {
    const p = { done: reader.done, total: reader.total }
    return (
      <div className="tch-rec tch-read">
        {liveRegion}
        <div className="tch-rec-row">
          <span className="tch-rec-ikon"><Spinning /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl" aria-hidden="true">{progressText}</div>
            <p>{reader.stopping ? t('teach.read.stopping') : t('teach.read.progressHint')}</p>
            {reader.phase === 'reading' && reader.total > 0 && (
              <div className="tch-progress" role="progressbar" aria-label={t('teach.read.progressAria')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct(p)}>
                <span style={{ width: `${progressPct(p)}%` }} />
              </div>
            )}
          </div>
          <div className="tch-rec-cta">
            <button ref={stopBtn} type="button" className="wka-btn sm" disabled={reader.stopping} onClick={reader.stop}><Square size={13} /> {t('teach.read.stop')}</button>
          </div>
        </div>
      </div>
    )
  }

  const okSummary = summary && reader.last.read > 0 && !reader.last.stopped
  return (
    <div className="tch-rec tch-read">
      {liveRegion}
      <div className="tch-rec-row">
        <span className="tch-rec-ikon"><ScanSearch size={18} /></span>
        <div className="tch-rec-txt">
          <div className="tch-rec-ttl">{t('teach.read.title')}</div>
          <p>{t('teach.read.lead')}</p>
          {summary && (
            <div className={`tch-recline${okSummary ? ' ok' : ''}`}>
              {okSummary ? <Check size={15} /> : reader.last.stopped || reader.last.total === 0 ? <Info size={15} /> : <AlertTriangle size={15} />}<span>{t(summary.key, summary.vars)}</span>
            </div>
          )}
          {!summary && toRead === 0 && <div className="tch-recline ok"><Check size={15} /><span>{t('teach.read.allRead')}</span></div>}
        </div>
        <div className="tch-rec-cta">
          {toRead > 0
            ? <button ref={ctaBtn} type="button" className="wka-btn primary" disabled={disabled} title={holdTitle} onClick={() => reader.readAll(false)}><ScanSearch size={14} /> {t.n('teach.read.cta', toRead, { n: toRead })}</button>
            : <button ref={ctaBtn} type="button" className="wka-btn" disabled={disabled} title={holdTitle} onClick={() => reader.readAll(true)}><RotateCcw size={14} /> {t('teach.read.ctaAgain')}</button>}
        </div>
      </div>
      {reader.globalKind && (
        <div className="tch-read-banner">
          <AlertTriangle size={15} />
          <span>{t(globalNoteKey(reader.globalKind))}</span>
          <button type="button" className="wka-btn sm ghost" aria-label={t('teach.read.dismiss')} title={t('teach.read.dismiss')} onClick={reader.dismissGlobal}><X size={13} /></button>
        </div>
      )}
      <p className="tch-rec-fine tch-read-fine">{t('teach.read.saveFirst')}</p>
    </div>
  )
}
