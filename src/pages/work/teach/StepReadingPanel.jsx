// One step's reading in the step editor (Wave 3). Collapsed rows carry a small
// mark (reading now, a suggestion to check, the suggestion already in the
// fields, or "fill in yourself"); the open row shows the suggestion itself: the
// control's visible label and the done check, with a plainly worded confidence
// band, "Use suggestion" (copies it into the fields only on that click) and
// "Read again". Failures are calm notes that say what to do. The trainer's own
// fields stay fully editable either way. Presentational.
import React from 'react'
import { ScanSearch, RotateCcw, Check, AlertTriangle, Info, ImageOff } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { Spinning } from '../../workadmin/sections/_shared.jsx'
import { confidenceBand, readingDiffers } from './stepReadingModel.js'
import { shownReading, shownNote, stepNoteKey, kindKey } from './stepReadRun.js'

// The band chip: worded plainly, colored by the shared tint tokens.
function BandChip({ band }) {
  const t = useT()
  return <span className={`tch-band ${band}`}>{t('teach.read.band.' + band)}</span>
}

// The collapsed row's mark, or nothing when the row has nothing to say.
export function ReadingMark({ row, next, reader }) {
  const t = useT()
  if (reader.currentId && row.id === reader.currentId) {
    return <span className="tch-readmark busy" title={t('teach.read.reading')}><Spinning /><span className="tch-readmark-txt">{t('teach.read.mark.reading')}</span></span>
  }
  const reading = shownReading(row, next)
  if (reading) {
    const used = !readingDiffers(row)
    return (
      <span className={`tch-readmark ${used ? 'used' : confidenceBand(reading)}`} title={used ? t('teach.read.inUse') : t('teach.read.mark.suggestionHint')}>
        {used ? <Check size={13} /> : <ScanSearch size={13} />}
        <span className="tch-readmark-txt">{used ? t('teach.read.mark.used') : t('teach.read.mark.suggestion')}</span>
      </span>
    )
  }
  if (shownNote(row, reader.notes)) {
    return <span className="tch-readmark note" title={t(stepNoteKey(shownNote(row, reader.notes)))}><AlertTriangle size={13} /><span className="tch-readmark-txt">{t('teach.read.mark.yourself')}</span></span>
  }
  return null
}

export default function StepReadingPanel({ row, next, reader, disabled, onAccept, onReadAgain }) {
  const t = useT()
  if (reader.currentId && row.id === reader.currentId) {
    return <div className="tch-recline tch-read-note"><Spinning /><span>{t('teach.read.reading')}</span></div>
  }
  const reading = shownReading(row, next)
  const note = shownNote(row, reader.notes)
  const again = (
    <button type="button" className="wka-btn sm ghost" disabled={disabled} onClick={onReadAgain}><RotateCcw size={13} /> {t('teach.read.readAgain')}</button>
  )

  if (reading) {
    const band = confidenceBand(reading)
    const differs = readingDiffers(row)
    const kk = kindKey(reading.controlKind)
    return (
      <div className={`tch-sug ${band}`}>
        <div className="tch-sug-head">
          <ScanSearch size={15} className="tch-sug-ikon" />
          <span className="tch-sug-ttl">{t('teach.read.panelTitle')}</span>
          <BandChip band={band} />
        </div>
        <dl className="tch-sug-rows">
          <div className="tch-sug-row">
            <dt>{t('teach.read.control')}</dt>
            <dd>{reading.controlLabel
              ? <><span className="tch-sug-label">{reading.controlLabel}</span>{kk ? <span className="tch-sug-kind">{t(kk)}</span> : null}</>
              : <span className="tch-sug-none">{t('teach.read.noControl')}</span>}</dd>
          </div>
          {reading.doneWhen && (
            <div className="tch-sug-row"><dt>{t('teach.read.doneWhen')}</dt><dd>{reading.doneWhen}</dd></div>
          )}
        </dl>
        <div className="tch-sug-foot">
          <p className="tch-sug-check"><Info size={13} /><span>{differs ? t('teach.read.check') : t('teach.read.inUse')}</span></p>
          <span className="tch-sug-acts">
            {again}
            {differs && <button type="button" className="wka-btn sm primary" disabled={disabled} onClick={onAccept}><Check size={13} /> {t('teach.read.use')}</button>}
          </span>
        </div>
      </div>
    )
  }

  if (note) {
    return (
      <div className="tch-read-note tch-recline warn">
        <AlertTriangle size={15} /><span>{t(stepNoteKey(note))}</span>
        {note !== 'noFrame' && note !== 'missing' && <span className="tch-read-note-act">{again}</span>}
      </div>
    )
  }
  if (reader.used && !row.shot && String(row.instruction || '').trim()) {
    return <div className="tch-read-note tch-recline"><ImageOff size={15} /><span>{t('teach.read.note.noShot')}</span></div>
  }
  return null
}
