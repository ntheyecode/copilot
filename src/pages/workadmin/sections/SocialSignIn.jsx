// Social sign-in: the PLATFORM OAuth apps (Google / Microsoft / Facebook) behind
// the public sign-in buttons. One app each, used by every customer's sign-in -
// not per company. Superadmin-only. The client secret is set-only: the view
// shows a masked client id + when it was set, never the secret. Saving goes
// through the same authenticator step-up as the AI settings (the server answers
// 403 {locked:true} when the window is closed; the prompt opens it and retries).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, KeyRound, Copy, Check, Link2, Save, ExternalLink } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { fmtDateTime } from '../workadmin.css.js'
import { Loading, ErrorBox, Spinning, SavedTag, StepUpPrompt, isLockError } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

// Display order + the developer console where each app is created. Ids are the
// keys the API returns (the server owns the closed set; this is display data).
const PROVIDERS = [
  { id: 'google', consoleUrl: 'https://console.cloud.google.com/apis/credentials' },
  { id: 'microsoft', consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', tenant: true },
  { id: 'facebook', consoleUrl: 'https://developers.facebook.com/apps/' },
]
const CALLBACK_PATH = '/api/work/social/callback'

function CallbackUrl() {
  const t = useT()
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${CALLBACK_PATH}`
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
      <Link2 size={14} style={{ color: 'var(--wka-cyan)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--wka-muted)', whiteSpace: 'nowrap' }}>{t('socialSignIn.callbackLabel')}</span>
      <code className="wka-mono" style={{ fontSize: 12, minWidth: 0, wordBreak: 'break-all', padding: '4px 8px', borderRadius: 8, background: 'var(--wka-panel-2)', border: '1px solid var(--wka-line)' }}>{url}</code>
      <button type="button" className="wka-btn sm ghost" onClick={copy} title={t('socialSignIn.copy')}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('socialSignIn.copied') : t('socialSignIn.copy')}</button>
    </div>
  )
}

// One provider card: state, client id, client secret (set-only), optional
// tenant, Save, and a two-step Clear when configured.
function ProviderCard({ def, state, isSuperAdmin, busy, saved, error, onSave, onClear }) {
  const t = useT()
  const s = state || {}
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [tenant, setTenant] = useState(s.tenant || '')
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => { setTenant(s.tenant || '') }, [s.tenant])
  const canSave = !!clientId.trim() && !!clientSecret.trim()
  const save = () => { onSave(def.id, { clientId: clientId.trim(), clientSecret: clientSecret.trim(), ...(def.tenant ? { tenant: tenant.trim() || undefined } : {}) }); setClientId(''); setClientSecret('') }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, padding: '16px 16px 14px', borderRadius: 12, border: `1px solid ${s.configured ? 'color-mix(in srgb, var(--wka-emerald) 45%, transparent)' : 'var(--wka-line)'}`, background: 'var(--wka-panel-2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 140px' }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(`socialSignIn.providers.${def.id}.label`)}</div>
          <div style={{ fontSize: 12, color: 'var(--wka-muted)', lineHeight: 1.4, marginTop: 2 }}>{t(`socialSignIn.providers.${def.id}.blurb`)}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 999, padding: '3px 9px',
          color: s.configured ? 'var(--wka-emerald)' : 'var(--wka-faint)', border: `1px solid ${s.configured ? 'color-mix(in srgb, var(--wka-emerald) 40%, transparent)' : 'var(--wka-line-2)'}` }}>
          {s.configured ? <CheckCircle2 size={11} /> : null}{s.configured ? t('socialSignIn.state.configured') : t('socialSignIn.state.notSet')}
        </span>
      </div>

      {s.configured ? (
        <div style={{ fontSize: 12, color: 'var(--wka-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>{t('socialSignIn.clientIdLabel')} <code className="wka-mono">{s.clientIdMasked}</code></div>
          <div>{t('socialSignIn.clientSecretLabel')} <code className="wka-mono">••••••••</code> <span style={{ color: 'var(--wka-faint)' }}>{t('socialSignIn.secretSetOnly')}</span></div>
          {def.tenant && s.tenant ? <div>{t('socialSignIn.tenantLabel')} <code className="wka-mono">{s.tenant}</code></div> : null}
          {s.setAt ? <div style={{ color: 'var(--wka-faint)' }}>{t('socialSignIn.setAt', { date: fmtDateTime(s.setAt) })}</div> : null}
        </div>
      ) : null}

      {error ? <ErrorBox error={error} /> : null}

      {isSuperAdmin ? (
        <>
          <div className="wka-field" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{s.configured ? t('socialSignIn.replaceClientId') : t('socialSignIn.clientIdLabel')}</label>
            <input className="wka-input wka-mono" value={clientId} autoComplete="off" placeholder={t(`socialSignIn.providers.${def.id}.idHint`)} onChange={(e) => setClientId(e.target.value)} disabled={busy} />
          </div>
          <div className="wka-field" style={{ margin: 0 }}>
            <label style={{ fontSize: 11 }}>{t('socialSignIn.clientSecretLabel')}</label>
            <input className="wka-input" type="password" autoComplete="new-password" value={clientSecret} placeholder={t('socialSignIn.pasteSecret')} onChange={(e) => setClientSecret(e.target.value)} disabled={busy} />
          </div>
          {def.tenant ? (
            <div className="wka-field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>{t('socialSignIn.tenantOptional')}</label>
              <input className="wka-input wka-mono" value={tenant} autoComplete="off" placeholder="common" onChange={(e) => setTenant(e.target.value)} disabled={busy} />
              <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{t('socialSignIn.tenantHint')}</div>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
            <button type="button" className="wka-btn primary sm" disabled={busy || !canSave} onClick={save}>{busy ? <Spinning /> : <Save size={13} />} {t('socialSignIn.save')}</button>
            {s.configured && !confirmClear ? <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => setConfirmClear(true)} style={{ color: 'var(--wka-red)' }}>{t('socialSignIn.clear')}</button> : null}
            {s.configured && confirmClear ? (
              <>
                <button type="button" className="wka-btn danger sm" disabled={busy} onClick={() => { setConfirmClear(false); onClear(def.id) }}>{t('socialSignIn.confirmClear')}</button>
                <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => setConfirmClear(false)}>{t('socialSignIn.cancel')}</button>
              </>
            ) : null}
            <SavedTag show={saved} />
          </div>
          <a href={def.consoleUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--wka-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{t(`socialSignIn.providers.${def.id}.where`)} <ExternalLink size={11} /></a>
        </>
      ) : null}
    </div>
  )
}

export default function SocialSignIn({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, social: null })
  const [busy, setBusy] = useState({})      // provider -> true while saving
  const [saved, setSaved] = useState({})    // provider -> true briefly after a save
  const [errors, setErrors] = useState({})  // provider -> Error
  const [stepUp, setStepUp] = useState(null) // { provider, body } awaiting an authenticator code

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.getSocial(); setState({ loading: false, error: null, social: d.social || {} }) }
    catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { if (isSuperAdmin) load() }, [isSuperAdmin, load])

  const submit = async (provider, body) => {
    if (!isSuperAdmin) return
    setBusy((b) => ({ ...b, [provider]: true })); setErrors((e) => ({ ...e, [provider]: null }))
    try {
      const d = await workAdminApi.setSocial(provider, body)
      setState((s) => ({ ...s, social: d.social || s.social }))
      setSaved((v) => ({ ...v, [provider]: true })); setTimeout(() => setSaved((v) => ({ ...v, [provider]: false })), 2200)
    } catch (error) {
      // The save needs the step-up window: ask for a code, then retry this
      // exact save (the typed values are held in `body`, never re-asked).
      if (isLockError(error)) { setStepUp({ provider, body }); return }
      setErrors((e) => ({ ...e, [provider]: error }))
    } finally { setBusy((b) => ({ ...b, [provider]: false })) }
  }
  const onSave = (provider, body) => submit(provider, body)
  const onClear = (provider) => submit(provider, { clientId: '', clientSecret: '' })

  if (!isSuperAdmin) return <div className="wka-note"><Lock size={14} /> {t('socialSignIn.superadminOnly')}</div>
  if (state.loading) return <Loading label={t('socialSignIn.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const social = state.social || {}
  return (
    <div>
      {stepUp ? <StepUpPrompt verify={workAdminApi.verifyAiStepUp} label={t('socialSignIn.stepUpLabel')} onUnlocked={() => { const s = stepUp; setStepUp(null); submit(s.provider, s.body) }} onCancel={() => setStepUp(null)} /> : null}

      <div className="wka-panel">
        <h2><KeyRound size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-accent)' }} />{t('socialSignIn.title')}</h2>
        <p className="desc">{t.rich('socialSignIn.desc')}</p>
        <CallbackUrl />
        <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--wka-faint)', lineHeight: 1.5 }}>{t('socialSignIn.callbackHint')}</div>
      </div>

      <div className="wka-panel">
        <h2>{t('socialSignIn.appsTitle')}</h2>
        <p className="desc">{t('socialSignIn.appsDesc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
          {PROVIDERS.map((def) => (
            <ProviderCard key={def.id} def={def} state={social[def.id]} isSuperAdmin={isSuperAdmin} busy={!!busy[def.id]} saved={!!saved[def.id]} error={errors[def.id]} onSave={onSave} onClear={onClear} />
          ))}
        </div>
      </div>
    </div>
  )
}
