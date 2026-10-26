// Affiliates: the affiliate program's admin surface. Review applications
// (approve with a rate / reject with a reason), suspend + reinstate, edit a
// rate inline, run a Stripe Connect payout, and open the referral ledger per
// affiliate. The "Program settings" card edits the global config (enabled,
// default commission %, minimum payout, cookie window). Endpoints are gated
// server-side (superadmin or affiliate_admin); settings are superadmin-only.
// Every mutation reloads the list; every error is surfaced, never swallowed.
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  RefreshCw, Check, X, Eye, EyeOff, Pencil, Ban, PlayCircle, Banknote, UserCheck,
  Settings2, ExternalLink, AlertTriangle, Info,
} from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal, SavedTag, StepUpPrompt, isLockError, RecRow, EditToggle } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const pct = (r) => (r == null || r === '' ? '-' : `${Number(r)}%`)
const STATUSES = [['', 'affiliatesAdmin.status.all'], ['pending', 'affiliatesAdmin.status.pending'], ['approved', 'affiliatesAdmin.status.approved'], ['suspended', 'affiliatesAdmin.status.suspended'], ['rejected', 'affiliatesAdmin.status.rejected']]
// Social keys as the public apply form posts them (socials: { tiktok, ... }).
const SOCIAL_LABELS = [['tiktok', 'affiliatesAdmin.social.tiktok'], ['instagram', 'affiliatesAdmin.social.instagram'], ['youtube', 'affiliatesAdmin.social.youtube'], ['twitter', 'affiliatesAdmin.social.twitter'], ['facebook', 'affiliatesAdmin.social.facebook'], ['linkedin', 'affiliatesAdmin.social.linkedin'], ['other', 'affiliatesAdmin.social.other']]

function statusBadge(s, t) {
  const k = String(s || '').toLowerCase()
  if (k === 'approved') return <span className="wka-badge active">{t('affiliatesAdmin.badge.approved')}</span>
  if (k === 'pending') return <span className="wka-badge paused">{t('affiliatesAdmin.badge.pending')}</span>
  if (k === 'suspended') return <span className="wka-badge exhausted">{t('affiliatesAdmin.badge.suspended')}</span>
  if (k === 'rejected') return <span className="wka-badge ended">{t('affiliatesAdmin.badge.rejected')}</span>
  return <span className="wka-badge">{k || '-'}</span>
}

function stripeBadge(a, t) {
  if (a.stripeOnboarded) return <span className="wka-badge active" title={t('affiliatesAdmin.stripe.onboardedTitle')}>{t('affiliatesAdmin.stripe.onboarded')}</span>
  if (a.stripeConnected) return <span className="wka-badge paused" title={t('affiliatesAdmin.stripe.incompleteTitle')}>{t('affiliatesAdmin.stripe.incomplete')}</span>
  return <span className="wka-badge ended" title={t('affiliatesAdmin.stripe.notSetUpTitle')}>{t('affiliatesAdmin.stripe.notSetUp')}</span>
}

function siteHref(w) {
  const s = String(w || '').trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

// Shared modal shell (same look as the admin ReasonModal / Sessions detail).
function Modal({ title, icon, onClose, busy, children, maxWidth = 460 }) {
  const t = useT()
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="wka-panel" style={{ maxWidth, width: '100%', position: 'relative', marginBottom: 0 }}>
        <button type="button" aria-label={t('affiliatesAdmin.modal.close')} onClick={() => !busy && onClose()}
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wka-faint)' }}>
          <X size={18} />
        </button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon} {title}</h2>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------- Program settings */
function toForm(c) {
  return {
    enabled: c ? !!c.enabled : true,
    defaultRatePct: c && c.defaultRatePct != null ? String(c.defaultRatePct) : '',
    minPayoutUsd: c && c.minPayoutUsd != null ? String(c.minPayoutUsd) : '',
    cookieDays: c && c.cookieDays != null ? String(c.cookieDays) : '',
  }
}

