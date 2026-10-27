// WorkCoPilot admin console - self-contained shell.
//
// Fully decoupled from the generic Refigoldmine admin: it imports nothing from
// the shared app (only react + lucide-react + its own namespace), carries its
// own styles, and talks only to /api/work/admin/* (plus the existing work
// pricing/tier/grant/platform-ai endpoints) through its own fetch client. The
// whole src/pages/workadmin tree can be lifted out as a standalone product.
//
// Routing is by local state (no react-router inside). The owner wires this
// component at a /work/admin route in App.jsx.
import React, { useEffect, useState, useCallback } from 'react'
import { LayoutDashboard, Users, Tags, Cpu, ListChecks, ShieldAlert, ShieldCheck, Loader2, LifeBuoy, Building2, CreditCard, UserPlus, LogOut, Megaphone, Mail, MailCheck, DollarSign, Share2, Wallet, UserMinus, Palette, BookOpen, Bell } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import SupportTickets from '../../components/SupportTickets.jsx'
import AccentPicker from '../../components/AccentPicker.jsx'
import Companies from './sections/Companies.jsx'
import Governance from './sections/Governance.jsx'
import { WORKADMIN_CSS, ensureWorkAdminFonts } from './workadmin.css.js'
import { workAdminApi } from './workAdminApi.js'
import Overview from './sections/Overview.jsx'
import UsersSection from './sections/Users.jsx'
import Pricing from './sections/Pricing.jsx'
import AiConfig from './sections/AiConfig.jsx'
import Billing from './sections/Billing.jsx'
import Sessions from './sections/Sessions.jsx'
import Leads from './sections/Leads.jsx'
import Incidents from './sections/Incidents.jsx'
import Affiliates from './sections/Affiliates.jsx'
import Claims from './sections/Claims.jsx'
import Hero from './sections/Hero.jsx'
import Email from './sections/Email.jsx'
import EmailTemplates from './sections/EmailTemplates.jsx'
import Finance from './sections/Finance.jsx'
import Subscribers from './sections/Subscribers.jsx'
import Cancelled from './sections/Cancelled.jsx'
import Notifications from './sections/Notifications.jsx'
import HelpSuper from './sections/HelpSuper.jsx'

// label/title/sub are i18n keys; the nav and shell resolve them with t().
const SECTIONS = [
  { id: 'overview', label: 'superAdmin.nav.overview', icon: LayoutDashboard, title: 'superAdmin.sections.overview.title', sub: 'superAdmin.sections.overview.sub' },
  { id: 'companies', label: 'superAdmin.nav.companies', icon: Building2, title: 'superAdmin.sections.companies.title', sub: 'superAdmin.sections.companies.sub' },
  { id: 'notifications', label: 'superAdmin.nav.notifications', icon: Bell, title: 'superAdmin.sections.notifications.title', sub: 'superAdmin.sections.notifications.sub' },
  { id: 'governance', label: 'superAdmin.nav.governance', icon: ShieldCheck, title: 'superAdmin.sections.governance.title', sub: 'superAdmin.sections.governance.sub' },
  { id: 'users', label: 'superAdmin.nav.users', icon: Users, title: 'superAdmin.sections.users.title', sub: 'superAdmin.sections.users.sub' },
  { id: 'pricing', label: 'superAdmin.nav.pricing', icon: Tags, title: 'superAdmin.sections.pricing.title', sub: 'superAdmin.sections.pricing.sub' },
  { id: 'billing', label: 'superAdmin.nav.billing', icon: CreditCard, title: 'superAdmin.sections.billing.title', sub: 'superAdmin.sections.billing.sub' },
  { id: 'finance', label: 'superAdmin.nav.finance', icon: DollarSign, title: 'superAdmin.sections.finance.title', sub: 'superAdmin.sections.finance.sub' },
  { id: 'subscribers', label: 'superAdmin.nav.subscribers', icon: Wallet, title: 'superAdmin.sections.subscribers.title', sub: 'superAdmin.sections.subscribers.sub' },
  { id: 'cancelled', label: 'superAdmin.nav.cancelled', icon: UserMinus, title: 'superAdmin.sections.cancelled.title', sub: 'superAdmin.sections.cancelled.sub' },
  { id: 'email', label: 'superAdmin.nav.email', icon: Mail, title: 'superAdmin.sections.email.title', sub: 'superAdmin.sections.email.sub' },
  { id: 'email-templates', label: 'superAdmin.nav.email-templates', icon: MailCheck, title: 'superAdmin.sections.email-templates.title', sub: 'superAdmin.sections.email-templates.sub' },
  { id: 'ai', label: 'superAdmin.nav.ai', icon: Cpu, title: 'superAdmin.sections.ai.title', sub: 'superAdmin.sections.ai.sub' },
  { id: 'sessions', label: 'superAdmin.nav.sessions', icon: ListChecks, title: 'superAdmin.sections.sessions.title', sub: 'superAdmin.sections.sessions.sub' },
  { id: 'leads', label: 'superAdmin.nav.leads', icon: UserPlus, title: 'superAdmin.sections.leads.title', sub: 'superAdmin.sections.leads.sub' },
  { id: 'hero', label: 'superAdmin.nav.hero', icon: Megaphone, title: 'superAdmin.sections.hero.title', sub: 'superAdmin.sections.hero.sub' },
  { id: 'tickets', label: 'superAdmin.nav.tickets', icon: LifeBuoy, title: 'superAdmin.sections.tickets.title', sub: 'superAdmin.sections.tickets.sub' },
  { id: 'help', label: 'superAdmin.nav.help', icon: BookOpen, title: 'superAdmin.sections.help.title', sub: 'superAdmin.sections.help.sub' },
  { id: 'incidents', label: 'superAdmin.nav.incidents', icon: ShieldAlert, title: 'superAdmin.sections.incidents.title', sub: 'superAdmin.sections.incidents.sub' },
  { id: 'affiliates', label: 'superAdmin.nav.affiliates', icon: Share2, title: 'superAdmin.sections.affiliates.title', sub: 'superAdmin.sections.affiliates.sub' },
  { id: 'claims', label: 'superAdmin.nav.claims', icon: ShieldCheck, title: 'superAdmin.sections.claims.title', sub: 'superAdmin.sections.claims.sub' },
  { id: 'appearance', label: 'superAdmin.nav.appearance', icon: Palette, title: 'superAdmin.sections.appearance.title', sub: 'superAdmin.sections.appearance.sub' },
]

