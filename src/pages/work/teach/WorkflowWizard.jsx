// Guided, context-aware authoring wizard for a single workflow. Five phases
// (Basics, Details, Scope & privacy, Steps, Review) with a stepper, inline
// reflections of what the author has entered, required-field validation that
// mirrors the server, and a Save draft / Publish footer. In Steps the author
// writes steps by hand, records a demonstration, or imports a recording
// (CaptureCard), which drafts them into the same editor (StepEditor) for review. Presentational + its own save
// round-trips; it never changes backend logic.
import React, { useMemo, useState } from 'react'
import {
  GraduationCap, ChevronLeft, ChevronRight, Check, Plus,
  Info, AlertTriangle, ShieldCheck, X, ListChecks,
} from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useLocale } from '../../../i18n/index.jsx'
import { Spinning, ErrorBox } from '../../workadmin/sections/_shared.jsx'
import { isDlpActive } from '../../../scrub.js'
import {
  PHASES, emptyMeta, emptyStep, metaToForm, stepsToForm, metaToPayload, stepsToPayload,
  missingMeta, stepsValid, REQUIRED_META,
} from './workflowModel.js'
import { withRowKeys, newRowKey, initialOpenKeys } from './stepRows.js'
import { mergeRecordedSteps } from './recordModel.js'
import StepEditor from './StepEditor.jsx'
import CaptureCard from './CaptureCard.jsx'
import { transcribeLanguage } from './voiceModel.js'

// One text field in the wizard (label + optional required marker + input).
function Field({ label, required, hint, full, children }) {
  return (
    <div className={`wka-field${full ? ' tch-full' : ''}`}>
      <label>{label}{required ? <span className="tch-req"> *</span> : null}{hint ? <span className="hint"> {hint}</span> : null}</label>
      {children}
    </div>
  )
}

