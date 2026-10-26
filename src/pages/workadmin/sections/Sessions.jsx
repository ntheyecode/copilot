// Sessions: guided sessions across all users. LIVE float to the top; paginated
// (only one small page is kept in the browser at a time); last 7 days only (older
// ones auto-expire from the database). Click "View" for the rich detail: progress,
// premium calls, round-robins, refinements, remaining minutes, cost. Each row can
// be deleted (reason required + logged).
import React, { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Eye, Trash2, Activity } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

const money = (n) => ((n || 0) > 0 ? ((n || 0) < 0.01 ? '<$0.01' : '$' + (n || 0).toFixed(2)) : '-')

function statusBadge(s, t) {
  if (s.live) return <span className="wka-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Activity size={11} /> {t('sessionsAdmin.statusLive')}</span>
  if (s.status === 'ended') return <span className="wka-badge ended">{t('sessionsAdmin.statusEnded')}</span>
  if (s.paused) return <span className="wka-badge paused">{t('sessionsAdmin.statusPaused')}</span>
  return <span className="wka-badge active">{t('sessionsAdmin.statusActive')}</span>
}

function Progress({ done, total, current, t }) {
  if (!total) return <span style={{ color: 'var(--wka-faint)' }}>{t('sessionsAdmin.noSteps')}</span>
  const pct = Math.min(100, Math.round((done / total) * 100))
  return (
    <div style={{ minWidth: 150 }}>
      <div className="wka-mono" style={{ fontSize: 12, marginBottom: 4 }}>
        {t('sessionsAdmin.progressStep', { current: Math.min((current || 0) + 1, total), total, done })}
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--wka-line-2)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--wka-cyan), var(--wka-emerald))' }} />
      </div>
    </div>
  )
}

