// System incidents: the REAL causes behind the generic "system is busy" message
// users see. AI provider quota/key/5xx failures, timeouts, and unexpected errors,
// newest first, so the operator can fix billing, keys or the model. Superadmin
// only (gated server-side). Users never see any of this.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'

function kindBadge(k, t) {
  const key = String(k || 'system_error')
  const label = (key === 'ai_error' || key === 'system_error' || key === 'ai_failover' || key === 'ai_exhausted')
    ? t(`incidentsAdmin.kind.${key}`)
    : key
  // Failover is a RECOVERY (we kept the user working) so it reads neutral;
  // provider error and full exhaustion read as attention-needed.
  const attn = key === 'ai_error' || key === 'ai_exhausted'
  return <span className={`wka-badge ${attn ? 'paused' : ''}`}>{label}</span>
}

export default function Incidents() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, incidents: [], total: 0 })
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)   // { type: 'one'|'all', row }
  const [mBusy, setMBusy] = useState(false)
  const [mErr, setMErr] = useState(null)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.incidents(1000)
      setState({ loading: false, error: null, incidents: data.incidents || [], total: data.total || 0 })
    } catch (error) {
      if (!isRefresh) setState({ loading: false, error, incidents: [], total: 0 })
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const confirmModal = async (reason) => {
    setMBusy(true); setMErr(null)
    try {
      if (modal.type === 'all') await workAdminApi.clearIncidents(reason)
      else await workAdminApi.deleteIncident(modal.row.id, reason)
      setModal(null)
      load(true)
    } catch (e) { setMErr(e) } finally { setMBusy(false) }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.incidents
    return state.incidents.filter((i) =>
      (i.message || '').toLowerCase().includes(q) ||
      (i.username || '').toLowerCase().includes(q) ||
      (i.companyName || '').toLowerCase().includes(q) ||
      (i.call || '').toLowerCase().includes(q) ||
      String(i.status || '').includes(q))
  }, [state.incidents, query])

  if (state.loading) return <Loading label={t('incidentsAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  return (
    <div>
      <div className="wka-note"><AlertTriangle size={14} /> {t('incidentsAdmin.note')}</div>
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('incidentsAdmin.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('incidentsAdmin.refresh')}
        </button>
        <button type="button" className="wka-btn sm ghost" onClick={() => { setMErr(null); setModal({ type: 'all' }) }} disabled={state.incidents.length === 0} style={{ color: 'var(--wka-red)' }}>
          <Trash2 size={13} /> {t('incidentsAdmin.clearAll')}
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {t('incidentsAdmin.showing', { shown: rows.length, total: state.total })}{state.total > state.incidents.length ? t('incidentsAdmin.latestSuffix', { n: state.incidents.length }) : ''}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('incidentsAdmin.emptyTitle')} detail={query ? t('incidentsAdmin.emptyDetailSearch') : t('incidentsAdmin.emptyDetail')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                <th className="no-sort">{t('incidentsAdmin.colWhen')}</th>
                <th className="no-sort">{t('incidentsAdmin.colType')}</th>
                <th className="no-sort">{t('incidentsAdmin.colStatus')}</th>
                <th className="no-sort">{t('incidentsAdmin.colUser')}</th>
                <th className="no-sort">{t('incidentsAdmin.colCompany')}</th>
                <th className="no-sort">{t('incidentsAdmin.colWhere')}</th>
                <th className="no-sort">{t('incidentsAdmin.colCause')}</th>
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(i.at)}</td>
                  <td>{kindBadge(i.kind, t)}</td>
                  <td className="wka-mono">{i.status || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{i.username || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{i.companyName || '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} title={i.call || ''}>{i.call || '-'}</td>
                  <td style={{ maxWidth: 420 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }} title={i.message || ''}>{i.message || '-'}</div>
                    {(i.provider || i.model) ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{[i.provider ? t('incidentsAdmin.providerLabel', { provider: i.provider }) : null, i.model ? t('incidentsAdmin.modelLabel', { model: i.model }) : null].filter(Boolean).join('  |  ')}</div> : null}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="wka-btn sm ghost" title={t('incidentsAdmin.deleteTitle')} style={{ color: 'var(--wka-red)' }} onClick={() => { setMErr(null); setModal({ type: 'one', row: i }) }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <ReasonModal
          title={modal.type === 'all' ? t('incidentsAdmin.modal.clearAllTitle') : t('incidentsAdmin.modal.deleteTitle')}
          message={modal.type === 'all'
            ? t('incidentsAdmin.modal.clearAllMsg', { n: state.incidents.length })
            : t('incidentsAdmin.modal.deleteMsg')}
          confirmLabel={modal.type === 'all' ? t('incidentsAdmin.modal.clearAllConfirm') : t('incidentsAdmin.modal.deleteConfirm')}
          busy={mBusy} error={mErr}
          onConfirm={confirmModal}
          onCancel={() => { if (!mBusy) setModal(null) }}
        />
      ) : null}
    </div>
  )
}
