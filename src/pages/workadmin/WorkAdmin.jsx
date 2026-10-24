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
import { LayoutDashboard, Users, Tags, Cpu, ListChecks, ShieldAlert, ShieldCheck, Loader2, LifeBuoy, Building2, CreditCard, UserPlus, LogOut, Megaphone, Mail, MailCheck, DollarSign, Share2 } from 'lucide-react'
import SupportTickets from '../../components/SupportTickets.jsx'
import Companies from './sections/Companies.jsx'
import Governance from './sections/Governance.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
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
import Hero from './sections/Hero.jsx'
import Email from './sections/Email.jsx'
import EmailTemplates from './sections/EmailTemplates.jsx'
import Finance from './sections/Finance.jsx'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Overview', sub: 'WorkCoPilot at a glance.' },
  { id: 'companies', label: 'Companies', icon: Building2, title: 'Companies', sub: 'Tenancy: companies, company admins, users and redaction policy.' },
  { id: 'governance', label: 'Governance', icon: ShieldCheck, title: 'Data governance', sub: 'Per-company DLP policy: what leaves the device, block words, compliance frameworks, arm & lock.' },
  { id: 'users', label: 'Users', icon: Users, title: 'Users', sub: 'Tiers, balances and granted hours.' },
  { id: 'pricing', label: 'Pricing', icon: Tags, title: 'Pricing', sub: 'Plan prices, extra-hour and image rates.' },
  { id: 'billing', label: 'Billing', icon: CreditCard, title: 'Billing', sub: 'Stripe keys, plan price ids and the webhook endpoint.' },
  { id: 'finance', label: 'Finance', icon: DollarSign, title: 'Finance', sub: 'All transactions, revenue by week/month/quarter/year, MRR, and refunds.' },
  { id: 'email', label: 'SMTP Settings', icon: Mail, title: 'SMTP Settings (Email / SES)', sub: 'Outbound email for delivering reports. MFA-gated. Enter your SES SMTP credentials and send a test.' },
  { id: 'email-templates', label: 'Email Templates', icon: MailCheck, title: 'Email Templates', sub: 'Every email the product sends - edit the wording, placeholders and preview. Nothing is static.' },
  { id: 'ai', label: 'AI config', icon: Cpu, title: 'AI configuration', sub: 'Platform AI for WorkCoPilot users.' },
  { id: 'sessions', label: 'Sessions', icon: ListChecks, title: 'Sessions', sub: 'Recent guided sessions across users.' },
  { id: 'leads', label: 'Leads', icon: UserPlus, title: 'Leads', sub: 'Everyone who ran a live validation on the demo or sign-in page - newest first.' },
  { id: 'hero', label: 'Hero', icon: Megaphone, title: 'Homepage hero', sub: 'The rotating headline and subtext on the public homepage. Superadmin edits; other admins view.' },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy, title: 'Support tickets', sub: 'Feature requests, bugs, billing and access issues from users.' },
  { id: 'incidents', label: 'Incidents', icon: ShieldAlert, title: 'System incidents', sub: 'Real causes behind the "system is busy" message users see - AI quota, keys, 5xx, timeouts. Users never see these.' },
  { id: 'affiliates', label: 'Affiliates', icon: Share2, title: 'Affiliate program', sub: 'Approve affiliates, set commission rates, track referrals and run Stripe Connect payouts.' },
]

