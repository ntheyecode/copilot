// Company Brain: what is in this company's private knowledge store, and how
// documents get in. The company admin ADDS documents here (companybrain/
// AddDocuments.jsx -> POST /api/work/brain/documents: read in memory, masked
// under the company policy, only passages stored, the file never kept), SEES
// what is in the brain (documents, passages, size) and REMOVES a source or
// clears everything. Both destructive actions are reason-gated through the
// shared ReasonModal and logged server-side (platform-wide destructive-action
// rule). Company-scoped: the server resolves the company from the signed-in
// admin. Thin wiring here; the add flow lives in companybrain/.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Brain, FileText, Layers, HardDrive, RefreshCw, Trash2, Search, ShieldCheck } from 'lucide-react'
import { api } from '../../../api.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'
import AddDocuments from './companybrain/AddDocuments.jsx'
import { fmtBytes } from './companybrain/fmtBytes.js'

export { fmtBytes }

const fmtInt = (n) => { const v = Number(n); return isFinite(v) ? v.toLocaleString() : '0' }

// Kind of source (pdf / docx / md / url / ...), shown as a neutral badge.
function kindBadge(kind) {
  const k = String(kind || 'document').trim()
  return <span className="wka-badge" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</span>
}

// Status of a source in the brain. The server's vocabulary is not fixed yet, so
// map the obvious families (ready / in progress / failed) and show anything
// else verbatim rather than hiding it.
function statusBadge(status, t) {
  const s = String(status || 'ready').toLowerCase()
  if (['ready', 'indexed', 'active', 'ok', 'complete', 'completed'].includes(s)) return <span className="wka-badge active">{t('companyBrain.statusReady')}</span>
  if (['pending', 'processing', 'indexing', 'uploading', 'queued', 'syncing'].includes(s)) return <span className="wka-badge paused">{t('companyBrain.statusInProgress')}</span>
  if (['error', 'failed', 'rejected'].includes(s)) return <span className="wka-badge exhausted">{t('companyBrain.statusFailed')}</span>
  if (['removed', 'deleted', 'stale', 'superseded'].includes(s)) return <span className="wka-badge" style={{ color: 'var(--wka-faint)' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
  return <span className="wka-badge">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
}

// `onOpen(sectionId)` switches the console section (the locked-brain pointer
// opens Encryption & export, where the unlock control lives).
export default function CompanyBrain({ onOpen }) {
  const t = useT()
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
        flash(t.n('companyBrain.clearedToast', r && r.cleared === 1 ? 1 : 2, { count: r && r.cleared != null ? fmtInt(r.cleared) : t('companyBrain.all') }))
      } else {
        await api.workBrainSourceDelete(modal.row.sourceId, reason)
        flash(t('companyBrain.removedToast', { name: modal.row.title || modal.row.sourceId }))
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

  if (state.loading) return <Loading label={t('companyBrain.loading')} />
  // Adding does not depend on the inventory read: the add area stays usable
  // when the list cannot be loaded (and a successful add retries the list).
  if (state.error) return (<div><AddDocuments onAdded={() => load(true)} onOpen={onOpen} /><ErrorBox error={state.error} onRetry={() => load(false)} /></div>)

  const stats = state.stats || { sources: 0, chunks: 0, bytes: 0 }
  const hasSources = state.sources.length > 0

  return (
    <div>
      <AddDocuments onAdded={() => load(true)} onOpen={onOpen} />

      <div className="wka-cards">
        <div className="wka-card">
          <div className="k"><FileText size={15} /> {t('companyBrain.documents')}</div>
          <div className="v">{fmtInt(stats.sources)}</div>
          <div className="foot">{t('companyBrain.sourcesInBrain')}</div>
        </div>
        <div className="wka-card">
          <div className="k"><Layers size={15} /> {t('companyBrain.chunks')}</div>
          <div className="v">{fmtInt(stats.chunks)}</div>
          <div className="foot">{t('companyBrain.chunksFoot')}</div>
        </div>
        <div className="wka-card">
          <div className="k"><HardDrive size={15} /> {t('companyBrain.size')}</div>
          <div className="v">{fmtBytes(stats.bytes)}</div>
          <div className="foot">{t('companyBrain.sizeFoot')}</div>
        </div>
      </div>

      <div className="wka-note"><ShieldCheck size={14} /> {t('companyBrain.privacyNote')}</div>

      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><ShieldCheck size={14} /> {done}</div> : null}

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('companyBrain.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} disabled={!hasSources} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('companyBrain.refresh')}
        </button>
        <button type="button" className="wka-btn sm ghost" onClick={() => { setMErr(null); setModal({ type: 'all' }) }} disabled={!hasSources} style={{ color: 'var(--wka-red)' }}>
          <Trash2 size={13} /> {t('companyBrain.clearAll')}
        </button>
        <span className="wka-spacer" />
        {hasSources ? (
          <span style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{t('companyBrain.showing', { shown: rows.length, total: state.sources.length })}</span>
        ) : null}
      </div>

      {!hasSources ? (
        <div className="wka-panel">
          <h2><Brain size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyBrain.heading')}</h2>
          <EmptyState title={t('companyBrain.emptyTitle')} detail={t('companyBrain.emptyDetail')} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t('companyBrain.noMatchTitle')} detail={t('companyBrain.noMatchDetail')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">{t('companyBrain.colTitle')}</th>
                <th className="no-sort">{t('companyBrain.colKind')}</th>
                <th className="no-sort" style={{ textAlign: 'right' }}>{t('companyBrain.colChunks')}</th>
                <th className="no-sort">{t('companyBrain.colUpdated')}</th>
                <th className="no-sort">{t('companyBrain.colStatus')}</th>
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.sourceId} data-testid="brain-source-row">
                  <td style={{ fontWeight: 600, maxWidth: 420 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.title || s.sourceId}>{s.title || s.sourceId}</div>
                    {s.policyVersion != null && String(s.policyVersion).trim() !== '' ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', fontWeight: 400 }}>{t('companyBrain.scrubPolicy', { v: s.policyVersion })}</div> : null}
                  </td>
                  <td>{kindBadge(s.kind)}</td>
                  <td className="wka-mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtInt(s.chunks)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(s.updatedAt)}</td>
                  <td>{statusBadge(s.status, t)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="wka-btn sm ghost" title={t('companyBrain.removeTitle')} style={{ color: 'var(--wka-red)' }}
                      onClick={() => { setMErr(null); setModal({ type: 'one', row: s }) }}>
                      <Trash2 size={13} /> {t('companyBrain.remove')}
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
          title={modal.type === 'all' ? t('companyBrain.modalClearTitle') : t('companyBrain.modalRemoveTitle')}
          message={modal.type === 'all'
            ? t.n('companyBrain.clearAllMessage', state.sources.length, { count: fmtInt(state.sources.length), chunks: fmtInt(stats.chunks) })
            : t.n('companyBrain.removeOneMessage', Number(modal.row.chunks), { name: modal.row.title || modal.row.sourceId, chunks: fmtInt(modal.row.chunks) })}
          confirmLabel={modal.type === 'all' ? t('companyBrain.clearAll') : t('companyBrain.modalRemoveTitle')}
          busy={mBusy} error={mErr}
          onConfirm={confirmModal}
          onCancel={() => { if (!mBusy) setModal(null) }}
        />
      ) : null}
    </div>
  )
}
