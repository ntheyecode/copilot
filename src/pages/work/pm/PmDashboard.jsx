// /work/pm: the project manager's dashboard, "Projects I manage". One primary
// action (New project), a status filter row (all / ongoing / on hold / complete
// with counts), and the grid of EpProjectCards (progress, state, assignment
// picture). A Sr PM or company admin visiting this page sees the projects THEY
// manage (?manager=me); their whole-company views are /work/srpm and /work/grc.
// Thin page; every block is its own module (SUPREME XV). Strings: workPm.*.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePmProjects, usePeople } from './usePm.js'
import { filterProjects, statusCounts, STATUSES } from './pmModel.js'
import EpProjectCard from './EpProjectCard.jsx'
import NewManagedProject from './NewManagedProject.jsx'
import RoleGate, { LoadError } from './RoleGate.jsx'

export function StatusFilters({ counts, value, onChange, ariaLabel }) {
  const t = useT()
  return (
    <div className="wd-ep-filters" role="group" aria-label={ariaLabel}>
      {['all', ...STATUSES].map((s) => (
        <button key={s} type="button" className={`wd-ep-filter${value === s ? ' on' : ''}`} aria-pressed={value === s} onClick={() => onChange(s)}>
          {s === 'all' ? t('workPm.common.all') : t(`workPm.status.${s}`)} <b>{counts[s] || 0}</b>
        </button>
      ))}
    </div>
  )
}

export default function PmDashboard() {
  const t = useT()
  const navigate = useNavigate()
  const { user, roleView } = useWorkApp()
  // A plain PM is already scoped by the server; a Sr PM / admin asks for their own.
  const mine = roleView.seesAll ? String(user.id) : ''
  const { projects, loaded, err, reload } = usePmProjects(mine)
  const { people, nameOf } = usePeople({ me: user, projects, fallback: (id) => t('workPm.common.person', { id }) })
  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const counts = statusCounts(projects)
  const list = filterProjects(projects, status)

  return (
    <RoleGate allowed={roleView.showPm}>
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic"><FolderKanban size={17} /></span>
        <div>
          <h2>{t('workPm.pm.heading')}{loaded && !err && projects.length > 0 && <span className="wd-sec-count">{projects.length}</span>}</h2>
          <p>{t('workPm.pm.sub')}</p>
        </div>
        {roleView.canCreate && (
          <button type="button" className="wd-cta wd-ep-head-act" onClick={() => setCreating(true)} disabled={!loaded}><Plus size={16} /> <span className="full">{t('workPm.pm.newProject')}</span><span className="short">{t('workPm.pm.newShort')}</span></button>
        )}
      </div>

      {loaded && !err && projects.length > 0 && <StatusFilters counts={counts} value={status} onChange={setStatus} ariaLabel={t('workPm.pm.filterAria')} />}

      {!loaded ? (
        <div className="wd-ep-grid" aria-hidden>{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w3" /><i className="w2" /></div>)}</div>
      ) : err ? (
        <LoadError title={t('workPm.pm.errTitle')} denied={err === 'denied'} onRetry={reload} />
      ) : projects.length === 0 ? (
        <div className="wd-empty">
          <span className="ic"><FolderKanban size={18} /></span>
          <div><b>{t('workPm.pm.emptyTitle')}</b><p>{t('workPm.pm.emptyBody')}</p></div>
        </div>
      ) : (
        <div className="wd-ep-grid">
          {list.map((p) => <EpProjectCard key={p.id} project={p} from="/work/pm" />)}
        </div>
      )}

      {creating && (
        <NewManagedProject people={people} nameOf={nameOf} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); reload(); navigate(`/work/pm/${encodeURIComponent(p.id)}`, { state: { from: '/work/pm' } }) }} />
      )}
    </div>
    </RoleGate>
  )
}
