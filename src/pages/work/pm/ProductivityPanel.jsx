// Per-user productivity (GET /api/work/pm/users/:uid/productivity): the state
// counts across every task assigned to the person, guided time spent, and what
// they are working on right now. Reused by the PM project view (click an
// assignee) and the Sr PM people list, inside PersonModal. Nothing here can
// print a model or provider name: the payload carries counts, seconds and task
// titles only.
import { useEffect } from 'react'
import { Loader2, AlertTriangle, Play, Timer, X, UserRound } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import WdPortal from '../WdPortal.jsx'
import { fmtDur } from '../projects/projectModel.js'
import { useProductivity } from './usePm.js'
import { StatTiles } from './StatViz.jsx'

export default function ProductivityPanel({ userId }) {
  const t = useT()
  const { productivity: p, loaded, err, reload } = useProductivity(userId)
  const units = { h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin'), s: 's' }
  if (!loaded) return <div style={{ display: 'grid', placeItems: 'center', padding: '28px 0' }}><Loader2 size={20} className="spin" style={{ color: 'var(--em)' }} /></div>
  if (err || !p) {
    return (
      <div className="wd-empty" role="alert">
        <span className="ic"><AlertTriangle size={18} /></span>
        <div><b>{t('workPm.prod.errTitle')}</b><p>{err === 'denied' ? t('workPm.common.notPermittedBody') : <>{t('workPm.common.loadErr')} <button type="button" className="wd-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={reload}>{t('workPm.common.retry')}</button></>}</p></div>
      </div>
    )
  }
  const c = p.counts || {}
  const tiles = [
    { key: 'assigned', label: t('workPm.prod.assigned'), value: c.assigned || 0 },
    { key: 'notStarted', label: t('workPm.prod.notStarted'), value: c.notStarted || 0 },
    { key: 'inProgress', label: t('workPm.prod.inProgress'), value: c.inProgress || 0, tone: 'blue' },
    { key: 'completed', label: t('workPm.prod.completed'), value: c.completed || 0, tone: 'green', sub: c.rerun ? `${t('workPm.prod.rerun')}: ${c.rerun}` : null },
  ]
  const working = Array.isArray(p.workingOn) ? p.workingOn : []
  return (
    <div className="wd-ep-prod">
      <StatTiles tiles={tiles} ariaLabel={t('workPm.prod.title')} />
      <div className="wd-ep-prod-time"><Timer size={15} style={{ color: 'var(--em)' }} /> <b>{fmtDur(p.secondsSpent || 0, units)}</b> <span>{t('workPm.prod.time')}</span> <span style={{ fontSize: 12 }}>{t('workPm.prod.timeNote')}</span></div>
      <div>
        <div className="wd-pj-k" style={{ marginBottom: 6 }}>{t('workPm.prod.working')}</div>
        {working.length === 0 ? <div className="wd-ep-task-d">{t('workPm.prod.idle')}</div> : (
          <ul className="wd-ep-prod-list">
            {working.map((w, i) => <li key={i}><Play size={13} /> <span>{w.taskTitle} <small>{t('workPm.queue.inProject', { project: w.projectName })}</small></span></li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

// A person's productivity in a modal (opened from a task row or the people list).
export function PersonModal({ userId, name, onClose }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <WdPortal>
      <div className="wd-modal-ov" onClick={onClose}>
        <div className="wd-pj-modal wd-ep-modal" role="dialog" aria-modal="true" aria-labelledby="wd-ep-person-title" onClick={(e) => e.stopPropagation()}>
          <div className="wd-pj-modal-top">
            <span className="wd-wiz-eyebrow"><UserRound size={13} /> {t('workPm.prod.title')}</span>
            <button type="button" className="wd-pj-btn icon" onClick={onClose} aria-label={t('workPm.common.close')}><X size={16} /></button>
          </div>
          <div className="wd-pj-modal-body wd-ep-modal-body">
            <h3 id="wd-ep-person-title" style={{ overflowWrap: 'anywhere' }}>{name}</h3>
            <p>{t('workPm.prod.sub')}</p>
            <ProductivityPanel userId={userId} />
          </div>
          <div className="wd-pj-modal-foot">
            <button type="button" className="wd-pj-btn" onClick={onClose}>{t('workPm.common.close')}</button>
          </div>
        </div>
      </div>
    </WdPortal>
  )
}
