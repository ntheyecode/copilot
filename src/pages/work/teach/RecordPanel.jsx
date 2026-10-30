// "Record a demonstration" in the Teach wizard's Steps phase. A guided card:
// invite -> set up (RecordSetup: narration consent + language, optional call
// audio with an explicit consent, what masking will do) -> share the app window
// -> record with live feedback (indicator, timer, what has been captured, live
// captions, Mark step) -> preparing (narration, masking, saving) -> a reflection
// of what was captured, with the drafted steps loaded into the editor below.
// Where screen share cannot work (phones, tablets, an insecure page, an old
// browser, a refused share) it says why in plain words and hand-writing stays
// right there; "Import a recording" is offered next to it. All recording logic
// lives in useDemoRecorder.
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Video, Mic, MicOff, Info, AlertTriangle, RotateCcw, ExternalLink, Monitor, FileVideo, Users } from 'lucide-react'
import { useLocale } from '../../../i18n/index.jsx'
import { isMobileUA } from '../lib.js'
import { isDlpActive } from '../../../scrub.js'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { useDemoRecorder } from './useDemoRecorder.js'
import { usePopout } from './usePopout.js'
import RecorderBar from './RecorderBar.jsx'
import RecordSetup from './RecordSetup.jsx'
import { FinalizingRow, ResultRow, ErrorRow } from './CaptureStatus.jsx'
import { recordSupport, maskingOn } from './recordModel.js'
import { speakerKey } from './voiceModel.js'

function detectSupport() {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
  return recordSupport({
    mobile: isMobileUA(),
    secure: typeof window === 'undefined' ? true : window.isSecureContext !== false,
    hasDisplayMedia: !!(md && typeof md.getDisplayMedia === 'function'),
  })
}

const MIC_NOTE = { denied: 'micDenied', nomic: 'micNone' }

