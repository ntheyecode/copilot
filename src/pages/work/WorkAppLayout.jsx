// Shared signed-in shell for the WorkCoPilot app: the session gate, the desktop
// title-bar frame + window-mode switch, the left rail, the top bar (plan pill,
// buy hours, add time, upgrade, sign out), the impersonation banner, and the
// buy-credits modal. It loads the shared state ONCE and provides it via
// WorkAppContext, then renders the active page through <Outlet/>. This replaces
// the old WorkPage default export (session gate + Home/Console switch) and the
// Home shell (rail + top bar). Moved from WorkPage.jsx with behavior preserved;
// the dashboard overview and the start-a-task wizard live in their own pages.
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, Check, X, Plus, LogOut, Monitor, Eye, Menu as MenuIcon, Zap, LayoutDashboard, BookOpen, Sparkles, Clock, ArrowRight, LifeBuoy, Users, FileText, Download, AlertTriangle, Play, Blocks, BarChart3, Settings } from 'lucide-react'
import { api } from '../../api.js'
import WorkShell from '../../workShell.jsx'
import LanguagePinModal from '../../components/LanguagePinModal.jsx'
import { AVMark } from '../../components/AdmireVedaLogo.jsx'
import { readBuddyPref } from '../../components/AliveBuddy.jsx'
import { useLocale } from '../../i18n/index.jsx'
import { WD_CSS } from './workApp.css.js'
import { card, shell } from './lib.js'
import { WorkAppContext } from './WorkAppContext.jsx'
import PlanPill from './PlanPill.jsx'
import { planView, fmtRenewDate, fmtDuration } from './planModel.js'

