import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown, FileText, AlignLeft, ScrollText, Loader2 } from 'lucide-react'
import { api, friendlyError } from '../api.js'
import { useT } from '../i18n/index.jsx'

// Download-format chooser for a session: PDF report / plain-text report / audit
// log. Fetches with the window's OWN authenticated session (api.downloadFile), so
// it works on web AND in the desktop app (no window.open / external-browser 401).
// Self-contained: one scoped <style> injected once, so it drops into any surface
// (completed tasks, the dashboard's outcomes, the guiding console). The popover
// reads the in-product design tokens first (.wd: --panel, --line-soft, --tx,
// --mut, --tint-green, --sh-3, --r), then the public site's global tokens, then
// a last-resort literal for a host that defines neither, so it is themed (light,
// dark, heavy) wherever it mounts. The trigger takes the surface's own button
// className so it looks native there.
let _styleInjected = false
function ensureStyle() {
  if (_styleInjected || typeof document === 'undefined') return
  _styleInjected = true
  const el = document.createElement('style')
  el.textContent = [
    '.wc-dlmenu-wrap{position:relative;display:inline-flex}',
    '.wc-dlmenu{position:absolute;top:calc(100% + 6px);z-index:60;min-width:236px;background:var(--panel,var(--surface,#fff));border:1px solid var(--line-soft,var(--border,#e7eaf2));border-radius:var(--r,12px);box-shadow:var(--sh-3,0 18px 44px -18px rgba(16,24,40,.30));padding:6px;display:flex;flex-direction:column;gap:2px}',
    '.wc-dlmenu.right{right:0}.wc-dlmenu.left{left:0}',
    '.wc-dlmenu-h{font-size:calc(11.5px*var(--wc-fs,1));font-weight:600;color:var(--mut,var(--text-muted,#5c6484));padding:4px 10px 6px}',
    '.wc-dlmenu-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:transparent;border:none;border-radius:var(--r-xs,8px);padding:9px 10px;cursor:pointer;font:inherit;color:var(--tx,var(--text,#1b2033))}',
    '.wc-dlmenu-item:hover,.wc-dlmenu-item:focus-visible{background:var(--line-soft,var(--surface-2,#f1f3fa));outline:none}',
    '.wc-dlmenu-ic{display:inline-flex;width:28px;height:28px;border-radius:var(--r-xs,8px);align-items:center;justify-content:center;flex-shrink:0;background:var(--tint-green,var(--em-fill,#eafaf3));color:var(--tint-green-ink,var(--em,#0e9f6e))}',
    '.wc-dlmenu-tx{min-width:0;display:flex;flex-direction:column;line-height:1.3}',
    '.wc-dlmenu-tx b{font-size:calc(13.5px*var(--wc-fs,1));font-weight:650}',
    '.wc-dlmenu-tx small{font-size:calc(11.5px*var(--wc-fs,1));color:var(--mut,var(--text-muted,#5c6484))}',
    '.wc-dlmenu-chev{margin-left:1px;opacity:.7;flex-shrink:0}',
  ].join('\n')
  document.head.appendChild(el)
}

export default function DownloadMenu({ sessionId, label, className = '', align = 'right', onError }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const ref = useRef(null)
  useEffect(() => { ensureStyle() }, [])
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const FORMATS = [
    { id: 'pdf', Icon: FileText, label: t('downloadMenu.formats.pdf'), hint: t('downloadMenu.formats.pdfHint'), url: api.workReportUrl(sessionId, true), name: `workcopilot-${sessionId}.pdf` },
    { id: 'txt', Icon: AlignLeft, label: t('downloadMenu.formats.txt'), hint: t('downloadMenu.formats.txtHint'), url: api.workReportTxtUrl(sessionId, true), name: `workcopilot-${sessionId}.txt` },
    { id: 'log', Icon: ScrollText, label: t('downloadMenu.formats.log'), hint: t('downloadMenu.formats.logHint'), url: api.workAuditUrl(sessionId), name: `workcopilot-${sessionId}-audit.log` },
  ]
  const pick = async (f) => {
    setOpen(false); setBusy(f.id)
    try { await api.downloadFile(f.url, f.name) }
    catch (e) { if (onError) onError(friendlyError(e, t('downloadMenu.errDownload'))) }
    finally { setBusy('') }
  }

  return (
    <div ref={ref} className="wc-dlmenu-wrap">
      <button type="button" className={className} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} disabled={!!busy} title={t('downloadMenu.triggerTip')}>
        {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />} {label || t('downloadMenu.label')} <ChevronDown size={13} className="wc-dlmenu-chev" />
      </button>
      {open && (
        <div role="menu" aria-label={t('downloadMenu.menuAria')} className={`wc-dlmenu ${align === 'left' ? 'left' : 'right'}`}>
          <div className="wc-dlmenu-h">{t('downloadMenu.heading')}</div>
          {FORMATS.map((f) => (
            <button key={f.id} type="button" role="menuitem" className="wc-dlmenu-item" onClick={() => pick(f)}>
              <span className="wc-dlmenu-ic"><f.Icon size={15} /></span>
              <span className="wc-dlmenu-tx">
                <b>{f.label}</b>
                <small>{f.hint}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
