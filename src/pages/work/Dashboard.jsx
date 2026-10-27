// Dashboard overview (/work index). The signed-in home: an at-a-glance OVERVIEW
// that GUIDES the user to act, not a place to type a task (that moved to
// /work/start). Every existing section's behavior is preserved (co-brand strip,
// hello + plan line, AI-setup / buy-time / gate notes, needsSub plan chooser,
// resume sessions + accountable delete modal, buddy card + picker, data
// protection, billing). Added, per the owner: a guided METRICS ROW with
// tooltips (minutes / tasks / banked credits, plus the trade action when the
// user can trade) and a big START A TASK hero CTA that routes to /work/start.
// Shared state comes from WorkAppContext; new styles live in dash.css.js.
//
// ============================================================================
// I18N KEYS ADDED  (namespace: workDashboard.*  -> English value)
// ----------------------------------------------------------------------------
// workDashboard.cobrand.aria                  "{company}, powered by WorkCoPilot"
// workDashboard.cobrand.eyebrow               "Your workspace"
// workDashboard.cobrand.poweredBy             "powered by"
// workDashboard.cobrand.exec                  "Executive dashboard"
// workDashboard.hello                         "Hello {name}"
// workDashboard.plan.admin                    "Administrator access, guidance on"
// workDashboard.plan.company                  "{company} team, {mins} min of guidance left today"
// workDashboard.plan.covered                  "{plan} plan, {mins} min of guidance left today"
// workDashboard.plan.choose                   "Free account, choose a plan to start guiding"
// workDashboard.plan.free                     "Free access, {mins} min of guidance left today"
// workDashboard.plan.yourCompany              "Your company"
// workDashboard.metrics.heading               "Your day at a glance"
// workDashboard.metrics.sub                   "Guidance time and tasks you have left today. Hover the info on any tile for how it works."
// workDashboard.metrics.info                  "How this works"
// workDashboard.metrics.minutes.label         "Minutes left today"
// workDashboard.metrics.minutes.unit          "min"
// workDashboard.metrics.minutes.on            "Guidance on"
// workDashboard.metrics.minutes.onSub         "Always available on your account"
// workDashboard.metrics.minutes.tip           "Daily minutes, resets at {reset}. Counted only while WorkCoPilot is actively guiding you, so pausing keeps time in reserve."
// workDashboard.metrics.minutes.tipAdmin      "As an administrator you have live guidance on at all times, with no daily minute limit."
// workDashboard.metrics.tasks.label           "Tasks left today"
// workDashboard.metrics.tasks.unlimited       "Unlimited"
// workDashboard.metrics.tasks.tip             "How many new tasks you can start today. Resets at {reset}."
// workDashboard.metrics.credits.label         "Banked credits"
// workDashboard.metrics.credits.tip           "Unused tasks you kept. These never expire."
// workDashboard.metrics.low                    "Running low"
// workDashboard.metrics.trade.label           "Trade 2 tasks to 1 hour"
// workDashboard.metrics.trade.busy            "Trading"
// workDashboard.metrics.trade.note            "Turn 2 banked credits into an extra hour of guidance time."
// workDashboard.start.eyebrow                 "Ready when you are"
// workDashboard.start.title                   "Start a task"
// workDashboard.start.benefit                 "Describe what you want done. WorkCoPilot guides you step by step on your screen."
// workDashboard.start.cta                     "Start a task"
// workDashboard.start.locked                  "Finish AI setup to start guiding. The note above has the next step."
// workDashboard.adminNote                     "You have administrator access, so live guidance is on for you."
// workDashboard.adminNoteLink                 "Open the admin console"
// workDashboard.sub.title                     "Choose a plan to start"
// workDashboard.sub.lead                      "Your account is ready. Pick a plan to turn on live guidance. ... resets at {reset}."
// workDashboard.sub.popular                   "Most popular"
// workDashboard.sub.perMonth                  "/mo"
// workDashboard.sub.hours_one                 "{n} hour of daily minutes"
// workDashboard.sub.hours_other               "{n} hours of daily minutes"
// workDashboard.sub.choose                    "Choose {plan}"
// workDashboard.sub.errGeneric                "Could not start checkout. Please try again."
// workDashboard.sub.errBilling                "Billing is not available right now."
// workDashboard.sub.teamNote                  "On a team plan? ... guidance turns on automatically."
// workDashboard.sub.demoPre                   "Not ready to subscribe?"
// workDashboard.sub.demoLink                  "See exactly how it works in the demo"
// workDashboard.buy.titleOut                  "You are out of time for today"
// workDashboard.buy.title                     "Add more guidance time"
// workDashboard.buy.body                      "Your daily minutes reset at {reset}. ... keeps it in reserve."
// workDashboard.buy.dismiss                   "Dismiss"
// workDashboard.ai.checkFailPre               "We could not check your AI status just now."
// workDashboard.ai.retry                      "Retry"
// workDashboard.ai.admin                      "Set the platform AI key in the admin console to turn WorkCoPilot on for everyone."
// workDashboard.ai.adminLink                  "admin console"
// workDashboard.ai.companyAdmin               "Finish AI setup for your company in the company console under AI keys. Until then, your team is on hold."
// workDashboard.ai.companyAdminLink           "company console"
// workDashboard.ai.member                     "Your workspace is being set up. ... please check back shortly."
// workDashboard.ai.solo                       "WorkCoPilot is being provisioned for your account. ... if this persists."
// workDashboard.sessions.title                "Resume where you left off"
// workDashboard.sessions.sub                  "Pick up an in-progress plan at the exact step you were on. ... their own pages."
// workDashboard.sessions.viewAll             "View all"
// workDashboard.sessions.loadErrTitle         "Could not load your sessions"
// workDashboard.sessions.loadErrBodyPre       "This looks like a connection hiccup, not an empty list."
// workDashboard.sessions.tryAgain             "Try again"
// workDashboard.sessions.emptyTitle           "No sessions yet"
// workDashboard.sessions.emptyBody            "Start a task and it is saved here. ... the exact step you were on."
// workDashboard.sessions.noneTitle            "Nothing in progress"
// workDashboard.sessions.noneBodyPre          "Every plan you finished is in your"
// workDashboard.sessions.noneBodyCompleted    "completed tasks"
// workDashboard.sessions.noneBodyMid          ", and every run is in your"
// workDashboard.sessions.noneBodyLogs         "session logs"
// workDashboard.sessions.stepWas              "You were at: {step}"
// workDashboard.sessions.notStarted           "Not started yet"
// workDashboard.sessions.completed            "Completed"
// workDashboard.sessions.stepsLabel           "steps"
// workDashboard.sessions.resume               "Resume"
// workDashboard.sessions.open                 "Open"
// workDashboard.sessions.delete               "Delete session"
// workDashboard.sessions.viewAllLogs          "View all / Session logs"
// workDashboard.buddy.title                   "Your buddy"
// workDashboard.buddy.caption                 "Shows the next step on your screen."
// workDashboard.dp.title                      "Data protection"
// workDashboard.dp.captionCompanyAdmin        "Managed in your admin console"
// workDashboard.dp.captionCompany             "Managed by your company"
// workDashboard.dp.captionSolo                "Customize what gets scrubbed before sending"
// workDashboard.dp.bodyCompanyAdminPre        "Your company's data protection rules live in the"
// workDashboard.dp.bodyCompanyAdminLink       "company console"
// workDashboard.dp.bodyCompanyAdminPost       "under Data governance. The built-in protections always apply."
// workDashboard.dp.bodyCompany                "Your company manages data protection rules for everyone on the team. ... before anything is sent."
// workDashboard.del.title                     "Delete this session?"
// workDashboard.del.untitled                  "Untitled session"
// workDashboard.del.reasonLabel               "Why are you deleting it?"
// workDashboard.del.required                  "required"
// workDashboard.del.reasonPlaceholder         "e.g. duplicate, created by mistake, task no longer needed"
// workDashboard.del.note                      "This is recorded in your company's user activity log: ... what the session was about."
// workDashboard.del.cancel                    "Cancel"
// workDashboard.del.confirm                   "Delete session"
// workDashboard.del.errGeneric                "Could not delete the session. Please try again."
// ============================================================================
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, X, Trash2, Play, AlertTriangle, Globe, ChevronRight, Sparkles, Rocket, Compass, Clock, ArrowRight, ShieldCheck, RefreshCw, Building2, Phone, MapPin, LayoutDashboard, Zap, BarChart3, Info, CheckCircle2, CreditCard } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import { AVMark } from '../../components/AdmireVedaLogo.jsx'
import WorkBilling from '../../components/WorkBilling.jsx'
import AliveBuddy, { resolveCharacter } from '../../components/AliveBuddy.jsx'
import BuddyPicker from '../../components/BuddyPicker.jsx'
import ScrubRules from '../../components/ScrubRules.jsx'
import { linkHost } from './lib.js'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT } from '../../i18n/index.jsx'
import { DASH_CSS } from './dash.css.js'

