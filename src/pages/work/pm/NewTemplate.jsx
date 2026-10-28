// New project TEMPLATE (PM / Sr PM / admin): optional name + the goal. Submit
// -> api.workTemplateCreate (the AI maps the tasks and the quality gate checks
// the map before it is saved). The answer is classified ONCE by
// templatesModel.classifyTemplateCreate and rendered by the matching outcome
// card: template -> onCreated | single ("this is really one task") | refusal |
// quality (422 errors). Same modal shell + outcome cards as New project.
import { useEffect, useRef, useState } from 'react'
import { Loader2, X, LayoutTemplate, Info, AlertTriangle, ArrowRight, ListChecks, Pencil } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import WdPortal from '../WdPortal.jsx'
import { RefusalOutcome, QualityOutcome } from '../projects/CreateOutcome.jsx'
import { classifyTemplateCreate } from './templatesModel.js'

export default function NewTemplate({ onClose, onCreated }) {
  const t = useT()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [err, setErr] = useState('')
  const goalRef = useRef(null)
  useEffect(() => { if (!outcome && goalRef.current) goalRef.current.focus() }, [outcome])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const submit = async (e) => {
    if (e) e.preventDefault()
    const g = goal.trim()
    if (!g) { setErr(t('workPm.templates.create.errEmpty')); return }
    if (busy) return
    setBusy(true); setErr('')
    let res = null, thrown = null
    try { res = await api.workTemplateCreate({ goal: g, ...(name.trim() ? { name: name.trim() } : {}) }) }
    catch (ex) { thrown = ex }
    const out = classifyTemplateCreate(res, thrown)
    setBusy(false)
    if (out.kind === 'template') { onCreated(out.template); return }
    if (out.kind === 'error' || out.kind === 'upgrade') { setErr(t('workPm.templates.create.errGeneric')); return }
    if (out.kind === 'invalid') { setErr(out.text); return }
    setOutcome(out)
  }
  const backToForm = () => setOutcome(null)
  return (
    <WdPortal>
    <div className="wd-modal-ov" onClick={() => !busy && onClose()}>
      <div className="wd-pj-modal" role="dialog" aria-modal="true" aria-labelledby="wd-ep-tpl-new-title" onClick={(e) => e.stopPropagation()}>
        <div className="wd-pj-modal-top">
          <span className="wd-wiz-eyebrow"><LayoutTemplate size={13} /> {t('workPm.templates.create.eyebrow')}</span>
          <button type="button" className="wd-pj-btn icon" onClick={onClose} disabled={busy} aria-label={t('workPm.common.close')}><X size={16} /></button>
        </div>
        <div className="wd-pj-modal-body">
          {outcome === null ? (
            <form id="wd-ep-tpl-new-form" onSubmit={submit} style={{ display: 'contents' }}>
              <h3 id="wd-ep-tpl-new-title">{t('workPm.templates.create.title')}</h3>
              <div className="wd-pj-field">
                <label htmlFor="wd-ep-tpl-name">{t('workPm.templates.create.name')} <span className="opt">{t('workPm.create.optional')}</span></label>
                <input id="wd-ep-tpl-name" className="wd-pj-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('workPm.templates.create.namePh')} maxLength={120} disabled={busy} />
              </div>
              <div className="wd-pj-field">
                <label htmlFor="wd-ep-tpl-goal">{t('workPm.templates.create.goal')} <span className="req">{t('workPm.create.required')}</span></label>
                <textarea id="wd-ep-tpl-goal" ref={goalRef} className="wd-pj-ta" rows={5} value={goal} onChange={(e) => { setGoal(e.target.value); if (err) setErr('') }} placeholder={t('workPm.templates.create.goalPh')} disabled={busy} />
                <div className="wd-pj-help"><Info size={13} /> <span>{t('workPm.templates.create.goalHelp')}</span></div>
              </div>
              {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
            </form>
          ) : outcome.kind === 'single' ? (
            <>
              <h3 id="wd-ep-tpl-new-title">{t('workPm.templates.create.eyebrow')}</h3>
              <div className="wd-pj-out info" role="status">
                <h4><ListChecks size={17} /> {t('workPm.templates.create.singleTitle')}</h4>
                <p>{t('workPm.templates.create.singleBody')}</p>
                <div className="wd-pj-out-goal">{outcome.suggestedGoal || goal}</div>
                <div className="wd-pj-out-acts"><button type="button" className="wd-pj-btn primary" onClick={backToForm}><Pencil size={13} /> {t('workPm.templates.create.edit')}</button></div>
              </div>
            </>
          ) : outcome.kind === 'refusal' ? (
            <><h3 id="wd-ep-tpl-new-title">{t('workPm.templates.create.eyebrow')}</h3><RefusalOutcome text={outcome.text} onEdit={backToForm} /></>
          ) : (
            <><h3 id="wd-ep-tpl-new-title">{t('workPm.templates.create.eyebrow')}</h3><QualityOutcome errors={outcome.errors} onEdit={backToForm} /></>
          )}
        </div>
        {outcome === null && (
          <div className="wd-pj-modal-foot">
            <button type="button" className="wd-pj-btn" onClick={onClose} disabled={busy}>{t('workPm.common.cancel')}</button>
            <button type="submit" form="wd-ep-tpl-new-form" className="wd-pj-btn primary" disabled={busy || !goal.trim()}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {busy ? t('workPm.templates.create.planning') : t('workPm.templates.create.submit')}</button>
          </div>
        )}
      </div>
    </div>
    </WdPortal>
  )
}
