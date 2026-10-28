// /work/srpm: the senior project manager's roll-up. Status tiles for the whole
// company, load per project manager (BarList), every manager with the projects
// they manage (EpProjectCards with a Move action), New project (hand it to a
// manager), and the people who can be assigned work with their productivity.
// A company admin sees the same. Strings: workPm.srpm.* (+ shared).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, UserRound, ArrowLeftRight, BarChart3, FolderKanban, AlertTriangle } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePmProjects, useGrcStats, usePeople } from './usePm.js'
import { rollupByManager } from './pmModel.js'
import { managerCandidates, assignablePeople } from '../../../shared/work_roles_options.js'
import EpProjectCard from './EpProjectCard.jsx'
import NewManagedProject from './NewManagedProject.jsx'
import ReasonModal from './ReasonModal.jsx'
import { PersonModal } from './ProductivityPanel.jsx'
import { StatTiles, BarList } from './StatViz.jsx'
import RoleGate, { LoadError } from './RoleGate.jsx'

export default function SrPmDashboard() {
  const t = useT()
  const navigate = useNavigate()
  const { user, roleView } = useWorkApp()
  const { projects, loaded, err, reload } = usePmProjects('')
  const { stats, reload: reloadStats } = useGrcStats(roleView.seesAll)
  const { people, nameOf, denied } = usePeople({ me: user, projects, stats, fallback: (id) => t('workPm.common.person', { id }) })
  const [creating, setCreating] = useState(false)
  const [moving, setMoving] = useState(null)        // project
  const [newManager, setNewManager] = useState('')
  const [moveErr, setMoveErr] = useState('')
  const [person, setPerson] = useState(null)
  const rows = useMemo(() => rollupByManager(projects, stats, (id) => (id === 'unassigned' ? t('workPm.srpm.unassignedManager') : nameOf(id))), [projects, stats, nameOf, t])
  const s = (stats && stats.status) || { done: 0, ongoing: 0, held: 0 }
  const tiles = [
    { key: 'total', label: t('workPm.grc.tiles.total'), value: stats ? stats.total : projects.length },
    { key: 'ongoing', label: t('workPm.grc.tiles.ongoing'), value: s.ongoing, tone: 'blue' },
    { key: 'held', label: t('workPm.grc.tiles.held'), value: s.held, tone: 'amber' },
    { key: 'done', label: t('workPm.grc.tiles.done'), value: s.done, tone: 'green' },
  ]
  const refresh = async () => { await reload(); reloadStats() }
  const move = async (reason) => {
    setMoveErr('')
    try { await api.workPmReassignProject(moving.id, newManager, reason); setMoving(null); setNewManager(''); await refresh() }
    catch (e) { setMoveErr(friendlyError(e, t('workPm.view.errAction'))) }
  }
  const assignable = assignablePeople(people)
  const managersFor = (p) => managerCandidates(people).filter((x) => String(x.id) !== String(p && p.managerId))

  return (
    <RoleGate allowed={roleView.showSrPm}>
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic alt"><Users size={17} /></span>
        <div><h2>{t('workPm.srpm.heading')}</h2><p>{t('workPm.srpm.sub')}</p></div>
        {roleView.canCreate && <button type="button" className="wd-cta wd-ep-head-act" onClick={() => setCreating(true)} disabled={!loaded}><Plus size={16} /> <span className="full">{t('workPm.pm.newProject')}</span><span className="short">{t('workPm.pm.newShort')}</span></button>}
      </div>
      {denied && <div className="wd-ep-note"><UserRound size={14} /> <span>{t('workPm.common.peopleDenied')}</span></div>}

      {!loaded ? (
        <div className="wd-ep-grid" aria-hidden>{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w3" /><i className="w2" /></div>)}</div>
      ) : err ? (
        <LoadError title={t('workPm.pm.errTitle')} denied={err === 'denied'} onRetry={reload} />
      ) : (
        <>
          <StatTiles tiles={tiles} ariaLabel={t('workPm.grc.statusChart')} />
          <section className="wd-card wd-ep-chart" aria-label={t('workPm.srpm.load')}>
            <div className="wd-sec"><span className="wd-ic alt"><BarChart3 size={16} /></span><div><h2>{t('workPm.srpm.load')}</h2><p>{t('workPm.srpm.loadSub')}</p></div></div>
            <BarList ariaLabel={t('workPm.srpm.load')} emptyLabel={t('workPm.srpm.noManagers')}
              items={rows.filter((r) => r.managerId !== 'unassigned').map((r) => ({ id: r.managerId, label: r.name, sub: t.n('workPm.common.projects', r.projects, { n: r.projects }), value: r.projects, right: t('workPm.srpm.tasksDone', { done: r.done, total: r.tasks }) }))} />
          </section>

          <section aria-label={t('workPm.srpm.rollup')} className="wd-ep" style={{ gap: 20 }}>
            <div className="wd-sec"><span className="wd-ic"><FolderKanban size={16} /></span><div><h2>{t('workPm.srpm.rollup')}</h2></div></div>
            {rows.length === 0 && <div className="wd-empty"><span className="ic"><FolderKanban size={18} /></span><div><b>{t('workPm.pm.emptyTitle')}</b><p>{t('workPm.pm.emptyBody')}</p></div></div>}
            {rows.map((r) => (
              <div key={r.managerId} className="wd-ep-group">
                <div className="wd-ep-group-head">
                  <span className="wd-ic neutral"><UserRound size={15} /></span>
                  <b>{r.name}</b>
                  <small>{t.n('workPm.common.projects', r.projects, { n: r.projects })} &middot; {t('workPm.srpm.tasksDone', { done: r.done, total: r.tasks })}</small>
                  {r.managerId !== 'unassigned' && r.managerId !== String(user.id) && <button type="button" className="wd-pj-btn quiet" style={{ marginLeft: 'auto' }} onClick={() => setPerson({ id: r.managerId, name: r.name })}><BarChart3 size={13} /> {t('workPm.srpm.viewProd')}</button>}
                </div>
                <div className="wd-ep-grid">
                  {r.list.map((p) => (
                    <EpProjectCard key={p.id} project={p} from="/work/srpm"
                      action={roleView.canReassignProject ? <button type="button" className="wd-pj-btn" onClick={() => { setMoving(p); setNewManager(''); setMoveErr('') }}><ArrowLeftRight size={13} /> {t('workPm.task.reassign')}</button> : null} />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section aria-label={t('workPm.srpm.people')} className="wd-ep-tasks">
            <div className="wd-sec"><span className="wd-ic alt"><Users size={16} /></span><div><h2>{t('workPm.srpm.people')}</h2><p>{t('workPm.srpm.peopleSub')}</p></div></div>
            {assignable.length === 0 ? <div className="wd-ep-task-d">{t('workPm.task.noPeople')}</div> : (
              <div className="wd-ep-people">
                {assignable.map((p) => (
                  <div key={p.id} className="wd-card wd-ep-person">
                    <span className="wd-ic neutral" style={{ width: 30, height: 30 }}><UserRound size={14} /></span>
                    <span className="nm">{nameOf(p.id)}{p.workFlow ? <small>{t(`companyAdmin.flows.${p.workFlow}`)}</small> : null}</span>
                    <button type="button" className="wd-pj-btn" onClick={() => setPerson({ id: p.id, name: nameOf(p.id) })}><BarChart3 size={13} /> {t('workPm.srpm.viewProd')}</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {creating && <NewManagedProject people={people} nameOf={nameOf} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); refresh(); navigate(`/work/pm/${encodeURIComponent(p.id)}`, { state: { from: '/work/srpm' } }) }} />}
      {person && <PersonModal userId={person.id} name={person.name} onClose={() => setPerson(null)} />}
      {moving && (
        <ReasonModal eyebrow={t('workPm.view.reassign')} title={t('workPm.view.reassignTitle')} body={t('workPm.view.reassignBody')} confirmLabel={t('workPm.view.reassignConfirm')} canConfirm={!!newManager} onConfirm={move} onClose={() => setMoving(null)} error={moveErr}>
          <div className="wd-pj-out-goal">{moving.name}</div>
          <div className="wd-pj-field">
            <label htmlFor="wd-ep-srpm-mgr">{t('workPm.view.reassignLabel')}</label>
            {managersFor(moving).length === 0
              ? <div className="wd-pj-help"><AlertTriangle size={13} /> <span>{t('workPm.view.noManagers')}</span></div>
              : (
                <select id="wd-ep-srpm-mgr" className="wd-pj-select" value={newManager} onChange={(e) => setNewManager(e.target.value)}>
                  <option value="">{t('workPm.task.pickPerson')}</option>
                  {managersFor(moving).map((p) => <option key={p.id} value={p.id}>{nameOf(p.id)}</option>)}
                </select>
              )}
          </div>
        </ReasonModal>
      )}
    </div>
    </RoleGate>
  )
}
