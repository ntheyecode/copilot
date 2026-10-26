// Company Brain: the inventory of what is in this company's private knowledge
// store. Documents are added from the desktop app only - scrubbed and embedded
// on the member's device, so the server (and this console) only ever holds
// scrubbed chunks and vectors, encrypted per company. Here a company admin can
// SEE what is in the brain (sources, chunks, size) and REMOVE a source or clear
// everything. Both destructive actions are reason-gated through the shared
// ReasonModal and logged server-side (platform-wide destructive-action rule).
// Company-scoped: the server resolves the company from the signed-in admin.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Brain, FileText, Layers, HardDrive, RefreshCw, Trash2, Search, ShieldCheck } from 'lucide-react'
import { api } from '../../../api.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

// Human-readable byte size (1024-based, one decimal above KB).
export function fmtBytes(n) {
  const v = Number(n)
  if (!isFinite(v) || v <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0, x = v
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++ }
  return `${i === 0 ? Math.round(x) : x.toFixed(x >= 100 ? 0 : 1)} ${units[i]}`
}

const fmtInt = (n) => { const v = Number(n); return isFinite(v) ? v.toLocaleString() : '0' }

// Kind of source (pdf / docx / md / url / ...), shown as a neutral badge.
function kindBadge(kind) {
  const k = String(kind || 'document').trim()
  return <span className="wka-badge" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</span>
}