// UX: like every other saved setting in the console, the card COLLAPSES to a
// read-only record once a config exists; Edit reopens the form, Cancel reverts
// to the last-saved values, Save collapses it again.
function ProgramSettings({ config, isSuperAdmin, onSaved }) {
  const t = useT()
  const [form, setForm] = useState(() => toForm(config))
  const [editing, setEditing] = useState(() => !config)   // nothing saved yet -> open the form
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { setForm(toForm(config)) }, [config])
  const base = toForm(config)
  const dirty = Object.keys(base).some((k) => String(base[k]) !== String(form[k]))
  const set = (k, v) => { setSaved(false); setErr(null); setForm((f) => ({ ...f, [k]: v })) }
  const num = (v, lo, hi) => { const n = Number(v); return v !== '' && isFinite(n) && n >= lo && n <= hi ? n : null }

  const save = async () => {
    if (saving) return   // editable by whoever can see this section (superadmin or affiliate admin)
    const rate = num(form.defaultRatePct, 0, 100), min = num(form.minPayoutUsd, 0, 1e6), days = num(form.cookieDays, 1, 365)
    if (rate == null) { setErr(new Error(t('affiliatesAdmin.settings.errRate'))); return }
    if (min == null) { setErr(new Error(t('affiliatesAdmin.settings.errMin'))); return }
    if (days == null) { setErr(new Error(t('affiliatesAdmin.settings.errDays'))); return }
    setSaving(true); setErr(null)
    try {
      await workAdminApi.setAffiliateConfig({ enabled: !!form.enabled, defaultRatePct: rate, minPayoutUsd: min, cookieDays: days })
      setSaved(true); setEditing(false)   // collapse back to the record
      onSaved()
    } catch (e) { setErr(e) } finally { setSaving(false) }
  }
  const cancel = () => { setForm(toForm(config)); setErr(null); setEditing(false) }

  const ro = saving
  const c = config || {}
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Settings2 size={16} style={{ color: 'var(--wka-accent)' }} /> {t('affiliatesAdmin.settings.title')}</h2>
        {!editing ? <EditToggle editing={editing} onEdit={() => { setForm(toForm(config)); setErr(null); setSaved(false); setEditing(true) }} /> : null}
      </div>
      <p className="desc" style={{ marginTop: 6 }}>{t('affiliatesAdmin.settings.desc')}</p>

      {!editing ? (
        <>
          <div className="wka-record">
            <RecRow label={t('affiliatesAdmin.settings.applications')} value={c.enabled !== false ? t('affiliatesAdmin.settings.applicationsOpen') : t('affiliatesAdmin.settings.applicationsClosed')} />
            <RecRow label={t('affiliatesAdmin.settings.defaultCommission')} value={c.defaultRatePct != null ? t('affiliatesAdmin.settings.rateOfFirstPayment', { rate: c.defaultRatePct }) : t('affiliatesAdmin.settings.notSet')} />
            <RecRow label={t('affiliatesAdmin.settings.minPayout')} value={c.minPayoutUsd != null ? money(c.minPayoutUsd) : t('affiliatesAdmin.settings.notSet')} />
            <RecRow label={t('affiliatesAdmin.settings.cookieWindow')} value={c.cookieDays != null ? t.n('affiliatesAdmin.settings.days', Number(c.cookieDays), { n: c.cookieDays }) : t('affiliatesAdmin.settings.notSet')} />
          </div>
          <SavedTag show={saved} />
        </>
      ) : (
      <>
      <div className={`wka-toggle${form.enabled ? ' on' : ''}${ro ? ' disabled' : ''}`} role="switch" aria-checked={form.enabled}
        onClick={() => !ro && set('enabled', !form.enabled)} style={{ marginBottom: 16 }}>
        <span className="track"><span className="knob" /></span>
        <span style={{ fontWeight: 600 }}>{form.enabled ? t('affiliatesAdmin.settings.toggleOpen') : t('affiliatesAdmin.settings.toggleClosed')}</span>
      </div>

      <div className="wka-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="wka-field">
          <label htmlFor="afc-rate">{t('affiliatesAdmin.settings.rateLabel')}</label>
          <div className="wka-inline-money"><input id="afc-rate" className="wka-input" inputMode="decimal" value={form.defaultRatePct} disabled={ro} onChange={(e) => set('defaultRatePct', e.target.value)} placeholder="20" /><span className="sym" style={{ left: 'auto', right: 11 }}>%</span></div>
          <span className="hint">{t('affiliatesAdmin.settings.rateHint')}</span>
        </div>
        <div className="wka-field">
          <label htmlFor="afc-min">{t('affiliatesAdmin.settings.minPayout')}</label>
          <div className="wka-inline-money"><span className="sym">$</span><input id="afc-min" className="wka-input" inputMode="decimal" value={form.minPayoutUsd} disabled={ro} onChange={(e) => set('minPayoutUsd', e.target.value)} placeholder="50" /></div>
          <span className="hint">{t('affiliatesAdmin.settings.minHint')}</span>
        </div>
        <div className="wka-field">
          <label htmlFor="afc-days">{t('affiliatesAdmin.settings.daysLabel')}</label>
          <input id="afc-days" className="wka-input" inputMode="numeric" value={form.cookieDays} disabled={ro} onChange={(e) => set('cookieDays', e.target.value)} placeholder="30" />
          <span className="hint">{t('affiliatesAdmin.settings.daysHint')}</span>
        </div>
      </div>

      {err ? <div style={{ marginTop: 14 }}><ErrorBox error={err} /></div> : null}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="wka-btn primary" disabled={!dirty || saving} onClick={save}>{saving ? <Spinning /> : <Check size={14} />} {t('affiliatesAdmin.settings.save')}</button>
        <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('affiliatesAdmin.cancel')}</button>
        <SavedTag show={saved} />
      </div>
      </>
      )}
    </div>
  )
}

