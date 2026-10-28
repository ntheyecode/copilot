// One project in the dashboard grid: name, customer tag (company users), state
// chip, goal (2 lines), progress bar + "3/8 done", and what is up next. The whole
// card is the link to the project view. Styles: projects.css.js (wd-pj-card*).
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Check } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { progress, sortedTasks, isLocked } from './projectModel.js'

export default function ProjectCard({ project, customerName }) {
  const t = useT()
  const pr = progress(project)
  const state = ['planning', 'active', 'done'].includes(project.state) ? project.state : 'planning'
  // Up next = the lowest-order pending task whose dependencies are met (the
  // same rule the server's `next` uses); the list call does not carry `next`.
  const next = sortedTasks(project).find((x) => x.state === 'pending' && !isLocked(project, x)) || null
  return (
    <Link to={`/work/projects/${encodeURIComponent(project.id)}`} className="wd-card wd-pj-card" aria-label={project.name}>
      <div className="wd-pj-card-top">
        <span className={`wd-pj-chip ${state}`}>{state === 'done' && <Check size={12} />}{t(`workProjects.state.${state}`)}</span>
        {customerName && <span className="wd-pj-chip customer" title={customerName}><Building2 size={11} /><span>{customerName}</span></span>}
      </div>
      <div className="wd-pj-card-t" title={project.name}>{project.name}</div>
      {project.goal && <div className="wd-pj-card-g">{project.goal}</div>}
      <div className="wd-pj-prog" aria-label={t('workProjects.view.progress', { done: pr.done, total: pr.total })}>
        <span className={`wd-pj-bar${pr.total && pr.done === pr.total ? ' done' : ''}`}><i style={{ width: `${pr.pct}%` }} /></span>
        <b>{t('workProjects.card.progress', { done: pr.done, total: pr.total })}</b>
      </div>
      <div className="wd-pj-card-foot">
        <span className="wd-pj-card-next">
          {pr.total === 0 ? t('workProjects.card.noTasks')
            : pr.done === pr.total ? t('workProjects.card.allDone')
            : next ? t.rich('workProjects.card.next', { title: next.title })
            : t.n('workProjects.card.tasks', pr.total)}
        </span>
        <span className="wd-pj-card-open">{t('workProjects.card.open')} <ArrowRight size={13} /></span>
      </div>
    </Link>
  )
}
