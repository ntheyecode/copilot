import { ScanEye, Loader2, Check, AlertTriangle, X } from 'lucide-react'
import RichText from '../../components/RichText.jsx'
import { useT } from '../../i18n/index.jsx'
import { VERIFY_DONE, VERIFY_NOT_YET, VERIFY_NO_FRAME } from './verifyFlow.js'

// OPTIONAL "Verify on my screen": the user's own confidence check before
// moving on (and the natural on-demand read when continuous watching is
// off). Never forced: a SECONDARY button beside the primary Mark done, and a
// calm inline verdict strip (never a modal) above the action row, so the
// Mark done button directly beneath is the shortcut when it "Looks done".
// Shared by the console step card and the floating panel; styled by
// guideView.css.js (.gv-verify*), so it works in the bare PiP document too.
// The verdict itself comes from verifyFlow.js (one mapping for both hosts).

export function VerifyButton({ onClick, verifying = false, disabled = false }) {
  const t = useT()
  return (
    <button type="button" className="gv-btn gv-verify-btn" onClick={onClick} disabled={disabled || verifying} aria-busy={verifying || undefined} title={t('workGuide.verify.btnTip')}>
      {verifying ? <Loader2 size={15} className="gv-spin" aria-hidden="true" /> : <ScanEye size={15} strokeWidth={2.2} aria-hidden="true" />}
      {t('workGuide.verify.btn')}
    </button>
  )
}

export function VerifyVerdict({ verdict, verifying = false, onRetry, onDismiss }) {
  const t = useT()
  if (verifying) {
    return (
      <div className="gv-verify is-checking" role="status" aria-live="polite">
        <span className="gv-verify-ic" aria-hidden="true"><span className="gv-ana"><i /><i /><i /></span></span>
        <div className="gv-verify-b"><span className="gv-verify-k">{t('workGuide.verify.checking')}</span></div>
      </div>
    )
  }
  if (!verdict) return null
  const done = verdict.kind === VERIFY_DONE
  const notYet = verdict.kind === VERIFY_NOT_YET
  const cls = done ? 'is-done' : notYet ? 'is-notyet' : 'is-error'
  const head = done ? t('workGuide.verify.done')
    : notYet ? t('workGuide.verify.notYet')
      : verdict.kind === VERIFY_NO_FRAME ? t('workGuide.verify.noFrame')
        : t('workGuide.verify.failed')
  const obs = String(verdict.observation || '').trim()
  const detail = notYet ? (String(verdict.detail || '').trim() || t('workGuide.verify.notYetDefault')) : String(verdict.detail || '').trim()
  return (
    <div className={`gv-verify ${cls}`} role={notYet ? 'alert' : 'status'}>
      <span className="gv-verify-ic" aria-hidden="true">{done ? <Check size={15} strokeWidth={2.8} /> : <AlertTriangle size={15} strokeWidth={2.4} />}</span>
      <div className="gv-verify-b">
        <span className="gv-verify-k">{head}</span>
        {done && obs && <span className="gv-verify-t"><RichText text={obs} accent="var(--gv-good)" chips={false} /></span>}
        {done && <span className="gv-verify-hint">{t('workGuide.verify.doneHint')}</span>}
        {/* Not yet: what is wrong / what to do next (the flag, else the live
            guidance; values stay one-tap copy chips), then the quiet "I can see". */}
        {notYet && <span className="gv-verify-t"><RichText text={detail} accent="var(--gv-warn)" /></span>}
        {notYet && obs && obs !== detail && (
          <span className="gv-verify-saw"><span className="gv-k">{t('workGuide.verify.saw')}</span><span><RichText text={obs} accent="var(--gv-muted)" chips={false} /></span></span>
        )}
        {!done && !notYet && detail && <span className="gv-verify-t">{detail}</span>}
        {!done && onRetry && <div className="gv-verify-row"><button type="button" className="gv-verify-link" onClick={onRetry}>{t('workGuide.verify.again')}</button></div>}
      </div>
      {onDismiss && <button type="button" className="gv-verify-x" onClick={onDismiss} aria-label={t('workGuide.verify.dismiss')} title={t('workGuide.verify.dismiss')}><X size={14} aria-hidden="true" /></button>}
    </div>
  )
}