// Rich click-through: the full telemetry for ONE session. Cost and model-mix
// stats (premium calls, round-robins, estimated cost) are superadmin-only -
// model names and AI cost are a superadmin-only business rule (owner 2026-10-23).
function DetailModal({ id, onClose, isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, d: null })
  useEffect(() => {
    let alive = true
    workAdminApi.sessionDetail(id)
      .then((d) => { if (alive) setState({ loading: false, error: null, d }) })
      .catch((error) => { if (alive) setState({ loading: false, error, d: null }) })
    return () => { alive = false }
  }, [id])
  const d = state.d
  const Stat = ({ label, value, hint }) => (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--wka-line-2, #f3f5f8)', minWidth: 110 }}>
      <div style={{ fontSize: 11, color: 'var(--wka-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{hint}</div> : null}
    </div>
  )
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="wka-panel" style={{ maxWidth: 620, width: '100%', maxHeight: '88vh', overflowY: 'auto' }}>
        {state.loading ? <Loading label={t('sessionsAdmin.loadingSession')} /> : state.error ? <ErrorBox error={state.error} /> : d ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h2 style={{ margin: 0 }}>{d.username}{d.displayName ? ` (${d.displayName})` : ''}</h2>
              {statusBadge(d, t)}
            </div>
            <p className="desc" style={{ marginTop: 6 }}>{d.goal || d.title || t('sessionsAdmin.noGoalSet')}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '12px 0' }}>
              <Stat label={t('sessionsAdmin.statCalls')} value={d.calls} hint={t('sessionsAdmin.statCallsHint')} />
              {isSuperAdmin ? <Stat label={t('sessionsAdmin.statPremium')} value={d.premiumCalls} hint={t('sessionsAdmin.statPremiumHint')} /> : null}
              {isSuperAdmin ? <Stat label={t('sessionsAdmin.statRoundRobins')} value={d.roundRobins} hint={t('sessionsAdmin.statRoundRobinsHint')} /> : null}
              <Stat label={t('sessionsAdmin.statRefinements')} value={d.refinements} hint={t('sessionsAdmin.statRefinementsHint')} />
              <Stat label={t('sessionsAdmin.statMinsLeft')} value={d.remainingMinutes == null ? '-' : d.remainingMinutes} hint={t('sessionsAdmin.statMinsLeftHint')} />
              {isSuperAdmin ? <Stat label={t('sessionsAdmin.estCost')} value={money(d.costUsd)} /> : null}
            </div>

            <div style={{ margin: '8px 0 14px' }}>
              <Progress done={d.progress.done} total={d.progress.total} current={d.progress.currentIndex} t={t} />
              {d.progress.currentStep ? (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--wka-muted)' }}>{t('sessionsAdmin.currentlyOn')} </span>{d.progress.currentStep}
                </div>
              ) : null}
            </div>

            {d.byKind && Object.keys(d.byKind).length ? (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--wka-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{t('sessionsAdmin.callsByKind')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(d.byKind).map(([k, n]) => (
                    <span key={k} className="wka-badge" style={{ background: 'var(--wka-line-2,#eef1f5)' }}>{k}: {n}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="wka-mono" style={{ fontSize: 12, color: 'var(--wka-muted)', lineHeight: 1.7 }}>
              <div>{t('sessionsAdmin.tierLabel')} {d.tier || '-'}{d.companyId ? ` ${t('sessionsAdmin.company')}` : ''}</div>
              <div>{t('sessionsAdmin.startedLabel')} {fmtDateTime(d.startedAt)}</div>
              <div>{t('sessionsAdmin.lastActivityLabel')} {fmtDateTime(d.lastActivityAt)}{d.idleSeconds != null ? ` ${t('sessionsAdmin.idleSuffix', { n: d.idleSeconds })}` : ''}</div>
              {d.lastCallAt ? <div>{t('sessionsAdmin.lastCallLabel')} {fmtDateTime(d.lastCallAt)}</div> : null}
              {d.endedAt ? <div>{t('sessionsAdmin.endedLabel')} {fmtDateTime(d.endedAt)}</div> : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="wka-btn sm ghost" onClick={onClose}>{t('sessionsAdmin.close')}</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function Sessions({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, sessions: [], total: 0, liveCount: 0, windowDays: 7 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)   // keep only a small page in the browser at a time
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [viewId, setViewId] = useState(null)
  const [del, setDel] = useState(null)       // session row pending delete
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState(null)

  const load = useCallback(async (p, isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.sessions(p, pageSize)
      setState({ loading: false, error: null, sessions: data.sessions || [], total: data.total || 0, liveCount: data.liveCount || 0, windowDays: data.windowDays || 7 })
    } catch (error) {
      if (!isRefresh) setState((s) => ({ ...s, loading: false, error }))
    } finally { setRefreshing(false) }
  }, [pageSize])

  useEffect(() => { load(page, false) }, [load, page])

  const confirmDelete = async (reason) => {
    setDelBusy(true); setDelErr(null)
    try {
      await workAdminApi.deleteSession(del.id, reason)
      setDel(null)
      load(page, true)
    } catch (e) { setDelErr(e) } finally { setDelBusy(false) }
  }

  const q = query.trim().toLowerCase()
  const rows = !q ? state.sessions : state.sessions.filter((s) =>
    (s.username || '').toLowerCase().includes(q) || (s.goal || '').toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q))
  const totalPages = Math.max(1, Math.ceil(state.total / pageSize))

  if (state.loading) return <Loading label={t('sessionsAdmin.loadingSessions')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(page, false)} />

  return (
    <div>
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 320 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('sessionsAdmin.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(page, true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('sessionsAdmin.refresh')}
        </button>
        <span className="wka-badge active"><Activity size={11} /> {t('sessionsAdmin.liveCount', { n: state.liveCount })}</span>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>
          {t('sessionsAdmin.windowSummary', { total: state.total, days: state.windowDays })}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('sessionsAdmin.emptyTitle')} detail={q ? t('sessionsAdmin.emptySearchDetail') : t('sessionsAdmin.emptyDetail')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">{t('sessionsAdmin.colUser')}</th>
                <th className="no-sort">{t('sessionsAdmin.colGoal')}</th>
                <th className="no-sort">{t('sessionsAdmin.colProgress')}</th>
                <th className="no-sort">{t('sessionsAdmin.colStarted')}</th>
                <th className="no-sort">{t('sessionsAdmin.colStatus')}</th>
                {isSuperAdmin ? <th className="no-sort" title={t('sessionsAdmin.estCostTitle')}>{t('sessionsAdmin.estCost')}</th> : null}
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} style={s.live ? { background: 'color-mix(in srgb, var(--wka-emerald) 5%, transparent)' } : undefined}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.username}</td>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.goal || s.title || ''}>
                      {s.goal || s.title || <span style={{ color: 'var(--wka-faint)' }}>{t('sessionsAdmin.noGoalSet')}</span>}
                    </div>
                  </td>
                  <td><Progress done={s.stepDone} total={s.stepTotal} current={s.currentStep} t={t} /></td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(s.startedAt)}</td>
                  <td>{statusBadge(s, t)}</td>
                  {isSuperAdmin ? <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{money(s.costUsd)}</td> : null}
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="wka-btn sm ghost" onClick={() => setViewId(s.id)} title={t('sessionsAdmin.viewTitle')}><Eye size={13} /> {t('sessionsAdmin.view')}</button>
                    <button type="button" className="wka-btn sm ghost" onClick={() => { setDelErr(null); setDel(s) }} title={t('sessionsAdmin.deleteRecordTitle')} style={{ marginLeft: 6, color: 'var(--wka-red)' }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
          <button type="button" className="wka-btn sm ghost" disabled={page <= 1 || refreshing} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('sessionsAdmin.previous')}</button>
          <span style={{ fontSize: 12.5, color: 'var(--wka-muted)' }}>{t('sessionsAdmin.pageOf', { page, total: totalPages })}</span>
          <button type="button" className="wka-btn sm ghost" disabled={page >= totalPages || refreshing} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('sessionsAdmin.next')}</button>
        </div>
      ) : null}

      {viewId ? <DetailModal id={viewId} onClose={() => setViewId(null)} isSuperAdmin={isSuperAdmin} /> : null}
      {del ? (
        <ReasonModal
          title={t('sessionsAdmin.deleteTitle')}
          message={t('sessionsAdmin.deleteMessage', { user: del.username, title: del.goal || del.title || t('sessionsAdmin.untitled') })}
          confirmLabel={t('sessionsAdmin.deleteConfirm')}
          busy={delBusy} error={delErr}
          onConfirm={confirmDelete}
          onCancel={() => { if (!delBusy) setDel(null) }}
        />
      ) : null}
    </div>
  )
}
