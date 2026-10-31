// Add a webhook endpoint: HTTPS url, event checkboxes (from the server
// registry), optional description. Obvious mistakes (not https, no event) are
// caught before the round trip; the server stays the authority (BAD_URL,
// BAD_EVENTS). On success the parent receives { endpoint, secret } and shows
// the show-once signing secret.
import { useState } from 'react'
import { Webhook, X, AlertTriangle } from 'lucide-react'
import { api } from '../../../../api.js'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import { registryLabel, isHttpsUrl, errorText } from './devModel.js'

export default function WebhookForm({ events, onCreated, onCancel }) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [picked, setPicked] = useState(() => new Set((events || []).filter((e) => e.id !== 'ping').map((e) => e.id)))
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const submit = async (e) => {
    e.preventDefault()
    const u = url.trim()
    if (!isHttpsUrl(u)) { setErr(t('webhooks.err.url')); return }
    if (!picked.size) { setErr(t('webhooks.err.events')); return }
    setBusy(true); setErr('')
    try { onCreated(await api.workCompanyWebhookCreate({ url: u, events: [...picked], description: desc.trim() })) }
    catch (ex) { setErr(errorText(t, 'webhooks', ex)) }
    finally { setBusy(false) }
  }

  return (
    <form className="wka-dev-form" onSubmit={submit} aria-label={t('webhooks.newEndpoint')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ flex: 1, minWidth: 0 }}><Webhook size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('webhooks.newEndpoint')}</h3>
        <button type="button" className="wka-btn sm ghost" onClick={onCancel} disabled={busy} aria-label={t('webhooks.cancel')}><X size={14} /></button>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label htmlFor="wka-wh-url">{t('webhooks.form.url')}</label>
        <input id="wka-wh-url" className="wka-input wka-dev-mono" type="url" inputMode="url" value={url} maxLength={2000} autoFocus disabled={busy}
          placeholder={t('webhooks.form.urlPh')} onChange={(e) => { setUrl(e.target.value); if (err) setErr('') }} />
        <span className="hint">{t('webhooks.form.urlHint')}</span>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label>{t('webhooks.form.events')}</label>
        <div className="wka-dev-opts" role="group" aria-label={t('webhooks.form.events')}>
          {(events || []).map((ev) => (
            <label key={ev.id} className={`wka-dev-opt${picked.has(ev.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={picked.has(ev.id)} disabled={busy} onChange={() => { toggle(ev.id); if (err) setErr('') }} />
              <span style={{ minWidth: 0 }}>{registryLabel(t, 'webhooks.event', ev)}<span className="id wka-dev-mono">{ev.id}</span></span>
            </label>
          ))}
        </div>
        <span className="hint">{t('webhooks.form.eventsHint')}</span>
      </div>
      <div className="wka-field" style={{ margin: 0 }}>
        <label htmlFor="wka-wh-desc">{t('webhooks.form.description')}</label>
        <input id="wka-wh-desc" className="wka-input" value={desc} maxLength={140} disabled={busy}
          placeholder={t('webhooks.form.descPh')} onChange={(e) => setDesc(e.target.value)} />
      </div>
      {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
      <div className="wka-dev-acts">
        <button type="submit" className="wka-btn primary" disabled={busy}>{busy ? <Spinning /> : <Webhook size={14} />} {busy ? t('webhooks.adding') : t('webhooks.add')}</button>
        <button type="button" className="wka-btn ghost" onClick={onCancel} disabled={busy}>{t('webhooks.cancel')}</button>
      </div>
    </form>
  )
}