export default function WorkflowWizard({ initial, onCancel, onSaved }) {
  const { t, locale } = useLocale()
  const editing = !!(initial && initial.id)
  const [meta, setMeta] = useState(() => (editing ? metaToForm(initial.meta) : emptyMeta()))
  const [steps, setSteps] = useState(() => withRowKeys(editing && Array.isArray(initial.steps) && initial.steps.length ? stepsToForm(initial.steps) : [emptyStep()]))
  const [open, setOpen] = useState(() => initialOpenKeys(steps))   // which step rows are expanded
  const [maskFrames, setMaskFrames] = useState(true)                // mask sensitive text in recorded screenshots
  const [recBusy, setRecBusy] = useState(false)                     // a recording is live or saving: hold navigation
  const holdTitle = recBusy ? t('teach.capture.busyHint') : ''
  const dlp = isDlpActive()
  const [phase, setPhase] = useState(0)
  const [ack, setAck] = useState(editing)                 // privacy/scope acknowledgement
  const [id, setId] = useState(editing ? initial.id : null)
  const [busy, setBusy] = useState('')                    // '', 'draft', 'publish'
  const [err, setErr] = useState('')
  const [triedNext, setTriedNext] = useState(false)       // show required markers only after a Next on Basics

  const missing = useMemo(() => missingMeta(meta), [meta])
  const okSteps = useMemo(() => stepsValid(steps), [steps])
  const canSaveDraft = missing.length === 0 && !busy
  const canPublishNow = missing.length === 0 && okSteps && ack && !busy

  const setField = (k, v) => setMeta((m) => ({ ...m, [k]: v }))
  const setStep = (i, k, v) => setSteps((list) => list.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const addStep = () => {
    const row = { ...emptyStep(), _k: newRowKey() }
    setSteps((list) => [...list, row])
    setOpen((o) => new Set(o).add(row._k))
  }
  const removeStep = (i) => setSteps((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : list))
  const toggleRow = (k) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const setAllRows = (on) => setOpen(on ? new Set(steps.map((s) => s._k)) : new Set())
  // A finished recording: its drafted steps replace a blank editor or follow the
  // author's own steps; the first drafted step opens for review. Returns the mode
  // so the recorder can say which one happened.
  const loadRecorded = (recorded) => {
    const rows = withRowKeys(recorded)
    const { steps: next, mode } = mergeRecordedSteps(steps, rows)
    setSteps(next)
    setOpen(rows.length ? new Set([rows[0]._k]) : new Set())
    return mode
  }
  const moveStep = (i, dir) => setSteps((list) => {
    const j = i + dir
    if (j < 0 || j >= list.length) return list
    const copy = list.slice();[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
  })

  // Persist the current form. Creates on first save, patches afterwards. Returns
  // the saved workflow id, or null on failure (error already surfaced).
  const persist = async () => {
    const body = { meta: metaToPayload(meta), steps: stepsToPayload(steps) }
    try {
      if (id) { await api.workflowUpdate(id, body); return id }
      const r = await api.workflowCreate(body)
      const newId = r && r.workflow && r.workflow.id
      setId(newId || null)
      return newId || null
    } catch (e) {
      setErr(friendlyError(e, t('teach.wizard.errSave')))
      return null
    }
  }

  const saveDraft = async () => {
    if (!canSaveDraft) { setPhase(0); setTriedNext(true); return }
    setBusy('draft'); setErr('')
    const savedId = await persist()
    setBusy('')
    if (savedId) onSaved({ action: 'draft' })
  }

  const publish = async () => {
    if (!canPublishNow) return
    setBusy('publish'); setErr('')
    const savedId = await persist()
    if (!savedId) { setBusy(''); return }
    try {
      await api.workflowPublish(savedId)
      setBusy('')
      onSaved({ action: 'publish' })
    } catch (e) {
      setBusy('')
      setErr(friendlyError(e, t('teach.wizard.errPublish')))
    }
  }

  const goNext = () => {
    // Leaving Basics requires the four fields the server needs to create.
    if (PHASES[phase] === 'basics' && missing.length) { setTriedNext(true); return }
    setTriedNext(false)
    setPhase((p) => Math.min(PHASES.length - 1, p + 1))
  }
  const goBack = () => { setTriedNext(false); setPhase((p) => Math.max(0, p - 1)) }
  const jump = (i) => {
    // Only allow jumping ahead once Basics is complete, so the server contract
    // (required meta) is never skipped; jumping back is always fine.
    if (i > phase && PHASES[phase] === 'basics' && missing.length) { setTriedNext(true); return }
    setTriedNext(false); setPhase(i)
  }

  const cur = PHASES[phase]
  const stepLabel = (k) => t('teach.wizard.stepper.' + k)

  return (
    <section className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}><GraduationCap size={16} style={{ verticalAlign: -3, marginRight: 6, color: 'var(--wka-accent)' }} />{editing ? t('teach.wizard.editTitle', { v: initial.version }) : t('teach.wizard.newTitle')}</h2>
        <span className="wka-spacer" style={{ flex: 1 }} />
        <button type="button" className="wka-btn sm ghost" disabled={recBusy} title={holdTitle} onClick={onCancel}><X size={14} /> {t('teach.wizard.cancel')}</button>
      </div>

      {/* stepper */}
      <div className="tch-stepper" role="tablist" aria-label={t('teach.wizard.stepsAria')}>
        {PHASES.map((k, i) => (
          <button key={k} type="button" role="tab" aria-selected={i === phase}
            className={`tch-step${i === phase ? ' on' : ''}${i < phase ? ' done' : ''}`} disabled={recBusy && i !== phase} title={i !== phase ? holdTitle : ''} onClick={() => jump(i)}>
            <span className="n">{i < phase ? <Check size={12} /> : i + 1}</span>{stepLabel(k)}
          </button>
        ))}
      </div>

      {/* context reflection: what the author is teaching */}
      {meta.productName.trim() && (
        <div className="tch-reflect"><Info size={15} /><span>{t.rich('teach.wizard.reflect', { product: meta.productName.trim(), title: meta.title.trim() || t('teach.wizard.reflectUntitled') })}</span></div>
      )}

      {/* ---------------- Basics ---------------- */}
      {cur === 'basics' && (
        <div>
          <p className="tch-phase-lead">{t('teach.wizard.basics.lead')}</p>
          <div className="wka-formgrid">
            <Field label={t('teach.wizard.basics.productName')} required>
              <input className="wka-input" value={meta.productName} maxLength={120} placeholder={t('teach.wizard.basics.productNamePh')} onChange={(e) => setField('productName', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.basics.titleField')} required>
              <input className="wka-input" value={meta.title} maxLength={160} placeholder={t('teach.wizard.basics.titlePh')} onChange={(e) => setField('title', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.basics.owner')} required hint={t('teach.wizard.basics.ownerHint')}>
              <input className="wka-input" value={meta.owner} maxLength={120} placeholder={t('teach.wizard.basics.ownerPh')} onChange={(e) => setField('owner', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.basics.launchTarget')} required hint={t('teach.wizard.basics.launchTargetHint')}>
              <input className="wka-input" value={meta.launchTarget} maxLength={200} placeholder={t('teach.wizard.basics.launchTargetPh')} onChange={(e) => setField('launchTarget', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.basics.category')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" value={meta.category} maxLength={80} placeholder={t('teach.wizard.basics.categoryPh')} onChange={(e) => setField('category', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.basics.duration')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" type="number" min="1" value={meta.durationMin} placeholder={t('teach.wizard.basics.durationPh')} onChange={(e) => setField('durationMin', e.target.value.replace(/[^0-9]/g, ''))} />
            </Field>
          </div>
          {triedNext && missing.length > 0 && (
            <div className="tch-missing"><AlertTriangle size={15} /><span>{t('teach.wizard.needRequired', { fields: missing.map((k) => t('teach.wizard.fieldName.' + k)).join(', ') })}</span></div>
          )}
        </div>
      )}

      {/* ---------------- Details ---------------- */}
      {cur === 'details' && (
        <div>
          <p className="tch-phase-lead">{t('teach.wizard.details.lead')}</p>
          <div className="wka-formgrid">
            <Field label={t('teach.wizard.details.version')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" value={meta.version} maxLength={40} placeholder={t('teach.wizard.details.versionPh')} onChange={(e) => setField('version', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.details.language')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" value={meta.language} maxLength={40} placeholder={t('teach.wizard.details.languagePh')} onChange={(e) => setField('language', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.details.supportEmail')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" type="email" value={meta.supportEmail} maxLength={160} placeholder={t('teach.wizard.details.supportEmailPh')} onChange={(e) => setField('supportEmail', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.details.supportContact')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" value={meta.supportContact} maxLength={160} placeholder={t('teach.wizard.details.supportContactPh')} onChange={(e) => setField('supportContact', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.details.webLink')} hint={t('teach.wizard.optional')}>
              <input className="wka-input" value={meta.webLink} maxLength={300} placeholder={t('teach.wizard.details.webLinkPh')} onChange={(e) => setField('webLink', e.target.value)} />
            </Field>
            <Field label={t('teach.wizard.details.prerequisites')} full hint={t('teach.wizard.optional')}>
              <textarea className="wka-input" rows={2} value={meta.prerequisites} maxLength={400} placeholder={t('teach.wizard.details.prerequisitesPh')} onChange={(e) => setField('prerequisites', e.target.value)} style={{ resize: 'vertical' }} />
            </Field>
          </div>
        </div>
      )}

      {/* ---------------- Scope & privacy ---------------- */}
      {cur === 'scope' && (
        <div>
          <p className="tch-phase-lead">{t('teach.wizard.scope.lead')}</p>
          <div className="wka-note" style={{ alignItems: 'flex-start' }}><ShieldCheck size={16} style={{ color: 'var(--wka-accent)', flexShrink: 0, marginTop: 1 }} /><span style={{ minWidth: 0 }}>{t('teach.wizard.scope.note')}</span></div>
          <ul style={{ margin: '10px 0 16px', paddingLeft: 20, color: 'var(--wka-muted)', fontSize: 13, lineHeight: 1.7 }}>
            <li>{t('teach.wizard.scope.point1')}</li>
            <li>{t('teach.wizard.scope.point2')}</li>
            <li>{t('teach.wizard.scope.point3')}</li>
            <li>{t('teach.wizard.scope.point4')}</li>
          </ul>
          <label className="wka-check"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> {t('teach.wizard.scope.ack')}</label>
          <div className="tch-maskopt">
            <label className="wka-check"><input type="checkbox" checked={dlp || maskFrames} disabled={dlp} onChange={(e) => setMaskFrames(e.target.checked)} /> {t('teach.wizard.scope.mask')}</label>
            <p className="tch-rec-fine">{dlp ? t('teach.wizard.scope.maskDlp') : t('teach.wizard.scope.maskHint')}</p>
          </div>
        </div>
      )}

      {/* ---------------- Steps ---------------- */}
      {cur === 'steps' && (
        <div>
          <p className="tch-phase-lead">{t('teach.wizard.steps.lead')}</p>
          <CaptureCard mask={maskFrames} language={transcribeLanguage(meta.language, locale)} onSteps={loadRecorded} onBusyChange={setRecBusy} />
          <StepEditor steps={steps} open={open} onToggle={toggleRow} onSetAll={setAllRows}
            onChange={setStep} onMove={moveStep} onRemove={removeStep} />
          <button type="button" className="wka-btn sm" style={{ marginTop: 12 }} onClick={addStep}><Plus size={14} /> {t('teach.wizard.steps.addStep')}</button>
          {!okSteps && <div className="tch-missing" style={{ marginTop: 14 }}><AlertTriangle size={15} /><span>{t('teach.wizard.steps.needOne')}</span></div>}
        </div>
      )}

      {/* ---------------- Review ---------------- */}
      {cur === 'review' && (
        <div>
          <p className="tch-phase-lead">{t('teach.wizard.review.lead')}</p>
          {(missing.length > 0 || !okSteps) && (
            <div className="tch-missing"><AlertTriangle size={15} /><span>{missing.length > 0 ? t('teach.wizard.needRequired', { fields: missing.map((k) => t('teach.wizard.fieldName.' + k)).join(', ') }) : t('teach.wizard.steps.needOne')}</span></div>
          )}
          <div className="tch-review">
            <div className="wka-panel" style={{ margin: 0 }}>
              <h2 style={{ fontSize: 14 }}><ListChecks size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('teach.wizard.review.detailsTitle')}</h2>
              <div className="tch-detail" style={{ gridTemplateColumns: '1fr' }}>
                {REQUIRED_META.concat(['version', 'category', 'durationMin', 'language', 'supportEmail', 'supportContact', 'webLink', 'prerequisites']).map((k) => {
                  const v = String(meta[k] || '').trim()
                  if (!v) return null
                  return <div className="tch-detrow" key={k}><span className="tch-detk">{t('teach.wizard.fieldName.' + k)}</span><span className="tch-detv">{v}</span></div>
                })}
              </div>
            </div>
            <div className="wka-panel" style={{ margin: 0 }}>
              <h2 style={{ fontSize: 14 }}><GraduationCap size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('teach.wizard.review.stepsTitle', { n: stepsToPayload(steps).length })}</h2>
              <ol className="tch-steplist" style={{ counterReset: 'tch' }}>
                {stepsToPayload(steps).map((s, i) => <li key={i}><span>{s.instruction}</span></li>)}
                {stepsToPayload(steps).length === 0 && <li style={{ color: 'var(--wka-faint)' }}>{t('teach.wizard.review.noSteps')}</li>}
              </ol>
            </div>
          </div>
        </div>
      )}

      {err && <div style={{ marginTop: 14 }}><ErrorBox error={{ status: 400, message: err }} /></div>}

      {/* footer actions */}
      <div className="tch-wizfoot">
        <button type="button" className="wka-btn ghost" disabled={phase === 0 || !!busy || recBusy} title={holdTitle} onClick={goBack}><ChevronLeft size={14} /> {t('teach.wizard.back')}</button>
        {phase < PHASES.length - 1
          ? <button type="button" className="wka-btn primary" disabled={recBusy} title={holdTitle} onClick={goNext}>{t('teach.wizard.next')} <ChevronRight size={14} /></button>
          : <span />}
        <span className="wka-spacer" />
        <button type="button" className="wka-btn" disabled={!canSaveDraft || recBusy} title={recBusy ? holdTitle : missing.length ? t('teach.wizard.needBasicsFirst') : ''} onClick={saveDraft}>{busy === 'draft' ? <Spinning /> : <Check size={14} />} {t('teach.wizard.saveDraft')}</button>
        <button type="button" className="wka-btn primary" disabled={!canPublishNow || recBusy} title={recBusy ? holdTitle : !ack ? t('teach.wizard.ackFirst') : (missing.length || !okSteps) ? t('teach.wizard.completeFirst') : ''} onClick={publish}>{busy === 'publish' ? <Spinning /> : <GraduationCap size={14} />} {t('teach.wizard.publish')}</button>
      </div>
    </section>
  )
}