export default function RecordPanel({ mask, language, onSteps, onBusyChange, onImport }) {
  const { t } = useLocale()
  const support = useMemo(detectSupport, [])
  const dlp = isDlpActive()
  const masking = maskingOn({ mask, dlp })
  const [setup, setSetup] = useState(false)
  const rec = useDemoRecorder({ mask, t, onSteps })
  const pop = usePopout()
  const live = rec.phase === 'recording' || rec.phase === 'paused'

  // Tell the wizard while a recording is live or saving, so it holds navigation.
  useEffect(() => { if (onBusyChange) onBusyChange(rec.busy) }, [rec.busy, onBusyChange])
  useEffect(() => () => { if (onBusyChange) onBusyChange(false) }, [onBusyChange])

  // The pop-out only lives as long as the recording does.
  useEffect(() => { if (!live && pop.win) pop.close() }, [live, pop])

  const again = () => { rec.reset(); setSetup(true) }
  const importBtn = onImport && (
    <button type="button" className="wka-btn" onClick={onImport}><FileVideo size={14} /> {t('teach.capture.import.open')}</button>
  )

  // ---- live screen sharing is not available here: explain, offer import ----
  if (!support.ok) {
    return (
      <div className="tch-rec tch-rec-off" role="note">
        <div className="tch-rec-row">
          <span className="tch-rec-ikon muted"><Monitor size={18} /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.off.title')}</div>
            <p>{t('teach.capture.off.' + support.reason)}</p>
          </div>
          {importBtn && <div className="tch-rec-cta">{importBtn}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className={`tch-rec${live ? ' live' : ''}`}>
      {/* the hidden source for frames; also a small live preview while recording */}
      <video ref={rec.videoRef} muted playsInline aria-label={t('teach.capture.bar.previewAria')}
        className={live ? 'tch-recpreview' : 'tch-hidden'} />

      {rec.phase === 'idle' && !setup && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon"><Video size={18} /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.title')}</div>
            <p>{t('teach.capture.lead')}</p>
            <p className="tch-rec-honest"><Info size={13} /> <span>{t('teach.capture.honest')}</span></p>
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn primary" onClick={() => setSetup(true)}><Video size={14} /> {t('teach.capture.open')}</button>
            {importBtn}
          </div>
        </div>
      )}

      {rec.phase === 'idle' && setup && (
        <RecordSetup masking={masking} dlp={dlp} language={language} onBack={() => setSetup(false)}
          onStart={(opts) => { setSetup(false); rec.start(opts) }} />
      )}

      {rec.phase === 'prompt' && (
        <div className="tch-rec-row"><span className="tch-rec-ikon"><Spinning /></span><div className="tch-rec-txt"><div className="tch-rec-ttl">{t('teach.capture.title')}</div><p>{t('teach.capture.prompt')}</p></div></div>
      )}

      {live && (
        <div className="tch-rec-live">
          {pop.win
            ? (
              <>
                <div className="tch-recline ok"><ExternalLink size={15} /><span>{t('teach.capture.bar.popoutOn')}</span></div>
                {createPortal(<div className="wka wd-tokens tch-pip"><RecorderBar rec={rec} compact /></div>, pop.win.document.body)}
              </>
            )
            : <RecorderBar rec={rec} />}
          <div className="tch-rec-notes">
            {rec.captions.length > 0 && (
              <div className="tch-captions" aria-live="polite">
                {rec.captions.map((c, i) => <div key={i} className="tch-caption"><b>{t(speakerKey(c.speaker))}</b> <span>{c.text}</span></div>)}
              </div>
            )}
            {rec.mic === 'on' && rec.captions.length === 0 && !rec.voiceOff && <div className="tch-recline"><Mic size={15} /><span>{t('teach.capture.bar.listening')}</span></div>}
            {rec.voiceOff && <div className="tch-recline warn"><AlertTriangle size={15} /><span>{t('teach.capture.bar.voiceOff')}</span></div>}
            {MIC_NOTE[rec.mic] && <div className="tch-recline warn"><MicOff size={15} /><span>{t('teach.capture.bar.' + MIC_NOTE[rec.mic])}</span></div>}
            {rec.mic === 'off' && rec.call !== 'on' && <div className="tch-recline"><MicOff size={15} /><span>{t('teach.capture.bar.micOff')}</span></div>}
            {rec.call === 'on' && <div className="tch-recline ok"><Users size={15} /><span>{t('teach.capture.bar.callOn')}</span></div>}
            {rec.call === 'none' && <div className="tch-recline warn"><Users size={15} /><span>{t('teach.capture.bar.callNone')}</span></div>}
            <div className="tch-recline"><Info size={15} /><span>{t('teach.capture.honest')}</span></div>
            {pop.supported && !pop.failed && !pop.win && (
              <div className="tch-rec-actions">
                <button type="button" className="wka-btn sm" onClick={() => pop.open({ width: 460, height: 150, title: t('teach.capture.title') })}><ExternalLink size={13} /> {t('teach.capture.bar.popout')}</button>
                <span className="tch-rec-fine">{t('teach.capture.bar.popoutHint')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {rec.phase === 'finalizing' && <FinalizingRow progress={rec.progress} />}

      {rec.phase === 'denied' && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon warn"><AlertTriangle size={18} /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.denied.title')}</div>
            <p>{t('teach.capture.denied.' + (rec.denied || 'failed'))}</p>
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn primary" onClick={again}><RotateCcw size={14} /> {t('teach.capture.denied.retry')}</button>
            {importBtn}
          </div>
        </div>
      )}

      {rec.phase === 'error' && (
        <ErrorRow code={rec.errorCode} canRetry={rec.canRetry} onRetry={rec.retry} onDiscard={rec.cancel} onAgain={again} againLabel={t('teach.capture.done.again')} />
      )}

      {rec.phase === 'done' && rec.result && (
        <ResultRow result={rec.result} onAgain={again} againLabel={t('teach.capture.done.again')} />
      )}
    </div>
  )
}
