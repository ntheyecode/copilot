// "Pick next" prompt, shown once a task is done (projectModel.pickNext): the
// server's one next task with a Start button, or any other task that is ready
// now (independent of what is in progress); a complete card when every task is
// done; a quiet "nothing is ready" note when the rest waits on an active task.
import { useState } from 'react'
import { Trophy, Compass, Play, Loader2, Hourglass, AlertTriangle } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { pickNext } from './projectModel.js'

export default function PickNext({ project, next, available, onOpen, onChanged }) {
  const t = useT()
  const [busyId, setBusyId] = useState(null)
  const [alert, setAlert] = useState('')
  const r = pickNext(project, next, available)
  if (r.kind === 'none') return null
  const start = async (task) => {
    if (busyId) return
    setBusyId(task.id); setAlert('')
    try {
      const res = await api.workProjectExpand(project.id, task.id)
      if (res && res.sessionId) { onOpen(res.sessionId); return }
      if (res && res.refusal) { setAlert(String(res.refusal)); onChanged() }
      else setAlert(t('workProjects.task.errExpand'))
    } catch (e) { setAlert(friendlyError(e, t('workProjects.task.errExpand'))) }
    setBusyId(null)
  }
  if (r.kind === 'complete') {
    return (
      <section className="wd-card wd-pj-next complete" role="status">
        <div className="wd-pj-next-head">
          <span className="wd-ic"><Trophy size={16} /></span>
          <div><b>{t('workProjects.next.allDoneTitle')}</b><p>{t('workProjects.next.allDoneBody')}</p></div>
        </div>
      </section>
    )
  }
  if (r.kind === 'blocked') {
    return (
      <section className="wd-card wd-pj-next complete" role="status">
        <div className="wd-pj-next-head">
          <span className="wd-ic alt"><Hourglass size={16} /></span>
          <div><b>{t('workProjects.next.blockedTitle')}</b><p>{t('workProjects.next.blockedBody')}</p></div>
        </div>
      </section>
    )
  }
  return (
    <section className="wd-card wd-pj-next" role="status" aria-label={t('workProjects.next.upNext')}>
      <div className="wd-pj-next-head">
        <span className="wd-ic"><Compass size={16} /></span>
        <div><b>{t('workProjects.next.doneTitle', { title: r.lastDone.title })}</b><p>{t('workProjects.next.doneSub')}</p></div>
      </div>
      <div className="wd-pj-next-row">
        <span className="wd-pj-k">{t('workProjects.next.upNext')}</span>
        <span className="t" title={r.next.title}>{r.next.title}</span>
        <button type="button" className="wd-pj-btn primary" onClick={() => start(r.next)} disabled={!!busyId}>{busyId === r.next.id ? <Loader2 size={14} className="spin" /> : <Play size={13} />} {t('workProjects.next.start')}</button>
      </div>
      {r.others.length > 0 && (
        <div className="wd-pj-others">
          <small>{t('workProjects.next.orPick')}</small>
          <div className="wd-pj-others-row">
            {r.others.map((o) => <button key={o.id} type="button" className="wd-pj-other" onClick={() => start(o)} disabled={!!busyId} title={o.title}>{busyId === o.id ? <Loader2 size={12} className="spin" /> : <Play size={12} />}<span>{o.title}</span></button>)}
          </div>
        </div>
      )}
      {alert && <div className="wd-pj-task-alert" role="alert"><AlertTriangle size={14} /> <span>{alert}</span></div>}
    </section>
  )
}
