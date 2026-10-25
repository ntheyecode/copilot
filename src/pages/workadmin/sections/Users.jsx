// Users: searchable, sortable table of WorkCoPilot users. Inline tier edit and
// a grant-hours action, both superadmin-only (the server enforces it; the UI
// disables the controls and explains why for a non-superadmin admin). Also the
// support-only "Open as user" (impersonation) control for INDIVIDUAL users.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Clock, Lock, Plus, RotateCcw, Ban, UserPlus, Building2, DollarSign, ShieldOff, ShieldCheck, Trash2, Eye } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning, ReasonModal } from './_shared.jsx'
import { hmFromSeconds } from '../workadmin.css.js'

const COLUMNS = [
  { key: 'username', label: 'User', sortable: true },
  { key: 'tier', label: 'Tier', sortable: true },
  { key: 'companyName', label: 'Company & role', sortable: true },
  { key: 'freeLeftSeconds', label: 'Free left today', sortable: true },
  { key: 'purchasedSeconds', label: 'Purchased balance', sortable: true },
  { key: 'remainingSeconds', label: 'Total remaining', sortable: true },
  { key: 'sessionCount', label: 'Sessions', sortable: true },
  { key: 'mfa', label: '2FA', sortable: false },
  { key: 'actions', label: '', sortable: false },
]
const EMPTY_NEW = { username: '', email: '', password: '', companyId: '', companyRole: 'member', tier: 'basic', free: false }

