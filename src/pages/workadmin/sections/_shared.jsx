// Shared presentational primitives for the WorkCoPilot admin sections.
// Pure UI, no data fetching. Only react + lucide-react are imported.
import React, { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, Inbox, RefreshCw, Check, Lock, Shield, CheckCircle2, Pencil } from 'lucide-react'

export function Loading({ label = 'Loading' }) {
  return (
    <div className="wka-state">
      <div className="wka-spinner" aria-hidden="true" />
      <div>{label}...</div>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  const msg = (error && error.message) || 'Something went wrong.'
  return (
    <div className="wka-error">
      <span className="msg"><AlertTriangle size={16} /> {msg}</span>
      {onRetry ? (
        <button type="button" className="wka-btn sm ghost" onClick={onRetry}>
          <RefreshCw size={13} /> Retry
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', detail = '' }) {
  return (
    <div className="wka-state">
      <Inbox size={26} style={{ opacity: 0.5, marginBottom: 10 }} />
      <div className="big">{title}</div>
      {detail ? <div>{detail}</div> : null}
    </div>
  )
}

export function TierBadge({ tier }) {
  const t = String(tier || 'basic')
  const label = t.charAt(0).toUpperCase() + t.slice(1)
  return <span className={`wka-badge ${t}`}>{label}</span>
}

export function Spinning() {
  return <Loader2 size={14} className="wka-spin-inline" style={{ animation: 'wka-spin 0.8s linear infinite' }} />
}

export function SavedTag({ show }) {
  if (!show) return null
  return <span className="wka-saved"><Check size={14} /> Saved</span>
}

// One label/value row in a collapsed "record" view (a saved config shown
// read-only until the operator clicks Edit). Used across the admin dashboards so
// forms do not sit open after saving.
export function RecRow({ label, value }) {
  return (
    <div className="wka-rec-row" style={{ display: 'flex', gap: 14, padding: '7px 0', borderBottom: '1px solid var(--wka-line, #eceff3)' }}>
      <div style={{ width: 170, flexShrink: 0, color: 'var(--wka-muted)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--wka-ink, #111)' }}>{value}</div>
    </div>
  )
}

// The Edit / Save+Cancel control row + header affordance for a collapsible card.
// `editing` + `onEdit`/`onCancel` toggle; the caller renders the record vs form.
export function EditToggle({ editing, onEdit, disabled }) {
  if (editing || disabled) return null
  return <button type="button" className="wka-btn sm ghost" onClick={onEdit}><Pencil size={13} /> Edit</button>
}

// A 403 {locked:true} from a step-up-gated endpoint (re-prompt for the code).
export function isLockError(e) { return !!(e && e.status === 403 && e.data && e.data.locked) }

// Generic MFA step-up gate: stands in front of a critical page until a fresh
// authenticator code is verified. Presentational - the caller passes `verify`
// (async code -> status) and the current `status` (from the step-up endpoint).
// WorkCoPilot uses ONE shared step-up window, so unlocking here also unlocks the
// other sensitive pages for the window's lifetime.
export function StepUpGate({ status, verify, onUnlock, label = 'This page' }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const needsEnroll = status && !status.mfaEnrolled && !status.breakGlass
  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy || !code.trim()) return
    setBusy(true); setError(null)
    try { const st = await verify(code.trim()); setCode(''); onUnlock(st) }
    catch (err) { setError(err) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel" style={{ maxWidth: 460, margin: '8px auto', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, margin: '4px auto 14px', display: 'grid', placeItems: 'center', background: 'rgba(10,157,102,0.1)', border: '1px solid rgba(10,157,102,0.3)' }}>
        <Lock size={22} style={{ color: 'var(--wka-emerald)' }} />
      </div>
      <h2 style={{ justifyContent: 'center' }}>{label} are locked</h2>
      <p className="desc" style={{ textAlign: 'center' }}>This is a critical page. Enter the 6-digit code from your authenticator to view and change it. It re-locks automatically after a few minutes of inactivity.</p>
      {needsEnroll ? (
        <div className="wka-note" style={{ marginTop: 10, justifyContent: 'center' }}><AlertTriangle size={14} /> Set up multi-factor authentication on your account first, then return here.</div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 8 }}>
          <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="123456" value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} autoFocus
            style={{ maxWidth: 200, margin: '0 auto', textAlign: 'center', letterSpacing: '0.4em', fontSize: 20 }} />
          {error ? <div style={{ margin: '12px 0' }}><ErrorBox error={error} /></div> : null}
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="wka-btn primary" disabled={busy || !code.trim()}>{busy ? <Spinning /> : <Shield size={14} />} Verify &amp; open</button>
          </div>
        </form>
      )}
    </div>
  )
}

// Thin banner above an unlocked step-up page: live countdown + lock-now. `lock`
// is the async lock fn; `onLocked` re-checks the gate.
export function StepUpBanner({ status, onLocked, lock, label = 'Settings' }) {
  const [left, setLeft] = useState(() => Math.max(0, (status.until || 0) - Date.now()))
  useEffect(() => {
    if (status.breakGlass) return
    const t = setInterval(() => {
      const ms = Math.max(0, (status.until || 0) - Date.now())
      setLeft(ms)
      if (ms <= 0) { clearInterval(t); onLocked() }
    }, 1000)
    return () => clearInterval(t)
  }, [status.until, status.breakGlass, onLocked])
  const lockNow = async () => { try { if (lock) await lock() } catch { /* lock locally regardless */ } onLocked() }
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      padding: '9px 14px', marginBottom: 14, borderRadius: 10, border: '1px solid rgba(10,157,102,0.35)', background: 'rgba(10,157,102,0.07)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--wka-emerald)' }}>
        <CheckCircle2 size={15} />
        {status.breakGlass ? `MFA is disabled platform-wide - ${label.toLowerCase()} are open.` : `Verified with your authenticator - locks in ${mm}:${String(ss).padStart(2, '0')}.`}
      </span>
      {!status.breakGlass ? <button type="button" className="wka-btn sm ghost" onClick={lockNow}><Lock size={13} /> Lock now</button> : null}
    </div>
  )
}
