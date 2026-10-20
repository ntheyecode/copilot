// Users: searchable, sortable table of WorkCoPilot users. Inline tier edit and
// a grant-hours action, both superadmin-only (the server enforces it; the UI
// disables the controls and explains why for a non-superadmin admin).
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Clock, Lock, Plus, RotateCcw, Ban } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning } from './_shared.jsx'
import { hmFromSeconds } from '../workadmin.css.js'

const COLUMNS = [
  { key: 'username', label: 'User', sortable: true },
  { key: 'tier', label: 'Tier', sortable: true },
  { key: 'freeLeftSeconds', label: 'Free left today', sortable: true },
  { key: 'purchasedSeconds', label: 'Purchased balance', sortable: true },
  { key: 'remainingSeconds', label: 'Total remaining', sortable: true },
  { key: 'sessionCount', label: 'Sessions', sortable: true },
  { key: 'actions', label: '', sortable: false },
]

export default function UsersSection({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, users: [], tiers: [] })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'username', dir: 'asc' })
  const [busyId, setBusyId] = useState(null)
  const [rowMsg, setRowMsg] = useState({})      // id -> { kind: 'ok'|'err', text }
  const [grantFor, setGrantFor] = useState(null) // id being granted
  const [grantHours, setGrantHours] = useState('1')

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.users()
      setState({ loading: false, error: null, users: data.users || [], tiers: data.tiers || ['basic', 'advanced', 'premium'] })
    } catch (error) {
      setState({ loading: false, error, users: [], tiers: [] })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setMsg = (id, kind, text) => {
    setRowMsg((m) => ({ ...m, [id]: { kind, text } }))
    setTimeout(() => setRowMsg((m) => { const n = { ...m }; delete n[id]; return n }), 4000)
  }

  const applyTier = async (user, tier) => {
    if (tier === user.tier) return
    setBusyId(user.id)
    try {
      const usage = await workAdminApi.setTier(user.id, tier)
      setState((s) => ({ ...s, users: s.users.map((u) => u.id === user.id ? { ...u, ...usage } : u) }))
      setMsg(user.id, 'ok', `Tier set to ${tier}`)
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not change tier')
    } finally { setBusyId(null) }
  }

  const applyGrant = async (user) => {
    const hours = Number(grantHours)
    if (!isFinite(hours) || hours <= 0) { setMsg(user.id, 'err', 'Enter a positive number of hours'); return }
    setBusyId(user.id)
    try {
      const usage = await workAdminApi.grantHours(user.id, hours)
      setState((s) => ({ ...s, users: s.users.map((u) => u.id === user.id ? { ...u, ...usage } : u) }))
      setMsg(user.id, 'ok', `Granted ${hours}h`)
      setGrantFor(null); setGrantHours('1')
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not grant hours')
    } finally { setBusyId(null) }
  }

  // Refund the user's most recent Stripe charge. Confirmed first because it moves
  // real money. A missing Stripe key comes back as a clear message, not a crash.
  const applyRefund = async (user) => {
    if (!window.confirm(`Refund the most recent payment for ${user.username}? This cannot be undone.`)) return
    setBusyId(user.id)
    try {
      const r = await workAdminApi.refundUser(user.id, { last: true })
      const amt = r && r.refund ? (r.refund.amount / 100).toFixed(2) : null
      setMsg(user.id, 'ok', amt != null ? `Refunded ${amt} ${(r.refund.currency || 'usd').toUpperCase()}` : 'Refund processed')
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not process the refund')
    } finally { setBusyId(null) }
  }

  // Cancel the user's subscription immediately. The webhook also syncs, but the
  // store is updated now so the change shows without waiting.
  const applyCancel = async (user) => {
    if (!window.confirm(`Cancel the subscription for ${user.username} now? Their guiding access will stop.`)) return
    setBusyId(user.id)
    try {
      await workAdminApi.cancelUserSubscription(user.id, false)
      setMsg(user.id, 'ok', 'Subscription canceled')
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not cancel the subscription')
    } finally { setBusyId(null) }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = state.users
    if (q) list = list.filter((u) => (u.username || '').toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q))
    const dir = sort.dir === 'asc' ? 1 : -1
    list = list.slice().sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      if (typeof av === 'string' || typeof bv === 'string') return String(av || '').localeCompare(String(bv || '')) * dir
      return ((av || 0) - (bv || 0)) * dir
    })
    return list
  }, [state.users, query, sort])

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  if (state.loading) return <Loading label="Loading users" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      {!isSuperAdmin ? (
        <div className="wka-note"><Lock size={14} /> Changing a tier or granting hours requires superadmin access. You can view everything here.</div>
      ) : null}
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder="Search by username"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{rows.length} of {state.users.length}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users match" detail={query ? 'Try a different search.' : 'No WorkCoPilot users have been provisioned yet.'} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
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
              {rows.map((u) => {
                const msg = rowMsg[u.id]
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      {u.displayName ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{u.displayName}</div> : null}
                      {msg ? <div style={{ fontSize: 11, marginTop: 3, color: msg.kind === 'ok' ? 'var(--wka-emerald)' : 'var(--wka-red)' }}>{msg.text}</div> : null}
                    </td>
                    <td>
                      {isSuperAdmin ? (
                        <select className="wka-select" value={u.tier} disabled={busyId === u.id}
                          onChange={(e) => applyTier(u, e.target.value)}>
                          {state.tiers.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                      ) : <TierBadge tier={u.tier} />}
                    </td>
                    <td className="wka-mono">{hmFromSeconds(u.freeLeftSeconds)}
                      {u.exhausted ? <span className="wka-badge exhausted" style={{ marginLeft: 8 }}>exhausted</span> : null}
                    </td>
                    <td className="wka-mono">{hmFromSeconds(u.purchasedSeconds)}</td>
                    <td className="wka-mono">{hmFromSeconds(u.remainingSeconds)}</td>
                    <td className="wka-mono">{u.sessionCount}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {grantFor === u.id ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input className="wka-input" style={{ width: 70, padding: '6px 8px' }} type="number" min="0" step="0.5"
                            value={grantHours} onChange={(e) => setGrantHours(e.target.value)} aria-label="Hours to grant" />
                          <button type="button" className="wka-btn sm primary" disabled={busyId === u.id} onClick={() => applyGrant(u)}>
                            {busyId === u.id ? <Spinning /> : 'Add'}
                          </button>
                          <button type="button" className="wka-btn sm ghost" onClick={() => { setGrantFor(null); setGrantHours('1') }}>Cancel</button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button type="button" className="wka-btn sm" disabled={!isSuperAdmin} title={isSuperAdmin ? 'Grant purchased hours' : 'Superadmin only'}
                            onClick={() => { setGrantFor(u.id); setGrantHours('1') }}>
                            <Plus size={13} /> <Clock size={13} /> Grant hours
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? 'Refund the most recent payment' : 'Superadmin only'}
                            onClick={() => applyRefund(u)}>
                            <RotateCcw size={13} /> Refund last
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? 'Cancel the subscription now' : 'Superadmin only'}
                            onClick={() => applyCancel(u)}>
                            <Ban size={13} /> Cancel sub
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
