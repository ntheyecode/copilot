// ============================================================================
// WorkCoPilot - Workflow issues  (/work/workflow-issues)
// ----------------------------------------------------------------------------
// The one inbox for workflow incidents (Teach Wave 3 part C): moments when a
// teammate running a published workflow met a screen the workflow did not
// expect. It goes to the people who keep workflows right (roleViewOf(user)
// .showIncidents: trainers, PMs, Sr PMs, GRC, company admins, executives) and
// wears the shared `.wka` console like the Teach studio and the executive
// dashboard. Linked from the shell rail (with an unread badge), the Teach
// studio and the executive dashboard card.
//
// URL state: ?state=active|resolved|dismissed|all  ?workflow=<group id>
// ?incident=<id> (opens and scrolls to that row; alerts link here).
// The server enforces every rule; this page consumes src/api.js only.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Signpost, RefreshCw, ArrowLeft, GraduationCap, Info, Check, X, ExternalLink } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { roleViewOf } from '../../../shared/work_roles_options.js'
import { WORKADMIN_CSS, ensureWorkAdminFonts } from '../../workadmin/workadmin.css.js'
import { Loading, ErrorBox, EmptyState } from '../../workadmin/sections/_shared.jsx'
import { INCIDENTS_CSS } from './incidents.css.js'
import { STATE_FILTERS, normalizeFilter, summaryChips, workflowOptions, visibleIncidents, draftHref } from './incidentsModel.js'
import { useWorkflowIncidents } from './useWorkflowIncidents.js'
import IncidentRow from './IncidentRow.jsx'
import IncidentNews from './IncidentNews.jsx'

const scrollTo = (id) => requestAnimationFrame(() => {
  const el = document.getElementById(`wfi-${id}`)
  if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
})

function Shell({ company, showTeach, children }) {
  const t = useT()
  const companyName = (company && company.name) || 'WorkCoPilot'
  return (
    <div className="wka wd-tokens">
      <style>{WORKADMIN_CSS}{INCIDENTS_CSS}</style>
      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand"><b>WorkCoPilot</b><span>{t('wfIssues.brand')}</span></div>
        <div className="wka-top-right">
          {showTeach && <a className="wka-btn sm ghost wfi-top-link" href="/work/teach" title={t('wfIssues.head.teach')}><GraduationCap size={14} /> <span>{t('wfIssues.head.teach')}</span></a>}
          <a className="wka-btn sm ghost wfi-top-link" href="/work" title={t('wfIssues.head.back')}><ArrowLeft size={14} /> <span>{t('wfIssues.head.back')}</span></a>
          <span className="wka-chip">{companyName}</span>
        </div>
      </header>
      <div className="wka-body"><main className="wka-main">{children}</main></div>
    </div>
  )
}

