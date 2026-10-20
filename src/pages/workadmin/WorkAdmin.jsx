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
import { LayoutDashboard, Users, Tags, Cpu, ListChecks, ShieldAlert, Loader2, LifeBuoy } from 'lucide-react'
import SupportTickets from '../../components/SupportTickets.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
import { workAdminApi } from './workAdminApi.js'
import Overview from './sections/Overview.jsx'
import UsersSection from './sections/Users.jsx'
import Pricing from './sections/Pricing.jsx'
import AiConfig from './sections/AiConfig.jsx'
import Sessions from './sections/Sessions.jsx'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Overview', sub: 'WorkCoPilot at a glance.' },
  { id: 'users', label: 'Users', icon: Users, title: 'Users', sub: 'Tiers, balances and granted hours.' },
  { id: 'pricing', label: 'Pricing', icon: Tags, title: 'Pricing', sub: 'Plan prices, extra-hour and image rates.' },
  { id: 'ai', label: 'AI config', icon: Cpu, title: 'AI configuration', sub: 'Platform AI for WorkCoPilot users.' },
  { id: 'sessions', label: 'Sessions', icon: ListChecks, title: 'Sessions', sub: 'Recent guided sessions across users.' },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy, title: 'Support tickets', sub: 'Feature requests, bugs, billing and access issues from users.' },
]

export default function WorkAdmin() {
  const [active, setActive] = useState('overview')
  // gate: 'loading' | 'ready' | 'denied' | 'error'
  const [gate, setGate] = useState('loading')
  const [viewer, setViewer] = useState(null)
  const [gateError, setGateError] = useState(null)

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

  const isSuperAdmin = !!(viewer && viewer.isSuperAdmin)
  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0]

  const renderSection = () => {
    switch (active) {
      case 'users': return <UsersSection isSuperAdmin={isSuperAdmin} />
      case 'pricing': return <Pricing isSuperAdmin={isSuperAdmin} />
      case 'ai': return <AiConfig isSuperAdmin={isSuperAdmin} />
      case 'sessions': return <Sessions />
      case 'tickets': return <SupportTickets mode="admin" />
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
        </div>
      </header>

      <div className="wka-body">
        <nav className="wka-nav">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.id} className={`wka-nav-item${active === s.id ? ' active' : ''}`}
                onClick={() => setActive(s.id)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s.id) } }}>
                <Icon size={17} />
                <span className="label">{s.label}</span>
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
