// One webhook endpoint as an expandable row: host, events, enabled state, last
// delivery status, failures in a row and any disabled reason in the head; the
// full URL, events, created by/at, secret tail, the enable toggle, Send test,
// Rotate secret (confirm inline), Delete (confirm inline) and the recent
// deliveries in the body. The row never sees the signing secret; rotate hands
// it to the parent for the show-once panel.
import { useState } from 'react'
import { Webhook, Send, RefreshCw, Trash2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react'
import { api } from '../../../../api.js'
import { Spinning } from '../_shared.jsx'
import { useT } from '../../../../i18n/index.jsx'
import DevRow from './DevRow.jsx'
import WebhookDeliveries from './WebhookDeliveries.jsx'
import { registryLabel, fmtDateTime, fmtRelative, errorText, isQueueFull } from './devModel.js'

export default function WebhookRow({ ep, events, open, onToggle, onChanged, onRotated, onRemoved }) {
  const t = useT()
  const [mode, setMode] = useState(null)       // null | 'rotate' | 'remove'
  const [busy, setBusy] = useState('')         // '' | 'toggle' | 'test' | 'rotate' | 'remove'
  const [err, setErr] = useState('')
  const [note, setNote] = useState(null)       // { text, calm } (calm = a notice, not a success)
  const [bump, setBump] = useState(0)
  const evLabel = (id) => registryLabel(t, 'webhooks.event', (events || []).find((e) => e.id === id) || { id })
  const run = async (what, fn) => {
    setBusy(what); setErr(''); setNote(null)
    try { await fn() } catch (ex) {
      // 429 QUEUE_FULL is not a fault of the endpoint: a gentle notice, not red.
      if (isQueueFull(ex)) setNote({ text: t('webhooks.deliveries.queueFull'), calm: true })
      else setErr(errorText(t, 'webhooks', ex))
    } finally { setBusy('') }
  }
  const toggleEnabled = () => run('toggle', async () => { const r = await api.workCompanyWebhookUpdate(ep.id, { enabled: !ep.enabled }); onChanged(r.endpoint) })
  const test = () => run('test', async () => { await api.workCompanyWebhookTest(ep.id); setNote({ text: t('webhooks.row.testSent') }); setBump((n) => n + 1) })
  const rotate = () => run('rotate', async () => { const r = await api.workCompanyWebhookRotateSecret(ep.id); setMode(null); onRotated(r) })
  const remove = () => run('remove', async () => { await api.workCompanyWebhookDelete(ep.id); setMode(null); onRemoved(ep) })

  const chips = (
    <>
      {!ep.enabled ? <span className="wka-dev-chip warn">{t('webhooks.row.disabled')}</span> : ep.lastStatus === 'ok' ? <span className="wka-dev-chip ok">{t('webhooks.row.lastOk')}</span> : ep.lastStatus === 'failed' ? <span className="wka-dev-chip bad">{t('webhooks.row.lastFailed')}</span> : <span className="wka-dev-chip faint">{t('webhooks.row.noDelivery')}</span>}
      {ep.consecutiveFailures > 0 ? <span className="wka-dev-chip bad">{t.n('webhooks.row.failures', ep.consecutiveFailures, { n: ep.consecutiveFailures })}</span> : null}
    </>
  )
  const sub = [
    (ep.events || []).map(evLabel).join(', '),
    ep.lastDeliveryAt ? t('webhooks.row.lastAt', { time: fmtRelative(ep.lastDeliveryAt, t.locale) }) : '',
    ep.disabledReason ? t('webhooks.row.disabledReason', { reason: ep.disabledReason }) : '',
  ].filter(Boolean).join(' · ')

  return (
    <DevRow id={ep.id} icon={<Webhook size={15} />} title={ep.host || ep.url} sub={sub} chips={chips} open={open} onToggle={onToggle} faded={!ep.enabled}>
      <div className="wka-dev-kv">
        <div className="wide"><span>{t('webhooks.row.url')}</span><b className="wka-dev-mono">{ep.url}</b></div>
        <div className="wide"><span>{t('webhooks.row.events')}</span><div className="wka-dev-tags">{(ep.events || []).map((id) => <span key={id} className="wka-dev-chip">{evLabel(id)}</span>)}</div></div>
        {ep.description ? <div><span>{t('webhooks.form.description')}</span><b>{ep.description}</b></div> : null}
        <div><span>{t('webhooks.row.createdBy')}</span><b>{(ep.createdBy && ep.createdBy.name) || '-'}</b></div>
        <div><span>{t('webhooks.row.createdAt')}</span><b>{fmtDateTime(ep.createdAt, t.locale) || '-'}</b></div>
        <div><span>{t('webhooks.row.secret')}</span><b className="wka-dev-mono">{t('webhooks.row.secretTail', { last4: ep.secretLast4 || '····' })}</b></div>
        {ep.disabledReason ? <div className="wide"><span>{t('webhooks.row.disabled')}</span><b style={{ color: 'var(--wka-amber)' }}>{ep.disabledReason}</b></div> : null}
      </div>
      {ep.droppedEvents > 0 ? (
        <div className="wka-dev-inline-err" role="status" style={{ color: 'var(--wka-amber)', marginBottom: 10 }}>
          <AlertTriangle size={14} /> <span>{t.n('webhooks.row.dropped', ep.droppedEvents, { n: ep.droppedEvents })}</span>
        </div>
      ) : null}
      <div className="wka-dev-acts">
        <button type="button" className={`wka-dev-toggle${ep.enabled ? ' on' : ''}${busy === 'toggle' ? ' busy' : ''}`} role="switch" aria-checked={ep.enabled}
          title={t('webhooks.row.enableHint')} disabled={!!busy} onClick={toggleEnabled} style={{ background: 'none', border: 0, padding: 0, font: 'inherit' }}>
          <span className="track" aria-hidden><span className="knob" /></span>{ep.enabled ? t('webhooks.row.enabled') : t('webhooks.row.disabled')}
        </button>
        <span className="wka-spacer" />
        <button type="button" className="wka-btn sm" disabled={!!busy || !ep.enabled} title={!ep.enabled ? t('webhooks.row.testNeedsEnabled') : undefined} onClick={test}>{busy === 'test' ? <Spinning /> : <Send size={13} />} {busy === 'test' ? t('webhooks.row.testing') : t('webhooks.row.test')}</button>
        <button type="button" className="wka-btn sm ghost" disabled={!!busy} onClick={() => { setMode('rotate'); setErr('') }}><RefreshCw size={13} /> {t('webhooks.row.rotate')}</button>
        <button type="button" className="wka-btn sm ghost danger" disabled={!!busy} onClick={() => { setMode('remove'); setErr('') }}><Trash2 size={13} /> {t('webhooks.row.remove')}</button>
      </div>
      {note ? <div className="wka-note" role="status" style={{ color: note.calm ? 'var(--wka-amber)' : 'var(--wka-emerald)', marginTop: 10, marginBottom: 0 }}>{note.calm ? <Clock size={14} /> : <ShieldCheck size={14} />} {note.text}</div> : null}
      {err && !mode ? <div className="wka-dev-inline-err" role="alert" style={{ marginTop: 10 }}><AlertTriangle size={14} /> <span>{err}</span></div> : null}
      {mode === 'rotate' ? (
        <div className="wka-dev-sub" role="alertdialog" aria-label={t('webhooks.rotateSecret.title', { host: ep.host })}>
          <h4>{t('webhooks.rotateSecret.title', { host: ep.host })}</h4>
          <p>{t('webhooks.rotateSecret.body')}</p>
          {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
          <div className="wka-dev-acts">
            <button type="button" className="wka-btn sm primary" disabled={!!busy} onClick={rotate}>{busy === 'rotate' ? <Spinning /> : <RefreshCw size={13} />} {busy === 'rotate' ? t('webhooks.row.rotating') : t('webhooks.rotateSecret.confirm')}</button>
            <button type="button" className="wka-btn sm ghost" disabled={!!busy} onClick={() => setMode(null)}>{t('webhooks.cancel')}</button>
          </div>
        </div>
      ) : null}
      {mode === 'remove' ? (
        <div className="wka-dev-sub" role="alertdialog" aria-label={t('webhooks.remove.title', { host: ep.host })}>
          <h4 style={{ color: 'var(--wka-red)' }}>{t('webhooks.remove.title', { host: ep.host })}</h4>
          <p>{t('webhooks.remove.body')}</p>
          {err ? <div className="wka-dev-inline-err" role="alert"><AlertTriangle size={14} /> <span>{err}</span></div> : null}
          <div className="wka-dev-acts">
            <button type="button" className="wka-btn sm danger" disabled={!!busy} onClick={remove}>{busy === 'remove' ? <Spinning /> : <Trash2 size={13} />} {busy === 'remove' ? t('webhooks.remove.busy') : t('webhooks.remove.confirm')}</button>
            <button type="button" className="wka-btn sm ghost" disabled={!!busy} onClick={() => setMode(null)}>{t('webhooks.cancel')}</button>
          </div>
        </div>
      ) : null}
      <WebhookDeliveries endpointId={ep.id} events={events} refreshKey={bump} />
    </DevRow>
  )
}
