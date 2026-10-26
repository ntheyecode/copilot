// Subscribers: every paying subscriber and their operations, for the superadmin.
// Summary stat tiles up top (total paying, active, MRR, by-plan) over a
// gold-standard searchable + sortable table modelled on Users.jsx. Read-first:
// it surfaces who is paying, on what plan/cycle, their money (MRR + lifetime)
// and their activity (tasks today, hours used today, sessions, last active).
//
// Coded DEFENSIVELY (owner rules: never silently fail, graceful degradation):
// the backing endpoint GET /api/work/admin/subscribers is implemented by another
// agent, so until it is wired it may 404/501 - that is shown as a calm
// "not available yet" note, never a crash. Every field may be null.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, RefreshCw, Users, CheckCircle2, DollarSign, Layers, Building2, Lock } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning } from './_shared.jsx'
import { fmtDateTime, fmtMoney } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'

// Columns mirror the Users table pattern: sortable where a sort makes sense.
const COLUMNS = [
  { key: 'username', labelKey: 'columns.user', sortable: true },
  { key: 'email', labelKey: 'columns.email', sortable: true },
  { key: 'plan', labelKey: 'columns.plan', sortable: true },
  { key: 'status', labelKey: 'columns.status', sortable: true },
  { key: 'cycle', labelKey: 'columns.cycle', sortable: true },
  { key: 'since', labelKey: 'columns.since', sortable: true },
  { key: 'currentPeriodEnd', labelKey: 'columns.renews', sortable: true },
  { key: 'mrrUsd', labelKey: 'columns.mrr', sortable: true },
  { key: 'lifetimeUsd', labelKey: 'columns.lifetimePaid', sortable: true },
  { key: 'tasksToday', labelKey: 'columns.tasksToday', sortable: true },
  { key: 'hoursUsedToday', labelKey: 'columns.hoursToday', sortable: true },
  { key: 'sessionCount', labelKey: 'columns.sessions', sortable: true },
  { key: 'lastActive', labelKey: 'columns.lastActive', sortable: true },
  { key: 'companyName', labelKey: 'columns.company', sortable: true },
]

// status -> shared badge class (see WORKADMIN_CSS). A comped (free) account reads
// as "comp" even if the server also flags `free`.
const STATUS_CLASS = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', comp: 'comp' }
const STATUS_LABEL_KEY = { active: 'status.active', trialing: 'status.trialing', past_due: 'status.past_due', canceled: 'status.canceled', comp: 'status.comp' }
function StatusBadge({ status, free }) {
  const t = useT()
  const s = free && (!status || status === 'active') ? 'comp' : String(status || 'active')
  return <span className={`wka-badge ${STATUS_CLASS[s] || 'basic'}`}>{STATUS_LABEL_KEY[s] ? t(`subscribersAdmin.${STATUS_LABEL_KEY[s]}`) : (s.charAt(0).toUpperCase() + s.slice(1))}</span>
}

// Hours used today: the server sends a number of hours (may be null). Render it
// as a compact, honest "-" when unknown rather than guessing 0.
function fmtHours(n, t) {
  const v = Number(n)
  if (!isFinite(v)) return '-'
  if (v === 0) return t('subscribersAdmin.hoursZero')
  return t('subscribersAdmin.hours', { v: v % 1 === 0 ? v : v.toFixed(1) })
}
function fmtCount(n) { const v = Number(n); return isFinite(v) ? v : '-' }
function fmtCycle(c, t) {
  const k = String(c || '').toLowerCase()
  if (k === 'month' || k === 'monthly') return t('subscribersAdmin.cycle.monthly')
  if (k === 'year' || k === 'annual' || k === 'yearly') return t('subscribersAdmin.cycle.annual')
  return c || '-'
}

// One summary tile (same shape as the Overview cards so it reads as one system).
function StatTile({ icon, label, value, foot, accent }) {
  return (
    <div className={`wka-card${accent ? ' accent' : ''}`}>
      <div className="k">{icon} {label}</div>
      <div className="v wka-mono">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  )
}

