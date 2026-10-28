// /work/templates/:id: one template's progress roll-up. Head (back, name, task
// count, goal), the PROGRESS-ONLY note, the summary tiles (assigned / completed
// / in progress / not started / average) on the dashboard tile recipe, and the
// per-person table: name, progress bar + percent, done of total, state chip,
// assigned date, least complete first. Never evidence, never a person's work:
// the server does not send it and this view does not ask for it. A PM / admin
// can assign more people from here; GRC reads.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ListChecks, Loader2, AlertTriangle, ShieldCheck, UserPlus, Users, Check, Play, Circle } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePeople } from './usePm.js'
import { useTemplateRollup } from './useTemplates.js'
import { rollupSummary, sortRuns, runState, runPercent, fmtShortDate } from './templatesModel.js'
import { StatTiles } from './StatViz.jsx'
import AssignTemplate from './AssignTemplate.jsx'
import RoleGate, { LoadError } from './RoleGate.jsx'

const STATE_ICON = { notStarted: Circle, inProgress: Play, completed: Check }
const STATE_CHIP = { notStarted: 'pending', inProgress: 'active', completed: 'done' }

export default function TemplateRollup() {
  const t = useT()
  const { id } = useParams()
  const { user, roleView } = useWorkApp()
  const { rollup, loaded, err, reload } = useTemplateRollup(roleView.showTemplates ? id : '')
  const { people, nameOf } = usePeople({ me: user, fallback: (pid) => t('workPm.common.person', { id: pid }) })
  const [assigning, setAssigning] = useState(false)
  const runs = useMemo(() => sortRuns(rollup && rollup.runs), [rollup])
  const s = rollupSummary(rollup)
  const tpl = (rollup && rollup.template) || null
  const back = <Link to="/work/templates" className="wd-pj-back"><ArrowLeft size={14} /> {t('workPm.templates.rollup.back')}</Link>
  const tiles = [
    { key: 'assigned', label: t('workPm.templates.rollup.tiles.assigned'), value: s.assigned },
    { key: 'completed', label: t('workPm.templates.rollup.tiles.completed'), value: s.completed, tone: 'green' },
    { key: 'inProgress', label: t('workPm.templates.rollup.tiles.inProgress'), value: s.inProgress, tone: 'blue' },
    { key: 'notStarted', label: t('workPm.templates.rollup.tiles.notStarted'), value: s.notStarted },
    { key: 'avg', label: t('workPm.templates.rollup.tiles.avg'), value: `${s.avgPercent}%`, tone: 'green' },
  ]

  return (
    <RoleGate allowed={roleView.showTemplates}>
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      {back}
      {!loaded ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '48px 0' }}><Loader2 size={20} className="spin" style={{ color: 'var(--em)' }} /></div>
      ) : err || !tpl ? (
        err === 'notfound' || !tpl
          ? <div className="wd-empty" role="alert"><span className="ic"><AlertTriangle size={18} /></span><div><b>{t('workPm.templates.rollup.notFoundTitle')}</b><p>{t('workPm.templates.rollup.notFoundBody')}</p></div></div>
          : <LoadError title={t('workPm.templates.rollup.errTitle')} denied={err === 'denied'} onRetry={reload} />
      ) : (
        <>
          <div className="wd-ep-view-head">
            <div className="wd-ep-view-row">
              <h1>{tpl.name}</h1>
              <span className="wd-pj-chip"><ListChecks size={12} /> {t.n('workPm.templates.tasks', Number(tpl.taskCount) || 0, { n: Number(tpl.taskCount) || 0 })}</span>
            </div>
            {tpl.goal && <p className="wd-ep-view-goal">{tpl.goal}</p>}
            {roleView.canManageTemplates && (
              <div className="wd-ep-view-acts">
                <button type="button" className="wd-pj-btn primary" onClick={() => setAssigning(true)}><UserPlus size={13} /> {t('workPm.templates.assign')}</button>
              </div>
            )}
          </div>
          <div className="wd-ep-note"><ShieldCheck size={14} /> <span>{t('workPm.templates.rollup.progressOnly')}</span></div>

          <StatTiles tiles={tiles} ariaLabel={t('workPm.templates.progress')} />

          <section aria-label={t('workPm.templates.rollup.people')} className="wd-ep-tasks">
            <div className="wd-sec"><span className="wd-ic alt"><Users size={16} /></span><div><h2>{t('workPm.templates.rollup.people')}{runs.length > 0 && <span className="wd-sec-count">{runs.length}</span>}</h2><p>{t('workPm.templates.rollup.peopleSub')}</p></div></div>
            {runs.length === 0 ? (
              <div className="wd-empty"><span className="ic"><Users size={18} /></span><div><b>{t('workPm.templates.rollup.noRuns')}</b><p>{t('workPm.templates.rollup.noRunsBody')}</p></div></div>
            ) : (
              <div className="wd-ep-log-wrap">
                <table className="wd-ep-log wd-ep-runs">
                  <thead>
                    <tr>
                      <th>{t('workPm.templates.rollup.th.person')}</th>
                      <th>{t('workPm.templates.rollup.th.progress')}</th>
                      <th>{t('workPm.templates.rollup.th.done')}</th>
                      <th>{t('workPm.templates.rollup.th.state')}</th>
                      <th>{t('workPm.templates.rollup.th.assigned')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => {
                      const st = runState(r), pct = runPercent(r), Icon = STATE_ICON[st]
                      const name = r.name || nameOf(r.userId)
                      return (
                        <tr key={r.userId || r.projectId}>
                          <td className="by"><span className="wd-ep-run-nm" title={name}>{name}</span></td>
                          <td className="pct">
                            <div className="wd-ep-runbar" aria-label={`${pct}%`}>
                              <span className={`wd-pj-bar${st === 'completed' ? ' done' : ''}`}><i style={{ width: `${pct}%` }} /></span>
                              <b>{pct}%</b>
                            </div>
                          </td>
                          <td className="when">{t('workPm.templates.rollup.doneOf', { done: Number(r.done) || 0, total: Number(r.total) || 0 })}</td>
                          <td className="what"><span className={`wd-pj-chip ${STATE_CHIP[st]}`}><Icon size={11} /> {t(`workPm.templates.rollup.state.${st}`)}</span></td>
                          <td className="when">{fmtShortDate(r.assignedAt) || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {assigning && tpl && <AssignTemplate template={tpl} people={people} nameOf={nameOf} onClose={() => setAssigning(false)} onAssigned={() => reload()} />}
    </div>
    </RoleGate>
  )
}
