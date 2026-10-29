// ============================================================================
// WorkCoPilot - Teach studio  (/work/teach)
// ----------------------------------------------------------------------------
// Where a trainer (the additive trainer grant) or a company admin records and
// authors the guided workflows their teammates are then walked through. It wears
// the shared company-admin `.wka` design system (the platform gold standard),
// self-gates on roleView.showTeach (the server enforces every author action), and
// is guided and context-aware: a workflow list collapsed to expandable rows, and
// a five-phase authoring wizard with inline reflections and validation.
//
// In Wave 1 steps are authored by hand (no screen capture yet). Nothing here
// changes backend logic; it consumes src/api.js workflow* calls only.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GraduationCap, Plus, RefreshCw, Building2, Check } from 'lucide-react'
import { api, friendlyError } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { roleViewOf } from '../../../shared/work_roles_options.js'
import { WORKADMIN_CSS, ensureWorkAdminFonts } from '../../workadmin/workadmin.css.js'
import { Loading, ErrorBox, EmptyState } from '../../workadmin/sections/_shared.jsx'
import { TEACH_CSS } from './teach.css.js'
import WorkflowList from './WorkflowList.jsx'
import WorkflowWizard from './WorkflowWizard.jsx'

// The shared `.wka` shell (top bar + main), same frame as the exec dashboard.
function Shell({ company, children }) {
  const t = useT()
  const companyName = (company && company.name) || 'WorkCoPilot'
  return (
    <div className="wka wd-tokens">
      <style>{WORKADMIN_CSS}{TEACH_CSS}</style>
      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand"><b>WorkCoPilot</b><span>{t('teach.brand.studio')}</span></div>
        <div className="wka-top-right"><span className="wka-chip">{companyName}</span></div>
      </header>
      <div className="wka-body"><main className="wka-main">{children}</main></div>
    </div>
  )
}

export default function TeachStudio() {
  const t = useT()
  const [me, setMe] = useState(null)
  const [company, setCompany] = useState(null)
  const [ready, setReady] = useState(false)
  const [workflows, setWorkflows] = useState(null)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState('list')            // 'list' | 'wizard'
  const [editing, setEditing] = useState(null)        // workflow record being edited, or null for new
  const [ok, setOk] = useState('')

  useEffect(() => { ensureWorkAdminFonts() }, [])

  // Identity + branding first, so the page can gate before it loads data.
  useEffect(() => {
    let alive = true
    api.workMe().then((r) => { if (alive) { setMe((r && r.user) || null); setReady(true) } }).catch(() => { if (alive) setReady(true) })
    api.workMyCompany().then((c) => { if (alive) setCompany(c || null) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const roleView = useMemo(() => roleViewOf(me), [me])

  const load = useCallback(() => {
    setErr('')
    api.workflowsList()
      .then((r) => setWorkflows((r && r.workflows) || []))
      .catch((e) => { setErr(friendlyError(e, t('teach.errLoad'))); setWorkflows([]) })
  }, [t])

  // Load the list once we know the viewer may teach.
  useEffect(() => { if (ready && roleView.showTeach) load() }, [ready, roleView.showTeach, load])

  const toast = (msg) => { setOk(msg); setTimeout(() => setOk(''), 4000) }
  const startNew = () => { setEditing(null); setMode('wizard') }
  const startEdit = (wf) => { setEditing(wf); setMode('wizard') }
  const onSaved = ({ action }) => {
    setMode('list'); setEditing(null); load()
    toast(action === 'publish' ? t('teach.wizard.publishedOk') : t('teach.wizard.draftSavedOk'))
  }
  const onCancel = () => { setMode('list'); setEditing(null) }

  // ---- gates ---------------------------------------------------------------
  if (!ready) return <Shell company={company}><Loading label={t('teach.loading')} /></Shell>

  // Not a trainer and not a company admin: an actionable state, never a dead end.
  if (!roleView.showTeach) {
    return (
      <Shell company={company}>
        <div className="wka-state tch-scope" role="status">
          <GraduationCap size={28} style={{ color: 'var(--wka-accent)', marginBottom: 12 }} />
          <div className="big">{t('teach.gate.title')}</div>
          <div style={{ marginTop: 6, color: 'var(--wka-muted)', fontSize: 14, lineHeight: 1.6 }}>{t('teach.gate.body')}</div>
          <div className="tch-scope-actions"><a className="wka-btn primary" href="/work">{t('teach.gate.back')}</a></div>
        </div>
      </Shell>
    )
  }

  const counts = (() => {
    const list = workflows || []
    return {
      published: list.filter((w) => w.state === 'published').length,
      draft: list.filter((w) => w.state === 'draft').length,
      retired: list.filter((w) => w.state === 'retired').length,
    }
  })()

  return (
    <Shell company={company}>
      <div className="tch-content">
        <div className="tch-brandblock">
          <span className="tch-ikon"><GraduationCap size={22} /></span>
          <div className="tch-brand-txt">
            <span className="tch-eyebrow">{(company && company.name) || 'WorkCoPilot'}</span>
            <h1 className="wka-h1">{t('teach.head.title')}</h1>
          </div>
        </div>
        <p className="wka-sub">{t('teach.head.sub')}</p>

        {mode === 'wizard' ? (
          <WorkflowWizard initial={editing} onCancel={onCancel} onSaved={onSaved} />
        ) : (
          <>
            <div className="wka-toolbar">
              <button type="button" className="wka-btn primary" onClick={startNew}><Plus size={14} /> {t('teach.list.newWorkflow')}</button>
              <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> {t('teach.list.refresh')}</button>
              <span className="wka-spacer" />
              {workflows && workflows.length > 0 && (
                <span className="tch-counts">
                  <span className="tch-count"><b>{counts.published}</b> {t('teach.list.cPublished')}</span>
                  <span className="tch-count"><b>{counts.draft}</b> {t('teach.list.cDraft')}</span>
                  {counts.retired > 0 && <span className="tch-count"><b>{counts.retired}</b> {t('teach.list.cRetired')}</span>}
                </span>
              )}
            </div>

            {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
            {err && <div style={{ marginBottom: 12 }}><ErrorBox error={{ status: 400, message: err }} onRetry={load} /></div>}

            {workflows == null ? (
              <Loading label={t('teach.list.loading')} />
            ) : workflows.length === 0 ? (
              <EmptyState title={t('teach.list.emptyTitle')} detail={t('teach.list.emptyDetail')} />
            ) : (
              <WorkflowList workflows={workflows} onEdit={startEdit} onChanged={load} onToast={toast} />
            )}
          </>
        )}
      </div>
    </Shell>
  )
}
