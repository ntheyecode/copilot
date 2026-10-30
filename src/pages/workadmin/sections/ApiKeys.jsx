// API keys (company console, "API & webhooks" section): the keys a company's
// OWN apps use to call WorkCoPilot's public API (/api/v1/*). Bound to
// /api/work/company/api-keys. One panel in the console recipe: a short guided
// header (what keys are for, how to send one, where the reference is), the
// show-once secret panel after a create or rotate, a create form, and the keys
// as compact expandable rows (sections/apikeys/ApiKeyRow.jsx). The secret is
// held only while SecretPanel is mounted and cleared on dismiss.
import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, Code2, ExternalLink } from 'lucide-react'
import { api } from '../../../api.js'
import { Loading, ErrorBox, EmptyState } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'
import { API_KEYS_CSS } from './apikeys/apikeys.css.js'
import SecretPanel from './apikeys/SecretPanel.jsx'
import ApiKeyForm from './apikeys/ApiKeyForm.jsx'
import ApiKeyRow from './apikeys/ApiKeyRow.jsx'
import { sortKeys, keyStatus, GRACE_OPTIONS } from './apikeys/devModel.js'

const OPENAPI_PATH = '/api/v1/openapi.json'

export default function ApiKeys() {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, keys: [], scopes: [], stepUp: false })
  const [showForm, setShowForm] = useState(false)
  const [secret, setSecret] = useState(null)         // { kind, secret, note } while the show-once panel is up
  const [showEnded, setShowEnded] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [done, setDone] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: !s.keys.length, error: null }))
    try {
      const r = await api.workCompanyApiKeys()
      setState({ loading: false, error: null, keys: Array.isArray(r && r.keys) ? r.keys : [], scopes: Array.isArray(r && r.scopes) ? r.scopes : [], stepUp: !!(r && r.stepUp && r.stepUp.required) })
    } catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const onCreated = (r) => {
    setShowForm(false)
    setSecret({ kind: 'created', secret: r.secret })
    flash(t('apiKeys.toast.created', { name: r.key && r.key.name }))
    load()
  }
  const onRotated = (r, minutes) => {
    const g = GRACE_OPTIONS.find((o) => o.minutes === minutes) || GRACE_OPTIONS[0]
    setSecret({ kind: 'rotated', secret: r.secret, note: minutes > 0 ? t('apiKeys.secret.graceNote', { grace: t(`apiKeys.rotate.${g.id}`) }) : t('apiKeys.secret.graceNone') })
    if (r.key && r.key.id) setOpen((s) => new Set(s).add(r.key.id))
    flash(t('apiKeys.toast.rotated'))
    load()
  }
  const onRevoked = (r) => { flash(t('apiKeys.toast.revoked', { name: (r.key && r.key.name) || '' })); load() }

  const all = sortKeys(state.keys)
  const liveN = all.filter((k) => keyStatus(k) === 'active').length
  const endedN = all.length - liveN
  const rows = showEnded ? all : all.filter((k) => keyStatus(k) === 'active')

  return (
    <div className="wka-panel">
      <style>{API_KEYS_CSS}</style>
      <h2><KeyRound size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('apiKeys.title')}</h2>
      <p className="desc">{t('apiKeys.desc')}</p>

      <div className="wka-dev-how">
        <div><b><Code2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{t('apiKeys.how.title')}</b> {t('apiKeys.how.bearer')}</div>
        <code className="wka-dev-code">{'Authorization: Bearer wcp_live_…'}</code>
        <div>{t('apiKeys.how.reference')} <a href={OPENAPI_PATH} target="_blank" rel="noreferrer">{t('apiKeys.how.openapi')} <ExternalLink size={11} style={{ verticalAlign: -1 }} /></a></div>
      </div>

      {secret ? <SecretPanel ns="apiKeys" kind={secret.kind} secret={secret.secret} note={secret.note} onDone={() => setSecret(null)} /> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><ShieldCheck size={14} /> {done}</div> : null}

      {state.loading ? <Loading label={t('apiKeys.loading')} />
        : state.error && !state.keys.length ? <ErrorBox error={state.error} onRetry={load} />
          : (
            <>
              <div className="wka-dev-hdr">
                <span className="wka-dev-count">{t.n('apiKeys.list.count', liveN, { n: liveN })}</span>
                {endedN > 0 ? (
                  <button type="button" className="wka-btn sm ghost" style={{ flexShrink: 0 }} onClick={() => setShowEnded((v) => !v)}>
                    {showEnded ? t('apiKeys.list.hideEnded', { n: endedN }) : t('apiKeys.list.showEnded', { n: endedN })}
                  </button>
                ) : null}
                <span className="wka-spacer" />
                {!showForm ? <button type="button" className="wka-btn primary" style={{ flexShrink: 0 }} onClick={() => { setShowForm(true); setSecret(null) }}><Plus size={14} /> {t('apiKeys.create')}</button> : null}
              </div>
              {showForm ? <ApiKeyForm scopes={state.scopes} stepUp={state.stepUp} onCreated={onCreated} onCancel={() => setShowForm(false)} /> : null}
              {state.error ? <div style={{ marginBottom: 10 }}><ErrorBox error={state.error} onRetry={load} /></div> : null}
              {rows.length === 0 ? (
                all.length === 0 ? <EmptyState title={t('apiKeys.list.emptyTitle')} detail={t('apiKeys.list.emptyDetail')} /> : <EmptyState title={t('apiKeys.list.noLiveTitle')} detail={t('apiKeys.list.noLiveDetail')} />
              ) : (
                <div className="wka-dev-list" role="list" aria-label={t('apiKeys.title')}>
                  {rows.map((k) => (
                    <ApiKeyRow key={k.id} k={k} scopes={state.scopes} stepUp={state.stepUp} open={open.has(k.id)} onToggle={() => toggle(k.id)} onRotated={onRotated} onRevoked={onRevoked} />
                  ))}
                </div>
              )}
            </>
          )}
    </div>
  )
}
