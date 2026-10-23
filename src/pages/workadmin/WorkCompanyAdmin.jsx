// WorkCoPilot COMPANY-ADMIN console - the gold-standard dashboard a company
// administrator lands on. It mirrors the superadmin console shell (same `wka`
// design system, same shared primitives) but every section is scoped to the
// admin's OWN company and talks only to /api/work/* endpoints through the shared
// client. A company admin manages their people, SSO, AI keys, data-governance
// policy, support tickets, their own profile and password, and sees the
// company's consumption and activity. Nothing here can reach another company.
//
// Routing is local state (no react-router inside), wired at /work/company in
// App.jsx. The console self-gates: it reads /api/work/me and only renders for a
// company_admin; everyone else gets a clear message.
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  LayoutDashboard, Users, ShieldCheck, Cpu, LifeBuoy, ListChecks, Settings as SettingsIcon,
  Loader2, ShieldAlert, LogOut, Plus, Trash2, Check, Info, KeyRound, Lock, AlertTriangle,
  Building2, UserCog, RefreshCw, Receipt, Copy, Clock, Mail, ChevronDown, ChevronRight,
  FileText, Download, Activity, Globe,
} from 'lucide-react'
import { api } from '../../api.js'
import SupportTickets from '../../components/SupportTickets.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
import { Loading, ErrorBox, EmptyState, Spinning, SavedTag } from './sections/_shared.jsx'
import * as SSO from '../../shared/sso_guide.js'

const TIERS = [{ id: 'basic', name: 'Basic' }, { id: 'advanced', name: 'Advanced' }, { id: 'premium', name: 'Premium' }]
const ROLE_LABEL = { company_admin: 'Company admin', member: 'Member' }
// Friendly labels for every OpenID Connect provider the backend accepts.
const SSO_PROVIDER_LABELS = {
  google: 'Google', microsoft: 'Microsoft (Entra ID)', okta: 'Okta', auth0: 'Auth0',
  onelogin: 'OneLogin', ping: 'Ping Identity (PingOne)', jumpcloud: 'JumpCloud',
  keycloak: 'Keycloak', cognito: 'AWS Cognito', azuread_b2c: 'Microsoft Entra B2C',
  authentik: 'Authentik', duo: 'Duo', centrify: 'Centrify', oidc: 'Other (any OpenID Connect)',
}
const SSO_PROVIDER_ORDER = ['google', 'microsoft', 'okta', 'auth0', 'onelogin', 'ping', 'jumpcloud', 'keycloak', 'cognito', 'azuread_b2c', 'authentik', 'duo', 'centrify', 'oidc']
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
const fmtDT = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const fmtMins = (secs) => { const m = Math.round((Number(secs) || 0) / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); const r = m % 60; return r ? `${h}h ${r}m` : `${h}h` }

// Small inline help: an info icon with a native tooltip. Keeps each control
// self-explanatory without a popover library.
function Help({ text }) {
  return <span className="wca-help" tabIndex={0} title={text} aria-label={text}><Info size={13} /></span>
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Overview', sub: 'Your company at a glance: people, seats, AI consumption and plan.' },
  { id: 'team', label: 'Team', icon: Users, title: 'Team', sub: 'Add people, set their role and plan, and remove them. Changes take effect right away.' },
  { id: 'sso', label: 'Single sign-on', icon: KeyRound, title: 'Single sign-on (SSO)', sub: 'Let your people sign in with your identity provider (Google, Microsoft or Okta).' },
  { id: 'ai', label: 'AI keys', icon: Cpu, title: 'AI keys', sub: 'Run WorkCoPilot on your company AI keys so usage is billed to your own provider account.' },
  { id: 'billing', label: 'Billing', icon: Receipt, title: 'Billing', sub: 'Your plan charges and any extras. Set by the WorkCoPilot team.' },
  { id: 'governance', label: 'Data governance', icon: ShieldCheck, title: 'Data governance (DLP)', sub: 'Decide what sensitive data may leave the device. Controls and evidence that support your compliance.' },
  { id: 'sessions', label: 'Sessions', icon: Activity, title: 'Member sessions', sub: 'Every session your people run - completed or in progress. Pull the report or audit log for any of them.' },
  { id: 'tickets', label: 'Support', icon: LifeBuoy, title: 'Support', sub: 'Open a ticket and talk to the WorkCoPilot team.' },
  { id: 'activity', label: 'Activity', icon: ListChecks, title: 'Activity', sub: 'A record of what happened across your company.' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, title: 'Settings and profile', sub: 'Your profile, your password, and your company details.' },
]

// ===========================================================================
// Overview
// ===========================================================================
// Authorization attestation: the company admin affirms their organization
// authorizes WorkCoPilot use on its systems (addresses "browser access does not
// establish corporate authorization"). Self-contained: fetches + posts its own
// state. Prompted when missing; shows who + when once affirmed. Not a hard gate.
function AuthorizationCard() {
  const [st, setSt] = useState({ loading: true, error: null, auth: null })
  const [saving, setSaving] = useState(false)
  const load = useCallback(() => {
    setSt((s) => ({ ...s, loading: true, error: null }))
    api.workTeamAuthorization().then((a) => setSt({ loading: false, error: null, auth: a })).catch((error) => setSt({ loading: false, error, auth: null }))
  }, [])
  useEffect(() => { load() }, [load])
  const affirm = async () => {
    if (saving) return
    setSaving(true)
    try { const a = await api.workTeamAttest(); setSt((s) => ({ ...s, auth: a.authorization || a })) }
    catch (error) { setSt((s) => ({ ...s, error })) } finally { setSaving(false) }
  }
  if (st.loading) return null
  const a = st.auth || {}
  if (a.attested) {
    return (
      <div className="wka-panel" style={{ borderColor: 'rgba(140,245,196,0.4)' }}>
        <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />Authorization on file</h2>
        <p className="desc">Your organization's authorization to use WorkCoPilot on its systems is recorded{a.byName ? <> by <b>{a.byName}</b></> : ''}{a.at ? <> on {fmtDate(a.at)}</> : ''}. This is kept as evidence that use was approved by your organization.</p>
      </div>
    )
  }
  return (
    <div className="wka-panel" style={{ borderColor: 'rgba(255,179,92,0.5)' }}>
      <h2><ShieldAlert size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-amber)' }} />Confirm organization authorization</h2>
      <p className="desc">WorkCoPilot guides your people on their own screens and systems. As a company admin, confirm that your organization authorizes this use on its systems. We record who affirmed it and when, as evidence - it does not change how the product works.</p>
      {st.error ? <div style={{ marginBottom: 12 }}><ErrorBox error={st.error} /></div> : null}
      <button type="button" className="wka-btn primary" disabled={saving} onClick={affirm}>{saving ? <Spinning /> : <Check size={14} />} My organization authorizes WorkCoPilot</button>
    </div>
  )
}