// Per-user accent (every admin role sees this - it is a personal preference, not
// a platform setting). The picker applies live and persists through the shared
// profile endpoint; this console only hosts it.
function AppearanceSection() {
  const t = useT()
  return (
    <div className="wka-panel">
      <h2>{t('superAdmin.appearancePanel.title')}</h2>
      <p className="desc">{t.rich('superAdmin.appearancePanel.desc')}</p>
      <AccentPicker variant="wka" />
    </div>
  )
}

export default function WorkAdmin() {
  const t = useT()
  const [active, setActive] = useState('overview')
  // gate: 'loading' | 'ready' | 'denied' | 'error'
  const [gate, setGate] = useState('loading')
  const [viewer, setViewer] = useState(null)
  const [gateError, setGateError] = useState(null)
  // At-a-glance alert on the Incidents nav item: last-24h count, red if anything
  // actually FAILED (exhausted / provider error / system), amber if the window
  // holds only auto-recoveries (failovers) that are worth watching pile up.
  const [incidentAlert, setIncidentAlert] = useState({ count: 0, severe: false })

  const checkAccess = useCallback(async () => {
    setGate('loading'); setGateError(null)
    try {
      const data = await workAdminApi.overview()
      setViewer(data.viewer || null)
      setGate('ready')
    } catch (error) {
      if (error.status === 401 || error.status === 403) setGate('denied')
      else { setGateError(error); setGate('error') }
    }
  }, [])

  useEffect(() => { checkAccess() }, [checkAccess])
  // Brand faces (Bricolage Grotesque / Figtree) - the console is self-contained,
  // so it loads them itself rather than depending on global app CSS.
  useEffect(() => { ensureWorkAdminFonts() }, [])

  // Poll a light incident summary while the console is open (also refreshes when
  // the operator opens the Incidents tab). Failures never break the console.
  const loadIncidentAlert = useCallback(async () => {
    try {
      const data = await workAdminApi.incidents(300)
      const since = Date.now() - 24 * 60 * 60 * 1000
      const recent = (data.incidents || []).filter((i) => new Date(i.at).getTime() >= since)
      const severe = recent.some((i) => i.kind !== 'ai_failover')
      setIncidentAlert({ count: recent.length, severe })
    } catch { /* leave the last known count */ }
  }, [])

  useEffect(() => {
    if (gate !== 'ready' || !(viewer && viewer.isSuperAdmin)) return
    loadIncidentAlert()
    const t = setInterval(loadIncidentAlert, 60000)
    return () => clearInterval(t)
  }, [gate, viewer, loadIncidentAlert, active])

  // Sign out of the console. Uses the WorkCoPilot route (NOT /api/logout, which
  // nginx routes to the sibling app), then lands on the sign-in page.
  const signOut = async () => { try { await workAdminApi.logout() } catch { /* ignore */ } window.location.href = '/workcopilot' }

  const isSuperAdmin = !!(viewer && viewer.isSuperAdmin)
  const isAccounting = !!(viewer && viewer.role === 'accounting' && !viewer.isSuperAdmin)
  const isAffiliateAdmin = !!(viewer && viewer.role === 'affiliate_admin' && !viewer.isSuperAdmin)
  // The accounting role sees the full finance picture - the Finance dashboard,
  // Subscribers and Cancelled (owner 2026-10-25); an affiliate admin sees only
  // Affiliates; a superadmin sees everything.
  // Business rule (owner 2026-10-23): AI model names and AI cost are superadmin
  // ONLY. So a plain `admin` does NOT see AI config, Finance, Incidents (which
  // surface provider/model + estimated cost) or Claims (internal file paths +
  // honesty status). The server enforces these too; this hides them in the UI.
  // Hidden from a plain `admin` (the explicit superadmin / accounting / affiliate-
  // admin branches below are unaffected). Affiliates is managed by superadmin or a
  // dedicated affiliate_admin only - a plain admin would just hit a 403.
  const SUPERADMIN_ONLY = new Set(['ai', 'finance', 'subscribers', 'cancelled', 'incidents', 'claims', 'affiliates', 'notifications'])
  // Single source for the accounting role's allowed sections (used both to build
  // the nav and, via the generic fallback effect below, to land the role on its
  // first visible tab rather than force-pinning one tab).
  const ACCOUNTING_SECTIONS = new Set(['finance', 'subscribers', 'cancelled', 'appearance'])
  const visibleSections = isSuperAdmin ? SECTIONS
    : isAccounting ? SECTIONS.filter((s) => ACCOUNTING_SECTIONS.has(s.id))
      : isAffiliateAdmin ? SECTIONS.filter((s) => s.id === 'affiliates' || s.id === 'appearance')
        : SECTIONS.filter((s) => !SUPERADMIN_ONLY.has(s.id))
  useEffect(() => { if (isAffiliateAdmin && active !== 'affiliates') setActive('affiliates') }, [isAffiliateAdmin, active])
  // Never leave the view pointed at a section this viewer cannot see (e.g. a
  // plain admin whose stored tab is now gated) - fall back to the first visible.
  useEffect(() => {
    if (gate !== 'ready') return
    if (!visibleSections.some((s) => s.id === active)) setActive((visibleSections[0] || SECTIONS[0]).id)
  }, [gate, visibleSections, active])
  const current = visibleSections.find((s) => s.id === active) || visibleSections[0] || SECTIONS[0]

  const renderSection = () => {
    switch (active) {
      case 'companies': return <Companies isSuperAdmin={isSuperAdmin} />
      case 'notifications': return <Notifications />
      case 'governance': return <Governance isSuperAdmin={isSuperAdmin} />
      case 'users': return <UsersSection isSuperAdmin={isSuperAdmin} viewer={viewer} />
      case 'pricing': return <Pricing isSuperAdmin={isSuperAdmin} />
      case 'billing': return <Billing isSuperAdmin={isSuperAdmin} />
      case 'email': return <Email isSuperAdmin={isSuperAdmin} />
      case 'email-templates': return <EmailTemplates isSuperAdmin={isSuperAdmin} />
      case 'finance': return <Finance isSuperAdmin={isSuperAdmin} />
      case 'subscribers': return <Subscribers isSuperAdmin={isSuperAdmin} />
      case 'cancelled': return <Cancelled isSuperAdmin={isSuperAdmin} />
      case 'ai': return <AiConfig isSuperAdmin={isSuperAdmin} />
      case 'sessions': return <Sessions isSuperAdmin={isSuperAdmin} />
      case 'leads': return <Leads />
      case 'hero': return <Hero isSuperAdmin={isSuperAdmin} />
      case 'tickets': return <SupportTickets mode="admin" />
      case 'help': return <HelpSuper isSuperAdmin={isSuperAdmin} onOpen={setActive} />
      case 'incidents': return <Incidents />
      case 'affiliates': return <Affiliates isSuperAdmin={isSuperAdmin} />
      case 'claims': return <Claims />
      case 'appearance': return <AppearanceSection />
      case 'overview':
      default: return <Overview />
    }
  }

  if (gate === 'loading') {
    return (
      <div className="wka wka-super">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <Loader2 size={26} style={{ animation: 'wka-spin 0.8s linear infinite', color: 'var(--wka-accent)', marginBottom: 12 }} />
          <h2>{t('superAdmin.gate.checkingTitle')}</h2>
          <p>{t('superAdmin.gate.checkingBody')}</p>
        </div></div>
      </div>
    )
  }

  if (gate === 'denied') {
    return (
      <div className="wka wka-super">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <ShieldAlert size={30} />
          <h2>{t('superAdmin.gate.deniedTitle')}</h2>
          <p>{t('superAdmin.gate.deniedBody')}</p>
        </div></div>
      </div>
    )
  }

  if (gate === 'error') {
    return (
      <div className="wka wka-super">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <ShieldAlert size={30} style={{ color: 'var(--wka-red)' }} />
          <h2>{t('superAdmin.gate.errorTitle')}</h2>
          <p>{(gateError && gateError.message) || t('superAdmin.gate.errorBody')}</p>
          <button type="button" className="wka-btn primary" style={{ marginTop: 16 }} onClick={checkAccess}>{t('superAdmin.gate.retry')}</button>
        </div></div>
      </div>
    )
  }

  return (
    <div className="wka wka-super">
      <style>{WORKADMIN_CSS}{WA_CSS}</style>

      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand">
          <b>WorkCoPilot</b>
          <span>{t('superAdmin.brandSub')}</span>
        </div>
        <div className="wka-top-right">
          {viewer ? <span className="wka-chip">{viewer.username}</span> : null}
          <span className={`wka-chip ${isSuperAdmin ? 'ok' : ''}`}>{isSuperAdmin ? t('superAdmin.roleSuper') : t('superAdmin.roleAdmin')}</span>
          <button type="button" className="wka-btn sm ghost" onClick={signOut} title={t('superAdmin.signOut')}><LogOut size={14} /> {t('superAdmin.signOut')}</button>
        </div>
      </header>

      <div className="wka-body">
        <nav className="wka-nav">
          {visibleSections.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.id} className={`wka-nav-item${active === s.id ? ' active' : ''}`}
                onClick={() => setActive(s.id)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s.id) } }}>
                <Icon size={17} />
                <span className="label">{t(s.label)}</span>
                {s.id === 'incidents' && incidentAlert.count > 0 ? (
                  <span className={`wa-badge${incidentAlert.severe ? ' severe' : ''}`}
                    title={t.n('superAdmin.badge.incidents', incidentAlert.count)}
                    aria-label={t.n('superAdmin.badge.incidents', incidentAlert.count)}>
                    {incidentAlert.count > 99 ? '99+' : incidentAlert.count}
                  </span>
                ) : null}
              </div>
            )
          })}
          <div className="wka-nav-foot">{t('superAdmin.navFoot')}</div>
        </nav>

        <main className="wka-main">
          <h1 className="wka-h1">{t(current.title)}</h1>
          <p className="wka-sub">{t(current.sub)}</p>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}

// Superadmin-specific additions on top of the shared console CSS (mirrors the
// company console's WCA_CSS). The nav alert badge is the same pill as the
// company console's alerts badge - amber for auto-recoveries, red when something
// actually failed - and docks to the icon's corner when the rail collapses so it
// never spills out of the 64px rail (SUPREME RULE XIV).
const WA_CSS = `
.wka .spin { animation: wka-spin 0.8s linear infinite; }
.wka-nav-item { position: relative; }
.wa-badge { margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:999px; display:inline-grid; place-items:center; font-size:11px; font-weight:800; font-variant-numeric:tabular-nums; color:#1a1200; background:var(--wka-amber); box-shadow:0 0 0 2px color-mix(in srgb, var(--wka-amber) 12%, transparent); flex-shrink:0; }
.wa-badge.severe { color:#fff; background:var(--wka-red); box-shadow:0 0 0 2px color-mix(in srgb, var(--wka-red) 14%, transparent); }
@media (max-width: 760px) {
  .wa-badge { position:absolute; top:4px; right:4px; margin-left:0; min-width:16px; height:16px; padding:0 4px; font-size:9.5px; }
}
`
