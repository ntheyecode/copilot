// Subscriber health: the individuals business at a glance, for the superadmin
// and the accounting role. Six stat tiles (MRR, paying subscribers, failed
// payments, plans set to end, churn, new subscribers), MRR by plan with a
// share bar, money in the window, the Stripe wiring with the fix, and the two
// lists that need action (plans ending, past due). Bound to
// GET /api/work/admin/subscriptions/health (server/admin_subscription_health.js).
//
// Not yet in WorkAdmin.jsx's SECTIONS list (that file is owned by the
// corporate edition work); wire it with
//   { id: 'subscription-health', label: 'superAdmin.nav.subscription-health', icon: HeartPulse,
//     title: 'superAdmin.sections.subscription-health.title', sub: 'superAdmin.sections.subscription-health.sub' }
// and `case 'subscription-health': return <SubscriptionHealth isSuperAdmin={isSuperAdmin} />`.
//
// Defensive: a 404/501 (route not wired on an older server) reads as a calm
// "not available" note, never a crash. Every field may be null.
import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, DollarSign, Users, AlertTriangle, CalendarX, TrendingDown, UserPlus, CheckCircle2, XCircle, Lock } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, TierBadge, Spinning } from './_shared.jsx'
import { fmtDateTime, fmtMoney } from '../workadmin.css.js'
import { useT } from '../../../i18n/index.jsx'

const PLANS = ['lite', 'basic', 'advanced', 'premium']

function Tile({ icon, label, value, foot, tone }) {
  return (
    <div className={`wka-card${tone ? ' ' + tone : ''}`}>
      <div className="k">{icon} {label}</div>
      <div className="v wka-mono">{value}</div>
      {foot ? <div className="foot">{foot}</div> : null}
    </div>
  )
}

