// Dashboard overview (/work index). The signed-in home: a calm, data-rich
// OVERVIEW that guides the person to act, not a place to type a task (that is
// /work/start). Built from small sections, each in its own module:
//
//   PlanMeters   "Your plan at a glance": hours this month (ring), top-up hours
//                or a company allowance / pool, today's tasks (pips), and the ONE
//                actionable state with the action that resolves it
//   TaskFlow     first run (no session yet): what a guided task looks like, with
//                the Start CTA; replaces the hero + the empty resume list
//   MonthGraph   the last 31 days: guided time per day + tasks started
//   Outcomes     the last completed tasks, each opening to its report
//
// plus the sections kept from before (co-brand strip, hello + plan line, AI
// setup / add-time / gate notes, the needsSub plan chooser, resume sessions
// with the accountable delete modal, buddy card + picker, data protection,
// billing). Every plan number comes from the shell's ONE derivation
// (WorkAppContext.plan = planModel.planView(usage)), so the top-bar pill and the
// meters can never disagree. The retired daily-minutes / banked-credits / trade
// mechanics are gone: plans include hours per month and tasks per day.
//
// Strings: src/i18n/locales/en/workDashboard.js (namespace workDashboard.*).
// Page-only styles: dash.css.js; each section carries its own stylesheet.
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, X, Trash2, Play, AlertTriangle, Globe, ChevronRight, Sparkles, Rocket, Compass, ArrowRight, ShieldCheck, RefreshCw, Building2, Phone, MapPin, LayoutDashboard, Zap, BarChart3, Plus } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import { AVMark } from '../../components/AdmireVedaLogo.jsx'
import WorkBilling from '../../components/WorkBilling.jsx'
import AliveBuddy, { resolveCharacter } from '../../components/AliveBuddy.jsx'
import BuddyPicker from '../../components/BuddyPicker.jsx'
import ScrubRules from '../../components/ScrubRules.jsx'
import { linkHost } from './lib.js'
import { useWorkApp } from './WorkAppContext.jsx'
import { useT } from '../../i18n/index.jsx'
import PlanMeters from './PlanMeters.jsx'
import MonthGraph from './MonthGraph.jsx'
import Outcomes from './Outcomes.jsx'
import TaskFlow from './TaskFlow.jsx'
import { DASH_CSS } from './dash.css.js'

// Plans offered in the chooser, in tier order; only tiers live pricing carries.
const PLAN_TIER_ORDER = ['lite', 'basic', 'advanced', 'premium']

