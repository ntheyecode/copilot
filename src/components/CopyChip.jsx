import { useState } from 'react'
import { Copy, ClipboardCopy, Check } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

// The ONE copy-to-clipboard affordance (SUPREME RULE II): the marketing demos
// (home banner, use cases, demo), the guiding console's terminal and code
// blocks, its floating panel and the public "try it live" widget all copy
// through this file. It used to exist twice (this chip + a CopyButton inside
// Guiding.jsx) with two different clipboard paths; the floater's window-aware
// path is the one kept, because the async clipboard API only works in the
// window that owns the clicked button (the pop-out / PiP panel is its own
// window), with a hidden-textarea execCommand fallback in that same document
// (insecure context, permission, no transient activation). Returns whether
// the text landed, so a caller can show its own confirmation.
function fallbackCopy(text, doc) {
  try {
    const ta = doc.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    doc.body.appendChild(ta); ta.focus(); ta.select()
    const ok = doc.execCommand && doc.execCommand('copy')
    doc.body.removeChild(ta)
    return !!ok
  } catch { return false }
}
export async function copyText(text, e) {
  const clean = String(text == null ? '' : text)
  if (!clean.trim()) return false
  const node = e && e.currentTarget
  const doc = (node && node.ownerDocument) || document
  const win = doc.defaultView || window
  try {
    if (win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText && win.isSecureContext !== false) {
      await win.navigator.clipboard.writeText(clean)
      return true
    }
  } catch { /* fall through to execCommand */ }
  return fallbackCopy(clean, doc)
}

// Three looks, one behaviour:
//   inline (default) - the transparent label the marketing demos show in a code
//                      header; strips a leading "$ " shell prompt so the user
//                      copies the real command.
//   pill             - the floater's dark Copy pill for terminal / code block
//                      headers (what CopyButton in Guiding.jsx used to draw).
//   className        - no inline style at all: the host's CSS styles the button
//                      (class + " done" while confirming), for themed surfaces
//                      such as the console's copy row (.wc-copybtn).
// Labels come from the catalog (widgets.copy.*); pass `label` only to override
// the default "Copy" wording.
export default function CopyChip({ text, label, variant = 'inline', className, title }) {
  const t = useT()
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    const raw = String(text || '')
    const clean = variant === 'inline' ? raw.replace(/^\s*\$\s+/, '').trim() : raw
    if (!clean.trim()) return
    if (await copyText(clean, e)) { setDone(true); setTimeout(() => setDone(false), 1500) }
  }
  const pill = variant === 'pill'
  const style = className ? undefined : pill
    ? { display: 'inline-flex', alignItems: 'center', gap: 5, background: done ? 'rgba(74,208,122,0.16)' : 'rgba(255,255,255,0.08)', color: done ? '#7ee7a6' : '#cdd6e5', border: `1px solid ${done ? '#3a7a55' : 'rgba(255,255,255,0.14)'}`, borderRadius: 7, padding: '4px 9px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
    : {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'transparent', border: 0, padding: '1px 3px', margin: 0,
        cursor: 'pointer', font: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit',
        color: done ? '#8cf5c4' : 'inherit', opacity: done ? 1 : 0.85, transition: 'opacity .15s, color .15s',
      }
  const hover = (!className && !pill) ? {
    onMouseEnter: (e) => { if (!done) e.currentTarget.style.opacity = '1' },
    onMouseLeave: (e) => { if (!done) e.currentTarget.style.opacity = '0.85' },
  } : {}
  const Icon = variant === 'inline' ? Copy : ClipboardCopy
  return (
    <button
      type="button"
      onClick={copy}
      className={className ? `${className}${done ? ' done' : ''}` : undefined}
      title={done ? t('widgets.copy.copied') : (title || (variant === 'inline' ? t('widgets.copy.copyCommand') : t('widgets.copy.copyAria')))}
      aria-label={done ? t('widgets.copy.copiedAria') : t('widgets.copy.copyAria')}
      style={style}
      {...hover}
    >
      {done ? <Check size={variant === 'inline' ? 12 : 13} /> : <Icon size={variant === 'inline' ? 12 : 13} />}
      {done ? t('widgets.copy.copied') : (label || t('widgets.copy.copy'))}
    </button>
  )
}
