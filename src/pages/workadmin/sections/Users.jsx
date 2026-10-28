// Users: searchable, sortable table of WorkCoPilot users. Inline tier edit and
// a grant-hours action, both superadmin-only (the server enforces it; the UI
// disables the controls and explains why for a non-superadmin admin). Also the
// support-only "Open as user" (impersonation) control for INDIVIDUAL users.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Clock, Lock, Plus, RotateCcw, Ban, UserPlus, Building2, DollarSign, ShieldOff, ShieldCheck, Trash2, Eye, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning, ReasonModal } from './_shared.jsx'
import { hmFromSeconds } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'
// Company roles + work flows come from the ONE registry (ids, order, i18n
// keys), shared with the company console and the app shell (SUPREME RULE II).
import { COMPANY_ROLE_OPTIONS, WORK_FLOW_OPTIONS, roleLabelKey, normalizeFlow } from '../../../shared/work_roles_options.js'

const COLUMNS = [
  { key: 'username', labelKey: 'columns.user', sortable: true },
  { key: 'tier', labelKey: 'columns.tier', sortable: true },
  { key: 'companyName', labelKey: 'columns.company', sortable: true },
  // Plan model: `usedSeconds` is what the person consumed TODAY from every
  // source; `freeLeftSeconds` is the included plan hours left THIS MONTH (the
  // admin users payload maps it from usage.freeLeft). There is no daily
  // denominator any more, so none is shown.
  { key: 'usedSeconds', labelKey: 'columns.usedToday', sortable: true },
  { key: 'freeLeftSeconds', labelKey: 'columns.planLeft', sortable: true },
  { key: 'purchasedSeconds', labelKey: 'columns.purchased', sortable: true },
  { key: 'remainingSeconds', labelKey: 'columns.remaining', sortable: true },
  { key: 'sessionCount', labelKey: 'columns.sessions', sortable: true },
  { key: 'mfa', labelKey: 'columns.mfa', sortable: false },
  { key: 'actions', labelKey: null, sortable: false },
]
const EMPTY_NEW = { username: '', email: '', password: '', companyId: '', companyRole: 'member', workFlow: 'independent', tier: 'basic', free: false }