export default function Dashboard() {
  // One translator for the whole app (src/i18n): every key here ships in
  // en/workDashboard.js, so a raw key is never shown (SUPREME RULE III).
  const t = useT()
  const navigate = useNavigate()
  const {
    user, company, usage, plan, renewLabel, timeLeft, planName, low,
    isAdmin, isCompanyMember, isCompanyAdmin, isExecutive, covered,
    needsSub, gateMsg, pricing, money, titleCase,
    showBuy, setShowBuy, ready, aiStatus, aiErr, loadAi,
    sessions, sessLoaded, sessErr, reload, onOpen,
    buddyPref, setBuddyPref, showBilling, billingOn, invoices,
    canBuyHours, upgradeHref, buyCredits,
  } = useWorkApp()

  const buddyChar = useMemo(() => resolveCharacter(buddyPref), [buddyPref])
  const [scrubOpen, setScrubOpen] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [delReason, setDelReason] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')
  const [subBusy, setSubBusy] = useState('')
  const [subErr, setSubErr] = useState('')

  // Plans + their monthly hours and daily tasks come from live pricing (the
  // single source, superadmin-editable); a value pricing lacks is simply not
  // shown rather than invented here.
  const PLAN_META = useMemo(() => {
    const plans = (pricing && pricing.plans) || null
    const ids = plans ? PLAN_TIER_ORDER.filter((tier) => plans[tier] != null) : ['basic', 'advanced', 'premium']
    const num = (obj, id) => { const v = obj && obj[id] != null ? Number(obj[id]) : NaN; return Number.isFinite(v) ? v : null }
    return ids.map((id) => ({
      id,
      name: titleCase(id),
      hrs: num(pricing && pricing.hoursMonthly, id),
      tasks: num(pricing && pricing.tasks, id),
    }))
  }, [pricing, titleCase])
  const startCheckout = async (plan) => {
    setSubErr(''); setSubBusy(plan)
    try {
      const r = await api.workCheckout(plan)
      if (r && r.url) { window.location = r.url; return }
      setSubErr(t('workDashboard.sub.errGeneric'))
    } catch (e) {
      setSubErr(e && e.message ? e.message : t('workDashboard.sub.errBilling'))
    } finally { setSubBusy('') }
  }
  const confirmDelete = async () => {
    if (!delTarget || !delReason.trim()) return
    setDelBusy(true); setDelErr('')
    try { await api.workDelete(delTarget.id, delReason.trim()); setDelTarget(null); setDelReason(''); reload() }
    catch (e) { setDelErr(friendlyError(e, t('workDashboard.del.errGeneric'))) } finally { setDelBusy(false) }
  }

  const name = user.displayName || user.username
  const companyName = (company && company.name) || user.companyName || ''
  const canUpgrade = !!(user && user.canUpgrade)
  const buyHours = () => buyCredits('hours')
  // First run: the person has no session at all (and is not being asked to pick
  // a plan). The flow explains what will happen and carries the Start CTA, so
  // the hero and the empty "resume" list are not shown alongside it.
  const firstRun = sessLoaded && !sessErr && sessions.length === 0 && !needsSub
  const hasHistory = sessLoaded && sessions.length > 0

  return (
    <>
      <style>{DASH_CSS}</style>

      {/* 1. Co-brand strip (company users) */}
      {company && (() => {
        const site = company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : ''
        const place = [company.city, company.state].filter(Boolean).join(', ') || company.address || ''
        const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
        return (
          <section className="wd-cobrand" aria-label={t('workDashboard.cobrand.aria', { company: company.name })}>
            {company.logo
              ? <span className="wd-cobrand-logo"><img src={company.logo} alt={`${company.name} logo`} /></span>
              : <span className="wd-cobrand-logo mono" aria-hidden>{initials ? <b>{initials}</b> : <Building2 size={20} />}</span>}
            <div className="wd-cobrand-id">
              <span className="wd-cobrand-eyebrow">{t('workDashboard.cobrand.eyebrow')}</span>
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
            <span className="wd-cobrand-by"><small>{t('workDashboard.cobrand.poweredBy')}</small> <AVMark size={20} id="avcb" glow={false} /> <b>Work<i>CoPilot</i></b></span>
            {isExecutive && (
              <a className="wd-cobrand-exec" href="/work/exec"><BarChart3 size={15} /> {t('workDashboard.cobrand.exec')} <ArrowRight size={14} /></a>
            )}
          </section>
        )
      })()}

      {/* 2. Hello + plan line (the single h1) */}
      <section className="wd-hello">
        <h1>{t('workDashboard.hello', { name })}</h1>
        {usage
          ? <div className="wd-plan"><span className="wd-plan-dot" /> {
              isAdmin
                ? t('workDashboard.plan.admin')
                : isCompanyMember
                  ? t('workDashboard.plan.company', { company: companyName || t('workDashboard.plan.yourCompany'), time: timeLeft })
                  : covered
                    ? t('workDashboard.plan.covered', { plan: planName, time: timeLeft })
                    : needsSub
                      ? t('workDashboard.plan.choose')
                      : t('workDashboard.plan.free', { time: timeLeft })
            }</div>
          : <div className="wd-plan-skel" aria-hidden />}
      </section>

      {isAdmin && (
        <div className="wd-note" style={{ marginTop: 18 }}>
          <LayoutDashboard size={16} />
          <span>{t('workDashboard.adminNote')} <a href="/work/admin">{t('workDashboard.adminNoteLink')}</a></span>
        </div>
      )}

      {/* 3. Plan meters: hours this month, top-ups / allowance, today's tasks, the one state */}
      {!needsSub && (
        <PlanMeters plan={plan} renewLabel={renewLabel} companyName={companyName}
          canBuy={canBuyHours} canUpgrade={canUpgrade} upgradeHref={upgradeHref} onBuyHours={buyHours} />
      )}

      {/* 4. The primary action: the guided-task flow on a first run, else the hero CTA */}
      {firstRun ? (
        <TaskFlow onStart={() => navigate('/work/start')} canStart={ready} />
      ) : (
        <section className="wd-m-hero">
          <span className="wd-m-hero-ic" aria-hidden><Rocket size={24} /></span>
          <div className="wd-m-hero-body">
            <span className="wd-m-hero-eyebrow">{t('workDashboard.start.eyebrow')}</span>
            <div className="wd-m-hero-title">{t('workDashboard.start.title')}</div>
            <p className="wd-m-hero-benefit">{t('workDashboard.start.benefit')}</p>
          </div>
          <button type="button" className="wd-m-hero-cta" onClick={() => navigate('/work/start')}>
            {t('workDashboard.start.cta')} <ArrowRight size={18} />
          </button>
          {!ready && (
            <div className="wd-m-hero-locked"><AlertTriangle size={14} /> {t('workDashboard.start.locked')}</div>
          )}
        </section>
      )}
      {firstRun && !ready && (
        <div className="wd-note warn" role="note" style={{ marginTop: 12 }}>
          <AlertTriangle size={16} />
          <span>{t('workDashboard.start.locked')}</span>
        </div>
      )}

      {/* 5. AI-setup / add-time / gate notes */}
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
              <h3>{plan && plan.exhausted ? t('workDashboard.buy.titleOut') : t('workDashboard.buy.title')}</h3>
              <p>{t('workDashboard.buy.body', { date: renewLabel })}</p>
              {canBuyHours && <button type="button" className="wd-m-buy-act" onClick={buyHours}><Plus size={13} /> {t('workDashboard.buy.buy')}</button>}
            </div>
            <button className="x" title={t('workDashboard.buy.dismiss')} aria-label={t('workDashboard.buy.dismiss')} onClick={() => setShowBuy(false)}><X size={16} /></button>
          </div>
        )}

        {!ready && aiErr && !aiStatus && (
          <div className="wd-setup">
            <div className="wd-setup-note">
              <span className="wd-ic warm"><AlertTriangle size={15} /></span>
              {t('workDashboard.ai.checkFailPre')} <button type="button" className="wd-link" onClick={() => loadAi()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>{t('workDashboard.ai.retry')}</button>
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
                    ? t('workDashboard.ai.member')
                    : t('workDashboard.ai.solo')}
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
              <h3>{t('workDashboard.sub.title')}</h3>
              <p>{t('workDashboard.sub.lead')}</p>
            </div>
          </div>
          <div className="wd-sub-plans">
            {PLAN_META.map((p) => (
              <button key={p.id} className={`wd-sub-plan${p.id === 'advanced' ? ' pop' : ''}`} disabled={!!subBusy} onClick={() => startCheckout(p.id)}>
                {p.id === 'advanced' && <span className="tag">{t('workDashboard.sub.popular')}</span>}
                <span className="nm">{p.name}</span>
                <span className="pr">{pricing ? money(pricing.plans[p.id]) : ''}<i>{t('workDashboard.sub.perMonth')}</i></span>
                {p.hrs != null && <span className="hr">{t.n('workDashboard.sub.hours', p.hrs, { n: p.hrs })}</span>}
                {p.tasks != null && <span className="hr">{t.n('workDashboard.sub.tasks', p.tasks, { n: p.tasks })}</span>}
                <span className="go">{subBusy === p.id ? <Loader2 size={15} className="spin" /> : <>{t('workDashboard.sub.choose', { plan: p.name })} <ArrowRight size={14} /></>}</span>
              </button>
            ))}
          </div>
          {subErr && <div className="wd-sub-err"><AlertTriangle size={14} /> {subErr}</div>}
          <div className="wd-sub-note">{t('workDashboard.sub.teamNote')}</div>
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 13.5 }}>
            {t('workDashboard.sub.demoPre')} <a href="/demo" className="wd-link">{t('workDashboard.sub.demoLink')}</a>
          </div>
        </div>
      )}

      {/* 7. This month: guided time per day + tasks started (once there is history) */}
      {!needsSub && hasHistory && <MonthGraph refreshKey={usage} />}

      {/* 8. Resume where you left off (not on a first run: the flow above covers it) */}
      {!firstRun && (
      <section className="wd-sessions" id="wd-sessions" aria-label={t('workDashboard.sessions.title')}>
        <div className="wd-sec">
          <span className="wd-ic alt"><RefreshCw size={16} /></span>
          <div>
            <h2>{t('workDashboard.sessions.title')}</h2>
            <p>{t('workDashboard.sessions.sub')}</p>
          </div>
          <a className="wd-sess-all" href="/work/logs" title={t('workDashboard.sessions.viewAll')}>{t('workDashboard.sessions.viewAll')} <ArrowRight size={13} /></a>
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
              <b>{t('workDashboard.sessions.loadErrTitle')}</b>
              <p>{t('workDashboard.sessions.loadErrBodyPre')} <button type="button" className="wd-link" onClick={reload} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>{t('workDashboard.sessions.tryAgain')}</button></p>
            </div>
          </div>
        ) : (() => {
          const resumable = sessions.filter((s) => s.status !== 'ended').slice(0, 2)
          if (resumable.length === 0) {
            return (
              <div className="wd-empty">
                <span className="ic"><Compass size={20} /></span>
                <div>
                  <b>{sessions.length === 0 ? t('workDashboard.sessions.emptyTitle') : t('workDashboard.sessions.noneTitle')}</b>
                  <p>{sessions.length === 0
                    ? t('workDashboard.sessions.emptyBody')
                    : <>{t('workDashboard.sessions.noneBodyPre')} <a className="wd-link" href="/work/completed">{t('workDashboard.sessions.noneBodyCompleted')}</a>{t('workDashboard.sessions.noneBodyMid')} <a className="wd-link" href="/work/logs">{t('workDashboard.sessions.noneBodyLogs')}</a>.</>}</p>
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
                      <div className="wd-sess-meta">{ended ? t('workDashboard.sessions.completed') : (cur ? t('workDashboard.sessions.stepWas', { step: cur.text }) : t('workDashboard.sessions.notStarted'))} &middot; <span className="wd-sess-done">{done}/{tot}</span> {t('workDashboard.sessions.stepsLabel')}{tot > 0 ? <> &middot; {pct}%</> : null}</div>
                      {tot > 0 && <div className="wd-sess-bar"><i style={{ width: `${pct}%` }} /></div>}
                    </div>
                    <button className="wd-resume" onClick={() => onOpen(s.id)}><span>{ended ? t('workDashboard.sessions.open') : t('workDashboard.sessions.resume')}</span> <ArrowRight size={14} /></button>
                    <button className="wd-del" title={t('workDashboard.sessions.delete')} aria-label={t('workDashboard.sessions.delete')} onClick={() => { setDelTarget(s); setDelReason('') }}><Trash2 size={15} /></button>
                  </div>
                )
              })}
              <a className="wd-sess-more" href="/work/logs">{t('workDashboard.sessions.viewAllLogs')} <ArrowRight size={14} /></a>
            </div>
          )
        })()}
      </section>
      )}

      {/* 9. Recent outcomes: the last completed tasks (renders nothing until one is done) */}
      {!needsSub && sessLoaded && !sessErr && <Outcomes sessions={sessions} onOpen={onOpen} />}

      {/* 10. Buddy card + picker, 11. Data protection */}
      <section className="wd-more" aria-label={`${t('workDashboard.buddy.title')}, ${t('workDashboard.dp.title')}`}>
        <div className="wd-card wd-buddy">
          <AliveBuddy character={buddyChar} state="answering" size={30} interactive />
          <div className="wd-card-body">
            <div className="wd-card-t">{t('workDashboard.buddy.title')}</div>
            <div className="wd-card-c">{t('workDashboard.buddy.caption')}</div>
          </div>
          <div className="wd-card-end">
            <BuddyPicker pref={buddyPref} size={24} onPick={setBuddyPref} />
          </div>
        </div>

        <div className="wd-card wd-dp">
          <button type="button" className="wd-dp-btn" onClick={() => setScrubOpen((v) => !v)} aria-expanded={scrubOpen}>
            <span className="wd-ic"><ShieldCheck size={15} /></span>
            <span className="wd-card-body">
              <span className="wd-card-t">{t('workDashboard.dp.title')}</span>
              <span className="wd-card-c">{user.companyId ? (isCompanyAdmin ? t('workDashboard.dp.captionCompanyAdmin') : t('workDashboard.dp.captionCompany')) : t('workDashboard.dp.captionSolo')}</span>
            </span>
            <ChevronRight size={16} className={`wd-dp-chev${scrubOpen ? ' open' : ''}`} />
          </button>
          {scrubOpen && (
            <div className="wd-dp-body">
              {!user.companyId
                ? <ScrubRules />
                : isCompanyAdmin
                  ? <div>{t('workDashboard.dp.bodyCompanyAdminPre')} <a href="/work/company" className="wd-link">{t('workDashboard.dp.bodyCompanyAdminLink')}</a> {t('workDashboard.dp.bodyCompanyAdminPost')}</div>
                  : <div>{t('workDashboard.dp.bodyCompany')}</div>}
            </div>
          )}
        </div>
      </section>

      {/* 12. Billing */}
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
            <h3><Trash2 size={17} /> {t('workDashboard.del.title')}</h3>
            <div className="wd-modal-sess">{(delTarget.title && !/^Session \d/.test(delTarget.title)) ? delTarget.title : (delTarget.goal || t('workDashboard.del.untitled'))}</div>
            <label htmlFor="wd-delreason">{t('workDashboard.del.reasonLabel')} <span className="req">{t('workDashboard.del.required')}</span></label>
            <textarea id="wd-delreason" rows={3} value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder={t('workDashboard.del.reasonPlaceholder')} autoFocus />
            <div className="wd-modal-note">{t('workDashboard.del.note')}</div>
            {delErr && <div className="wd-note warn" role="alert" style={{ marginTop: 12 }}><AlertTriangle size={15} /> <span>{delErr}</span></div>}
            <div className="wd-modal-btns">
              <button className="btn btn-ghost" onClick={() => { setDelTarget(null); setDelErr('') }} disabled={delBusy}>{t('workDashboard.del.cancel')}</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={delBusy || !delReason.trim()}>{delBusy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} {t('workDashboard.del.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
