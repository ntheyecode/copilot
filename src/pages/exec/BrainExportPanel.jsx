// Executive-only Company Brain export (shown on /work/exec when the signed-in
// user is an executive; the server enforces requireExecutiveOnly). Set an export
// passphrase, view or replace it (a fresh authenticator code is required on a
// hosted service once a key exists), then download the encrypted .wcpx archive.
// The archive fetch is binary, so it bypasses the JSON api wrapper. No AI model
// or cost anywhere. Small, single purpose; no backend logic here.
import React, { useCallback, useEffect, useState } from 'react'
import { Database, KeyRound, Eye, EyeOff, Download, Check, Lock, Loader2, ShieldCheck } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import { useT } from '../../i18n/index.jsx'
import { ErrorBox } from '../workadmin/sections/_shared.jsx'

const IS_APP = typeof window !== 'undefined' && !!window.refigold

// POST the binary archive and resolve to { blob, filename } or throw with
// .status/.data (so a 409 { needKey } can be branched, like api.workTeamDataExport).
async function fetchArchive() {
  const headers = {}
  if (IS_APP) headers['X-Refigold-App'] = '1'
  const res = await fetch(api.brainExportPath(), { method: 'POST', credentials: 'include', headers: Object.keys(headers).length ? headers : undefined })
  if (!res.ok) {
    let data = null
    try { data = await res.json() } catch { /* no body */ }
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status; err.data = data || null
    throw err
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const m = /filename="?([^";]+)"?/i.exec(cd)
  return { blob, filename: (m && m[1]) || 'workcopilot-export.wcpx' }
}

