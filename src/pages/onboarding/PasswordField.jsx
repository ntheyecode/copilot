// Password input with show/hide. Password-manager friendly: a real <input
// type=password> with autocomplete="new-password", paste allowed, no confirm
// field. The toggle is a labelled button (aria-pressed), never an icon alone.
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'

export default function PasswordField({ id, value, onChange, label, hint, autoComplete = 'new-password', describedBy, invalid = false, disabled = false }) {
  const t = useT()
  const [show, setShow] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="ob-field">
      <label htmlFor={id}>{label}</label>
      <div className="ob-pw">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          minLength={8}
          maxLength={256}
          required
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, describedBy].filter(Boolean).join(' ') || undefined}
        />
        <button type="button" className="ob-pw-toggle" aria-pressed={show} aria-label={show ? t('onboarding.account.hidePw') : t('onboarding.account.showPw')} onClick={() => setShow((v) => !v)} disabled={disabled}>
          {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && <div id={hintId} className="ob-hint">{hint}</div>}
    </div>
  )
}
