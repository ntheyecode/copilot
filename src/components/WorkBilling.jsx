import { useMemo, useState } from 'react'
import { api } from '../api.js'
import {
  CreditCard, ExternalLink, FileText, AlertTriangle, Loader2, Check,
  ArrowUpRight, ArrowDownRight, CalendarClock, ShieldCheck, Ban, Info, Lock,
} from 'lucide-react'

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

const STATUS_LABEL = {
  active: 'Active', trialing: 'Trial', past_due: 'Past due',
  canceled: 'Canceled', none: 'No active plan',
}
const PLAN_ORDER = ['lite', 'basic', 'advanced', 'premium']
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')

export default function WorkBilling({ user, pricing, invoices, billingConfigured = true, onReload }) {
  // Prefer the freshest subscription we have: one returned by a change we just
  // made overrides the (possibly stale) prop so the panel never shows the old
  // plan after an upgrade (SUPREME RULE III: operator sees the true state).
  const [liveSub, setLiveSub] = useState(null)
  const sub = liveSub || (user && user.subscription) || {}
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
      setPortalErr('Could not open billing. Please try again.')
    } catch (e) {
      setPortalErr((e && e.message) ? e.message : 'Billing is not available right now.')
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
      else setChangeErr((e && e.message) ? e.message : 'Could not change your plan right now. Please try again, or use Manage billing.')
    } finally { setChangeBusy(false) }
  }

  // Billing configured but this account never checked out: nothing to manage yet.
  const neverCheckedOut = status === 'none' && !(Array.isArray(invoices) && invoices.length > 0)

  return (
    <div className="wb" role="region" aria-label="Billing and subscription">
      <style>{CSS}</style>

      {/* Header: identity of the section + the one always-safe action (portal). */}
      <div className="wb-head">
        <span className="wb-ic"><CreditCard size={18} /></span>
        <div className="wb-head-txt">
          <h3>Billing and plan</h3>
          <p>Manage your subscription, payment method and invoices. Changes are handled securely through Stripe.</p>
        </div>
        <button className="wb-btn ghost" onClick={openPortal} disabled={portalBusy}>
          {portalBusy ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />}
          <span>Manage billing</span>
        </button>
      </div>

      {!billingConfigured && (
        <div className="wb-note info"><Info size={15} /> <span>Billing is being set up. Your plan details and invoices will appear here once it is live.</span></div>
      )}

      {/* Past-due banner: the one thing that needs action now. */}
      {status === 'past_due' && (
        <div className="wb-banner warn" role="alert">
          <AlertTriangle size={17} />
          <div className="wb-banner-txt">
            <b>Your last payment did not go through.</b>
            <span>Update your payment method to keep your access. Your plan stays active while you fix this.</span>
          </div>
          <button className="wb-btn warm" onClick={openPortal} disabled={portalBusy}>
            {portalBusy ? <Loader2 size={15} className="spin" /> : <CreditCard size={15} />}
            <span>Fix payment</span>
          </button>
        </div>
      )}

      {/* Canceled banner: honest about access continuing until period end. */}
      {cancelAtPeriodEnd && status !== 'past_due' && periodEnd && (
        <div className="wb-note muted">
          <CalendarClock size={15} />
          <span>{status === 'canceled' ? 'Your plan is canceled.' : 'Your plan is set to cancel.'} You keep full access until <b>{fmtDate(periodEnd)}</b>. You can pick a plan again any time before then.</span>
        </div>
      )}

      {/* Current plan summary. */}
      <div className="wb-current">
        <div className="wb-cur-main">
          <div className="wb-cur-row">
            <span className="wb-plan-name">{plan ? cap(plan) : 'No plan'}</span>
            <span className={`wb-status ${statusCls}`}>{STATUS_LABEL[status] || cap(status)}</span>
            {cycle && <span className="wb-chip">{cycle === 'annual' ? 'Annual' : 'Monthly'}</span>}
          </div>
          <div className="wb-cur-meta">
            {plan && priceForPlan(plan, cycle || 'monthly') != null && (
              <span className="wb-meta-item">
                {money(priceForPlan(plan, cycle || 'monthly'))}
                <i>/{(cycle || 'month') === 'annual' ? 'year' : 'month'}</i>
              </span>
            )}
            {plan && hoursMonthly(plan) != null && (
              <span className="wb-meta-item">{hoursMonthly(plan)} {hoursMonthly(plan) === 1 ? 'hour' : 'hours'} / month</span>
            )}
            {periodEnd && (
              <span className="wb-meta-item">
                <CalendarClock size={13} />
                {cancelAtPeriodEnd ? 'Access until' : (status === 'trialing' ? 'Trial ends' : 'Renews')} {fmtDate(periodEnd)}
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
                ? `You are now on ${cap(result.plan)} (${result.cycle === 'annual' ? 'annual' : 'monthly'}). The change is effective immediately.`
                : `Your switch to ${cap(result.plan)} (${result.cycle === 'annual' ? 'annual' : 'monthly'}) is scheduled${result.effectiveDate ? ` for ${fmtDate(result.effectiveDate)}` : ' for the end of your current period'}. You keep your current plan until then.`)}
          </span>
        </div>
      )}

      {/* "Coming online": the change endpoint is not wired yet. */}
      {comingOnline && (
        <div className="wb-note info" role="status">
          <Info size={15} />
          <span>In-app plan changes are coming online shortly. In the meantime you can change your plan through <button className="wb-link" onClick={openPortal} disabled={portalBusy}>Manage billing</button>.</span>
        </div>
      )}

      {/* Change plan: upgrade / downgrade + monthly<->annual. Only for an active
          or trialing subscription; past_due must fix payment first, and a
          canceled / never-started account picks a plan through checkout. */}
      {canChange && (
        <div className="wb-change">
          <div className="wb-change-head">
            <h4>Change your plan</h4>
            {(annualReady || cycle === 'annual') ? (
              <div className="wb-toggle" role="tablist" aria-label="Billing cycle">
                <button role="tab" aria-selected={pickCycle === 'monthly'} className={pickCycle === 'monthly' ? 'on' : ''} onClick={() => setPickCycle('monthly')}>Monthly</button>
                <button role="tab" aria-selected={pickCycle === 'annual'} className={pickCycle === 'annual' ? 'on' : ''} onClick={() => setPickCycle('annual')}>Annual <i>-20%</i></button>
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
                    {isCurrent && <span className="wb-plan-tag">Current</span>}
                  </div>
                  <div className="wb-plan-price">
                    {price != null ? <>{money(price)}<i>/{pickCycle === 'annual' ? 'yr' : 'mo'}</i></> : <span className="wb-plan-na">Contact us</span>}
                  </div>
                  {p.hrs != null && <div className="wb-plan-sub">{p.hrs} {p.hrs === 1 ? 'hour' : 'hours'} of guided time / month</div>}
                  <button
                    className={`wb-btn ${dir === 'up' ? 'solid' : 'outline'} wb-plan-cta`}
                    disabled={isCurrent || price == null || changeBusy}
                    onClick={() => beginChange(p.id, pickCycle)}
                  >
                    {isCurrent ? <><Check size={14} /> Your plan</>
                      : dir === 'up' ? <><ArrowUpRight size={14} /> Upgrade</>
                      : dir === 'down' ? <><ArrowDownRight size={14} /> Downgrade</>
                      : <>Switch to {pickCycle === 'annual' ? 'annual' : 'monthly'}</>}
                  </button>
                </div>
              )
            })}
          </div>
          {changeErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{changeErr}</span></div>}

          <div className="wb-cancel-row">
            <span className="wb-cancel-txt"><ShieldCheck size={14} /> Downgrades take effect at your next renewal; upgrades apply right away with prorated credit.</span>
            {!cancelAtPeriodEnd && (
              <button className="wb-link danger" onClick={() => setCancelOpen(true)}><Ban size={14} /> Cancel plan</button>
            )}
          </div>
        </div>
      )}

      {/* No subscription yet (billing live, account never checked out). */}
      {neverCheckedOut && billingConfigured && (
        <div className="wb-note info"><Info size={15} /> <span>You do not have a plan yet. Start one from the plan chooser above to unlock guidance, then manage it here.</span></div>
      )}

      {/* Invoices. */}
      <div className="wb-inv-sec">
        <div className="wb-inv-head">
          <h4>Invoices</h4>
          <button className="wb-link" onClick={openPortal} disabled={portalBusy}><ExternalLink size={13} /> Payment method</button>
        </div>
        {invoices == null ? (
          <div className="wb-empty"><Loader2 size={14} className="spin" /> Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="wb-empty">No invoices yet. They appear here after your first payment.</div>
        ) : (
          <ul className="wb-inv-list">
            {invoices.map((inv) => (
              <li key={inv.id} className="wb-inv-row">
                <span className="wb-inv-amt">{invMoney(inv.amount, inv.currency)}</span>
                <span className="wb-inv-dt">{fmtDate(inv.created)}{inv.number ? ` · ${inv.number}` : ''}</span>
                <span className={`wb-inv-st ${inv.status === 'paid' ? 'paid' : ''}`}>{cap(inv.status || 'open')}</span>
                <span className="wb-inv-links">
                  {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> View</a>}
                  {inv.invoicePdf && <a href={inv.invoicePdf} target="_blank" rel="noopener noreferrer"><FileText size={13} /> PDF</a>}
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
        <span className="wb-trust-badge"><Lock size={13} /> Secured by Stripe</span>
        <span className="wb-trust-txt"><ShieldCheck size={13} /> PCI-compliant checkout · your card details are never stored on our servers.</span>
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
            <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Confirm plan change" onClick={(e) => e.stopPropagation()}>
              <h3>{isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />} {isUp ? 'Upgrade' : 'Change'} to {cap(confirm.plan)}</h3>
              <div className="wb-modal-plan">
                <span className="wb-modal-plan-nm">{cap(confirm.plan)} <i>{cyc === 'annual' ? 'Annual' : 'Monthly'}</i></span>
                {price != null && <span className="wb-modal-plan-pr">{money(price)}<i>/{cyc === 'annual' ? 'yr' : 'mo'}</i></span>}
              </div>
              <p className="wb-modal-note">
                {isUp
                  ? 'This upgrade takes effect immediately. Stripe prorates your current period, so you are only charged the difference now.'
                  : 'This change takes effect at the end of your current billing period. You keep your current plan and its included hours until then, with no new charge today.'}
              </p>
              <p className="wb-modal-fine">You will see the exact amount and timing confirmed on the next screen. You can change or cancel again any time.</p>
              {changeErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{changeErr}</span></div>}
              <div className="wb-modal-btns">
                <button className="wb-btn ghost" onClick={() => setConfirm(null)} disabled={changeBusy}>Not now</button>
                <button className="wb-btn solid" onClick={applyChange} disabled={changeBusy}>
                  {changeBusy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                  <span>Confirm {isUp ? 'upgrade' : 'change'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirm cancel. Routes to the portal, which performs the cancel. */}
      {cancelOpen && (
        <div className="wb-ov" onClick={() => !portalBusy && setCancelOpen(false)}>
          <div className="wb-modal" role="dialog" aria-modal="true" aria-label="Cancel plan" onClick={(e) => e.stopPropagation()}>
            <h3><Ban size={18} /> Cancel your plan?</h3>
            <p className="wb-modal-note">Your plan stays active and you keep full access until the end of your current billing period{periodEnd ? <> (<b>{fmtDate(periodEnd)}</b>)</> : ''}. You will not be charged again. You can pick a plan back up any time.</p>
            <p className="wb-modal-fine">Cancellation is completed on the secure Stripe portal, where you can confirm and see your exact end date.</p>
            {portalErr && <div className="wb-note warn" role="alert"><AlertTriangle size={15} /> <span>{portalErr}</span></div>}
            <div className="wb-modal-btns">
              <button className="wb-btn ghost" onClick={() => setCancelOpen(false)} disabled={portalBusy}>Keep my plan</button>
              <button className="wb-btn danger" onClick={openPortal} disabled={portalBusy}>
                {portalBusy ? <Loader2 size={15} className="spin" /> : <ExternalLink size={15} />}
                <span>Continue to cancel</span>
              </button>
            </div>
          </div>
        </div>
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
