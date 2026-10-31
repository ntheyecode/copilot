// The ONE billing state that needs the person's attention, as a strip with
// its action, shown at the top of the dashboard and the billing page:
//   past_due          the last payment failed      -> update the payment method (Stripe portal)
//   cancelAtPeriodEnd the plan ends on a date       -> resume with one click
//   pendingChange     a downgrade lands on a date   -> read-only notice
// Nothing to say renders nothing. Reads the full safe subscription the shell
// loads (server/store.getSubscription). Strings: billingWidget.alert.*.
import { useState } from 'react'
import { AlertTriangle, CalendarClock, ArrowDownRight, CreditCard, RotateCcw, Loader2 } from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')

// `states` limits which of the three it may show (the billing page's own panel
// already carries the past-due and ending banners with their actions, so there
// the strip only announces a scheduled downgrade).
export default function BillingAlert({ subscription, onReload, states = ['pastDue', 'ending', 'pending'] }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const s = subscription || {}
  const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '' } catch { return '' } }
  const portal = async () => {
    setBusy(true); setErr('')
    try { const r = await api.workBillingPortal(); if (r && r.url) { window.location = r.url; return }; setErr(t('billingWidget.errors.portalOpen')) }
    catch (e) { setErr((e && e.message) || t('billingWidget.errors.portalUnavailable')) } finally { setBusy(false) }
  }
  const resume = async () => {
    setBusy(true); setErr('')
    try { await api.workResumeSubscription(); if (typeof onReload === 'function') onReload() }
    catch (e) { setErr((e && e.message) || t('billingWidget.lifecycle.errResume')) } finally { setBusy(false) }
  }
  let body = null
  if (s.status === 'past_due' && states.includes('pastDue')) {
    body = { cls: 'warn', icon: <AlertTriangle size={18} />, title: t('billingWidget.alert.pastDueTitle'), text: t('billingWidget.alert.pastDueBody'), cta: t('billingWidget.alert.pastDueCta'), act: portal, ctaIcon: <CreditCard size={15} /> }
  } else if (s.cancelAtPeriodEnd && (s.status === 'active' || s.status === 'trialing') && states.includes('ending')) {
    body = { cls: 'muted', icon: <CalendarClock size={18} />, title: t('billingWidget.alert.endingTitle', { date: fmtDate(s.currentPeriodEnd) }), text: t('billingWidget.alert.endingBody'), cta: t('billingWidget.alert.endingCta'), act: resume, ctaIcon: <RotateCcw size={15} /> }
  } else if (s.pendingChange && s.pendingChange.plan && states.includes('pending')) {
    body = { cls: 'info', icon: <ArrowDownRight size={18} />, title: t('billingWidget.alert.pendingTitle', { plan: cap(s.pendingChange.plan), date: fmtDate(s.pendingChange.effectiveDate) }), text: t('billingWidget.alert.pendingBody') }
  }
  if (!body) return null
  return (
    <div className={`wba ${body.cls}`} role={body.cls === 'warn' ? 'alert' : 'status'}>
      <style>{CSS}</style>
      <span className="wba-ic">{body.icon}</span>
      <div className="wba-txt"><b>{body.title}</b><span>{body.text}</span>{err && <span className="wba-err">{err}</span>}</div>
      {body.cta && (
        <button type="button" className={`wba-btn ${body.cls}`} onClick={body.act} disabled={busy}>
          {busy ? <Loader2 size={15} className="spin" /> : body.ctaIcon}<span>{body.cta}</span>
        </button>
      )}
    </div>
  )
}

const CSS = `
.wba{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:14px 0 4px;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--panel);color:var(--tx)}
.wba.warn{border-color:rgba(242,106,67,.45);background:linear-gradient(90deg,rgba(242,106,67,.12),var(--panel))}
.wba.muted{border-color:var(--line)}
.wba.info{border-color:rgba(10,132,194,.35);background:linear-gradient(90deg,rgba(10,132,194,.1),var(--panel))}
.wba-ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--panel-2,var(--panel));flex:0 0 auto;color:var(--tx)}
.wba.warn .wba-ic{color:#f26a43}
.wba.info .wba-ic{color:#0a84c2}
.wba-txt{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:2px}
.wba-txt b{font-size:15px}
.wba-txt span{font-size:13.5px;color:var(--mut);line-height:1.45}
.wba-err{color:#f26a43!important}
.wba-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:11px;border:1px solid var(--line);background:var(--panel-2,var(--panel));color:var(--tx);font:inherit;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap;flex:0 0 auto}
.wba-btn.warn{background:linear-gradient(135deg,#f26a43,#ff9a4d);color:#1a0e08;border-color:transparent}
.wba-btn:disabled{opacity:.6;cursor:default}
.wba .spin{animation:wba-spin 1s linear infinite}
@keyframes wba-spin{to{transform:rotate(360deg)}}
@media (max-width:640px){.wba-btn{width:100%;justify-content:center}}
`
