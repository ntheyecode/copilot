// RECENT OUTCOMES on the dashboard: the last completed tasks read as results,
// not log lines. Each is a compact row (title, when it was finished, steps done)
// that expands in place to the goal, the step list and the report actions
// (Open, Download). Collapsed by default, one open at a time (owner rule:
// multi-field lists collapse to compact expandable rows). The sessions list is
// the shell's (api.workList); the row helpers are the shared ones from
// WorkTasks.jsx so a task reads the same everywhere. Styles: outcomes.css.js.
import { useMemo, useState } from 'react'
import { Check, Circle, ChevronRight, ArrowRight, Trophy } from 'lucide-react'
import DownloadMenu from '../../components/DownloadMenu.jsx'
import { useLocale } from '../../i18n/index.jsx'
import { sessionLabel, stepStats, fmtDate } from '../WorkTasks.jsx'
import { OUTCOMES_CSS } from './outcomes.css.js'

const MAX_ROWS = 3
const MAX_STEPS = 10

export default function Outcomes({ sessions, onOpen }) {
  const { t, tag } = useLocale()
  const [openId, setOpenId] = useState(null)
  const [dlErr, setDlErr] = useState('')
  const done = useMemo(() => (sessions || [])
    .filter((s) => s && s.status === 'ended')
    .sort((a, b) => String(b.endedAt || b.startedAt || '').localeCompare(String(a.endedAt || a.startedAt || '')))
    .slice(0, MAX_ROWS), [sessions])
  if (done.length === 0) return null
  const untitled = t('workDashboard.del.untitled')
  return (
    <section className="wd-oc" aria-label={t('workDashboard.outcomes.heading')}>
      <style>{OUTCOMES_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic"><Trophy size={16} /></span>
        <div>
          <h2>{t('workDashboard.outcomes.heading')}</h2>
          <p>{t('workDashboard.outcomes.sub')}</p>
        </div>
        <a className="wd-sess-all" href="/work/completed">{t('workDashboard.outcomes.viewAll')} <ArrowRight size={13} /></a>
      </div>
      {dlErr && <div className="wd-note warn" role="alert"><span>{dlErr}</span></div>}
      <div className="wd-oc-list">
        {done.map((s) => {
          const st = stepStats(s)
          const label = sessionLabel(s, untitled)
          const open = openId === s.id
          const steps = Array.isArray(s.steps) ? s.steps : []
          const bodyId = `wd-oc-${s.id}`
          const showGoal = !!(s.goal && s.goal.trim() && s.goal.trim() !== label)
          return (
            <div key={s.id} className={`wd-oc-row${open ? ' open' : ''}`}>
              <button type="button" className="wd-oc-btn" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpenId(open ? null : s.id)}>
                <span className="wd-oc-ic" aria-hidden><Check size={15} /></span>
                <span className="wd-oc-main">
                  <span className="wd-oc-t" title={label}>{label}</span>
                  <span className="wd-oc-m">{t('workDashboard.outcomes.finished', { date: fmtDate(s.endedAt || s.startedAt, false, tag) })} &middot; {t.rich('workDashboard.outcomes.steps', { done: st.done, total: st.total }, { n: (c) => <b>{c}</b> })}</span>
                </span>
                <ChevronRight size={16} className="wd-oc-chev" aria-hidden />
              </button>
              {open && (
                <div className="wd-oc-body" id={bodyId}>
                  {showGoal && <div><div className="wd-oc-k">{t('workDashboard.outcomes.goal')}</div><div className="wd-oc-goal">{s.goal.trim()}</div></div>}
                  {steps.length > 0 && (
                    <div>
                      <div className="wd-oc-k">{t('workDashboard.outcomes.stepsTitle')}</div>
                      <ol className="wd-oc-steps">
                        {steps.slice(0, MAX_STEPS).map((x, i) => (
                          <li key={i} className={x && x.status === 'done' ? '' : 'todo'}>{x && x.status === 'done' ? <Check size={14} /> : <Circle size={14} />}<span>{(x && (x.text || x.title)) || ''}</span></li>
                        ))}
                      </ol>
                      {steps.length > MAX_STEPS && <div className="wd-oc-more">{t('workDashboard.outcomes.moreSteps', { n: steps.length - MAX_STEPS })}</div>}
                    </div>
                  )}
                  <div className="wd-oc-acts">
                    <button type="button" className="wd-oc-open" onClick={() => onOpen && onOpen(s.id)}>{t('workDashboard.outcomes.open')} <ArrowRight size={14} /></button>
                    <DownloadMenu sessionId={s.id} className="wd-oc-open" label={t('workDashboard.outcomes.download')} onError={setDlErr} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
