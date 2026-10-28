// The Worker queue: every task a project manager assigned to this person
// (GET /api/work/my/assigned), in order (in progress first). Opening a task
// runs POST /api/work/my/assigned/:projectId/:taskId/expand, which plans the
// steps just-in-time and creates a guided session OWNED BY THE WORKER, then
// hands off to the existing guided view (onOpen(sessionId)), exactly like the
// project engine's expand hand-off. A worker's dashboard shows this instead of
// Start a task; a mixed user sees both. `compact` renders the first few rows
// with a link to the full page (/work/queue).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Play, ArrowRight, Check, RotateCcw, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { queueAction, sortQueue, taskSlaDays, daysSince } from './pmModel.js'
import { RISK_SLA_DAYS } from '../../../shared/work_roles_options.js'
import { useAssigned } from './usePm.js'
import { agoText } from './TaskAssignRow.jsx'

const ICON = { pending: Play, active: Play, done: Check, rerun: RotateCcw }

function QueueRow({ item, onOpen, onChanged }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState('')
  const { task } = item
  const action = queueAction(item)
  const Icon = ICON[task.state] || Play
  const sla = taskSlaDays(task, RISK_SLA_DAYS)
  const ago = daysSince(task.assignedAt)
  const run = async () => {
    if (busy || !action) return
    if (action === 'continue' || action === 'open') { onOpen(task.sessionId); return }
    setBusy(true); setAlert('')
    try {
      const r = await api.workMyAssignedExpand(item.projectId, task.id)
      if (r && r.refusal) { setAlert(String(r.refusal) || t('workPm.queue.refusal')); setBusy(false); onChanged(); return }
      if (r && r.sessionId) { onOpen(r.sessionId); return }
      setAlert(t('workPm.queue.errStart'))
    } catch (e) { setAlert(friendlyError(e, t('workPm.queue.errStart'))) }
    setBusy(false)
  }
  const label = action === 'continue' ? t('workPm.queue.continue') : action === 'open' ? t('workPm.queue.open') : action === 'startAgain' ? t('workPm.queue.startAgain') : t('workPm.queue.start')
  const visual = task.state === 'active' ? 'active' : task.state === 'done' ? 'done' : task.state === 'rerun' ? 'rerun' : 'pending'
  return (
    <div className={`wd-card wd-ep-q ${visual}`}>
      <span className={`wd-pj-task-ic ${visual}`} aria-hidden><Icon size={15} /></span>
      <div className="wd-ep-q-main">
        <div className="wd-ep-q-t">{task.title}</div>
        <div className="wd-ep-q-m">
          <span className="proj">{t('workPm.queue.inProject', { project: item.projectName })}</span>
          <span className={`wd-pj-chip ${visual}`}>{t(`workProjects.taskState.${visual}`)}</span>
          {ago != null && <span>{t('workPm.common.assignedAgo', { ago: agoText(t, ago) })}</span>}
          {sla != null && <span className="wd-pj-chip sla"><Clock size={11} /> {t('workPm.common.sla', { n: RISK_SLA_DAYS })}</span>}
        </div>
      </div>
      {action && (
        <button type="button" className={`wd-pj-btn${action === 'open' ? '' : ' primary'}`} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={14} className="spin" /> : action === 'open' ? <ArrowRight size={13} /> : <Play size={13} />} {busy ? t('workPm.queue.planning') : label}
        </button>
      )}
      {alert && <div className="wd-ep-q-alert" role="alert"><AlertTriangle size={14} /> <span>{alert}</span></div>}
    </div>
  )
}

export default function WorkerQueue({ compact = false, includeDone = false, canStart = false }) {
  const t = useT()
  const { onOpen } = useWorkApp()
  const { assigned, loaded, err, reload } = useAssigned(includeDone)
  const items = sortQueue(assigned)
  const shown = compact ? items.slice(0, 3) : items
  if (!loaded) return <div className="wd-ep-queue">{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w2" /></div>)}</div>
  if (err) {
    return (
      <div className="wd-empty" role="alert">
        <span className="ic"><AlertTriangle size={18} /></span>
        <div><b>{t('workProjects.list.errTitle')}</b><p>{t('workPm.common.loadErr')} <button type="button" className="wd-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={reload}>{t('workPm.common.retry')}</button></p></div>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="wd-empty">
        <span className="ic"><Inbox size={18} /></span>
        <div><b>{t('workPm.queue.emptyTitle')}</b><p>{canStart ? t('workPm.queue.emptyBodyMixed') : t('workPm.queue.emptyBody')}</p></div>
      </div>
    )
  }
  return (
    <div className="wd-ep-queue">
      {shown.map((item) => <QueueRow key={`${item.projectId}:${item.task.id}`} item={item} onOpen={onOpen} onChanged={reload} />)}
      {compact && items.length > shown.length && <Link className="wd-ep-q-more" to="/work/queue">{t.n('workPm.queue.more', items.length - shown.length, { n: items.length - shown.length })} <ArrowRight size={14} /></Link>}
    </div>
  )
}
