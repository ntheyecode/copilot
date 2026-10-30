// Create an API key: name, scope checkboxes (from the server registry), expiry
// pills, optional IP allowlist, and the inline authenticator code when the
// server requires a step-up. Validation that the server will also do is checked
// here first so the round trip is only for real requests; a 401
// STEP_UP_REQUIRED keeps the form open and asks for the code again. On success
// the parent receives { key, secret } and shows the show-once panel.
import { useState } from 'react'
import { KeyRound, X, AlertTriangle, Lock } from 'lucide-react'
import { api } from '../../../../api.js'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import StepUpField from './StepUpField.jsx'
import { registryLabel, EXPIRY_OPTIONS, parseIpList, looksLikeIp, errorText, isStepUp, isStepUpLocked, stepUpLockedText } from './devModel.js'

export default function ApiKeyForm({ scopes, stepUp, onCreated, onCancel }) {
  const t = useT()
  const [name, setName] = useState('')
  const [picked, setPicked] = useState(() => new Set())
  const [expiry, setExpiry] = useState('d90')
  const [ips, setIps] = useState('')
  const [code, setCode] = useState('')
  const [askCode, setAskCode] = useState(!!stepUp)
  const [rejected, setRejected] = useState(false)
  const [locked, setLocked] = useState('')      // the server's STEP_UP_LOCKED sentence (429): no more attempts for now
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const list = parseIpList(ips)
  const badIp = list.find((s) => !looksLikeIp(s))

  const submit = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2 || n.length > 60) { setErr(t('apiKeys.err.name')); return }
    if (!picked.size) { setErr(t('apiKeys.err.scopes')); return }
    if (badIp) { setErr(t('apiKeys.err.ip')); return }
    if (askCode && code.length < 6) { setErr(t('apiKeys.err.stepUpNeeded')); return }
    const days = (EXPIRY_OPTIONS.find((o) => o.id === expiry) || {}).days
    setBusy(true); setErr('')
    try {
      const r = await api.workCompanyApiKeyCreate({
        name: n, scopes: [...picked], expiresInDays: days == null ? null : days, ipAllowlist: list,
        ...(askCode && code ? { mfaToken: code } : {}),
      })
      onCreated(r)
    } catch (ex) {
      if (isStepUpLocked(ex)) { setLocked(stepUpLockedText(t, ex)); setCode(''); setRejected(false) }
      else if (isStepUp(ex)) { setAskCode(true); setRejected(!!code); setCode(''); setErr(code ? '' : t('apiKeys.err.stepUpNeeded')) }
      else setErr(errorText(t, 'apiKeys', ex))
    } finally { setBusy(false) }
  }
  const frozen = busy || !!locked

  return (
    <form className="wka-dev-form" onSubmit={submit} aria-label={t('apiKeys.newKey')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ flex: 1, minWidth: 0 }}><KeyRound size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('apiKeys.newKey')}</h3>
        <button type="button" className="wka-btn sm ghost" onClick={onCancel} disabled={busy} aria-label={t('apiKeys.cancel')}><X size={14} /></button>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label htmlFor="wka-ak-name">{t('apiKeys.form.name')}</label>
        <input id="wka-ak-name" className="wka-input" value={name} maxLength={60} autoFocus disabled={busy}
          placeholder={t('apiKeys.form.namePh')} onChange={(e) => { setName(e.target.value); if (err) setErr('') }} />
        <span className="hint">{t('apiKeys.form.nameHint')}</span>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label>{t('apiKeys.form.scopes')}</label>
        <div className="wka-dev-opts" role="group" aria-label={t('apiKeys.form.scopes')}>
          {(scopes || []).map((s) => (
            <label key={s.id} className={`wka-dev-opt${picked.has(s.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={picked.has(s.id)} disabled={busy} onChange={() => { toggle(s.id); if (err) setErr('') }} />
              <span style={{ minWidth: 0 }}>{registryLabel(t, 'apiKeys.scope', s)}<span className="id wka-dev-mono">{s.id}</span></span>
            </label>
          ))}
        </div>
        <span className="hint">{t('apiKeys.form.scopesHint')}</span>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label>{t('apiKeys.form.expiry')}</label>
        <div className="wka-dev-seg" role="radiogroup" aria-label={t('apiKeys.form.expiry')}>
          {EXPIRY_OPTIONS.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={expiry === o.id} className={expiry === o.id ? 'on' : ''} disabled={busy} onClick={() => setExpiry(o.id)}>
              {t(`apiKeys.expiry.${o.id}`)}
            </button>
          ))}
        </div>
        <span className="hint">{t('apiKeys.form.expiryHint')}</span>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label htmlFor="wka-ak-ips">{t('apiKeys.form.ip')}</label>
        <textarea id="wka-ak-ips" className="wka-input wka-dev-mono" rows={2} value={ips} disabled={busy} style={{ resize: 'vertical' }}
          placeholder={t('apiKeys.form.ipPh')} onChange={(e) => { setIps(e.target.value); if (err) setErr('') }} />
        <span className="hint" style={badIp ? { color: 'var(--wka-red)' } : undefined}>{badIp ? t('apiKeys.err.ip') : t('apiKeys.form.ipHint')}</span>
      </div>
      {askCode ? <StepUpField value={code} onChange={(v) => { setCode(v); if (err) setErr('') }} rejected={rejected} disabled={frozen} autoFocus={rejected} /> : null}
      {locked ? <div className="wka-note" role="status" style={{ margin: 0, color: 'var(--wka-amber)' }}><Lock size={14} /> {locked}</div> : null}
      {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
      <div className="wka-dev-acts">
        <button type="submit" className="wka-btn primary" disabled={frozen}>{busy ? <Spinning /> : <KeyRound size={14} />} {busy ? t('apiKeys.creating') : t('apiKeys.create')}</button>
        <button type="button" className="wka-btn ghost" onClick={onCancel} disabled={busy}>{t('apiKeys.cancel')}</button>
      </div>
    </form>
  )
}
