// The project END STATE at the top of the view: the finish line sentence, the
// "done when" checks, and the progress bar. Checks read as a checklist; they
// tick when the project is complete (the server validates the task set reaches
// the end state, so complete = every check met).
import { Flag, Check, Circle } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { progress } from './projectModel.js'

export default function EndStateCard({ project }) {
  const t = useT()
  const pr = progress(project)
  const end = project.endState || { done: '', checks: [] }
  const checks = Array.isArray(end.checks) ? end.checks.filter(Boolean) : []
  const complete = pr.total > 0 && pr.done === pr.total
  return (
    <section className="wd-card tint-green wd-pj-end" aria-label={t('workProjects.view.finishLine')}>
      <span className="wd-ic"><Flag size={17} /></span>
      <div className="wd-pj-end-body">
        <div className="wd-pj-k">{t('workProjects.view.finishLine')}</div>
        {end.done ? <div className="wd-pj-end-t">{end.done}</div> : <div className="wd-pj-task-d">{t('workProjects.view.noChecks')}</div>}
        {checks.length > 0 && (
          <>
            <div className="wd-pj-k gap">{t('workProjects.view.checks')}</div>
            <ul className="wd-pj-checks">
              {checks.map((c, i) => <li key={i} className={complete ? '' : 'off'}>{complete ? <Check size={14} /> : <Circle size={14} />}<span>{c}</span></li>)}
            </ul>
          </>
        )}
        <div className="wd-pj-prog gap" aria-label={t('workProjects.view.progress', { done: pr.done, total: pr.total })}>
          <span className={`wd-pj-bar${complete ? ' done' : ''}`}><i style={{ width: `${pr.pct}%` }} /></span>
          <b>{t('workProjects.view.progress', { done: pr.done, total: pr.total })}</b>
        </div>
      </div>
    </section>
  )
}
