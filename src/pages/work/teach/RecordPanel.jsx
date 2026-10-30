// "Record a demonstration" in the Teach wizard's Steps phase. A guided card that
// walks the trainer through: set up (narration consent, language, what masking
// will do) -> share the app window -> record with live feedback (indicator,
// timer, what has been captured, Mark step) -> preparing (masking + saving
// progress) -> a reflection of what was captured, with the drafted steps loaded
// into the editor below. Where screen share cannot work (phones, tablets, an
// insecure page, an old browser, a refused share) it says why in plain words and
// hand-writing stays right there. All recording logic lives in useDemoRecorder.
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Video, ShieldCheck, ShieldOff, Mic, MicOff, Info, AlertTriangle, RotateCcw, ExternalLink, Check, Monitor } from 'lucide-react'
import { useLocale, LOCALES, getLocaleMeta } from '../../../i18n/index.jsx'
import { isMobileUA } from '../lib.js'
import { isDlpActive } from '../../../scrub.js'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { useDemoRecorder } from './useDemoRecorder.js'
import { usePopout } from './usePopout.js'
import { narrationSupported } from './speechNarration.js'
import RecorderBar from './RecorderBar.jsx'
import { recordSupport, captureErrorKey, formatClock, maskingOn, progressPct } from './recordModel.js'

function detectSupport() {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
  return recordSupport({
    mobile: isMobileUA(),
    secure: typeof window === 'undefined' ? true : window.isSecureContext !== false,
    hasDisplayMedia: !!(md && typeof md.getDisplayMedia === 'function'),
  })
}

const MIC_NOTE = { denied: 'micDenied', nomic: 'micNone', network: 'micNetwork', unsupported: 'micUnsupported' }

