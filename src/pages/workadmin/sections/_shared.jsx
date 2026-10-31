// Shared presentational primitives for the WorkCoPilot admin sections.
// Pure UI, no data fetching. Only react + lucide-react are imported.
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, AlertTriangle, Inbox, RefreshCw, Check, Lock, Shield, CheckCircle2, XCircle, Pencil, X, MoreHorizontal } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

export function Loading({ label }) {
  const t = useT()
  return (
    <div className="wka-state">
      <div className="wka-spinner" aria-hidden="true" />
      <div>{label === undefined ? t('shared.loading') : label}...</div>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  // 4xx errors are actionable and shown verbatim (validation, "not allowed",
  // "already exists"); 5xx / network / unknown errors are generalized so a raw
  // server message (which could carry internal detail) never reaches a company
  // admin or user. Superadmin sees the real cause in the Incidents feed.
  const t = useT()
  const status = error && error.status
  const actionable = typeof status === 'number' && status >= 400 && status < 500
  const msg = actionable
    ? (error.message || t('shared.errorGeneric'))
    : t('shared.errorServer')
  return (
    <div className="wka-error">
      <span className="msg"><AlertTriangle size={16} /> {msg}</span>
      {onRetry ? (
        <button type="button" className="wka-btn sm ghost" onClick={onRetry}>
          <RefreshCw size={13} /> {t('shared.retry')}
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title, detail = '' }) {
  const t = useT()
  return (
    <div className="wka-state">
      <Inbox size={26} style={{ opacity: 0.5, marginBottom: 10 }} />
      <div className="big">{title === undefined ? t('shared.emptyTitle') : title}</div>
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

// One "More" trigger + a popover of secondary actions for a table row, so a row
// stays one pill tall however many actions it carries (the inline button stack
// made the Users rows render tall). items: [{ key, icon, label, title, tone:
// 'danger'|'emerald'|'', disabled, onPick }]. Closes on pick, outside click or
// Escape. Styles: workadmin.css.js (.wka-menu*).
export function ActionMenu({ label, items, disabled }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    // Any scroll (the table's own horizontal scroller included, which also
    // moves when the trigger takes focus) re-places the fixed popover against
    // its trigger, so it never drifts and never closes on its own.
    const onScroll = () => setPos(place())
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey); document.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); document.removeEventListener('scroll', onScroll, true) }
  }, [open])   // eslint-disable-line react-hooks/exhaustive-deps
  const list = (items || []).filter(Boolean)
  // The popover is position:fixed (placed from the trigger's rect) so the
  // table's scroll box cannot clip it; it opens upward near the bottom edge
  // and never past the right edge of the viewport.
  function place() {
    const r = ref.current ? ref.current.getBoundingClientRect() : null
    if (!r || typeof window === 'undefined') return null
    const w = 200, h = Math.min(list.length * 36 + 12, 300)
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))
    const below = r.bottom + 4 + h <= window.innerHeight
    return { left, top: below ? r.bottom + 4 : Math.max(8, r.top - 4 - h) }
  }
  if (!list.length) return null
  const toggle = () => {
    if (open) { setOpen(false); return }
    setPos(place())
    setOpen(true)
  }
  return (
    <span className="wka-menu-wrap" ref={ref}>
      <button type="button" className="wka-btn sm ghost" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={toggle} title={label}>
        <MoreHorizontal size={14} /> {label}
      </button>
      {open && (
        <div className="wka-menu" role="menu" style={pos ? { position: 'fixed', top: pos.top, left: pos.left, right: 'auto', width: 200 } : undefined}>
          {list.map((it) => (
            <button key={it.key} type="button" role="menuitem" className={it.tone || ''} disabled={it.disabled} title={it.title} onClick={() => { setOpen(false); it.onPick && it.onPick() }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

export function SavedTag({ show }) {
  const t = useT()
  if (!show) return null
  return <span className="wka-saved"><Check size={14} /> {t('shared.saved')}</span>
}

// One label/value row in a collapsed "record" view (a saved config shown
// read-only until the operator clicks Edit). Used across the admin dashboards so
// forms do not sit open after saving.
export function RecRow({ label, value }) {
  return (
    <div className="wka-rec-row" style={{ display: 'flex', gap: 14, padding: '7px 0', borderBottom: '1px solid var(--wka-line, #eceff3)' }}>
      <div style={{ width: 170, flexShrink: 0, color: 'var(--wka-muted)', fontSize: 13 }}>{label}</div>
      {/* --wka-text is the console's theme token (light and dark). The old
          --wka-ink never existed, so every value fell back to #111 and was
          unreadable in dark mode. */}
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--wka-text)', minWidth: 0, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

// One line of a "live state" checklist: a green check / amber warning / red
// cross, a bold label and a muted detail. Single source for the Billing and AI
// config state lists (SUPREME RULE II - they used to carry identical copies).
export function StateRow({ ok, warn, label, detail }) {
  const Icon = ok ? CheckCircle2 : (warn ? AlertTriangle : XCircle)
  const color = ok ? 'var(--wka-emerald)' : (warn ? 'var(--wka-amber)' : 'var(--wka-red)')
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--wka-line)' }}>
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ color: 'var(--wka-muted)', fontSize: 12 }}>{detail}</div>
      </div>
    </div>
  )
}

// The Edit / Save+Cancel control row + header affordance for a collapsible card.
// `editing` + `onEdit`/`onCancel` toggle; the caller renders the record vs form.
export function EditToggle({ editing, onEdit, disabled }) {
  const t = useT()
  if (editing || disabled) return null
  return <button type="button" className="wka-btn sm ghost" onClick={onEdit}><Pencil size={13} /> {t('shared.edit')}</button>
}

// A 403 {locked:true} from a step-up-gated endpoint (re-prompt for the code).
export function isLockError(e) { return !!(e && e.status === 403 && e.data && e.data.locked) }

// Shared destructive-action confirm: collects a REQUIRED reason (owner standing
// rule - every destructive action is logged with who/what/when/why) and calls
// onConfirm(reason). Single source so the reason gate can never drift per screen.
// `extra` renders additional controls (e.g. a "also delete members" checkbox)
// between the message and the reason box.
export function ReasonModal({
  title, message = '', confirmLabel, onConfirm, onCancel,
  busy = false, error = null, extra = null, danger = true,
  placeholder,
}) {
  const t = useT()
  const titleText = title === undefined ? t('shared.confirm') : title
  const confirmText = confirmLabel === undefined ? t('shared.delete') : confirmLabel
  const placeholderText = placeholder === undefined ? t('shared.reasonPlaceholder') : placeholder
  const [reason, setReason] = useState('')
  const can = reason.trim().length >= 3 && !busy
  const confirm = () => { if (can) onConfirm(reason.trim()) }
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel && onCancel() }}>
      <div className="wka-panel" style={{ maxWidth: 460, width: '100%', position: 'relative' }}>
        <button type="button" aria-label={t('shared.close')} onClick={() => !busy && onCancel && onCancel()}
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wka-faint)' }}>
          <X size={18} />
        </button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} style={{ color: danger ? 'var(--wka-red)' : 'var(--wka-emerald)' }} /> {titleText}
        </h2>
        {message ? <p className="desc">{message}</p> : null}
        {extra}
        <textarea className="wka-input" rows={3} value={reason} autoFocus placeholder={placeholderText}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirm() }}
          style={{ width: '100%', resize: 'vertical', marginTop: 4 }} />
        <div style={{ fontSize: 11.5, color: 'var(--wka-faint)', marginTop: 4 }}>{t('shared.reasonHint')}</div>
        {error ? <div style={{ margin: '10px 0' }}><ErrorBox error={error} /></div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" className="wka-btn sm ghost" onClick={() => onCancel && onCancel()} disabled={busy}>{t('shared.cancel')}</button>
          <button type="button" className="wka-btn sm" onClick={confirm} disabled={!can}
            style={danger ? { background: 'var(--wka-red)', borderColor: 'var(--wka-red)', color: '#fff' } : undefined}>
            {busy ? <Spinning /> : null} {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Promise-style wrapper over the canonical ReasonModal (single source - SUPREME
// RULE II; replaces the per-screen copies that used to live in Companies.jsx and
// WorkCompanyAdmin.jsx). Usage:
//   const [askReason, reasonModal] = useReasonModal()
//   render {reasonModal} once, then
//   const reason = await askReason({ title, detail, confirmLabel })
// resolves to the trimmed reason (>= 3 chars) or null when cancelled. `detail`
// is accepted as an alias for `message` so existing call sites are unchanged.
export function useReasonModal() {
  const [cfg, setCfg] = useState(null)
  const resolver = useRef(null)
  const finish = useCallback((val) => {
    const r = resolver.current
    resolver.current = null
    setCfg(null)
    if (r) r(val)
  }, [])
  const ask = useCallback((opts) => new Promise((resolve) => {
    if (resolver.current) resolver.current(null)
    resolver.current = resolve
    setCfg(opts || {})
  }), [])
  const cancel = useCallback(() => finish(null), [finish])
  const node = cfg ? (
    <ReasonModal
      title={cfg.title}
      message={cfg.detail != null ? cfg.detail : cfg.message}
      confirmLabel={cfg.confirmLabel}
      danger={cfg.danger !== false}
      placeholder={cfg.placeholder}
      onConfirm={finish}
      onCancel={cancel}
    />
  ) : null
  return [ask, node]
}

// Generic MFA step-up gate: stands in front of a critical page until a fresh
// authenticator code is verified. Presentational - the caller passes `verify`
// (async code -> status) and the current `status` (from the step-up endpoint).
// WorkCoPilot uses ONE shared step-up window, so unlocking here also unlocks the
// other sensitive pages for the window's lifetime.
export function StepUpGate({ status, verify, onUnlock, label }) {
  const t = useT()
  const labelText = label === undefined ? t('shared.stepUpPage') : label
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
      <div style={{ width: 52, height: 52, borderRadius: 14, margin: '4px auto 14px', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--wka-emerald) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--wka-emerald) 30%, transparent)' }}>
        <Lock size={22} style={{ color: 'var(--wka-emerald)' }} />
      </div>
      <h2 style={{ justifyContent: 'center' }}>{t('shared.locked', { label: labelText })}</h2>
      <p className="desc" style={{ textAlign: 'center' }}>{t('shared.stepUpDesc')}</p>
      {needsEnroll ? (
        <div className="wka-note" style={{ marginTop: 10, justifyContent: 'center' }}><AlertTriangle size={14} /> {t('shared.mfaEnrollFirst')}</div>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 8 }}>
          <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder={t('shared.otpPlaceholder')} value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} autoFocus
            style={{ maxWidth: 200, margin: '0 auto', textAlign: 'center', letterSpacing: '0.4em', fontSize: 20 }} />
          {error ? <div style={{ margin: '12px 0' }}><ErrorBox error={error} /></div> : null}
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="wka-btn primary" disabled={busy || !code.trim()}>{busy ? <Spinning /> : <Shield size={14} />} {t('shared.verifyOpen')}</button>
          </div>
        </form>
      )}
    </div>
  )
}

