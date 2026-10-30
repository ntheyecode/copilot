// Recent deliveries for one webhook endpoint (newest first, the server caps at
// 50), loaded when the row opens, with Refresh and a Retry on dead ones (the
// server retries pending ones itself; status is pending | delivered | dead).
// Pending rows show the next attempt time. `refreshKey` bumps after a test
// send so the new ping shows without a manual refresh. A 429 QUEUE_FULL on
// retry is a gentle notice, not an error.
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, RotateCcw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '../../../../api.js'
import { Loading, ErrorBox, Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import { registryLabel, fmtRelative, fmtDateTime, errorText, isQueueFull } from './devModel.js'

const ICON = { delivered: CheckCircle2, dead: XCircle, pending: Clock }
const TONE = { delivered: 'var(--wka-emerald)', dead: 'var(--wka-red)', pending: 'var(--wka-amber)' }

export default function WebhookDeliveries({ endpointId, events, refreshKey = 0, onRetried }) {
  const t = useT()
  const [st, setSt] = useState({ loading: true, error: null, list: [] })
  const [retrying, setRetrying] = useState(null)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setSt((s) => ({ ...s, loading: !s.list.length, error: null }))
    try { const r = await api.workCompanyWebhookDeliveries(endpointId); setSt({ loading: false, error: null, list: Array.isArray(r && r.deliveries) ? r.deliveries : [] }) }
    catch (error) { setSt((s) => ({ ...s, loading: false, error })) }
  }, [endpointId])
  useEffect(() => { load() }, [load, refreshKey])

  const retry = async (d) => {
    setRetrying(d.id); setErr(''); setNotice('')
    try { await api.workCompanyWebhookRetry(d.id); onRetried && onRetried(); await load() }
    catch (ex) { if (isQueueFull(ex)) setNotice(t('webhooks.deliveries.queueFull')); else setErr(errorText(t, 'webhooks', ex)) }
    finally { setRetrying(null) }
  }
  const evLabel = (id) => registryLabel(t, 'webhooks.event', (events || []).find((e) => e.id === id) || { id })

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h4 style={{ margin: 0, fontSize: 13, flex: 1, minWidth: 0 }}>{t('webhooks.deliveries.title')}</h4>
        <button type="button" className="wka-btn sm ghost" style={{ flexShrink: 0 }} onClick={load} disabled={st.loading}><RefreshCw size={13} /> {t('webhooks.deliveries.refresh')}</button>
      </div>
      {st.loading ? <Loading label={t('webhooks.deliveries.loading')} />
        : st.error ? <ErrorBox error={st.error} onRetry={load} />
          : st.list.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--wka-faint)', padding: '8px 0' }}>{t('webhooks.deliveries.empty')}</div>
            : (
              <div role="list" aria-label={t('webhooks.deliveries.title')}>
                {st.list.map((d) => {
                  const Icon = ICON[d.status] || Clock
                  const canRetry = d.status === 'dead'
                  return (
                    <div key={d.id} className="wka-dev-del" role="listitem">
                      <Icon size={14} style={{ color: TONE[d.status] || 'var(--wka-faint)', flexShrink: 0 }} aria-label={t(`webhooks.deliveries.status.${d.status}`) } />
                      <span className="ev" title={d.id}>{evLabel(d.event)} <span style={{ color: 'var(--wka-faint)' }}>· {t(`webhooks.deliveries.status.${d.status}`)}</span></span>
                      <span className="meta" title={fmtDateTime(d.deliveredAt || d.createdAt, t.locale)}>
                        {fmtRelative(d.deliveredAt || d.createdAt, t.locale)}
                        {d.lastHttpStatus ? ` · ${t('webhooks.deliveries.http', { status: d.lastHttpStatus })}` : ''}
                        {d.attempts ? ` · ${t.n('webhooks.deliveries.attempts', d.attempts, { n: d.attempts })}` : ''}
                        {d.status === 'pending' && d.nextAttemptAt ? ` · ${t('webhooks.deliveries.nextAt', { time: fmtRelative(d.nextAttemptAt, t.locale) })}` : ''}
                      </span>
                      {canRetry ? (
                        <button type="button" className="wka-btn sm ghost" style={{ flexShrink: 0 }} disabled={retrying === d.id} onClick={() => retry(d)}>
                          {retrying === d.id ? <Spinning /> : <RotateCcw size={13} />} {retrying === d.id ? t('webhooks.deliveries.retrying') : t('webhooks.deliveries.retry')}
                        </button>
                      ) : null}
                      {d.lastError ? <span className="err">{d.lastError}</span> : null}
                    </div>
                  )
                })}
              </div>
            )}
      {notice ? <div className="wka-note" role="status" style={{ color: 'var(--wka-amber)', marginTop: 8, marginBottom: 0 }}><Clock size={14} /> {notice}</div> : null}
      {err ? <div className="wka-dev-inline-err" role="alert" style={{ marginTop: 6 }}>{err}</div> : null}
    </div>
  )
}
