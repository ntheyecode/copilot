import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useT } from '../i18n/index.jsx'

// A small, self-contained "Copy" button for the code and terminal commands shown
// in the marketing demos (home banner, use cases, demo). It was previously a dead
// <span>Copy</span> label; this makes it actually copy. It strips a leading "$ "
// shell prompt so the user copies the real command, shows a brief "Copied"
// confirmation, and falls back to execCommand when the async clipboard API is
// unavailable (older browsers, insecure context). Inherits the header's font so
// it sits where the old label did. Labels come from the catalog (widgets.copy.*);
// pass `label` only to override the default "Copy" wording.
export default function CopyChip({ text, label }) {
  const t = useT()
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation() }
    const clean = String(text || '').replace(/^\s*\$\s+/, '').trim()
    if (!clean) return
    let ok = false
    // Prefer the async clipboard API, but fall back to execCommand when it is
    // unavailable OR rejects (insecure context, permission, no transient
    // activation) so the copy still works and the user still sees confirmation.
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clean)
        ok = true
      }
    } catch { /* fall through to execCommand */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = clean; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { /* give up quietly */ }
    }
    if (ok) { setDone(true); setTimeout(() => setDone(false), 1500) }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={done ? t('widgets.copy.copied') : t('widgets.copy.copyCommand')}
      aria-label={done ? t('widgets.copy.copiedAria') : t('widgets.copy.copyAria')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'transparent', border: 0, padding: '1px 3px', margin: 0,
        cursor: 'pointer', font: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit',
        color: done ? '#8cf5c4' : 'inherit', opacity: done ? 1 : 0.85, transition: 'opacity .15s, color .15s',
      }}
      onMouseEnter={(e) => { if (!done) e.currentTarget.style.opacity = '1' }}
      onMouseLeave={(e) => { if (!done) e.currentTarget.style.opacity = '0.85' }}
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? t('widgets.copy.copied') : (label || t('widgets.copy.copy'))}
    </button>
  )
}
