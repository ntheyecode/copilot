// One managed project in a grid (PM, Sr PM and GRC dashboards share it): status
// chip (ongoing / on hold / complete), name, goal (2 lines), progress bar, the
// assignment picture (assigned / unassigned / in progress) and, when asked, the
// managing project manager. The whole card links to the project view; an
// optional action slot (Sr PM "Move") sits in the foot. Styles: projects.css.js
// (wd-pj-card*) + ep.css.js (wd-ep-card-*).
import { Link } from 'react-router-dom'
import { ArrowRight, Check, PauseCircle, UserRound } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { projectStatus, projectCounts } from './pmModel.js'

export default function EpProjectCard({ project, managerName, showManager, action, from }) {
  const t = useT()
  const status = projectStatus(project)
  const c = projectCounts(project)
  return (
    <div className="wd-card wd-pj-card" style={{ cursor: 'default' }}>
      <div className="wd-pj-card-top">
        <span className={`wd-pj-chip ${status}`}>{status === 'done' ? <Check size={12} /> : status === 'held' ? <PauseCircle size={12} /> : null}{t(`workPm.status.${status}`)}</span>
        {showManager && (
          <span className="wd-pj-chip person" title={managerName || t('workPm.common.noOne')}><UserRound size={11} /><span>{managerName || t('workPm.common.noOne')}</span></span>
        )}
      </div>
      <Link to={`/work/pm/${encodeURIComponent(project.id)}`} state={from ? { from } : undefined} className="wd-pj-card-t" title={project.name} style={{ textDecoration: 'none' }}>{project.name}</Link>
      {project.goal && <div className="wd-pj-card-g">{project.goal}</div>}
      {project.held && project.heldReason && <div className="wd-ep-task-d" style={{ color: 'var(--warm)' }}>{t('workPm.card.heldReason', { reason: project.heldReason })}</div>}
      <div className="wd-pj-prog" aria-label={t('workPm.card.progress', { done: c.done, total: c.total })}>
        <span className={`wd-pj-bar${c.total && c.done === c.total ? ' done' : ''}`}><i style={{ width: `${c.pct}%` }} /></span>
        <b>{t('workPm.card.progress', { done: c.done, total: c.total })}</b>
      </div>
      <div className="wd-ep-card-meta">
        <span>{t('workPm.card.assigned', { n: c.assigned })}</span>
        {c.inProgress > 0 && <span>{t.n('workPm.card.inProgress', c.inProgress, { n: c.inProgress })}</span>}
        {c.unassigned > 0 && <span style={{ color: 'var(--warm)' }}>{t.n('workPm.card.unassigned', c.unassigned, { n: c.unassigned })}</span>}
      </div>
      <div className="wd-pj-card-foot">
        {action}
        <Link to={`/work/pm/${encodeURIComponent(project.id)}`} state={from ? { from } : undefined} className="wd-pj-card-open" style={{ marginLeft: 'auto' }}>{t('workPm.card.open')} <ArrowRight size={13} /></Link>
      </div>
    </div>
  )
}
