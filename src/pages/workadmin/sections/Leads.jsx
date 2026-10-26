// Leads: the public "Validate it live" captures across marketing + sign-in.
// Append-only log - newest first - with the contact details, the page it came
// from, the first scenario the visitor validated, and the date/time. Superadmin
// only (gated server-side). Searchable + CSV export.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw, Download, Trash2, ChevronRight, ChevronDown, Bot } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

function sourceBadge(s) {
  const k = String(s || 'site').toLowerCase()
  const label = k === 'marketing' ? 'Demo page' : k === 'login' ? 'Sign-in' : (k.charAt(0).toUpperCase() + k.slice(1))
  return <span className={`wka-badge ${k === 'marketing' ? 'active' : k === 'login' ? 'paused' : ''}`}>{label}</span>
}

// Every live-validation query + AI answer, newest first. New captures carry a
// searches[] log; older leads only have the single legacy `scenario` string, so
// present that as a one-entry log (no stored answer) - one display path for both.
function leadSearches(l) {
  if (Array.isArray(l.searches) && l.searches.length) return l.searches
  if (l.scenario) return [{ at: l.createdAt, query: l.scenario, response: '' }]
  return []
}

function toCsv(rows) {
  const head = ['First name', 'Last name', 'Email', 'Phone', 'Company', 'Source', 'Scenario', 'Captured']
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = [head.join(',')]
  for (const r of rows) {
    const latest = (leadSearches(r)[0] || {}).query || ''
    lines.push([r.firstName, r.lastName, r.email, r.phone, r.company, r.source, latest, r.createdAt].map(esc).join(','))
  }
  return lines.join('\n')
}

export default function Leads() {
  const [state, setState] = useState({ loading: true, error: null, leads: [], total: 0 })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)   // { type: 'one'|'all', row }
  const [mBusy, setMBusy] = useState(false)
  const [mErr, setMErr] = useState(null)
  const [open, setOpen] = useState(() => new Set())   // lead ids with their search log expanded
  const toggle = (id) => setOpen((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

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

  const confirmModal = async (reason) => {
    setMBusy(true); setMErr(null)
    try {
      if (modal.type === 'all') await workAdminApi.clearLeads(reason)
      else await workAdminApi.deleteLead(modal.row.id, reason)
      setModal(null)
      load(true)
    } catch (e) { setMErr(e) } finally { setMBusy(false) }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.leads
    return state.leads.filter((l) =>
      (l.firstName || '').toLowerCase().includes(q) ||
      (l.lastName || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      leadSearches(l).some((s) => (s.query || '').toLowerCase().includes(q)))
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
        <button type="button" className="wka-btn sm ghost" onClick={() => { setMErr(null); setModal({ type: 'all' }) }} disabled={state.leads.length === 0} style={{ color: 'var(--wka-red)' }}>
          <Trash2 size={13} /> Clear all
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>
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
                <th className="no-sort">Validated (what they searched)</th>
                <th className="no-sort">Captured</th>
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const searches = leadSearches(l)
                const latest = searches[0]
                const isOpen = open.has(l.id)
                const more = searches.length
                return (
                  <React.Fragment key={l.id}>
                    <tr>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{`${l.firstName || ''} ${l.lastName || ''}`.trim() || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><a href={`mailto:${l.email}`} style={{ color: 'var(--wka-cyan)' }}>{l.email}</a></td>
                      <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{l.phone || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{l.company || '-'}</td>
                      <td>{sourceBadge(l.source)}</td>
                      <td style={{ maxWidth: 340 }}>
                        {more === 0 ? (
                          <span style={{ color: 'var(--wka-faint)' }}>None yet</span>
                        ) : (
                          <button type="button" onClick={() => toggle(l.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textAlign: 'left' }}
                            title={isOpen ? 'Hide searches' : 'Show all searches and answers'}>
                            {isOpen ? <ChevronDown size={14} style={{ flex: '0 0 auto', color: 'var(--wka-cyan)' }} /> : <ChevronRight size={14} style={{ flex: '0 0 auto', color: 'var(--wka-cyan)' }} />}
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latest.query}</span>
                            {more > 1 ? <span className="wka-badge" style={{ flex: '0 0 auto' }}>{more}</span> : null}
                          </button>
                        )}
                      </td>
                      <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="wka-btn sm ghost" title="Delete lead" style={{ color: 'var(--wka-red)' }} onClick={() => { setMErr(null); setModal({ type: 'one', row: l }) }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                    {isOpen && more > 0 ? (
                      <tr>
                        <td colSpan={8} style={{ background: 'var(--wka-bg-2)', padding: '4px 14px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
                            {searches.map((s, i) => (
                              <div key={i} style={{ border: '1px solid var(--wka-line)', borderRadius: 10, padding: '10px 12px', background: 'var(--wka-panel)' }}>
                                <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginBottom: 6 }}>{fmtDateTime(s.at)}</div>
                                <div style={{ fontWeight: 600, marginBottom: s.response ? 8 : 0, overflowWrap: 'anywhere' }}>{s.query}</div>
                                {s.response ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--wka-faint)', fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                                    <Bot size={14} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--wka-cyan)' }} />
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{s.response}</div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <ReasonModal
          title={modal.type === 'all' ? 'Clear all leads' : 'Delete lead'}
          message={modal.type === 'all'
            ? `Permanently delete all ${state.leads.length} lead records. This cannot be undone.`
            : `Permanently delete the lead for ${modal.row.email || 'this visitor'}. This cannot be undone.`}
          confirmLabel={modal.type === 'all' ? 'Clear all' : 'Delete lead'}
          busy={mBusy} error={mErr}
          onConfirm={confirmModal}
          onCancel={() => { if (!mBusy) setModal(null) }}
        />
      ) : null}
    </div>
  )
}
