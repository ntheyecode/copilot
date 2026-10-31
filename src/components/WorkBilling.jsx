import { useMemo, useState } from 'react'
import { api } from '../api.js'
import { useT } from '../i18n/index.jsx'
import { useEditionView } from '../edition/useCaps.js'   // edition: plan changes only where personal plans are sold
import {
  CreditCard, ExternalLink, FileText, AlertTriangle, Loader2, Check,
  ArrowUpRight, ArrowDownRight, CalendarClock, ShieldCheck, Ban, Info, Lock, RotateCcw,
} from 'lucide-react'
import CancelPlanModal from './billing/CancelPlanModal.jsx'   // in-app cancel at the period end (billing_lifecycle.js)

// Self-serve Billing section for the authenticated /work dashboard. It is the
// single place a personal (non-company) account manages money: see the current
// plan + status, upgrade / downgrade (monthly <-> annual) in-app with an honest
// proration summary and a confirm step, cancel (access to period end), update
// the card, and read every invoice. Company members are covered by their
// company and never see this (the parent only mounts it for personal accounts).
//
// Design: reuses the dashboard's own tokens (var(--em), --panel, --line, ...),
// which it inherits from the surrounding .wd wrapper, so it matches the white
// in-product look in light and the dark palette automatically. Scoped under
// .wb; RTL-safe (logical properties, no hard left/right). Renders clean with
// zero overflow/clip/wrap at both ~1280px and ~640px (SUPREME RULE XIV).
//
// Defensive by contract: the safe subscription is only { status, plan,
// currentPeriodEnd } (server/store.getSubscription), so cycle/price are derived
// from live pricing and shown only when known. The change endpoint may 404
// while another agent wires it; that reads as "coming online", never a crash
// (SUPREME RULE III no-silent-fail, VIII graceful-degrade).
//
// Every user-facing string comes from the billingWidget i18n namespace. Plan
// names (Lite/Basic/Advanced/Premium) are product names and are never
// translated; the subscription / invoice status words are looked up by their
// id (billingWidget.status.* / invStatus.*) with a capitalized raw id as the
// fallback for an id the dictionary does not know yet.

const PLAN_ORDER = ['lite', 'basic', 'advanced', 'premium']
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')

