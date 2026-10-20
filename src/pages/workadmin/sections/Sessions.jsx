// Sessions: recent WorkCoPilot sessions across all users (read-only).
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

function statusBadge(s) {
  if (s.status === 'ended') return <span className="wka-badge ended">Ended</span>
  if (s.paused) return <span className="wka-badge paused">Paused</span>
  return <span className="wka-badge active">Active</span>
}

function Progress({ done, total, current }) {
  if (!total) return <span style={{ color: 'var(--wka-faint)' }}>No steps yet</span>
  const pct = Math.min(100, Math.round((done / total) * 100))
  return (
    <div style={{ minWidth: 150 }}>
      <div className="wka-mono" style={{ fontSize: 12, marginBottom: 4 }}>
        Step {Math.min(current + 1, total)} of {total} - {done} done
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--wka-line-2)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--wka-cyan), var(--wka-emerald))' }} />
      </div>
    </div>
  )
}

export default function Sessions() {
  const [state, setState] = useState({ loading: true, error: null, sessions: [], total: 0 })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.sessions(200)
      setState({ loading: false, error: null, sessions: data.sessions || [], total: data.total || 0 })
    } catch (error) {
      if (!isRefresh) setState({ loading: false, error, sessions: [], total: 0 })
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.sessions
    return state.sessions.filter((s) =>
      (s.username || '').toLowerCase().includes(q) ||
      (s.goal || '').toLowerCase().includes(q) ||
      (s.title || '').toLowerCase().includes(q))
  }, [state.sessions, query])

  if (state.loading) return <Loading label="Loading sessions" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  return (
    <div>
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search user, goal or title"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh
        </button>
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>
          Showing {rows.length} of {state.total}{state.total > state.sessions.length ? ` (latest ${state.sessions.length})` : ''}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No sessions" detail={query ? 'Try a different search.' : 'No WorkCoPilot sessions have been started yet.'} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">User</th>
                <th className="no-sort">Goal</th>
                <th className="no-sort">Progress</th>
                <th className="no-sort">Started</th>
                <th className="no-sort">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.username}</td>
                  <td style={{ maxWidth: 360 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.goal || s.title || ''}>
                      {s.goal || s.title || <span style={{ color: 'var(--wka-faint)' }}>No goal set</span>}
                    </div>
                  </td>
                  <td><Progress done={s.stepDone} total={s.stepTotal} current={s.currentStep} /></td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(s.startedAt)}</td>
                  <td>{statusBadge(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