export default function Dashboard() {
  // One translator for the whole app (src/i18n): t(key, fallback, vars) returns
  // the dictionary value when the key resolves (every key here ships in
  // en/workDashboard.js) and the inline English fallback only if it does not, so
  // a raw key is never shown (SUPREME RULE III: no silent fail).
  const t = useT()
  const navigate = useNavigate()
  const {
    user, company, usage, minsLeft, resetLabel, planName, low,
    isAdmin, isCompanyMember, isCompanyAdmin, isExecutive, covered,
    needsSub, gateMsg, pricing, money, titleCase,
    showBuy, setShowBuy, ready, aiStatus, aiErr, loadAi,
    sessions, sessLoaded, sessErr, reload, onOpen,
    buddyPref, setBuddyPref, showBilling, billingOn, invoices,
    taskCredits, tasksUnlimited, tasksRemaining, tasksCap, tasksResetLabel,
    canTrade, tradeCredits, trading,
  } = useWorkApp()

  const buddyChar = useMemo(() => resolveCharacter(buddyPref), [buddyPref])
  const [scrubOpen, setScrubOpen] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [delReason, setDelReason] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')
  const [subBusy, setSubBusy] = useState('')
  const [subErr, setSubErr] = useState('')

  // Plans + their daily hours come from live pricing (single source).
  const PLAN_TIER_ORDER = ['lite', 'basic', 'advanced', 'premium']
  const PLAN_FALLBACK_HRS = { lite: 1, basic: 2, advanced: 4, premium: 6 }
  const PLAN_META = (pricing && pricing.plans
    ? PLAN_TIER_ORDER.filter((tier) => pricing.plans[tier] != null)
    : ['basic', 'advanced', 'premium']
  ).map((id) => ({
    id,
    name: titleCase(id),
    hrs: (pricing && pricing.dailyHours && pricing.dailyHours[id] != null) ? pricing.dailyHours[id] : PLAN_FALLBACK_HRS[id],
  }))
  const startCheckout = async (plan) => {
    setSubErr(''); setSubBusy(plan)
    try {
      const r = await api.workCheckout(plan)
      if (r && r.url) { window.location = r.url; return }
      setSubErr(t('workDashboard.sub.errGeneric', 'Could not start checkout. Please try again.'))
    } catch (e) {
      setSubErr(e && e.message ? e.message : t('workDashboard.sub.errBilling', 'Billing is not available right now.'))
    } finally { setSubBusy('') }
  }
  const confirmDelete = async () => {
    if (!delTarget || !delReason.trim()) return
    setDelBusy(true); setDelErr('')
    try { await api.workDelete(delTarget.id, delReason.trim()); setDelTarget(null); setDelReason(''); reload() }
    catch (e) { setDelErr(friendlyError(e, t('workDashboard.del.errGeneric', 'Could not delete the session. Please try again.'))) } finally { setDelBusy(false) }
  }

  const name = user.displayName || user.username

  return (
    <>
      <style>{DASH_CSS}</style>

      {/* 1. Co-brand strip (company users) */}
      {company && (() => {
        const site = company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : ''
        const place = [company.city, company.state].filter(Boolean).join(', ') || company.address || ''
        const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
        return (
          <section className="wd-cobrand" aria-label={t('workDashboard.cobrand.aria', '{company}, powered by WorkCoPilot', { company: company.name })}>
            {company.logo
              ? <span className="wd-cobrand-logo"><img src={company.logo} alt={`${company.name} logo`} /></span>
              : <span className="wd-cobrand-logo mono" aria-hidden>{initials ? <b>{initials}</b> : <Building2 size={20} />}</span>}
            <div className="wd-cobrand-id">
              <span className="wd-cobrand-eyebrow">{t('workDashboard.cobrand.eyebrow', 'Your workspace')}</span>
              <span className="wd-cobrand-name" title={company.name}>{company.name}</span>
              {(site || company.phone || place) && (
                <div className="wd-cobrand-meta">
                  {site && <span><Globe size={12} /> <a href={site} target="_blank" rel="noopener noreferrer">{linkHost(site)}</a></span>}
                  {company.phone && <span><Phone size={12} /> <a href={`tel:${String(company.phone).replace(/[^+\d]/g, '')}`}>{company.phone}</a></span>}
                  {place && <span><MapPin size={12} /> <span className="txt">{place}</span></span>}
                </div>
              )}
            </div>
            <span className="wd-cobrand-sep" aria-hidden />
            <span className="wd-cobrand-by"><small>{t('workDashboard.cobrand.poweredBy', 'powered by')}</small> <AVMark size={20} id="avcb" glow={false} /> <b>Work<i>CoPilot</i></b></span>
            {isExecutive && (
              <a className="wd-cobrand-exec" href="/work/exec"><BarChart3 size={15} /> {t('workDashboard.cobrand.exec', 'Executive dashboard')} <ArrowRight size={14} /></a>
            )}
          </section>
        )
      })()}

      {/* 2. Hello + plan line (the single h1) */}
      <section className="wd-hello">
        <h1>{t('workDashboard.hello', 'Hello {name}', { name })}</h1>
        {usage
          ? <div className="wd-plan"><span className="wd-plan-dot" /> {
              isAdmin
                ? t('workDashboard.plan.admin', 'Administrator access, guidance on')
                : isCompanyMember
                  ? t('workDashboard.plan.company', '{company} team, {mins} min of guidance left today', { company: user.companyName || t('workDashboard.plan.yourCompany', 'Your company'), mins: minsLeft })
                  : covered
                    ? t('workDashboard.plan.covered', '{plan} plan, {mins} min of guidance left today', { plan: planName, mins: minsLeft })
                    : needsSub
                      ? t('workDashboard.plan.choose', 'Free account, choose a plan to start guiding')
                      : t('workDashboard.plan.free', 'Free access, {mins} min of guidance left today', { mins: minsLeft })
            }</div>
          : <div className="wd-plan-skel" aria-hidden />}
      </section>

      {isAdmin && (
        <div className="wd-note" style={{ marginTop: 18 }}>
          <LayoutDashboard size={16} />
          <span>{t('workDashboard.adminNote', 'You have administrator access, so live guidance is on for you.')} <a href="/work/admin">{t('workDashboard.adminNoteLink', 'Open the admin console')}</a></span>
        </div>
      )}

      {/* 3. Metrics row (guided, with tooltips) */}
      <section className="wd-m-metrics" aria-label={t('workDashboard.metrics.heading', 'Your day at a glance')}>
        <div className="wd-m-metrics-head">
          <h2>{t('workDashboard.metrics.heading', 'Your day at a glance')}</h2>
          <p>{t('workDashboard.metrics.sub', 'Guidance time and tasks you have left today. Hover the info on any tile for how it works.')}</p>
        </div>
        {usage == null ? (
          <div className="wd-m-grid" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="wd-m-tile">
                <div className="wd-m-skel-top" />
                <div className="wd-m-skel-v" />
                <div className="wd-m-skel-s" />
              </div>
            ))}
          </div>
        ) : (
          <div className="wd-m-grid">
            {/* Minutes left today (admins: guidance always on) */}
            <div className={`wd-m-tile${!isAdmin && low ? ' low' : ''}`}>
              <div className="wd-m-tile-top">
                <span className={`wd-m-ic${!isAdmin && low ? ' warm' : ''}`}><Clock size={15} /></span>
                <span className="wd-m-label">{t('workDashboard.metrics.minutes.label', 'Minutes left today')}</span>
                <span className="wd-m-info-wrap">
                  <button type="button" className="wd-m-info" aria-label={t('workDashboard.metrics.info', 'How this works')} aria-describedby="wd-m-tip-min"><Info size={13} /></button>
                  <span className="wd-m-tip" role="tooltip" id="wd-m-tip-min">
                    {isAdmin
                      ? t('workDashboard.metrics.minutes.tipAdmin', 'As an administrator you have live guidance on at all times, with no daily minute limit.')
                      : t('workDashboard.metrics.minutes.tip', 'Daily minutes, resets at {reset}. Counted only while WorkCoPilot is actively guiding you, so pausing keeps time in reserve.', { reset: resetLabel })}
                  </span>
                </span>
              </div>
              {isAdmin ? (
                <>
                  <div className="wd-m-value">{t('workDashboard.metrics.minutes.on', 'Guidance on')}</div>
                  <div className="wd-m-sub"><CheckCircle2 size={13} /> {t('workDashboard.metrics.minutes.onSub', 'Always available on your account')}</div>
                </>
              ) : (
                <>
                  <div className="wd-m-value">{minsLeft != null ? minsLeft : '-'}<small>{t('workDashboard.metrics.minutes.unit', 'min')}</small></div>
                  <div className="wd-m-sub">{low && <span className="wd-m-lowtag"><AlertTriangle size={12} /> {t('workDashboard.metrics.low', 'Running low')}</span>}</div>
                </>
              )}
            </div>

            {/* Tasks left today */}
            <div className="wd-m-tile">
              <div className="wd-m-tile-top">
                <span className="wd-m-ic alt"><Check size={15} /></span>
                <span className="wd-m-label">{t('workDashboard.metrics.tasks.label', 'Tasks left today')}</span>
                <span className="wd-m-info-wrap">
                  <button type="button" className="wd-m-info" aria-label={t('workDashboard.metrics.info', 'How this works')} aria-describedby="wd-m-tip-tasks"><Info size={13} /></button>
                  <span className="wd-m-tip" role="tooltip" id="wd-m-tip-tasks">
                    {t('workDashboard.metrics.tasks.tip', 'How many new tasks you can start today. Resets at {reset}.', { reset: tasksResetLabel })}
                  </span>
                </span>
              </div>
              <div className="wd-m-value">
                {tasksUnlimited
                  ? t('workDashboard.metrics.tasks.unlimited', 'Unlimited')
                  : <>{tasksRemaining != null ? tasksRemaining : '-'}<small>/ {tasksCap != null ? tasksCap : '-'}</small></>}
              </div>
              <div className="wd-m-sub" />
            </div>

            {/* Banked credits */}
            <div className="wd-m-tile">
              <div className="wd-m-tile-top">
                <span className="wd-m-ic"><CreditCard size={15} /></span>
                <span className="wd-m-label">{t('workDashboard.metrics.credits.label', 'Banked credits')}</span>
                <span className="wd-m-info-wrap">
                  <button type="button" className="wd-m-info" aria-label={t('workDashboard.metrics.info', 'How this works')} aria-describedby="wd-m-tip-credits"><Info size={13} /></button>
                  <span className="wd-m-tip" role="tooltip" id="wd-m-tip-credits">
                    {t('workDashboard.metrics.credits.tip', 'Unused tasks you kept. These never expire.')}
                  </span>
                </span>
              </div>
              <div className="wd-m-value">{taskCredits}</div>
              <div className="wd-m-sub" />
            </div>
          </div>
        )}
        {/* Trade action: turn 2 banked credits into an extra hour (optimistic + refetch) */}
        {usage != null && canTrade && (
          <div className="wd-m-trade">
            <span className="wd-m-trade-note">{t('workDashboard.metrics.trade.note', 'Turn 2 banked credits into an extra hour of guidance time.')}</span>
            <button type="button" className="wd-m-trade-btn" onClick={() => { tradeCredits() }} disabled={trading}>
              {trading ? <><Loader2 size={14} className="spin" /> {t('workDashboard.metrics.trade.busy', 'Trading')}</> : <><RefreshCw size={14} /> {t('workDashboard.metrics.trade.label', 'Trade 2 tasks to 1 hour')}</>}
            </button>
          </div>
        )}
      </section>

      {/* 4. Big Start-a-task hero CTA (the page's primary action) */}
      <section className="wd-m-hero">
        <span className="wd-m-hero-ic" aria-hidden><Rocket size={24} /></span>
        <div className="wd-m-hero-body">
          <span className="wd-m-hero-eyebrow">{t('workDashboard.start.eyebrow', 'Ready when you are')}</span>
          <div className="wd-m-hero-title">{t('workDashboard.start.title', 'Start a task')}</div>
          <p className="wd-m-hero-benefit">{t('workDashboard.start.benefit', 'Describe what you want done. WorkCoPilot guides you step by step on your screen.')}</p>
        </div>
        <button type="button" className="wd-m-hero-cta" onClick={() => navigate('/work/start')}>
          {t('workDashboard.start.cta', 'Start a task')} <ArrowRight size={18} />
        </button>
        {!ready && (
          <div className="wd-m-hero-locked"><AlertTriangle size={14} /> {t('workDashboard.start.locked', 'Finish AI setup to start guiding. The note above has the next step.')}</div>
        )}
      </section>

      {/* 5. AI-setup / buy-time / gate notes */}
      {gateMsg && (
        <div className="wd-note warn" role="alert" style={{ marginTop: 18 }}>
          <AlertTriangle size={16} />
          <span>{gateMsg}</span>
        </div>
      )}

      {!needsSub && (<>
        {(showBuy || low) && (
          <div className="wd-buy" role="note">
            <span className="ic"><Zap size={18} /></span>
            <div>
              <h3>{usage && usage.exhausted ? t('workDashboard.buy.titleOut', 'You are out of time for today') : t('workDashboard.buy.title', 'Add more guidance time')}</h3>
              <p>{t('workDashboard.buy.body', 'Your daily minutes reset at {reset}. Purchased top-up time never expires and stacks on top of your plan. To add time to your account now, ask your administrator. We count time only while WorkCoPilot is actively guiding you, so pausing keeps it in reserve.', { reset: resetLabel })}</p>
            </div>
            <button className="x" title={t('workDashboard.buy.dismiss', 'Dismiss')} aria-label={t('workDashboard.buy.dismiss', 'Dismiss')} onClick={() => setShowBuy(false)}><X size={16} /></button>
          </div>
        )}

        {!ready && aiErr && !aiStatus && (
          <div className="wd-setup">
            <div className="wd-setup-note">
              <span className="wd-ic warm"><AlertTriangle size={15} /></span>
              {t('workDashboard.ai.checkFailPre', 'We could not check your AI status just now.')} <button type="button" className="wd-link" onClick={() => loadAi()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>{t('workDashboard.ai.retry', 'Retry')}</button>
            </div>
          </div>
        )}
        {!ready && aiStatus && (
          <div className="wd-setup">
            <div className="wd-setup-note">
              <span className="wd-ic warm"><Sparkles size={15} /></span>
              {isAdmin
                ? t.rich('workDashboard.ai.admin', null, { a: (c) => <a href="/work/admin" className="wd-link">{c}</a> })
                : isCompanyAdmin
                  ? t.rich('workDashboard.ai.companyAdmin', null, { a: (c) => <a href="/work/company" className="wd-link">{c}</a> })
                  : user.companyId
                    ? t('workDashboard.ai.member', 'Your workspace is being set up. Your administrator needs to finish AI setup before you can start, please check back shortly.')
                    : t('workDashboard.ai.solo', 'WorkCoPilot is being provisioned for your account. Please check back shortly, or contact support if this persists.')}
            </div>
          </div>
        )}
      </>)}

      {/* 6. needsSub plan chooser */}
      {needsSub && (
        <div className="wd-sub" role="note">
          <div className="wd-sub-head">
            <span className="ic"><Rocket size={18} /></span>
            <div>
              <h3>{t('workDashboard.sub.title', 'Choose a plan to start')}</h3>
              <p>{t('workDashboard.sub.lead', "Your account is ready. Pick a plan to turn on live guidance. Your plan's hours are daily minutes you can spend anytime across the day, billed per minute you actually use, never by the hour. Change or cancel anytime; the daily allowance resets at {reset}.", { reset: resetLabel })}</p>
            </div>
          </div>
          <div className="wd-sub-plans">
            {PLAN_META.map((p) => (
              <button key={p.id} className={`wd-sub-plan${p.id === 'advanced' ? ' pop' : ''}`} disabled={!!subBusy} onClick={() => startCheckout(p.id)}>
                {p.id === 'advanced' && <span className="tag">{t('workDashboard.sub.popular', 'Most popular')}</span>}
                <span className="nm">{p.name}</span>
                <span className="pr">{pricing ? money(pricing.plans[p.id]) : ''}<i>{t('workDashboard.sub.perMonth', '/mo')}</i></span>
                <span className="hr">{t.n('workDashboard.sub.hours', p.hrs, { n: p.hrs })}</span>
                <span className="go">{subBusy === p.id ? <Loader2 size={15} className="spin" /> : <>{t('workDashboard.sub.choose', 'Choose {plan}', { plan: p.name })} <ArrowRight size={14} /></>}</span>
              </button>
            ))}
          </div>
          {subErr && <div className="wd-sub-err"><AlertTriangle size={14} /> {subErr}</div>}
          <div className="wd-sub-note">{t('workDashboard.sub.teamNote', 'On a team plan? If your company covers WorkCoPilot, ask your administrator to add you and guidance turns on automatically.')}</div>
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13.5 }}>
            {t('workDashboard.sub.demoPre', 'Not ready to subscribe?')} <a href="/demo" className="wd-link">{t('workDashboard.sub.demoLink', 'See exactly how it works in the demo')}</a>
          </div>
        </div>
      )}

      {/* 7. Resume where you left off */}
      <section className="wd-sessions" id="wd-sessions" aria-label={t('workDashboard.sessions.title', 'Resume where you left off')}>
        <div className="wd-sec">
          <span className="wd-ic alt"><RefreshCw size={16} /></span>
          <div>
            <h2>{t('workDashboard.sessions.title', 'Resume where you left off')}</h2>
            <p>{t('workDashboard.sessions.sub', 'Pick up an in-progress plan at the exact step you were on. Completed tasks and your full history live on their own pages.')}</p>
          </div>
          <a className="wd-sess-all" href="/work/logs" title={t('workDashboard.sessions.viewAll', 'View all')}>{t('workDashboard.sessions.viewAll', 'View all')} <ArrowRight size={13} /></a>
        </div>
        {!sessLoaded ? (
          <div className="wd-sess-list">
            {[0, 1].map((i) => (
              <div key={i} className="wd-skel"><i className="w1" /><i className="w2" /><i className="w3" /></div>
            ))}
          </div>
        ) : sessErr ? (
          <div className="wd-empty">
            <span className="ic"><AlertTriangle size={20} /></span>
            <div>
              <b>{t('workDashboard.sessions.loadErrTitle', 'Could not load your sessions')}</b>
              <p>{t('workDashboard.sessions.loadErrBodyPre', 'This looks like a connection hiccup, not an empty list.')} <button type="button" className="wd-link" onClick={reload} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>{t('workDashboard.sessions.tryAgain', 'Try again')}</button></p>
            </div>
          </div>
        ) : (() => {
          const resumable = sessions.filter((s) => s.status !== 'ended').slice(0, 2)
          if (resumable.length === 0) {
            return (
              <div className="wd-empty">
                <span className="ic"><Compass size={20} /></span>
                <div>
                  <b>{sessions.length === 0 ? t('workDashboard.sessions.emptyTitle', 'No sessions yet') : t('workDashboard.sessions.noneTitle', 'Nothing in progress')}</b>
                  <p>{sessions.length === 0
                    ? t('workDashboard.sessions.emptyBody', 'Start a task and it is saved here. You can pause anytime and come back to the exact step you were on.')
                    : <>{t('workDashboard.sessions.noneBodyPre', 'Every plan you finished is in your')} <a className="wd-link" href="/work/completed">{t('workDashboard.sessions.noneBodyCompleted', 'completed tasks')}</a>{t('workDashboard.sessions.noneBodyMid', ', and every run is in your')} <a className="wd-link" href="/work/logs">{t('workDashboard.sessions.noneBodyLogs', 'session logs')}</a>.</>}</p>
                </div>
              </div>
            )
          }
          return (
            <div className="wd-sess-list">
              {resumable.map((s) => {
                const done = (s.steps || []).filter((x) => x.status === 'done').length
                const tot = (s.steps || []).length
                const cur = (s.steps || [])[s.currentStep]
                const pct = tot > 0 ? Math.round(done / tot * 100) : 0
                const ended = s.status === 'ended'
                return (
                  <div key={s.id} className="wd-sess">
                    <span className={`wd-sess-ic${ended ? ' done' : ''}`} aria-hidden>{ended ? <Check size={15} /> : <Play size={14} />}</span>
                    <div className="wd-sess-main">
                      <div className="wd-sess-title">{(s.title && !/^Session \d/.test(s.title)) ? s.title : (s.goal || s.title)}</div>
                      <div className="wd-sess-meta">{ended ? t('workDashboard.sessions.completed', 'Completed') : (cur ? t('workDashboard.sessions.stepWas', 'You were at: {step}', { step: cur.text }) : t('workDashboard.sessions.notStarted', 'Not started yet'))} &middot; <span className="wd-sess-done">{done}/{tot}</span> {t('workDashboard.sessions.stepsLabel', 'steps')}{tot > 0 ? <> &middot; {pct}%</> : null}</div>
                      {tot > 0 && <div className="wd-sess-bar"><i style={{ width: `${pct}%` }} /></div>}
                    </div>
                    <button className="wd-resume" onClick={() => onOpen(s.id)}><span>{ended ? t('workDashboard.sessions.open', 'Open') : t('workDashboard.sessions.resume', 'Resume')}</span> <ArrowRight size={14} /></button>
                    <button className="wd-del" title={t('workDashboard.sessions.delete', 'Delete session')} aria-label={t('workDashboard.sessions.delete', 'Delete session')} onClick={() => { setDelTarget(s); setDelReason('') }}><Trash2 size={15} /></button>
                  </div>
                )
              })}
              <a className="wd-sess-more" href="/work/logs">{t('workDashboard.sessions.viewAllLogs', 'View all / Session logs')} <ArrowRight size={14} /></a>
            </div>
          )
        })()}
      </section>

      {/* 8. Buddy card + picker, 9. Data protection */}
      <section className="wd-more" aria-label={`${t('workDashboard.buddy.title', 'Your buddy')}, ${t('workDashboard.dp.title', 'Data protection')}`}>
        <div className="wd-card wd-buddy">
          <AliveBuddy character={buddyChar} state="answering" size={30} interactive />
          <div className="wd-card-body">
            <div className="wd-card-t">{t('workDashboard.buddy.title', 'Your buddy')}</div>
            <div className="wd-card-c">{t('workDashboard.buddy.caption', 'Shows the next step on your screen.')}</div>
          </div>
          <div className="wd-card-end">
            <BuddyPicker pref={buddyPref} size={24} onPick={setBuddyPref} />
          </div>
        </div>

        <div className="wd-card wd-dp">
          <button type="button" className="wd-dp-btn" onClick={() => setScrubOpen((v) => !v)} aria-expanded={scrubOpen}>
            <span className="wd-ic"><ShieldCheck size={15} /></span>
            <span className="wd-card-body">
              <span className="wd-card-t">{t('workDashboard.dp.title', 'Data protection')}</span>
              <span className="wd-card-c">{user.companyId ? (isCompanyAdmin ? t('workDashboard.dp.captionCompanyAdmin', 'Managed in your admin console') : t('workDashboard.dp.captionCompany', 'Managed by your company')) : t('workDashboard.dp.captionSolo', 'Customize what gets scrubbed before sending')}</span>
            </span>
            <ChevronRight size={16} className={`wd-dp-chev${scrubOpen ? ' open' : ''}`} />
          </button>
          {scrubOpen && (
            <div className="wd-dp-body">
              {!user.companyId
                ? <ScrubRules />
                : isCompanyAdmin
                  ? <div>{t('workDashboard.dp.bodyCompanyAdminPre', "Your company's data protection rules live in the")} <a href="/work/company" className="wd-link">{t('workDashboard.dp.bodyCompanyAdminLink', 'company console')}</a> {t('workDashboard.dp.bodyCompanyAdminPost', 'under Data governance. The built-in protections always apply.')}</div>
                  : <div>{t('workDashboard.dp.bodyCompany', 'Your company manages data protection rules for everyone on the team. The built-in protections, emails, keys, card numbers, SSNs, IP addresses and more, always apply on your device before anything is sent.')}</div>}
            </div>
          )}
        </div>
      </section>

      {/* 10. Billing */}
      {showBilling && (
        <WorkBilling
          user={user}
          pricing={pricing}
          invoices={invoices}
          billingConfigured={billingOn}
          onReload={reload}
        />
      )}

      {/* Accountable delete modal */}
      {delTarget && (
        <div className="wd-modal-ov" onClick={() => !delBusy && setDelTarget(null)}>
          <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
            <h3><Trash2 size={17} /> {t('workDashboard.del.title', 'Delete this session?')}</h3>
            <div className="wd-modal-sess">{(delTarget.title && !/^Session \d/.test(delTarget.title)) ? delTarget.title : (delTarget.goal || t('workDashboard.del.untitled', 'Untitled session'))}</div>
            <label htmlFor="wd-delreason">{t('workDashboard.del.reasonLabel', 'Why are you deleting it?')} <span className="req">{t('workDashboard.del.required', 'required')}</span></label>
            <textarea id="wd-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder={t('workDashboard.del.reasonPlaceholder', 'e.g. duplicate, created by mistake, task no longer needed')} autoFocus />
            <div className="wd-modal-note">{t('workDashboard.del.note', "This is recorded in your company's user activity log: who deleted it, when, the reason, and what the session was about.")}</div>
            {delErr && <div className="wd-note warn" role="alert" style={{ marginTop: 12 }}><AlertTriangle size={15} /> <span>{delErr}</span></div>}
            <div className="wd-modal-btns">
              <button className="btn btn-ghost" onClick={() => { setDelTarget(null); setDelErr('') }} disabled={delBusy}>{t('workDashboard.del.cancel', 'Cancel')}</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={delBusy || !delReason.trim()}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} {t('workDashboard.del.confirm', 'Delete session')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
