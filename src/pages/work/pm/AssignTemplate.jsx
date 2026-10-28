// Assign a template to many people (PM / Sr PM / admin): a checklist of the
// company members who can receive work (worker or mixed flow, the same rule as
// task assignment: assignablePeople), Select all / Clear, then one call ->
// api.workTemplateAssign. The answer is split ONCE (templatesModel.
// splitAssignOutcome) and shown honestly: who got their own project (green
// tint) and who was skipped with the reason (already has it / not in the
// company), amber tint. Same modal shell as the other enterprise dialogs.
import { useEffect, useMemo, useState } from 'react'
import { Loader2, X, Users, AlertTriangle, ArrowRight, Check, UserRound, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import WdPortal from '../WdPortal.jsx'
import { assignablePeople } from '../../../shared/work_roles_options.js'
import { splitAssignOutcome } from './templatesModel.js'

export default function AssignTemplate({ template, people, nameOf, onClose, onAssigned }) {
  const t = useT()
  const options = useMemo(() => assignablePeople(people).slice().sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id))), [people, nameOf])
  const [picked, setPicked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)   // { assigned, skipped }
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const all = () => setPicked(new Set(options.map((p) => String(p.id))))
  const none = () => setPicked(new Set())
  const submit = async (e) => {
    if (e) e.preventDefault()
    const ids = [...picked]
    if (!ids.length || busy) return
    setBusy(true); setErr('')
    try {
      const res = await api.workTemplateAssign(template.id, ids)
      const out = splitAssignOutcome(res, ids)
      setResult(out)
      if (onAssigned) onAssigned(out)
    } catch (ex) { setErr(friendlyError(ex, t('workPm.templates.assignTo.errGeneric'))) }
    setBusy(false)
  }
  const n = picked.size
  return (
    <WdPortal>
    <div className="wd-modal-ov" onClick={() => !busy && onClose()}>
      <div className="wd-pj-modal wd-ep-modal" role="dialog" aria-modal="true" aria-labelledby="wd-ep-tpl-assign-title" onClick={(e) => e.stopPropagation()}>
        <div className="wd-pj-modal-top">
          <span className="wd-wiz-eyebrow"><Users size={13} /> {t('workPm.templates.assignTo.eyebrow')}</span>
          <button type="button" className="wd-pj-btn icon" onClick={onClose} disabled={busy} aria-label={t('workPm.common.close')}><X size={16} /></button>
        </div>
        <div className="wd-pj-modal-body wd-ep-modal-body">
          <h3 id="wd-ep-tpl-assign-title">{t('workPm.templates.assignTo.title', { name: template.name })}</h3>
          {result === null ? (
            <form id="wd-ep-tpl-assign-form" onSubmit={submit} style={{ display: 'contents' }}>
              <p>{t('workPm.templates.assignTo.body')}</p>
              {options.length === 0 ? (
                <div className="wd-pj-help"><AlertTriangle size={13} /> <span>{t('workPm.templates.assignTo.noPeople')}</span></div>
              ) : (
                <div className="wd-pj-field">
                  <div className="wd-ep-pick-tools">
                    <span>{t('workPm.templates.assignTo.pick')} <b>{t.n('workPm.templates.assignTo.selected', n, { n })}</b></span>
                    <span className="sp" />
                    <button type="button" className="wd-pj-btn quiet" onClick={all} disabled={busy || n === options.length}>{t('workPm.templates.assignTo.selectAll')}</button>
                    <button type="button" className="wd-pj-btn quiet" onClick={none} disabled={busy || n === 0}>{t('workPm.templates.assignTo.clear')}</button>
                  </div>
                  <div className="wd-ep-people-pick" role="group" aria-label={t('workPm.templates.assignTo.pick')}>
                    {options.map((p) => {
                      const id = String(p.id), on = picked.has(id)
                      return (
                        <label key={id} className={`wd-ep-pick${on ? ' on' : ''}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(id)} disabled={busy} />
                          <span className="nm">{nameOf(id)}</span>
                          {p.workFlow ? <small>{t(`companyAdmin.flows.${p.workFlow}`)}</small> : null}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
            </form>
          ) : (
            <>
              {result.assigned.length > 0 && (
                <div className="wd-pj-out" role="status">
                  <h4><Check size={17} /> {t('workPm.templates.assignTo.resultTitle')}</h4>
                  <p>{t.n('workPm.templates.assignTo.resultAssigned', result.assigned.length, { n: result.assigned.length })}</p>
                  <div className="wd-ep-who">{result.assigned.map((a) => <span key={a.userId} className="wd-pj-chip person"><UserRound size={11} /><span>{nameOf(a.userId)}</span></span>)}</div>
                </div>
              )}
              {result.skipped.length > 0 && (
                <div className="wd-pj-out warn" role="status">
                  <h4><AlertTriangle size={17} /> {t.n('workPm.templates.assignTo.resultSkipped', result.skipped.length, { n: result.skipped.length })}</h4>
                  <ul>{result.skipped.map((s) => <li key={s.userId}><b>{nameOf(s.userId)}</b>: {t(`workPm.templates.assignTo.reason.${s.reason}`)}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="wd-pj-modal-foot">
          {result === null ? (
            <>
              <button type="button" className="wd-pj-btn" onClick={onClose} disabled={busy}>{t('workPm.common.cancel')}</button>
              <button type="submit" form="wd-ep-tpl-assign-form" className="wd-pj-btn primary" disabled={busy || n === 0}>
                {busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {busy ? t('workPm.templates.assignTo.assigning') : n > 1 ? t('workPm.templates.assignTo.submit', { n }) : t('workPm.templates.assignTo.submitOne')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="wd-pj-btn" onClick={onClose}>{t('workPm.templates.assignTo.done')}</button>
              <Link className="wd-pj-btn primary" to={`/work/templates/${encodeURIComponent(template.id)}`} onClick={onClose}><BarChart3 size={13} /> {t('workPm.templates.assignTo.viewRollup')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
    </WdPortal>
  )
}