export default function RecordPanel({ mask, onSteps, onBusyChange }) {
  const { t, locale } = useLocale()
  const support = useMemo(detectSupport, [])
  const canNarrate = useMemo(narrationSupported, [])
  const dlp = isDlpActive()
  const masking = maskingOn({ mask, dlp })
  const [setup, setSetup] = useState(false)
  const [narrate, setNarrate] = useState(canNarrate)
  const [lang, setLang] = useState(() => getLocaleMeta(locale).tag)
  const rec = useDemoRecorder({ mask, lang, t, onSteps })
  const pop = usePopout()
  const live = rec.phase === 'recording' || rec.phase === 'paused'

  // Tell the wizard while a recording is live or saving, so it holds navigation.
  useEffect(() => { if (onBusyChange) onBusyChange(rec.busy) }, [rec.busy, onBusyChange])
  useEffect(() => () => { if (onBusyChange) onBusyChange(false) }, [onBusyChange])

  // The pop-out only lives as long as the recording does.
  useEffect(() => { if (!live && pop.win) pop.close() }, [live, pop])

  const begin = () => { setSetup(false); rec.start({ narrate: canNarrate && narrate }) }

  // ---- not available on this device: explain, keep hand-writing ----------
  if (!support.ok) {
    return (
      <div className="tch-rec tch-rec-off" role="note">
        <span className="tch-rec-ikon muted"><Monitor size={18} /></span>
        <div className="tch-rec-txt">
          <div className="tch-rec-ttl">{t('teach.capture.off.title')}</div>
          <p>{t('teach.capture.off.' + support.reason)}</p>
        </div>
      </div>
    )
  }

  const maskLine = (
    <div className={`tch-recline${masking ? ' ok' : ' warn'}`}>
      {masking ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
      <span>{dlp ? t('teach.capture.setup.maskDlp') : masking ? t('teach.capture.setup.maskOn') : t('teach.capture.setup.maskOff')}</span>
    </div>
  )

  return (
    <div className={`tch-rec${live ? ' live' : ''}`}>
      {/* the hidden source for frames; also a small live preview while recording */}
      <video ref={rec.videoRef} muted playsInline aria-label={t('teach.capture.bar.previewAria')}
        className={live ? 'tch-recpreview' : 'tch-hidden'} />

      {/* ---------- idle: invite ---------- */}
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
          </div>
        </div>
      )}

      {/* ---------- idle: set up ---------- */}
      {rec.phase === 'idle' && setup && (
        <div>
          <div className="tch-rec-row">
            <span className="tch-rec-ikon"><Video size={18} /></span>
            <div className="tch-rec-txt">
              <div className="tch-rec-ttl">{t('teach.capture.title')}</div>
              <p>{t('teach.capture.setup.shareTip')}</p>
            </div>
          </div>
          <div className="tch-rec-setup">
            <div className="tch-rec-opt">
              <label className="wka-check"><input type="checkbox" checked={canNarrate && narrate} disabled={!canNarrate} onChange={(e) => setNarrate(e.target.checked)} /> {t('teach.capture.setup.narrate')}</label>
              <p className="tch-rec-fine">{canNarrate ? t('teach.capture.setup.narrateConsent') : t('teach.capture.setup.narrateNoSupport')}</p>
              {canNarrate && narrate && (
                <div className="wka-field tch-rec-lang">
                  <label htmlFor="tch-rec-lang">{t('teach.capture.setup.language')}</label>
                  <select id="tch-rec-lang" className="wka-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                    {LOCALES.map((l) => <option key={l.code} value={l.tag}>{l.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            {maskLine}
            <div className="tch-recline"><Info size={15} /><span>{t('teach.capture.setup.memory')}</span></div>
          </div>
          <div className="tch-rec-actions">
            <button type="button" className="wka-btn primary" onClick={begin}><Video size={14} /> {t('teach.capture.setup.start')}</button>
            <button type="button" className="wka-btn ghost" onClick={() => setSetup(false)}>{t('teach.capture.setup.back')}</button>
          </div>
        </div>
      )}

      {/* ---------- waiting on the browser's share dialog ---------- */}
      {rec.phase === 'prompt' && (
        <div className="tch-rec-row"><span className="tch-rec-ikon"><Spinning /></span><div className="tch-rec-txt"><div className="tch-rec-ttl">{t('teach.capture.title')}</div><p>{t('teach.capture.prompt')}</p></div></div>
      )}

      {/* ---------- recording ---------- */}
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
            {rec.mic === 'on' && (
              <div className="tch-recline"><Mic size={15} /><span className="tch-hearing">{rec.hearing ? t('teach.capture.bar.hearing', { text: rec.hearing }) : t('teach.capture.bar.listening')}</span></div>
            )}
            {rec.mic === 'on' && rec.onDevice && <div className="tch-recline ok"><ShieldCheck size={15} /><span>{t('teach.capture.bar.onDevice')}</span></div>}
            {MIC_NOTE[rec.mic] && <div className="tch-recline warn"><MicOff size={15} /><span>{t('teach.capture.bar.' + MIC_NOTE[rec.mic])}</span></div>}
            {rec.mic === 'off' && <div className="tch-recline"><MicOff size={15} /><span>{t('teach.capture.bar.micOff')}</span></div>}
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

      {/* ---------- masking + saving ---------- */}
      {rec.phase === 'finalizing' && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon"><Spinning /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.finalize.title')}</div>
            <p>{rec.progress ? t('teach.capture.finalize.' + rec.progress.stage, { done: rec.progress.done, total: rec.progress.total }) : t('teach.capture.finalize.align')}</p>
            {rec.progress && rec.progress.total > 0 && (
              <div className="tch-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct(rec.progress)}>
                <span style={{ width: `${progressPct(rec.progress)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- share refused / failed: recoverable ---------- */}
      {rec.phase === 'denied' && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon warn"><AlertTriangle size={18} /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.denied.title')}</div>
            <p>{t('teach.capture.denied.' + (rec.denied || 'failed'))}</p>
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn primary" onClick={() => { rec.reset(); setSetup(true) }}><RotateCcw size={14} /> {t('teach.capture.denied.retry')}</button>
          </div>
        </div>
      )}

      {/* ---------- finalize failed: by code, retry without re-recording ---------- */}
      {rec.phase === 'error' && (
        <div className="tch-rec-row">
          <span className="tch-rec-ikon warn"><AlertTriangle size={18} /></span>
          <div className="tch-rec-txt">
            <div className="tch-rec-ttl">{t('teach.capture.err.title')}</div>
            <p>{t(captureErrorKey(rec.errorCode))}</p>
          </div>
          <div className="tch-rec-cta">
            {rec.canRetry
              ? <button type="button" className="wka-btn primary" onClick={rec.retry}><RotateCcw size={14} /> {t('teach.capture.err.retry')}</button>
              : <button type="button" className="wka-btn primary" onClick={() => { rec.reset(); setSetup(true) }}><Video size={14} /> {t('teach.capture.done.again')}</button>}
            {rec.canRetry && <button type="button" className="wka-btn ghost danger" onClick={rec.cancel}>{t('teach.capture.err.discard')}</button>}
          </div>
        </div>
      )}

      {/* ---------- done: reflect what was captured ---------- */}
      {rec.phase === 'done' && rec.result && (
        <div className="tch-rec-row">
          <span className={`tch-rec-ikon${rec.result.summary.steps ? ' ok' : ' warn'}`}>{rec.result.summary.steps ? <Check size={18} /> : <AlertTriangle size={18} />}</span>
          <div className="tch-rec-txt">
            {rec.result.summary.steps > 0 && (
              <>
                <div className="tch-rec-ttl">{t('teach.capture.done.summary', {
                  time: formatClock(rec.result.summary.durationMs),
                  steps: t.n('teach.capture.count.steps', rec.result.summary.steps, { n: rec.result.summary.steps }),
                  screens: t.n('teach.capture.count.screens', rec.result.summary.frames, { n: rec.result.summary.frames }),
                })}</div>
                <p>
                  {rec.result.summary.narrated > 0 && <>{t.n('teach.capture.done.narrated', rec.result.summary.narrated, { n: rec.result.summary.narrated })} </>}
                  {rec.result.mode === 'append' ? t('teach.capture.done.appended') : t('teach.capture.done.replaced')}
                </p>
                {masking && rec.result.summary.shots > 0 && <div className="tch-recline ok"><ShieldCheck size={15} /><span>{t('teach.capture.done.masked')}</span></div>}
              </>
            )}
            {rec.result.warnings.map((w) => (
              <div key={w.key} className="tch-recline warn"><AlertTriangle size={15} /><span>{t(w.key, w.vars)}</span></div>
            ))}
          </div>
          <div className="tch-rec-cta">
            <button type="button" className="wka-btn" onClick={() => { rec.reset(); setSetup(true) }}><Video size={14} /> {t('teach.capture.done.again')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
