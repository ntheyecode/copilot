// Cancelled: every churned (canceled) subscriber, for the superadmin + the
// accounting role. A summary of who left and the lifetime revenue they brought,
// over a gold-standard searchable + sortable table modelled on Subscribers.jsx /
// Users.jsx. Read-first: it surfaces who canceled, on what plan/cycle, when,
// why, and the lifetime money they paid before leaving.
//
// Coded DEFENSIVELY (owner rules: never silently fail, graceful degradation):
// the backing endpoint GET /api/work/admin/subscribers/cancelled is implemented
// by the server agent, so until it is wired it may 404/501 - that is shown as a
// calm "not available yet" note, never a crash. Every field may be null -> "-".
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw, UserMinus, DollarSign, CalendarX, Building2, Lock } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning } from './_shared.jsx'
import { fmtDateTime, fmtMoney } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'

// Columns mirror the Subscribers table pattern: sortable where a sort makes sense.
const COLUMNS = [
  { key: 'username', labelKey: 'columns.user', sortable: true },
  { key: 'email', labelKey: 'columns.email', sortable: true },
  { key: 'plan', labelKey: 'columns.plan', sortable: true },
  { key: 'cycle', labelKey: 'columns.cycle', sortable: true },
  { key: 'since', labelKey: 'columns.subscribed', sortable: true },
  { key: 'canceledAt', labelKey: 'columns.canceled', sortable: true },
  { key: 'reason', labelKey: 'columns.reason', sortable: false },
  { key: 'lifetimeUsd', labelKey: 'columns.lifetimePaid', sortable: true },
  { key: 'companyName', labelKey: 'columns.company', sortable: true },
]

function fmtCycle(c, t) {
  const k = String(c || '').toLowerCase()
  if (k === 'month' || k === 'monthly') return t('cancelledAdmin.cycle.monthly')
  if (k === 'year' || k === 'annual' || k === 'yearly') return t('cancelledAdmin.cycle.annual')
  return c || '-'
}

// One summary tile (same shape as the Overview / Subscribers cards so it reads
// as one system).
function StatTile({ icon, label, value, foot, accent }) {
  return (
    <div className={`wka-card${accent ? ' accent' : ''}`}>
      <div className="k">{icon} {label}</div>
      <div className="v wka-mono">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  )
}

export default function Cancelled({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, cancelled: [], totals: null, unavailable: false })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'canceledAt', dir: 'desc' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.subscribersCancelled()
      setState({
        loading: false, error: null, unavailable: false,
        cancelled: Array.isArray(data && data.cancelled) ? data.cancelled : [],
        totals: (data && data.totals) || null,
      })
    } catch (error) {
      // 404/501 = the endpoint is not wired yet. Degrade gracefully (never a
      // crash, never a scary error) and let the operator retry.
      if (error && (error.status === 404 || error.status === 501)) {
        setState({ loading: false, error: null, unavailable: true, cancelled: [], totals: null })
      } else if (!isRefresh) {
        setState({ loading: false, error, unavailable: false, cancelled: [], totals: null })
      }
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = state.cancelled
    if (q) list = list.filter((u) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.companyName || '').toLowerCase().includes(q) ||
      (u.plan || '').toLowerCase().includes(q) ||
      (u.reason || '').toLowerCase().includes(q))
    const dir = sort.dir === 'asc' ? 1 : -1
    list = list.slice().sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir
      return ((av || 0) - (bv || 0)) * dir
    })
    return list
  }, [state.cancelled, query, sort])

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  if (state.loading) return <Loading label={t('cancelledAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  // Totals: prefer the server summary; fall back to values derived from the rows
  // so the tiles are never blank when the endpoint omits totals.
  const tot = state.totals || {}
  const count = tot.count != null ? tot.count : state.cancelled.length
  const lifetime = tot.lifetimeUsd != null ? tot.lifetimeUsd
    : state.cancelled.reduce((sum, s) => sum + (Number(s.lifetimeUsd) || 0), 0)

  return (
    <div>
      {!isSuperAdmin ? (
        <div className="wka-note"><Lock size={14} /> {t('cancelledAdmin.viewOnlyNote')}</div>
      ) : null}

      <div className="wka-cards">
        <StatTile icon={<UserMinus size={14} />} label={t('cancelledAdmin.tiles.cancelledSubscribers')} value={count}
          foot={state.unavailable ? t('cancelledAdmin.tiles.awaitingData') : t('cancelledAdmin.tiles.allChurned')} accent />
        <StatTile icon={<DollarSign size={14} />} label={t('cancelledAdmin.tiles.lifetimeRevenue')} value={fmtMoney(lifetime, 'usd')}
          foot={t('cancelledAdmin.tiles.totalPaid')} />
      </div>

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('cancelledAdmin.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('cancelledAdmin.refresh')}
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{t('cancelledAdmin.countOf', { shown: rows.length, total: state.cancelled.length })}</span>
      </div>

      {state.unavailable ? (
        <EmptyState title={t('cancelledAdmin.unavailableTitle')}
          detail={t('cancelledAdmin.unavailableDetail')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('cancelledAdmin.noMatchTitle')}
          detail={query ? t('cancelledAdmin.noMatchSearch') : t('cancelledAdmin.noMatchEmpty')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.sortable ? '' : 'no-sort'} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                    {t(`cancelledAdmin.${c.labelKey}`)}{c.sortable && sort.key === c.key ? <span className="arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id != null ? u.id : `${u.username}-${u.email}-${u.canceledAt}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {u.username || '-'}
                      <span className="wka-badge canceled">{t('cancelledAdmin.canceledBadge')}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.email ? <a href={`mailto:${u.email}`} style={{ color: 'var(--wka-cyan)' }}>{u.email}</a> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}
                  </td>
                  <td>{u.plan ? <TierBadge tier={u.plan} /> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtCycle(u.cycle, t)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.since ? fmtDateTime(u.since) : '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.canceledAt ? fmtDateTime(u.canceledAt) : '-'}</td>
                  <td style={{ maxWidth: 240 }}>
                    {u.reason ? <span style={{ color: 'var(--wka-muted)' }}>{u.reason}</span> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}
                  </td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.lifetimeUsd == null ? '-' : fmtMoney(u.lifetimeUsd, 'usd')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.companyName
                      ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Building2 size={13} style={{ color: 'var(--wka-faint)' }} />{u.companyName}</span>
                      : <span style={{ color: 'var(--wka-faint)' }}>{t('cancelledAdmin.individual')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