// Thin banner above an unlocked step-up page: live countdown + lock-now. `lock`
// is the async lock fn; `onLocked` re-checks the gate.
export function StepUpBanner({ status, onLocked, lock, label }) {
  const t = useT()
  const labelText = label === undefined ? t('shared.stepUpBannerLabel') : label
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
      padding: '9px 14px', marginBottom: 14, borderRadius: 10, border: '1px solid color-mix(in srgb, var(--wka-emerald) 35%, transparent)', background: 'color-mix(in srgb, var(--wka-emerald) 7%, transparent)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--wka-emerald)' }}>
        <CheckCircle2 size={15} />
        {status.breakGlass ? t('shared.mfaDisabled', { label: labelText.toLowerCase() }) : t('shared.verifiedCountdown', { time: `${mm}:${String(ss).padStart(2, '0')}` })}
      </span>
      {!status.breakGlass ? <button type="button" className="wka-btn sm ghost" onClick={lockNow}><Lock size={13} /> {t('shared.lockNow')}</button> : null}
    </div>
  )
}

// A modal step-up re-auth for a single sensitive ACTION (a payout, saving secret
// keys). Shown when an endpoint returns 403 {locked:true} (isLockError). `verify`
// is the async code -> status fn (workAdminApi.verifyAiStepUp); on success it calls
// onUnlocked(status) so the caller can retry the action. Decoupled: takes verify
// as a prop, imports nothing beyond react + lucide.
export function StepUpPrompt({ verify, onUnlocked, onCancel, label }) {
  const t = useT()
  const labelText = label === undefined ? t('shared.stepUpAction') : label
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    if (e) e.preventDefault()
    if (busy || !code.trim()) return
    setBusy(true); setError(null)
    try { const st = await verify(code.trim()); setCode(''); onUnlocked(st) }
    catch (err) { setError(err) } finally { setBusy(false) }
  }
  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12,18,28,0.55)', backdropFilter: 'blur(2px)', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel && onCancel() }}>
      <div className="wka-panel" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, margin: '2px auto 12px', display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--wka-emerald) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--wka-emerald) 30%, transparent)' }}>
          <Lock size={20} style={{ color: 'var(--wka-emerald)' }} />
        </div>
        <h2 style={{ justifyContent: 'center' }}>{t('shared.confirmItsYou')}</h2>
        <p className="desc" style={{ textAlign: 'center' }}>{t('shared.stepUpActionDesc', { label: labelText })}</p>
        <form onSubmit={submit}>
          <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder={t('shared.otpPlaceholder')} value={code} autoFocus
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            style={{ maxWidth: 200, margin: '0 auto', textAlign: 'center', letterSpacing: '0.4em', fontSize: 20 }} />
          {error ? <div style={{ margin: '12px 0' }}><ErrorBox error={error} /></div> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            <button type="button" className="wka-btn sm ghost" onClick={() => onCancel && onCancel()} disabled={busy}>{t('shared.cancel')}</button>
            <button type="submit" className="wka-btn sm primary" disabled={busy || !code.trim()}>{busy ? <Spinning /> : <Shield size={14} />} {t('shared.verifyContinue')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
