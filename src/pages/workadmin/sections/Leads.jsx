// Leads: the public "Validate it live" captures across marketing + sign-in.
// Append-only log - newest first - with the contact details, the page it came
// from, the first scenario the visitor validated, and the date/time. Superadmin
// only (gated server-side). Searchable + CSV export.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw, Download } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

function sourceBadge(s) {
  const k = String(s || 'site').toLowerCase()
  const label = k === 'marketing' ? 'Demo page' : k === 'login' ? 'Sign-in' : (k.charAt(0).toUpperCase() + k.slice(1))
  return <span className={`wka-badge ${k === 'marketing' ? 'active' : k === 'login' ? 'paused' : ''}`}>{label}</span>
}

function toCsv(rows) {
  const head = ['First name', 'Last name', 'Email', 'Phone', 'Company', 'Source', 'Scenario', 'Captured']
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = [head.join(',')]
  for (const r of rows) {
    lines.push([r.firstName, r.lastName, r.email, r.phone, r.company, r.source, r.scenario, r.createdAt].map(esc).join(','))
  }
  return lines.join('\n')
}

export default function Leads() {
  const [state, setState] = useState({ loading: true, error: null, leads: [], total: 0 })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.leads(2000)
      setState({ loading: false, error: null, leads: data.leads || [], total: data.total || 0 })
    } catch (error) {
      if (!isRefresh) setState({ loading: false, error, leads: [], total: 0 })
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.leads
    return state.leads.filter((l) =>
      (l.firstName || '').toLowerCase().includes(q) ||
      (l.lastName || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.scenario || '').toLowerCase().includes(q))
  }, [state.leads, query])

  const exportCsv = () => {
    try {
      const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `workcopilot-leads-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch { /* download blocked */ }
  }

  if (state.loading) return <Loading label="Loading leads" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  return (
    <div>
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search name, email, company or scenario"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh
        </button>
        <button type="button" className="wka-btn sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={13} /> Export CSV
        </button>
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>
          Showing {rows.length} of {state.total}{state.total > state.leads.length ? ` (latest ${state.leads.length})` : ''}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No leads yet" detail={query ? 'Try a different search.' : 'When visitors run a live validation, their details appear here.'} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">Name</th>
                <th className="no-sort">Email</th>
                <th className="no-sort">Phone</th>
                <th className="no-sort">Company</th>
                <th className="no-sort">From</th>
                <th className="no-sort">Scenario validated</th>
                <th className="no-sort">Captured</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{`${l.firstName || ''} ${l.lastName || ''}`.trim() || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><a href={`mailto:${l.email}`} style={{ color: 'var(--wka-cyan)' }}>{l.email}</a></td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{l.phone || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{l.company || '-'}</td>
                  <td>{sourceBadge(l.source)}</td>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.scenario || ''}>
                      {l.scenario || <span style={{ color: 'var(--wka-faint)' }}>—</span>}
                    </div>
                  </td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
