// One task in a managed project's map: state tile + chip, title, done-state,
// who it is assigned to (click = that person's productivity), when it was
// assigned and an SLA chip when it has waited past the window, and, for a
// manager, the assign / move control (one select + one button, the same server
// endpoint for both). GRC gets the row without the control. The row owns its
// own busy + alert so a failure shows on the task it belongs to.
import { useState } from 'react'
import { Circle, Play, Check, RotateCcw, Loader2, AlertTriangle, UserRound, Clock, ArrowRight } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { taskBucket, taskSlaDays, daysSince } from './pmModel.js'
import { RISK_SLA_DAYS } from '../../../shared/work_roles_options.js'

const ICON = { notStarted: Circle, inProgress: Play, completed: Check }

export function agoText(t, days) {
  if (days == null) return ''
  return days === 0 ? t('workPm.common.ago_today') : t.n('workPm.common.ago_days', days, { n: days })
}

export default function TaskAssignRow({ project, task, index, canManage, people, nameOf, onChanged, onPerson }) {
  const t = useT()
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState('')
  const bucket = taskBucket(task)
  const Icon = task.state === 'rerun' ? RotateCcw : (ICON[bucket] || Circle)
  const visual = task.state === 'rerun' ? 'rerun' : bucket === 'completed' ? 'done' : bucket === 'inProgress' ? 'active' : 'pending'
  const sla = taskSlaDays(task, RISK_SLA_DAYS)
  const ago = daysSince(task.assignedAt)
  const assignee = task.assigneeId ? nameOf(task.assigneeId) : ''
  const options = (people || []).filter((p) => String(p.id) !== String(task.assigneeId || ''))

  const assign = async () => {
    if (!pick || busy) return
    setBusy(true); setAlert('')
    try { await api.workPmAssignTask(project.id, task.id, pick); setPick(''); await onChanged() }
    catch (e) { setAlert(friendlyError(e, t('workPm.task.errAssign'))) }
    setBusy(false)
  }

  return (
    <article className={`wd-card wd-ep-task ${bucket}`} aria-label={task.title}>
      <span className={`wd-pj-task-ic ${visual}`} aria-hidden><Icon size={15} /></span>
      <div className="wd-ep-task-main">
        <div className="wd-ep-task-row">
          <span className="wd-pj-task-n">{t('workPm.task.n', { n: index + 1 })}</span>
          <span className="wd-ep-task-t">{task.title}</span>
          <span className={`wd-pj-chip ${visual}`}><Icon size={11} /> {task.state === 'rerun' ? t('workPm.bucket.rerun') : t(`workPm.bucket.${bucket}`)}</span>
          {sla != null && <span className="wd-pj-chip sla" title={t('workPm.grc.risk.slaAction')}><Clock size={11} /> {t('workPm.common.sla', { n: RISK_SLA_DAYS })}</span>}
        </div>
        {task.doneState && <div className="wd-ep-task-d"><b style={{ color: 'var(--tx-2)', fontWeight: 600 }}>{t('workPm.task.doneState')}:</b> {task.doneState}</div>}
        <div className="wd-ep-task-who">
          <span>{t('workPm.task.assignee')}:</span>
          {task.assigneeId
            ? <button type="button" className="pbtn" onClick={() => onPerson && onPerson(task.assigneeId, assignee)} title={t('workPm.task.viewPerson', { name: assignee })}><UserRound size={12} /><span>{assignee}</span></button>
            : <span className="wd-pj-chip person none"><span>{t('workPm.common.unassigned')}</span></span>}
          {task.assignedAt && ago != null && <span>{t('workPm.common.assignedAgo', { ago: agoText(t, ago) })}</span>}
        </div>
        {alert && <div className="wd-ep-task-alert" role="alert"><AlertTriangle size={14} /> <span>{alert}</span></div>}
      </div>
      {canManage && task.state !== 'done' && (
        <div className="wd-ep-task-acts">
          {options.length === 0 && !task.assigneeId
            ? <span className="wd-ep-task-d">{t('workPm.task.noPeople')}</span>
            : (
              <>
                <select className="wd-pj-select" value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy} aria-label={t('workPm.task.selectAria', { title: task.title })}>
                  <option value="">{t('workPm.task.pickPerson')}</option>
                  {options.map((p) => <option key={p.id} value={p.id}>{nameOf(p.id)}</option>)}
                </select>
                <button type="button" className="wd-pj-btn primary" onClick={assign} disabled={busy || !pick}>
                  {busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={13} />} {busy ? t('workPm.task.assigning') : task.assigneeId ? t('workPm.task.reassign') : t('workPm.task.assign')}
                </button>
              </>
            )}
        </div>
      )}
    </article>
  )
}
