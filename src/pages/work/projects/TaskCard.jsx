// One task in the map. One visual per state (pending / locked / active / done /
// rerun: icon tile + chip + border), the done-state, what it waits for (a locked
// task names its blockers), the outcome and telemetry readout when present, and
// the actions projectModel.taskActions allows: Start (expand -> guided session),
// Continue / Open (the linked session), and the state menu. The card owns its
// own busy + alert so a refusal or failure shows on the task it belongs to.
import { useState } from 'react'
import { Lock, Circle, Play, Check, RotateCcw, ArrowRight, Loader2, Link2, AlertTriangle } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { visualState, taskActions, blockers, ACTION_TO_STATE } from './projectModel.js'
import TaskMenu from './TaskMenu.jsx'
import TelemetryReadout from './TelemetryReadout.jsx'

const ICON = { pending: Circle, locked: Lock, active: Play, done: Check, rerun: RotateCcw }

export default function TaskCard({ project, task, index, onOpen, onChanged }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState('')
  const v = visualState(project, task)
  const acts = taskActions(project, task)
  const waits = blockers(project, task)
  const Icon = ICON[v] || Circle

  const expand = async () => {
    if (busy) return
    setBusy(true); setAlert('')
    try {
      const r = await api.workProjectExpand(project.id, task.id)
      if (r && r.refusal) { setAlert(String(r.refusal) || t('workProjects.task.refusal')); setBusy(false); onChanged(); return }
      if (r && r.sessionId) { onOpen(r.sessionId); return }
      setAlert(t('workProjects.task.errExpand'))
    } catch (e) { setAlert(friendlyError(e, t('workProjects.task.errExpand'))) }
    setBusy(false)
  }
  const setState = async (action) => {
    const state = ACTION_TO_STATE[action]
    if (!state || busy) return
    setBusy(true); setAlert('')
    try { await api.workProjectTaskState(project.id, task.id, state); await onChanged(task, state) }
    catch (e) { setAlert(friendlyError(e, t('workProjects.task.errState'))) }
    setBusy(false)
  }
  const primary = acts.primary
  const primaryLabel = primary === 'start' ? (v === 'rerun' ? t('workProjects.task.startAgain') : t('workProjects.task.start'))
    : primary === 'continue' ? t('workProjects.task.continue') : primary === 'open' ? t('workProjects.task.open') : ''
  const onPrimary = () => { if (primary === 'start') expand(); else if (task.sessionId) onOpen(task.sessionId) }

  return (
    <article className={`wd-card wd-pj-task ${v}`} aria-label={task.title}>
      <span className={`wd-pj-task-ic ${v}`} aria-hidden><Icon size={15} /></span>
      <div className="wd-pj-task-main">
        <div className="wd-pj-task-row">
          <span className="wd-pj-task-n">{t('workProjects.task.n', { n: index + 1 })}</span>
          <span className="wd-pj-task-t">{task.title}</span>
          <span className={`wd-pj-chip ${v}`} title={v === 'locked' ? t('workProjects.task.lockedTip') : undefined}><Icon size={11} /> {t(`workProjects.taskState.${v}`)}</span>
        </div>
        {task.goal && task.goal !== task.title && <div className="wd-pj-task-d">{task.goal}</div>}
        {task.doneState && <div className="wd-pj-task-d"><b>{t('workProjects.task.doneState')}:</b> {task.doneState}</div>}
        {waits.length > 0 && (
          <div className="wd-pj-task-meta">
            <span className="wd-pj-task-dep"><Link2 size={12} /> <span>{t('workProjects.task.waitsFor')}: {waits.map((w) => w.title).join(', ')}</span></span>
          </div>
        )}
        {task.outcome && <div className="wd-pj-task-out"><b>{t('workProjects.task.outcome')}</b>{typeof task.outcome === 'string' ? task.outcome : (task.outcome.summary || task.outcome.text || '')}</div>}
        <TelemetryReadout telemetry={task.telemetry} />
        {alert && <div className="wd-pj-task-alert" role="alert"><AlertTriangle size={14} /> <span>{alert}</span></div>}
      </div>
      <div className="wd-pj-task-acts">
        {primary && (
          <button type="button" className={`wd-pj-btn${primary === 'start' || primary === 'continue' ? ' primary' : ''}`} onClick={onPrimary} disabled={busy}>
            {busy && primary === 'start' ? <Loader2 size={14} className="spin" /> : primary === 'start' ? <Play size={13} /> : <ArrowRight size={13} />} {busy && primary === 'start' ? t('workProjects.task.expanding') : primaryLabel}
          </button>
        )}
        <TaskMenu items={acts.menu} title={task.title} disabled={busy} onPick={setState} />
      </div>
    </article>
  )
}