export default function WorkflowIssues() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const [me, setMe] = useState(null)
  const [company, setCompany] = useState(null)
  const [ready, setReady] = useState(false)
  const [openId, setOpenId] = useState(() => params.get('incident') || null)
  const [toast, setToast] = useState(null)          // { msgKey, draftId? }
  const [nowMs, setNowMs] = useState(() => Date.now())
  const handledDeep = useRef('')                    // the ?incident= link already opened
  const [gone, setGone] = useState(false)           // a ?incident= link to an issue that no longer exists

  const filter = normalizeFilter(params.get('state'))
  const wfKey = params.get('workflow') || ''
  const deepId = params.get('incident') || ''

  useEffect(() => { ensureWorkAdminFonts() }, [])
  // Who is looking. A failed check (network, server) is a retry, never the
  // "not for you" gate: only a real answer decides access.
  const [meErr, setMeErr] = useState(false)
  const [meTry, setMeTry] = useState(0)
  useEffect(() => {
    let alive = true
    setMeErr(false)
    api.workMe()
      .then((r) => { if (alive) { setMe((r && r.user) || null); setReady(true) } })
      .catch((e) => { if (!alive) return; if (e && (e.status === 401 || e.status === 403)) { setMe(null); setReady(true) } else setMeErr(true) })
    api.workMyCompany().then((c) => { if (alive) setCompany(c || null) }).catch(() => {})
    return () => { alive = false }
  }, [meTry])
  // Relative times ("5 minutes ago") stay honest while the page is open.
  useEffect(() => { const id = setInterval(() => setNowMs(Date.now()), 60000); return () => clearInterval(id) }, [])

  const roleView = useMemo(() => roleViewOf(me), [me])
  const enabled = ready && roleView.showIncidents
  const { data, loadErr, news, reload, setState, adopt } = useWorkflowIncidents({ enabled, filter })

  // One URL update per change (several keys at once never clobber each other).
  const setParam = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
      return next
    }, { replace: true })
  }, [setParams])

  const list = useMemo(() => visibleIncidents(data && data.incidents, wfKey), [data, wfKey])
  const options = useMemo(() => workflowOptions(data && data.incidents, wfKey), [data, wfKey])

  // An incident deep link (from an alert) opens and scrolls to its row. When it
  // is outside the current filter (already resolved), widen to All once.
  // A link to an issue that is gone (trimmed, purged) says so once and lets go
  // of the URL, so it never pins the filter.
  useEffect(() => {
    if (!deepId || !data || data.filter !== filter || handledDeep.current === deepId) return
    if (data.incidents.some((x) => x.id === deepId)) {
      handledDeep.current = deepId
      setOpenId(deepId)
      scrollTo(deepId)
    } else if (filter !== 'all') setParam({ state: 'all' })
    else {
      handledDeep.current = deepId
      setParam({ incident: '' })
      setGone(true)
    }
  }, [deepId, data, filter, setParam])

  const showIncident = (id) => {
    const here = !!(data && data.incidents.some((x) => x.id === id))
    handledDeep.current = here ? id : ''
    setParam({ workflow: '', incident: id })
    if (here) { setOpenId(id); scrollTo(id) }
  }
  const onDone = (msg) => { setToast(msg); if (!msg.draftId) setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 5000) }

  // ---- gates ---------------------------------------------------------------
  if (meErr) {
    return <Shell company={company}><div className="wfi-content"><ErrorBox error={{ status: 400, message: t('wfIssues.err.load') }} onRetry={() => setMeTry((n) => n + 1)} /></div></Shell>
  }
  if (!ready) return <Shell company={company}><Loading label={t('wfIssues.loading')} /></Shell>
  if (!roleView.showIncidents) {
    return (
      <Shell company={company}>
        <div className="wka-state wfi-scope" role="status">
          <Signpost size={28} style={{ color: 'var(--wka-accent)', marginBottom: 12 }} />
          <div className="big">{t('wfIssues.gate.title')}</div>
          <div className="wfi-scope-body">{t('wfIssues.gate.body')}</div>
          <div className="wfi-scope-actions"><a className="wka-btn primary" href="/work">{t('wfIssues.gate.back')}</a></div>
        </div>
      </Shell>
    )
  }

  const chips = summaryChips(data && data.summary)
  const canManage = !!(data && data.canManage)

  return (
    <Shell company={company} showTeach={roleView.showTeach}>
      <div className="wfi-content">
        <div className="wfi-brandblock">
          <span className="wfi-ikon"><Signpost size={22} /></span>
          <div className="wfi-brand-txt">
            <span className="wfi-eyebrow">{(company && company.name) || 'WorkCoPilot'}</span>
            <h1 className="wka-h1">{t('wfIssues.head.title')}</h1>
          </div>
        </div>
        <p className="wka-sub">{t('wfIssues.head.sub')}</p>

        {data && (
          <ul className="wfi-chips" aria-label={t('wfIssues.summary.aria')}>
            {chips.map((c) => (
              <li key={c.key} className={`wfi-chip wfi-t-${c.tint}`}><b>{c.n}</b> {t(c.key)}</li>
            ))}
          </ul>
        )}

        <div className="wka-toolbar wfi-toolbar">
          <div className="wfi-seg" role="group" aria-label={t('wfIssues.filter.aria')}>
            {STATE_FILTERS.map((f) => (
              <button key={f} type="button" className={`wfi-seg-btn${filter === f ? ' is-on' : ''}`} aria-pressed={filter === f}
                onClick={() => setParam({ state: f === 'active' ? '' : f })}>{t(`wfIssues.filter.${f}`)}</button>
            ))}
          </div>
          {options.length > 1 || wfKey ? (
            <select className="wka-select wfi-wfsel" value={wfKey} aria-label={t('wfIssues.filter.workflowAria')} onChange={(e) => setParam({ workflow: e.target.value })}>
              <option value="">{t('wfIssues.filter.allWorkflows')}</option>
              {options.map((o) => <option key={o.key} value={o.key}>{o.title || t('wfIssues.filter.untitled')}</option>)}
            </select>
          ) : null}
          <span className="wka-spacer" />
          <button type="button" className="wka-btn sm ghost" onClick={reload}><RefreshCw size={13} /> {t('wfIssues.head.refresh')}</button>
        </div>

        {data && !canManage && <p className="wfi-readonly"><Info size={14} /> <span>{t('wfIssues.readOnly')}</span></p>}

        {toast && (
          <div className="wfi-toast" role="status">
            <Check size={15} />
            <span className="wfi-toast-t">{t(toast.msgKey)}</span>
            {toast.draftId && <a className="wka-btn sm" href={draftHref(toast.draftId)}><ExternalLink size={13} /> {t('wfIssues.act.openDraft')}</a>}
            <button type="button" className="wka-btn sm ghost wfi-toast-x" aria-label={t('wfIssues.detail.shotClose')} onClick={() => setToast(null)}><X size={14} /></button>
          </div>
        )}

        {gone && (
          <div className="wfi-readonly" role="status"><Info size={14} /> <span>{t('wfIssues.err.notFound')}</span></div>
        )}

        <IncidentNews alerts={news} nowMs={nowMs} onShow={showIncident} />

        {loadErr && <div style={{ marginBottom: 12 }}><ErrorBox error={{ status: 400, message: t(loadErr) }} onRetry={reload} /></div>}

        {data == null || data.filter !== filter ? (
          loadErr ? null : <Loading label={t('wfIssues.loading')} />
        ) : list.length === 0 ? (
          <div className="wka-panel">
            <EmptyState
              title={filter === 'active' && !wfKey ? t('wfIssues.empty.activeTitle') : t('wfIssues.empty.otherTitle')}
              detail={filter === 'active' && !wfKey ? t('wfIssues.empty.activeDetail') : t('wfIssues.empty.otherDetail')} />
            <div className="wfi-scope-actions" style={{ marginTop: 0, marginBottom: 18 }}>
              {filter === 'active' && !wfKey
                ? (roleView.showTeach && <a className="wka-btn primary" href="/work/teach"><GraduationCap size={14} /> {t('wfIssues.empty.teach')}</a>)
                : <button type="button" className="wka-btn" onClick={() => setParam({ workflow: '', state: 'all' })}>{t('wfIssues.empty.showAll')}</button>}
            </div>
          </div>
        ) : (
          <div className="wfi-rows">
            {list.map((x) => (
              <IncidentRow key={x.id} incident={x} open={openId === x.id} nowMs={nowMs} canManage={canManage}
                onToggle={() => setOpenId(openId === x.id ? null : x.id)}
                onSetState={setState} onAdopt={adopt} onDone={onDone} canOpenDraft={roleView.showTeach} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
