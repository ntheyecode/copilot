// One published company workflow as a compact row: title, product, category,
// step count, version and typical time, expanding to where it starts, what to
// have ready and who maintains it, with one confident Run. Run starts a guided
// session from the workflow (api.workflowStart) and opens the console through the
// shell's onOpen, like every other task start. A refused run is explained in the
// row: the task gate (hours, open tasks, limits) by the shared start_gate.js
// wording, a workflow-specific refusal (replaced, empty) by its own code.
import { useState } from 'react'
import { Play, ChevronDown, Loader2, AlertTriangle, GraduationCap, RefreshCw } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { startGateOutcome } from '../../../shared/start_gate.js'
import { runErrorKey, runErrorReloads } from './runWorkflowModel.js'

export default function WorkflowRunRow({ row, onStale }) {
  const t = useT()
  const { onOpen, isCompanyMember, canBuyHours, renewLabel, plan, refreshUsage, setNeedsSub, buyCredits } = useWorkApp()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState(null)        // { text, act: 'hours' | 'reload' | null }

  const run = async () => {
    if (busy) return
    setBusy(true); setAlert(null)
    try {
      const r = await api.workflowStart(row.id)
      if (r && r.sessionId) { onOpen(r.sessionId); return }
      setAlert({ text: t('workDashboard.workflows.err.generic') })
    } catch (e) {
      const key = runErrorKey(e)
      if (key) setAlert({ text: t(key), act: runErrorReloads(e) ? 'reload' : null })
      else {
        const g = startGateOutcome(e, { isCompanyMember, canBuyHours, renewLabel, planMaxOpen: plan && plan.tasks && plan.tasks.max != null ? plan.tasks.max : null })
        if (g.refresh && refreshUsage) refreshUsage()
        if (g.needsSub) { if (setNeedsSub) setNeedsSub(true) }
        else setAlert({ text: g.key ? t(g.key, g.vars) : g.message || friendlyError(e, t('workDashboard.workflows.err.generic')), act: g.act || null })
      }
    }
    setBusy(false)
  }

  const detailId = `wd-cw-d-${row.id}`
  const hasDetail = !!(row.launchTarget || row.prerequisites || row.owner)
  const Head = hasDetail ? 'button' : 'div'         // nothing to expand: no control to announce
  return (
    <div className={`wd-card wd-cw-row${open ? ' open' : ''}`}>
      <Head className="wd-cw-head" {...(hasDetail ? {
        type: 'button', 'aria-expanded': open, 'aria-controls': detailId, onClick: () => setOpen((o) => !o),
        title: open ? t('workDashboard.workflows.hideDetails') : t('workDashboard.workflows.showDetails'),
      } : {})}>
        <span className="wd-pj-task-ic pending" aria-hidden><GraduationCap size={15} /></span>
        <span className="wd-cw-main">
          <span className="wd-ep-q-t">{row.title}</span>
          <span className="wd-ep-q-m">
            {row.product && <span className="wd-cw-prod">{row.product}</span>}
            {row.category && <span className="wd-pj-chip pending">{row.category}</span>}
            <span>{t.n('workDashboard.workflows.steps', row.steps, { n: row.steps })}</span>
            {row.durationMin && <span>{t('workDashboard.workflows.minutes', { n: row.durationMin })}</span>}
            <span>{t('workDashboard.workflows.version', { v: row.version })}</span>
          </span>
        </span>
        {hasDetail && <ChevronDown size={16} className="wd-cw-chev" aria-hidden />}
      </Head>
      <button type="button" className="wd-pj-btn primary wd-cw-run" onClick={run} disabled={busy} aria-busy={busy} aria-label={t('workDashboard.workflows.runAria', { title: row.title })}>
        {busy ? <Loader2 size={14} className="spin" /> : <Play size={13} />} {busy ? t('workDashboard.workflows.starting') : t('workDashboard.workflows.run')}
      </button>
      {open && hasDetail && (
        <dl className="wd-cw-detail" id={detailId}>
          {row.launchTarget && <div><dt>{t('workDashboard.workflows.startsAt')}</dt><dd>{row.launchTarget}</dd></div>}
          {row.prerequisites && <div><dt>{t('workDashboard.workflows.prerequisites')}</dt><dd>{row.prerequisites}</dd></div>}
          {row.owner && <div><dt>{t('workDashboard.workflows.owner')}</dt><dd>{row.owner}</dd></div>}
        </dl>
      )}
      {alert && (
        <div className="wd-ep-q-alert" role="alert">
          <AlertTriangle size={14} aria-hidden />
          <span>{alert.text}
            {alert.act === 'hours' && buyCredits && <> <button type="button" className="wd-cw-act" onClick={() => buyCredits('hours')}>{t('workStart.gateOutOfHoursAct')}</button></>}
            {alert.act === 'reload' && onStale && <> <button type="button" className="wd-cw-act" onClick={onStale}><RefreshCw size={12} /> {t('workDashboard.workflows.refresh')}</button></>}
          </span>
        </div>
      )}
    </div>
  )
}
