// "Import a recording" in the Teach wizard's Steps phase: choose a video the
// trainer already has (a Teams or Zoom recording), see what it is, build steps
// from it with visible progress (screens read, soundtrack turned into text) and
// a Cancel, then the same reflection and review as a live recording. The video
// is read on this device and never uploaded. Logic lives in useImportRecording.
import React, { useEffect, useRef, useState } from 'react'
import { FileVideo, Info, ShieldCheck, ShieldOff, X, Upload, ArrowLeft, Mic } from 'lucide-react'
import { useLocale, LOCALES } from '../../../i18n/index.jsx'
import { isDlpActive } from '../../../scrub.js'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { useImportRecording } from './useImportRecording.js'
import { FinalizingRow, ResultRow, ErrorRow } from './CaptureStatus.jsx'
import { formatClock, maskingOn } from './recordModel.js'
import { narrationLanguages, VIDEO_ACCEPT } from './voiceModel.js'

export default function ImportPanel({ mask, language, onSteps, onBusyChange, onBack }) {
  const { t } = useLocale()
  const imp = useImportRecording({ mask, t, onSteps })
  const [lang, setLang] = useState(language)
  const inputRef = useRef(null)
  const dlp = isDlpActive()
  const masking = maskingOn({ mask, dlp })

  useEffect(() => { if (onBusyChange) onBusyChange(imp.busy) }, [imp.busy, onBusyChange])
  useEffect(() => () => { if (onBusyChange) onBusyChange(false) }, [onBusyChange])

  const choose = () => { if (inputRef.current) { inputRef.current.value = ''; inputRef.current.click() } }
  const fileInput = <input ref={inputRef} type="file" accept={VIDEO_ACCEPT} className="tch-hidden" onChange={(e) => imp.pick(e.target.files && e.target.files[0])} />
  const pct = Math.round(imp.scan * 100)

  return (
    <div className="tch-rec">
      {fileInput}

      {(imp.phase === 'idle' || imp.phase === 'opening') && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon">{imp.phase === 'opening' ? <Spinning /> : <FileVideo size={18} />}</span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.import.title')}</div>
            <p>{t('teach.capture.import.lead')}</p>
            <p className="tch-rec-honest"><Info size={13} /> <span>{t('teach.capture.import.privacy')}</span></p>
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn primary" disabled={imp.phase === 'opening'} onClick={choose}><Upload size={14} /> {t('teach.capture.import.pick')}</button>
            <button type="button" className="wka-btn ghost" disabled={imp.phase === 'opening'} onClick={onBack}><ArrowLeft size={14} /> {t('teach.capture.import.back')}</button>
          </div>
        </div>
      )}

      {imp.phase === 'picked' && imp.file && (
        <div>
          <div className="tch-rec-row">
            <span className="tch-rec-ikon"><FileVideo size={18} /></span>
            <div className="tch-rec-txt">
              <div className="tch-rec-ttl tch-filename" title={imp.file.name}>{imp.file.name}</div>
              <p>{t('teach.capture.import.length', { time: formatClock(imp.file.durationMs) })}</p>
            </div>
          </div>
          <div className="tch-rec-setup">
            <div className="tch-rec-opt">
              <div className="wka-field tch-rec-lang" style={{ marginTop: 0 }}>
                <label htmlFor="tch-imp-lang"><Mic size={13} style={{ verticalAlign: -2 }} /> {t('teach.capture.import.language')}</label>
                <select id="tch-imp-lang" className="wka-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                  {narrationLanguages(LOCALES).map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
                </select>
              </div>
              <p className="tch-rec-fine">{t('teach.capture.import.soundtrack')}</p>
            </div>
            <div className={`tch-recline${masking ? ' ok' : ' warn'}`}>
              {masking ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
              <span>{dlp ? t('teach.capture.setup.maskDlp') : masking ? t('teach.capture.setup.maskOn') : t('teach.capture.setup.maskOff')}</span>
            </div>
          </div>
          <div className="tch-rec-actions">
            <button type="button" className="wka-btn primary" onClick={() => imp.build({ language: lang })}><FileVideo size={14} /> {t('teach.capture.import.start')}</button>
            <button type="button" className="wka-btn ghost" onClick={choose}>{t('teach.capture.import.another')}</button>
            <button type="button" className="wka-btn ghost" onClick={() => { imp.reset(); onBack() }}><ArrowLeft size={14} /> {t('teach.capture.import.back')}</button>
          </div>
        </div>
      )}

      {imp.phase === 'working' && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon"><Spinning /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.import.working')}</div>
            <p>{t('teach.capture.import.scanning', { pct })}</p>
            <div className="tch-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
            <div className="tch-recline" style={{ marginTop: 10 }}><Mic size={15} /><span>{
              imp.audio.state === 'transcribing' ? t('teach.capture.import.transcribing', { done: imp.audio.done, total: imp.audio.total })
                : imp.audio.state === 'none' ? t('teach.capture.import.noAudio')
                  : imp.audio.state === 'silent' ? t('teach.capture.import.silent')
                    : imp.audio.state === 'off' ? t('teach.capture.bar.voiceOff')
                      : t('teach.capture.import.decoding')
            }</span></div>
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn ghost danger" onClick={imp.cancel}><X size={14} /> {t('teach.capture.import.cancel')}</button>
          </div>
        </div>
      )}

      {imp.phase === 'finalizing' && <FinalizingRow progress={imp.progress} />}

      {imp.phase === 'error' && (
        <ErrorRow code={imp.errorCode} canRetry={false} onAgain={imp.file ? imp.again : choose}
          againLabel={imp.file ? t('teach.capture.import.retry') : t('teach.capture.import.pick')} />
      )}

      {imp.phase === 'done' && imp.result && (
        <ResultRow result={imp.result} onAgain={() => { imp.reset(); choose() }} againLabel={t('teach.capture.import.anotherVideo')} againIcon={<FileVideo size={14} />} />
      )}
    </div>
  )
}
