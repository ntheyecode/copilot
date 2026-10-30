// Role-aware how-to help for EVERY dashboard (src/pages/work/Help.jsx mounts it).
// One entry per surface: a line on what it is for, then numbered how-tos for
// the key actions, each illustrated with a real screenshot captured from the
// product (public/help/dashboards/*.webp, 1280px wide, lazy). Entries are
// gated by the viewer's role view (src/shared/work_roles_options.js roleViewOf),
// so a person only reads help for surfaces they can open. Existing surfaces
// (dashboard, start, projects, guiding, reports) reuse the shots under
// public/help/user/. Same voice as the rest of the guide: US spelling, no
// model or provider names, "it guides, you act".
//
// i18n: every string reads from the `dashboardsHelp.<k>` namespace
// (src/i18n/locales/en/dashboardsHelp.js); `k` is the entry's key there. Lists
// are keyed arrays rendered through renderRich so inline <b> stays markup, not
// HTML. Image paths stay here (they are assets, not copy).
import { Inbox, Briefcase, Users, ShieldCheck, UserCog, LayoutDashboard, Play, FolderKanban, Compass, FileText, Signpost } from 'lucide-react'
import { useT, renderRich } from '../../../i18n/index.jsx'

// One screenshot with its caption (the figure recipe the guide already uses).
function Shot({ src, alt, caption, width = 1280, height }) {
  return (
    <figure className="wd-hf-fig">
      <img className="wd-hf-img" src={src} width={width} height={height} loading="lazy" decoding="async" alt={alt} />
      {caption && <figcaption className="wd-figcap">{caption}</figcaption>}
    </figure>
  )
}

// A keyed list (ol.wd-steps or ul): the array under `key` translates as a unit.
function Steps({ t, k, ordered = true }) {
  const items = t(k)
  const rows = (Array.isArray(items) ? items : []).map((s, i) => <li key={i}>{renderRich(s)}</li>)
  return ordered ? <ol className="wd-steps">{rows}</ol> : <ul>{rows}</ul>
}

