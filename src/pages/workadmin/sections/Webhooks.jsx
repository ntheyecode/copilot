// Webhooks (company console, "API & webhooks" section): the HTTPS endpoints a
// company's own apps register to be told when something happens (a workflow
// published, a workflow issue reported). Bound to /api/work/company/webhooks.
// Same recipe as ApiKeys.jsx: a short guided header that explains the
// signature headers, the show-once signing secret after add / rotate, an add
// form, and the endpoints as compact expandable rows (apikeys/WebhookRow.jsx)
// with their recent deliveries. The secret is held only while SecretPanel is
// mounted and cleared on dismiss.
import { useCallback, useEffect, useState } from 'react'
import { Webhook, Plus, ShieldCheck, Fingerprint } from 'lucide-react'
import { api } from '../../../api.js'
import { Loading, ErrorBox, EmptyState } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'
import { API_KEYS_CSS } from './apikeys/apikeys.css.js'
import SecretPanel from './apikeys/SecretPanel.jsx'
import WebhookForm from './apikeys/WebhookForm.jsx'
import WebhookRow from './apikeys/WebhookRow.jsx'

const SIG_EXAMPLE = 'X-WorkCoPilot-Signature: t=1730300000,v1=<hex HMAC-SHA256 of "<t>.<raw body>">\nX-WorkCoPilot-Event: workflow.published\nX-WorkCoPilot-Delivery: <delivery id>'

export default function Webhooks() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, endpoints: [], events: [] })
  const [showForm, setShowForm] = useState(false)
  const [secret, setSecret] = useState(null)
  const [open, setOpen] = useState(() => new Set())
  const [done, setDone] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: !s.endpoints.length, error: null }))
    try {
      const r = await api.workCompanyWebhooks()
      setState({ loading: false, error: null, endpoints: Array.isArray(r && r.endpoints) ? r.endpoints : [], events: Array.isArray(r && r.events) ? r.events : [] })
    } catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const patchLocal = (ep) => setState((s) => ({ ...s, endpoints: s.endpoints.map((x) => (x.id === ep.id ? { ...x, ...ep } : x)) }))

  const onCreated = (r) => { setShowForm(false); setSecret({ kind: 'created', secret: r.secret }); flash(t('webhooks.toast.added')); load() }
  const onRotated = (r) => { setSecret({ kind: 'rotated', secret: r.secret }); if (r.endpoint) patchLocal(r.endpoint); flash(t('webhooks.toast.rotated')) }
  const onChanged = (ep) => { if (ep) patchLocal(ep); flash(t('webhooks.toast.updated')) }
  const onRemoved = (ep) => { flash(t('webhooks.toast.removed', { host: ep.host || '' })); load() }

  const rows = [...state.endpoints].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return (
    <div className="wka-panel">
      <style>{API_KEYS_CSS}</style>
      <h2><Webhook size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('webhooks.title')}</h2>
      <p className="desc">{t('webhooks.desc')}</p>

      <div className="wka-dev-how">
        <div><b><Fingerprint size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{t('webhooks.sig.title')}</b> {t('webhooks.sig.body')}</div>
        <code className="wka-dev-code">{SIG_EXAMPLE}</code>
        <div>{t('webhooks.sig.explain')}</div>
      </div>

      {secret ? <SecretPanel ns="webhooks" kind={secret.kind} secret={secret.secret} onDone={() => setSecret(null)} /> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><ShieldCheck size={14} /> {done}</div> : null}

      {state.loading ? <Loading label={t('webhooks.loading')} />
        : state.error && !state.endpoints.length ? <ErrorBox error={state.error} onRetry={load} />
          : (
            <>
              <div className="wka-dev-hdr">
                <span className="wka-dev-count">{t.n('webhooks.list.count', rows.length, { n: rows.length })}</span>
                <span className="wka-spacer" />
                {!showForm ? <button type="button" className="wka-btn primary" style={{ flexShrink: 0 }} onClick={() => { setShowForm(true); setSecret(null) }}><Plus size={14} /> {t('webhooks.add')}</button> : null}
              </div>
              {showForm ? <WebhookForm events={state.events} onCreated={onCreated} onCancel={() => setShowForm(false)} /> : null}
              {state.error ? <div style={{ marginBottom: 10 }}><ErrorBox error={state.error} onRetry={load} /></div> : null}
              {rows.length === 0 ? <EmptyState title={t('webhooks.list.emptyTitle')} detail={t('webhooks.list.emptyDetail')} /> : (
                <div className="wka-dev-list" role="list" aria-label={t('webhooks.title')}>
                  {rows.map((ep) => (
                    <WebhookRow key={ep.id} ep={ep} events={state.events} open={open.has(ep.id)} onToggle={() => toggle(ep.id)} onChanged={onChanged} onRotated={onRotated} onRemoved={onRemoved} />
                  ))}
                </div>
              )}
            </>
          )}
    </div>
  )
}
