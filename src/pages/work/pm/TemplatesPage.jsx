// /work/templates: project templates (team projects, Model B). One primary
// action (New template), then one card per template: name, goal, task count,
// how many people it is assigned to, created date, Assign and Progress. A GRC
// reader sees the same list read-only (no New, no Assign). Thin page; the
// create and assign dialogs and the roll-up are their own modules (SUPREME XV).
// Strings: workPm.templates.*; styles: projects.css.js + ep.css.js.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutTemplate, Plus, ListChecks, Users, CalendarDays, UserPlus, BarChart3, UserRound } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from './ep.css.js'
import { usePeople } from './usePm.js'
import { useTemplates } from './useTemplates.js'
import { templateCounts, fmtShortDate } from './templatesModel.js'
import NewTemplate from './NewTemplate.jsx'
import AssignTemplate from './AssignTemplate.jsx'
import RoleGate, { LoadError } from './RoleGate.jsx'

export function TemplateCard({ tpl, canManage, onAssign }) {
  const t = useT()
  const c = templateCounts(tpl)
  const to = `/work/templates/${encodeURIComponent(tpl.id)}`
  return (
    <div className="wd-card wd-pj-card wd-ep-tpl" style={{ cursor: 'default' }}>
      <div className="wd-pj-card-top">
        <span className="wd-pj-chip"><ListChecks size={12} /> {t.n('workPm.templates.tasks', c.taskCount, { n: c.taskCount })}</span>
        <span className={`wd-pj-chip${c.assignedCount > 0 ? ' active' : ''}`}><Users size={12} /> {c.assignedCount > 0 ? t.n('workPm.templates.assigned', c.assignedCount, { n: c.assignedCount }) : t('workPm.templates.notAssigned')}</span>
      </div>
      <Link to={to} className="wd-pj-card-t" title={tpl.name} style={{ textDecoration: 'none' }}>{tpl.name}</Link>
      {tpl.goal && <div className="wd-pj-card-g">{tpl.goal}</div>}
      <div className="wd-ep-card-meta">
        {tpl.createdAt && <span><CalendarDays size={12} /> {t('workPm.templates.created', { date: fmtShortDate(tpl.createdAt) })}</span>}
      </div>
      <div className="wd-pj-card-foot wd-ep-tpl-foot">
        {canManage && <button type="button" className="wd-pj-btn" onClick={() => onAssign(tpl)}><UserPlus size={13} /> {t('workPm.templates.assign')}</button>}
        <Link to={to} className="wd-pj-card-open"><BarChart3 size={13} /> {t('workPm.templates.progress')}</Link>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const t = useT()
  const { user, roleView } = useWorkApp()
  const { templates, loaded, err, reload } = useTemplates(roleView.showTemplates)
  const { people, nameOf, denied } = usePeople({ me: user, fallback: (id) => t('workPm.common.person', { id }) })
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState(null)   // template
  const canManage = roleView.canManageTemplates

  return (
    <RoleGate allowed={roleView.showTemplates}>
    <div className="wd-ep">
      <style>{PJ_CSS}{EP_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic alt"><LayoutTemplate size={17} /></span>
        <div>
          <h2>{t('workPm.templates.heading')}{loaded && !err && templates.length > 0 && <span className="wd-sec-count">{templates.length}</span>}</h2>
          <p>{canManage ? t('workPm.templates.sub') : t('workPm.templates.subReadOnly')}</p>
        </div>
        {canManage && (
          <button type="button" className="wd-cta wd-ep-head-act" onClick={() => setCreating(true)} disabled={!loaded}><Plus size={16} /> <span className="full">{t('workPm.templates.newTemplate')}</span><span className="short">{t('workPm.templates.newShort')}</span></button>
        )}
      </div>
      {canManage && denied && <div className="wd-ep-note"><UserRound size={14} /> <span>{t('workPm.common.peopleDenied')}</span></div>}

      {!loaded ? (
        <div className="wd-ep-grid" aria-hidden>{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w3" /><i className="w2" /></div>)}</div>
      ) : err ? (
        <LoadError title={t('workPm.templates.errTitle')} denied={err === 'denied'} onRetry={reload} />
      ) : templates.length === 0 ? (
        <div className="wd-empty">
          <span className="ic"><LayoutTemplate size={18} /></span>
          <div><b>{t('workPm.templates.emptyTitle')}</b><p>{t('workPm.templates.emptyBody')}</p></div>
        </div>
      ) : (
        <div className="wd-ep-grid">
          {templates.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} canManage={canManage} onAssign={setAssigning} />)}
        </div>
      )}

      {creating && <NewTemplate onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload() }} />}
      {assigning && <AssignTemplate template={assigning} people={people} nameOf={nameOf} onClose={() => setAssigning(null)} onAssigned={() => reload()} />}
    </div>
    </RoleGate>
  )
}
