// One accountable-action modal for the enterprise pages: a title, a body, an
// optional extra control (a select of people), a reason textarea (required or
// optional) and Confirm. Used by Hold project and Move project to another
// manager. Portaled into .wd (WdPortal) so the rail never covers it. The reason
// is recorded server-side in the control log (who / what / when / why).
import { useEffect, useState } from 'react'
import { Loader2, X, AlertTriangle, ArrowRight } from 'lucide-react'
import { useT } from '../../../i18n/index.jsx'
import WdPortal from '../WdPortal.jsx'

export default function ReasonModal({ eyebrow, title, body, confirmLabel, requireReason = true, children, canConfirm = true, onConfirm, onClose, error }) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  const ok = canConfirm && (!requireReason || reason.trim().length >= 3)
  const submit = async (e) => {
    if (e) e.preventDefault()
    if (!ok || busy) return
    setBusy(true)
    try { await onConfirm(reason.trim()) } finally { setBusy(false) }
  }
  return (
    <WdPortal>
      <div className="wd-modal-ov" onClick={() => !busy && onClose()}>
        <div className="wd-pj-modal wd-ep-modal" role="dialog" aria-modal="true" aria-labelledby="wd-ep-reason-title" onClick={(e) => e.stopPropagation()}>
          <div className="wd-pj-modal-top">
            <span className="wd-wiz-eyebrow">{eyebrow}</span>
            <button type="button" className="wd-pj-btn icon" onClick={onClose} disabled={busy} aria-label={t('workPm.common.close')}><X size={16} /></button>
          </div>
          <form className="wd-pj-modal-body wd-ep-modal-body" id="wd-ep-reason-form" onSubmit={submit}>
            <h3 id="wd-ep-reason-title">{title}</h3>
            {body && <p>{body}</p>}
            {children}
            <div className="wd-pj-field">
              <label htmlFor="wd-ep-reason">{t('workPm.common.reason')} {requireReason ? <span className="req">{t('workPm.common.reasonRequired')}</span> : <span className="opt">{t('workPm.create.optional')}</span>}</label>
              <textarea id="wd-ep-reason" className="wd-pj-ta" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} autoFocus />
              <div className="wd-pj-help"><span>{t('workPm.common.reasonNote')}</span></div>
            </div>
            {error && <div className="wd-pj-err" role="alert"><AlertTriangle size={14} /> <span>{error}</span></div>}
          </form>
          <div className="wd-pj-modal-foot">
            <button type="button" className="wd-pj-btn" onClick={onClose} disabled={busy}>{t('workPm.common.cancel')}</button>
            <button type="submit" form="wd-ep-reason-form" className="wd-pj-btn primary" disabled={!ok || busy}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {confirmLabel}</button>
          </div>
        </div>
      </div>
    </WdPortal>
  )
}