/* ------------------------------------------------ Affiliate admins (superadmin) */
// Create / grant / revoke the affiliate_admin role. Only a superadmin manages who
// the affiliate admins are; an affiliate admin then runs the whole program.
function AffiliateAdmins() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, staff: [] })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [notice, setNotice] = useState('')
  const [revoking, setRevoking] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.affiliateStaff(); setState({ loading: false, error: null, staff: d.staff || [] }) }
    catch (error) { setState({ loading: false, error, staff: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
  const create = async () => {
    if (busy || !emailOk) return
    setBusy(true); setErr(null); setNotice('')
    try {
      const em = email.trim().toLowerCase()
      const base = (em.split('@')[0] || 'affadmin').replace(/[^a-z0-9._-]/gi, '').slice(0, 40) || 'affadmin'
      const user = await workAdminApi.createUser({ username: base, email: em, displayName: name.trim() || null })
      await workAdminApi.setAffiliateRole(user.id, 'affiliate_admin')
      setName(''); setEmail(''); setNotice(t('affiliatesAdmin.admins.added', { email: em }))
      load()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const revoke = async (u) => {
    if (revoking) return
    setRevoking(u.id); setErr(null); setNotice('')
    try { await workAdminApi.setAffiliateRole(u.id, 'user'); setNotice(t('affiliatesAdmin.admins.revoked', { username: u.username })); load() }
    catch (e) { setErr(e) } finally { setRevoking(null) }
  }

  return (
    <div className="wka-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><UserCheck size={16} style={{ color: 'var(--wka-accent)' }} /> {t('affiliatesAdmin.admins.title')}</h2>
      <p className="desc" style={{ marginTop: 6 }}>{t('affiliatesAdmin.admins.desc')}</p>

      <div className="wka-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', alignItems: 'end' }}>
        <div className="wka-field"><label htmlFor="afa-name">{t('affiliatesAdmin.admins.name')}</label><input id="afa-name" className="wka-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('affiliatesAdmin.admins.namePlaceholder')} disabled={busy} /></div>
        <div className="wka-field"><label htmlFor="afa-email">{t('affiliatesAdmin.admins.email')}</label><input id="afa-email" className="wka-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('affiliatesAdmin.admins.emailPlaceholder')} disabled={busy} /></div>
        <div className="wka-field"><button type="button" className="wka-btn sm primary" disabled={busy || !emailOk} onClick={create}>{busy ? <Spinning /> : <Check size={13} />} {t('affiliatesAdmin.admins.add')}</button></div>
      </div>
      {notice ? <div className="wka-note" style={{ marginTop: 10 }}><Check size={14} /> {notice}</div> : null}
      {err ? <div style={{ marginTop: 10 }}><ErrorBox error={err} /></div> : null}

      <div style={{ marginTop: 16 }}>
        {state.loading ? <Loading label={t('affiliatesAdmin.admins.loading')} /> : state.error ? <ErrorBox error={state.error} onRetry={load} /> : (
          <div className="wka-table-wrap">
            <table className="wka-table">
              <thead><tr><th className="no-sort">{t('affiliatesAdmin.admins.colAdmin')}</th><th className="no-sort">{t('affiliatesAdmin.admins.email')}</th><th className="no-sort">{t('affiliatesAdmin.admins.colRole')}</th><th className="no-sort"></th></tr></thead>
              <tbody>
                {state.staff.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{u.displayName || u.username}</td>
                    <td style={{ fontSize: 12.5 }}>{u.email || '-'}</td>
                    <td><span className={`wka-badge ${u.role === 'superadmin' ? 'active' : 'paused'}`}>{u.role === 'superadmin' ? t('affiliatesAdmin.admins.roleSuperadmin') : t('affiliatesAdmin.admins.roleAffiliateAdmin')}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role === 'affiliate_admin' ? <button type="button" className="wka-btn sm ghost" disabled={revoking === u.id} onClick={() => revoke(u)} style={{ color: 'var(--wka-red)' }}>{revoking === u.id ? <Spinning /> : <Ban size={13} />} {t('affiliatesAdmin.admins.revoke')}</button> : <span style={{ color: 'var(--wka-faint)', fontSize: 12 }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- Approve modal */
function ApproveModal({ row, defaultRate, onClose, onDone }) {
  const t = useT()
  const initial = defaultRate != null ? String(defaultRate) : row.ratePct != null ? String(row.ratePct) : ''
  const [rate, setRate] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)
  const n = Number(rate)
  const valid = rate !== '' && isFinite(n) && n >= 0 && n <= 100

  const confirm = async () => {
    if (!valid || busy) return
    setBusy(true); setErr(null)
    try {
      const r = await workAdminApi.approveAffiliate(row.id, n)
      setResult(r || {})
      onDone(r)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <Modal title={t('affiliatesAdmin.approve.title')} icon={<UserCheck size={18} style={{ color: 'var(--wka-emerald)' }} />} onClose={onClose} busy={busy}>
      {result ? (
        <>
          <p className="desc" style={{ marginTop: 6 }}>
            {t.rich('affiliatesAdmin.approve.approvedAt', { name: row.name, rate: n })}{' '}
            {result.created
              ? t('affiliatesAdmin.approve.createdNote')
              : t('affiliatesAdmin.approve.existingNote')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm primary" onClick={onClose}>{t('affiliatesAdmin.done')}</button>
          </div>
        </>
      ) : (
        <>
          <p className="desc" style={{ marginTop: 6 }}>{t.rich('affiliatesAdmin.approve.intro', { name: row.name, email: row.email })}</p>
          <div className="wka-field" style={{ maxWidth: 220 }}>
            <label htmlFor="af-approve-rate">{t('affiliatesAdmin.approve.rateLabel')}</label>
            <div className="wka-inline-money"><input id="af-approve-rate" className="wka-input" inputMode="decimal" autoFocus value={rate} onChange={(e) => { setErr(null); setRate(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm() }} /><span className="sym" style={{ left: 'auto', right: 11 }}>%</span></div>
            <span className="hint">{defaultRate != null ? t('affiliatesAdmin.approve.programDefault', { rate: defaultRate }) : t('affiliatesAdmin.approve.noDefault')} {t('affiliatesAdmin.approve.range')}</span>
          </div>
          {err ? <div style={{ margin: '12px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm ghost" onClick={onClose} disabled={busy}>{t('affiliatesAdmin.cancel')}</button>
            <button type="button" className="wka-btn sm primary" onClick={confirm} disabled={!valid || busy}>{busy ? <Spinning /> : <Check size={13} />} {t('affiliatesAdmin.approve.approveAt', { rate: valid ? `${n}%` : '...' })}</button>
          </div>
        </>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------ Payout modal */
function PayoutModal({ row, minPayoutUsd, onClose, onDone }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)
  const [stepUp, setStepUp] = useState(false)
  const pending = Number(row.pendingUsd) || 0
  const belowMin = minPayoutUsd != null && pending < Number(minPayoutUsd)
  const notOnboarded = !row.stripeOnboarded

  const confirm = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const r = await workAdminApi.payoutAffiliate(row.id)
      setResult(r || {})
      onDone(r)
    } catch (e) { if (isLockError(e)) { setStepUp(true) } else { setErr(e) } } finally { setBusy(false) }
  }

  return (
    <>
    {stepUp ? <StepUpPrompt verify={workAdminApi.verifyAiStepUp} label={t('affiliatesAdmin.payout.stepUpLabel')} onUnlocked={() => { setStepUp(false); confirm() }} onCancel={() => setStepUp(false)} /> : null}
    <Modal title={t('affiliatesAdmin.payout.title')} icon={<Banknote size={18} style={{ color: 'var(--wka-emerald)' }} />} onClose={onClose} busy={busy}>
      {result ? (
        <>
          <p className="desc" style={{ marginTop: 6 }}>
            {t.rich('affiliatesAdmin.payout.sent', { amount: money(result.paidUsd), name: row.name, count: result.count || 0, unit: t.n('affiliatesAdmin.payout.referral', Number(result.count) === 1 ? 1 : 0) })}
          </p>
          {result.transferId ? <div className="wka-mono" style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t('affiliatesAdmin.payout.transfer', { id: result.transferId })}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm primary" onClick={onClose}>{t('affiliatesAdmin.done')}</button>
          </div>
        </>
      ) : (
        <>
          <p className="desc" style={{ marginTop: 6 }}>{t.rich('affiliatesAdmin.payout.intro', { name: row.name, amount: money(pending) })}</p>
          {notOnboarded ? <div className="wka-note" style={{ marginBottom: 10 }}><AlertTriangle size={14} /> {t('affiliatesAdmin.payout.notOnboarded')}</div> : null}
          {belowMin ? <div className="wka-note" style={{ marginBottom: 10 }}><AlertTriangle size={14} /> {t('affiliatesAdmin.payout.belowMin', { min: money(minPayoutUsd) })}</div> : null}
          {err ? <div style={{ margin: '12px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm ghost" onClick={onClose} disabled={busy}>{t('affiliatesAdmin.cancel')}</button>
            <button type="button" className="wka-btn sm primary" onClick={confirm} disabled={busy || pending <= 0}>{busy ? <Spinning /> : <Banknote size={13} />} {t('affiliatesAdmin.payout.pay', { amount: money(pending) })}</button>
          </div>
        </>
      )}
    </Modal>
    </>
  )
}

/* -------------------------------------------------------- Inline rate edit */
function RateCell({ row, onSaved, onError }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const n = Number(val)
  const valid = val !== '' && isFinite(n) && n >= 0 && n <= 100
  const start = () => { setVal(row.ratePct != null ? String(row.ratePct) : ''); setEditing(true) }
  const save = async () => {
    if (!valid || busy) return
    if (n === Number(row.ratePct)) { setEditing(false); return }
    setBusy(true)
    try { await workAdminApi.setAffiliateRate(row.id, n); setEditing(false); onSaved(row, n) }
    catch (e) { onError(e) } finally { setBusy(false) }
  }
  if (!editing) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <span className="wka-mono" style={{ fontWeight: 600 }}>{pct(row.ratePct)}</span>
        <button type="button" className="wka-btn sm ghost" title={t('affiliatesAdmin.rate.edit')} onClick={start} style={{ padding: '3px 6px' }}><Pencil size={12} /></button>
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <input className="wka-input wka-mono" value={val} inputMode="decimal" autoFocus disabled={busy} style={{ width: 64, padding: '4px 8px', fontSize: 12 }}
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} aria-label={t('affiliatesAdmin.rate.aria')} />
      <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>%</span>
      <button type="button" className="wka-btn sm primary" onClick={save} disabled={!valid || busy} style={{ padding: '3px 7px' }}>{busy ? <Spinning /> : <Check size={12} />}</button>
      <button type="button" className="wka-btn sm ghost" onClick={() => setEditing(false)} disabled={busy} style={{ padding: '3px 7px' }}><X size={12} /></button>
    </span>
  )
}

/* ------------------------------------------------------ Referrals (detail) */
function refStatusBadge(s, t) {
  const k = String(s || '').toLowerCase()
  if (k === 'paid') return <span className="wka-badge active">{t('affiliatesAdmin.refStatus.paid')}</span>
  if (k === 'void') return <span className="wka-badge ended">{t('affiliatesAdmin.refStatus.void')}</span>
  return <span className="wka-badge paused">{t('affiliatesAdmin.refStatus.earned')}</span>
}

function ReferralsPanel({ id }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, affiliate: null, referrals: [] })
  const load = useCallback(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    workAdminApi.affiliate(id)
      .then((d) => { if (alive) setState({ loading: false, error: null, affiliate: d.affiliate || null, referrals: d.referrals || [] }) })
      .catch((error) => { if (alive) setState({ loading: false, error, affiliate: null, referrals: [] }) })
    return () => { alive = false }
  }, [id])
  useEffect(() => load(), [load])

  if (state.loading) return <Loading label={t('affiliatesAdmin.referrals.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const a = state.affiliate || {}
  const rows = state.referrals
  const Row = ({ k, v }) => (v == null || v === '' ? null : <div style={{ display: 'flex', gap: 10, fontSize: 12.5 }}><span style={{ color: 'var(--wka-muted)', minWidth: 96, flexShrink: 0 }}>{k}</span><span style={{ minWidth: 0 }}>{v}</span></div>)
  // Only the social channels the applicant actually filled in (vetting signal).
  const socials = SOCIAL_LABELS.map(([k, label]) => [k, t(label), a.socials && a.socials[k] ? String(a.socials[k]).trim() : '']).filter(([, , v]) => v)
  return (
    <div style={{ padding: '4px 2px 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px 24px', marginBottom: 12 }}>
        <Row k={t('affiliatesAdmin.referrals.applied')} v={fmtDateTime(a.appliedAt)} />
        <Row k={t('affiliatesAdmin.referrals.approved')} v={a.approvedAt ? fmtDateTime(a.approvedAt) : null} />
        <Row k={t('affiliatesAdmin.referrals.email')} v={a.email ? <a href={`mailto:${a.email}`} style={{ color: 'var(--wka-cyan)' }}>{a.email}</a> : null} />
        <Row k={t('affiliatesAdmin.referrals.phone')} v={a.phone ? <a href={`tel:${String(a.phone).replace(/[^\d+]/g, '')}`} className="wka-mono" style={{ color: 'var(--wka-cyan)' }}>{a.phone}</a> : null} />
        <Row k={t('affiliatesAdmin.referrals.website')} v={a.website ? <a href={siteHref(a.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wka-cyan)' }}>{a.website}</a> : null} />
        <Row k={t('affiliatesAdmin.referrals.audience')} v={a.audience} />
        <Row k={t('affiliatesAdmin.referrals.notes')} v={a.notes} />
        <Row k={t('affiliatesAdmin.referrals.rejected')} v={a.rejectedReason ? t('affiliatesAdmin.referrals.reason', { reason: a.rejectedReason }) : null} />
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 12.5, marginBottom: 14, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--wka-muted)', minWidth: 96, flexShrink: 0, paddingTop: 3 }}>{t('affiliatesAdmin.referrals.socialMedia')}</span>
        {socials.length === 0 ? (
          <span style={{ color: 'var(--wka-faint)', paddingTop: 3 }}>{t('affiliatesAdmin.referrals.noneProvided')}</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {socials.map(([k, label, v]) => (
              <span key={k} className="wka-badge" title={t('affiliatesAdmin.referrals.socialTitle', { label, value: v })} style={{ gap: 6, background: 'var(--wka-panel)', maxWidth: 320 }}>
                <span style={{ color: 'var(--wka-faint)', fontWeight: 700 }}>{label}</span>
                {/^https?:\/\//i.test(v)
                  ? <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wka-cyan)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</a>
                  : <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <div style={{ color: 'var(--wka-faint)', fontSize: 12.5, padding: '6px 0' }}>{t('affiliatesAdmin.referrals.empty')}</div>
      ) : (
        <div className="wka-table-wrap" style={{ boxShadow: 'none' }}>
          <table className="wka-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colUser')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colFirstPayment')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colRate')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colCommission')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colStatus')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colCreated')}</th>
                <th className="no-sort">{t('affiliatesAdmin.referrals.colPaid')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.refUsername || '-'}</td>
                  <td className="wka-mono">{money(r.amountUsd)}</td>
                  <td className="wka-mono">{r.rate == null ? '-' : `${Number(r.rate) <= 1 ? Math.round(Number(r.rate) * 100) : Number(r.rate)}%`}</td>
                  <td className="wka-mono" style={{ fontWeight: 600 }}>{money(r.commissionUsd)}</td>
                  <td>{refStatusBadge(r.status, t)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                  <td className="wka-mono" style={{ whiteSpace: 'nowrap' }}>{r.paidAt ? fmtDateTime(r.paidAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- Main */
export default function Affiliates({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, affiliates: [], counts: {}, config: null })
  const [filter, setFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [reason, setReason] = useState(null)       // { type: 'reject' | 'suspend', row }
  const [rBusy, setRBusy] = useState(false)
  const [rErr, setRErr] = useState(null)
  const [approve, setApprove] = useState(null)     // row pending approval
  const [payout, setPayout] = useState(null)       // row pending payout
  const [openId, setOpenId] = useState(null)       // expanded referrals row
  const [rowBusy, setRowBusy] = useState(null)     // id of the row with an in-flight direct action (reinstate)
  const [actionErr, setActionErr] = useState(null)
  const [notice, setNotice] = useState('')
  const first = useRef(true)

  const load = useCallback(async (mode) => {
    // mode: 'initial' shows the full-page loader; anything else is a quiet refresh
    if (mode === 'initial') setState((s) => ({ ...s, loading: true, error: null })); else setRefreshing(true)
    try {
      const data = await workAdminApi.affiliates(filter || undefined)
      setState({ loading: false, error: null, affiliates: data.affiliates || [], counts: data.counts || {}, config: data.config || null })
    } catch (error) {
      if (mode === 'initial') setState((s) => ({ ...s, loading: false, error }))
      else setActionErr(error)
    } finally { setRefreshing(false) }
  }, [filter])

  useEffect(() => {
    load(first.current ? 'initial' : 'filter')
    first.current = false
  }, [load])

  const say = (msg) => { setNotice(msg); setActionErr(null) }

  const confirmReason = async (text) => {
    if (!reason) return
    setRBusy(true); setRErr(null)
    try {
      if (reason.type === 'reject') { await workAdminApi.rejectAffiliate(reason.row.id, text); say(t('affiliatesAdmin.main.rejected', { name: reason.row.name })) }
      else { await workAdminApi.suspendAffiliate(reason.row.id, true, text); say(t('affiliatesAdmin.main.suspended', { name: reason.row.name })) }
      setReason(null)
      load('refresh')
    } catch (e) { setRErr(e) } finally { setRBusy(false) }
  }

  const reinstate = async (row) => {
    if (rowBusy) return
    setRowBusy(row.id); setActionErr(null)
    try { await workAdminApi.suspendAffiliate(row.id, false, ''); say(t('affiliatesAdmin.main.reinstated', { name: row.name })); await load('refresh') }
    catch (e) { setActionErr(e) } finally { setRowBusy(null) }
  }

  const counts = state.counts || {}
  const config = state.config || {}
  const rows = state.affiliates
  const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
  const countFor = (k) => (k === '' ? total : (Number(counts[k]) || 0))

  if (state.loading) return <Loading label={t('affiliatesAdmin.main.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load('initial')} />

  const COLS = 11
  return (
    <div>
      <ProgramSettings config={state.config} isSuperAdmin={!!isSuperAdmin} onSaved={() => load('refresh')} />
      {isSuperAdmin ? <AffiliateAdmins /> : null}

      <div className="wka-toolbar">
        <div role="tablist" aria-label={t('affiliatesAdmin.main.filterAria')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(([k, label]) => (
            <button key={k || 'all'} type="button" role="tab" aria-selected={filter === k}
              className={`wka-btn sm${filter === k ? ' primary' : ' ghost'}`} onClick={() => setFilter(k)} disabled={refreshing && filter !== k}>
              {t(label)} <span style={{ opacity: 0.75, fontWeight: 500 }}>{countFor(k)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load('refresh')} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('affiliatesAdmin.main.refresh')}
        </button>
        <span className="wka-spacer" />
        {counts.pending ? <span style={{ color: 'var(--wka-amber)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('affiliatesAdmin.main.awaitingReview', { n: counts.pending })}</span> : null}
      </div>

      {notice ? (
        <div className="wka-note" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Check size={14} style={{ color: 'var(--wka-emerald)' }} /> {notice}</span>
          <button type="button" className="wka-btn sm ghost" onClick={() => setNotice('')} aria-label={t('affiliatesAdmin.main.dismiss')} style={{ padding: '2px 6px' }}><X size={13} /></button>
        </div>
      ) : null}
      {actionErr ? <div style={{ marginBottom: 14 }}><ErrorBox error={actionErr} onRetry={() => setActionErr(null)} /></div> : null}

      {rows.length === 0 ? (
        <EmptyState title={filter ? t('affiliatesAdmin.main.emptyFiltered', { status: filter }) : t('affiliatesAdmin.main.emptyTitle')}
          detail={filter ? t('affiliatesAdmin.main.emptyFilteredDetail') : t('affiliatesAdmin.main.emptyDetail')} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table" style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th className="no-sort">{t('affiliatesAdmin.cols.affiliate')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.status')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.code')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.rate')}</th>
                <th className="no-sort" title={t('affiliatesAdmin.cols.clicksTitle')}>{t('affiliatesAdmin.cols.clicks')}</th>
                <th className="no-sort" title={t('affiliatesAdmin.cols.convTitle')}>{t('affiliatesAdmin.cols.conv')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.earned')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.pending')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.paid')}</th>
                <th className="no-sort">{t('affiliatesAdmin.cols.stripe')}</th>
                <th className="no-sort"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const open = openId === a.id
                const busyRow = rowBusy === a.id
                return (
                  <React.Fragment key={a.id}>
                    <tr style={open ? { background: 'var(--wka-panel-2)' } : undefined}>
                      <td style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.name || '-'}</div>
                        <div style={{ whiteSpace: 'nowrap' }}><a href={`mailto:${a.email}`} style={{ color: 'var(--wka-cyan)', fontSize: 12.5 }}>{a.email}</a></div>
                        {a.website ? (
                          <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                            <a href={siteHref(a.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wka-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }} title={a.website}>
                              <ExternalLink size={11} /> {a.website}
                            </a>
                          </div>
                        ) : null}
                        <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 2 }}>{t('affiliatesAdmin.main.appliedOn', { date: fmtDateTime(a.appliedAt) })}</div>
                      </td>
                      <td>
                        {statusBadge(a.status, t)}
                        {a.status === 'rejected' && a.rejectedReason ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.rejectedReason}>{a.rejectedReason}</div> : null}
                      </td>
                      <td className="wka-mono" style={{ whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{a.code || <span style={{ color: 'var(--wka-faint)' }}>-</span>}</td>
                      <td>
                        {a.status === 'approved' || a.status === 'suspended'
                          ? <RateCell row={a} onSaved={(r, n) => { say(t('affiliatesAdmin.main.rateSet', { name: r.name, rate: n })); load('refresh') }} onError={setActionErr} />
                          : <span className="wka-mono" style={{ color: 'var(--wka-faint)' }}>{pct(a.ratePct)}</span>}
                      </td>
                      <td className="wka-mono">{Number(a.clicks) || 0}</td>
                      <td className="wka-mono">{Number(a.conversions) || 0}</td>
                      <td className="wka-mono">{money(a.earnedUsd)}</td>
                      <td className="wka-mono" style={{ fontWeight: (Number(a.pendingUsd) || 0) > 0 ? 600 : 400 }}>{money(a.pendingUsd)}</td>
                      <td className="wka-mono">{money(a.paidUsd)}</td>
                      <td>{stripeBadge(a, t)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {a.status === 'pending' ? (
                            <>
                              <button type="button" className="wka-btn sm primary" onClick={() => setApprove(a)} title={t('affiliatesAdmin.actions.approveTitle')}><UserCheck size={13} /> {t('affiliatesAdmin.actions.approve')}</button>
                              <button type="button" className="wka-btn sm ghost" style={{ color: 'var(--wka-red)' }} onClick={() => { setRErr(null); setReason({ type: 'reject', row: a }) }} title={t('affiliatesAdmin.actions.rejectTitle')}><X size={13} /> {t('affiliatesAdmin.actions.reject')}</button>
                            </>
                          ) : null}
                          {a.status === 'approved' ? (
                            <>
                              <button type="button" className="wka-btn sm" onClick={() => setPayout(a)} title={t('affiliatesAdmin.actions.payOutTitle')} disabled={(Number(a.pendingUsd) || 0) <= 0}><Banknote size={13} /> {t('affiliatesAdmin.actions.payOut')}</button>
                              <button type="button" className="wka-btn sm ghost" style={{ color: 'var(--wka-red)' }} onClick={() => { setRErr(null); setReason({ type: 'suspend', row: a }) }} title={t('affiliatesAdmin.actions.suspendTitle')}><Ban size={13} /> {t('affiliatesAdmin.actions.suspend')}</button>
                            </>
                          ) : null}
                          {a.status === 'suspended' ? (
                            <button type="button" className="wka-btn sm" onClick={() => reinstate(a)} disabled={busyRow} title={t('affiliatesAdmin.actions.reinstateTitle')}>{busyRow ? <Spinning /> : <PlayCircle size={13} />} {t('affiliatesAdmin.actions.reinstate')}</button>
                          ) : null}
                          <button type="button" className="wka-btn sm ghost" onClick={() => setOpenId(open ? null : a.id)} title={open ? t('affiliatesAdmin.actions.hideReferrals') : t('affiliatesAdmin.actions.viewReferrals')}>
                            {open ? <EyeOff size={13} /> : <Eye size={13} />} {open ? t('affiliatesAdmin.actions.hide') : t('affiliatesAdmin.actions.view')}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr>
                        <td colSpan={COLS} style={{ background: 'var(--wka-bg-2)', padding: '10px 14px 14px' }}>
                          <ReferralsPanel id={a.id} />
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {approve ? (
        <ApproveModal row={approve} defaultRate={config.defaultRatePct}
          onClose={() => setApprove(null)}
          onDone={(r) => { say(r && r.created ? t('affiliatesAdmin.main.approvedCreated', { name: approve.name }) : t('affiliatesAdmin.main.approved', { name: approve.name })); load('refresh') }} />
      ) : null}
      {payout ? (
        <PayoutModal row={payout} minPayoutUsd={config.minPayoutUsd}
          onClose={() => setPayout(null)}
          onDone={(r) => { say(t('affiliatesAdmin.main.paid', { amount: money(r && r.paidUsd), name: payout.name })); load('refresh') }} />
      ) : null}
      {reason ? (
        <ReasonModal
          title={reason.type === 'reject' ? t('affiliatesAdmin.reason.rejectTitle') : t('affiliatesAdmin.reason.suspendTitle')}
          message={reason.type === 'reject'
            ? t('affiliatesAdmin.reason.rejectMessage', { name: reason.row.name, email: reason.row.email })
            : t('affiliatesAdmin.reason.suspendMessage', { name: reason.row.name })}
          confirmLabel={reason.type === 'reject' ? t('affiliatesAdmin.actions.reject') : t('affiliatesAdmin.actions.suspend')}
          busy={rBusy} error={rErr}
          onConfirm={confirmReason}
          onCancel={() => { if (!rBusy) setReason(null) }}
        />
      ) : null}
    </div>
  )
}