// ---- Android self-update banner (moved verbatim from WorkPage) --------------
function AppUpdateBanner() {
  const t = useT()
  const [upd, setUpd] = useState(null)
  useEffect(() => {
    const m = (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '').match(/WorkCoPilotApp\/(\d+)/)
    if (!m) return
    const installed = Number(m[1])
    fetch('/work-updates/android.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && Number(j.versionCode) > installed) setUpd(j) })
      .catch(() => {})
  }, [])
  if (!upd) return null
  return (
    <div style={{ background: 'var(--brand-600)', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
      <Download size={16} />
      <div style={{ flex: 1 }}>{upd.versionName ? t('workShell.update.bodyVersion', { version: upd.versionName }) : t('workShell.update.body')}</div>
      <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--brand-700, #1a1a2e)' }} onClick={() => { window.location.href = '/work-updates/WorkCoPilot.apk' }}>{t('workShell.update.cta')}</button>
    </div>
  )
}

function NoAccess({ onSignOut }) {
  const t = useT()
  return (
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ ...card, maxWidth: 420, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-600)', marginBottom: 8 }}>WorkCoPilot</div>
        <div style={{ color: 'var(--text-dim)' }}>{t('workShell.noAccess.body')}</div>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={onSignOut}><LogOut size={15} /> {t('workShell.noAccess.signOut')}</button>
      </div>
    </div>
  )
}
// Non-blocking cautionary notice for the AI input guardrail (warn-and-proceed).
// Lives at the shell level so it survives navigation between pages. Auto-
// dismisses after ~8s; the user can also close it.
function GuardNotice({ note, onClose }) {
  const t = useT()
  useEffect(() => {
    if (!note) return undefined
    const tm = setTimeout(onClose, 8000)
    return () => clearTimeout(tm)
  }, [note, onClose])
  if (!note) return null
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: 'min(560px, calc(100vw - 24px))', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--warning-soft, #fff7e0)', color: 'var(--text, #1a1a2e)', borderLeft: '3px solid var(--warning, #d98a00)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, lineHeight: 1.45, boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--warning, #d98a00)' }} />
      <span style={{ flex: 1 }}>{note.warning}</span>
      <button type="button" aria-label={t('workShell.guard.dismiss')} onClick={onClose} style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={15} /></button>
    </div>
  )
}

export default function WorkAppLayout() {
  const { t, tag } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const onSession = /^\/work\/session\//.test(pathname)

  // ---- Session gate (moved from the WorkPage default export) ----------------
  const [sess, setSess] = useState(undefined)   // undefined=loading; {signedIn, access, user}
  const [evicted, setEvicted] = useState(false)
  const [guardNote, setGuardNote] = useState(null)
  const showGuard = useCallback((g) => { if (g && !g.blocked && g.warning) setGuardNote({ warning: String(g.warning), severity: g.severity, category: g.category }) }, [])
  const clearGuard = useCallback(() => setGuardNote(null), [])
  const loadMe = useCallback(() => api.workMe().then(setSess).catch(() => setSess({ signedIn: false, access: false, user: null })), [])
  useEffect(() => { loadMe() }, [loadMe])
  // Single active session: api.js fires 'wc:signed-out' when any call returns a
  // forced-logout 401. Show the clear "signed out elsewhere" screen.
  useEffect(() => {
    const onSignedOut = () => { setEvicted(true); try { sessionStorage.removeItem('wc_open') } catch { /* ignore */ } }
    window.addEventListener('wc:signed-out', onSignedOut)
    return () => window.removeEventListener('wc:signed-out', onSignedOut)
  }, [])
  // Legacy reopen: the sub-pages (WorkTasks/WorkLogs useOpenSession) still set
  // sessionStorage 'wc_open' then navigate to /work. Honor it once by sending
  // the user straight to the deep-linkable guiding route, then clear it.
  useEffect(() => {
    if (pathname !== '/work') return
    let id = null
    try { id = sessionStorage.getItem('wc_open') } catch { /* ignore */ }
    if (id) { try { sessionStorage.removeItem('wc_open') } catch { /* ignore */ } navigate('/work/session/' + id, { replace: true }) }
  }, [pathname, navigate])
  // Coming back from Stripe Checkout (success_url = /work?checkout=success):
  // re-hydrate so the new plan shows, then drop the query.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('checkout') === 'success') {
        loadMe()
        sp.delete('checkout')
        const q = sp.toString()
        window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''))
      }
    } catch { /* ignore */ }
  }, [loadMe])

  // Stable identity (useCallback with no closure state) so it does not bust the
  // shared-context memo below (SUPREME RULE I: fix the re-render class at the
  // mechanism - every fn flowing through WorkAppContext is memoized, not patched).
  const signOut = useCallback(async () => { try { await api.logout() } catch {} ; window.location.href = '/workcopilot' }, [])

  // Desktop app: drive the window mode. Planning is a large windowed "plan"
  // mode; an open guiding session is the compact floating "guide" mode.
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  useEffect(() => {
    if (!desktop || !sess || !sess.signedIn || !sess.access) return
    try { desktop.setMode(onSession ? 'guide' : 'plan') } catch { /* ignore */ }
  }, [desktop, onSession, sess])

  // Dashboard fonts are self-hosted and loaded globally in src/main.jsx.

  const authed = !!(sess && sess.signedIn && sess.access)
  const frame = (content) => desktop
    ? <><WorkShell authed={authed} /><div style={{ paddingTop: 40 }}>{content}</div></>
    : content

  // ---- Shared app state (moved from Home.load / loadAi) ---------------------
  const user = sess && sess.user
  const isAdmin = !!(user && (user.role === 'superadmin' || user.role === 'admin'))
  const isCompanyMember = !!(user && user.companyId)
  const isCompanyAdmin = !!(user && user.companyRole === 'company_admin' && user.companyId)
  const isExecutive = !!(user && user.companyId && ['executive', 'company_admin'].includes(user.companyRole))
  const covered = isAdmin || isCompanyMember || !!(user && user.canUseService)
  const hasPlan = !!(user && !user.companyId && user.subscription && ['active', 'trialing', 'past_due', 'canceled'].includes(user.subscription.status))

  const [company, setCompany] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessLoaded, setSessLoaded] = useState(false)
  const [sessErr, setSessErr] = useState(false)
  const [usage, setUsage] = useState(null)
  const [usageErr, setUsageErr] = useState(false)
  const [pricing, setPricing] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)
  const [ready, setReady] = useState(false)
  const [aiErr, setAiErr] = useState(false)
  const [billingOn, setBillingOn] = useState(false)
  const [needsSub, setNeedsSub] = useState(false)
  const [gateMsg, setGateMsg] = useState('')
  const [invoices, setInvoices] = useState(null)
  const [impersonating, setImpersonating] = useState(null)
  const [impStopping, setImpStopping] = useState(false)
  const [buddyPref, setBuddyPref] = useState(() => readBuddyPref())
  // Top-bar controls
  const [railOpen, setRailOpen] = useState(true)
  const [showBuy, setShowBuy] = useState(false)
  // Buy credits (extra hours / image credits): a small quantity + price modal.
  const [buyErr, setBuyErr] = useState('')
  const [buyModal, setBuyModal] = useState(null)   // { kind: 'hours' | 'images' } | null
  const [buyQty, setBuyQty] = useState('')
  const [buying, setBuying] = useState(false)

  const reload = useCallback(() => {
    if (!authed) return
    setSessErr(false); setUsageErr(false)
    api.workList().then((r) => { setSessions(r.sessions || []); setSessErr(false) }).catch(() => setSessErr(true)).finally(() => setSessLoaded(true))
    api.workAppStatus().then(() => {}).catch(() => {})
    api.workUsage().then((u) => { setUsage(u); setUsageErr(false) }).catch(() => setUsageErr(true))
    api.workMe().then((r) => setImpersonating((r && r.impersonating) || null)).catch(() => {})
    fetch('/api/work/pricing').then((r) => r.json()).then(setPricing).catch(() => {})
    api.workSubscription().then((r) => {
      const on = !!(r && r.configured)
      setBillingOn(on)
      const adm = !!(user && (user.role === 'superadmin' || user.role === 'admin'))
      const cov = adm || !!(user && (user.companyId || user.canUseService))
      setNeedsSub(!cov && on)
    }).catch(() => {})
    if (user && !user.companyId) api.workInvoices().then((r) => setInvoices(r.invoices || [])).catch(() => setInvoices([]))
  }, [authed, user])
  useEffect(() => { reload() }, [reload])

  const refreshUsage = useCallback(async () => { try { const u = await api.workUsage(); setUsage(u) } catch { /* ignore */ } }, [])

  const loadAi = useCallback(() => {
    if (!authed) return undefined
    setAiErr(false)
    return api.workAi().then((r) => { setAiStatus(r.status || null); setReady(!!(r.status && r.status.ready)); setAiErr(false) }).catch(() => setAiErr(true))
  }, [authed])
  useEffect(() => { loadAi() }, [loadAi])

  // Warm the app's route chunks shortly after the shell mounts, so clicking a
  // rail item resolves its lazy chunk from cache instead of suspending the whole
  // screen to a fallback (the navigation "flicker"). Idle-scheduled so it never
  // competes with first paint.
  useEffect(() => {
    if (!authed) return undefined
    let cancelled = false
    const warm = () => {
      if (cancelled) return
      import('./Dashboard.jsx'); import('./StartTask.jsx'); import('./Skills.jsx')
      import('./Help.jsx'); import('./Support.jsx'); import('./MyTasks.jsx')
      import('./Completed.jsx'); import('./Logs.jsx')
    }
    const idle = (typeof window !== 'undefined' && window.requestIdleCallback)
      ? window.requestIdleCallback(warm, { timeout: 1500 }) : setTimeout(warm, 400)
    return () => {
      cancelled = true
      try { (typeof window !== 'undefined' && window.cancelIdleCallback) ? window.cancelIdleCallback(idle) : clearTimeout(idle) } catch { /* ignore */ }
    }
  }, [authed])

  useEffect(() => {
    if (!user || !user.companyId) { setCompany(null); return }
    let alive = true
    api.workMyCompany().then((c) => { if (alive) setCompany(c && c.name ? c : null) }).catch(() => { if (alive) setCompany(null) })
    return () => { alive = false }
  }, [user])

  // Deep-link compatibility: ticket emails point at /work?tab=support (and the
  // old ?section=team). Map a known tab/section to its new route on landing.
  useEffect(() => {
    if (pathname !== '/work') return
    try {
      const sp = new URLSearchParams(window.location.search)
      const want = String(sp.get('tab') || sp.get('section') || '').toLowerCase().trim()
      if (!want) return
      const map = { dashboard: '/work', help: '/work/help', support: '/work/support', team: '/work/company' }
      const to = map[want]
      sp.delete('tab'); sp.delete('section')
      const q = sp.toString()
      window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash)
      if (to && to !== '/work') navigate(to, { replace: true })
    } catch { /* leaving the query as-is is harmless */ }
  }, [pathname, navigate])

  // ---- Derived plan values (ONE derivation, planModel.planView) -------------
  // The pill, its popover, the dashboard meters and the console all read `plan`:
  // this month's included hours, top-up hours, a company allowance / pool, today's
  // task cap and the one actionable state. The old minutes-per-day, banked
  // credits and trade values are gone with the monthly plan model.
  const plan = useMemo(() => planView(usage, { isCompanyMember, isAdmin }), [usage, isCompanyMember, isAdmin])
  // When the plan hours renew, localized from the server's 'YYYY-MM-01' key; a
  // pool-based company member (no monthly plan) gets the company's reset label.
  const renewLabel = useMemo(() => (usage ? (fmtRenewDate(usage.renewsAt, tag) || usage.resetLabel || '') : ''), [usage, tag])
  const tasksResetLabel = (plan && plan.tasks && plan.tasks.resetLabel) || ''
  const units = useMemo(() => ({ h: t('workShell.plan.unitH'), min: t('workShell.plan.unitMin') }), [t])
  const timeLeft = plan ? fmtDuration(plan.remainingSeconds, units, true) : null
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
  const planName = cap((user && user.subscription && user.subscription.plan) || (usage && usage.tier) || '') || t('workShell.plan.active')
  const low = !!plan && (plan.exhausted || plan.low)
  const tier = (usage && usage.tier) || 'basic'
  const titleCase = useCallback((s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : ''), [])
  const money = useCallback((n) => (n == null ? '' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`), [])
  const showBilling = hasPlan || (Array.isArray(invoices) && invoices.length > 0)
  const canBuyHours = !!(user && !user.companyId && !isAdmin && usage != null)
  const upgradeHref = '/workcopilot/pricing'

  const stopImpersonate = async () => {
    if (impStopping) return
    setImpStopping(true)
    try {
      const res = await fetch('/api/work/admin/impersonate/stop', { method: 'POST', credentials: 'include', headers: (typeof window !== 'undefined' && window.refigold ? { 'X-Refigold-App': '1' } : undefined) })
      let data = null
      try { data = await res.json() } catch { /* non-JSON response; use fallback */ }
      window.location.href = (data && data.redirect) || '/work/admin'
    } catch {
      try { window.location.href = '/work/admin' } catch { setImpStopping(false) }
    }
  }
  // Buy extra hours / image credits (one-time, Stripe). Triggered from the top bar.
  const buyTier = (usage && usage.tier) || 'basic'
  const imageMin = Math.max(1, Number(pricing && pricing.imageMinBulk) || 1)
  const buyUnit = (kind) => {
    if (!pricing) return null
    const v = kind === 'hours' ? (pricing.hour && pricing.hour[buyTier]) : (pricing.image && pricing.image[buyTier])
    const n = Number(v)
    return isFinite(n) ? n : null
  }
  const buyCredits = useCallback((kind) => { setBuyErr(''); setBuyQty(kind === 'hours' ? '1' : String(imageMin)); setBuyModal({ kind }) }, [imageMin])
  const confirmBuy = async () => {
    if (buying || !buyModal) return
    const kind = buyModal.kind
    const qty = Number(buyQty)
    if (!isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) { setBuyErr(t('workShell.buy.errWhole')); return }
    if (kind === 'images' && qty < imageMin) { setBuyErr(t('workShell.buy.errMin', { min: imageMin })); return }
    setBuying(true); setBuyErr('')
    try {
      const r = await api.workBuyCredits(kind, qty)
      if (r && r.url) { window.location.assign(r.url); return }
      setBuyErr(t('workShell.buy.errCheckout'))
    } catch (e) { setBuyErr((e && e.message) || t('workShell.buy.errCheckout')) } finally { setBuying(false) }
  }

  // Open a session (from a Dashboard resume row or the StartTask hand-off).
  const onOpen = useCallback((id, g) => { showGuard(g); navigate('/work/session/' + id) }, [navigate, showGuard])

  const ctx = useMemo(() => ({
    user, sess, signOut, onOpen, showGuard,
    isAdmin, isCompanyMember, isCompanyAdmin, isExecutive, covered, hasPlan,
    company,
    usage, usageErr, plan, renewLabel, timeLeft, tasksResetLabel, tier, planName, low, canBuyHours, upgradeHref,
    pricing, money, titleCase,
    aiStatus, ready, aiErr, loadAi,
    needsSub, setNeedsSub, gateMsg, setGateMsg,
    billingOn, invoices, showBilling,
    sessions, sessLoaded, sessErr, reload, refreshUsage,
    buddyPref, setBuddyPref,
    showBuy, setShowBuy, buyCredits,
    desk: !!desktop,
  }), [
    user, sess, onOpen, showGuard, isAdmin, isCompanyMember, isCompanyAdmin, isExecutive, covered, hasPlan,
    company, usage, usageErr, plan, renewLabel, timeLeft, tasksResetLabel, tier, planName, low, canBuyHours, upgradeHref,
    pricing, aiStatus, ready, aiErr, loadAi, needsSub, gateMsg, billingOn, invoices, showBilling,
    sessions, sessLoaded, sessErr, reload, refreshUsage, buddyPref, showBuy, buyCredits, desktop,
    signOut, money, titleCase,
  ])

  // ---- Gate screens (moved verbatim from WorkPage) --------------------------
  // Evicted = this window got signed out because the account signed in elsewhere.
  // Two paths deliver it: an in-flight call hits a stale session -> 401 {loggedOut}
  // -> wc:signed-out event -> `evicted` (above); OR the shell's own /api/work/me
  // check returns 200 {signedIn:false, loggedOut:true}. Honor BOTH here so the user
  // always lands on the clear "signed in elsewhere" screen, never a silent bounce
  // to the login page with no explanation (SUPREME RULE VIII: actionable state).
  if (evicted || (sess && sess.loggedOut)) return frame(
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 16, padding: '26px 24px', boxShadow: '0 10px 40px -18px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-600, #0b8259)', marginBottom: 8 }}>{t('workShell.evicted.title')}</div>
        <p style={{ color: 'var(--text-dim, #5c6484)', fontSize: 14, lineHeight: 1.55, margin: '0 0 18px' }}>{t.rich('workShell.evicted.body')}</p>
        <button className="btn btn-primary" onClick={() => { window.location.href = '/workcopilot' }}><LogOut size={15} /> {t('workShell.evicted.cta')}</button>
      </div>
    </div>
  )
  if (sess === undefined) return frame(<div style={{ ...shell, display: 'grid', placeItems: 'center' }}><Loader2 className="spin" /></div>)
  if (!sess.signedIn) { window.location.href = '/workcopilot'; return null }
  if (!sess.access) return frame(<NoAccess onSignOut={signOut} />)

  const langPin = <LanguagePinModal user={user} onPinned={loadMe} />
  const desk = !!desktop
  const stickyTop = desk ? { top: 40 } : undefined
  const railStyle = desk ? { top: 40, height: 'calc(100vh - 40px)' } : undefined
  // One entry per in-shell route; the top bar and the rail item read the SAME
  // `workShell.nav.*` key, so they always name the section identically in every
  // language (the help route is the one deliberate exception: rail "Help", title
  // "How-to", exactly as before).
  const TITLES = { '/work': t('workShell.nav.dashboard'), '/work/start': t('workShell.nav.start'), '/work/tasks': t('workShell.nav.tasks'), '/work/completed': t('workShell.nav.completed'), '/work/logs': t('workShell.nav.logs'), '/work/skills': t('workShell.nav.skills'), '/work/help': t('workShell.nav.howto'), '/work/support': t('workShell.nav.support') }
  const title = TITLES[pathname] || t('workShell.nav.dashboard')
  const wide = /^\/work\/(help|support)$/.test(pathname)
  const initial = String((user && (user.displayName || user.username)) || '').trim().charAt(0) || '?'
  const navClass = ({ isActive }) => `wd-nav${isActive ? ' on' : ''}`

  // The guiding console is a full-screen surface with its own toolbar: render it
  // bare (no rail/top bar), exactly as the old Home->Console switch did.
  if (onSession) {
    return (
      <WorkAppContext.Provider value={ctx}>
        {frame(<><AppUpdateBanner /><GuardNotice note={guardNote} onClose={clearGuard} /><Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 size={22} className="spin" style={{ color: 'var(--brand-500, #0b8259)' }} /></div>}><Outlet /></Suspense>{langPin}</>)}
      </WorkAppContext.Provider>
    )
  }

  return (
    <WorkAppContext.Provider value={ctx}>
    {frame(
    <>
      <AppUpdateBanner />
      <GuardNotice note={guardNote} onClose={clearGuard} />
      {impersonating && (
        <div className="wd-imp" role="status">
          <Eye size={15} />
          <span className="wd-imp-t">{t.rich('workShell.top.viewingAs', { name: user.displayName || user.username })}</span>
          <button type="button" className="wd-imp-stop" onClick={stopImpersonate} disabled={impStopping}>{impStopping ? <Loader2 size={13} className="spin" /> : null} {t('workShell.top.stop')}</button>
        </div>
      )}
      <div className="wd">
        <style>{WD_CSS}</style>

        <aside className={`wd-rail${railOpen ? '' : ' collapsed'}`} style={railStyle}>
          <Link to="/work" className="wd-brand" title="WorkCoPilot by AdmireVeda">
            <span className="mark"><AVMark size={26} id="avrail" glow={false} /></span>
            <span className="bt"><small>AdmireVeda</small><b>WorkCoPilot</b></span>
          </Link>
          <nav className="wd-navs" aria-label={t('workShell.nav.sections')}>
            <NavLink end to="/work" className={navClass} title={t('workShell.nav.dashboard')}><LayoutDashboard size={18} /> <span className="wd-nav-t">{t('workShell.nav.dashboard')}</span></NavLink>
            <NavLink to="/work/start" className={navClass} title={t('workShell.nav.start')}><Play size={18} /> <span className="wd-nav-t">{t('workShell.nav.start')}</span></NavLink>
            <NavLink to="/work/tasks" className={navClass} title={t('workShell.nav.tasksTip')}><Clock size={18} /> <span className="wd-nav-t">{t('workShell.nav.tasks')}</span></NavLink>
            <NavLink to="/work/completed" className={navClass} title={t('workShell.nav.completed')}><Check size={18} /> <span className="wd-nav-t">{t('workShell.nav.completed')}</span></NavLink>
            <NavLink to="/work/logs" className={navClass} title={t('workShell.nav.logs')}><FileText size={18} /> <span className="wd-nav-t">{t('workShell.nav.logs')}</span></NavLink>
            <NavLink to="/work/skills" className={navClass} title={t('workShell.nav.skills')}><Blocks size={18} /> <span className="wd-nav-t">{t('workShell.nav.skills')}</span></NavLink>
            <div className="wd-sect">{t('workShell.nav.help')}</div><span className="wd-sect-rule" aria-hidden />
            <NavLink to="/work/help" className={navClass} title={t('workShell.nav.helpTip')}><BookOpen size={18} /> <span className="wd-nav-t">{t('workShell.nav.help')}</span></NavLink>
            <NavLink to="/work/support" className={navClass} title={t('workShell.nav.support')}><LifeBuoy size={18} /> <span className="wd-nav-t">{t('workShell.nav.support')}</span></NavLink>
            {isCompanyAdmin && (
              <a className="wd-nav" href="/work/company" title={t('workShell.nav.team')}><Users size={18} /> <span className="wd-nav-t">{t('workShell.nav.team')}</span></a>
            )}
          </nav>
          {(isExecutive || isAdmin) && (
            <div className="wd-rail-foot">
              {isExecutive && <a className="wd-nav foot" href="/work/exec" title={t('workShell.nav.exec')}><BarChart3 size={18} /> <span className="wd-nav-t">{t('workShell.nav.exec')}</span></a>}
              {isAdmin && <a className="wd-nav foot" href="/work/admin" title={t('workShell.nav.admin')}><Settings size={18} /> <span className="wd-nav-t">{t('workShell.nav.admin')}</span></a>}
            </div>
          )}
        </aside>

        <div className="wd-main-col">
          <header className="wd-top" style={stickyTop}>
            <button type="button" className="wd-collapse" onClick={() => setRailOpen((v) => !v)} aria-expanded={railOpen} aria-label={railOpen ? t('workShell.top.collapseMenu') : t('workShell.top.expandMenu')} title={railOpen ? t('workShell.top.collapseMenu') : t('workShell.top.expandMenu')}><MenuIcon size={18} /></button>
            <h2>{title}</h2>
            <span className="wd-top-sp" />
            <div className="wd-top-right">
              {usage == null
                ? (usageErr
                    ? <button className="wd-buyhrs wd-retry" onClick={reload} title={t('workShell.top.retryUsage')}><AlertTriangle size={13} /> <span>{t('workShell.top.retry')}</span></button>
                    : <span className="wd-mins skel" aria-hidden />)
                : timeLeft != null && <span className={`wd-mins${low ? ' low' : ''}`} title={t('workShell.top.timeChipTitle', { plan: planName, time: timeLeft })}>{low ? <AlertTriangle size={13} /> : <Clock size={13} />} {timeLeft}<span className="wd-mins-l">{t('workShell.top.left')}</span></span>}
              {plan != null && !needsSub && (
                <PlanPill plan={plan} planName={planName} renewLabel={renewLabel} companyName={(company && company.name) || (user && user.companyName) || ''}
                  canBuy={canBuyHours} canUpgrade={!!(user && user.canUpgrade)} upgradeHref={upgradeHref} onBuyHours={() => buyCredits('hours')} />
              )}
              {canBuyHours && (
                <button className="wd-buyhrs" onClick={() => buyCredits('hours')} disabled={buying} title={t('workShell.top.buyHoursTitle')}><Plus size={13} /> <span className="full">{t('workShell.top.buyHours')}</span><span className="short">{t('workShell.top.buyHoursShort')}</span></button>
              )}
              <button className="wd-addtime" onClick={() => setShowBuy((v) => !v)} aria-expanded={showBuy} title={t('workShell.top.addTime')}><Zap size={15} /> <span>{t('workShell.top.addTime')}</span></button>
              {user && user.canUpgrade && (
                <a className="wd-upgrade" href={upgradeHref} title={user.nextTier ? t('workShell.top.upgradeTitle', { tier: titleCase(user.nextTier) }) : t('workShell.top.upgradeTitleGeneric')}><Sparkles size={14} /> <span>{t('workShell.top.upgrade')}</span></a>
              )}
              {!desk && (
                <a className="wd-getapp" href="/api/work/desktop-setup.exe" title={t('workShell.top.windowsAppTitle')} aria-label={t('workShell.top.windowsAppTitle')}><Monitor size={16} /> <span>{t('workShell.top.windowsApp')}</span></a>
              )}
              <button className="wd-signout" onClick={signOut} title={t('workShell.top.signOut')}><LogOut size={15} /> <span>{t('workShell.top.signOut')}</span></button>
              <span className="wd-avatar" title={(user && (user.displayName || user.username)) || ''} aria-hidden>{initial}</span>
            </div>
          </header>

          <main className={`wd-main${wide ? ' wide' : ''}`}>
            <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', padding: '48px 0', minHeight: 160 }}><Loader2 size={20} className="spin" style={{ color: 'var(--brand-500, #0b8259)' }} /></div>}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {buyModal && (() => {
        const kind = buyModal.kind
        const unit = buyUnit(kind)
        const qtyN = Number(buyQty)
        const validQty = isFinite(qtyN) && qtyN > 0 && Number.isInteger(qtyN)
        const total = (unit != null && validQty) ? unit * qtyN : null
        return (
          <div className="wd-modal-ov" onClick={() => !buying && setBuyModal(null)}>
            <div className="wd-modal" role="dialog" aria-modal="true" aria-labelledby="wd-buy-title" onClick={(e) => e.stopPropagation()}>
              <h3 id="wd-buy-title" style={{ color: 'inherit' }}><Zap size={17} style={{ color: 'var(--em)' }} /> {kind === 'hours' ? t('workShell.buy.titleHours') : t('workShell.buy.titleImages')}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--mut)', margin: '0 0 14px', lineHeight: 1.5 }}>
                {kind === 'hours' ? t('workShell.buy.bodyHours', { plan: titleCase(buyTier) }) : t('workShell.buy.bodyImages', { plan: titleCase(buyTier), min: imageMin })}
              </p>
              <label htmlFor="wd-buyqty">{kind === 'hours' ? t('workShell.buy.qtyHours') : t('workShell.buy.qtyImages')} <span className="req">{t('workShell.buy.required')}</span></label>
              <input id="wd-buyqty" type="number" min={kind === 'images' ? imageMin : 1} step="1" value={buyQty}
                onChange={(e) => { setBuyErr(''); setBuyQty(e.target.value.replace(/[^0-9]/g, '')) }}
                autoFocus
                style={{ width: '100%', background: 'var(--field)', border: '1px solid var(--line)', borderRadius: 11, padding: '11px', color: 'var(--tx)', font: 'inherit', fontSize: 14, outline: 'none' }} />
              <div className="wd-modal-note" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span>{t('workShell.buy.unit')}: <b>{unit != null ? money(unit) : '-'}</b> {kind === 'hours' ? t('workShell.buy.perHour') : t('workShell.buy.perImage')}</span>
                <span>{t('workShell.buy.total')}: <b>{total != null ? money(total) : '-'}</b></span>
              </div>
              {buyErr && <div className="wd-note warn" role="alert" style={{ marginTop: 12 }}><AlertTriangle size={15} /> <span>{buyErr}</span></div>}
              <div className="wd-modal-btns">
                <button className="btn btn-ghost" onClick={() => setBuyModal(null)} disabled={buying}>{t('workShell.buy.cancel')}</button>
                <button className="btn btn-primary" onClick={confirmBuy} disabled={buying || !validQty}>{buying ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} {t('workShell.buy.continue')}</button>
              </div>
            </div>
          </div>
        )
      })()}
      {langPin}
    </>
    )}
    </WorkAppContext.Provider>
  )
}
