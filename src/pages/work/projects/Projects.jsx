// Projects dashboard (/work/projects): a child route of WorkAppLayout (rail +
// top bar persist). The canvas carries ONE primary action (New project), the
// projects grid (name, customer tag for company users, progress, state) and a
// SEPARATE area for standalone single tasks. The server gates entitlement: a
// 403 renders the Premium prompt (ProjectsGate), never a dead end. Thin page;
// each block is its own module (SUPREME XV). Strings: workProjects.*.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, AlertTriangle } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from './projects.css.js'
import { useProjectsList, useCustomers } from './useProjects.js'
import ProjectCard from './ProjectCard.jsx'
import StandaloneTasks from './StandaloneTasks.jsx'
import ProjectsGate from './ProjectsGate.jsx'
import NewProject from './NewProject.jsx'

export default function Projects() {
  const t = useT()
  const navigate = useNavigate()
  const { user, isCompanyMember, sessions, sessLoaded, upgradeHref } = useWorkApp()
  const [customerId, setCustomerId] = useState('')
  const { projects, loaded, err, gated, reload } = useProjectsList(customerId)
  const { customers } = useCustomers(isCompanyMember && !gated)
  const [creating, setCreating] = useState(false)
  const nameOf = useMemo(() => {
    const m = new Map((Array.isArray(customers) ? customers : []).map((c) => [c.id, c.name]))
    return (id) => (id && id !== 'default' ? (m.get(id) || id) : null)
  }, [customers])
  const canFilter = isCompanyMember && Array.isArray(customers) && customers.length > 1

  return (
    <div className="wd-pj">
      <style>{PJ_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic"><FolderKanban size={17} /></span>
        <div>
          <h2>{t('workProjects.list.heading')}{loaded && !err && !gated && projects.length > 0 && <span className="wd-sec-count">{projects.length}</span>}</h2>
          <p>{t('workProjects.page.lead')}</p>
        </div>
        {!gated && (
          <button type="button" className="wd-cta wd-pj-head-act" onClick={() => setCreating(true)} disabled={!loaded}><Plus size={16} /> <span className="full">{t('workProjects.page.new')}</span><span className="short">{t('workProjects.page.newShort')}</span></button>
        )}
      </div>

      {canFilter && (
        <div className="wd-pj-filter">
          <label htmlFor="wd-pj-cust-filter">{t('workProjects.list.customer')}</label>
          <select id="wd-pj-cust-filter" className="wd-pj-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{t('workProjects.list.allCustomers')}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.id === 'default' && /^default$/i.test(c.name || '') ? t('workProjects.create.customerDefault') : c.name}</option>)}
          </select>
        </div>
      )}

      {!loaded ? (
        <div className="wd-pj-skel" aria-hidden>
          {[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w3" /><i className="w2" /></div>)}
        </div>
      ) : gated ? (
        <ProjectsGate canUpgrade={!!(user && user.canUpgrade)} upgradeHref={upgradeHref} isCompanyMember={isCompanyMember} />
      ) : err ? (
        <div className="wd-empty" role="alert">
          <span className="ic"><AlertTriangle size={18} /></span>
          <div><b>{t('workProjects.list.errTitle')}</b><p>{t('workProjects.list.errBody')} <button type="button" className="wd-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={reload}>{t('workProjects.list.retry')}</button></p></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="wd-empty">
          <span className="ic"><FolderKanban size={18} /></span>
          <div><b>{t('workProjects.list.emptyTitle')}</b><p>{t('workProjects.list.emptyBody')}</p></div>
        </div>
      ) : (
        <div className="wd-pj-grid">
          {projects.map((p) => <ProjectCard key={p.id} project={p} customerName={isCompanyMember ? nameOf(p.customerId) : null} />)}
        </div>
      )}

      <StandaloneTasks sessions={sessions} projects={projects} loaded={sessLoaded} />

      {creating && (
        <NewProject onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); reload(); navigate(`/work/projects/${encodeURIComponent(p.id)}`) }} />
      )}
    </div>
  )
}
