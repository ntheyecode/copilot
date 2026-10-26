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

// Columns mirror the Users table pattern: sortable where a sort makes sense.
const COLUMNS = [
  { key: 'username', label: 'User', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'plan', label: 'Plan', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'cycle', label: 'Cycle', sortable: true },
  { key: 'since', label: 'Since', sortable: true },
  { key: 'currentPeriodEnd', label: 'Renews', sortable: true },
  { key: 'mrrUsd', label: 'MRR', sortable: true },
  { key: 'lifetimeUsd', label: 'Lifetime paid', sortable: true },
  { key: 'tasksToday', label: 'Tasks today', sortable: true },
  { key: 'hoursUsedToday', label: 'Hours today', sortable: true },
  { key: 'sessionCount', label: 'Sessions', sortable: true },
  { key: 'lastActive', label: 'Last active', sortable: true },
  { key: 'companyName', label: 'Company', sortable: true },
]

// status -> shared badge class (see WORKADMIN_CSS). A comped (free) account reads
// as "comp" even if the server also flags `free`.
const STATUS_CLASS = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', comp: 'comp' }
const STATUS_LABEL = { active: 'Active', trialing: 'Trialing', past_due: 'Past due', canceled: 'Canceled', comp: 'Comp' }
function StatusBadge({ status, free }) {
  const s = free && (!status || status === 'active') ? 'comp' : String(status || 'active')
  return <span className={`wka-badge ${STATUS_CLASS[s] || 'basic'}`}>{STATUS_LABEL[s] || (s.charAt(0).toUpperCase() + s.slice(1))}</span>
}

// Hours used today: the server sends a number of hours (may be null). Render it
// as a compact, honest "-" when unknown rather than guessing 0.
function fmtHours(n) {
  const v = Number(n)
  if (!isFinite(v)) return '-'
  if (v === 0) return '0h'
  return `${v % 1 === 0 ? v : v.toFixed(1)}h`
}
function fmtCount(n) { const v = Number(n); return isFinite(v) ? v : '-' }
function fmtCycle(c) {
  const k = String(c || '').toLowerCase()
  if (k === 'month' || k === 'monthly') return 'Monthly'
  if (k === 'year' || k === 'annual' || k === 'yearly') return 'Annual'
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

  if (state.loading) return <Loading label="Loading subscribers" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />

  // Totals: prefer the server summary; fall back to a count derived from the rows
  // so the tiles are never blank when the endpoint omits totals.
  const t = state.totals || {}
  const count = t.count != null ? t.count : state.subscribers.length
  const activeCount = t.activeCount != null ? t.activeCount
    : state.subscribers.filter((s) => s.status === 'active' || s.status === 'trialing').length
  const mrr = t.mrrUsd != null ? t.mrrUsd
    : state.subscribers.reduce((sum, s) => sum + (Number(s.mrrUsd) || 0), 0)
  const byPlan = t.byPlan || {}
  const planFoot = ['lite', 'basic', 'advanced', 'premium']
    .filter((p) => byPlan[p] != null)
    .map((p) => `${p.charAt(0).toUpperCase() + p.slice(1)} ${byPlan[p]}`)
    .join(' · ') || 'No plan breakdown'

  return (
    <div>
      {!isSuperAdmin ? (
        <div className="wka-note"><Lock size={14} /> Subscribers are visible to superadmins. You can view everything here.</div>
      ) : null}

      <div className="wka-cards">
        <StatTile icon={<Users size={14} />} label="Paying subscribers" value={fmtCount(count)}
          foot={state.unavailable ? 'Awaiting data' : 'All subscriptions on record'} />
        <StatTile icon={<CheckCircle2 size={14} />} label="Active" value={fmtCount(activeCount)} accent
          foot="Active or trialing right now" />
        <StatTile icon={<DollarSign size={14} />} label="MRR" value={fmtMoney(mrr, 'usd')}
          foot="Estimated monthly recurring revenue" />
        <StatTile icon={<Layers size={14} />} label="By plan" value={fmtCount(count)}
          foot={planFoot} />
      </div>

      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search user, email, company or plan"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{rows.length} of {state.subscribers.length}</span>
      </div>

      {state.unavailable ? (
        <EmptyState title="Subscribers are not available yet"
          detail="The subscribers endpoint is not wired on this server yet. Once it is live, every paying subscriber and their operations appear here. Use Refresh to check again." />
      ) : rows.length === 0 ? (
        <EmptyState title="No subscribers match"
          detail={query ? 'Try a different search.' : 'No paying subscribers yet. They appear here as subscriptions are created.'} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table" style={{ minWidth: 1180 }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.sortable ? '' : 'no-sort'} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                    {c.label}{c.sortable && sort.key === c.key ? <span className="arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
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
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtCycle(u.cycle)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.since ? fmtDateTime(u.since) : '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.currentPeriodEnd ? fmtDateTime(u.currentPeriodEnd) : '-'}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.mrrUsd == null ? '-' : fmtMoney(u.mrrUsd, 'usd')}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.lifetimeUsd == null ? '-' : fmtMoney(u.lifetimeUsd, 'usd')}</td>
                  <td className="wka-mono">{fmtCount(u.tasksToday)}</td>
                  <td className="wka-mono">{fmtHours(u.hoursUsedToday)}</td>
                  <td className="wka-mono">{fmtCount(u.sessionCount)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{u.lastActive ? fmtDateTime(u.lastActive) : '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {u.companyName
                      ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Building2 size={13} style={{ color: 'var(--wka-faint)' }} />{u.companyName}</span>
                      : <span style={{ color: 'var(--wka-faint)' }}>Individual</span>}
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
