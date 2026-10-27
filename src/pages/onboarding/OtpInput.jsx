// Six-digit code entry. ONE real input (not six boxes): paste just works, iOS /
// Android autofill from the mail app works (autocomplete="one-time-code"),
// screen readers read one field, and the six cells are purely visual. Autofocus
// on mount; calls onComplete the moment six digits are present.
import { useEffect, useRef } from 'react'

const LEN = 6

export default function OtpInput({ id, value, onChange, onComplete, label, describedBy, invalid = false, disabled = false }) {
  const ref = useRef(null)
  useEffect(() => { const el = ref.current; if (el) { try { el.focus({ preventScroll: true }) } catch { el.focus() } } }, [])
  const set = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, LEN)
    onChange(digits)
    if (digits.length === LEN && onComplete) onComplete(digits)
  }
  const cells = Array.from({ length: LEN }, (_, i) => value[i] || '')
  const active = Math.min(value.length, LEN - 1)
  return (
    <div className="ob-otp">
      <label htmlFor={id} className="ob-otp-label">{label}</label>
      <div className="ob-otp-wrap">
        <div className="ob-otp-cells" aria-hidden="true">
          {cells.map((ch, i) => <span key={i} className={`ob-otp-cell${ch ? ' filled' : ''}${i === active && !disabled ? ' active' : ''}`}>{ch}</span>)}
        </div>
        <input
          ref={ref}
          id={id}
          className="ob-otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={LEN}
          value={value}
          onChange={(e) => set(e.target.value)}
          onPaste={(e) => { const txt = (e.clipboardData || window.clipboardData).getData('text'); if (txt) { e.preventDefault(); set(txt) } }}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus
        />
      </div>
    </div>
  )
}
