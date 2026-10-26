import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown, FileText, AlignLeft, ScrollText, Loader2 } from 'lucide-react'
import { api, friendlyError } from '../api.js'

// Download-format chooser for a session: PDF report / plain-text report / audit
// log. Fetches with the window's OWN authenticated session (api.downloadFile), so
// it works on web AND in the desktop app (no window.open / external-browser 401).
// Self-contained inline styles + a tiny scoped <style> for item hover, so it
// drops into any surface (completed tasks, the guiding console) without needing
// per-surface CSS. The trigger takes the surface's own button className so it
// looks native there.
let _hoverStyleInjected = false
function ensureHoverStyle() {
  if (_hoverStyleInjected || typeof document === 'undefined') return
  _hoverStyleInjected = true
  const el = document.createElement('style')
  el.textContent = '.wc-dlmenu-item:hover,.wc-dlmenu-item:focus-visible{background:var(--surface-2,#f1f3fa);outline:none}'
  document.head.appendChild(el)
}

export default function DownloadMenu({ sessionId, label = 'Download', className = '', align = 'right', onError }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const ref = useRef(null)
  useEffect(() => { ensureHoverStyle() }, [])
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const FORMATS = [
    { id: 'pdf', Icon: FileText, label: 'PDF report', hint: 'Formatted, with screenshots', url: api.workReportUrl(sessionId, true), name: `workcopilot-${sessionId}.pdf` },
    { id: 'txt', Icon: AlignLeft, label: 'Text report (.txt)', hint: 'Plain text, same content', url: api.workReportTxtUrl(sessionId, true), name: `workcopilot-${sessionId}.txt` },
    { id: 'log', Icon: ScrollText, label: 'Audit log (.log)', hint: 'Every AI transmission', url: api.workAuditUrl(sessionId), name: `workcopilot-${sessionId}-audit.log` },
  ]
  const pick = async (f) => {
    setOpen(false); setBusy(f.id)
    try { await api.downloadFile(f.url, f.name) }
    catch (e) { if (onError) onError(friendlyError(e, 'Could not download. Please try again.')) }
    finally { setBusy('') }
  }

  const menuStyle = {
    position: 'absolute', top: 'calc(100% + 6px)', [align === 'left' ? 'left' : 'right']: 0, zIndex: 60,
    minWidth: 236, background: 'var(--surface, #fff)', border: '1px solid var(--border, #e7eaf2)',
    borderRadius: 12, boxShadow: '0 18px 44px -18px rgba(16,24,40,.30)', padding: 6,
    display: 'flex', flexDirection: 'column', gap: 2,
  }
  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none', borderRadius: 8, padding: '9px 10px', cursor: 'pointer',
    font: 'inherit', color: 'var(--text, #1b2033)',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className={className} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} disabled={!!busy} title="Download this session">
        {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />} {label} <ChevronDown size={13} style={{ marginLeft: 1, opacity: 0.7 }} />
      </button>
      {open && (
        <div role="menu" aria-label="Download format" style={menuStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted, #5c6484)', padding: '4px 10px 6px' }}>Download as</div>
          {FORMATS.map((f) => (
            <button key={f.id} type="button" role="menuitem" className="wc-dlmenu-item" style={itemStyle} onClick={() => pick(f)}>
              <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--em-fill, #eafaf3)', color: 'var(--em, #0e9f6e)' }}><f.Icon size={15} /></span>
              <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <b style={{ fontSize: 13.5, fontWeight: 650 }}>{f.label}</b>
                <small style={{ fontSize: 11.5, color: 'var(--text-muted, #5c6484)' }}>{f.hint}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
