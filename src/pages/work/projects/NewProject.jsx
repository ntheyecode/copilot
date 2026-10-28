// New project flow (modal): customer picker for COMPANY users only (individuals
// have no customer, so the field is not rendered at all), an optional name and
// the goal. Submit -> api.workProjectCreate; the answer is classified ONCE
// (projectModel.classifyCreate) and rendered by the matching outcome card:
// project -> onCreated (open it) | single -> start it as a task | refusal ->
// plain | upgrade -> upgrade-or-shorten fork | quality -> gentle list.
import { useEffect, useRef, useState } from 'react'
import { Loader2, X, Compass, Info, AlertTriangle, ArrowRight } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import WdPortal from '../WdPortal.jsx'
import { classifyCreate } from './projectModel.js'
import { useCustomers } from './useProjects.js'
import { SingleTaskOutcome, RefusalOutcome, UpgradeOutcome, QualityOutcome } from './CreateOutcome.jsx'

export default function NewProject({ onClose, onCreated }) {
  const t = useT()
  const { user, isCompanyMember, onOpen, upgradeHref } = useWorkApp()
  const { customers, denied } = useCustomers(isCompanyMember)
  const [customerId, setCustomerId] = useState('default')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState(null)   // classifyCreate result, or null = the form
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
    if (!g) { setErr(t('workProjects.create.errEmpty')); return }
    if (busy) return
    setBusy(true); setErr('')
    let res = null, thrown = null
    try {
      res = await api.workProjectCreate({ goal: g, ...(name.trim() ? { name: name.trim() } : {}), ...(isCompanyMember ? { customerId } : {}) })
    } catch (ex) { thrown = ex }
    const out = classifyCreate(res, thrown)
    setBusy(false)
    if (out.kind === 'project') { onCreated(out.project); return }
    if (out.kind === 'error') { setErr(t('workProjects.create.errGeneric')); return }
    if (out.kind === 'invalid') { setErr(out.text); return }
    setOutcome(out)
  }
  const backToForm = () => setOutcome(null)
  const canUpgrade = !!(user && user.canUpgrade)
  // Customer options: Default is always offered first (the server's default id).
  const list = Array.isArray(customers) ? customers : []
  const hasDefault = list.some((c) => c && c.id === 'default')
  const options = hasDefault ? list : [{ id: 'default', name: t('workProjects.create.customerDefault') }, ...list]

  return (
    <WdPortal>
    <div className="wd-modal-ov" onClick={() => !busy && onClose()}>
      <div className="wd-pj-modal" role="dialog" aria-modal="true" aria-labelledby="wd-pj-new-title" onClick={(e) => e.stopPropagation()}>
        <div className="wd-pj-modal-top">
          <span className="wd-wiz-eyebrow"><Compass size={13} /> {t('workProjects.create.eyebrow')}</span>
          <button type="button" className="wd-pj-btn icon" onClick={onClose} disabled={busy} aria-label={t('workProjects.create.close')}><X size={16} /></button>
        </div>
        <div className="wd-pj-modal-body">
          {outcome === null ? (
            <form id="wd-pj-new-form" onSubmit={submit} style={{ display: 'contents' }}>
              <h3 id="wd-pj-new-title">{t('workProjects.create.title')}</h3>
              {isCompanyMember && (
                <div className="wd-pj-field">
                  <label htmlFor="wd-pj-customer">{t('workProjects.create.customer')}</label>
                  <select id="wd-pj-customer" className="wd-pj-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={busy || customers === null}>
                    {options.map((c) => <option key={c.id} value={c.id}>{c.id === 'default' && (!c.name || /^default$/i.test(c.name)) ? t('workProjects.create.customerDefault') : c.name}</option>)}
                  </select>
                  <div className="wd-pj-help"><Info size={13} /> <span>{denied ? t('workProjects.create.customerAdminNote') : t('workProjects.create.customerHelp')}</span></div>
                </div>
              )}
              <div className="wd-pj-field">
                <label htmlFor="wd-pj-name">{t('workProjects.create.name')} <span className="opt">{t('workProjects.create.optional')}</span></label>
                <input id="wd-pj-name" className="wd-pj-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('workProjects.create.namePh')} maxLength={120} disabled={busy} />
              </div>
              <div className="wd-pj-field">
                <label htmlFor="wd-pj-goal">{t('workProjects.create.goal')} <span className="req">{t('workProjects.create.required')}</span></label>
                <textarea id="wd-pj-goal" ref={goalRef} className="wd-pj-ta" rows={5} value={goal} onChange={(e) => { setGoal(e.target.value); if (err) setErr('') }} placeholder={t('workProjects.create.goalPh')} disabled={busy} />
                <div className="wd-pj-help"><Info size={13} /> <span>{t('workProjects.create.goalHelp')}</span></div>
              </div>
              {err && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div>}
            </form>
          ) : outcome.kind === 'single' ? (
            <><h3 id="wd-pj-new-title">{t('workProjects.create.eyebrow')}</h3><SingleTaskOutcome suggestedGoal={outcome.suggestedGoal} goal={goal} onEdit={backToForm} onOpen={onOpen} /></>
          ) : outcome.kind === 'refusal' ? (
            <><h3 id="wd-pj-new-title">{t('workProjects.create.eyebrow')}</h3><RefusalOutcome text={outcome.text} onEdit={backToForm} /></>
          ) : outcome.kind === 'upgrade' ? (
            <><h3 id="wd-pj-new-title">{t('workProjects.create.eyebrow')}</h3><UpgradeOutcome goal={goal} canUpgrade={canUpgrade} upgradeHref={upgradeHref} isCompanyMember={isCompanyMember} onOpen={onOpen} onEdit={backToForm} /></>
          ) : (
            <><h3 id="wd-pj-new-title">{t('workProjects.create.eyebrow')}</h3><QualityOutcome errors={outcome.errors} onEdit={backToForm} /></>
          )}
        </div>
        {outcome === null && (
          <div className="wd-pj-modal-foot">
            <button type="button" className="wd-pj-btn" onClick={onClose} disabled={busy}>{t('workProjects.create.cancel')}</button>
            <button type="submit" form="wd-pj-new-form" className="wd-pj-btn primary" disabled={busy || !goal.trim()}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {busy ? t('workProjects.create.planning') : t('workProjects.create.submit')}</button>
          </div>
        )}
      </div>
    </div>
    </WdPortal>
  )
}
