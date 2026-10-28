// /work/pm/:id: one managed project. Head (back, name, status chip, manager,
// goal), the manager's actions (Hold / Resume with a reason; Sr PM / admin: Move
// to another manager), the counts (tasks / not started / in progress / done) with
// the progress bar, the task filter row, the task map as TaskAssignRows (assign
// or move a task; click an assignee for their productivity), and the project's
// own activity log. GRC and anyone without manage rights see the same view
// read-only. Every mutation re-reads the one source of truth (reload).
import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Check, PauseCircle, PlayCircle, UserRound, ArrowLeftRight, Loader2, AlertTriangle, History } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePmProject, usePeople, useGrcLog } from './usePm.js'
import { projectStatus, projectCounts, filterTasks, groupTasks, BUCKETS } from './pmModel.js'
import { canManageProject, assignablePeople, managerCandidates } from '../../../shared/work_roles_options.js'
import TaskAssignRow from './TaskAssignRow.jsx'
import { PersonModal } from './ProductivityPanel.jsx'
import ReasonModal from './ReasonModal.jsx'
import LogList from './LogList.jsx'
import { StatTiles } from './StatViz.jsx'
import { LoadError } from './RoleGate.jsx'

export default function PmProjectView() {
  const t = useT()
  const { id } = useParams()
  const location = useLocation()
  const { user, roleView } = useWorkApp()
  const { project, loaded, err, reload } = usePmProject(id)
  const projects = useMemo(() => (project ? [project] : []), [project])
  // The project's own log: a PM may read it for a project they manage; Sr PM /
  // GRC / admin read any. A member-level reader simply gets no activity block.
  const { log, loaded: logLoaded, reload: reloadLog } = useGrcLog(id, 200, !!project)
  const { people, nameOf, denied } = usePeople({ me: user, projects, log, fallback: (pid) => t('workPm.common.person', { id: pid }) })
  const [bucket, setBucket] = useState('all')
  const [person, setPerson] = useState(null)       // { id, name }
  const [modal, setModal] = useState(null)         // 'hold' | 'move' | null
  const [newManager, setNewManager] = useState('')
  const [busy, setBusy] = useState(false)
  const [actErr, setActErr] = useState('')

  const from = (location.state && location.state.from) || '/work/pm'
  const backLabel = from === '/work/grc' ? t('workPm.view.backOversight') : from === '/work/srpm' ? t('workPm.view.backSrPm') : t('workPm.view.back')
  const back = <Link to={from} className="wd-pj-back"><ArrowLeft size={14} /> {backLabel}</Link>

  if (!loaded) return <div className="wd-ep"><style>{PJ_CSS}{EP_CSS}</style>{back}<div style={{ display: 'grid', placeItems: 'center', padding: '48px 0' }}><Loader2 size={20} className="spin" style={{ color: 'var(--em)' }} /></div></div>
  if (err || !project) {
    return (
      <div className="wd-ep"><style>{PJ_CSS}{EP_CSS}</style>{back}
        {err === 'notfound'
          ? <div className="wd-empty" role="alert"><span className="ic"><AlertTriangle size={18} /></span><div><b>{t('workPm.view.notFoundTitle')}</b><p>{t('workPm.view.notFoundBody')}</p></div></div>
          : <LoadError title={t('workPm.view.errTitle')} denied={err === 'denied'} onRetry={reload} />}
      </div>
    )
  }

  const status = projectStatus(project)
  const c = projectCounts(project)
  const canManage = canManageProject(roleView.role, user.id, project)
  const groups = groupTasks(project)
  const tasks = filterTasks(project, bucket)
  const assignable = assignablePeople(people)
  const managers = managerCandidates(people).filter((p) => String(p.id) !== String(project.managerId))
  const refresh = async () => { await reload(); reloadLog() }

  const hold = async (reason) => {
    setActErr('')
    try { await api.workPmHoldProject(project.id, true, reason); setModal(null); await refresh() }
    catch (e) { setActErr(friendlyError(e, t('workPm.view.errAction'))) }
  }
  const resume = async () => {
    if (busy) return
    setBusy(true); setActErr('')
    try { await api.workPmHoldProject(project.id, false, ''); await refresh() }
    catch (e) { setActErr(friendlyError(e, t('workPm.view.errAction'))) }
    setBusy(false)
  }
  const move = async (reason) => {
    setActErr('')
    try { await api.workPmReassignProject(project.id, newManager, reason); setModal(null); setNewManager(''); await refresh() }
    catch (e) { setActErr(friendlyError(e, t('workPm.view.errAction'))) }
  }

  const tiles = [
    { key: 'total', label: t('workPm.view.counts.total'), value: c.total },
    { key: 'notStarted', label: t('workPm.view.counts.notStarted'), value: c.notStarted, sub: c.unassigned ? t.n('workPm.card.unassigned', c.unassigned, { n: c.unassigned }) : null },
    { key: 'inProgress', label: t('workPm.view.counts.inProgress'), value: c.inProgress, tone: 'blue' },
    { key: 'completed', label: t('workPm.view.counts.completed'), value: c.done, tone: 'green' },
  ]

  return (
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-ep-view-head">
        {back}
        <div className="wd-ep-view-row">
          <h1>{project.name}</h1>
          <span className={`wd-pj-chip ${status}`}>{status === 'done' ? <Check size={12} /> : status === 'held' ? <PauseCircle size={12} /> : null}{t(`workPm.status.${status}`)}</span>
          <span className="wd-pj-chip person" title={nameOf(project.managerId)}><UserRound size={11} /><span>{t('workPm.card.manager')}: {project.managerId ? nameOf(project.managerId) : t('workPm.common.noOne')}</span></span>
        </div>
        {project.goal && <p className="wd-ep-view-goal">{project.goal}</p>}
        {project.held && project.heldReason && <div className="wd-ep-note warn"><PauseCircle size={14} /> <span>{t('workPm.card.heldReason', { reason: project.heldReason })}</span></div>}
        {roleView.readOnly && <div className="wd-ep-note"><History size={14} /> <span>{t('workPm.common.readOnly')}</span></div>}
        {denied && (canManage || roleView.seesAll) && <div className="wd-ep-note"><UserRound size={14} /> <span>{t('workPm.common.peopleDenied')}</span></div>}
        {(canManage || roleView.canReassignProject) && (
          <div className="wd-ep-view-acts">
            {canManage && (project.held
              ? <button type="button" className="wd-pj-btn primary" onClick={resume} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <PlayCircle size={14} />} {t('workPm.view.resume')}</button>
              : <button type="button" className="wd-pj-btn" onClick={() => setModal('hold')} disabled={busy}><PauseCircle size={14} /> {t('workPm.view.hold')}</button>)}
            {roleView.canReassignProject && <button type="button" className="wd-pj-btn" onClick={() => setModal('move')} disabled={busy}><ArrowLeftRight size={14} /> {t('workPm.view.reassign')}</button>}
          </div>
        )}
        {actErr && !modal && <div className="wd-ep-task-alert" role="alert"><AlertTriangle size={14} /> <span>{actErr}</span></div>}
      </div>

      <StatTiles tiles={tiles} ariaLabel={t('workPm.view.tasks')} />
      <div className="wd-ep-prog" aria-label={t('workPm.card.progress', { done: c.done, total: c.total })}>
        <span className={`wd-pj-bar${c.total && c.done === c.total ? ' done' : ''}`}><i style={{ width: `${c.pct}%` }} /></span>
        <b style={{ fontSize: 12.5, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{t('workPm.card.progress', { done: c.done, total: c.total })}</b>
      </div>

      <section aria-label={t('workPm.view.tasks')} className="wd-ep-tasks">
        <div className="wd-sec" style={{ marginBottom: 2 }}>
          <div><h2>{t('workPm.view.tasks')}</h2><p>{t('workPm.view.tasksSub')}</p></div>
        </div>
        <div className="wd-ep-filters" role="group" aria-label={t('workPm.view.filterAria')}>
          {['all', ...BUCKETS].map((b) => (
            <button key={b} type="button" className={`wd-ep-filter${bucket === b ? ' on' : ''}`} aria-pressed={bucket === b} onClick={() => setBucket(b)}>
              {b === 'all' ? t('workPm.common.all') : t(`workPm.bucket.${b}`)} <b>{b === 'all' ? c.total : groups[b].length}</b>
            </button>
          ))}
        </div>
        {tasks.map((task) => (
          <TaskAssignRow key={task.id} project={project} task={task} index={project.tasks.indexOf(task)} canManage={canManage} people={assignable} nameOf={nameOf} onChanged={refresh} onPerson={(pid, name) => setPerson({ id: pid, name })} />
        ))}
      </section>

      {logLoaded && log.length > 0 && (
        <section aria-label={t('workPm.view.activity')} className="wd-ep-tasks">
          <div className="wd-sec" style={{ marginBottom: 2 }}>
            <span className="wd-ic neutral"><History size={16} /></span>
            <div><h2>{t('workPm.view.activity')}</h2><p>{t('workPm.view.activitySub')}</p></div>
          </div>
          <LogList log={log} projects={projects} nameOf={nameOf} showProject={false} />
        </section>
      )}

      {person && <PersonModal userId={person.id} name={person.name} onClose={() => setPerson(null)} />}
      {modal === 'hold' && (
        <ReasonModal eyebrow={t('workPm.view.hold')} title={t('workPm.view.holdTitle')} body={t('workPm.view.holdBody')} confirmLabel={t('workPm.view.holdConfirm')} onConfirm={hold} onClose={() => { setModal(null); setActErr('') }} error={actErr} />
      )}
      {modal === 'move' && (
        <ReasonModal eyebrow={t('workPm.view.reassign')} title={t('workPm.view.reassignTitle')} body={t('workPm.view.reassignBody')} confirmLabel={t('workPm.view.reassignConfirm')} requireReason canConfirm={!!newManager} onConfirm={move} onClose={() => { setModal(null); setActErr('') }} error={actErr}>
          <div className="wd-pj-field">
            <label htmlFor="wd-ep-newmgr">{t('workPm.view.reassignLabel')}</label>
            {managers.length === 0
              ? <div className="wd-pj-help"><AlertTriangle size={13} /> <span>{t('workPm.view.noManagers')}</span></div>
              : (
                <select id="wd-ep-newmgr" className="wd-pj-select" value={newManager} onChange={(e) => setNewManager(e.target.value)}>
                  <option value="">{t('workPm.task.pickPerson')}</option>
                  {managers.map((p) => <option key={p.id} value={p.id}>{nameOf(p.id)}</option>)}
                </select>
              )}
          </div>
        </ReasonModal>
      )}
    </div>
  )
}
