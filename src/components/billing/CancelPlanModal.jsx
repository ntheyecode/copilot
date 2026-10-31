// Cancel a personal plan in the app (server/billing_lifecycle.js): one modal
// with the honest access-until line, an optional reason, and the confirm. The
// plan ends at the period end and can be resumed any time before. Extracted
// from WorkBilling.jsx, which used to send people to the Stripe portal for
// this. Strings: billingWidget.cancelModal.* and billingWidget.lifecycle.*.
import { useState } from 'react'
import { Ban, Check, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'

export default function CancelPlanModal({ periodEnd, onClose, onDone }) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '' } catch { return '' } }
  const confirm = async () => {
    setBusy(true); setErr('')
    try {
      const r = await api.workCancelSubscription(reason.trim())
      onDone(r && r.subscription)
    } catch (e) {
      setErr((e && e.message) || t('billingWidget.lifecycle.errCancel'))
      setBusy(false)
    }
  }
  return (
    <div className="wb-ov" onClick={() => !busy && onClose()}>
      <div className="wb-modal" role="dialog" aria-modal="true" aria-label={t('billingWidget.cancelModal.aria')} onClick={(e) => e.stopPropagation()}>
        <h3><Ban size={18} /> {t('billingWidget.cancelModal.title')}</h3>
        <p className="wb-modal-note">{periodEnd ? t.rich('billingWidget.cancelModal.noteDate', { date: fmtDate(periodEnd) }) : t('billingWidget.cancelModal.note')}</p>
        <label className="wb-reason">
          <span>{t('billingWidget.lifecycle.reasonLabel')}</span>
          <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('billingWidget.lifecycle.reasonPh')} />
        </label>
        <p className="wb-modal-fine">{t('billingWidget.lifecycle.fine')}</p>
        {err && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{err}</span></div>}
        <div className="wb-modal-btns">
          <button className="wb-btn ghost" onClick={onClose} disabled={busy}>{t('billingWidget.cancelModal.keep')}</button>
          <button className="wb-btn danger" onClick={confirm} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
            <span>{t('billingWidget.lifecycle.confirmCancel')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
