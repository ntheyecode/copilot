// Business-claims traceability (superadmin only, behind the authenticator step-up).
// Every public claim mapped to the file + code block that backs it, with a status
// and an authenticity seal. Download a signed Markdown report. Reads
// /api/work/admin/claims (gated by the same shared step-up as AI config).
import React, { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Download, ShieldCheck } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, StepUpGate, StepUpBanner } from './_shared.jsx'

const STATUS_BADGE = {
  substantiated: { label: 'Substantiated', cls: 'active' },
  partial: { label: 'Partial', cls: 'paused' },
  unbacked: { label: 'Unbacked', cls: 'ended' },
}

function ClaimsBody({ stepUp, onLocked }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try { const data = await workAdminApi.claims(); setState({ loading: false, error: null, data }) }
    catch (error) { if (!isRefresh) setState({ loading: false, error, data: null }) }
    finally { setRefreshing(false) }
  }, [])
  useEffect(() => { load(false) }, [load])

  if (state.loading) return <Loading label="Loading claims" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />
  const { claims = [], summary = {}, attestation = {} } = state.data || {}
  const q = query.trim().toLowerCase()
  const order = { unbacked: 0, partial: 1, substantiated: 2 }
  const rows = claims
    .filter((c) => filter === 'all' || c.status === filter)
    .filter((c) => !q || (c.claim || '').toLowerCase().includes(q) || (c.page || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  const Count = ({ k, label }) => (
    <button type="button" className={`wka-btn sm${filter === k ? '' : ' ghost'}`} onClick={() => setFilter(k)}>
      {label} {k === 'all' ? summary.total || 0 : summary[k] || 0}
    </button>
  )

  return (
    <div>
      <StepUpBanner status={stepUp} onLocked={onLocked} lock={workAdminApi.lockAiConfig} label="Business claims" />
      <p className="desc">Every concrete claim the public website makes, mapped to the file and code block that backs it. Status: substantiated (code proves it), partial (true with caveats), or unbacked (no code found - an honesty risk). The downloaded report carries a SHA-256 + signature authenticity seal.</p>

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 320 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search claim, page or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Count k="all" label="All" />
        <Count k="unbacked" label="Unbacked" />
        <Count k="partial" label="Partial" />
        <Count k="substantiated" label="Substantiated" />
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh</button>
        <a className="wka-btn sm primary" href={workAdminApi.claimsMdUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Download size={13} /> Download signed report</a>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No claims" detail="Try a different search or filter." />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">Claim</th>
                <th className="no-sort">Where</th>
                <th className="no-sort">Status</th>
                <th className="no-sort">Backed by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const b = STATUS_BADGE[c.status] || { label: c.status, cls: 'paused' }
                return (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 360 }}>
                      <div style={{ fontWeight: 600 }}>{c.claim}</div>
                      {c.category ? <div style={{ fontSize: 11.5, color: 'var(--wka-faint)', marginTop: 2 }}>{c.category}</div> : null}
                      {c.risk && c.status !== 'substantiated' ? <div style={{ fontSize: 12, color: 'var(--wka-amber, #b26a00)', marginTop: 4 }}>Risk: {c.risk}</div> : null}
                    </td>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{c.page || '-'}</td>
                    <td><span className={`wka-badge ${b.cls}`}>{b.label}</span></td>
                    <td className="wka-mono" style={{ fontSize: 11.5, maxWidth: 320 }}>
                      {Array.isArray(c.evidence) && c.evidence.length
                        ? c.evidence.map((e, i) => (
                          <div key={i} title={e.note || ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.file}{e.line ? ':' + e.line : ''}{e.symbol ? ` (${e.symbol})` : ''}
                          </div>
                        ))
                        : <span style={{ color: 'var(--wka-faint)' }}>no code evidence</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {attestation.hash ? (
        <div className="wka-note" style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <ShieldCheck size={14} />
          <span style={{ fontSize: 12 }}>Authenticity: {attestation.alg} seal, hash {String(attestation.hash).slice(0, 16)}..., issued {attestation.issuedAt}. The downloaded report is signed in full.</span>
        </div>
      ) : null}
    </div>
  )
}

export default function Claims() {
  const [gate, setGate] = useState({ loading: true, status: null, error: null })
  const loadGate = useCallback(async () => {
    setGate({ loading: true, status: null, error: null })
    try { const status = await workAdminApi.aiStepUp(); setGate({ loading: false, status, error: null }) }
    catch (error) { setGate({ loading: false, status: null, error }) }
  }, [])
  useEffect(() => { loadGate() }, [loadGate])

  if (gate.loading) return <Loading label="Checking access" />
  if (gate.error) return <ErrorBox error={gate.error} onRetry={loadGate} />
  if (!gate.status || !gate.status.active) {
    return <StepUpGate status={gate.status || {}} verify={workAdminApi.verifyAiStepUp} onUnlock={(st) => setGate({ loading: false, status: st, error: null })} label="Business claims" />
  }
  return <ClaimsBody stepUp={gate.status} onLocked={loadGate} />
}
