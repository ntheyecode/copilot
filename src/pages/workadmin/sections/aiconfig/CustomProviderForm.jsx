// Add any OpenAI-compatible endpoint (base URL + key). The server validates the
// base as a public https host and adds it to the egress allowlist. For when a new
// cost-effective provider appears that is not built in yet. Moved verbatim out
// of AiConfig.jsx (no behavior change) so that file stays thin wiring.
import React, { useState } from 'react'
import { CheckCircle2, XCircle, Plus } from 'lucide-react'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'

export default function CustomProviderForm({ onAdd }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ id: '', label: '', base: '', chatModels: '', apiKey: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const submit = async () => {
    if (busy) return
    setBusy(true); setErr(null); setOk(false)
    const r = await onAdd({ id: f.id, label: f.label, base: f.base, chatModels: f.chatModels, apiKey: f.apiKey })
    if (r.ok) { setOk(true); setF({ id: '', label: '', base: '', chatModels: '', apiKey: '' }); setTimeout(() => { setOk(false); setOpen(false) }, 1600) }
    else setErr(r.error || t('aiConfig.couldNotAdd'))
    setBusy(false)
  }
  if (!open) return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="wka-btn sm" onClick={() => setOpen(true)}><Plus size={13} /> {t('aiConfig.addCustomProvider')}</button>
    </div>
  )
  return (
    <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: '1px dashed var(--wka-line)', background: 'var(--wka-panel-2)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('aiConfig.addCustomProvider')}</div>
      <p className="desc" style={{ marginTop: 0 }}>{t('aiConfig.customDesc')}</p>
      <div className="wka-formgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>{t('aiConfig.idLabel')}</label><input className="wka-input" value={f.id} placeholder={t('aiConfig.idPlaceholder')} onChange={set('id')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0 }}><label style={{ fontSize: 11 }}>{t('aiConfig.labelLabel')}</label><input className="wka-input" value={f.label} placeholder={t('aiConfig.labelPlaceholder')} onChange={set('label')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.baseUrlLabel')}</label><input className="wka-input wka-mono" value={f.base} placeholder="https://api.together.xyz/v1" onChange={set('base')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.modelIdsLabel')}</label><input className="wka-input wka-mono" value={f.chatModels} placeholder="meta-llama/Llama-3.3-70B-Instruct-Turbo" onChange={set('chatModels')} disabled={busy} /></div>
        <div className="wka-field" style={{ margin: 0, gridColumn: '1 / -1' }}><label style={{ fontSize: 11 }}>{t('aiConfig.apiKey')}</label><input className="wka-input" type="password" autoComplete="new-password" value={f.apiKey} placeholder={t('aiConfig.pasteKey')} onChange={set('apiKey')} disabled={busy} /></div>
      </div>
      {err ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-red)', display: 'flex', gap: 6 }}><XCircle size={14} /> {err}</div> : null}
      {ok ? <div style={{ marginTop: 10, fontSize: 12, color: 'var(--wka-emerald)', display: 'flex', gap: 6 }}><CheckCircle2 size={14} /> {t('aiConfig.addedTested')}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="wka-btn primary sm" disabled={busy || !f.id.trim() || !f.base.trim() || !f.chatModels.trim()} onClick={submit}>{busy ? <Spinning /> : <Plus size={13} />} {t('aiConfig.addTest')}</button>
        <button type="button" className="wka-btn sm ghost" disabled={busy} onClick={() => { setOpen(false); setErr(null) }}>{t('aiConfig.cancel')}</button>
      </div>
    </div>
  )
}
