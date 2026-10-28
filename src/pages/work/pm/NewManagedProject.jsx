// New MANAGED project (PM / Sr PM / admin): optional name, the goal and, for a
// Sr PM or admin, who manages it (a project manager; defaults to me when I am
// one). Submit -> api.workPmProjectCreate (the AI maps the tasks through the
// same planner + quality gate as the project engine). The answer is classified
// ONCE by projectModel.classifyCreate and rendered by the matching outcome card:
// project -> onCreated | single -> "this is really one task" | refusal | quality.
import { useEffect, useRef, useState } from 'react'
import { Loader2, X, Compass, Info, AlertTriangle, ArrowRight, ListChecks, Pencil } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import WdPortal from '../WdPortal.jsx'
import { classifyCreate } from '../projects/projectModel.js'
import { RefusalOutcome, QualityOutcome } from '../projects/CreateOutcome.jsx'
import { managerCandidates } from '../../../shared/work_roles_options.js'

export default function NewManagedProject({ people, nameOf, onClose, onCreated }) {
  const t = useT()
  const { user, roleView } = useWorkApp()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [managerId, setManagerId] = useState(roleView.isPM ? String(user.id) : '')
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
  // Manager choices: project managers in the company (me first when I am one).
  const managers = managerCandidates(people).filter((p) => String(p.id) !== String(user.id))
  const showManager = roleView.canAssignManager
  const submit = async (e) => {
    if (e) e.preventDefault()
    const g = goal.trim()
    if (!g) { setErr(t('workPm.create.errEmpty')); return }
    if (busy) return
    setBusy(true); setErr('')
    let res = null, thrown = null
    try {
      res = await api.workPmProjectCreate({ goal: g, ...(name.trim() ? { name: name.trim() } : {}), ...(showManager && managerId && String(managerId) !== String(user.id) ? { managerId } : {}) })
    } catch (ex) { thrown = ex }
    const out = classifyCreate(res, thrown)
    setBusy(false)
    if (out.kind === 'project') { onCreated(out.project); return }
    if (out.kind === 'error' || out.kind === 'upgrade') { setErr(t('workPm.create.errGeneric')); return }
    if (out.kind === 'invalid') { setErr(out.text); return }
    setOutcome(out)
  }
  const backToForm = () => setOutcome(null)
  return (
    <WdPortal>
    <div className="wd-modal-ov" onClick={() => !busy && onClose()}>
      <div className="wd-pj-modal" role="dialog" aria-modal="true" aria-labelledby="wd-ep-new-title" onClick={(e) => e.stopPropagation()}>
        <div className="wd-pj-modal-top">
          <span className="wd-wiz-eyebrow"><Compass size={13} /> {t('workPm.create.eyebrow')}</span>
          <button type="button" className="wd-pj-btn icon" onClick={onClose} disabled={busy} aria-label={t('workPm.common.close')}><X size={16} /></button>
        </div>
        <div className="wd-pj-modal-body">
          {outcome === null ? (
            <form id="wd-ep-new-form" onSubmit={submit} style={{ display: 'contents' }}>
              <h3 id="wd-ep-new-title">{t('workPm.create.title')}</h3>
              <div className="wd-pj-field">
                <label htmlFor="wd-ep-name">{t('workPm.create.name')} <span className="opt">{t('workPm.create.optional')}</span></label>
                <input id="wd-ep-name" className="wd-pj-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('workPm.create.namePh')} maxLength={120} disabled={busy} />
              </div>
              <div className="wd-pj-field">
                <label htmlFor="wd-ep-goal">{t('workPm.create.goal')} <span className="req">{t('workPm.create.required')}</span></label>
                <textarea id="wd-ep-goal" ref={goalRef} className="wd-pj-ta" rows={5} value={goal} onChange={(e) => { setGoal(e.target.value); if (err) setErr('') }} placeholder={t('workPm.create.goalPh')} disabled={busy} />
                <div className="wd-pj-help"><Info size={13} /> <span>{t('workPm.create.goalHelp')}</span></div>
              </div>
              {showManager && (
                <div className="wd-pj-field">
                  <label htmlFor="wd-ep-manager">{t('workPm.create.manager')}</label>
                  <select id="wd-ep-manager" className="wd-pj-select" value={managerId} onChange={(e) => setManagerId(e.target.value)} disabled={busy}>
                    {roleView.isPM && <option value={String(user.id)}>{t('workPm.create.me')}</option>}
                    {!roleView.isPM && <option value="">{t('workPm.task.pickPerson')}</option>}
                    {managers.map((p) => <option key={p.id} value={p.id}>{nameOf(p.id)}</option>)}
                  </select>
                  <div className="wd-pj-help"><Info size={13} /> <span>{t('workPm.create.managerHelp')}</span></div>
                </div>
              )}
              {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
            </form>
          ) : outcome.kind === 'single' ? (
            <>
              <h3 id="wd-ep-new-title">{t('workPm.create.eyebrow')}</h3>
              <div className="wd-pj-out info" role="status">
                <h4><ListChecks size={17} /> {t('workPm.create.singleTitle')}</h4>
                <p>{t('workPm.create.singleBody')}</p>
                <div className="wd-pj-out-goal">{outcome.suggestedGoal || goal}</div>
                <div className="wd-pj-out-acts"><button type="button" className="wd-pj-btn primary" onClick={backToForm}><Pencil size={13} /> {t('workPm.create.edit')}</button></div>
              </div>
            </>
          ) : outcome.kind === 'refusal' ? (
            <><h3 id="wd-ep-new-title">{t('workPm.create.eyebrow')}</h3><RefusalOutcome text={outcome.text} onEdit={backToForm} /></>
          ) : (
            <><h3 id="wd-ep-new-title">{t('workPm.create.eyebrow')}</h3><QualityOutcome errors={outcome.errors} onEdit={backToForm} /></>
          )}
        </div>
        {outcome === null && (
          <div className="wd-pj-modal-foot">
            <button type="button" className="wd-pj-btn" onClick={onClose} disabled={busy}>{t('workPm.common.cancel')}</button>
            <button type="submit" form="wd-ep-new-form" className="wd-pj-btn primary" disabled={busy || !goal.trim() || (showManager && !roleView.isPM && !managerId)}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {busy ? t('workPm.create.planning') : t('workPm.create.submit')}</button>
          </div>
        )}
      </div>
    </div>
    </WdPortal>
  )
}
