// /work/grc: read-only oversight (GRC; a Sr PM and the company admin see it too).
// Status tiles + a stacked share bar (complete / ongoing / on hold) from
// /grc/stats, load per project manager (BarList), the computed risk register
// from /grc/risks (SLA breaches first, then ready-but-unassigned, then held) as
// an actionable list, every project as a card (opens the read-only view), and
// the full control log from /grc/log with a project filter. GRC never creates
// or assigns; the server refuses it too.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, BarChart3, AlertTriangle, Clock, PauseCircle, UserRound, FolderKanban, History, ArrowRight } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePmProjects, useGrcStats, useGrcRisks, useGrcLog, usePeople } from './usePm.js'
import { rollupByManager, sortRisks, riskCounts, filterProjects, statusCounts } from './pmModel.js'
import { RISK_SLA_DAYS } from '../../../shared/work_roles_options.js'
import EpProjectCard from './EpProjectCard.jsx'
import LogList from './LogList.jsx'
import { StatTiles, StackedBar, BarList } from './StatViz.jsx'
import RoleGate, { LoadError } from './RoleGate.jsx'
import { StatusFilters } from './PmDashboard.jsx'

const RISK_ICON = { sla_breach: Clock, project_held: PauseCircle, unassigned_idle: UserRound }
const RISK_ACTION = { sla_breach: 'slaAction', project_held: 'heldAction', unassigned_idle: 'idleAction' }