export default function BrainExportPanel() {
  const t = useT()
  const [status, setStatus] = useState(null)          // { keySet, hosted }
  const [loadErr, setLoadErr] = useState('')
  const [pass, setPass] = useState('')
  const [mfa, setMfa] = useState('')
  const [revealed, setRevealed] = useState('')        // the shown passphrase, or ''
  const [busy, setBusy] = useState('')                // '', 'save', 'reveal', 'download'
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [replacing, setReplacing] = useState(false)   // show the set form again to replace an existing key

  const load = useCallback(() => {
    setLoadErr('')
    api.brainExportStatus().then(setStatus).catch((e) => setLoadErr(friendlyError(e, t('execPage.brain.errStatus'))))
  }, [t])
  useEffect(() => { load() }, [load])

  // A fresh authenticator code is required to reveal or replace an existing key
  // on the hosted service (the server enforces it; this shows the field).
  const needsMfa = !!(status && status.hosted && status.keySet)

  const saveKey = async () => {
    if (pass.trim().length < 10 || busy) return
    setBusy('save'); setErr(''); setMsg('')
    try {
      await api.brainExportSetKey(pass.trim(), needsMfa ? mfa.trim() : undefined)
      setPass(''); setMfa(''); setReplacing(false); setRevealed('')
      setMsg(t('execPage.brain.saved')); load()
    } catch (e) { setErr(friendlyError(e, t('execPage.brain.errSet'))) } finally { setBusy('') }
  }

  const reveal = async () => {
    if (busy || (needsMfa && !mfa.trim())) return
    setBusy('reveal'); setErr(''); setMsg('')
    try {
      const r = await api.brainExportRevealKey(needsMfa ? mfa.trim() : undefined)
      setRevealed((r && r.passphrase) || ''); setMfa('')
    } catch (e) { setErr(friendlyError(e, t('execPage.brain.errReveal'))) } finally { setBusy('') }
  }

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const download = async () => {
    if (busy) return
    setBusy('download'); setErr(''); setMsg('')
    try {
      const { blob, filename } = await fetchArchive()
      triggerDownload(blob, filename)
      setMsg(t('execPage.brain.downloaded'))
    } catch (e) {
      if (e && e.status === 409 && e.data && e.data.needKey) { setReplacing(true); setErr(t('execPage.brain.needKeyFirst')) }
      else setErr(friendlyError(e, t('execPage.brain.errDownload')))
    } finally { setBusy('') }
  }

  if (loadErr) return (
    <section className="wka-panel" style={{ marginTop: 20 }}><ErrorBox error={{ status: 400, message: loadErr }} onRetry={load} /></section>
  )
  if (!status) return (
    <section className="wka-panel" style={{ marginTop: 20 }}><div className="wka-state"><div className="wka-spinner" aria-hidden="true" /><div>{t('execPage.brain.loading')}</div></div></section>
  )

  const showSetForm = !status.keySet || replacing

  return (
    <section className="wka-panel" style={{ marginTop: 20 }}>
      <div className="xb-head">
        <span className="xb-ikon"><Database size={20} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>{t('execPage.brain.title')}</h2>
          <p className="desc" style={{ margin: '4px 0 0' }}>{t('execPage.brain.sub')}</p>
        </div>
      </div>

      <div className="wka-note" style={{ alignItems: 'flex-start', marginTop: 14 }}><ShieldCheck size={15} style={{ color: 'var(--wka-accent)', flexShrink: 0, marginTop: 1 }} /><span style={{ minWidth: 0 }}>{t('execPage.brain.note')}</span></div>

      {/* passphrase state */}
      {status.keySet && !replacing ? (
        <div style={{ marginTop: 14 }}>
          <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {t('execPage.brain.keySet')}</div>
          {revealed ? (
            <div className="wka-note" style={{ alignItems: 'center', marginTop: 10 }}><KeyRound size={14} /><code className="wka-mono" style={{ overflowWrap: 'anywhere' }}>{revealed}</code><button type="button" className="wka-btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => setRevealed('')}><EyeOff size={13} /> {t('execPage.brain.hide')}</button></div>
          ) : null}
          {needsMfa && (
            <div className="xb-row">
              <div className="wka-field"><label><Lock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('execPage.brain.mfaLabel')}</label>
                <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={mfa} placeholder={t('execPage.brain.mfaPh')} onChange={(e) => setMfa(e.target.value.replace(/[^0-9]/g, ''))} style={{ maxWidth: 180, letterSpacing: '0.3em' }} />
              </div>
            </div>
          )}
          <div className="xb-actions">
            {!revealed && <button type="button" className="wka-btn sm ghost" disabled={busy || (needsMfa && !mfa.trim())} onClick={reveal}>{busy === 'reveal' ? <Loader2 size={13} className="xb-spin" /> : <Eye size={13} />} {t('execPage.brain.reveal')}</button>}
            <button type="button" className="wka-btn sm ghost" disabled={!!busy} onClick={() => { setReplacing(true); setRevealed(''); setErr('') }}><KeyRound size={13} /> {t('execPage.brain.replace')}</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div className="xb-row">
            <div className="wka-field"><label>{t('execPage.brain.passphraseLabel')} <span className="hint">{t('execPage.brain.minHint')}</span></label>
              <input className="wka-input" type="password" autoComplete="new-password" value={pass} placeholder={t('execPage.brain.passphrasePh')} onChange={(e) => setPass(e.target.value)} />
            </div>
            {needsMfa && (
              <div className="wka-field" style={{ flex: '0 0 180px' }}><label><Lock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{t('execPage.brain.mfaLabel')}</label>
                <input className="wka-input wka-mono" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={mfa} placeholder={t('execPage.brain.mfaPh')} onChange={(e) => setMfa(e.target.value.replace(/[^0-9]/g, ''))} style={{ letterSpacing: '0.3em' }} />
              </div>
            )}
            <button type="button" className="wka-btn primary" disabled={pass.trim().length < 10 || !!busy || (needsMfa && !mfa.trim())} onClick={saveKey}>{busy === 'save' ? <Loader2 size={13} className="xb-spin" /> : <Check size={14} />} {t('execPage.brain.save')}</button>
            {replacing && <button type="button" className="wka-btn sm ghost" disabled={!!busy} onClick={() => { setReplacing(false); setPass(''); setMfa(''); setErr('') }}>{t('execPage.brain.cancel')}</button>}
          </div>
        </div>
      )}

      {/* download */}
      <div className="xb-actions" style={{ marginTop: 16, borderTop: '1px solid var(--wka-line)', paddingTop: 16 }}>
        <button type="button" className="wka-btn" disabled={!!busy} onClick={download}>{busy === 'download' ? <Loader2 size={14} className="xb-spin" /> : <Download size={14} />} {t('execPage.brain.download')}</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)', alignSelf: 'center', minWidth: 0 }}>{t('execPage.brain.downloadHint')}</span>
      </div>

      {msg && <div className="wka-note" style={{ color: 'var(--wka-emerald)', marginTop: 12 }}><Check size={14} /> {msg}</div>}
      {err && <div style={{ marginTop: 12 }}><ErrorBox error={{ status: 400, message: err }} /></div>}
    </section>
  )
}
