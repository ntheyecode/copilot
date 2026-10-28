// The SEPARATE area for standalone single tasks: sessions that belong to no
// project task (projectModel.standaloneSessions). Compact rows on the shell's
// own wd-sess recipe (status icon, label, status + steps), newest first, capped
// with a quiet "n more in My tasks" link. Never mixed into the projects grid.
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Play } from 'lucide-react'
import { useLocale } from '../../../i18n/index.jsx'
import { sessionLabel, stepStats, fmtDate, statusOf, useOpenSession } from '../../WorkTasks.jsx'
import { standaloneSessions } from './projectModel.js'

const MAX_ROWS = 4

export default function StandaloneTasks({ sessions, projects, loaded }) {
  const { t, tag } = useLocale()
  const open = useOpenSession()
  const solo = standaloneSessions(sessions, projects)
    .sort((a, b) => String(b.lastActivityAt || b.endedAt || b.startedAt || '').localeCompare(String(a.lastActivityAt || a.endedAt || a.startedAt || '')))
  const rows = solo.slice(0, MAX_ROWS)
  const untitled = t('workDashboard.del.untitled')
  return (
    <section className="wd-pj-solo" aria-label={t('workProjects.standalone.heading')}>
      <div className="wd-sec">
        <span className="wd-ic alt"><ClipboardList size={16} /></span>
        <div>
          <h2>{t('workProjects.standalone.heading')}{loaded && solo.length > 0 && <span className="wd-sec-count">{solo.length}</span>}</h2>
          <p>{t('workProjects.standalone.sub')}</p>
        </div>
        <Link className="wd-sess-all" to="/work/tasks">{t('workProjects.standalone.viewAll')} <ArrowRight size={13} /></Link>
      </div>
      {loaded && rows.length === 0 && (
        <div className="wd-empty">
          <span className="ic"><Play size={18} /></span>
          <div>
            <p>{t('workProjects.standalone.empty')}</p>
          </div>
          <Link to="/work/start" className="wd-pj-btn" style={{ marginLeft: 'auto' }}>{t('workProjects.standalone.start')} <ArrowRight size={13} /></Link>
        </div>
      )}
      {rows.map((s) => {
        const st = stepStats(s)
        const status = statusOf(s)
        const label = sessionLabel(s, untitled)
        const when = fmtDate(s.endedAt || s.lastActivityAt || s.startedAt, false, tag)
        return (
          <div key={s.id} className="wd-sess">
            <span className={`wd-sess-ic${status.key === 'ended' ? ' done' : ''}`} aria-hidden><status.Icon size={14} /></span>
            <div className="wd-sess-main">
              <div className="wd-sess-title" title={label}>{label}</div>
              <div className="wd-sess-meta">{t(status.labelKey, status.label)}{when ? ` · ${when}` : ''} {'·'} {t.rich('workShell.tasks.steps', { done: st.done, total: st.total }, { n: (c) => <span className="wd-sess-done">{c}</span> })}</div>
            </div>
            <button type="button" className="wd-resume" onClick={() => open(s.id)}>{status.key === 'paused' ? t('workShell.tasks.resume') : t('workShell.tasks.open')} <ArrowRight size={13} /></button>
          </div>
        )
      })}
      {solo.length > MAX_ROWS && <Link to="/work/tasks" className="wd-sess-more">{t.n('workProjects.standalone.more', solo.length - MAX_ROWS)} <ArrowRight size={13} /></Link>}
    </section>
  )
}
