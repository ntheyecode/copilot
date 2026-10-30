// One API key as an expandable row: name, prefix + last 4, scope chips, status
// badge, last used and expiry in the head; created by/at, IP allowlist and the
// Rotate / Revoke actions in the body. Rotate opens an inline sub-panel (grace
// period + step-up code when required) and hands the parent the new secret;
// Revoke confirms inline first. The row never sees a secret.
import { useState } from 'react'
import { KeyRound, RefreshCw, Trash2, AlertTriangle, Clock, Lock } from 'lucide-react'
import { api } from '../../../../api.js'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import DevRow from './DevRow.jsx'
import StepUpField from './StepUpField.jsx'
import { registryLabel, keyStatus, STATUS_BADGE, GRACE_OPTIONS, fmtDate, fmtDateTime, fmtRelative, errorText, isStepUp, isStepUpLocked, stepUpLockedText, codeOf } from './devModel.js'

export default function ApiKeyRow({ k, scopes, stepUp, open, onToggle, onRotated, onRevoked }) {
  const t = useT()
  const [mode, setMode] = useState(null)        // null | 'rotate' | 'revoke'
  const [grace, setGrace] = useState('none')
  const [code, setCode] = useState('')
  const [askCode, setAskCode] = useState(!!stepUp)
  const [rejected, setRejected] = useState(false)
  const [locked, setLocked] = useState('')      // the server's STEP_UP_LOCKED sentence (429): no more attempts for now
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const status = keyStatus(k)
  const live = status === 'active'
  const scopeOf = (id) => registryLabel(t, 'apiKeys.scope', (scopes || []).find((s) => s.id === id) || { id })
  const start = (m) => { setMode(m); setErr(''); setCode(''); setRejected(false); setAskCode(!!stepUp) }
  const frozen = busy || !!locked

  const rotate = async () => {
    if (askCode && code.length < 6) { setErr(t('apiKeys.err.stepUpNeeded')); return }
    const minutes = (GRACE_OPTIONS.find((o) => o.id === grace) || GRACE_OPTIONS[0]).minutes
    setBusy(true); setErr('')
    try {
      const r = await api.workCompanyApiKeyRotate(k.id, { graceMinutes: minutes, ...(askCode && code ? { mfaToken: code } : {}) })
      setMode(null); onRotated(r, minutes)
    } catch (ex) {
      if (isStepUpLocked(ex)) { setLocked(stepUpLockedText(t, ex)); setCode(''); setRejected(false) }
      else if (isStepUp(ex)) { setAskCode(true); setRejected(!!code); setCode(''); setErr(code ? '' : t('apiKeys.err.stepUpNeeded')) }
      // A grace period keeps the old key active too; at the company's key limit
      // (50 active) that cannot be issued: say so and point at the no-grace option.
      else if (codeOf(ex) === 'LIMIT_REACHED' && minutes > 0) setErr(t('apiKeys.err.limitGrace'))
      else setErr(errorText(t, 'apiKeys', ex))
    } finally { setBusy(false) }
  }
  const revoke = async () => {
    setBusy(true); setErr('')
    try { const r = await api.workCompanyApiKeyRevoke(k.id); setMode(null); onRevoked(r) }
    catch (ex) { setErr(errorText(t, 'apiKeys', ex)) }
    finally { setBusy(false) }
  }

  const chips = (
    <>
      <span className="wka-dev-chip wka-dev-mono faint">{k.prefix}…{k.last4}</span>
      <span className={`wka-badge ${STATUS_BADGE[status] || ''}`}>{t(`apiKeys.status.${status}`)}</span>
    </>
  )
  const sub = [
    k.lastUsedAt ? t('apiKeys.row.lastUsed', { time: fmtRelative(k.lastUsedAt, t.locale) }) : t('apiKeys.row.neverUsed'),
    k.expiresAt ? t('apiKeys.row.expires', { date: fmtDate(k.expiresAt, t.locale) }) : t('apiKeys.row.noExpiry'),
    (k.scopes || []).map(scopeOf).join(', '),
  ].filter(Boolean).join(' · ')

  return (
    <DevRow id={k.id} icon={<KeyRound size={15} />} title={k.name} sub={sub} chips={chips} open={open} onToggle={onToggle} faded={!live}>
      <div className="wka-dev-kv">
        <div className="wide"><span>{t('apiKeys.row.scopes')}</span><div className="wka-dev-tags">{(k.scopes || []).map((id) => <span key={id} className="wka-dev-chip">{scopeOf(id)}</span>)}</div></div>
        <div><span>{t('apiKeys.row.createdBy')}</span><b>{(k.createdBy && k.createdBy.name) || '-'}</b></div>
        <div><span>{t('apiKeys.row.createdAt')}</span><b>{fmtDateTime(k.createdAt, t.locale) || '-'}</b></div>
        <div><span>{t('apiKeys.row.ipAllow')}</span><b className={k.ipAllowlist && k.ipAllowlist.length ? 'wka-dev-mono' : ''}>{k.ipAllowlist && k.ipAllowlist.length ? k.ipAllowlist.join(', ') : t('apiKeys.row.anyIp')}</b></div>
        {k.revokedAt ? <div><span>{t('apiKeys.status.revoked')}</span><b>{fmtDateTime(k.revokedAt, t.locale)}</b></div> : null}
        {k.rotatedFromId ? <div><span>{t('apiKeys.row.lineage')}</span><b>{t('apiKeys.row.rotatedFrom')}</b></div> : null}
        {k.rotatedToId ? <div><span>{t('apiKeys.row.lineage')}</span><b>{t('apiKeys.row.rotatedTo')}</b></div> : null}
      </div>
      {live && !mode ? (
        <div className="wka-dev-acts">
          <button type="button" className="wka-btn sm" onClick={() => start('rotate')}><RefreshCw size={13} /> {t('apiKeys.row.rotate')}</button>
          <button type="button" className="wka-btn sm ghost danger" onClick={() => start('revoke')}><Trash2 size={13} /> {t('apiKeys.row.revoke')}</button>
        </div>
      ) : null}
      {mode === 'rotate' ? (
        <div className="wka-dev-sub" role="group" aria-label={t('apiKeys.rotate.title', { name: k.name })}>
          <h4>{t('apiKeys.rotate.title', { name: k.name })}</h4>
          <p>{t('apiKeys.rotate.body')}</p>
          <div className="wka-field" style={{ margin: 0 }}>
            <label><Clock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{t('apiKeys.rotate.grace')}</label>
            <div className="wka-dev-seg" role="radiogroup" aria-label={t('apiKeys.rotate.grace')}>
              {GRACE_OPTIONS.map((o) => <button key={o.id} type="button" role="radio" aria-checked={grace === o.id} className={grace === o.id ? 'on' : ''} disabled={frozen} onClick={() => { setGrace(o.id); if (err) setErr('') }}>{t(`apiKeys.rotate.${o.id}`)}</button>)}
            </div>
          </div>
          {askCode ? <StepUpField id={`wka-dev-otp-${k.id}`} value={code} onChange={(v) => { setCode(v); if (err) setErr('') }} rejected={rejected} disabled={frozen} autoFocus /> : null}
          {locked ? <div className="wka-note" role="status" style={{ margin: 0, color: 'var(--wka-amber)' }}><Lock size={14} /> {locked}</div> : null}
          {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
          <div className="wka-dev-acts">
            <button type="button" className="wka-btn sm primary" disabled={frozen} onClick={rotate}>{busy ? <Spinning /> : <RefreshCw size={13} />} {busy ? t('apiKeys.rotate.busy') : t('apiKeys.rotate.confirm')}</button>
            <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => setMode(null)}>{t('apiKeys.cancel')}</button>
          </div>
        </div>
      ) : null}
      {mode === 'revoke' ? (
        <div className="wka-dev-sub" role="alertdialog" aria-label={t('apiKeys.revoke.title', { name: k.name })}>
          <h4 style={{ color: 'var(--wka-red)' }}>{t('apiKeys.revoke.title', { name: k.name })}</h4>
          <p>{t('apiKeys.revoke.body')}</p>
          {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
          <div className="wka-dev-acts">
            <button type="button" className="wka-btn sm danger" disabled={busy} onClick={revoke}>{busy ? <Spinning /> : <Trash2 size={13} />} {busy ? t('apiKeys.revoke.busy') : t('apiKeys.revoke.confirm')}</button>
            <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => setMode(null)}>{t('apiKeys.cancel')}</button>
          </div>
        </div>
      ) : null}
    </DevRow>
  )
}