export default function Subscribers({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, subscribers: [], totals: null, unavailable: false })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'mrrUsd', dir: 'desc' })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.subscribers()
      setState({
        loading: false, error: null, unavailable: false,
        subscribers: Array.isArray(data && data.subscribers) ? data.subscribers : [],
        totals: (data && data.totals) || null,
      })
    } catch (error) {
      // 404/501 = the endpoint is not wired yet. Degrade gracefully (never a
      // crash, never a scary error) and let the operator retry.
      if (error && (error.status === 404 || error.status === 501)) {
        setState({ loading: false, error: null, unavailable: true, subscribers: [], totals: null })
      } else if (!isRefresh) {
        setState({ loading: false, error, unavailable: false, subscribers: [], totals: null })
      }
    } finally { setRefreshing(false) }
  }, [])

  useEffect(() => { load(false) }, [load])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = state.subscribers
    if (q) list = list.filter((u) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.companyName || '').toLowerCase().includes(q) ||
      (u.plan || '').toLowerCase().includes(q))
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
  }, [state.subscribers, query, sort])

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  if (state.loading) return <Loading label={t('subscribersAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  // Totals: prefer the server summary; fall back to a count derived from the rows
  // so the tiles are never blank when the endpoint omits totals.
  const totals = state.totals || {}
  const count = totals.count != null ? totals.count : state.subscribers.length
  const activeCount = totals.activeCount != null ? totals.activeCount
    : state.subscribers.filter((s) => s.status === 'active' || s.status === 'trialing').length
  const mrr = totals.mrrUsd != null ? totals.mrrUsd
    : state.subscribers.reduce((sum, s) => sum + (Number(s.mrrUsd) || 0), 0)
  const byPlan = totals.byPlan || {}
  const planFoot = ['lite', 'basic', 'advanced', 'premium']
    .filter((p) => byPlan[p] != null)
    .map((p) => t('subscribersAdmin.planFootItem', { plan: t(`subscribersAdmin.plan.${p}`), count: byPlan[p] }))
    .join(' · ') || t('subscribersAdmin.noPlanBreakdown')

  return (
    <div>
      {!isSuperAdmin ? (
        <div className="wka-note"><Lock size={14} /> {t('subscribersAdmin.viewOnlyNote')}</div>
      ) : null}

      <div className="wka-cards">
        <StatTile icon={<Users size={14} />} label={t('subscribersAdmin.tiles.payingSubscribers')} value={fmtCount(count)}
          foot={state.unavailable ? t('subscribersAdmin.tiles.awaitingData') : t('subscribersAdmin.tiles.allOnRecord')} />
        <StatTile icon={<CheckCircle2 size={14} />} label={t('subscribersAdmin.tiles.active')} value={fmtCount(activeCount)} accent
          foot={t('subscribersAdmin.tiles.activeFoot')} />
        <StatTile icon={<DollarSign size={14} />} label={t('subscribersAdmin.tiles.mrr')} value={fmtMoney(mrr, 'usd')}
          foot={t('subscribersAdmin.tiles.mrrFoot')} />
        <StatTile icon={<Layers size={14} />} label={t('subscribersAdmin.tiles.byPlan')} value={fmtCount(count)}
          foot={planFoot} />
      </div>

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('subscribersAdmin.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('subscribersAdmin.refresh')}
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{t('subscribersAdmin.countOf', { shown: rows.length, total: state.subscribers.length })}</span>
      </div>

      {state.unavailable ? (
        <EmptyState title={t('subscribersAdmin.unavailable.title')}
          detail={t('subscribersAdmin.unavailable.detail')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('subscribersAdmin.empty.title')}
          detail={query ? t('subscribersAdmin.empty.detailSearch') : t('subscribersAdmin.empty.detailNone')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table" style={{ minWidth: 1180 }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.sortable ? '' : 'no-sort'} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                    {t(`subscribersAdmin.${c.labelKey}`)}{c.sortable && sort.key === c.key ? <span className="arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id != null ? u.id : `${u.username}-${u.email}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600 }}>{u.username || '-'}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.email ? <a href={`mailto:${u.email}`} style={{ color: 'var(--wka-cyan)' }}>{u.email}</a> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}
                  </td>
                  <td>{u.plan ? <TierBadge tier={u.plan} /> : <span style={{ color: 'var(--wka-faint)' }}>-</span>}</td>
                  <td><StatusBadge status={u.status} free={u.free} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtCycle(u.cycle, t)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.since ? fmtDateTime(u.since) : '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.currentPeriodEnd ? fmtDateTime(u.currentPeriodEnd) : '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.mrrUsd == null ? '-' : fmtMoney(u.mrrUsd, 'usd')}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.lifetimeUsd == null ? '-' : fmtMoney(u.lifetimeUsd, 'usd')}</td>
                  <td className="wka-mono">{fmtCount(u.tasksToday)}</td>
                  <td className="wka-mono">{fmtHours(u.hoursUsedToday, t)}</td>
                  <td className="wka-mono">{fmtCount(u.sessionCount)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.lastActive ? fmtDateTime(u.lastActive) : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.companyName
                      ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Building2 size={13} style={{ color: 'var(--wka-faint)' }} />{u.companyName}</span>
                      : <span style={{ color: 'var(--wka-faint)' }}>{t('subscribersAdmin.individual')}</span>}
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