export default function GrcDashboard() {
  const t = useT()
  const { user, roleView } = useWorkApp()
  const { projects, loaded, err, reload } = usePmProjects('')
  const { stats, loaded: statsLoaded, err: statsErr, reload: reloadStats } = useGrcStats(roleView.seesAll)
  const { risks, loaded: risksLoaded } = useGrcRisks(roleView.seesAll)
  const [logProject, setLogProject] = useState('')
  const { log, loaded: logLoaded } = useGrcLog(logProject, 500, roleView.seesAll)
  const { people, nameOf, denied } = usePeople({ me: user, projects, stats, log, fallback: (id) => t('workPm.common.person', { id }) })
  const [status, setStatus] = useState('all')
  const rows = useMemo(() => rollupByManager(projects, stats, (id) => (id === 'unassigned' ? t('workPm.srpm.unassignedManager') : nameOf(id))), [projects, stats, nameOf, t])
  const sorted = useMemo(() => sortRisks(risks), [risks])
  const rc = riskCounts(risks)
  const s = (stats && stats.status) || { done: 0, ongoing: 0, held: 0 }
  const tiles = [
    { key: 'total', label: t('workPm.grc.tiles.total'), value: stats ? stats.total : projects.length },
    { key: 'ongoing', label: t('workPm.grc.tiles.ongoing'), value: s.ongoing, tone: 'blue' },
    { key: 'held', label: t('workPm.grc.tiles.held'), value: s.held, tone: 'amber' },
    { key: 'done', label: t('workPm.grc.tiles.done'), value: s.done, tone: 'green' },
  ]
  const counts = statusCounts(projects)
  const list = filterProjects(projects, status)
  const ready = loaded && statsLoaded
  const failed = err || statsErr
  void people

  return (
    <RoleGate allowed={roleView.showGrc}>
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic neutral"><ShieldCheck size={17} /></span>
        <div><h2>{t('workPm.grc.heading')}</h2><p>{t('workPm.grc.sub')}</p></div>
      </div>
      {roleView.readOnly && <div className="wd-ep-note"><ShieldCheck size={14} /> <span>{t('workPm.common.readOnly')}</span></div>}
      {denied && <div className="wd-ep-note"><UserRound size={14} /> <span>{t('workPm.common.peopleDenied')}</span></div>}

      {!ready ? (
        <div className="wd-ep-grid" aria-hidden>{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w3" /><i className="w2" /></div>)}</div>
      ) : failed ? (
        <LoadError title={t('workPm.grc.errTitle')} denied={failed === 'denied'} onRetry={() => { reload(); reloadStats() }} />
      ) : (
        <>
          <StatTiles tiles={tiles} ariaLabel={t('workPm.grc.statusChart')} />
          <div className="wd-ep-two">
            <section className="wd-card wd-ep-chart" aria-label={t('workPm.grc.statusChart')}>
              <div className="wd-sec"><span className="wd-ic"><BarChart3 size={16} /></span><div><h2>{t('workPm.grc.statusChart')}</h2><p>{t('workPm.grc.statusSub')}</p></div></div>
              <StackedBar ariaLabel={t('workPm.grc.statusChart')} segments={[
                { key: 'done', label: t('workPm.status.done'), value: s.done },
                { key: 'ongoing', label: t('workPm.status.ongoing'), value: s.ongoing },
                { key: 'held', label: t('workPm.status.held'), value: s.held },
              ]} />
            </section>
            <section className="wd-card wd-ep-chart" aria-label={t('workPm.grc.loadChart')}>
              <div className="wd-sec"><span className="wd-ic alt"><BarChart3 size={16} /></span><div><h2>{t('workPm.grc.loadChart')}</h2><p>{t('workPm.grc.loadSub')}</p></div></div>
              <BarList ariaLabel={t('workPm.grc.loadChart')} emptyLabel={t('workPm.srpm.noManagers')}
                items={rows.filter((r) => r.managerId !== 'unassigned').map((r) => ({ id: r.managerId, label: r.name, sub: t.n('workPm.common.projects', r.projects, { n: r.projects }), value: r.projects, right: t('workPm.srpm.tasksDone', { done: r.done, total: r.tasks }) }))} />
            </section>
          </div>

          <section aria-label={t('workPm.grc.risks')} className="wd-ep-risks">
            <div className="wd-sec">
              <span className="wd-ic warm"><AlertTriangle size={16} /></span>
              <div><h2>{t('workPm.grc.risks')}{risksLoaded && rc.total > 0 && <span className="wd-sec-count">{rc.total}</span>}</h2><p>{t('workPm.grc.risksSub', { days: RISK_SLA_DAYS })}</p></div>
            </div>
            {risksLoaded && sorted.length === 0 && (
              <div className="wd-empty"><span className="ic"><ShieldCheck size={18} /></span><div><b>{t('workPm.grc.noRisks')}</b><p>{t('workPm.grc.noRisksBody')}</p></div></div>
            )}
            {sorted.map((r, i) => {
              const Icon = RISK_ICON[r.kind] || AlertTriangle
              return (
                <article key={`${r.kind}-${r.projectId}-${r.taskId || i}`} className={`wd-card wd-ep-risk ${r.kind}`}>
                  <span className={`wd-pj-task-ic ${r.kind === 'unassigned_idle' ? 'active' : 'rerun'}`} aria-hidden style={r.kind !== 'unassigned_idle' ? { color: 'var(--warm)', background: 'var(--warm-fill)', borderColor: 'var(--warm-line)' } : undefined}><Icon size={15} /></span>
                  <div className="wd-ep-risk-main">
                    <div className="wd-ep-risk-row">
                      <span className={`wd-pj-chip risk-${r.kind}`}>{t(`workPm.grc.risk.${r.kind}`) }</span>
                      {r.ageDays != null && <span className="wd-pj-chip sla"><Clock size={11} /> {t.n('workPm.grc.risk.age', r.ageDays, { n: r.ageDays })}</span>}
                      <span className="wd-ep-risk-t">{r.taskTitle || r.projectName}</span>
                    </div>
                    <div className="wd-ep-risk-d">
                      <Link to={`/work/pm/${encodeURIComponent(r.projectId)}`} state={{ from: '/work/grc' }} className="wd-link">{r.projectName}</Link>
                      {r.managerId ? <> &middot; {t('workPm.card.manager')}: {nameOf(r.managerId)}</> : null}
                      {r.assigneeId ? <> &middot; {t('workPm.task.assignee')}: {nameOf(r.assigneeId)}</> : null}
                      {r.reason ? <> &middot; "{r.reason}"</> : null}
                    </div>
                    <div className="wd-ep-risk-a"><b>{t('workPm.grc.th.detail')}:</b> {t(`workPm.grc.risk.${RISK_ACTION[r.kind] || 'slaAction'}`)}</div>
                  </div>
                  <Link to={`/work/pm/${encodeURIComponent(r.projectId)}`} state={{ from: '/work/grc' }} className="wd-pj-btn">{t('workPm.card.open')} <ArrowRight size={13} /></Link>
                </article>
              )
            })}
          </section>

          <section aria-label={t('workPm.grc.tiles.total')} className="wd-ep" style={{ gap: 12 }}>
            <div className="wd-sec"><span className="wd-ic"><FolderKanban size={16} /></span><div><h2>{t('workPm.grc.tiles.total')}{projects.length > 0 && <span className="wd-sec-count">{projects.length}</span>}</h2></div></div>
            {projects.length > 0 && <StatusFilters counts={counts} value={status} onChange={setStatus} ariaLabel={t('workPm.pm.filterAria')} />}
            {projects.length === 0
              ? <div className="wd-empty"><span className="ic"><FolderKanban size={18} /></span><div><b>{t('workPm.pm.emptyTitle')}</b></div></div>
              : <div className="wd-ep-grid">{list.map((p) => <EpProjectCard key={p.id} project={p} showManager managerName={p.managerId ? nameOf(p.managerId) : ''} from="/work/grc" />)}</div>}
          </section>

          <section aria-label={t('workPm.grc.log')} className="wd-ep-tasks">
            <div className="wd-sec"><span className="wd-ic neutral"><History size={16} /></span><div><h2>{t('workPm.grc.log')}</h2><p>{t('workPm.grc.logSub')}</p></div></div>
            <div className="wd-ep-log-tools">
              <label htmlFor="wd-ep-log-proj" className="wd-ep-tile-l">{t('workPm.grc.logProject')}</label>
              <select id="wd-ep-log-proj" className="wd-pj-select" value={logProject} onChange={(e) => setLogProject(e.target.value)}>
                <option value="">{t('workPm.grc.logAll')}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {logLoaded ? <LogList log={log} projects={projects} nameOf={nameOf} /> : <div className="wd-skel"><i className="w1" /><i className="w3" /></div>}
          </section>
        </>
      )}
    </div>
    </RoleGate>
  )
}