// Company-set data retention: the company admin owns their window (the platform
// does not control it). 0 = keep forever (default). Self-contained.
function CompanyRetentionCard() {
  const [days, setDays] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const [purged, setPurged] = useState(null)
  const load = useCallback(() => {
    api.workTeamRetention().then((d) => { setDays(String(d.retentionDays ?? 0)); setLoaded(true) }).catch((e) => { setErr(e); setLoaded(true) })
  }, [])
  useEffect(() => { load() }, [load])
  const save = async () => {
    if (saving) return
    const n = Number(days)
    setSaving(true); setErr(null); setSaved(false); setPurged(null)
    try { const r = await api.workTeamSetRetention(n); setDays(String(r.retentionDays)); setPurged(r.purged || 0); setSaved(true); setTimeout(() => setSaved(false), 2400) }
    catch (e) { setErr(e) } finally { setSaving(false) }
  }
  if (!loaded) return null
  const n = Number(days)
  return (
    <div className="wka-panel">
      <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Data retention</h2>
      <p className="desc">Automatically delete your company's sessions (and their milestone screenshots and audit log) older than this many days. <b>0 keeps them forever.</b> You control this for your company; people can still delete their own sessions anytime. Applied on an hourly sweep.</p>
      <div className="wka-field" style={{ maxWidth: 260 }}>
        <label>Retention window (days)</label>
        <input className="wka-input" type="number" min="0" max="3650" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
        <span className="hint">{n > 0 ? `Sessions older than ${n} day${n === 1 ? '' : 's'} are purged.` : 'Keep forever (no automatic deletion).'}</span>
      </div>
      {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button type="button" className="wka-btn primary" disabled={saving || !Number.isInteger(n) || n < 0 || n > 3650} onClick={save}>{saving ? <Spinning /> : null} Save retention</button>
        <SavedTag show={saved} />
        {purged != null && purged > 0 ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>Purged {purged} session{purged === 1 ? '' : 's'} now.</span> : null}
      </div>
    </div>
  )
}

function OverviewSection({ company }) {
  const [state, setState] = useState({ loading: true, error: null, lic: null, cons: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([
      api.workTeamLicenses(),
      api.workTeamConsumption().catch(() => null),   // consumption is a nice-to-have, never blocks the view
    ])
      .then(([lic, cons]) => setState({ loading: false, error: null, lic, cons }))
      .catch((error) => setState({ loading: false, error, lic: null, cons: null }))
  }, [])
  useEffect(() => { load() }, [load])

  if (state.loading) return <Loading label="Loading your company" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const lic = state.lic || {}
  const d = state.cons
  const userLabel = lic.userSeats > 0 ? `${lic.userSeatsUsed} of ${lic.userSeats}` : `${lic.userSeatsUsed || 0}`
  const adminLabel = lic.adminSeats > 0 ? `${lic.adminSeatsUsed} of ${lic.adminSeats}` : `${lic.adminSeatsUsed || 0}`
  const aiReady = company ? company.aiReady : undefined

  return (
    <div>
      <div className="wka-cards">
        <div className="wka-card">
          <div className="k"><Users size={15} /> User licenses</div>
          <div className="v">{userLabel}</div>
          <div className="foot">{lic.userSeatsLeft == null ? 'No limit set' : `${lic.userSeatsLeft} left`}</div>
        </div>
        <div className="wka-card">
          <div className="k"><UserCog size={15} /> Admin seats</div>
          <div className="v">{adminLabel}</div>
          <div className="foot">{lic.adminSeatsLeft == null ? 'No limit set' : `${lic.adminSeatsLeft} left`}</div>
        </div>
        <div className="wka-card">
          <div className="k"><Clock size={15} /> Company minute pool</div>
          <div className="v">{fmtMins(lic.poolSeconds)}</div>
          <div className="foot">Shared backup minutes</div>
        </div>
        <div className="wka-card accent">
          <div className="k"><Cpu size={15} /> Guided sessions</div>
          <div className="v">{d ? (d.sessionCount || 0) : '-'}</div>
          <div className="foot">{d ? 'Total for your company' : 'No data yet'}</div>
        </div>
      </div>

      {company && aiReady === false && (
        <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> {company.aiReason || 'AI is not configured yet.'} {company.aiSource === 'company' ? 'Set your keys in the AI keys tab.' : ''}</div>
      )}

      <AuthorizationCard />
      <CompanyRetentionCard />

      {lic.tierUsage && (
        <div className="wka-panel">
          <h2>Licenses by plan <Help text="How many of each plan your company bought, and how many are assigned. Assigning beyond a plan's allocation is blocked." /></h2>
          <div className="wka-cards" style={{ marginBottom: 0 }}>
            {TIERS.map((t) => {
              const tu = lic.tierUsage[t.id] || { allocated: 0, used: 0, left: 0 }
              return (
                <div key={t.id} className="wka-card">
                  <div className="k">{t.name}</div>
                  <div className="v">{tu.used} of {tu.allocated}</div>
                  <div className="foot">{tu.left} available</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="wka-panel">
        <h2>Company</h2>
        <p className="desc">The essentials for {company ? company.name : 'your company'}. Your plan, seats and license mode are set by the WorkCoPilot team; open a support ticket to change them.</p>
        <div className="wca-kv">
          <div><span>Name</span><b>{company ? company.name : '-'}</b></div>
          <div><span>License mode</span><b style={{ textTransform: 'capitalize' }}>{(company && company.licenseMode) || 'locked'}</b></div>
          <div><span>Sign-in</span><b>{company && company.ssoProvisioning === 'auto' ? 'SSO, open to your domain' : 'SSO, invite-only'}</b></div>
          <div><span>AI source</span><b>{company && company.aiSource === 'company' ? 'Your own keys' : company && company.aiSource === 'platform' ? 'WorkCoPilot platform' : 'Not set'}</b></div>
          <div><span>AI status</span><b style={{ color: aiReady ? 'var(--wka-emerald)' : 'var(--wka-amber)' }}>{aiReady ? 'Ready' : 'Not ready'}</b></div>
          <div><span>Single sign-on</span><b>{company && company.sso && company.sso.connected ? `Connected (${company.sso.provider})` : 'Not connected'}</b></div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>People and usage <Help text="Each person, their plan, how much guiding time they used today versus their daily allowance, and any extra minutes they hold." /></h2>
        {!lic.members || !lic.members.length ? <EmptyState title="No people yet" detail="Add your team on the Team tab." />
          : (
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Used today</th><th>Extra minutes</th><th>License</th></tr></thead>
                <tbody>
                  {lic.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.displayName || m.username}{m.email ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{m.email}</div> : null}</td>
                      <td>{ROLE_LABEL[m.companyRole] || 'Member'}</td>
                      <td><span className={`wka-badge ${m.tier}`}>{m.tier}</span></td>
                      <td>{fmtMins(m.usage.usedSeconds)} <span style={{ color: 'var(--wka-faint)' }}>/ {fmtMins(m.usage.dailySeconds)}</span></td>
                      <td>{m.usage.purchasedSeconds ? fmtMins(m.usage.purchasedSeconds) : '-'}</td>
                      <td>{m.licensed ? <span className="wka-chip ok">Active</span> : <span className="wka-chip" style={{ color: 'var(--wka-amber)' }}>No seat</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}

// ===========================================================================
// Team
// ===========================================================================
function TeamSection({ meId, onCompany }) {
  const [company, setCompanyLocal] = useState(null)
  const [members, setMembers] = useState(null)      // from the license summary (has usage)
  const [pool, setPool] = useState(0)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState('email')          // 'email' (SSO) | 'password' (non-SSO)
  const [form, setForm] = useState({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic' })
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState('')
  const [allocFor, setAllocFor] = useState('')       // member id whose minute box is open
  const [allocMin, setAllocMin] = useState('')

  const load = useCallback(() => {
    setErr(null)
    Promise.all([api.workCompanyUsers(), api.workTeamLicenses()])
      .then(([r, lic]) => {
        const co = r.company || null
        setCompanyLocal(co); if (onCompany) onCompany(co)
        setMembers(lic.members || [])
        setPool(lic.poolSeconds || 0)
        // Default the add mode to email when SSO is connected, else password.
        setMode(co && co.sso && co.sso.connected ? 'email' : 'password')
      })
      .catch((error) => { setErr(error); setMembers([]) })
  }, [onCompany])
  useEffect(() => { load() }, [load])

  const locked = !!(company && company.licenseMode === 'locked')

  const create = async () => {
    setErr(null); setOk('')
    if (mode === 'email') {
      const email = form.email.trim().toLowerCase()
      if (!email.includes('@')) { setErr(new Error('Enter the person\'s work email.')); return }
      setBusy(true)
      try {
        await api.workCompanyCreateUser({ email, displayName: form.displayName.trim(), companyRole: form.companyRole, tier: form.tier })
        setOk(`Added ${email}. They sign in through your company SSO.`); setForm({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic' }); setAdding(false); load()
      } catch (error) { setErr(error) } finally { setBusy(false) }
    } else {
      const username = form.username.trim()
      if (!username || !form.password) { setErr(new Error('Enter a username and a temporary password.')); return }
      setBusy(true)
      try {
        await api.workCompanyCreateUser({ username, password: form.password, companyRole: form.companyRole, tier: form.tier })
        setOk(`Added ${username}.`); setForm({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic' }); setAdding(false); load()
      } catch (error) { setErr(error) } finally { setBusy(false) }
    }
  }
  const patchUser = async (m, patch) => {
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyUpdateUser(m.id, patch); setOk(`Updated ${m.displayName || m.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const removeUser = async (m) => {
    if (!window.confirm(`Remove ${m.displayName || m.username} from the company? They lose access right away. This can be undone by support.`)) return
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyRemoveUser(m.id); setOk(`Removed ${m.displayName || m.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const allocate = async (m) => {
    const mins = Number(allocMin) || 0
    if (mins <= 0) { setErr(new Error('Enter how many minutes to give.')); return }
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyAllocateMinutes(m.id, mins); setOk(`Gave ${mins} minutes to ${m.displayName || m.username}.`); setAllocFor(''); setAllocMin(''); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }

  return (
    <div>
      {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> Your license roster is managed by the WorkCoPilot team. You can change roles, plans and give pool minutes, but adding or removing people goes through support.</div>}
      <div className="wka-toolbar">
        <button type="button" className="wka-btn primary" disabled={locked} title={locked ? 'Roster is managed by WorkCoPilot' : ''} onClick={() => { setErr(null); setOk(''); setAdding((v) => !v) }}><Plus size={14} /> Add person</button>
        <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>Company minute pool: <b style={{ color: 'var(--wka-text)' }}>{fmtMins(pool)}</b></span>
      </div>

      {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
      {err && <ErrorBox error={err} />}

      {adding && !locked && (
        <div className="wka-panel">
          <h2>Add a person</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" className={`wka-btn sm${mode === 'email' ? ' primary' : ''}`} onClick={() => setMode('email')}><Mail size={13} /> By email (SSO)</button>
            <button type="button" className={`wka-btn sm${mode === 'password' ? ' primary' : ''}`} onClick={() => setMode('password')}><KeyRound size={13} /> Username and password</button>
          </div>
          {mode === 'email'
            ? <p className="desc">Enter their work email. They sign in through your company single sign-on; there is no password to set. If your company uses invite-only SSO, only people you add here can sign in.</p>
            : <p className="desc">For a person without SSO. Share the temporary password; they can change it later.</p>}
          <div className="wka-formgrid">
            {mode === 'email' ? (
              <>
                <div className="wka-field"><label>Work email</label><input className="wka-input" value={form.email} maxLength={160} autoComplete="off" placeholder="alex@yourcompany.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="wka-field"><label>Name <span className="hint">optional</span></label><input className="wka-input" value={form.displayName} maxLength={80} placeholder="e.g. Alex Morgan" onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div className="wka-field"><label>Username</label><input className="wka-input" value={form.username} maxLength={60} autoComplete="off" placeholder="e.g. alex" onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div className="wka-field"><label>Temporary password</label><input className="wka-input" type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder="at least 6 characters" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </>
            )}
            <div className="wka-field"><label>Role <Help text="Company admins can manage this console. Members just use WorkCoPilot. Admins use a separate seat pool." /></label>
              <select className="wka-select" value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
                <option value="member">Member</option><option value="company_admin">Company admin</option>
              </select>
            </div>
            <div className="wka-field"><label>Plan <Help text="Daily guiding time: Basic 2h, Advanced 4h, Premium 6h. Your company's per-plan license count is enforced." /></label>
              <select className="wka-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="wka-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="wka-btn primary" disabled={busy} onClick={create}>{busy ? <Spinning /> : <Plus size={14} />} Add person</button>
          </div>
        </div>
      )}

      <div className="wka-panel">
        <h2>People <Help text="Change a person's role or plan inline (allowed even when the roster is managed). Give extra minutes from the company pool. Removing detaches them and signs them out everywhere." /></h2>
        {members == null ? <Loading label="Loading your team" />
          : members.length === 0 ? <EmptyState title="No people yet" detail="Add your first teammate to get started." />
            : (
              <div className="wka-table-wrap">
                <table className="wka-table">
                  <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Used today</th><th>Extra</th><th></th></tr></thead>
                  <tbody>
                    {members.map((m) => {
                      const self = String(m.id) === String(meId)
                      return (
                        <tr key={m.id}>
                          <td>{m.displayName || m.username}<div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{m.email || m.username}{self ? ' (you)' : ''}</div></td>
                          <td>
                            <select className="wka-select" value={m.companyRole || 'member'} disabled={self || rowBusy === m.id}
                              title={self ? 'You cannot change your own role.' : ''}
                              onChange={(e) => patchUser(m, { companyRole: e.target.value })}>
                              <option value="member">Member</option><option value="company_admin">Company admin</option>
                            </select>
                          </td>
                          <td>
                            <select className="wka-select" value={m.tier || 'basic'} disabled={rowBusy === m.id} onChange={(e) => patchUser(m, { tier: e.target.value })}>
                              {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          <td style={{ fontSize: 12.5 }}>{fmtMins(m.usage.usedSeconds)} <span style={{ color: 'var(--wka-faint)' }}>/ {fmtMins(m.usage.dailySeconds)}</span></td>
                          <td style={{ fontSize: 12.5 }}>
                            {allocFor === m.id
                              ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                  <input className="wka-input" style={{ width: 64, padding: '4px 6px' }} value={allocMin} placeholder="min" onChange={(e) => setAllocMin(e.target.value.replace(/[^0-9]/g, ''))} />
                                  <button className="wka-btn sm primary" disabled={rowBusy === m.id} onClick={() => allocate(m)}>Give</button>
                                  <button className="wka-btn sm ghost" onClick={() => { setAllocFor(''); setAllocMin('') }}>x</button>
                                </span>
                              : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{m.usage.purchasedSeconds ? fmtMins(m.usage.purchasedSeconds) : '-'}<button className="wka-btn sm ghost" title="Give minutes from the company pool" disabled={pool <= 0} onClick={() => { setAllocFor(m.id); setAllocMin('') }}><Clock size={12} /></button></span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {rowBusy === m.id ? <Spinning /> : <button type="button" className="wka-btn sm ghost" disabled={self || locked} title={locked ? 'Roster managed by WorkCoPilot' : self ? 'You cannot remove yourself.' : 'Remove from company'} onClick={() => removeUser(m)}><Trash2 size={13} /></button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </div>
  )
}

// ===========================================================================
// SSO
// ===========================================================================
function CopyField({ value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }
  return (
    <span className="wca-copy">
      <code className="wka-mono">{value}</code>
      <button type="button" className="wka-btn sm ghost" onClick={copy} title="Copy">{copied ? <Check size={12} /> : <Copy size={12} />}</button>
    </span>
  )
}

function SsoSection({ company }) {
  const [state, setState] = useState({ loading: true, error: null, sso: null })
  // The shared guide describes just-in-time provisioning, which only applies in
  // AUTO mode. Most companies are invite-only (explicit), so say so up front or
  // the admin will wait for accounts that never appear.
  const inviteOnly = !company || company.ssoProvisioning !== 'auto'
  const [form, setForm] = useState({ provider: 'google', issuer: '', clientId: '', clientSecret: '', domain: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [guideOpen, setGuideOpen] = useState(true)
  const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}${SSO.SSO_CALLBACK_PATH}` : SSO.SSO_CALLBACK_URL

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workCompanyGetSso()
      .then((r) => { const s = r.sso || null; setState({ loading: false, error: null, sso: s }); if (s) setForm((f) => ({ ...f, provider: s.provider || 'google', issuer: s.issuer || '', clientId: s.clientId || '', domain: s.domain || '' })) })
      .catch((error) => setState({ loading: false, error, sso: null }))
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setSaveErr(null); setSaved(false)
    try { await api.workCompanySetSso(form); setSaved(true); setForm((f) => ({ ...f, clientSecret: '' })); setTimeout(() => setSaved(false), 2500); load() }
    catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }

  if (state.loading) return <Loading label="Loading SSO" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const connected = state.sso && state.sso.connected
  const guide = (SSO.SSO_PROVIDERS || []).find((p) => p.id === form.provider) || null
  const issuerHint = guide ? guide.issuer : 'https://your-identity-provider/...'

  return (
    <div>
      <div className="wka-note"><Info size={14} /> Register this exact redirect / callback URL in your identity provider: <CopyField value={callbackUrl} /></div>
      <div className="wka-note" style={{ color: inviteOnly ? 'var(--wka-amber)' : undefined }}><Lock size={14} />
        {inviteOnly
          ? <>Your company uses <b>invite-only</b> sign-in: only people you add by email on the Team tab (or the WorkCoPilot team adds) can sign in through SSO. Everyone else is refused, even if your identity provider lets them in. The automatic account creation described in the guide below does not apply to your company.</>
          : <>Your company uses <b>open-domain</b> sign-in: anyone your identity provider authenticates with an email on {state.sso && state.sso.domain ? <b>@{state.sso.domain}</b> : 'your email domain'} gets a member account on first sign-in, as long as a user license is free.</>}
      </div>
      <div className="wka-panel">
        <h2>{connected ? 'SSO is connected' : 'Connect single sign-on'} {connected ? <span className="wka-badge active" style={{ marginLeft: 6 }}>{SSO_PROVIDER_LABELS[state.sso.provider] || state.sso.provider}</span> : null}</h2>
        <p className="desc">Your people sign in with your identity provider. WorkCoPilot works with any OpenID Connect provider; pick yours below.</p>
        <div className="wka-formgrid">
          <div className="wka-field"><label>Provider</label>
            <select className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {SSO_PROVIDER_ORDER.map((id) => <option key={id} value={id}>{SSO_PROVIDER_LABELS[id]}</option>)}
            </select>
          </div>
          <div className="wka-field"><label>Email domain <Help text="The part after the @ in your users' email, for example acme.com. Used to route sign-ins to your company." /></label><input className="wka-input" value={form.domain} placeholder="acme.com" onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          <div className="wka-field"><label>Issuer URL <Help text={guide ? guide.issuerNote : 'Your provider OpenID issuer, a full https URL.'} /></label><input className="wka-input" value={form.issuer} placeholder={issuerHint} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
          <div className="wka-field"><label>Client ID</label><input className="wka-input" value={form.clientId} placeholder="from your provider" onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
          <div className="wka-field"><label>Client secret <Help text="Write-only. Leave blank to keep the stored secret unchanged." /></label><input className="wka-input" type="password" value={form.clientSecret} placeholder={connected ? 'leave blank to keep current' : 'from your provider'} autoComplete="new-password" onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="wka-btn primary" disabled={saving} onClick={save}>{saving ? <Spinning /> : <ShieldCheck size={14} />} Save SSO</button>
          <SavedTag show={saved} />
        </div>
        {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
      </div>

      <div className="wka-panel">
        <button type="button" className="wca-guide-head" onClick={() => setGuideOpen((v) => !v)}>
          {guideOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h2 style={{ margin: 0 }}>Set-up guide{guide ? ` for ${guide.name}` : ''}</h2>
        </button>
        {guideOpen && (
          <div className="wca-guide">
            {(SSO.SSO_OVERVIEW || []).map((t, i) => <p key={i} className="desc">{t}</p>)}

            <h3>{SSO.SSO_ROLES.title}</h3>
            <ul className="wca-guide-list">{SSO.SSO_ROLES.points.map(([t, d], i) => <li key={i}><b>{t}.</b> {d}</li>)}</ul>

            <h3>Register this redirect URI</h3>
            {(SSO.SSO_REDIRECT_NOTE || []).map((t, i) => <p key={i} className="desc">{t}</p>)}
            <CopyField value={callbackUrl} />

            {guide ? (
              <>
                <h3>Step by step in {guide.name}</h3>
                <p className="desc">Console: <a href={guide.console} target="_blank" rel="noreferrer">{guide.console}</a>. Issuer to enter here: <code className="wka-mono">{guide.issuer}</code>. {guide.issuerNote}</p>
                <ol className="wca-guide-steps">{guide.steps.map(([t, d], i) => <li key={i}><b>{t}.</b> {d}</li>)}</ol>
                <div className="wca-scenario"><b>{guide.scenario.title}</b><p>{guide.scenario.body}</p></div>
              </>
            ) : (
              <>
                <h3>Step by step</h3>
                <p className="desc">This is a standard OpenID Connect provider. In your provider, create an OIDC web application, set the redirect URI above, and copy its issuer URL, client ID and client secret into the form. Then set your email domain and save. If your provider lets you choose who can use the app, assign only the people who should have WorkCoPilot.</p>
              </>
            )}

            <h3>{SSO.SSO_USER_SIGNIN.title}</h3>
            <ol className="wca-guide-steps">{SSO.SSO_USER_SIGNIN.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>

            <h3>{SSO.SSO_TROUBLESHOOTING.title}</h3>
            <ul className="wca-guide-list">{SSO.SSO_TROUBLESHOOTING.points.map(([t, d], i) => <li key={i}><b>{t}.</b> {d}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Company-admin read-only billing statement.
function BillingSection() {
  const [state, setState] = useState({ loading: true, error: null, bill: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamBilling().then((bill) => setState({ loading: false, error: null, bill })).catch((error) => setState({ loading: false, error, bill: null }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label="Loading billing" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const b = state.bill || {}
  const lines = [...(b.seatLines || []), ...(b.ledger || [])]
  const cur = (b.currency || 'usd').toUpperCase()
  return (
    <div>
      <div className="wka-note"><Info size={14} /> Your plan charges are computed from the licenses you hold. Extras are items the WorkCoPilot team recorded. To change your plan or add licenses, open a support ticket.</div>
      <div className="wka-panel">
        <h2>Statement for {b.name}</h2>
        {!lines.length ? <EmptyState title="No charges yet" detail="Charges appear once licenses or extras are on your account." />
          : (
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id || i}><td>{l.description || l.type}</td><td style={{ textAlign: 'right' }}>{l.qty != null ? l.qty : ''}</td><td style={{ textAlign: 'right' }}>{l.unitAmount != null ? money(l.unitAmount) : ''}</td><td style={{ textAlign: 'right' }}>{money(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} style={{ textAlign: 'right', color: 'var(--wka-muted)' }}>Recurring</td><td style={{ textAlign: 'right' }}>{money(b.recurringTotal)}</td></tr>
                  <tr><td colSpan={3} style={{ textAlign: 'right', color: 'var(--wka-muted)' }}>Extras</td><td style={{ textAlign: 'right' }}>{money(b.extrasTotal)}</td></tr>
                  <tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Total ({cur})</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(b.total)}</td></tr>
                </tfoot>
              </table>
            </div>
          )}
      </div>
    </div>
  )
}

// ===========================================================================
// AI keys
// ===========================================================================

// Relative time ("3 min ago") for the recommendation's computed-at stamp.
function AiSection() {
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState({ providerId: '', apiKey: '' })
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState(null)
  // Company's own web-search (Tavily) key - its own form + status.
  const [wsKey, setWsKey] = useState('')
  const [wsBusy, setWsBusy] = useState(false)
  const [wsOk, setWsOk] = useState('')
  const [wsErr, setWsErr] = useState(null)
  const load = useCallback(() => { api.workTeamAi().then((c) => setCompany(c || null)).catch((e) => setErr(e)) }, [])
  useEffect(() => { load() }, [load])

  const saveWs = async (clear) => {
    const key = clear ? '' : wsKey.trim()
    if (!clear && !key) return
    setWsBusy(true); setWsErr(null); setWsOk('')
    try { await api.workTeamSetWebSearch(key, 'tavily'); setWsKey(''); setWsOk(clear ? 'Web-search key removed.' : 'Web-search key saved.'); load() }
    catch (error) { setWsErr(error) } finally { setWsBusy(false) }
  }

  const save = async () => {
    if (!form.apiKey.trim()) return
    setBusy(true); setErr(null); setOk('')
    try { await api.workTeamSetAiKeys(form); setOk('Saved. WorkCoPilot now runs on your keys.'); setForm({ providerId: '', apiKey: '' }); load() }
    catch (error) { setErr(error) } finally { setBusy(false) }
  }
  const clear = async () => {
    setBusy(true); setErr(null); setOk('')
    try {
      // Say what ACTUALLY happened: the server restores the AI source the
      // WorkCoPilot team chose before your keys were added. If that choice was
      // "company keys", AI is unavailable until keys are set again (never a
      // silent switch to platform keys).
      const c = await api.workTeamSetAiKeys({ apiKey: '' })
      if (c && c.aiReady) setOk('Your keys were removed. Your company is back on the WorkCoPilot platform AI.')
      else setOk('Your keys were removed. Your company is set to run on its own AI keys, so guidance is paused until you add keys again or the WorkCoPilot team switches you to the platform AI.')
      load()
    } catch (error) { setErr(error) } finally { setBusy(false) }
  }

  const cur = company && company.companyAi
  return (
    <div>
      <div className="wka-panel">
        <h2>Current AI</h2>
        {cur
          ? <p className="desc">Key <code className="wka-mono">{cur.keyMasked}</code> is set. {cur.owner === 'company' ? 'These are your own keys, so usage bills to your provider account.' : 'These keys were set for you by the WorkCoPilot team.'}</p>
          : <p className="desc">No company keys set. Your company runs on the WorkCoPilot platform AI.</p>}
      </div>
      <div className="wka-panel">
        <h2>Use your own keys <Help text="Switch WorkCoPilot to your provider. Usage is then billed to your account, not ours. The key is stored securely and never shown back in full." /></h2>
        <div className="wka-formgrid">
          <div className="wka-field"><label>Provider</label><input className="wka-input" value={form.providerId} placeholder="your provider" onChange={(e) => setForm({ ...form, providerId: e.target.value })} /></div>
          <div className="wka-field"><label>API key</label><input className="wka-input" type="password" value={form.apiKey} placeholder="paste your provider API key" autoComplete="new-password" onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
        </div>
        {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
        {err && <ErrorBox error={err} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {cur && cur.owner === 'company' && <button type="button" className="wka-btn" disabled={busy} onClick={clear}>Remove my keys</button>}
          <button type="button" className="wka-btn primary" disabled={busy || !form.apiKey.trim()} onClick={save}>{busy ? <Spinning /> : <KeyRound size={14} />} Use my keys</button>
        </div>
      </div>

      <div className="wka-panel">
        <h2><Globe size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Live web learning <Help text="A Tavily key for live web learning. When set, this company's live web learning runs on your own key - your data boundary and billing." /></h2>
        <p className="desc">When set, this company&rsquo;s live web learning runs on your own key (your data boundary and billing). Guidance is then grounded in the latest web sources.</p>
        {company && company.webSearchConfigured
          ? <p className="desc">Configured on <b>{(company.webSearch && company.webSearch.provider) || 'tavily'}</b>, key <code className="wka-mono">{company.webSearch && company.webSearch.keyMasked}</code>{company.webSearch && company.webSearch.setAt ? `, set ${fmtDate(company.webSearch.setAt)}` : ''}.</p>
          : <p className="desc">No web-search key set for your company.</p>}
        <div className="wka-field" style={{ maxWidth: 420, margin: '4px 0 12px' }}>
          <label>Tavily API key</label>
          <input className="wka-input" type="password" autoComplete="new-password" value={wsKey} placeholder="paste your Tavily key" onChange={(e) => setWsKey(e.target.value)} />
        </div>
        {wsOk && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {wsOk}</div>}
        {wsErr && <ErrorBox error={wsErr} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {company && company.webSearchConfigured && <button type="button" className="wka-btn" disabled={wsBusy} onClick={() => saveWs(true)}>Remove key</button>}
          <button type="button" className="wka-btn primary" disabled={wsBusy || !wsKey.trim()} onClick={() => saveWs(false)}>{wsBusy ? <Spinning /> : <KeyRound size={14} />} Save key</button>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Governance (DLP) - company scoped, read-only when a superadmin has locked it
// ===========================================================================
const GOV_ACTIONS = ['send', 'mask', 'withhold', 'tokenize']
const GOV_ACTION_LABEL = { send: 'Send as-is', mask: 'Mask', withhold: 'Withhold', tokenize: 'Tokenize (on-device)' }
function GovernanceSection({ companyId }) {
  const [state, setState] = useState({ loading: true, error: null, policy: null, presets: {}, labels: {}, categories: [] })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  const load = useCallback(() => {
    if (!companyId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workPolicy(companyId)
      .then((r) => setState({ loading: false, error: null, policy: r.policy || {}, presets: r.presets || {}, labels: r.labels || {}, categories: r.categories || [] }))
      .catch((error) => setState((s) => ({ ...s, loading: false, error })))
  }, [companyId])
  useEffect(() => { load() }, [load])

  const p = state.policy
  const locked = !!(p && p.locked)
  const ro = locked // read-only for a company admin when a superadmin locked it
  const patchPolicy = (patch) => setState((s) => ({ ...s, policy: { ...s.policy, ...patch } }))
  const setCat = (cat, action) => setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), [cat]: action } } }))
  const applyPreset = (key) => { const preset = state.presets[key] || {}; setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), ...preset }, frameworks: Array.from(new Set([...(s.policy.frameworks || []), key])) } })) }
  const save = async () => {
    if (ro || saving || !p) return
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const r = await api.workSetPolicy({
        companyId, categories: p.categories || {}, blockWords: p.blockWords || [], frameworks: p.frameworks || [],
        customFields: (p.customFields || []).filter((f) => f && String(f.label || '').trim() && String(f.pattern || '').trim()),
        mode: p.mode || 'scrub', armed: !!p.armed,
      })
      setState((s) => ({ ...s, policy: r.policy })); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }

  if (state.loading) return <Loading label="Loading policy" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!p) return <EmptyState title="No policy" />

  return (
    <div>
      {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> This policy is locked by the WorkCoPilot team. Open a support ticket to change it.</div>}
      <div className="wka-panel">
        <h2>Compliance frameworks <Help text="Click a framework to seed sensible defaults, then fine-tune below." /></h2>
        <p className="desc">These are controls and audit evidence that support your compliance. They do not by themselves make your organization certified.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(state.presets).map((k) => (
            <button key={k} type="button" className={`wka-btn sm${(p.frameworks || []).includes(k) ? ' primary' : ''}`} disabled={ro} onClick={() => applyPreset(k)} title={state.labels[k] || k}>{k.toUpperCase().replace(/_/g, ' ')}</button>
          ))}
        </div>
      </div>

      <div className="wka-panel">
        <h2>What leaves the device, by category</h2>
        <p className="desc">For each kind of sensitive data: send as-is, mask, withhold, or tokenize (kept on-device and rebuilt in the response).</p>
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead><tr><th>Category</th><th>Action</th></tr></thead>
            <tbody>
              {state.categories.map((cat) => (
                <tr key={cat}><td style={{ textTransform: 'capitalize' }}>{cat}</td>
                  <td><select className="wka-select" value={(p.categories || {})[cat] || 'withhold'} disabled={ro} onChange={(e) => setCat(cat, e.target.value)}>
                    {GOV_ACTIONS.map((a) => <option key={a} value={a}>{GOV_ACTION_LABEL[a]}</option>)}
                  </select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Never send these words</h2>
        <p className="desc">Exact words or phrases that must never leave the device (one per line).</p>
        <textarea className="wka-input" style={{ width: '100%', minHeight: 92, resize: 'vertical' }} disabled={ro}
          value={(p.blockWords || []).join('\n')}
          onChange={(e) => patchPolicy({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
          placeholder={'Project Atlas\nacme-prod-db\ninternal codename'} />
        {(p.blockWords || []).length > 0 && (
          <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-amber)', display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> Blocking words can make an answer incomplete where a word is actually needed. WorkCoPilot never guesses a blocked value.
          </div>
        )}
      </div>

      <div className="wka-panel">
        <h2>Custom fields <Help text="Your own sensitive data types. Redact replaces with a [LABEL] tag; Block replaces with [BLOCKED]. Applied on the device before anything is sent." /></h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(p.customFields || []).map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto auto', gap: 8, alignItems: 'center' }}>
              <input className="wka-input" placeholder="Label (e.g. Employee ID)" disabled={ro} value={f.label || ''} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], label: e.target.value }; patchPolicy({ customFields: cf }) }} />
              <input className="wka-input" placeholder="Match: a word/phrase or /regex/" disabled={ro} value={f.pattern || ''} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], pattern: e.target.value }; patchPolicy({ customFields: cf }) }} />
              <select className="wka-select" disabled={ro} value={f.action || 'redact'} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], action: e.target.value }; patchPolicy({ customFields: cf }) }}>
                <option value="redact">Redact</option><option value="block">Block</option>
              </select>
              <button type="button" className="wka-btn sm ghost" disabled={ro} title="Remove" onClick={() => patchPolicy({ customFields: (p.customFields || []).filter((_, k) => k !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="wka-btn sm" style={{ marginTop: 10 }} disabled={ro} onClick={() => patchPolicy({ customFields: [...(p.customFields || []), { label: '', pattern: '', action: 'redact' }] })}><Plus size={13} /> Add custom field</button>
      </div>

      <div className="wka-panel">
        <h2>Mode and status</h2>
        <div className="wka-field" style={{ marginBottom: 16, maxWidth: 560 }}>
          <label>How sensitive data is handled</label>
          <select className="wka-select" value={p.mode || 'scrub'} disabled={ro} onChange={(e) => patchPolicy({ mode: e.target.value })}>
            <option value="scrub">Scrub: remove before sending (safest; answers may have gaps)</option>
            <option value="tokenize">Tokenize: keep on device and rebuild the full answer here (premium)</option>
          </select>
        </div>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.armed} disabled={ro} onChange={(e) => patchPolicy({ armed: e.target.checked })} /> Armed (enforced on every call)</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18 }}>
          <button type="button" className="wka-btn primary" disabled={ro || saving} onClick={save}>{saving ? <Spinning /> : <ShieldCheck size={14} />} Save policy</button>
          <SavedTag show={saved} />
          <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>version {p.version || 0}</span>
        </div>
        {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
      </div>
    </div>
  )
}

// ===========================================================================
// Activity
// ===========================================================================
function ActivitySection() {
  const [state, setState] = useState({ loading: true, error: null, items: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamActivity().then((r) => setState({ loading: false, error: null, items: r.activity || [] })).catch((error) => setState({ loading: false, error, items: [] }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label="Loading activity" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title="No activity yet" detail="Session deletions and other events across your company will appear here." />
  return (
    <div className="wka-panel">
      <h2>Recent activity</h2>
      <div className="wka-table-wrap">
        <table className="wka-table">
          <thead><tr><th>Who</th><th>What</th><th>Details</th><th>When</th></tr></thead>
          <tbody>
            {state.items.map((a) => (
              <tr key={a.id}>
                <td>{a.displayName || a.username || 'A user'}</td>
                <td>Deleted a session</td>
                <td style={{ color: 'var(--wka-muted)' }}>{(a.title && !/^Session \d/.test(a.title)) ? a.title : (a.goal || 'Untitled')}{a.reason ? ` - "${a.reason}"` : ''}</td>
                <td style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{fmtDT(a.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ===========================================================================
// Member sessions (oversight): a company admin can pull the report + audit log
// of any of their people's sessions, completed or in progress.
// ===========================================================================
function SessionsSection() {
  const [state, setState] = useState({ loading: true, error: null, items: null })
  const [filter, setFilter] = useState('all')   // all | active | ended
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workCompanySessions().then((r) => setState({ loading: false, error: null, items: r.sessions || [] })).catch((error) => setState({ loading: false, error, items: [] }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label="Loading sessions" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title="No sessions yet" detail="When your people run guided sessions they appear here - completed or in progress - and you can pull each report and audit log." />
  const items = state.items.filter((s) => filter === 'all' || (filter === 'active' ? s.status !== 'ended' : s.status === 'ended'))
  const chip = (s) => s.status === 'ended'
    ? <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}><Check size={12} style={{ verticalAlign: '-1px' }} /> Completed</span>
    : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wka-accent, #2563eb)' }}><Clock size={12} style={{ verticalAlign: '-1px' }} /> In progress</span>
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Member sessions</h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select className="wka-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: 32 }}>
            <option value="all">All</option>
            <option value="active">In progress</option>
            <option value="ended">Completed</option>
          </select>
          <button className="wka-btn sm ghost" onClick={load} title="Refresh"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>
      <p style={{ color: 'var(--wka-muted)', fontSize: 13, marginTop: 6 }}>Pull any session's report or its audit log (exactly what was sent to the AI) at any time. Scoped to your company only.</p>
      <div className="wka-table-wrap" style={{ marginTop: 8 }}>
        <table className="wka-table">
          <thead><tr><th>Who</th><th>Task</th><th>Status</th><th>Progress</th><th>Updated</th><th>Pull</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.user || 'A user'}</td>
                <td style={{ color: 'var(--wka-muted)' }}>{(s.title && !/^Session \d/.test(s.title)) ? s.title : (s.goal || 'Untitled')}</td>
                <td>{chip(s)}</td>
                <td style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{s.steps ? `${s.done}/${s.steps} steps` : '-'}</td>
                <td style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(s.lastActivityAt || s.startedAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a className="wka-btn sm" href={api.workReportUrl(s.id, true)} target="_blank" rel="noopener noreferrer" title="Download the session report (PDF)"><Download size={13} /> Report</a>
                  <a className="wka-btn sm ghost" href={api.workAuditUrl(s.id)} target="_blank" rel="noopener noreferrer" title="Download the audit log (exactly what was sent to the AI)" style={{ marginLeft: 6 }}><FileText size={13} /> Log</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ===========================================================================
// Settings and profile
// ===========================================================================
function SettingsSection({ viewer, company, onProfile }) {
  const [displayName, setDisplayName] = useState((viewer && viewer.displayName) || '')
  const [pBusy, setPBusy] = useState(false); const [pOk, setPOk] = useState(false); const [pErr, setPErr] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false); const [pwOk, setPwOk] = useState(false); const [pwErr, setPwErr] = useState(null)

  const saveProfile = async () => {
    setPBusy(true); setPErr(null); setPOk(false)
    try { const r = await api.workSetProfile({ displayName }); if (onProfile) onProfile(r.user); setPOk(true); setTimeout(() => setPOk(false), 2500) }
    catch (error) { setPErr(error) } finally { setPBusy(false) }
  }
  const changePassword = async () => {
    setPwErr(null); setPwOk(false)
    if (!pw.current || !pw.next) { setPwErr(new Error('Enter your current and new password.')); return }
    if (pw.next.length < 6) { setPwErr(new Error('The new password must be at least 6 characters.')); return }
    if (pw.next !== pw.confirm) { setPwErr(new Error('The new password and confirmation do not match.')); return }
    setPwBusy(true)
    try { await api.workChangePassword(pw.current, pw.next); setPwOk(true); setPw({ current: '', next: '', confirm: '' }); setTimeout(() => setPwOk(false), 2500) }
    catch (error) { setPwErr(error) } finally { setPwBusy(false) }
  }

  return (
    <div>
      <div className="wka-panel">
        <h2>Your profile</h2>
        <p className="desc">The name shown to your team. Your username is <b>{viewer ? viewer.username : ''}</b>.</p>
        <div className="wka-field" style={{ maxWidth: 420, marginBottom: 14 }}><label>Display name</label><input className="wka-input" value={displayName} maxLength={80} placeholder="e.g. Alex Morgan" onChange={(e) => setDisplayName(e.target.value)} /></div>
        {pErr && <ErrorBox error={pErr} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" className="wka-btn primary" disabled={pBusy} onClick={saveProfile}>{pBusy ? <Spinning /> : <Check size={14} />} Save</button><SavedTag show={pOk} /></div>
      </div>

      <div className="wka-panel">
        <h2>Change your password</h2>
        <p className="desc">Pick something at least 6 characters. You stay signed in on this device.</p>
        <div className="wka-formgrid" style={{ maxWidth: 640 }}>
          <div className="wka-field"><label>Current password</label><input className="wka-input" type="password" value={pw.current} autoComplete="current-password" onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div></div>
          <div className="wka-field"><label>New password</label><input className="wka-input" type="password" value={pw.next} autoComplete="new-password" onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div className="wka-field"><label>Confirm new password</label><input className="wka-input" type="password" value={pw.confirm} autoComplete="new-password" onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
        </div>
        {pwErr && <ErrorBox error={pwErr} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" className="wka-btn primary" disabled={pwBusy} onClick={changePassword}>{pwBusy ? <Spinning /> : <KeyRound size={14} />} Change password</button><SavedTag show={pwOk} /></div>
      </div>

      <div className="wka-panel">
        <h2>Company</h2>
        <p className="desc">Set by the WorkCoPilot team. Open a support ticket to change your plan or seats.</p>
        <div className="wca-kv">
          <div><span>Name</span><b>{company ? company.name : '-'}</b></div>
          <div><span>Plan</span><b style={{ textTransform: 'capitalize' }}>{company ? company.plan : '-'}</b></div>
          {/* User seats count MEMBERS only (admins have their own pool); showing
              userCount (members + admins) against the member seat total read as
              "3 of 2" for a company that was within its licenses. */}
          <div><span>User licenses</span><b>{company && company.seats > 0 ? `${company.memberCount != null ? company.memberCount : company.userCount} of ${company.seats}` : `${company ? (company.memberCount != null ? company.memberCount : company.userCount) : 0} (no limit)`}</b></div>
          <div><span>Admin seats</span><b>{company && company.adminSeats > 0 ? `${company.adminCount || 0} of ${company.adminSeats}` : `${company ? (company.adminCount || 0) : 0} (no limit)`}</b></div>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Shell
// ===========================================================================
export default function WorkCompanyAdmin() {
  const [active, setActive] = useState('overview')
  const [gate, setGate] = useState('loading') // loading | ready | denied | superadmin | signedout | error
  const [viewer, setViewer] = useState(null)
  const [company, setCompany] = useState(null)
  const [gateError, setGateError] = useState(null)

  const checkAccess = useCallback(async () => {
    setGate('loading'); setGateError(null)
    try {
      const r = await api.workMe()
      if (!r || !r.signedIn || !r.user) { setGate('signedout'); return }
      setViewer(r.user)
      if (r.user.role === 'superadmin' || r.user.role === 'admin') { setGate('superadmin'); return }
      if (r.user.companyRole !== 'company_admin') { setGate('denied'); return }
      setCompany({ id: r.user.companyId, name: r.user.companyName }) // seed while the full object loads
      setGate('ready')
      // Load the full company (createdAt, seats, plan, aiSource, SSO, trial) so
      // Overview and Settings show real values, not just the seeded name.
      api.workTeamAi().then((full) => { if (full) setCompany(full) }).catch(() => { /* keep the seed */ })
    } catch (error) { setGateError(error); setGate('error') }
  }, [])
  useEffect(() => { checkAccess() }, [checkAccess])

  const signOut = async () => { try { await api.workLogout() } catch { /* ignore */ } window.location.href = '/workcopilot' }
  const current = useMemo(() => SECTIONS.find((s) => s.id === active) || SECTIONS[0], [active])

  const Gate = ({ icon, title, body, action }) => (
    <div className="wka"><style>{WORKADMIN_CSS}{WCA_CSS}</style>
      <div className="wka-gate"><div className="box">{icon}<h2>{title}</h2><p>{body}</p>{action}</div></div>
    </div>
  )
  if (gate === 'loading') return <Gate icon={<Loader2 size={26} style={{ animation: 'wka-spin 0.8s linear infinite', color: 'var(--wka-accent)', marginBottom: 12 }} />} title="Checking access" body="One moment." />
  if (gate === 'signedout') return <Gate icon={<ShieldAlert size={30} />} title="Please sign in" body="Sign in with your company admin account to open this console." action={<a className="wka-btn primary" style={{ marginTop: 16 }} href="/workcopilot">Go to sign in</a>} />
  if (gate === 'superadmin') return <Gate icon={<ShieldCheck size={30} style={{ color: 'var(--wka-emerald)' }} />} title="Use the admin console" body="You are a WorkCoPilot administrator. The full admin console has everything across all companies." action={<a className="wka-btn primary" style={{ marginTop: 16 }} href="/work/admin">Open admin console</a>} />
  if (gate === 'denied') return <Gate icon={<ShieldAlert size={30} />} title="Company admin only" body="This console is for company administrators. If you manage a team and need access, ask your administrator or WorkCoPilot support." action={<a className="wka-btn" style={{ marginTop: 16 }} href="/work">Back to WorkCoPilot</a>} />
  if (gate === 'error') return <Gate icon={<ShieldAlert size={30} style={{ color: 'var(--wka-red)' }} />} title="Could not load the console" body={(gateError && gateError.message) || 'Please try again.'} action={<button type="button" className="wka-btn primary" style={{ marginTop: 16 }} onClick={checkAccess}>Try again</button>} />

  const renderSection = () => {
    switch (active) {
      case 'team': return <TeamSection meId={viewer && viewer.id} onCompany={setCompany} />
      case 'sso': return <SsoSection company={company} />
      case 'ai': return <AiSection />
      case 'billing': return <BillingSection />
      case 'governance': return <GovernanceSection companyId={viewer && viewer.companyId} />
      case 'sessions': return <SessionsSection />
      case 'tickets': return <SupportTickets mode="user" />
      case 'activity': return <ActivitySection />
      case 'settings': return <SettingsSection viewer={viewer} company={company} onProfile={(u) => setViewer(u)} />
      case 'overview':
      default: return <OverviewSection company={company} />
    }
  }

  return (
    <div className="wka"><style>{WORKADMIN_CSS}{WCA_CSS}</style>
      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand"><b>WorkCoPilot</b><span>Company admin</span></div>
        <div className="wka-top-right">
          {company ? <span className="wka-chip">{company.name}</span> : null}
          {viewer ? <span className="wka-chip ok">{viewer.displayName || viewer.username}</span> : null}
          <button type="button" className="wka-btn sm ghost" onClick={signOut} title="Sign out"><LogOut size={14} /> Sign out</button>
        </div>
      </header>
      <div className="wka-body">
        <nav className="wka-nav">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.id} className={`wka-nav-item${active === s.id ? ' active' : ''}`} role="button" tabIndex={0}
                onClick={() => setActive(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s.id) } }}>
                <Icon size={17} /><span className="label">{s.label}</span>
              </div>
            )
          })}
          <div className="wka-nav-foot">You are managing {company ? company.name : 'your company'}. You only ever see and change your own company.</div>
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

// Company-specific additions on top of the shared console CSS.
const WCA_CSS = `
.wca-help { display:inline-flex; vertical-align:middle; margin-left:6px; color:var(--wka-faint); cursor:help; }
.wca-help:hover, .wca-help:focus { color:var(--wka-accent); outline:none; }
.wca-kv { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px 26px; }
.wca-kv > div { display:flex; flex-direction:column; gap:3px; }
.wca-kv span { font-size:11px; color:var(--wka-faint); text-transform:uppercase; letter-spacing:0.6px; }
.wca-kv b { font-size:14px; color:var(--wka-text); font-weight:600; }
.wca-copy { display:inline-flex; align-items:center; gap:8px; vertical-align:middle; }
.wca-copy code { word-break:break-all; }
.wca-guide-head { display:flex; align-items:center; gap:8px; background:none; border:none; cursor:pointer; font:inherit; color:var(--wka-text); padding:0; width:100%; text-align:left; }
.wca-guide-head svg { color:var(--wka-accent); flex:none; }
.wca-guide { margin-top:14px; }
.wca-guide h3 { font-size:13.5px; font-weight:700; color:var(--wka-text); margin:18px 0 8px; }
.wca-guide-list, .wca-guide-steps { margin:0 0 6px; padding-left:20px; display:flex; flex-direction:column; gap:7px; }
.wca-guide-list li, .wca-guide-steps li { font-size:13px; color:var(--wka-muted); line-height:1.55; }
.wca-guide-list li b, .wca-guide-steps li b { color:var(--wka-text); }
.wca-scenario { margin-top:12px; padding:12px 14px; border:1px solid var(--wka-line); border-radius:10px; background:var(--wka-bg-2); }
.wca-scenario b { font-size:13px; color:var(--wka-text); }
.wca-scenario p { font-size:12.5px; color:var(--wka-muted); margin:5px 0 0; line-height:1.55; }
`
