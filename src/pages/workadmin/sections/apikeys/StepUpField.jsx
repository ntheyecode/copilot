// Inline 6-digit authenticator code for the step-up on key create / rotate
// (the server answers 401 STEP_UP_REQUIRED without a current code when
// stepUp.required is true). Controlled: the parent keeps the code and clears it
// after each attempt, and re-shows this field with `rejected` when the server
// asked again.
import { ShieldCheck } from 'lucide-react'
import { useT } from '../../../../i18n/index.jsx'

export default function StepUpField({ id = 'wka-dev-otp', value, onChange, rejected = false, disabled = false, autoFocus = false }) {
  const t = useT()
  return (
    <div className="wka-field" style={{ margin: 0 }}>
      <label htmlFor={id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={13} style={{ color: 'var(--wka-emerald)' }} /> {t('apiKeys.form.mfa')}</label>
      <input id={id} className="wka-input wka-dev-mono wka-dev-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
        placeholder={t('shared.otpPlaceholder')} value={value} disabled={disabled} autoFocus={autoFocus}
        aria-invalid={rejected || undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} />
      <span className="hint" style={rejected ? { color: 'var(--wka-red)' } : undefined}>{rejected ? t('apiKeys.err.stepUp') : t('apiKeys.form.mfaHint')}</span>
    </div>
  )
}
