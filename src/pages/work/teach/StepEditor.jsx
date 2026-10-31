// The Teach wizard's step editor: one compact, expandable row per step (number,
// screenshot thumbnail, instruction preview, move / remove tools), opening to
// the full fields and the step's screenshot. Used for hand-written steps and for
// steps drafted from a recording alike. When the wizard passes a step reader
// (Wave 3), each row also carries its reading (StepReadingPanel.jsx). Screenshots are stored frame refs shown
// through api.workflowFramePath (same-origin, session cookie). Presentational:
// the wizard owns the rows and which ones are open.
import React, { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, ChevronRight, ImageOff, X } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import StepReadingPanel, { ReadingMark } from './StepReadingPanel.jsx'

function Field({ label, hint, full, children }) {
  return (
    <div className={`wka-field${full ? ' tch-full' : ''}`}>
      <label>{label}{hint ? <span className="hint"> {hint}</span> : null}</label>
      {children}
    </div>
  )
}

export default function StepEditor({ steps, open, onToggle, onSetAll, onChange, onMove, onRemove, reader, readDisabled, onAccept, onReadAgain }) {
  const t = useT()
  const [broken, setBroken] = useState(() => new Set())
  const markBroken = (ref) => setBroken((b) => (b.has(ref) ? b : new Set(b).add(ref)))
  const allOpen = steps.length > 0 && steps.every((s) => open.has(s._k))

  return (
    <div>
      {steps.length > 1 && (
        <div className="tch-edit-bar">
          <button type="button" className="wka-btn sm ghost" onClick={() => onSetAll(!allOpen)}>{allOpen ? t('teach.wizard.steps.collapseAll') : t('teach.wizard.steps.expandAll')}</button>
        </div>
      )}
      <div className="tch-editsteps">
        {steps.map((s, i) => {
          const isOpen = open.has(s._k)
          const shot = s.shot && !broken.has(s.shot) ? s.shot : ''
          const preview = String(s.instruction || '').trim()
          return (
            <div key={s._k} className={`tch-editstep${isOpen ? ' open' : ''}`}>
              <div className="tch-editstep-head">
                <button type="button" className="tch-editstep-toggle" aria-expanded={isOpen}
                  title={isOpen ? t('teach.wizard.steps.collapse') : t('teach.wizard.steps.expand')} onClick={() => onToggle(s._k)}>
                  <ChevronRight size={15} className="tch-chev" />
                  <span className="tch-editstep-n">{i + 1}</span>
                  {s.shot && (
                    shot
                      ? <img className="tch-thumb" src={api.workflowFramePath(shot)} alt="" loading="lazy" onError={() => markBroken(s.shot)} />
                      : <span className="tch-thumb tch-thumb-missing" aria-hidden="true"><ImageOff size={14} /></span>
                  )}
                  <span className={`tch-editstep-ttl${preview ? '' : ' empty'}`}>{preview || t('teach.wizard.steps.emptyStep')}</span>
                  {reader && <ReadingMark row={s} next={steps[i + 1]} reader={reader} />}
                </button>
                <span className="tch-editstep-tools">
                  <button type="button" className="wka-btn sm ghost" disabled={i === 0} title={t('teach.wizard.steps.moveUp')} aria-label={t('teach.wizard.steps.moveUp')} onClick={() => onMove(i, -1)}><ArrowUp size={13} /></button>
                  <button type="button" className="wka-btn sm ghost" disabled={i === steps.length - 1} title={t('teach.wizard.steps.moveDown')} aria-label={t('teach.wizard.steps.moveDown')} onClick={() => onMove(i, 1)}><ArrowDown size={13} /></button>
                  <button type="button" className="wka-btn sm ghost" disabled={steps.length <= 1} title={t('teach.wizard.steps.remove')} aria-label={t('teach.wizard.steps.remove')} onClick={() => onRemove(i)}><Trash2 size={13} /></button>
                </span>
              </div>
              {isOpen && (
                <div className="tch-editstep-body">
                  {s.shot && (
                    <figure className="tch-shot">
                      {shot
                        ? <img src={api.workflowFramePath(shot)} alt={t('teach.wizard.steps.shotAlt', { n: i + 1 })} loading="lazy" onError={() => markBroken(s.shot)} />
                        : <div className="tch-shot-missing"><ImageOff size={16} /><span>{t('teach.wizard.steps.shotMissing')}</span></div>}
                      <figcaption>
                        <span>{t('teach.wizard.steps.shot')}</span>
                        <button type="button" className="wka-btn sm ghost danger" onClick={() => onChange(i, 'shot', '')}><X size={13} /> {t('teach.wizard.steps.removeShot')}</button>
                      </figcaption>
                    </figure>
                  )}
                  <div className="wka-field" style={{ marginBottom: 12 }}>
                    <label>{t('teach.wizard.steps.instruction')}<span className="tch-req"> *</span></label>
                    <textarea className="wka-input" rows={2} value={s.instruction} maxLength={600} placeholder={t('teach.wizard.steps.instructionPh')} onChange={(e) => onChange(i, 'instruction', e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  {reader && <StepReadingPanel row={s} next={steps[i + 1]} reader={reader} disabled={readDisabled} onAccept={() => onAccept(i)} onReadAgain={() => onReadAgain(s._k)} />}
                  <div className="tch-editstep-grid">
                    <Field label={t('teach.wizard.steps.target')} hint={t('teach.wizard.optional')}>
                      <input className="wka-input" value={s.target} maxLength={200} placeholder={t('teach.wizard.steps.targetPh')} onChange={(e) => onChange(i, 'target', e.target.value)} />
                    </Field>
                    <Field label={t('teach.wizard.steps.doneWhen')} hint={t('teach.wizard.optional')}>
                      <input className="wka-input" value={s.doneWhen} maxLength={200} placeholder={t('teach.wizard.steps.doneWhenPh')} onChange={(e) => onChange(i, 'doneWhen', e.target.value)} />
                    </Field>
                    <Field label={t('teach.wizard.steps.docRef')} full hint={t('teach.wizard.optional')}>
                      <input className="wka-input" value={s.docRef} maxLength={300} placeholder={t('teach.wizard.steps.docRefPh')} onChange={(e) => onChange(i, 'docRef', e.target.value)} />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
