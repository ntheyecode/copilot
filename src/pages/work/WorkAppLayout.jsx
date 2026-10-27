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
import { Loader2, Check, X, Plus, LogOut, Trash2, Monitor, Eye, Menu as MenuIcon, Zap, LayoutDashboard, BookOpen, ChevronRight, Sparkles, Clock, ArrowRight, LifeBuoy, Users, FileText, CreditCard, RefreshCw, Download, AlertTriangle, Play, Blocks, BarChart3, Settings } from 'lucide-react'
import { api } from '../../api.js'
import WorkShell from '../../workShell.jsx'
import LanguagePinModal from '../../components/LanguagePinModal.jsx'
import { AVMark } from '../../components/AdmireVedaLogo.jsx'
import { readBuddyPref } from '../../components/AliveBuddy.jsx'
import { WD_CSS } from './workApp.css.js'
import { card, shell } from './lib.js'
import { WorkAppContext } from './WorkAppContext.jsx'

// ---- Android self-update banner (moved verbatim from WorkPage) --------------
function AppUpdateBanner() {
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
      <div style={{ flex: 1 }}>A new version of WorkCoPilot{upd.versionName ? ` (${upd.versionName})` : ''} is ready.</div>
      <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--brand-700, #1a1a2e)' }} onClick={() => { window.location.href = '/work-updates/WorkCoPilot.apk' }}>Update</button>
    </div>
  )
}

function NoAccess({ onSignOut }) {
  return (
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ ...card, maxWidth: 420, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-600)', marginBottom: 8 }}>WorkCoPilot</div>
        <div style={{ color: 'var(--text-dim)' }}>Your account does not have WorkCoPilot access. Ask your administrator to enable it.</div>
        <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={onSignOut}><LogOut size={15} /> Sign out</button>
      </div>
    </div>
  )
}
// Non-blocking cautionary notice for the AI input guardrail (warn-and-proceed).
// Lives at the shell level so it survives navigation between pages. Auto-
// dismisses after ~8s; the user can also close it.
function GuardNotice({ note, onClose }) {
  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [note, onClose])
  if (!note) return null
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: 'min(560px, calc(100vw - 24px))', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--warning-soft, #fff7e0)', color: 'var(--text, #1a1a2e)', borderLeft: '3px solid var(--warning, #d98a00)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, lineHeight: 1.45, boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--warning, #d98a00)' }} />
      <span style={{ flex: 1 }}>{note.warning}</span>
      <button type="button" aria-label="Dismiss notice" onClick={onClose} style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={15} /></button>
    </div>
  )
}

