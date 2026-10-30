// "Company workflows" on the work dashboard (Wave 3 part B, employee side): the
// step-by-step guides the company's trainers published, as compact rows anyone in
// the company can run (members, project managers, trainers, executives, admins,
// and worker-flow members, who have no Start but may run a published workflow).
// Search and a category filter appear once the list is long; a short list stays
// a short list. The empty state says where these come from, and offers the Teach
// studio to the people who can publish one.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Search, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { useWorkApp } from '../WorkAppContext.jsx'
import { PJ_CSS } from '../projects/projects.css.js'
import { EP_CSS } from '../pm/ep.css.js'
import { CW_CSS } from './workflows.css.js'
import { useCompanyWorkflows } from './useCompanyWorkflows.js'
import { categoriesOf, filterRows, COMPACT_LIMIT, SEARCH_FROM } from './runWorkflowModel.js'
import WorkflowRunRow from './WorkflowRunRow.jsx'

export default function CompanyWorkflows() {
  const t = useT()
  const { user, roleView } = useWorkApp()
  const inCompany = !!(user && user.companyId)
  const { rows, loaded, err, hidden, reload } = useCompanyWorkflows(inCompany)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [all, setAll] = useState(false)
  const cats = useMemo(() => categoriesOf(rows), [rows])
  // Search and the filter apply only while their controls are on screen, so a
  // list that shrank after a refresh can never stay filtered by a hidden value.
  const showSearch = rows.length >= SEARCH_FROM
  const showCats = showSearch && cats.length > 1
  const qOn = showSearch ? q : ''
  const catOn = showCats && cats.includes(category) ? category : ''
  const matches = useMemo(() => filterRows(rows, { q: qOn, category: catOn }), [rows, qOn, catOn])
  if (!inCompany || hidden) return null

  const searching = !!(qOn.trim() || catOn)
  const shown = all || searching ? matches : matches.slice(0, COMPACT_LIMIT)
  const canPublish = !!(roleView && roleView.showTeach)

  let body
  if (!loaded) {
    body = <div className="wd-ep-queue">{[0, 1].map((i) => <div key={i} className="wd-skel"><i className="w1" /><i className="w2" /></div>)}</div>
  } else if (err) {
    body = (
      <div className="wd-empty" role="alert">
        <span className="ic"><AlertTriangle size={18} aria-hidden /></span>
        <div><b>{t('workDashboard.workflows.loadErrTitle')}</b><p>{t('workDashboard.workflows.loadErr')} <button type="button" className="wd-cw-act" onClick={reload}>{t('workDashboard.workflows.retry')}</button></p></div>
      </div>
    )
  } else if (rows.length === 0) {
    body = (
      <div className="wd-empty">
        <span className="ic"><GraduationCap size={18} /></span>
        <div>
          <b>{t('workDashboard.workflows.emptyTitle')}</b>
          <p>{canPublish ? t('workDashboard.workflows.emptyBodyTrainer') : t('workDashboard.workflows.emptyBody')}</p>
          {canPublish && <Link className="wd-ep-q-more" to="/work/teach">{t('workDashboard.workflows.openTeach')} <ArrowRight size={14} /></Link>}
        </div>
      </div>
    )
  } else {
    body = (
      <>
        {showSearch && (
          <div className="wd-cw-tools" role="search">
            <label className="wd-cw-search">
              <Search size={15} aria-hidden />
              <input className="wd-pj-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t('workDashboard.workflows.searchPh')} aria-label={t('workDashboard.workflows.searchPh')} />
            </label>
            {showCats && (
              <select className="wd-pj-input wd-cw-cat" value={catOn} onChange={(e) => setCategory(e.target.value)} aria-label={t('workDashboard.workflows.categoryAria')}>
                <option value="">{t('workDashboard.workflows.allCategories')}</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        )}
        {matches.length === 0
          ? <p className="wd-cw-none" role="status">{t('workDashboard.workflows.noMatch')}</p>
          : <div className="wd-ep-queue" id="wd-cw-list">{shown.map((r) => <WorkflowRunRow key={r.id} row={r} onStale={reload} />)}</div>}
        {!searching && matches.length > COMPACT_LIMIT && (
          <button type="button" className="wd-ep-q-more wd-cw-more" aria-expanded={all} aria-controls="wd-cw-list" onClick={() => setAll((a) => !a)}>
            {all ? t('workDashboard.workflows.showFewer') : t.n('workDashboard.workflows.showAll', matches.length, { n: matches.length })}
            <ChevronDown size={14} className={all ? 'up' : ''} />
          </button>
        )}
      </>
    )
  }

  return (
    <section className="wd-ep wd-cw" id="wd-workflows" aria-label={t('workDashboard.workflows.heading')} style={{ marginTop: 'var(--sp-6)' }}>
      <style>{PJ_CSS}{EP_CSS}{CW_CSS}</style>
      <div className="wd-sec">
        <span className="wd-ic alt"><GraduationCap size={16} /></span>
        <div><h2>{t('workDashboard.workflows.heading')}</h2><p>{t('workDashboard.workflows.sub')}</p></div>
      </div>
      {body}
    </section>
  )
}