// `subscription` is the FULL safe subscription the shell loads (cycle, renewal
// date, cancel-at-period-end, a scheduled downgrade); user.subscription carries
// status + plan only and is the fallback.
export default function WorkBilling({ user, subscription = null, pricing, invoices, billingConfigured = true, onReload }) {
  const t = useT()
  // Where personal plans are not sold, an existing subscriber keeps the
  // status, invoices and the billing portal, but is not offered a plan change
  // (the server refuses it: server/edition_route_gates.js).
  const sellsPlans = useEditionView().individualPlans
  const statusLabel = (s) => (t.has(`billingWidget.status.${s}`) ? t(`billingWidget.status.${s}`) : cap(s))
  const invStatusLabel = (s) => (t.has(`billingWidget.invStatus.${s}`) ? t(`billingWidget.invStatus.${s}`) : cap(s))
  const cycleLower = (c) => (c === 'annual' ? t('billingWidget.cycle.annualLower') : t('billingWidget.cycle.monthlyLower'))
  // Prefer the freshest subscription we have: one returned by a change we just
  // made overrides the (possibly stale) prop so the panel never shows the old
  // plan after an upgrade (SUPREME RULE III: operator sees the true state).
  const [liveSub, setLiveSub] = useState(null)
  const sub = liveSub || subscription || (user && user.subscription) || {}
  const status = sub.status || 'none'
  const plan = sub.plan || null
  // cycle is not in the safe subscription contract; show it only if present.
  const cycle = sub.cycle === 'annual' ? 'annual' : (sub.cycle === 'monthly' ? 'monthly' : null)
  const periodEnd = sub.currentPeriodEnd || null
  const cancelAtPeriodEnd = !!(sub.cancelAtPeriodEnd || status === 'canceled')

  // Change-plan picker state.
  const [pickCycle, setPickCycle] = useState(cycle || 'monthly')
  const [confirm, setConfirm] = useState(null)   // { plan, cycle } awaiting confirm
  const [changeBusy, setChangeBusy] = useState(false)
  const [changeErr, setChangeErr] = useState('')
  const [result, setResult] = useState(null)      // server summary after a change
  const [comingOnline, setComingOnline] = useState(false)

  // Portal (update card / cancel / download invoices) + cancel confirm.
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalErr, setPortalErr] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  // Resume a plan set to end at the period end (billing_lifecycle.js).
  const [resumeBusy, setResumeBusy] = useState(false)
  const [resumeErr, setResumeErr] = useState('')
  const resume = async () => {
    setResumeBusy(true); setResumeErr('')
    try {
      const r = await api.workResumeSubscription()
      if (r && r.subscription) setLiveSub(r.subscription)
      if (typeof onReload === 'function') { try { onReload() } catch { /* best-effort refresh */ } }
    } catch (e) { setResumeErr((e && e.message) || t('billingWidget.lifecycle.errResume')) } finally { setResumeBusy(false) }
  }

  const currency = (pricing && pricing.currency) || 'usd'
  const money = (amount, opts) => {
    const v = Number(amount)
    if (!isFinite(v)) return ''
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(currency).toUpperCase(), minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2, ...(opts || {}) }).format(v) }
    catch { return `$${v % 1 ? v.toFixed(2) : v}` }
  }
  // Stripe reports invoice amounts in the currency minor unit (cents).
  const invMoney = (cents, cur) => {
    const v = (Number(cents) || 0) / 100
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: String(cur || currency).toUpperCase() }).format(v) }
    catch { return `$${v.toFixed(2)}` }
  }
  const fmtDate = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '' } }

  // Monthly list price per tier from live pricing; annual = 20% off (billing.js).
  const monthlyPrice = (p) => { const v = pricing && pricing.plans ? Number(pricing.plans[p]) : NaN; return isFinite(v) ? v : null }
  const annualPrice = (p) => { const m = monthlyPrice(p); return m == null ? null : Math.round(m * 12 * 0.8) }
  // Included guided hours per MONTH per tier (plan model: renewed on the 1st).
  const hoursMonthly = (p) => { const v = pricing && pricing.hoursMonthly ? Number(pricing.hoursMonthly[p]) : NaN; return isFinite(v) ? v : null }
  const annualReady = !!(pricing && pricing.annualReady)

  // Plans available to choose from, from pricing (single source), in tier order.
  const plans = useMemo(() => {
    const src = (pricing && pricing.plans) || {}
    const ids = PLAN_ORDER.filter((p) => src[p] != null)
    return (ids.length ? ids : PLAN_ORDER).map((id) => ({
      id, name: cap(id), monthly: monthlyPrice(id), annual: annualPrice(id), hrs: hoursMonthly(id),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing])

  const statusCls = status === 'active' || status === 'trialing' ? 'good' : (status === 'past_due' ? 'warn' : (status === 'canceled' ? 'muted' : ''))
  const canChange = status === 'active' || status === 'trialing'
  const priceForPlan = (p, cyc) => (cyc === 'annual' ? annualPrice(p) : monthlyPrice(p))

  // Open the Stripe Customer Portal (card / cancel / invoices). optAction is
  // only informational here; the portal shows every management action.
  const openPortal = async () => {
    setPortalErr(''); setPortalBusy(true)
    try {
      const r = await api.workBillingPortal()
      if (r && r.url) { window.location = r.url; return }
      setPortalErr(t('billingWidget.errors.portalOpen'))
    } catch (e) {
      setPortalErr((e && e.message) ? e.message : t('billingWidget.errors.portalUnavailable'))
    } finally { setPortalBusy(false) }
  }

  // Ask for a plan change. Different plan OR different cycle both count.
  const beginChange = (p, cyc) => {
    setChangeErr(''); setResult(null)
    setConfirm({ plan: p, cycle: cyc })
  }
  const applyChange = async () => {
    if (!confirm) return
    setChangeBusy(true); setChangeErr(''); setComingOnline(false)
    try {
      const r = await api.workChangePlan(confirm.plan, confirm.cycle)
      if (r && r.subscription) setLiveSub(r.subscription)
      setResult({
        effective: r && r.effective === 'period_end' ? 'period_end' : 'now',
        effectiveDate: (r && r.effectiveDate) || null,
        summary: (r && r.summary) || '',
        plan: confirm.plan, cycle: confirm.cycle,
      })
      setConfirm(null)
      if (typeof onReload === 'function') { try { onReload() } catch { /* best-effort refresh */ } }
    } catch (e) {
      // 404 => the change endpoint is not wired yet. That is a known, temporary
      // state, not a failure: tell the user plainly and keep the portal path
      // (which can also change the plan) available. Never crash or show a red
      // error for it (SUPREME RULE VIII: actionable, graceful).
      if (e && e.status === 404) { setComingOnline(true); setConfirm(null) }
      else setChangeErr((e && e.message) ? e.message : t('billingWidget.errors.change'))
    } finally { setChangeBusy(false) }
  }

  // Billing configured but this account never checked out: nothing to manage yet.
  const neverCheckedOut = status === 'none' && !(Array.isArray(invoices) && invoices.length > 0)

  return (
    <div className="wb" role="region" aria-label={t('billingWidget.aria')}>
      <style>{CSS}</style>

      {/* Header: identity of the section + the one always-safe action (portal). */}
      <div className="wb-head">
        <span className="wb-ic"><CreditCard size={18} /></span>
        <div className="wb-head-txt">
          <h3>{t('billingWidget.head.title')}</h3>
          <p>{t('billingWidget.head.sub')}</p>
        </div>
        <button className="wb-btn ghost" onClick={openPortal} disabled={portalBusy}>
          {portalBusy ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />}
          <span>{t('billingWidget.head.manage')}</span>
        </button>
      </div>

      {!billingConfigured && (
        <div className="wb-note info"><Info size={15} /> <span>{t('billingWidget.settingUp')}</span></div>
      )}

      {/* Past-due banner: the one thing that needs action now. */}
      {status === 'past_due' && (
        <div className="wb-banner warn" role="alert">
          <AlertTriangle size={17} />
          <div className="wb-banner-txt">
            <b>{t('billingWidget.pastDue.title')}</b>
            <span>{t('billingWidget.pastDue.body')}</span>
          </div>
          <button className="wb-btn warm" onClick={openPortal} disabled={portalBusy}>
            {portalBusy ? <Loader2 size={15} className="spin" /> : <CreditCard size={15} />}
            <span>{t('billingWidget.pastDue.fix')}</span>
          </button>
        </div>
      )}

      {/* Canceled banner: honest about access continuing until period end. */}
      {cancelAtPeriodEnd && status !== 'past_due' && periodEnd && (
        <div className="wb-note muted wb-ending">
          <CalendarClock size={15} />
          <span>{status === 'canceled' ? t('billingWidget.canceledNote.canceled') : t('billingWidget.canceledNote.scheduled')} {t.rich('billingWidget.canceledNote.access', { date: fmtDate(periodEnd) })}</span>
          {status !== 'canceled' && (
            <button className="wb-btn solid wb-resume" onClick={resume} disabled={resumeBusy}>
              {resumeBusy ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
              <span>{t('billingWidget.lifecycle.resume')}</span>
            </button>
          )}
          {resumeErr && <span className="wb-ending-err" role="alert">{resumeErr}</span>}
        </div>
      )}

      {/* Current plan summary. */}
      <div className="wb-current">
        <div className="wb-cur-main">
          <div className="wb-cur-row">
            <span className="wb-plan-name">{plan ? cap(plan) : t('billingWidget.current.noPlan')}</span>
            <span className={`wb-status ${statusCls}`}>{statusLabel(status)}</span>
            {cycle && <span className="wb-chip">{cycle === 'annual' ? t('billingWidget.cycle.annual') : t('billingWidget.cycle.monthly')}</span>}
          </div>
          <div className="wb-cur-meta">
            {plan && priceForPlan(plan, cycle || 'monthly') != null && (
              <span className="wb-meta-item">
                {money(priceForPlan(plan, cycle || 'monthly'))}
                <i>/{(cycle || 'month') === 'annual' ? t('billingWidget.current.perYear') : t('billingWidget.current.perMonth')}</i>
              </span>
            )}
            {plan && hoursMonthly(plan) != null && (
              <span className="wb-meta-item">{t.n('billingWidget.current.hoursPerMonth', hoursMonthly(plan))}</span>
            )}
            {periodEnd && (
              <span className="wb-meta-item">
                <CalendarClock size={13} />
                {cancelAtPeriodEnd ? t('billingWidget.current.accessUntil') : (status === 'trialing' ? t('billingWidget.current.trialEnds') : t('billingWidget.current.renews'))} {fmtDate(periodEnd)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The result of a change we just made (honest about when it takes effect). */}
      {result && (
        <div className={`wb-note ${result.effective === 'now' ? 'good' : 'info'}`} role="status">
          {result.effective === 'now' ? <Check size={15} /> : <CalendarClock size={15} />}
          <span>
            {result.summary
              ? result.summary
              : (result.effective === 'now'
                ? t('billingWidget.result.now', { plan: cap(result.plan), cycle: cycleLower(result.cycle) })
                : (result.effectiveDate
                  ? t('billingWidget.result.scheduledOn', { plan: cap(result.plan), cycle: cycleLower(result.cycle), date: fmtDate(result.effectiveDate) })
                  : t('billingWidget.result.scheduledPeriodEnd', { plan: cap(result.plan), cycle: cycleLower(result.cycle) })))}
          </span>
        </div>
      )}

      {/* "Coming online": the change endpoint is not wired yet. */}
      {comingOnline && (
        <div className="wb-note info" role="status">
          <Info size={15} />
          <span>{t.rich('billingWidget.comingOnline', null, { a: (c) => <button className="wb-link" onClick={openPortal} disabled={portalBusy}>{c}</button> })}</span>
        </div>
      )}

      {/* Change plan: upgrade / downgrade + monthly<->annual. Only for an active
          or trialing subscription; past_due must fix payment first, and a
          canceled / never-started account picks a plan through checkout. */}
      {canChange && sellsPlans && (
        <div className="wb-change">
          <div className="wb-change-head">
            <h4>{t('billingWidget.change.title')}</h4>
            {(annualReady || cycle === 'annual') ? (
              <div className="wb-toggle" role="tablist" aria-label={t('billingWidget.change.cycleAria')}>
                <button role="tab" aria-selected={pickCycle === 'monthly'} className={pickCycle === 'monthly' ? 'on' : ''} onClick={() => setPickCycle('monthly')}>{t('billingWidget.cycle.monthly')}</button>
                <button role="tab" aria-selected={pickCycle === 'annual'} className={pickCycle === 'annual' ? 'on' : ''} onClick={() => setPickCycle('annual')}>{t('billingWidget.cycle.annual')} <i>-20%</i></button>
              </div>
            ) : null}
          </div>

          <div className="wb-plan-grid">
            {plans.map((p) => {
              const isCurrent = p.id === plan && (!cycle || cycle === pickCycle)
              const curIdx = PLAN_ORDER.indexOf(plan)
              const thisIdx = PLAN_ORDER.indexOf(p.id)
              const dir = thisIdx > curIdx ? 'up' : (thisIdx < curIdx ? 'down' : 'same')
              const price = pickCycle === 'annual' ? p.annual : p.monthly
              return (
                <div key={p.id} className={`wb-plan ${isCurrent ? 'current' : ''}`}>
                  <div className="wb-plan-top">
                    <span className="wb-plan-nm">{p.name}</span>
                    {isCurrent && <span className="wb-plan-tag">{t('billingWidget.change.current')}</span>}
                  </div>
                  <div className="wb-plan-price">
                    {price != null ? <>{money(price)}<i>/{pickCycle === 'annual' ? t('billingWidget.cycle.perYr') : t('billingWidget.cycle.perMo')}</i></> : <span className="wb-plan-na">{t('billingWidget.change.contactUs')}</span>}
                  </div>
                  {p.hrs != null && <div className="wb-plan-sub">{t.n('billingWidget.change.hoursGuided', p.hrs)}</div>}
                  <button
                    className={`wb-btn ${dir === 'up' ? 'solid' : 'outline'} wb-plan-cta`}
                    disabled={isCurrent || price == null || changeBusy}
                    onClick={() => beginChange(p.id, pickCycle)}
                  >
                    {isCurrent ? <><Check size={14} /> {t('billingWidget.change.yourPlan')}</>
                      : dir === 'up' ? <><ArrowUpRight size={14} /> {t('billingWidget.change.upgrade')}</>
                      : dir === 'down' ? <><ArrowDownRight size={14} /> {t('billingWidget.change.downgrade')}</>
                      : <>{pickCycle === 'annual' ? t('billingWidget.change.switchAnnual') : t('billingWidget.change.switchMonthly')}</>}
                  </button>
                </div>
              )
            })}
          </div>
          {changeErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{changeErr}</span></div>}

          <div className="wb-cancel-row">
            <span className="wb-cancel-txt"><ShieldCheck size={14} /> {t('billingWidget.change.note')}</span>
            {!cancelAtPeriodEnd && (
              <button className="wb-link danger" onClick={() => setCancelOpen(true)}><Ban size={14} /> {t('billingWidget.change.cancel')}</button>
            )}
          </div>
        </div>
      )}

      {/* No subscription yet (billing live, account never checked out). */}
      {neverCheckedOut && billingConfigured && (
        <div className="wb-note info"><Info size={15} /> <span>{t('billingWidget.noPlanYet')}</span></div>
      )}

      {/* Invoices. */}
      <div className="wb-inv-sec">
        <div className="wb-inv-head">
          <h4>{t('billingWidget.invoices.title')}</h4>
          <button className="wb-link" onClick={openPortal} disabled={portalBusy}><ExternalLink size={13} /> {t('billingWidget.invoices.paymentMethod')}</button>
        </div>
        {invoices == null ? (
          <div className="wb-empty"><Loader2 size={14} className="spin" /> {t('billingWidget.invoices.loading')}</div>
        ) : invoices.length === 0 ? (
          <div className="wb-empty">{t('billingWidget.invoices.empty')}</div>
        ) : (
          <ul className="wb-inv-list">
            {invoices.map((inv) => (
              <li key={inv.id} className="wb-inv-row">
                <span className="wb-inv-amt">{invMoney(inv.amount, inv.currency)}</span>
                <span className="wb-inv-dt">{fmtDate(inv.created)}{inv.number ? ` · ${inv.number}` : ''}</span>
                <span className={`wb-inv-st ${inv.status === 'paid' ? 'paid' : ''}`}>{invStatusLabel(inv.status || 'open')}</span>
                <span className="wb-inv-links">
                  {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> {t('billingWidget.invoices.view')}</a>}
                  {inv.invoicePdf && <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer"><FileText size={13} /> {t('billingWidget.invoices.pdf')}</a>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {portalErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{portalErr}</span></div>}

      {/* Trust footer: an explicit security cue for the payment surface. Payment
          details and card data are handled on Stripe's PCI-compliant pages; we
          never store card numbers. */}
      <div className="wb-trust">
        <span className="wb-trust-badge"><Lock size={13} /> {t('billingWidget.trust.badge')}</span>
        <span className="wb-trust-txt"><ShieldCheck size={13} /> {t('billingWidget.trust.text')}</span>
      </div>

      {/* Confirm a plan change. Honest copy mirroring the server contract. */}
      {confirm && (() => {
        const curIdx = PLAN_ORDER.indexOf(plan)
        const thisIdx = PLAN_ORDER.indexOf(confirm.plan)
        const isUp = thisIdx > curIdx
        const cyc = confirm.cycle === 'annual' ? 'annual' : 'monthly'
        const price = priceForPlan(confirm.plan, cyc)
        return (
          <div className="wb-ov" onClick={() => !changeBusy && setConfirm(null)}>
            <div className="wb-modal" role="dialog" aria-modal="true" aria-label={t('billingWidget.confirm.aria')} onClick={(e) => e.stopPropagation()}>
              <h3>{isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />} {isUp ? t('billingWidget.confirm.upgradeTo', { plan: cap(confirm.plan) }) : t('billingWidget.confirm.changeTo', { plan: cap(confirm.plan) })}</h3>
              <div className="wb-modal-plan">
                <span className="wb-modal-plan-nm">{cap(confirm.plan)} <i>{cyc === 'annual' ? t('billingWidget.cycle.annual') : t('billingWidget.cycle.monthly')}</i></span>
                {price != null && <span className="wb-modal-plan-pr">{money(price)}<i>/{cyc === 'annual' ? t('billingWidget.cycle.perYr') : t('billingWidget.cycle.perMo')}</i></span>}
              </div>
              <p className="wb-modal-note">
                {isUp ? t('billingWidget.confirm.upNote') : t('billingWidget.confirm.downNote')}
              </p>
              <p className="wb-modal-fine">{t('billingWidget.confirm.fine')}</p>
              {changeErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{changeErr}</span></div>}
              <div className="wb-modal-btns">
                <button className="wb-btn ghost" onClick={() => setConfirm(null)} disabled={changeBusy}>{t('billingWidget.confirm.notNow')}</button>
                <button className="wb-btn solid" onClick={applyChange} disabled={changeBusy}>
                  {changeBusy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  <span>{isUp ? t('billingWidget.confirm.confirmUpgrade') : t('billingWidget.confirm.confirmChange')}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Cancel in the app (ends at the period end; resumable until then). */}
      {cancelOpen && (
        <CancelPlanModal periodEnd={periodEnd} onClose={() => setCancelOpen(false)} onDone={(s) => { setCancelOpen(false); if (s) setLiveSub(s); if (typeof onReload === 'function') { try { onReload() } catch { /* best-effort */ } } }} />
      )}
    </div>
  )
}

const CSS = `
/* ACCENT ADOPT (SUPREME RULE II single-source): the primary-accent tokens this
   surface uses derive from the shared per-user --accent set (src/theme/accent.js),
   each with the dashboard's CURRENT value as the fallback, so with no accent set
   nothing changes and when the user picks one, every primary-accent cue here
   (status chips, current-plan highlight, solid buttons, cycle toggle, focus)
   follows it live. --em-2 stays the brand-blue secondary used for text links,
   matching how the dashboard itself separates the primary accent from links. */
.wb{--em:var(--accent,#0e9f6e);--on-em:var(--accent-contrast,#ffffff);
  --em-fill:var(--accent-soft,#eafaf3);--em-fill-2:var(--accent-soft,#d9f3e7);--em-line:var(--accent-line,#bde9d5)}
.wb{margin-top:18px;border:1px solid var(--line);background:linear-gradient(180deg,var(--panel-2),var(--panel));border-radius:18px;padding:18px;box-shadow:var(--shadow);color:var(--tx)}
.wb *{box-sizing:border-box}
.wb h3,.wb h4{margin:0;font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;letter-spacing:-.012em}
.wb .spin{animation:wb-spin 1s linear infinite}
@keyframes wb-spin{to{transform:rotate(360deg)}}

/* Header */
.wb-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.wb-ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wb-head-txt{flex:1 1 220px;min-width:0}
.wb-head-txt h3{font-weight:700;font-size:16px;margin-bottom:4px}
.wb-head-txt p{color:var(--mut);font-size:13.5px;line-height:1.45}

/* Buttons (share the dashboard's accent system) */
.wb-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:13.5px;font-weight:700;border-radius:11px;padding:9px 14px;cursor:pointer;border:1px solid transparent;white-space:nowrap;flex-shrink:0;transition:filter .15s,background .15s,border-color .15s,color .15s;margin-inline-start:auto}
.wb-btn span{white-space:nowrap}
.wb-btn.solid{background:var(--em);color:var(--on-em);border-color:var(--em)}
.wb-btn.solid:hover{filter:brightness(1.05)}
.wb-btn.ghost{background:transparent;color:var(--tx);border-color:var(--line-2)}
.wb-btn.ghost:hover{border-color:var(--em);color:var(--em)}
.wb-btn.outline{background:transparent;color:var(--em);border-color:var(--em-line)}
.wb-btn.outline:hover{background:var(--em-fill)}
.wb-btn.warm{background:var(--warm);color:var(--cta-ink);border-color:var(--warm)}
.wb-btn.warm:hover{filter:brightness(1.05)}
.wb-btn.danger{background:transparent;color:var(--danger);border-color:var(--warm-line)}
.wb-btn.danger:hover{background:var(--warm-fill)}
.wb-btn:disabled{opacity:.6;cursor:default;filter:none}

.wb-link{background:none;border:none;font:inherit;font-size:13px;font-weight:600;color:var(--em-2);cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:0;text-decoration:none}
.wb-link:hover{text-decoration:underline}
.wb-link.danger{color:var(--danger)}
.wb-link:disabled{opacity:.6;cursor:default;text-decoration:none}

/* Notes + banners */
.wb-note{display:flex;gap:9px;align-items:flex-start;margin-top:14px;padding:11px 14px;border-radius:12px;font-size:13.5px;line-height:1.5;border:1px solid var(--info-line);background:var(--info-fill);color:var(--tx)}
.wb-note svg{flex-shrink:0;margin-top:2px;color:var(--info)}
.wb-note.good{border-color:var(--em-line);background:var(--em-fill)}
.wb-note.good svg{color:var(--em)}
.wb-note.warn{border-color:var(--warm-line);background:var(--warm-fill)}
.wb-note.warn svg{color:var(--warm)}
.wb-note.muted{border-color:var(--line-2);background:var(--panel-3)}
.wb-note.muted svg{color:var(--mut)}
.wb-ending{flex-wrap:wrap}
.wb-ending>span:first-of-type{flex:1 1 240px}
.wb-resume{flex:0 0 auto}
.wb-ending-err{flex-basis:100%;color:var(--danger);font-size:13px}
.wb-reason{display:flex;flex-direction:column;gap:6px;margin:12px 0}
.wb-reason span{font-size:13px;font-weight:600;color:var(--mut)}
.wb-reason textarea{width:100%;resize:vertical;border:1px solid var(--line);border-radius:10px;background:var(--panel-2,var(--panel));color:var(--tx);font:inherit;font-size:14px;padding:9px 11px}
.wb-reason textarea:focus{outline:2px solid var(--em);outline-offset:1px}
.wb-note .wb-link{margin:0}

.wb-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding:13px 15px;border-radius:14px;border:1px solid var(--warm-line);background:var(--warm-fill)}
.wb-banner svg{color:var(--warm);flex-shrink:0}
.wb-banner-txt{display:flex;flex-direction:column;gap:2px;flex:1 1 240px;min-width:0}
.wb-banner-txt b{font-size:14px;color:var(--tx)}
.wb-banner-txt span{font-size:13px;color:var(--mut);line-height:1.45}

/* Current plan */
.wb-current{margin-top:16px;border:1px solid var(--line);border-radius:14px;padding:15px 16px;background:var(--panel)}
.wb-cur-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wb-plan-name{font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-weight:800;font-size:18px;line-height:1}
.wb-status{display:inline-flex;align-items:center;font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;border:1px solid var(--line-2);color:var(--mut);white-space:nowrap}
.wb-status.good{color:var(--em);border-color:var(--em-line);background:var(--em-fill)}
.wb-status.warn{color:var(--warm);border-color:var(--warm-line);background:var(--warm-fill)}
.wb-status.muted{color:var(--mut);border-color:var(--line-2);background:var(--panel-3)}
.wb-chip{display:inline-flex;align-items:center;font-size:11.5px;font-weight:600;border-radius:999px;padding:3px 9px;border:1px solid var(--line-2);color:var(--mut);white-space:nowrap}
.wb-cur-meta{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-top:10px}
.wb-meta-item{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--mut);white-space:nowrap}
.wb-meta-item svg{color:var(--mut);flex-shrink:0}
.wb-meta-item i{font-style:normal;color:var(--mut);font-size:11.5px}

/* Change plan */
.wb-change{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
.wb-change-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.wb-change-head h4{font-weight:700;font-size:14.5px;flex:1 1 auto}
.wb-toggle{display:inline-flex;border:1px solid var(--line-2);border-radius:999px;padding:3px;gap:2px;background:var(--panel-3);flex-shrink:0}
.wb-toggle button{font:inherit;font-size:12.5px;font-weight:600;border:none;background:none;color:var(--mut);border-radius:999px;padding:6px 13px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}
.wb-toggle button.on{background:var(--em);color:var(--on-em)}
.wb-toggle button i{font-style:normal;font-size:10.5px;font-weight:700;opacity:.9}

.wb-plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.wb-plan{display:flex;flex-direction:column;gap:6px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--panel);min-width:0}
.wb-plan.current{border-color:var(--em-line);background:var(--em-fill)}
.wb-plan-top{display:flex;align-items:center;gap:8px}
.wb-plan-nm{font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-weight:700;font-size:14.5px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wb-plan-tag{font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--em);border:1px solid var(--em-line);border-radius:999px;padding:2px 7px;white-space:nowrap;flex-shrink:0}
.wb-plan-price{font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-weight:800;font-size:22px;line-height:1}
.wb-plan-price i{font-style:normal;font-size:11.5px;font-weight:600;color:var(--mut);margin-inline-start:2px}
.wb-plan-na{font-size:14px;font-weight:600;color:var(--mut)}
.wb-plan-sub{font-size:12px;color:var(--mut);line-height:1.4}
.wb-plan-cta{margin-top:8px;margin-inline-start:0;width:100%}

.wb-cancel-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}
.wb-cancel-txt{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut);flex:1 1 260px;line-height:1.45}
.wb-cancel-txt svg{color:var(--em);flex-shrink:0}
.wb-cancel-row .wb-link{margin-inline-start:auto}

/* Invoices */
.wb-inv-sec{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
.wb-inv-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}
.wb-inv-head h4{font-weight:700;font-size:14.5px;flex:1 1 auto}
.wb-empty{margin-top:8px;color:var(--mut);font-size:13px;display:flex;align-items:center;gap:7px}
.wb-inv-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.wb-inv-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 2px;border-top:1px solid var(--line);font-size:13.5px}
.wb-inv-amt{font-weight:700;color:var(--tx);min-width:84px}
.wb-inv-dt{color:var(--mut);flex:1 1 120px;min-width:0}
.wb-inv-st{font-size:12px;font-weight:600;color:var(--mut);border:1px solid var(--line-2);border-radius:999px;padding:2px 9px;white-space:nowrap}
.wb-inv-st.paid{color:var(--em);border-color:var(--em-line)}
.wb-inv-links{display:inline-flex;gap:12px;flex-shrink:0}
.wb-inv-links a{display:inline-flex;align-items:center;gap:4px;color:var(--em-2);font-weight:600;text-decoration:none;white-space:nowrap}
.wb-inv-links a:hover{text-decoration:underline}

/* Modals */
.wb-ov{position:fixed;inset:0;z-index:60;background:rgba(5,8,16,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px}
.wb-modal{width:100%;max-width:440px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow);color:var(--tx)}
.wb-modal h3{display:flex;align-items:center;gap:9px;font-weight:700;font-size:17px;margin-bottom:14px}
.wb-modal h3 svg{color:var(--em);flex-shrink:0}
.wb-modal-plan{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--panel-3);margin-bottom:14px}
.wb-modal-plan-nm{font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-weight:700;font-size:15px}
.wb-modal-plan-nm i{font-style:normal;font-size:12px;font-weight:600;color:var(--mut);margin-inline-start:4px}
.wb-modal-plan-pr{font-family:"Bricolage Grotesque",var(--wd-display,system-ui),sans-serif;font-weight:800;font-size:19px;white-space:nowrap}
.wb-modal-plan-pr i{font-style:normal;font-size:11.5px;font-weight:600;color:var(--mut);margin-inline-start:2px}
.wb-modal-note{font-size:13.5px;color:var(--tx-2);line-height:1.55;margin:0 0 10px}
.wb-modal-fine{font-size:12.5px;color:var(--mut);line-height:1.5;margin:0}
.wb-modal-btns{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}
.wb-modal-btns .wb-btn{margin-inline-start:0}

/* Trust footer (payment-surface security cue) */
.wb-trust{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;margin-top:16px;padding-top:15px;border-top:1px solid var(--line)}
.wb-trust-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--em);border:1px solid var(--em-line);background:var(--em-fill);border-radius:999px;padding:4px 11px;white-space:nowrap;flex-shrink:0}
.wb-trust-badge svg{flex-shrink:0}
.wb-trust-txt{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--mut);line-height:1.45;min-width:0}
.wb-trust-txt svg{color:var(--em);flex-shrink:0}

@media(max-width:640px){
  .wb{padding:15px}
  /* Two roomy columns at narrow width so plan names never truncate behind the
     Current badge (SUPREME RULE XIV: no clipped/truncated labels). */
  .wb-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wb-head-txt{flex-basis:100%}
  .wb-btn{margin-inline-start:0}
  .wb-head>.wb-btn{width:100%}
  .wb-banner .wb-btn{width:100%;margin-inline-start:0}
  .wb-cancel-row .wb-link{margin-inline-start:0}
  .wb-modal-btns .wb-btn{flex:1 1 auto}
}
`