export default function WorkAppLayout() {
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

  const signOut = async () => { try { await api.logout() } catch {} ; window.location.href = '/workcopilot' }

  // Desktop app: drive the window mode. Planning is a large windowed "plan"
  // mode; an open guiding session is the compact floating "guide" mode.
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  useEffect(() => {
    if (!desktop || !sess || !sess.signedIn || !sess.access) return
    try { desktop.setMode(onSession ? 'guide' : 'plan') } catch { /* ignore */ }
  }, [desktop, onSession, sess])

  // Mount the dashboard fonts once (shared by every signed-in page).
  useEffect(() => {
    const id = 'wd-fonts'
    if (!document.getElementById(id)) {
      const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap'
      document.head.appendChild(l)
    }
  }, [])

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
  const [planPop, setPlanPop] = useState(false)
  const [trading, setTrading] = useState(false)
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

  // ---- Derived plan-pill + billing values (verbatim from Home) --------------
  const minsLeft = usage ? Math.ceil((usage.remainingSeconds || 0) / 60) : null
  const taskCredits = (usage && usage.tasks && Number(usage.tasks.taskCredits)) || 0
  const tasksObj = (usage && usage.tasks) || null
  const tasksUnlimited = !!(tasksObj && tasksObj.unlimited)
  const tasksRemaining = tasksObj ? tasksObj.remaining : null
  const tasksCap = tasksObj ? tasksObj.cap : null
  const tasksResetLabel = (tasksObj && tasksObj.resetLabel) || '11:59 PM ET'
  const tasksFace = tasksUnlimited ? '∞' : (tasksObj ? `${tasksRemaining}/${tasksCap}` : '-')
  const canTrade = taskCredits >= 2 && !isCompanyMember
  const resetLabel = (usage && usage.resetLabel) || '11:59 PM ET'
  const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
  const planName = cap((user && user.subscription && user.subscription.plan) || (usage && usage.tier) || '') || 'Active'
  const low = !!usage && (usage.exhausted || (usage.remainingSeconds != null && usage.remainingSeconds <= 900))
  const tier = (usage && usage.tier) || 'basic'
  const titleCase = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '')
  const money = (n) => (n == null ? '' : `$${Number(n) % 1 ? Number(n).toFixed(2) : Number(n)}`)
  const showBilling = hasPlan || (Array.isArray(invoices) && invoices.length > 0)

  const tradeCredits = async () => {
    if (trading || !canTrade) return
    setTrading(true)
    setUsage((u) => (u && u.tasks) ? { ...u, tasks: { ...u.tasks, taskCredits: Math.max(0, (Number(u.tasks.taskCredits) || 0) - 2) } } : u)
    try {
      await fetch('/api/work/credits/trade', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && window.refigold ? { 'X-Refigold-App': '1' } : {}) }, body: JSON.stringify({ hours: 1 }) })
    } catch { /* the refetch below corrects the optimistic change */ }
    try { const u = await api.workUsage(); setUsage(u) } catch { /* ignore */ }
    setTrading(false)
  }
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
  const buyCredits = (kind) => { setBuyErr(''); setBuyQty(kind === 'hours' ? '1' : String(imageMin)); setBuyModal({ kind }) }
  const confirmBuy = async () => {
    if (buying || !buyModal) return
    const kind = buyModal.kind
    const qty = Number(buyQty)
    if (!isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) { setBuyErr('Enter a whole number greater than zero.'); return }
    if (kind === 'images' && qty < imageMin) { setBuyErr(`The smallest image bundle is ${imageMin}.`); return }
    setBuying(true); setBuyErr('')
    try {
      const r = await api.workBuyCredits(kind, qty)
      if (r && r.url) { window.location.assign(r.url); return }
      setBuyErr('Could not start checkout. Please try again.')
    } catch (e) { setBuyErr((e && e.message) || 'Could not start checkout. Please try again.') } finally { setBuying(false) }
  }

  // Open a session (from a Dashboard resume row or the StartTask hand-off).
  const onOpen = useCallback((id, g) => { showGuard(g); navigate('/work/session/' + id) }, [navigate, showGuard])

  const ctx = useMemo(() => ({
    user, sess, signOut, onOpen, showGuard,
    isAdmin, isCompanyMember, isCompanyAdmin, isExecutive, covered, hasPlan,
    company,
    usage, usageErr, minsLeft, resetLabel, tier, planName, low, taskCredits,
    tasksObj, tasksUnlimited, tasksRemaining, tasksCap, tasksResetLabel, tasksFace, canTrade, tradeCredits, trading,
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
    company, usage, usageErr, minsLeft, resetLabel, tier, planName, low, taskCredits,
    tasksObj, tasksUnlimited, tasksRemaining, tasksCap, tasksResetLabel, tasksFace, canTrade, trading,
    pricing, aiStatus, ready, aiErr, loadAi, needsSub, gateMsg, billingOn, invoices, showBilling,
    sessions, sessLoaded, sessErr, reload, refreshUsage, buddyPref, showBuy, buyCredits, desktop,
  ])

  // ---- Gate screens (moved verbatim from WorkPage) --------------------------
  if (evicted) return frame(
    <div style={{ ...shell, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center', background: 'var(--surface, #fff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: 16, padding: '26px 24px', boxShadow: '0 10px 40px -18px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand-600, #0b8259)', marginBottom: 8 }}>Signed out</div>
        <p style={{ color: 'var(--text-dim, #5c6484)', fontSize: 14, lineHeight: 1.55, margin: '0 0 18px' }}>Your account was just signed in from another location. For your security, WorkCoPilot keeps <b>one active session at a time</b>, so this session was signed out.</p>
        <button className="btn btn-primary" onClick={() => { window.location.href = '/workcopilot' }}><LogOut size={15} /> Sign in again</button>
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
  const TITLES = { '/work': 'Dashboard', '/work/start': 'Start a task', '/work/skills': 'Skills', '/work/help': 'How-to', '/work/support': 'Support' }
  const title = TITLES[pathname] || 'Dashboard'
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
          <span className="wd-imp-t">You're viewing as <b>{user.displayName || user.username}</b> (admin support)</span>
          <button type="button" className="wd-imp-stop" onClick={stopImpersonate} disabled={impStopping}>{impStopping ? <Loader2 size={13} className="spin" /> : null} Stop</button>
        </div>
      )}
      <div className="wd">
        <style>{WD_CSS}</style>

        <aside className={`wd-rail${railOpen ? '' : ' collapsed'}`} style={railStyle}>
          <Link to="/work" className="wd-brand" title="WorkCoPilot by AdmireVeda">
            <span className="mark"><AVMark size={26} id="avrail" glow={false} /></span>
            <span className="bt"><small>AdmireVeda</small><b>WorkCoPilot</b></span>
          </Link>
          <nav className="wd-navs" aria-label="Sections">
            <NavLink end to="/work" className={navClass} title="Dashboard"><LayoutDashboard size={18} /> <span className="wd-nav-t">Dashboard</span></NavLink>
            <NavLink to="/work/start" className={navClass} title="Start a task"><Play size={18} /> <span className="wd-nav-t">Start a task</span></NavLink>
            <NavLink to="/work/tasks" className={navClass} title="My tasks (in progress or paused)"><Clock size={18} /> <span className="wd-nav-t">My tasks</span></NavLink>
            <NavLink to="/work/completed" className={navClass} title="Completed tasks"><Check size={18} /> <span className="wd-nav-t">Completed tasks</span></NavLink>
            <NavLink to="/work/logs" className={navClass} title="Session logs"><FileText size={18} /> <span className="wd-nav-t">Session logs</span></NavLink>
            <NavLink to="/work/skills" className={navClass} title="Skills"><Blocks size={18} /> <span className="wd-nav-t">Skills</span></NavLink>
            <div className="wd-sect">Help</div><span className="wd-sect-rule" aria-hidden />
            <NavLink to="/work/help" className={navClass} title="Help &amp; how-to"><BookOpen size={18} /> <span className="wd-nav-t">Help</span></NavLink>
            <NavLink to="/work/support" className={navClass} title="Support"><LifeBuoy size={18} /> <span className="wd-nav-t">Support</span></NavLink>
            {isCompanyAdmin && (
              <a className="wd-nav" href="/work/company" title="Team"><Users size={18} /> <span className="wd-nav-t">Team</span></a>
            )}
          </nav>
          {(isExecutive || isAdmin) && (
            <div className="wd-rail-foot">
              {isExecutive && <a className="wd-nav foot" href="/work/exec" title="Executive dashboard"><BarChart3 size={18} /> <span className="wd-nav-t">Executive dashboard</span></a>}
              {isAdmin && <a className="wd-nav foot" href="/work/admin" title="Admin console"><Settings size={18} /> <span className="wd-nav-t">Admin console</span></a>}
            </div>
          )}
        </aside>

        <div className="wd-main-col">
          <header className="wd-top" style={stickyTop}>
            <button type="button" className="wd-collapse" onClick={() => setRailOpen((v) => !v)} aria-expanded={railOpen} aria-label={railOpen ? 'Collapse menu' : 'Expand menu'} title={railOpen ? 'Collapse menu' : 'Expand menu'}><MenuIcon size={18} /></button>
            <h2>{title}</h2>
            <span className="wd-top-sp" />
            <div className="wd-top-right">
              {usage == null
                ? (usageErr
                    ? <button className="wd-buyhrs wd-retry" onClick={reload} title="Could not load your remaining time. Click to retry."><AlertTriangle size={13} /> <span>Retry</span></button>
                    : <span className="wd-mins skel" aria-hidden />)
                : minsLeft != null && <span className={`wd-mins${low ? ' low' : ''}`} title={`${usage.tier} plan`}>{low ? <AlertTriangle size={13} /> : <Clock size={13} />} {minsLeft} min<span className="wd-mins-l">left</span></span>}
              {usage != null && !needsSub && (
                <div className="wd-planpill-wrap">
                  <button type="button" className={`wd-planpill${planPop ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={planPop}
                    onClick={() => setPlanPop((v) => !v)}
                    title={`${planName} plan (Active)`}
                    aria-label={`Your plan: ${planName}, active. ${minsLeft != null ? minsLeft : 'unknown'} minutes left today. ${tasksUnlimited ? 'Unlimited tasks' : `${tasksRemaining} of ${tasksCap} tasks`} left today. ${taskCredits} banked credit${taskCredits === 1 ? '' : 's'}. Open plan details.`}>
                    <span className="wd-pp-s" title="Minutes left today"><Clock size={13} /> <b>{minsLeft != null ? minsLeft : '-'}</b></span>
                    <span className="wd-pp-sep" aria-hidden />
                    <span className="wd-pp-s" title="Tasks left today"><Check size={13} /> <b>{tasksFace}</b></span>
                    <span className="wd-pp-sep" aria-hidden />
                    <span className="wd-pp-s" title="Banked credits"><CreditCard size={13} /> <b>{taskCredits}</b></span>
                    <ChevronRight className="wd-pp-ca" size={13} aria-hidden />
                  </button>
                  {planPop && (
                    <>
                      <button type="button" className="wd-planpop-back" aria-label="Close plan details" onClick={() => setPlanPop(false)} />
                      <div className="wd-planpop" role="dialog" aria-label="Your plan">
                        <div className="wd-planpop-head">
                          <span className="wd-planpop-name" title={`${planName} plan`}>{planName} plan</span>
                          <span className="wd-planpop-tag"><span className="wd-plan-dot" aria-hidden /> Active</span>
                        </div>
                        <div className="wd-planpop-stat">
                          <div className="r"><span className="k"><Clock size={13} /> Minutes left today</span><span className="v">{minsLeft != null ? <>{minsLeft} <small>min</small></> : '-'}</span></div>
                          <div className="h">Daily &middot; resets at {resetLabel}</div>
                        </div>
                        <div className="wd-planpop-stat">
                          <div className="r"><span className="k"><Check size={13} /> Tasks left today</span><span className="v">{tasksUnlimited ? 'Unlimited' : <>{tasksRemaining} <small>/ {tasksCap}</small></>}</span></div>
                          <div className="h">Daily &middot; resets at {tasksResetLabel}</div>
                        </div>
                        <div className="wd-planpop-stat">
                          <div className="r"><span className="k"><CreditCard size={13} /> Banked credits</span><span className="v">{taskCredits}</span></div>
                          <div className="h">Unused tasks you kept &middot; these never expire</div>
                        </div>
                        {canTrade && (
                          <button type="button" className="wd-trade-btn wd-planpop-trade" onClick={() => { tradeCredits() }} disabled={trading}>{trading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Trade 2 tasks to 1 hour</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {user && !user.companyId && !isAdmin && usage != null && (
                <button className="wd-buyhrs" onClick={() => buyCredits('hours')} disabled={buying} title="Buy extra hours (one-time)"><Plus size={13} /> <span><span className="wd-mins-l">Buy </span>hours</span></button>
              )}
              <button className="wd-addtime" onClick={() => setShowBuy((v) => !v)} aria-expanded={showBuy} title="Add time"><Zap size={15} /> <span>Add time</span></button>
              {user && user.canUpgrade && (
                <a className="wd-upgrade" href="/workcopilot/pricing" title={`Upgrade${user.nextTier ? ' to ' + user.nextTier.charAt(0).toUpperCase() + user.nextTier.slice(1) : ''} for more hours, tasks${user.caps && !user.caps.roadmaps ? ', roadmaps' : ''} and more`}><Sparkles size={14} /> <span>Upgrade</span></a>
              )}
              {!desk && (
                <a className="wd-getapp" href="/api/work/desktop-setup.exe" title="Download the Windows app" aria-label="Download the Windows app"><Monitor size={16} /> <span>Windows app</span></a>
              )}
              <button className="wd-signout" onClick={signOut} title="Sign out"><LogOut size={15} /> <span>Sign out</span></button>
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
        const noun = kind === 'hours' ? 'extra hour' : 'image credit'
        return (
          <div className="wd-modal-ov" onClick={() => !buying && setBuyModal(null)}>
            <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: 'inherit' }}><Zap size={17} style={{ color: 'var(--em)' }} /> Buy {kind === 'hours' ? 'extra hours' : 'image credits'}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--mut)', margin: '0 0 14px', lineHeight: 1.5 }}>
                One-time purchase, priced for your {titleCase(buyTier)} plan. {kind === 'hours' ? 'Purchased hours never expire and stack on top of your daily allowance.' : `Purchased image credits never expire. Smallest bundle: ${imageMin}.`}
              </p>
              <label htmlFor="wd-buyqty">How many {noun}{qtyN === 1 ? '' : 's'}? <span className="req">required</span></label>
              <input id="wd-buyqty" type="number" min={kind === 'images' ? imageMin : 1} step="1" value={buyQty}
                onChange={(e) => { setBuyErr(''); setBuyQty(e.target.value.replace(/[^0-9]/g, '')) }}
                autoFocus
                style={{ width: '100%', background: 'var(--field)', border: '1px solid var(--line)', borderRadius: 11, padding: '11px', color: 'var(--tx)', font: 'inherit', fontSize: 14, outline: 'none' }} />
              <div className="wd-modal-note" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>Unit price: <b>{unit != null ? money(unit) : '-'}</b>{kind === 'hours' ? ' / hour' : ' / image'}</span>
                <span>Total: <b>{total != null ? money(total) : '-'}</b></span>
              </div>
              {buyErr && <div className="wd-note warn" role="alert" style={{ marginTop: 12 }}><AlertTriangle size={15} /> <span>{buyErr}</span></div>}
              <div className="wd-modal-btns">
                <button className="btn btn-ghost" onClick={() => setBuyModal(null)} disabled={buying}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmBuy} disabled={buying || !validQty}>{buying ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />} Continue to checkout</button>
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
