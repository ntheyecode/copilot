// The confirm for forgetting a whole source or everything. A real dialog
// (role, aria-modal, labelled by its title, Escape closes, Tab stays inside,
// focus lands on Cancel so a stray Enter never forgets, and returns to where
// it came from on close). `strong` adds the "I understand this cannot be
// undone" acknowledgement before the danger button turns on.
// Strings: brainPage.confirm.*.
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'

export default function ConfirmDialog({ title, body, confirmLabel, strong = false, busy = false, onConfirm, onCancel }) {
  const t = useT()
  const [ack, setAck] = useState(false)
  const box = useRef(null)
  const cancelRef = useRef(null)
  // Focus Cancel on open; give focus back to the opener on close.
  useEffect(() => {
    const opener = typeof document !== 'undefined' ? document.activeElement : null
    if (cancelRef.current) cancelRef.current.focus()
    return () => { if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus() }
  }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { e.preventDefault(); onCancel(); return }
      if (e.key !== 'Tab' || !box.current) return
      const items = [...box.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      else if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])
  const canConfirm = !busy && (!strong || ack)
  return (
    <div className="wd-modal-ov" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}>
      <div className="wd-modal wd-brain-modal" ref={box} role="dialog" aria-modal="true" aria-labelledby="wd-brain-confirm-h" aria-describedby="wd-brain-confirm-b">
        <h3 id="wd-brain-confirm-h"><AlertTriangle size={18} /> {title}</h3>
        <p id="wd-brain-confirm-b">{body}</p>
        {strong && (
          <label className="wd-brain-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={busy} />
            <span>{t('brainPage.confirm.ack')}</span>
          </label>
        )}
        <div className="wd-brain-modal-acts">
          <button type="button" ref={cancelRef} onClick={onCancel} disabled={busy}><X size={14} /> {t('brainPage.confirm.cancel')}</button>
          <button type="button" className="danger" onClick={onConfirm} disabled={!canConfirm} data-testid="brain-confirm">
            {busy ? <Loader2 size={14} className="wd-brain-spin" /> : null} {busy ? t('brainPage.confirm.working') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