export default function UsersSection({ isSuperAdmin, viewer }) {
  const t = useT()
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
    if (username.length < 2) { setCreateMsg({ kind: 'err', text: t('usersAdmin.createMsg.usernameMin') }); return }
    if (nu.password && nu.password.length < 6) { setCreateMsg({ kind: 'err', text: t('usersAdmin.createMsg.passwordMin') }); return }
    if (!nu.password && !email) { setCreateMsg({ kind: 'err', text: t('usersAdmin.createMsg.emailOrPassword') }); return }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setCreateMsg({ kind: 'err', text: t('usersAdmin.createMsg.emailInvalid') }); return }
    setCreating(true); setCreateMsg(null)
    try {
      // When an email is given, the person is emailed a set-password link (even
      // if a password was also set here), so they choose their own credential.
      const created = await workAdminApi.createUser({
        username, ...(nu.password ? { password: nu.password } : {}), ...(email ? { email } : {}),
        companyId: nu.companyId || null,
        companyRole: nu.companyId ? nu.companyRole : undefined,
        tier: nu.tier, free: !!nu.free,
      })
      // The create route takes role + tier; the work flow is set through the
      // same set-company endpoint the row editor uses (one writer for the flow).
      const cid = created && created.id
      if (cid && nu.companyId && normalizeFlow(nu.workFlow) !== 'independent') await workAdminApi.userCompany(cid, nu.companyId, nu.companyRole, nu.workFlow)
      const roleWord = t(roleLabelKey(nu.companyRole)).toLowerCase()
      const companySuffix = nu.companyId ? ` (${roleWord}, ${t(WORK_FLOW_OPTIONS.find((o) => o.id === normalizeFlow(nu.workFlow)).labelKey).toLowerCase()})` : ''
      const emailSuffix = email ? ` ${t('usersAdmin.createMsg.setPasswordEmailed', { email })}` : ''
      setCreateMsg({ kind: 'ok', text: t('usersAdmin.createMsg.created', { username, companySuffix, emailSuffix }) })
      setNu(EMPTY_NEW)
      await load()
    } catch (error) {
      setCreateMsg({ kind: 'err', text: error.message || t('usersAdmin.createMsg.couldNotCreate') })
    } finally { setCreating(false) }
  }

  // Associate a user with a company (or clear it), and set their company role.
  const applyCompany = async (user, companyId, companyRole, workFlow) => {
    setBusyId(user.id)
    try {
      await workAdminApi.userCompany(user.id, companyId || null, companyId ? companyRole : null, companyId ? normalizeFlow(workFlow) : null)
      setMsg(user.id, 'ok', companyId ? t('usersAdmin.toasts.movedTo', { name: (state.companies.find((c) => c.id === companyId) || {}).name || t('usersAdmin.toasts.companyFallback') }) : t('usersAdmin.toasts.removedFromCompany'))
      setCompanyFor(null)
      await load()
    } catch (error) {
      setMsg(user.id, 'err', error.message || t('usersAdmin.toasts.couldNotUpdateCompany'))
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
      setMsg(user.id, 'err', error.message || t('usersAdmin.toasts.couldNotOpenAsUser'))
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
        setMsg(user.id, 'ok', amt != null ? t('usersAdmin.toasts.refunded', { amt, currency: (r.refund.currency || 'usd').toUpperCase() }) : t('usersAdmin.toasts.refundProcessed'))
      }
      else if (mode === 'cancel') { await workAdminApi.cancelUserSubscription(user.id, false, reason); setConfirmAction(null); setMsg(user.id, 'ok', t('usersAdmin.toasts.subscriptionCanceled')) }
      else if (mode === 'mfa') { await workAdminApi.resetUserMfa(user.id, reason); setConfirmAction(null); setMsg(user.id, 'ok', t('usersAdmin.toasts.twoFactorReset')); await load() }
      else if (mode === 'accounting-grant') { await workAdminApi.financeSetRole(user.id, 'accounting', reason); setConfirmAction(null); setMsg(user.id, 'ok', t('usersAdmin.toasts.accountingGranted')); await load() }
      else if (mode === 'accounting-remove') { await workAdminApi.financeSetRole(user.id, 'user', reason); setConfirmAction(null); setMsg(user.id, 'ok', t('usersAdmin.toasts.accountingRemoved')); await load() }
    } catch (e) { setCaErr(e) } finally { setCaBusy(false) }
  }

  // Copy for each confirm mode (title / message / confirm button / danger tint).
  const CONFIRM_COPY = (mode, u) => {
    const name = (u && u.username) || t('usersAdmin.confirm.nameFallback')
    switch (mode) {
      case 'delete': return { title: t('usersAdmin.confirm.deleteTitle', { name }), message: t('usersAdmin.confirm.deleteMessage'), confirmLabel: t('usersAdmin.confirm.deleteConfirm'), danger: true }
      case 'enable': return { title: t('usersAdmin.confirm.enableTitle', { name }), message: t('usersAdmin.confirm.enableMessage'), confirmLabel: t('usersAdmin.confirm.enableConfirm'), danger: false }
      case 'disable': return { title: t('usersAdmin.confirm.disableTitle', { name }), message: t('usersAdmin.confirm.disableMessage'), confirmLabel: t('usersAdmin.confirm.disableConfirm'), danger: true }
      case 'refund': return { title: t('usersAdmin.confirm.refundTitle', { name }), message: t('usersAdmin.confirm.refundMessage'), confirmLabel: t('usersAdmin.confirm.refundConfirm'), danger: true }
      case 'cancel': return { title: t('usersAdmin.confirm.cancelTitle', { name }), message: t('usersAdmin.confirm.cancelMessage'), confirmLabel: t('usersAdmin.confirm.cancelConfirm'), danger: true }
      case 'mfa': return { title: t('usersAdmin.confirm.mfaTitle', { name }), message: t('usersAdmin.confirm.mfaMessage'), confirmLabel: t('usersAdmin.confirm.mfaConfirm'), danger: true }
      case 'accounting-grant': return { title: t('usersAdmin.confirm.accountingGrantTitle', { name }), message: t('usersAdmin.confirm.accountingGrantMessage'), confirmLabel: t('usersAdmin.confirm.accountingGrantConfirm'), danger: false }
      case 'accounting-remove': return { title: t('usersAdmin.confirm.accountingRemoveTitle', { name }), message: t('usersAdmin.confirm.accountingRemoveMessage'), confirmLabel: t('usersAdmin.confirm.accountingRemoveConfirm'), danger: false }
      default: return { title: t('usersAdmin.confirm.defaultTitle'), message: '', confirmLabel: t('usersAdmin.confirm.defaultConfirm'), danger: true }
    }
  }

  const applyTier = async (user, tier) => {
    if (tier === user.tier) return
    setBusyId(user.id)
    try {
      const usage = await workAdminApi.setTier(user.id, tier)
      setState((s) => ({ ...s, users: s.users.map((u) => u.id === user.id ? { ...u, ...usage } : u) }))
      setMsg(user.id, 'ok', t('usersAdmin.toasts.tierSet', { tier }))
    } catch (error) {
      setMsg(user.id, 'err', error.message || t('usersAdmin.toasts.couldNotChangeTier'))
    } finally { setBusyId(null) }
  }

  // Superadmin: grant/revoke free (comped) PREMIUM access for an INDIVIDUAL user.
  // This wires the existing comp mechanism (userFreeAccess -> subscription.status
  // = 'comp'), which is what actually UNLOCKS guidance. Changing the tier alone
  // does not grant access, so without this control a standalone user stays on the
  // "choose a plan" gate. Company members are covered by their company seat.
  const toggleFree = async (user) => {
    if (!isSuperAdmin) return
    setBusyId(user.id)
    try {
      await workAdminApi.userFreeAccess(user.id, !user.free)
      setMsg(user.id, 'ok', user.free ? t('usersAdmin.toasts.freeRevoked') : t('usersAdmin.toasts.freeGranted'))
      await load()
    } catch (error) {
      setMsg(user.id, 'err', error.message || t('usersAdmin.toasts.couldNotChangeFree'))
    } finally { setBusyId(null) }
  }
  const applyGrant = async (user) => {
    const hours = Number(grantHours)
    if (!isFinite(hours) || hours <= 0) { setMsg(user.id, 'err', t('usersAdmin.toasts.grantHoursPositive')); return }
    setBusyId(user.id)
    try {
      const usage = await workAdminApi.grantHours(user.id, hours)
      setState((s) => ({ ...s, users: s.users.map((u) => u.id === user.id ? { ...u, ...usage } : u) }))
      setMsg(user.id, 'ok', t('usersAdmin.toasts.granted', { hours }))
      setGrantFor(null); setGrantHours('1')
    } catch (error) {
      setMsg(user.id, 'err', error.message || t('usersAdmin.toasts.couldNotGrantHours'))
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

  if (state.loading) return <Loading label={t('usersAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  return (
    <div>
      {!isSuperAdmin ? (
        <div className="wka-note"><Lock size={14} /> {t('usersAdmin.viewOnlyNote')}</div>
      ) : null}
      <div className="wka-toolbar">
        <div className="wka-inline-money wka-search" style={{ maxWidth: 360 }}>
          <span className="sym"><Search size={14} /></span>
          <input className="wka-input" style={{ paddingLeft: 30, width: '100%' }} placeholder={t('usersAdmin.searchPlaceholder')}
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className="wka-btn sm primary" disabled={!isSuperAdmin} title={isSuperAdmin ? t('usersAdmin.newUserTitle') : t('usersAdmin.superadminOnly')}
          onClick={() => { setShowCreate((v) => !v); setCreateMsg(null) }}>
          <UserPlus size={14} /> {t('usersAdmin.newUser')}
        </button>
        <span className="wka-spacer" />
        <span style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{t('usersAdmin.countOf', { shown: rows.length, total: state.users.length })}</span>
      </div>

      {showCreate && isSuperAdmin && (
        <form className="wka-panel" onSubmit={createUser}>
          <h2><UserPlus size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('usersAdmin.create.heading')}</h2>
          <p className="desc">{t.rich('usersAdmin.create.desc')}</p>
          <div className="wka-formgrid">
            <div className="wka-field"><label>{t('usersAdmin.create.username')}</label><input className="wka-input" value={nu.username} onChange={(e) => setNu((f) => ({ ...f, username: e.target.value }))} placeholder={t('usersAdmin.create.usernamePlaceholder')} autoComplete="off" /></div>
            <div className="wka-field"><label>{t('usersAdmin.create.email')} <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>{t('usersAdmin.create.emailHint')}</span></label><input className="wka-input" type="email" value={nu.email} onChange={(e) => setNu((f) => ({ ...f, email: e.target.value }))} placeholder={t('usersAdmin.create.emailPlaceholder')} autoComplete="off" /></div>
            <div className="wka-field"><label>{t('usersAdmin.create.tempPassword')} <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>{t('usersAdmin.create.tempPasswordHint')}</span></label><input className="wka-input" type="text" value={nu.password} onChange={(e) => setNu((f) => ({ ...f, password: e.target.value }))} placeholder={t('usersAdmin.create.tempPasswordPlaceholder')} autoComplete="off" /></div>
            <div className="wka-field"><label>{t('usersAdmin.create.company')}</label>
              <select className="wka-select" value={nu.companyId} onChange={(e) => setNu((f) => ({ ...f, companyId: e.target.value }))}>
                <option value="">{t('usersAdmin.create.noCompanyOption')}</option>
                {state.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="wka-field"><label>{t('usersAdmin.create.roleInCompany')}</label>
              <select className="wka-select" value={nu.companyRole} disabled={!nu.companyId} onChange={(e) => setNu((f) => ({ ...f, companyRole: e.target.value }))}>
                {COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
              </select>
            </div>
            <div className="wka-field"><label>{t('usersAdmin.create.flowInCompany')} <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>{t('usersAdmin.create.flowHint')}</span></label>
              <select className="wka-select" value={nu.workFlow} disabled={!nu.companyId} onChange={(e) => setNu((f) => ({ ...f, workFlow: e.target.value }))} aria-label={t('usersAdmin.create.flowInCompany')}>
                {WORK_FLOW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
              </select>
            </div>
            <div className="wka-field"><label>{t('usersAdmin.create.tier')}</label>
              <select className="wka-select" value={nu.tier} onChange={(e) => setNu((f) => ({ ...f, tier: e.target.value }))}>
                {state.tiers.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="wka-field" style={{ justifyContent: 'flex-end' }}>
              <label className="wka-check"><input type="checkbox" checked={nu.free} onChange={(e) => setNu((f) => ({ ...f, free: e.target.checked }))} /> {t('usersAdmin.create.freeCheckbox')}</label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button type="submit" className="wka-btn primary" disabled={creating}>{creating ? <Spinning /> : <UserPlus size={14} />} {t('usersAdmin.create.submit')}</button>
            <button type="button" className="wka-btn ghost" onClick={() => { setShowCreate(false); setNu(EMPTY_NEW); setCreateMsg(null) }}><X size={14} /> {t('usersAdmin.create.cancel')}</button>
            {createMsg ? <span style={{ fontSize: 13, color: createMsg.kind === 'ok' ? 'var(--wka-emerald)' : 'var(--wka-red)' }}>{createMsg.text}</span> : null}
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState title={t('usersAdmin.empty.title')} detail={query ? t('usersAdmin.empty.detailSearch') : t('usersAdmin.empty.detailNone')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.sortable ? '' : 'no-sort'} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                    {c.labelKey ? t('usersAdmin.' + c.labelKey) : ''}{c.sortable && sort.key === c.key ? <span className="arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null}
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
                        {u.disabled ? <span className="wka-badge disabled">{t('usersAdmin.disabledBadge')}</span> : null}
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
                            <option value="">{t('usersAdmin.companyEdit.noCompany')}</option>
                            {state.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <select className="wka-select" defaultValue={u.companyRole || 'member'} id={`cr-${u.id}`} style={{ maxWidth: 190 }} aria-label={t('usersAdmin.create.roleInCompany')}>
                            {COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
                          </select>
                          <select className="wka-select" defaultValue={normalizeFlow(u.workFlow)} id={`wf-${u.id}`} style={{ maxWidth: 150 }} aria-label={t('usersAdmin.companyEdit.flow')} title={t('usersAdmin.companyEdit.flowTitle')}>
                            {WORK_FLOW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
                          </select>
                          <button type="button" className="wka-btn sm primary" disabled={busyId === u.id}
                            onClick={() => { const cid = document.getElementById(`co-${u.id}`).value; const cr = document.getElementById(`cr-${u.id}`).value; const wf = document.getElementById(`wf-${u.id}`).value; applyCompany(u, cid, cr, wf) }}>
                            {busyId === u.id ? <Spinning /> : t('usersAdmin.companyEdit.save')}
                          </button>
                          <button type="button" className="wka-btn sm ghost" onClick={() => setCompanyFor(null)}>{t('usersAdmin.companyEdit.cancel')}</button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          {u.companyName ? (
                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                              <Building2 size={13} style={{ color: 'var(--wka-faint)' }} />
                              <span style={{ fontWeight: 600 }}>{u.companyName}</span>
                              {u.companyRole && u.companyRole !== 'member'
                                ? <span className="wka-badge active">{t(roleLabelKey(u.companyRole))}</span>
                                : <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{t('usersAdmin.companyRole.member')}</span>}
                              {u.workFlow && normalizeFlow(u.workFlow) !== 'independent' ? <span className="wka-badge" title={t('usersAdmin.companyEdit.flowTitle')}>{t(WORK_FLOW_OPTIONS.find((o) => o.id === normalizeFlow(u.workFlow)).labelKey)}</span> : null}
                            </span>
                          ) : <span style={{ color: 'var(--wka-faint)', fontSize: 13 }}>{t('usersAdmin.individual')}</span>}
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin} title={isSuperAdmin ? t('usersAdmin.changeCompanyTitle') : t('usersAdmin.superadminOnly')} onClick={() => setCompanyFor(u.id)}>{t('usersAdmin.change')}</button>
                        </span>
                      )}
                    </td>
                    <td className="wka-mono">{hmFromSeconds(u.usedSeconds)}</td>
                    <td className="wka-mono" title={t('usersAdmin.planLeftTitle')}>{hmFromSeconds(u.freeLeftSeconds)}</td>
                    <td className="wka-mono">{hmFromSeconds(u.purchasedSeconds)}</td>
                    <td className="wka-mono">{hmFromSeconds(u.remainingSeconds)}
                      {u.exhausted ? <span className="wka-badge exhausted" style={{ marginLeft: 8 }}>{t('usersAdmin.exhausted')}</span> : null}
                    </td>
                    <td className="wka-mono">{u.sessionCount}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {u.mfa && u.mfa.enabled
                        ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Lock size={12} /> {t('usersAdmin.mfaOn')}
                            <button type="button" className="wka-btn sm ghost" title={isSuperAdmin ? t('usersAdmin.mfaResetTitle') : t('usersAdmin.superadminOnly')} disabled={!isSuperAdmin || busyId === u.id} onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'mfa' }) }} style={{ marginLeft: 4 }}><RotateCcw size={12} /></button>
                          </span>
                        : <span style={{ color: 'var(--wka-amber)' }}>{t('usersAdmin.mfaNotSet')}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {grantFor === u.id ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input className="wka-input" style={{ width: 70, padding: '6px 8px' }} type="number" min="0" step="0.5"
                            value={grantHours} onChange={(e) => setGrantHours(e.target.value)} aria-label={t('usersAdmin.actions.hoursAriaLabel')} />
                          <button type="button" className="wka-btn sm primary" disabled={busyId === u.id} onClick={() => applyGrant(u)}>
                            {busyId === u.id ? <Spinning /> : t('usersAdmin.actions.add')}
                          </button>
                          <button type="button" className="wka-btn sm ghost" onClick={() => { setGrantFor(null); setGrantHours('1') }}>{t('usersAdmin.actions.cancel')}</button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* Individual = no company (u.companyId is null in the list payload). Company members never get this control. */}
                          {isSuperAdmin && u.role !== 'superadmin' && !u.companyId && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={busyId === u.id}
                              title={t('usersAdmin.actions.openAsUserTitle')}
                              onClick={() => openAsUser(u)}
                              style={{ color: 'var(--wka-accent-dark)', borderColor: 'var(--wka-accent-line)', whiteSpace: 'nowrap' }}>
                              {busyId === u.id ? <Spinning /> : <Eye size={13} />} {t('usersAdmin.actions.openAsUser')}
                            </button>
                          )}
                          {isSuperAdmin && u.role !== 'superadmin' && !u.companyId && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={busyId === u.id}
                              title={u.free ? t('usersAdmin.actions.freeAccessOnTitle') : t('usersAdmin.actions.freeAccessGrantTitle')}
                              onClick={() => toggleFree(u)}
                              style={{ color: u.free ? 'var(--wka-emerald)' : undefined, whiteSpace: 'nowrap' }}>
                              {busyId === u.id ? <Spinning /> : (u.free ? t('usersAdmin.actions.freeAccessOn') : t('usersAdmin.actions.freeAccessGrant'))}
                            </button>
                          )}
                          <button type="button" className="wka-btn sm" disabled={!isSuperAdmin} title={isSuperAdmin ? t('usersAdmin.actions.grantHoursTitle') : t('usersAdmin.superadminOnly')}
                            onClick={() => { setGrantFor(u.id); setGrantHours('1') }}>
                            <Plus size={13} /> <Clock size={13} /> {t('usersAdmin.actions.grantHours')}
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? t('usersAdmin.actions.refundLastTitle') : t('usersAdmin.superadminOnly')}
                            onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'refund' }) }}>
                            <RotateCcw size={13} /> {t('usersAdmin.actions.refundLast')}
                          </button>
                          <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id} title={isSuperAdmin ? t('usersAdmin.actions.cancelSubTitle') : t('usersAdmin.superadminOnly')}
                            onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'cancel' }) }}>
                            <Ban size={13} /> {t('usersAdmin.actions.cancelSub')}
                          </button>
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className={`wka-btn sm${u.role === 'accounting' ? '' : ' ghost'}`} disabled={!isSuperAdmin || busyId === u.id} title={u.role === 'accounting' ? t('usersAdmin.actions.accountingRemoveTitle') : t('usersAdmin.actions.accountingGrantTitle')}
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: u.role === 'accounting' ? 'accounting-remove' : 'accounting-grant' }) }}>
                              <DollarSign size={13} /> {u.role === 'accounting' ? t('usersAdmin.actions.accountingOn') : t('usersAdmin.actions.accounting')}
                            </button>
                          )}
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id}
                              title={u.disabled ? t('usersAdmin.actions.enableTitle') : t('usersAdmin.actions.disableTitle')}
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: u.disabled ? 'enable' : 'disable' }) }}
                              style={u.disabled ? { color: 'var(--wka-emerald)' } : undefined}>
                              {u.disabled ? <ShieldCheck size={13} /> : <ShieldOff size={13} />} {u.disabled ? t('usersAdmin.actions.enable') : t('usersAdmin.actions.disable')}
                            </button>
                          )}
                          {u.role !== 'superadmin' && !isSelf && (
                            <button type="button" className="wka-btn sm ghost" disabled={!isSuperAdmin || busyId === u.id}
                              title={t('usersAdmin.actions.deleteTitle')}
                              onClick={() => { setCaErr(null); setConfirmAction({ user: u, mode: 'delete' }) }}
                              style={{ color: 'var(--wka-red)' }}>
                              <Trash2 size={13} /> {t('usersAdmin.actions.delete')}
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