export default function SubscriptionHealth({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, data: null, unavailable: false })
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true); else setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.subscriptionHealth()
      setState({ loading: false, error: null, data, unavailable: false })
    } catch (error) {
      if (error && (error.status === 404 || error.status === 501)) setState({ loading: false, error: null, data: null, unavailable: true })
      else if (!isRefresh) setState({ loading: false, error, data: null, unavailable: false })
    } finally { setRefreshing(false) }
  }, [])
  useEffect(() => { load(false) }, [load])

  if (state.loading) return <Loading label={t('subHealthAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={() => load(false)} />
  if (state.unavailable || !state.data) return <EmptyState title={t('subHealthAdmin.unavailable')} />
  const d = state.data
  const cur = d.currency
  const money = (n) => fmtMoney(n, cur)
  const totalSubs = PLANS.reduce((n, p) => n + ((d.byPlan[p] || {}).subscribers || 0), 0)
  const stripeRows = [
    [t('subHealthAdmin.stripe.keys'), d.stripe.configured],
    [t('subHealthAdmin.stripe.webhook'), d.stripe.webhook],
    [t('subHealthAdmin.stripe.annual'), d.stripe.annualReady],
  ]
  const stripeReady = d.stripe.configured && d.stripe.webhook
  return (
    <div className="wka-section sh">
      <style>{CSS}</style>
      <div className="wka-toolbar">
        <span className="wka-note sh-window">{t('subHealthAdmin.window', { days: d.windowDays })} · {t('subHealthAdmin.asOf', { time: fmtDateTime(d.generatedAt) })}</span>
        <button type="button" className="wka-btn sm ghost" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <Spinning /> : <RefreshCw size={13} />} {t('subHealthAdmin.refresh')}</button>
      </div>
      {!isSuperAdmin && <div className="wka-note"><Lock size={13} /> {t('subHealthAdmin.viewOnlyNote')}</div>}

      <div className="wka-cards sh-tiles">
        <Tile icon={<DollarSign size={14} />} label={t('subHealthAdmin.tiles.mrr')} value={money(d.mrrUsd)} foot={t('subHealthAdmin.tiles.mrrFoot', { arr: money(d.arrUsd) })} tone="accent" />
        <Tile icon={<Users size={14} />} label={t('subHealthAdmin.tiles.active')} value={d.counts.active + d.counts.trialing} foot={t('subHealthAdmin.tiles.activeFoot', { trialing: d.counts.trialing })} />
        <Tile icon={<AlertTriangle size={14} />} label={t('subHealthAdmin.tiles.pastDue')} value={d.counts.pastDue} foot={t('subHealthAdmin.tiles.pastDueFoot')} tone={d.counts.pastDue ? 'warn' : ''} />
        <Tile icon={<CalendarX size={14} />} label={t('subHealthAdmin.tiles.ending')} value={d.counts.endingSoon} foot={t('subHealthAdmin.tiles.endingFoot')} />
        <Tile icon={<TrendingDown size={14} />} label={t('subHealthAdmin.tiles.churn')} value={`${d.churn.pct}%`} foot={t('subHealthAdmin.tiles.churnFoot', { canceled: d.churn.canceled, start: d.churn.activeAtStart })} />
        <Tile icon={<UserPlus size={14} />} label={t('subHealthAdmin.tiles.newSubs')} value={d.churn.newSubscribers} foot={t('subHealthAdmin.tiles.newSubsFoot')} />
      </div>

      <div className="sh-grid">
        <div className="wka-panel">
          <h3>{t('subHealthAdmin.byPlan.h3')}</h3>
          <table className="wka-table sh-table">
            <thead><tr><th>{t('subHealthAdmin.byPlan.plan')}</th><th>{t('subHealthAdmin.byPlan.subscribers')}</th><th>{t('subHealthAdmin.byPlan.annual')}</th><th>{t('subHealthAdmin.byPlan.mrr')}</th><th>{t('subHealthAdmin.byPlan.share')}</th></tr></thead>
            <tbody>
              {PLANS.map((p) => { const r = d.byPlan[p] || { subscribers: 0, mrrUsd: 0, annual: 0 }; const share = d.mrrUsd ? Math.round((r.mrrUsd / d.mrrUsd) * 100) : 0; return (
                <tr key={p}>
                  <td><TierBadge tier={p} /></td>
                  <td className="wka-mono">{r.subscribers}</td>
                  <td className="wka-mono">{r.annual}</td>
                  <td className="wka-mono">{money(r.mrrUsd)}</td>
                  <td><span className="sh-bar" aria-label={`${share}%`}><i style={{ width: `${share}%` }} /></span> <span className="wka-mono">{share}%</span></td>
                </tr>
              ) })}
            </tbody>
          </table>
          {!totalSubs && <div className="wka-note">{t('subHealthAdmin.ending.empty')}</div>}
        </div>

        <div className="wka-panel">
          <h3>{t('subHealthAdmin.payments.h3')}</h3>
          <dl className="sh-dl">
            <div><dt>{t('subHealthAdmin.payments.paid')}</dt><dd className="wka-mono">{d.payments.paid} · {money(d.payments.paidUsd)}</dd></div>
            <div><dt>{t('subHealthAdmin.payments.refunds')}</dt><dd className="wka-mono">{d.payments.refunds} · {money(d.payments.refundedUsd)}</dd></div>
            <div><dt>{t('subHealthAdmin.payments.net')}</dt><dd className="wka-mono">{money(d.payments.paidUsd - d.payments.refundedUsd)}</dd></div>
          </dl>
          <h3>{t('subHealthAdmin.stripe.h3')}</h3>
          <ul className="sh-stripe">
            {stripeRows.map(([label, on]) => <li key={label}>{on ? <CheckCircle2 size={15} className="ok" /> : <XCircle size={15} className="bad" />} <span>{label}</span> <b>{on ? t('subHealthAdmin.stripe.on') : t('subHealthAdmin.stripe.off')}</b></li>)}
            {d.stripe.mode && <li><span>{t('subHealthAdmin.stripe.mode')}</span> <b className="wka-mono">{d.stripe.mode}</b></li>}
          </ul>
          <div className={`wka-note${stripeReady ? '' : ' warn'}`}>{stripeReady ? t('subHealthAdmin.stripe.ready') : t('subHealthAdmin.stripe.notReady')}</div>
        </div>
      </div>

      <div className="sh-grid">
        <div className="wka-panel">
          <h3>{t('subHealthAdmin.ending.h3')}</h3>
          {d.ending.length === 0 ? <div className="wka-note">{t('subHealthAdmin.ending.empty')}</div> : (
            <table className="wka-table sh-table">
              <thead><tr><th>{t('subHealthAdmin.ending.user')}</th><th>{t('subHealthAdmin.ending.plan')}</th><th>{t('subHealthAdmin.ending.endsAt')}</th><th>{t('subHealthAdmin.ending.reason')}</th></tr></thead>
              <tbody>{d.ending.map((e) => <tr key={e.id}><td>{e.username}</td><td>{e.plan ? <TierBadge tier={e.plan} /> : '-'}</td><td className="wka-mono">{e.endsAt ? fmtDateTime(e.endsAt) : '-'}</td><td className="sh-reason">{e.reason || <i>{t('subHealthAdmin.ending.noReason')}</i>}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="wka-panel">
          <h3>{t('subHealthAdmin.pastDueList.h3')}</h3>
          {d.pastDue.length === 0 ? <div className="wka-note">{t('subHealthAdmin.pastDueList.empty')}</div> : (
            <table className="wka-table sh-table">
              <thead><tr><th>{t('subHealthAdmin.pastDueList.user')}</th><th>{t('subHealthAdmin.pastDueList.plan')}</th><th>{t('subHealthAdmin.pastDueList.since')}</th><th>{t('subHealthAdmin.pastDueList.periodEnd')}</th></tr></thead>
              <tbody>{d.pastDue.map((p) => <tr key={p.id}><td>{p.username}</td><td>{p.plan ? <TierBadge tier={p.plan} /> : '-'}</td><td className="wka-mono">{p.since ? fmtDateTime(p.since) : '-'}</td><td className="wka-mono">{p.currentPeriodEnd ? fmtDateTime(p.currentPeriodEnd) : '-'}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const CSS = `
.sh .wka-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.sh-window{margin:0}
.sh-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0 16px}
.sh .wka-card.warn{border-color:rgba(242,106,67,.5)}
.sh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}
.sh .wka-panel{min-width:0;overflow:hidden}
.sh .wka-panel h3{margin:0 0 10px;font-size:15px}
.sh .wka-panel h3+ .sh-dl,.sh-dl+h3{margin-top:14px}
.sh-table{width:100%;table-layout:auto}
.sh-table td,.sh-table th{white-space:nowrap}
.sh-table td.sh-reason{white-space:normal;max-width:260px;overflow-wrap:anywhere}
.sh-bar{display:inline-block;width:70px;height:8px;border-radius:4px;background:var(--wka-line,rgba(0,0,0,.1));vertical-align:middle;overflow:hidden;margin-inline-end:6px}
.sh-bar i{display:block;height:100%;background:var(--wka-accent,#0e9f6e);border-radius:4px}
.sh-dl{margin:0;display:flex;flex-direction:column;gap:8px}
.sh-dl div{display:flex;justify-content:space-between;gap:12px;font-size:14px}
.sh-dl dt{color:var(--wka-muted)}
.sh-dl dd{margin:0}
.sh-stripe{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:8px}
.sh-stripe li{display:flex;align-items:center;gap:8px;font-size:14px}
.sh-stripe li span{flex:1 1 auto;color:var(--wka-muted)}
.sh-stripe .ok{color:#0e9f6e}.sh-stripe .bad{color:#f26a43}
.sh .wka-note.warn{border-color:rgba(242,106,67,.5)}
@media (max-width:980px){.sh-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.sh-grid{grid-template-columns:1fr}}
@media (max-width:560px){.sh-tiles{grid-template-columns:1fr}.sh-table{display:block;overflow-x:auto}}
`
