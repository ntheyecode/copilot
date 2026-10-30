// Set-up step before a live recording: narration with the microphone (consent
// line + language), optionally the call's audio (only after the trainer confirms
// everyone on the call knows it is being recorded), what masking will do, and
// where the screens stay. Calls onStart({ narrate, callAudio, language }).
import React, { useState } from 'react'
import { Video, ShieldCheck, ShieldOff, Info, Mic, Users } from 'lucide-react'
import { useLocale, LOCALES } from '../../../i18n/index.jsx'
import { narrationLanguages } from './voiceModel.js'

export default function RecordSetup({ masking, dlp, language, onStart, onBack }) {
  const { t } = useLocale()
  const [narrate, setNarrate] = useState(true)
  const [lang, setLang] = useState(language)
  const [callAudio, setCallAudio] = useState(false)
  const [callConsent, setCallConsent] = useState(false)
  const callBlocked = callAudio && !callConsent
  const options = narrationLanguages(LOCALES)

  return (
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
          <label className="wka-check"><input type="checkbox" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} /> <Mic size={14} /> {t('teach.capture.setup.narrate')}</label>
          <p className="tch-rec-fine">{t('teach.capture.setup.narrateConsent')}</p>
          {(narrate || callAudio) && (
            <div className="wka-field tch-rec-lang">
              <label htmlFor="tch-rec-lang">{t('teach.capture.setup.language')}</label>
              <select id="tch-rec-lang" className="wka-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="tch-rec-opt">
          <label className="wka-check"><input type="checkbox" checked={callAudio} onChange={(e) => { setCallAudio(e.target.checked); if (!e.target.checked) setCallConsent(false) }} /> <Users size={14} /> {t('teach.capture.setup.callAudio')}</label>
          <p className="tch-rec-fine">{t('teach.capture.setup.callAudioHint')}</p>
          {callAudio && (
            <label className="wka-check tch-rec-consent"><input type="checkbox" checked={callConsent} onChange={(e) => setCallConsent(e.target.checked)} /> {t('teach.capture.setup.callConsent')}</label>
          )}
        </div>
        <div className={`tch-recline${masking ? ' ok' : ' warn'}`}>
          {masking ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
          <span>{dlp ? t('teach.capture.setup.maskDlp') : masking ? t('teach.capture.setup.maskOn') : t('teach.capture.setup.maskOff')}</span>
        </div>
        <div className="tch-recline"><Info size={15} /><span>{t('teach.capture.setup.memory')}</span></div>
      </div>
      <div className="tch-rec-actions">
        <button type="button" className="wka-btn primary" disabled={callBlocked} title={callBlocked ? t('teach.capture.setup.callConsentNeeded') : ''}
          onClick={() => onStart({ narrate, callAudio: callAudio && callConsent, language: lang })}><Video size={14} /> {t('teach.capture.setup.start')}</button>
        <button type="button" className="wka-btn ghost" onClick={onBack}>{t('teach.capture.setup.back')}</button>
        {callBlocked && <span className="tch-rec-fine">{t('teach.capture.setup.callConsentNeeded')}</span>}
      </div>
    </div>
  )
}