export default function UsersSection({ isSuperAdmin, viewer }) {
  const [state, setState] = useState({ loading: true, error: null, users: [], tiers: [], companies: [] })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'username', dir: 'asc' })
  const [busyId, setBusyId] = useState(null)
  const [rowMsg, setRowMsg] = useState({})      // id -> { kind: 'ok'|'err', text }
  const [grantFor, setGrantFor] = useState(null) // id being granted
  const [grantHours, setGrantHours] = useState('1')
  const [companyFor, setCompanyFor] = useState(null) // id whose company is being edited
  const [showCreate, setShowCreate] = useState(false)
  const [nu, setNu] = useState(EMPTY_NEW)       // new-user form
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // { user, mode: 'disable'|'enable'|'delete' }
  const [caBusy, setCaBusy] = useState(false)
  const [caErr, setCaErr] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.users()
      setState({ loading: false, error: null, users: data.users || [], tiers: data.tiers || ['basic', 'advanced', 'premium'], companies: data.companies || [] })
    } catch (error) {
      setState({ loading: false, error, users: [], tiers: [], companies: [] })
    }
  }, [])

  // Create a WorkCoPilot account. Optionally drop it into a company as a member
  // or a company admin, set the tier, and grant free (comped) access.
  const createUser = async (e) => {
    e && e.preventDefault()
    const username = nu.username.trim()
    const email = (nu.email || '').trim()
    if (username.length < 2) { setCreateMsg({ kind: 'err', text: 'Enter a username (2+ characters).' }); return }
    if (nu.password && nu.password.length < 6) { setCreateMsg({ kind: 'err', text: 'A password must be at least 6 characters.' }); return }
    if (!nu.password && !email) { setCreateMsg({ kind: 'err', text: 'Add an email to send a set-password link, or set a password.' }); return }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setCreateMsg({ kind: 'err', text: 'Enter a valid email address.' }); return }
    setCreating(true); setCreateMsg(null)
    try {
      // When an email is given, the person is emailed a set-password link (even
      // if a password was also set here), so they choose their own credential.
      await workAdminApi.createUser({
        username, ...(nu.password ? { password: nu.password } : {}), ...(email ? { email } : {}),
        companyId: nu.companyId || null,
        companyRole: nu.companyId ? nu.companyRole : undefined,
        tier: nu.tier, free: !!nu.free,
      })
      setCreateMsg({ kind: 'ok', text: `Created ${username}${nu.companyId ? ` (${nu.companyRole === 'company_admin' ? 'company admin' : nu.companyRole === 'executive' ? 'executive' : 'member'})` : ''}.${email ? ` A set-password link was emailed to ${email}.` : ''}` })
      setNu(EMPTY_NEW)
      await load()
    } catch (error) {
      setCreateMsg({ kind: 'err', text: error.message || 'Could not create the user.' })
    } finally { setCreating(false) }
  }

  // Associate a user with a company (or clear it), and set their company role.
  const applyCompany = async (user, companyId, companyRole) => {
    setBusyId(user.id)
    try {
      await workAdminApi.userCompany(user.id, companyId || null, companyId ? companyRole : null)
      setMsg(user.id, 'ok', companyId ? `Moved to ${(state.companies.find((c) => c.id === companyId) || {}).name || 'company'}` : 'Removed from company')
      setCompanyFor(null)
      await load()
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not update the company')
    } finally { setBusyId(null) }
  }

  useEffect(() => { load() }, [load])

  // Support tool: open the dashboard AS this user (superadmin). Individual
  // users only - a company member is never impersonated (owner rule); the UI
  // hides the control for them and the server 400s regardless. One click is
  // enough: the server audits who viewed whom and when. On success the whole
  // browser moves to /work, where the app shows its "viewing as" banner.
  const openAsUser = async (user) => {
    setBusyId(user.id)
    try {
      await workAdminApi.impersonate(user.id)
      window.location.assign('/work')
      // Keep the row busy while the browser navigates away.
    } catch (error) {
      setMsg(user.id, 'err', error.message || 'Could not open the dashboard as this user')
      setBusyId(null)
    }
  }

  const setMsg = (id, kind, text) => {
    setRowMsg((m) => ({ ...m, [id]: { kind, text } }))
    setTimeout(() => setRowMsg((m) => { const n = { ...m }; delete n[id]; return n }), 4000)
  }
  // Every destructive / money / security action goes through the ONE shared
  // ReasonModal (owner standing rule: capture a reason + log who/what/when/why).
  // disable/enable/delete, plus refund, cancel-subscription, MFA reset and the
  // accounting-role grant/remove all open the same modal and pass the reason to
  // the API. `confirmAction = { user, mode }`.
  const runConfirmAction = async (reason) => {
    const { user, mode } = confirmAction
    setCaBusy(true); setCaErr(null)
    try {
      if (mode === 'delete') { await workAdminApi.deleteUser(user.id, reason); setConfirmAction(null); await load() }
      else if (mode === 'disable' || mode === 'enable') { await workAdminApi.disableUser(user.id, mode === 'disable', reason); setConfirmAction(null); await load() }
      else if (mode === 'refund') {
        const r = await workAdminApi.refundUser(user.id, { last: true, reason })
        const amt = r && r.refund ? (r.refund.amount / 100).toFixed(2) : null
        setConfirmAction(null)
        setMsg(user.id, 'ok', amt != null ? `Refunded ${amt} ${(r.refund.currency || 'usd').toUpperCase()}` : 'Refund processed')
      }
      else if (mode === 'cancel') { await workAdminApi.cancelUserSubscription(user.id, false, reason); setConfirmAction(null); setMsg(user.id, 'ok', 'Subscription canceled') }
      else if (mode === 'mfa') { await workAdminApi.resetUserMfa(user.id, reason); setConfirmAction(null); setMsg(user.id, 'ok', 'Two-factor reset.'); await load() }
      else if (mode === 'accounting-grant') { await workAdminApi.financeSetRole(user.id, 'accounting', reason); setConfirmAction(null); setMsg(user.id, 'ok', 'Accounting role granted.'); await load() }
      else if (mode === 'accounting-remove') { await workAdminApi.financeSetRole(user.id, 'user', reason); setConfirmAction(null); setMsg(user.id, 'ok', 'Accounting role removed.'); await load() }
    } catch (e) { setCaErr(e) } finally { setCaBusy(false) }
  }

  // Copy for each confirm mode (title / message / confirm button / danger tint).
  const CONFIRM_COPY = (mode, u) => {
    const name = (u && u.username) || 'this account'
    switch (mode) {
      case 'delete': return { title: `Delete ${name}`, message: 'Permanently delete this account and all of its sessions and evidence. This cannot be undone.', confirmLabel: 'Delete account', danger: true }
      case 'enable': return { title: `Re-enable ${name}`, message: 'The account can sign in and use the service again.', confirmLabel: 'Enable', danger: false }
      case 'disable': return { title: `Disable ${name}`, message: 'The account is signed out everywhere and cannot sign in until re-enabled.', confirmLabel: 'Disable', danger: true }
      case 'refund': return { title: `Refund ${name}`, message: 'Refund the most recent payment for this account. This moves real money and cannot be undone.', confirmLabel: 'Refund last payment', danger: true }
      case 'cancel': return { title: `Cancel subscription for ${name}`, message: 'End the subscription now. Their guiding access stops immediately.', confirmLabel: 'Cancel subscription', danger: true }
      case 'mfa': return { title: `Reset two-factor for ${name}`, message: 'They are signed out and must set up their authenticator again on next sign-in. Use this when someone loses their phone.', confirmLabel: 'Reset authenticator', danger: true }
      case 'accounting-grant': return { title: `Grant accounting role to ${name}`, message: 'They will see all transactions and can issue refunds, but nothing else in the admin console.', confirmLabel: 'Grant accounting', danger: false }
      case 'accounting-remove': return { title: `Remove accounting role from ${name}`, message: 'They lose access to transactions and refunds.', confirmLabel: 'Remove accounting', danger: false }
      default: return { title: 'Confirm', message: '', confirmLabel: 'Confirm', danger: true }
    }
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
        <button type="button" className="wka-btn sm primary" disabled={!isSuperAdmin} title={isSuperAdmin ? 'Create a new WorkCoPilot user' : 'Superadmin only'}
          onClick={() => { setShowCreate((v) => !v); setCreateMsg(null) }}>
          <UserPlus size={14} /> New user
        </button>
        <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{rows.length} of {state.users.length}</span>
      </div>

      {showCreate && isSuperAdmin && (
        <form className="wka-panel" onSubmit={createUser} style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}><UserPlus size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Create a user</h2>
          <p className="desc">Create a WorkCoPilot account. Optionally put them in a company as a member or a <b>company admin</b>, set the tier, and grant free (comped) access so they can use the service without Stripe.</p>
          <div className="wka-formgrid">
            <div className="wka-field"><label>Username</label><input className="wka-input" value={nu.username} onChange={(e) => setNu((f) => ({ ...f, username: e.target.value }))} placeholder="jordan" autoComplete="off" /></div>
            <div className="wka-field"><label>Email <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>(sends a set-password link)</span></label><input className="wka-input" type="email" value={nu.email} onChange={(e) => setNu((f) => ({ ...f, email: e.target.value }))} placeholder="jordan@acme.com" autoComplete="off" /></div>
            <div className="wka-field"><label>Temporary password <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>(optional)</span></label><input className="wka-input" type="text" value={nu.password} onChange={(e) => setNu((f) => ({ ...f, password: e.target.value }))} placeholder="leave blank - they set it from the email" autoComplete="off" /></div>
            <div className="wka-field"><label>Company (optional)</label>
              <select className="wka-select" value={nu.companyId} onChange={(e) => setNu((f) => ({ ...f, companyId: e.target.value }))}>
                <option value="">No company (individual user)</option>
                {state.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="wka-field"><label>Role in company</label>
              <select className="wka-select" value={nu.companyRole} disabled={!nu.companyId} onChange={(e) => setNu((f) => ({ ...f, companyRole: e.target.value }))}>
                <option value="member">Member</option>
                <option value="company_admin">Company admin</option>
                <option value="executive">Executive (productivity dashboard, read-only)</option>
              </select>
            </div>
            <div className="wka-field"><label>Tier</label>
              <select className="wka-select" value={nu.tier} onChange={(e) => setNu((f) => ({ ...f, tier: e.target.value }))}>
                {state.tiers.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="wka-field" style={{ justifyContent: 'flex-end' }}>
              <label className="wka-check"><input type="checkbox" checked={nu.free} onChange={(e) => setNu((f) => ({ ...f, free: e.target.checked }))} /> Free (comped) access, no Stripe needed</label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button type="submit" className="wka-btn primary" disabled={creating}>{creating ? <Spinning /> : <UserPlus size={14} />} Create user</button>
            <button type="button" className="wka-btn ghost" onClick={() => { setShowCreate(false); setNu(EMPTY_NEW); setCreateMsg(null) }}>Cancel</button>
            {createMsg ? <span style={{ fontSize: 13, color: createMsg.kind === 'ok' ? 'var(--wka-emerald)' : 'var(--wka-red)' }}>{createMsg.text}</span> : null}
          </div>
        </form>
      )}

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
                // The admin users payload reports role:'user' for every account
                // (the server roster drops the platform role), so `u.role !==
                // 'superadmin'` alone never hides a superadmin's own row. Fall
                // back to a viewer self-check so the signed-in admin is never
                // offered Open-as-user / Disable / Delete / Accounting on their
                // OWN account (the server rejects these regardless; this keeps
                // the UI honest rather than showing an action that will 400).
                const isSelf = !!viewer && String(u.username) === String(viewer.username)
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {u.username}
                        {u.disabled ? <span className="wka-badge" style={{ background: '#f6dcd9', color: '#c0392b' }}>Disabled</span> : null}
                      </div>
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
                    <td style={{ minWidth: 190 }}>
                      {companyFor === u.id ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select className="wka-select" defaultValue={u.companyId || ''} id={`co-${u.id}`} style={{ maxWidth: 150 }}>
                            <option value="">No company</option>
                            {state.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select className="wka-select" defaultValue={u.companyRole || 'member'} id={`cr-${u.id}`} style={{ maxWidth: 190 }}>
                            <option value="member">Member</option>
                            <option value="company_admin">Company admin</option>
                            <option value="executive">Executive (read-only)</option>
                          </select>
                          <button type="button" className="wka-btn sm primary" disabled={busyId === u.id}
                            onClick={() => { const cid = document.getElementById(`co-${u.id}`).value; const cr = document.getElementById(`cr-${u.id}`).value; applyCompany(u, cid, cr) }}>
                            {busyId === u.id ? <Spinning /> : 'Save'}
                          </button>
                          <button type="button" className="wka-btn sm ghost" onClick={() => setCompanyFor(null)}>Cancel</button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          {u.companyName ? (
                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                              <Building2 size={13} style={{ color: 'var(--wka-faint)' }} />
                              <span style={{ fontWeight: 600 }}>{u.companyName}</span>
                              {u.companyRole === 'company_admin' ? <span className="wka-badge active">admin</span> : u.companyRole === 'executive' ? <span className="wka-badge active">executive</span> : <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>member</span>}
                            </span>
                          ) : <span style={{ color: 'var(--wka-faint)', fontSize: 13 }}>Individual</span>}
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin} title={isSuperAdmin ? 'Set company & role' : 'Superadmin only'} onClick={() => setCompanyFor(u.id)}>Change</button>
                        </span>
                      )}
                    </td>
                    <td className="wka-mono">{hmFromSeconds(u.freeLeftSeconds)}
                      {u.exhausted ? <span className="wka-badge exhausted" style={{ marginLeft: 8 }}>exhausted</span> : null}
                    </td>
                    <td className="wka-mono">{hmFromSeconds(u.purchasedSeconds)}</td>
                    <td className="wka-mono">{hmFromSeconds(u.remainingSeconds)}</td>
                    <td className="wka-mono">{u.sessionCount}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {u.mfa && u.mfa.enabled
                        ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Lock size={12} /> On
                            <button type="button" className="wka-btn sm ghost" title={isSuperAdmin ? 'Reset authenticator (lost phone / offboarding)' : 'Superadmin only'} disabled={!isSuperAdmin || busyId === u.id} onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'mfa' }) }} style={{ marginLeft: 4 }}><RotateCcw size={12} /></button>
                          </span>
                        : <span style={{ color: 'var(--wka-amber, #c77700)' }}>Not set up</span>}
                    </td>
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
                          {/* Individual = no company (u.companyId is null in the list payload). Company members never get this control. */}
                          {isSuperAdmin && u.role !== 'superadmin' && !u.companyId && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={busyId === u.id}
                              title="Open the dashboard as this user (support view; recorded in the audit trail)"
                              onClick={() => openAsUser(u)}
                              style={{ color: 'var(--wka-accent-dark)', borderColor: 'var(--wka-accent-line)', whiteSpace: 'nowrap' }}>
                              {busyId === u.id ? <Spinning /> : <Eye size={13} />} Open as user
                            </button>
                          )}
                          <button type="button" className="wka-btn sm" disabled={!isSuperAdmin} title={isSuperAdmin ? 'Grant purchased hours' : 'Superadmin only'}
                            onClick={() => { setGrantFor(u.id); setGrantHours('1') }}>
                            <Plus size={13} /> <Clock size={13} /> Grant hours
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? 'Refund the most recent payment' : 'Superadmin only'}
                            onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'refund' }) }}>
                            <RotateCcw size={13} /> Refund last
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? 'Cancel the subscription now' : 'Superadmin only'}
                            onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'cancel' }) }}>
                            <Ban size={13} /> Cancel sub
                          </button>
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className={`wka-btn sm${u.role === 'accounting' ? '' : ' ghost'}`} disabled={!isSuperAdmin || busyId === u.id} title={u.role === 'accounting' ? 'Remove the accounting role' : 'Make accounting (sees all transactions + refunds)'}
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: u.role === 'accounting' ? 'accounting-remove' : 'accounting-grant' }) }}>
                              <DollarSign size={13} /> {u.role === 'accounting' ? 'Accounting ✓' : 'Accounting'}
                            </button>
                          )}
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id}
                              title={u.disabled ? 'Re-enable this account' : 'Disable this account (signs them out, blocks sign-in)'}
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: u.disabled ? 'enable' : 'disable' }) }}
                              style={u.disabled ? { color: 'var(--wka-emerald)' } : undefined}>
                              {u.disabled ? <ShieldCheck size={13} /> : <ShieldOff size={13} />} {u.disabled ? 'Enable' : 'Disable'}
                            </button>
                          )}
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id}
                              title="Delete this account and its sessions permanently"
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'delete' }) }}
                              style={{ color: '#d6433b' }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          )}
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

      {confirmAction ? (() => {
        const copy = CONFIRM_COPY(confirmAction.mode, confirmAction.user)
        return (
          <ReasonModal
            danger={copy.danger}
            title={copy.title}
            message={copy.message}
            confirmLabel={copy.confirmLabel}
            busy={caBusy} error={caErr}
            onConfirm={runConfirmAction}
            onCancel={() => { if (!caBusy) setConfirmAction(null) }}
          />
        )
      })() : null}
    </div>
  )
}
