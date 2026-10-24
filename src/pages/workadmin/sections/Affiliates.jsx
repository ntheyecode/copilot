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
import { Loading, ErrorBox, EmptyState, Spinning, ReasonModal, SavedTag } from './_shared.jsx'
import { fmtDateTime } from '../workadmin.css.js'

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const pct = (r) => (r == null || r === '' ? '-' : `${Number(r)}%`)
const STATUSES = [['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['suspended', 'Suspended'], ['rejected', 'Rejected']]
// Social keys as the public apply form posts them (socials: { tiktok, ... }).
const SOCIAL_LABELS = [['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['twitter', 'X'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['other', 'Other']]

function statusBadge(s) {
  const k = String(s || '').toLowerCase()
  if (k === 'approved') return <span className="wka-badge active">Approved</span>
  if (k === 'pending') return <span className="wka-badge paused">Pending</span>
  if (k === 'suspended') return <span className="wka-badge exhausted">Suspended</span>
  if (k === 'rejected') return <span className="wka-badge ended">Rejected</span>
  return <span className="wka-badge">{k || '-'}</span>
}

function stripeBadge(a) {
  if (a.stripeOnboarded) return <span className="wka-badge active" title="Stripe Connect onboarding complete">Onboarded</span>
  if (a.stripeConnected) return <span className="wka-badge paused" title="Started Stripe onboarding, not finished">Incomplete</span>
  return <span className="wka-badge ended" title="Has not started Stripe onboarding">Not set up</span>
}

function siteHref(w) {
  const s = String(w || '').trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

// Shared modal shell (same look as the admin ReasonModal / Sessions detail).
function Modal({ title, icon, onClose, busy, children, maxWidth = 460 }) {
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="wka-panel" style={{ maxWidth, width: '100%', position: 'relative', marginBottom: 0 }}>
        <button type="button" aria-label="Close" onClick={() => !busy && onClose()}
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

function ProgramSettings({ config, isSuperAdmin, onSaved }) {
  const [form, setForm] = useState(() => toForm(config))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  useEffect(() => { setForm(toForm(config)) }, [config])
  const base = toForm(config)
  const dirty = Object.keys(base).some((k) => String(base[k]) !== String(form[k]))
  const set = (k, v) => { setSaved(false); setErr(null); setForm((f) => ({ ...f, [k]: v })) }
  const num = (v, lo, hi) => { const n = Number(v); return v !== '' && isFinite(n) && n >= lo && n <= hi ? n : null }

  const save = async () => {
    if (saving || !isSuperAdmin) return
    const rate = num(form.defaultRatePct, 0, 100), min = num(form.minPayoutUsd, 0, 1e6), days = num(form.cookieDays, 1, 365)
    if (rate == null) { setErr(new Error('Default commission must be a number from 0 to 100.')); return }
    if (min == null) { setErr(new Error('Minimum payout must be a dollar amount of 0 or more.')); return }
    if (days == null) { setErr(new Error('Cookie window must be from 1 to 365 days.')); return }
    setSaving(true); setErr(null)
    try {
      await workAdminApi.setAffiliateConfig({ enabled: !!form.enabled, defaultRatePct: rate, minPayoutUsd: min, cookieDays: days })
      setSaved(true)
      onSaved()
    } catch (e) { setErr(e) } finally { setSaving(false) }
  }

  const ro = !isSuperAdmin || saving
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Settings2 size={16} style={{ color: 'var(--wka-accent)' }} /> Program settings</h2>
        <SavedTag show={saved} />
      </div>
      <p className="desc" style={{ marginTop: 6 }}>Applies to new approvals and new referrals. An affiliate&rsquo;s own rate (set at approval or edited in the table) overrides the default.</p>
      {!isSuperAdmin ? <div className="wka-note"><Info size={14} /> Only a superadmin can change program settings. You can view them here.</div> : null}

      <div className={`wka-toggle${form.enabled ? ' on' : ''}${ro ? ' disabled' : ''}`} role="switch" aria-checked={form.enabled}
        onClick={() => !ro && set('enabled', !form.enabled)} style={{ marginBottom: 16 }}>
        <span className="track"><span className="knob" /></span>
        <span style={{ fontWeight: 600 }}>{form.enabled ? 'Applications open: the public page shows the apply form' : 'Applications closed: the public page says applications are closed'}</span>
      </div>

      <div className="wka-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="wka-field">
          <label htmlFor="afc-rate">Default commission (% of first payment)</label>
          <div className="wka-inline-money"><input id="afc-rate" className="wka-input" inputMode="decimal" value={form.defaultRatePct} disabled={ro} onChange={(e) => set('defaultRatePct', e.target.value)} placeholder="20" /><span className="sym" style={{ left: 'auto', right: 11 }}>%</span></div>
          <span className="hint">Offered to new affiliates at approval.</span>
        </div>
        <div className="wka-field">
          <label htmlFor="afc-min">Minimum payout</label>
          <div className="wka-inline-money"><span className="sym">$</span><input id="afc-min" className="wka-input" inputMode="decimal" value={form.minPayoutUsd} disabled={ro} onChange={(e) => set('minPayoutUsd', e.target.value)} placeholder="50" /></div>
          <span className="hint">A payout is refused below this pending balance.</span>
        </div>
        <div className="wka-field">
          <label htmlFor="afc-days">Referral cookie window (days)</label>
          <input id="afc-days" className="wka-input" inputMode="numeric" value={form.cookieDays} disabled={ro} onChange={(e) => set('cookieDays', e.target.value)} placeholder="30" />
          <span className="hint">How long a click keeps crediting the affiliate.</span>
        </div>
      </div>

      {err ? <div style={{ marginTop: 14 }}><ErrorBox error={err} /></div> : null}
      {isSuperAdmin ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="wka-btn sm ghost" disabled={!dirty || saving} onClick={() => { setForm(toForm(config)); setErr(null) }}>Discard</button>
          <button type="button" className="wka-btn sm primary" disabled={!dirty || saving} onClick={save}>{saving ? <Spinning /> : <Check size={13} />} Save settings</button>
        </div>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------- Approve modal */
function ApproveModal({ row, defaultRate, onClose, onDone }) {
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
    <Modal title="Approve affiliate" icon={<UserCheck size={18} style={{ color: 'var(--wka-emerald)' }} />} onClose={onClose} busy={busy}>
      {result ? (
        <>
          <p className="desc" style={{ marginTop: 6 }}>
            <b>{row.name}</b> is approved at <b>{n}%</b>.{' '}
            {result.created
              ? 'A WorkCoPilot account was created for their email, and they can sign in to see their referral link and dashboard.'
              : 'Their existing WorkCoPilot account is now the affiliate account; the dashboard appears on their next visit.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm primary" onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <>
          <p className="desc" style={{ marginTop: 6 }}>Approve <b>{row.name}</b> ({row.email}) and issue their referral code. Set the commission they earn on each referral&rsquo;s first payment.</p>
          <div className="wka-field" style={{ maxWidth: 220 }}>
            <label htmlFor="af-approve-rate">Commission rate</label>
            <div className="wka-inline-money"><input id="af-approve-rate" className="wka-input" inputMode="decimal" autoFocus value={rate} onChange={(e) => { setErr(null); setRate(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm() }} /><span className="sym" style={{ left: 'auto', right: 11 }}>%</span></div>
            <span className="hint">{defaultRate != null ? `Program default is ${defaultRate}%.` : 'No program default is set; enter a rate.'} Must be 0 to 100.</span>
          </div>
          {err ? <div style={{ margin: '12px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="wka-btn sm primary" onClick={confirm} disabled={!valid || busy}>{busy ? <Spinning /> : <Check size={13} />} Approve at {valid ? `${n}%` : '...'}</button>
          </div>
        </>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------ Payout modal */
function PayoutModal({ row, minPayoutUsd, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)
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
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <Modal title="Pay out commission" icon={<Banknote size={18} style={{ color: 'var(--wka-emerald)' }} />} onClose={onClose} busy={busy}>
      {result ? (
        <>
          <p className="desc" style={{ marginTop: 6 }}>
            Sent <b>{money(result.paidUsd)}</b> to <b>{row.name}</b> covering <b>{result.count || 0}</b> {Number(result.count) === 1 ? 'referral' : 'referrals'} through Stripe Connect.
          </p>
          {result.transferId ? <div className="wka-mono" style={{ fontSize: 12, color: 'var(--wka-muted)' }}>Transfer: {result.transferId}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm primary" onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <>
          <p className="desc" style={{ marginTop: 6 }}>Transfer <b>{row.name}</b>&rsquo;s pending commission of <b>{money(pending)}</b> to their connected Stripe account. Each earned referral in the balance is marked paid.</p>
          {notOnboarded ? <div className="wka-note" style={{ marginBottom: 10 }}><AlertTriangle size={14} /> This affiliate has not finished Stripe onboarding. The payout will be refused until they do.</div> : null}
          {belowMin ? <div className="wka-note" style={{ marginBottom: 10 }}><AlertTriangle size={14} /> Pending balance is below the {money(minPayoutUsd)} program minimum. The payout will be refused.</div> : null}
          {err ? <div style={{ margin: '12px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="wka-btn sm ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="wka-btn sm primary" onClick={confirm} disabled={busy || pending <= 0}>{busy ? <Spinning /> : <Banknote size={13} />} Pay {money(pending)}</button>
          </div>
        </>
      )}
    </Modal>
  )
}

/* -------------------------------------------------------- Inline rate edit */
function RateCell({ row, onSaved, onError }) {
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
        <button type="button" className="wka-btn sm ghost" title="Edit rate" onClick={start} style={{ padding: '3px 6px' }}><Pencil size={12} /></button>
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <input className="wka-input wka-mono" value={val} inputMode="decimal" autoFocus disabled={busy} style={{ width: 64, padding: '4px 8px', fontSize: 12 }}
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} aria-label="Commission rate percent" />
      <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>%</span>
      <button type="button" className="wka-btn sm primary" onClick={save} disabled={!valid || busy} style={{ padding: '3px 7px' }}>{busy ? <Spinning /> : <Check size={12} />}</button>
      <button type="button" className="wka-btn sm ghost" onClick={() => setEditing(false)} disabled={busy} style={{ padding: '3px 7px' }}><X size={12} /></button>
    </span>
  )
}

/* ------------------------------------------------------ Referrals (detail) */
function refStatusBadge(s) {
  const k = String(s || '').toLowerCase()
  if (k === 'paid') return <span className="wka-badge active">Paid</span>
  if (k === 'void') return <span className="wka-badge ended">Void</span>
  return <span className="wka-badge paused">Earned</span>
}

function ReferralsPanel({ id }) {
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

  if (state.loading) return <Loading label="Loading referrals" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const a = state.affiliate || {}
  const rows = state.referrals
  const Row = ({ k, v }) => (v == null || v === '' ? null : <div style={{ display: 'flex', gap: 10, fontSize: 12.5 }}><span style={{ color: 'var(--wka-muted)', minWidth: 96, flexShrink: 0 }}>{k}</span><span style={{ minWidth: 0 }}>{v}</span></div>)
  // Only the social channels the applicant actually filled in (vetting signal).
  const socials = SOCIAL_LABELS.map(([k, label]) => [k, label, a.socials && a.socials[k] ? String(a.socials[k]).trim() : '']).filter(([, , v]) => v)
  return (
    <div style={{ padding: '4px 2px 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px 24px', marginBottom: 12 }}>
        <Row k="Applied" v={fmtDateTime(a.appliedAt)} />
        <Row k="Approved" v={a.approvedAt ? fmtDateTime(a.approvedAt) : null} />
        <Row k="Email" v={a.email ? <a href={`mailto:${a.email}`} style={{ color: 'var(--wka-cyan)' }}>{a.email}</a> : null} />
        <Row k="Phone" v={a.phone ? <a href={`tel:${String(a.phone).replace(/[^\d+]/g, '')}`} className="wka-mono" style={{ color: 'var(--wka-cyan)' }}>{a.phone}</a> : null} />
        <Row k="Website" v={a.website ? <a href={siteHref(a.website)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--wka-cyan)' }}>{a.website}</a> : null} />
        <Row k="Audience" v={a.audience} />
        <Row k="Notes" v={a.notes} />
        <Row k="Rejected" v={a.rejectedReason ? `Reason: ${a.rejectedReason}` : null} />
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 12.5, marginBottom: 14, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--wka-muted)', minWidth: 96, flexShrink: 0, paddingTop: 3 }}>Social media</span>
        {socials.length === 0 ? (
          <span style={{ color: 'var(--wka-faint)', paddingTop: 3 }}>None provided</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {socials.map(([k, label, v]) => (
              <span key={k} className="wka-badge" title={`${label}: ${v}`} style={{ gap: 6, background: 'var(--wka-panel)', maxWidth: 320 }}>
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
        <div style={{ color: 'var(--wka-faint)', fontSize: 12.5, padding: '6px 0' }}>No referrals yet.</div>
      ) : (
        <div className="wka-table-wrap" style={{ boxShadow: 'none' }}>
          <table className="wka-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="no-sort">Referred user</th>
                <th className="no-sort">First payment</th>
                <th className="no-sort">Rate</th>
                <th className="no-sort">Commission</th>
                <th className="no-sort">Status</th>
                <th className="no-sort">Created</th>
                <th className="no-sort">Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.refUsername || '-'}</td>
                  <td className="wka-mono">{money(r.amountUsd)}</td>
                  <td className="wka-mono">{r.rate == null ? '-' : `${Number(r.rate) <= 1 ? Math.round(Number(r.rate) * 100) : Number(r.rate)}%`}</td>
                  <td className="wka-mono" style={{ fontWeight: 600 }}>{money(r.commissionUsd)}</td>
                  <td>{refStatusBadge(r.status)}</td>
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
      if (reason.type === 'reject') { await workAdminApi.rejectAffiliate(reason.row.id, text); say(`${reason.row.name} rejected.`) }
      else { await workAdminApi.suspendAffiliate(reason.row.id, true, text); say(`${reason.row.name} suspended.`) }
      setReason(null)
      load('refresh')
    } catch (e) { setRErr(e) } finally { setRBusy(false) }
  }

  const reinstate = async (row) => {
    if (rowBusy) return
    setRowBusy(row.id); setActionErr(null)
    try { await workAdminApi.suspendAffiliate(row.id, false, ''); say(`${row.name} reinstated.`); await load('refresh') }
    catch (e) { setActionErr(e) } finally { setRowBusy(null) }
  }

  const counts = state.counts || {}
  const config = state.config || {}
  const rows = state.affiliates
  const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0)
  const countFor = (k) => (k === '' ? total : (Number(counts[k]) || 0))

  if (state.loading) return <Loading label="Loading affiliates" />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load('initial')} />

  const COLS = 11
  return (
    <div>
      <ProgramSettings config={state.config} isSuperAdmin={!!isSuperAdmin} onSaved={() => load('refresh')} />

      <div className="wka-toolbar">
        <div role="tablist" aria-label="Filter by status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(([k, label]) => (
            <button key={k || 'all'} type="button" role="tab" aria-selected={filter === k}
              className={`wka-btn sm${filter === k ? ' primary' : ' ghost'}`} onClick={() => setFilter(k)} disabled={refreshing && filter !== k}>
              {label} <span style={{ opacity: 0.75, fontWeight: 500 }}>{countFor(k)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="wka-btn sm" onClick={() => load('refresh')} disabled={refreshing}>
          {refreshing ? <Spinning /> : <RefreshCw size={13} />} Refresh
        </button>
        {counts.pending ? <span style={{ color: 'var(--wka-amber)', fontSize: 12, fontWeight: 600 }}>{counts.pending} awaiting review</span> : null}
      </div>

      {notice ? (
        <div className="wka-note" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Check size={14} style={{ color: 'var(--wka-emerald)' }} /> {notice}</span>
          <button type="button" className="wka-btn sm ghost" onClick={() => setNotice('')} aria-label="Dismiss" style={{ padding: '2px 6px' }}><X size={13} /></button>
        </div>
      ) : null}
      {actionErr ? <div style={{ marginBottom: 14 }}><ErrorBox error={actionErr} onRetry={() => setActionErr(null)} /></div> : null}

      {rows.length === 0 ? (
        <EmptyState title={filter ? `No ${filter} affiliates` : 'No affiliates yet'}
          detail={filter ? 'Try another status.' : 'When someone applies on the public affiliate page, they appear here for review.'} />
      ) : (
        <div className="wka-table-wrap">
          <table className="wka-table" style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th className="no-sort">Affiliate</th>
                <th className="no-sort">Status</th>
                <th className="no-sort">Code</th>
                <th className="no-sort">Rate</th>
                <th className="no-sort" title="Visits through the referral link">Clicks</th>
                <th className="no-sort" title="Referrals who made a first payment">Conv.</th>
                <th className="no-sort">Earned</th>
                <th className="no-sort">Pending</th>
                <th className="no-sort">Paid</th>
                <th className="no-sort">Stripe</th>
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
                        <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 2 }}>Applied {fmtDateTime(a.appliedAt)}</div>
                      </td>
                      <td>
                        {statusBadge(a.status)}
                        {a.status === 'rejected' && a.rejectedReason ? <div style={{ fontSize: 11, color: 'var(--wka-faint)', marginTop: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.rejectedReason}>{a.rejectedReason}</div> : null}
                      </td>
                      <td className="wka-mono" style={{ whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{a.code || <span style={{ color: 'var(--wka-faint)' }}>-</span>}</td>
                      <td>
                        {a.status === 'approved' || a.status === 'suspended'
                          ? <RateCell row={a} onSaved={(r, n) => { say(`${r.name}'s rate set to ${n}%.`); load('refresh') }} onError={setActionErr} />
                          : <span className="wka-mono" style={{ color: 'var(--wka-faint)' }}>{pct(a.ratePct)}</span>}
                      </td>
                      <td className="wka-mono">{Number(a.clicks) || 0}</td>
                      <td className="wka-mono">{Number(a.conversions) || 0}</td>
                      <td className="wka-mono">{money(a.earnedUsd)}</td>
                      <td className="wka-mono" style={{ fontWeight: (Number(a.pendingUsd) || 0) > 0 ? 600 : 400 }}>{money(a.pendingUsd)}</td>
                      <td className="wka-mono">{money(a.paidUsd)}</td>
                      <td>{stripeBadge(a)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {a.status === 'pending' ? (
                            <>
                              <button type="button" className="wka-btn sm primary" onClick={() => setApprove(a)} title="Approve and set a rate"><UserCheck size={13} /> Approve</button>
                              <button type="button" className="wka-btn sm ghost" style={{ color: '#d6433b' }} onClick={() => { setRErr(null); setReason({ type: 'reject', row: a }) }} title="Reject with a reason"><X size={13} /> Reject</button>
                            </>
                          ) : null}
                          {a.status === 'approved' ? (
                            <>
                              <button type="button" className="wka-btn sm" onClick={() => setPayout(a)} title="Pay out the pending balance through Stripe Connect" disabled={(Number(a.pendingUsd) || 0) <= 0}><Banknote size={13} /> Pay out</button>
                              <button type="button" className="wka-btn sm ghost" style={{ color: '#d6433b' }} onClick={() => { setRErr(null); setReason({ type: 'suspend', row: a }) }} title="Suspend with a reason"><Ban size={13} /> Suspend</button>
                            </>
                          ) : null}
                          {a.status === 'suspended' ? (
                            <button type="button" className="wka-btn sm" onClick={() => reinstate(a)} disabled={busyRow} title="Lift the suspension">{busyRow ? <Spinning /> : <PlayCircle size={13} />} Reinstate</button>
                          ) : null}
                          <button type="button" className="wka-btn sm ghost" onClick={() => setOpenId(open ? null : a.id)} title={open ? 'Hide referrals' : 'View referrals'}>
                            {open ? <EyeOff size={13} /> : <Eye size={13} />} {open ? 'Hide' : 'View'}
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
          onDone={(r) => { say(`${approve.name} approved${r && r.created ? ' and a WorkCoPilot account was created for them' : ''}.`); load('refresh') }} />
      ) : null}
      {payout ? (
        <PayoutModal row={payout} minPayoutUsd={config.minPayoutUsd}
          onClose={() => setPayout(null)}
          onDone={(r) => { say(`Paid ${money(r && r.paidUsd)} to ${payout.name}.`); load('refresh') }} />
      ) : null}
      {reason ? (
        <ReasonModal
          title={reason.type === 'reject' ? 'Reject application' : 'Suspend affiliate'}
          message={reason.type === 'reject'
            ? `Reject ${reason.row.name}'s application (${reason.row.email}). They will not get a referral code. The reason is kept on the record.`
            : `Suspend ${reason.row.name}. New referrals stop being credited and their dashboard shows the account is on hold. You can reinstate later.`}
          confirmLabel={reason.type === 'reject' ? 'Reject' : 'Suspend'}
          busy={rBusy} error={rErr}
          onConfirm={confirmReason}
          onCancel={() => { if (!rBusy) setReason(null) }}
        />
      ) : null}
    </div>
  )
}
