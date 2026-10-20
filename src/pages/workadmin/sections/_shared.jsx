// Shared presentational primitives for the WorkCoPilot admin sections.
// Pure UI, no data fetching. Only react + lucide-react are imported.
import React from 'react'
import { Loader2, AlertTriangle, Inbox, RefreshCw, Check } from 'lucide-react'

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
