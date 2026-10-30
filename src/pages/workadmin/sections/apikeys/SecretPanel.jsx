// The SHOW-ONCE panel for an API key or a webhook signing secret. The secret
// lives only in the parent's React state while this panel is mounted; the
// parent clears it on dismiss (no localStorage, no console, no re-fetch: the
// server never returns it again). Copy writes to the clipboard and confirms;
// the field itself is select-all so a manual copy also works where the
// clipboard is blocked.
import { useEffect, useState } from 'react'
import { KeyRound, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useT } from '../../../../i18n/index.jsx'

export default function SecretPanel({ ns, kind = 'created', secret, note, onDone }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  useEffect(() => () => setCopied(false), [secret])
  const copy = async () => {
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2200) } catch { /* clipboard blocked: the field is select-all */ }
  }
  const rotated = kind === 'rotated'
  return (
    <section className="wka-dev-secret" role="status" aria-live="polite">
      <h3><KeyRound size={16} style={{ color: 'var(--wka-accent)' }} /> {rotated ? t(`${ns}.secret.rotatedTitle`) : t(`${ns}.secret.title`)}</h3>
      <p>{rotated ? t(`${ns}.secret.rotatedBody`) : t(`${ns}.secret.body`)}</p>
      <div className="wka-dev-secret-row">
        <code className="wka-dev-code" aria-label={t(`${ns}.secret.fieldAria`)}>{secret}</code>
        <button type="button" className="wka-btn primary" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t(`${ns}.secret.copied`) : t(`${ns}.secret.copy`)}
        </button>
      </div>
      <div className="wka-dev-secret-foot">
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--wka-amber)', fontWeight: 600 }}>
          <AlertTriangle size={13} /> {t(`${ns}.secret.once`)}
        </span>
        {note ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{note}</span> : null}
        <span className="wka-spacer" />
        <button type="button" className="wka-btn sm" onClick={onDone}><ShieldCheck size={13} /> {t(`${ns}.secret.done`)}</button>
      </div>
    </section>
  )
}