// The catalog: id (section anchor), key under dashboardsHelp (nav label =
// `<k>.title`), who sees it (a predicate on the role view), icon, and the body
// (role view, translator). Order = reading order on the page.
export const DASHBOARD_HELP = [
  {
    id: 'dash-home', k: 'home', icon: LayoutDashboard, show: () => true,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.home.lead')}</p>
      <Shot src="/help/dashboards/dashboard.webp" height={1150} alt={t('dashboardsHelp.home.shot.alt')} caption={t('dashboardsHelp.home.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.home.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.home.steps" />
    </>),
  },
  {
    id: 'dash-start', k: 'start', icon: Play, show: (v) => v.canStart,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.start.lead')}</p>
      <Shot src="/help/user/start-task.png" width={912} height={584} alt={t('dashboardsHelp.start.shot.alt')} caption={t('dashboardsHelp.start.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.start.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.start.steps" />
    </>),
  },
  {
    id: 'dash-projects', k: 'projects', icon: FolderKanban, show: (v) => v.canStart,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.projects.lead')}</p>
      <Shot src="/help/dashboards/projects.webp" height={900} alt={t('dashboardsHelp.projects.shot.alt')} caption={t('dashboardsHelp.projects.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.projects.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.projects.steps" />
    </>),
  },
  {
    id: 'dash-guide', k: 'guide', icon: Compass, show: () => true,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.guide.lead')}</p>
      <Shot src="/help/user/do-this-now.png" width={670} height={613} alt={t('dashboardsHelp.guide.shot.alt')} caption={t('dashboardsHelp.guide.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.guide.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.guide.steps" />
    </>),
  },
  {
    id: 'dash-reports', k: 'reports', icon: FileText, show: () => true,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.reports.lead')}</p>
      <Shot src="/help/user/answer.png" width={684} height={968} alt={t('dashboardsHelp.reports.shot.alt')} caption={t('dashboardsHelp.reports.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.reports.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.reports.steps" />
    </>),
  },
  {
    id: 'dash-queue', k: 'queue', icon: Inbox, show: (v) => v.showQueue,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.queue.lead')} {v.isWorker ? t('dashboardsHelp.queue.leadWorker') : t('dashboardsHelp.queue.leadMixed')}</p>
      <Shot src="/help/dashboards/queue.webp" height={620} alt={t('dashboardsHelp.queue.shot.alt')} caption={t('dashboardsHelp.queue.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.queue.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.queue.steps" />
    </>),
  },
  {
    id: 'dash-pm', k: 'pm', icon: Briefcase, show: (v) => v.showPm,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.pm.lead')}</p>
      <Shot src="/help/dashboards/pm-dashboard.webp" height={880} alt={t('dashboardsHelp.pm.shot.alt')} caption={t('dashboardsHelp.pm.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.pm.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.pm.steps" />
      <Shot src="/help/dashboards/pm-new-project.webp" height={900} alt={t('dashboardsHelp.pm.shotNew.alt')} caption={t('dashboardsHelp.pm.shotNew.caption')} />
    </>),
  },
  {
    id: 'dash-pm-project', k: 'pmProject', icon: Briefcase, show: (v) => v.showPm,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.pmProject.lead')}</p>
      <Shot src="/help/dashboards/pm-project.webp" height={1250} alt={t('dashboardsHelp.pmProject.shot.alt')} caption={t('dashboardsHelp.pmProject.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.pmProject.assign.h')}</h3>
      <Steps t={t} k="dashboardsHelp.pmProject.assign.steps" />
      <h3 className="sub">{t('dashboardsHelp.pmProject.move.h')}</h3>
      <Steps t={t} k="dashboardsHelp.pmProject.move.steps" />
      <h3 className="sub">{t('dashboardsHelp.pmProject.hold.h')}</h3>
      <Steps t={t} k="dashboardsHelp.pmProject.hold.steps" />
      <Shot src="/help/dashboards/pm-hold.webp" height={900} alt={t('dashboardsHelp.pmProject.shotHold.alt')} caption={t('dashboardsHelp.pmProject.shotHold.caption')} />
      <h3 className="sub">{t('dashboardsHelp.pmProject.productivity.h')}</h3>
      <Steps t={t} k="dashboardsHelp.pmProject.productivity.steps" />
      <Shot src="/help/dashboards/pm-person.webp" height={900} alt={t('dashboardsHelp.pmProject.shotPerson.alt')} caption={t('dashboardsHelp.pmProject.shotPerson.caption')} />
    </>),
  },
  {
    id: 'dash-srpm', k: 'srpm', icon: Users, show: (v) => v.showSrPm,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.srpm.lead')}</p>
      <Shot src="/help/dashboards/srpm.webp" height={1200} alt={t('dashboardsHelp.srpm.shot.alt')} caption={t('dashboardsHelp.srpm.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.srpm.move.h')}</h3>
      <Steps t={t} k="dashboardsHelp.srpm.move.steps" />
      <Shot src="/help/dashboards/srpm-move.webp" height={900} alt={t('dashboardsHelp.srpm.shotMove.alt')} caption={t('dashboardsHelp.srpm.shotMove.caption')} />
      <h3 className="sub">{t('dashboardsHelp.srpm.start.h')}</h3>
      <Steps t={t} k="dashboardsHelp.srpm.start.steps" />
    </>),
  },
  {
    id: 'dash-grc', k: 'grc', icon: ShieldCheck, show: (v) => v.showGrc,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.grc.lead')} {v.readOnly ? t('dashboardsHelp.grc.leadReadOnly') : ''}</p>
      <Shot src="/help/dashboards/grc.webp" height={1150} alt={t('dashboardsHelp.grc.shot.alt')} caption={t('dashboardsHelp.grc.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.grc.risks.h')}</h3>
      <p>{t('dashboardsHelp.grc.risks.lead')}</p>
      <Steps t={t} k="dashboardsHelp.grc.risks.items" ordered={false} />
      <Shot src="/help/dashboards/grc-risks.webp" width={1080} height={600} alt={t('dashboardsHelp.grc.shotRisks.alt')} caption={t('dashboardsHelp.grc.shotRisks.caption')} />
      <h3 className="sub">{t('dashboardsHelp.grc.log.h')}</h3>
      <Steps t={t} k="dashboardsHelp.grc.log.steps" />
    </>),
  },
  {
    // Workflow issues inbox (Teach Wave 3 part C): trainers, PMs, Sr PMs, GRC,
    // company admins and executives (roleViewOf .showIncidents).
    id: 'dash-issues', k: 'issues', icon: Signpost, show: (v) => v.showIncidents,
    body: (v, t) => (<>
      <p>{t('dashboardsHelp.issues.lead')}</p>
      <Shot src="/help/dashboards/workflow-issues.webp" height={1195} alt={t('dashboardsHelp.issues.shot.alt')} caption={t('dashboardsHelp.issues.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.issues.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.issues.steps" />
      <h3 className="sub">{t('dashboardsHelp.issues.adopt.h')}</h3>
      <Steps t={t} k="dashboardsHelp.issues.adopt.steps" />
      <Shot src="/help/dashboards/workflow-issues-adopt.webp" width={740} height={314} alt={t('dashboardsHelp.issues.shotAdopt.alt')} caption={t('dashboardsHelp.issues.shotAdopt.caption')} />
      <p>{t('dashboardsHelp.issues.watch')}</p>
    </>),
  },
  {
    id: 'dash-admin', k: 'admin', icon: UserCog, show: (v) => v.isCompanyAdmin,
    body: (v, t) => (<>
      <p>{t.rich('dashboardsHelp.admin.lead')}</p>
      <Shot src="/help/dashboards/admin-team.webp" height={1250} alt={t('dashboardsHelp.admin.shot.alt')} caption={t('dashboardsHelp.admin.shot.caption')} />
      <h3 className="sub">{t('dashboardsHelp.admin.howTo')}</h3>
      <Steps t={t} k="dashboardsHelp.admin.steps" />
    </>),
  },
]

// The entries the viewer may read, in order.
export function dashboardHelpFor(roleView) {
  const v = roleView || {}
  return DASHBOARD_HELP.filter((s) => { try { return !!s.show(v) } catch { return false } })
}

// The nav label of an entry (Help.jsx builds its section list from this).
export function dashboardHelpLabel(t, entry) { return t('dashboardsHelp.' + entry.k + '.title') }

export default function DashboardsHelp({ roleView }) {
  const t = useT()
  const v = roleView || {}
  return (<>
    {dashboardHelpFor(v).map((s) => (
      <section key={s.id} id={'help-' + s.id}>
        <h2>{dashboardHelpLabel(t, s)}</h2>
        {s.body(v, t)}
      </section>
    ))}
  </>)
}