// Status of a source in the brain. The server's vocabulary is not fixed yet, so
// map the obvious families (ready / in progress / failed) and show anything
// else verbatim rather than hiding it.
function statusBadge(status) {
  const s = String(status || 'ready').toLowerCase()
  if (['ready', 'indexed', 'active', 'ok', 'complete', 'completed'].includes(s)) return <span className="wka-badge active">Ready</span>
  if (['pending', 'processing', 'indexing', 'uploading', 'queued', 'syncing'].includes(s)) return <span className="wka-badge paused">In progress</span>
  if (['error', 'failed', 'rejected'].includes(s)) return <span className="wka-badge exhausted">Failed</span>
  if (['removed', 'deleted', 'stale', 'superseded'].includes(s)) return <span className="wka-badge" style={{ color: 'var(--wka-faint)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
  return <span className="wka-badge">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
}

const EMPTY_DETAIL = "No documents yet - your team's documents are added privately from the desktop app, scrubbed on their device before anything leaves."

export default function CompanyBrain() {
  const [state, setState] = useState({ loading: true, error: null, stats: null, sources: [] })
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)   // { type: 'one'|'all', row }
  const [mBusy, setMBusy] = useState(false)
  const [mErr, setMErr] = useState(null)
  const [done, setDone] = useState(null)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api.workBrainInventory()
      const sources = Array.isArray(data && data.sources) ? data.sources : []
      const st = (data && data.stats) || {}
      // Stats come from the server; fall back to what the list itself says so a
      // missing stats block never shows zeros next to a populated table.
      const stats = {
        sources: st.sources != null ? st.sources : sources.length,
        chunks: st.chunks != null ? st.chunks : sources.reduce((a, s) => a + (Number(s.chunks) || 0), 0),
        bytes: st.bytes != null ? st.bytes : 0,
      }
      setState({ loading: false, error: null, stats, sources })
    } catch (error) {
      if (!isRefresh) setState({ loading: false, error, stats: null, sources: [] })
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }

  const confirmModal = async (reason) => {
    setMBusy(true); setMErr(null)
    try {
      if (modal.type === 'all') {
        const r = await api.workBrainClear(reason)
        flash(`Cleared ${r && r.cleared != null ? fmtInt(r.cleared) : 'all'} source${r && r.cleared === 1 ? '' : 's'} from the Company Brain. Logged to the audit trail.`)
      } else {
        await api.workBrainSourceDelete(modal.row.sourceId, reason)
        flash(`Removed "${modal.row.title || modal.row.sourceId}" from the Company Brain. Logged to the audit trail.`)
      }
      setModal(null)
      load(true)
    } catch (e) { setMErr(e) } finally { setMBusy(false) }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = state.sources
    if (!q) return list
    return list.filter((s) =>
      String(s.title || '').toLowerCase().includes(q) ||
      String(s.kind || '').toLowerCase().includes(q) ||
      String(s.version || '').toLowerCase().includes(q) ||
      String(s.status || '').toLowerCase().includes(q))
  }, [state.sources, query])

  if (state.loading) return <Loading label="Loading your Company Brain" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  const stats = state.stats || { sources: 0, chunks: 0, bytes: 0 }
  const hasSources = state.sources.length > 0

  return (
    <div>
      <div className="wka-cards">
        <div className="wka-card">
          <div className="k"><FileText size={15} /> Documents</div>
          <div className="v">{fmtInt(stats.sources)}</div>
          <div className="foot">Sources in your brain</div>
        </div>
        <div className="wka-card">
          <div className="k"><Layers size={15} /> Chunks</div>
          <div className="v">{fmtInt(stats.chunks)}</div>
          <div className="foot">Scrubbed passages stored</div>
        </div>
        <div className="wka-card">
          <div className="k"><HardDrive size={15} /> Size</div>
          <div className="v">{fmtBytes(stats.bytes)}</div>
          <div className="foot">Encrypted for your company</div>
        </div>
      </div>

      <div className="wka-note"><ShieldCheck size={14} /> Documents are scrubbed and prepared on each person's device before anything leaves it. Only the scrubbed passages reach WorkCoPilot, stored encrypted and private to your company. Nothing here is used to train the platform.</div>

      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><ShieldCheck size={14} /> {done}</div> : null}

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search title, kind or status"
            value={query} onChange={(e) => setQuery(e.target.value)} disabled={!hasSources} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh
        </button>
        <button type="button" className="wka-btn sm ghost" onClick={() => { setMErr(null); setModal({ type: 'all' }) }} disabled={!hasSources} style={{ color: 'var(--wka-red)' }}>
          <Trash2 size={13} /> Clear all
        </button>
        <span className="wka-spacer" />
        {hasSources ? (
          <span style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>Showing {rows.length} of {state.sources.length}</span>
        ) : null}
      </div>

      {!hasSources ? (
        <div className="wka-panel">
          <h2><Brain size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Company Brain</h2>
          <EmptyState title="Your Company Brain is empty" detail={EMPTY_DETAIL} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No matching documents" detail="Try a different search." />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">Title</th>
                <th className="no-sort">Kind</th>
                <th className="no-sort">Version</th>
                <th className="no-sort" style={{ textAlign: 'right' }}>Chunks</th>
                <th className="no-sort">Last updated</th>
                <th className="no-sort">Status</th>
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sourceId}>
                  <td style={{ fontWeight: 600, maxWidth: 420 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.title || s.sourceId}>{s.title || s.sourceId}</div>
                    {s.policyVersion != null ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', fontWeight: 400 }}>Scrub policy v{s.policyVersion}</div> : null}
                  </td>
                  <td>{kindBadge(s.kind)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{s.version != null && s.version !== '' ? String(s.version) : '-'}</td>
                  <td className="wka-mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtInt(s.chunks)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(s.updatedAt)}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="wka-btn sm ghost" title="Remove this document from the Company Brain" style={{ color: 'var(--wka-red)' }}
                      onClick={() => { setMErr(null); setModal({ type: 'one', row: s }) }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <ReasonModal
          title={modal.type === 'all' ? 'Clear the Company Brain' : 'Remove document'}
          message={modal.type === 'all'
            ? `Permanently remove all ${fmtInt(state.sources.length)} source${state.sources.length === 1 ? '' : 's'} (${fmtInt(stats.chunks)} chunks) from your Company Brain. Guidance stops drawing on them right away. Documents can be added again from the desktop app. This cannot be undone.`
            : `Permanently remove "${modal.row.title || modal.row.sourceId}" (${fmtInt(modal.row.chunks)} chunk${Number(modal.row.chunks) === 1 ? '' : 's'}) from your Company Brain. It can be added again from the desktop app. This cannot be undone.`}
          confirmLabel={modal.type === 'all' ? 'Clear all' : 'Remove document'}
          busy={mBusy} error={mErr}
          onConfirm={confirmModal}
          onCancel={() => { if (!mBusy) setModal(null) }}
        />
      ) : null}
    </div>
  )
}