export default function WorkAdmin() {
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
  // Accounting sees only Finance; an affiliate admin sees only Affiliates; a
  // superadmin sees everything.
  const visibleSections = isSuperAdmin ? SECTIONS
    : isAccounting ? SECTIONS.filter((s) => s.id === 'finance')
      : isAffiliateAdmin ? SECTIONS.filter((s) => s.id === 'affiliates')
        : SECTIONS
  useEffect(() => { if (isAccounting && active !== 'finance') setActive('finance') }, [isAccounting, active])
  useEffect(() => { if (isAffiliateAdmin && active !== 'affiliates') setActive('affiliates') }, [isAffiliateAdmin, active])
  const current = visibleSections.find((s) => s.id === active) || visibleSections[0] || SECTIONS[0]

  const renderSection = () => {
    switch (active) {
      case 'companies': return <Companies isSuperAdmin={isSuperAdmin} />
      case 'governance': return <Governance isSuperAdmin={isSuperAdmin} />
      case 'users': return <UsersSection isSuperAdmin={isSuperAdmin} />
      case 'pricing': return <Pricing isSuperAdmin={isSuperAdmin} />
      case 'billing': return <Billing isSuperAdmin={isSuperAdmin} />
      case 'email': return <Email isSuperAdmin={isSuperAdmin} />
      case 'email-templates': return <EmailTemplates isSuperAdmin={isSuperAdmin} />
      case 'finance': return <Finance isSuperAdmin={isSuperAdmin} />
      case 'ai': return <AiConfig isSuperAdmin={isSuperAdmin} />
      case 'sessions': return <Sessions />
      case 'leads': return <Leads />
      case 'hero': return <Hero isSuperAdmin={isSuperAdmin} />
      case 'tickets': return <SupportTickets mode="admin" />
      case 'incidents': return <Incidents />
      case 'affiliates': return <Affiliates isSuperAdmin={isSuperAdmin} />
      case 'overview':
      default: return <Overview />
    }
  }

  if (gate === 'loading') {
    return (
      <div className="wka">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <Loader2 size={26} style={{ animation: 'wka-spin 0.8s linear infinite', color: 'var(--wka-cyan)', marginBottom: 12 }} />
          <h2>Checking access</h2>
          <p>One moment.</p>
        </div></div>
      </div>
    )
  }

  if (gate === 'denied') {
    return (
      <div className="wka">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <ShieldAlert size={30} />
          <h2>You need admin access</h2>
          <p>The WorkCoPilot admin console is available to AdmireVeda administrators. Sign in with an admin account to continue.</p>
        </div></div>
      </div>
    )
  }

  if (gate === 'error') {
    return (
      <div className="wka">
        <style>{WORKADMIN_CSS}</style>
        <div className="wka-gate"><div className="box">
          <ShieldAlert size={30} style={{ color: 'var(--wka-red)' }} />
          <h2>Could not load the console</h2>
          <p>{(gateError && gateError.message) || 'Please try again.'}</p>
          <button type="button" className="wka-btn primary" style={{ marginTop: 16 }} onClick={checkAccess}>Try again</button>
        </div></div>
      </div>
    )
  }

  return (
    <div className="wka">
      <style>{WORKADMIN_CSS}</style>

      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand">
          <b>WorkCoPilot</b>
          <span>AdmireVeda Admin</span>
        </div>
        <div className="wka-top-right">
          {viewer ? <span className="wka-chip">{viewer.username}</span> : null}
          <span className={`wka-chip ${isSuperAdmin ? 'ok' : ''}`}>{isSuperAdmin ? 'Superadmin' : 'Admin'}</span>
          <button type="button" className="wka-btn sm ghost" onClick={signOut} title="Sign out"><LogOut size={14} /> Sign out</button>
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
                <span className="label">{s.label}</span>
                {s.id === 'incidents' && incidentAlert.count > 0 ? (
                  <span title={`${incidentAlert.count} incident${incidentAlert.count === 1 ? '' : 's'} in the last 24h`}
                    style={{ marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                      color: '#0a0d12', background: incidentAlert.severe ? 'var(--wka-red, #ff6b6b)' : 'var(--wka-amber, #f5c86b)' }}>
                    {incidentAlert.count > 99 ? '99+' : incidentAlert.count}
                  </span>
                ) : null}
              </div>
            )
          })}
          <div className="wka-nav-foot">WorkCoPilot - a separate product surface. Changes here do not touch the interview admin.</div>
        </nav>

        <main className="wka-main">
          <h1 className="wka-h1">{current.title}</h1>
          <p className="wka-sub">{current.sub}</p>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
