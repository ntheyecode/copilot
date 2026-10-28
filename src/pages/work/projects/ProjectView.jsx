// Project view (/work/projects/:id), a child route of WorkAppLayout. Top to
// bottom: back link + name + customer/state chips + goal; the END STATE card
// (finish line, checks, progress); the pick-next prompt once a task is done;
// the TASK MAP in order (one TaskCard per task); Add to this project (inject)
// with its result notice; the learnings ledger. Every mutation re-reads the one
// source of truth (useProject.reload) instead of patching a local copy. Thin
// page; the blocks are their own modules (SUPREME XV). Strings: workProjects.*.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Check, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from './projects.css.js'
import { useProject, useCustomers } from './useProjects.js'
import { sortedTasks } from './projectModel.js'
import EndStateCard from './EndStateCard.jsx'
import PickNext from './PickNext.jsx'
import TaskCard from './TaskCard.jsx'
import InjectTask, { InjectNotice } from './InjectTask.jsx'
import ProjectsGate from './ProjectsGate.jsx'

export default function ProjectView() {
  const t = useT()
  const { id } = useParams()
  const { user, isCompanyMember, onOpen, upgradeHref } = useWorkApp()
  const { data, loaded, err, reload } = useProject(id)
  const { customers } = useCustomers(isCompanyMember && !!data)
  const [notice, setNotice] = useState(null)

  const back = <Link to="/work/projects" className="wd-pj-back"><ArrowLeft size={14} /> {t('workProjects.view.back')}</Link>
  if (!loaded) return <div className="wd-pj"><style>{PJ_CSS}</style>{back}<div style={{ display: 'grid', placeItems: 'center', padding: '48px 0' }}><Loader2 size={20} className="spin" style={{ color: 'var(--em)' }} /></div></div>
  if (err === 'gate') return <div className="wd-pj"><style>{PJ_CSS}</style>{back}<ProjectsGate canUpgrade={!!(user && user.canUpgrade)} upgradeHref={upgradeHref} isCompanyMember={isCompanyMember} /></div>
  if (err || !data) {
    const nf = err === 'notfound'
    return (
      <div className="wd-pj"><style>{PJ_CSS}</style>{back}
        <div className="wd-empty" role="alert">
          <span className="ic"><AlertTriangle size={18} /></span>
          <div><b>{nf ? t('workProjects.view.notFoundTitle') : t('workProjects.view.errTitle')}</b><p>{nf ? t('workProjects.view.notFoundBody') : <>{t('workProjects.view.errBody')} <button type="button" className="wd-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={reload}>{t('workProjects.list.retry')}</button></>}</p></div>
        </div>
      </div>
    )
  }
  const { project, next, available } = data
  const tasks = sortedTasks(project)
  const state = ['planning', 'active', 'done'].includes(project.state) ? project.state : 'planning'
  const customerName = isCompanyMember && project.customerId && project.customerId !== 'default'
    ? (((customers || []).find((c) => c.id === project.customerId) || {}).name || project.customerId) : null
  const learnings = Array.isArray(project.learnings) ? project.learnings.map((l) => (l && l.fact) || String(l || '')).filter(Boolean) : []

  return (
    <div className="wd-pj">
      <style>{PJ_CSS}</style>
      <div className="wd-pj-view-head">
        {back}
        <div className="wd-pj-view-row">
          <h1>{project.name}</h1>
          <span className={`wd-pj-chip ${state}`}>{state === 'done' && <Check size={12} />}{t(`workProjects.state.${state}`)}</span>
          {customerName && <span className="wd-pj-chip customer" title={customerName}><Building2 size={11} /><span>{customerName}</span></span>}
        </div>
        {project.goal && <p className="wd-pj-view-goal">{project.goal}</p>}
      </div>

      <EndStateCard project={project} />
      <PickNext project={project} next={next} available={available} onOpen={onOpen} onChanged={reload} />

      <section aria-label={t('workProjects.view.map')} className="wd-pj-map">
        <div className="wd-sec" style={{ marginBottom: 2 }}>
          <div>
            <h2>{t('workProjects.view.map')}</h2>
            <p>{t('workProjects.view.mapSub')}</p>
          </div>
          <span style={{ marginLeft: 'auto', flexShrink: 0 }}><InjectTask project={project} onResult={(res) => { setNotice(res); reload() }} /></span>
        </div>
        <InjectNotice notice={notice} onDismiss={() => setNotice(null)} />
        {tasks.map((task, i) => <TaskCard key={task.id} project={project} task={task} index={i} onOpen={onOpen} onChanged={reload} />)}
      </section>

      {learnings.length > 0 && (
        <details className="wd-card wd-pj-learn">
          <summary><Lightbulb size={15} /> {t.n('workProjects.view.learnings', learnings.length)}</summary>
          <ul>{learnings.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
