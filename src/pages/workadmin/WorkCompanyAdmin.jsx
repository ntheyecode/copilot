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
  Building2, UserCog, RefreshCw,
} from 'lucide-react'
import { api } from '../../api.js'
import SupportTickets from '../../components/SupportTickets.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
import { Loading, ErrorBox, EmptyState, Spinning, SavedTag } from './sections/_shared.jsx'

const TIERS = [{ id: 'basic', name: 'Basic' }, { id: 'advanced', name: 'Advanced' }, { id: 'premium', name: 'Premium' }]
const ROLE_LABEL = { company_admin: 'Company admin', member: 'Member' }
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
const fmtDT = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`

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
  { id: 'governance', label: 'Data governance', icon: ShieldCheck, title: 'Data governance (DLP)', sub: 'Decide what sensitive data may leave the device. Controls and evidence that support your compliance.' },
  { id: 'tickets', label: 'Support', icon: LifeBuoy, title: 'Support', sub: 'Open a ticket and talk to the WorkCoPilot team.' },
  { id: 'activity', label: 'Activity', icon: ListChecks, title: 'Activity', sub: 'A record of what happened across your company.' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, title: 'Settings and profile', sub: 'Your profile, your password, and your company details.' },
]

// ===========================================================================
// Overview
// ===========================================================================
function OverviewSection({ company }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamConsumption()
      .then((d) => setState({ loading: false, error: null, data: d }))
      .catch((error) => setState({ loading: false, error, data: null }))
  }, [])
  useEffect(() => { load() }, [load])

  const seats = company ? (company.seats || 0) : 0
  const used = company ? (company.userCount || 0) : 0
  const seatLabel = seats > 0 ? `${used} of ${seats}` : `${used}`
  const d = state.data

  return (
    <div>
      <div className="wka-cards">
        <div className="wka-card">
          <div className="k"><Users size={15} /> Seats in use</div>
          <div className="v">{seatLabel}</div>
          <div className="foot">{seats > 0 ? `${Math.max(0, seats - used)} seats left` : 'No seat limit set'}</div>
        </div>
        <div className="wka-card">
          <div className="k"><UserCog size={15} /> Company admins</div>
          <div className="v">{company ? (company.adminCount || 0) : 0}</div>
          <div className="foot">People who can manage this console</div>
        </div>
        <div className="wka-card accent">
          <div className="k"><Cpu size={15} /> AI consumption</div>
          <div className="v">{state.loading ? '...' : money(d && d.totalUsd)}</div>
          <div className="foot">{state.loading ? 'Loading' : `${(d && d.sessionCount) || 0} guided sessions so far`}</div>
        </div>
        <div className="wka-card">
          <div className="k"><Building2 size={15} /> Free trial</div>
          <div className="v">{company && company.trial ? company.trial.remaining : 0}</div>
          <div className="foot">Pooled trial sessions left</div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Company</h2>
        <p className="desc">The essentials for {company ? company.name : 'your company'}. Your plan and seats are set by the WorkCoPilot team; open a support ticket to change them.</p>
        <div className="wca-kv">
          <div><span>Name</span><b>{company ? company.name : '-'}</b></div>
          <div><span>Plan</span><b style={{ textTransform: 'capitalize' }}>{company ? company.plan : '-'}</b></div>
          <div><span>AI source</span><b>{company && company.aiSource === 'company' ? 'Your own keys' : company && company.aiSource === 'platform' ? 'WorkCoPilot platform' : 'Not set'}</b></div>
          <div><span>Single sign-on</span><b>{company && company.sso && company.sso.connected ? `Connected (${company.sso.provider})` : 'Not connected'}</b></div>
          <div><span>Image generation</span><b>{company && company.imageGen ? 'On' : 'Off'}</b></div>
          <div><span>Created</span><b>{company ? fmtDate(company.createdAt) : '-'}</b></div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Who is using AI <Help text="Estimated spend per person, from the AI cost we meter on every guided session. Useful for spotting who needs a bigger plan." /></h2>
        {state.loading ? <Loading label="Loading consumption" /> : state.error ? <ErrorBox error={state.error} onRetry={load} />
          : !d || !d.byUser || !d.byUser.length ? <EmptyState title="No usage yet" detail="AI consumption will appear here once your team starts guiding." />
            : (
              <div className="wka-table-wrap">
                <table className="wka-table">
                  <thead><tr><th>Person</th><th>Sessions</th><th>Estimated spend</th></tr></thead>
                  <tbody>
                    {d.byUser.map((u) => (
                      <tr key={u.id}><td>{u.displayName || u.username}</td><td>{u.sessions}</td><td>{money(u.usd)}</td></tr>
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
  const [users, setUsers] = useState(null)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', companyRole: 'member', tier: 'basic' })
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState('')

  const load = useCallback(() => {
    setErr(null)
    api.workCompanyUsers()
      .then((r) => { setUsers(r.users || []); if (onCompany) onCompany(r.company || null) })
      .catch((error) => { setErr(error); setUsers([]) })
  }, [onCompany])
  useEffect(() => { load() }, [load])

  const create = async () => {
    const username = form.username.trim()
    if (!username || !form.password) { setErr(new Error('Enter a username and a temporary password.')); return }
    setBusy(true); setErr(null); setOk('')
    try {
      await api.workCompanyCreateUser({ username, password: form.password, companyRole: form.companyRole, tier: form.tier })
      setOk(`Added ${username}.`); setForm({ username: '', password: '', companyRole: 'member', tier: 'basic' }); setAdding(false); load()
    } catch (error) { setErr(error) } finally { setBusy(false) }
  }
  const patchUser = async (u, patch) => {
    setRowBusy(u.id); setErr(null); setOk('')
    try { await api.workCompanyUpdateUser(u.id, patch); setOk(`Updated ${u.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const removeUser = async (u) => {
    if (!window.confirm(`Remove ${u.displayName || u.username} from the company? They lose access right away. This can be undone by support.`)) return
    setRowBusy(u.id); setErr(null); setOk('')
    try { await api.workCompanyRemoveUser(u.id); setOk(`Removed ${u.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }

  return (
    <div>
      <div className="wka-toolbar">
        <button type="button" className="wka-btn primary" onClick={() => { setErr(null); setOk(''); setAdding((v) => !v) }}><Plus size={14} /> Add user</button>
        <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>New people sign in with the username and temporary password you set.</span>
      </div>

      {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
      {err && <ErrorBox error={err} />}

      {adding && (
        <div className="wka-panel">
          <h2>Add a user</h2>
          <p className="desc">They join your company right away. Share the temporary password with them; they can change it later from their own settings.</p>
          <div className="wka-formgrid">
            <div className="wka-field"><label>Username</label><input className="wka-input" value={form.username} maxLength={60} autoComplete="off" placeholder="e.g. alex" onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="wka-field"><label>Temporary password</label><input className="wka-input" type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder="at least 6 characters" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="wka-field"><label>Role <Help text="Company admins can manage this console. Members just use WorkCoPilot." /></label>
              <select className="wka-select" value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
                <option value="member">Member</option><option value="company_admin">Company admin</option>
              </select>
            </div>
            <div className="wka-field"><label>Plan <Help text="Daily guiding time: Basic 2h, Advanced 4h, Premium 6h." /></label>
              <select className="wka-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="wka-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="wka-btn primary" disabled={busy} onClick={create}>{busy ? <Spinning /> : <Plus size={14} />} Add user</button>
          </div>
        </div>
      )}

      <div className="wka-panel">
        <h2>People <Help text="Change a person's role or plan inline. Removing someone detaches them from the company and signs them out everywhere." /></h2>
        {users == null ? <Loading label="Loading your team" />
          : users.length === 0 ? <EmptyState title="No users yet" detail="Add your first teammate to get started." />
            : (
              <div className="wka-table-wrap">
                <table className="wka-table">
                  <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Added</th><th></th></tr></thead>
                  <tbody>
                    {users.map((u) => {
                      const self = String(u.id) === String(meId)
                      return (
                        <tr key={u.id}>
                          <td>{u.displayName || u.username}<div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{u.username}{self ? ' (you)' : ''}</div></td>
                          <td>
                            <select className="wka-select" value={u.companyRole || 'member'} disabled={self || rowBusy === u.id}
                              title={self ? 'You cannot change your own role.' : ''}
                              onChange={(e) => patchUser(u, { companyRole: e.target.value })}>
                              <option value="member">Member</option><option value="company_admin">Company admin</option>
                            </select>
                          </td>
                          <td>
                            <select className="wka-select" value={u.tier || 'basic'} disabled={rowBusy === u.id} onChange={(e) => patchUser(u, { tier: e.target.value })}>
                              {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          <td style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{fmtDate(u.createdAt)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {rowBusy === u.id ? <Spinning /> : <button type="button" className="wka-btn sm ghost" disabled={self} title={self ? 'You cannot remove yourself.' : 'Remove from company'} onClick={() => removeUser(u)}><Trash2 size={13} /></button>}
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
function SsoSection() {
  const [state, setState] = useState({ loading: true, error: null, sso: null })
  const [form, setForm] = useState({ provider: 'google', issuer: '', clientId: '', clientSecret: '', domain: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/work/sso/callback` : '/api/work/sso/callback'

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
  const connected = state.sso && state.sso.connected
  return (
    <div>
      <div className="wka-note"><Info size={14} /> After you save, add this callback URL in your identity provider: <code className="wka-mono" style={{ marginLeft: 6 }}>{callbackUrl}</code></div>
      <div className="wka-panel">
        <h2>{connected ? 'SSO is connected' : 'Connect single sign-on'} {connected ? <span className="wka-badge active" style={{ marginLeft: 6 }}>{state.sso.provider}</span> : null}</h2>
        <p className="desc">Your people sign in with your identity provider. Anyone whose email ends in your domain is matched to this company automatically.</p>
        <div className="wka-formgrid">
          <div className="wka-field"><label>Provider</label>
            <select className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="google">Google</option><option value="microsoft">Microsoft</option><option value="okta">Okta</option>
            </select>
          </div>
          <div className="wka-field"><label>Email domain <Help text="The part after the @ in your users' email, for example acme.com. Used to route sign-ins to your company." /></label><input className="wka-input" value={form.domain} placeholder="acme.com" onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          <div className="wka-field"><label>Issuer URL <Help text="Your provider's OpenID issuer, a full https URL. Google: https://accounts.google.com" /></label><input className="wka-input" value={form.issuer} placeholder="https://accounts.google.com" onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
          <div className="wka-field"><label>Client ID</label><input className="wka-input" value={form.clientId} placeholder="from your provider" onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
          <div className="wka-field"><label>Client secret <Help text="Write-only. Leave blank to keep the stored secret unchanged." /></label><input className="wka-input" type="password" value={form.clientSecret} placeholder={connected ? 'leave blank to keep current' : 'from your provider'} autoComplete="new-password" onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="wka-btn primary" disabled={saving} onClick={save}>{saving ? <Spinning /> : <ShieldCheck size={14} />} Save SSO</button>
          <SavedTag show={saved} />
        </div>
        {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
      </div>
    </div>
  )
}

// ===========================================================================
// AI keys
// ===========================================================================
function AiSection() {
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState({ providerId: '', apiKey: '', chatModel: '', visionModel: '' })
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState(null)
  const load = useCallback(() => { api.workTeamAi().then((c) => setCompany(c || null)).catch((e) => setErr(e)) }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.apiKey.trim()) return
    setBusy(true); setErr(null); setOk('')
    try { await api.workTeamSetAiKeys(form); setOk('Saved. WorkCoPilot now runs on your keys.'); setForm({ providerId: '', apiKey: '', chatModel: '', visionModel: '' }); load() }
    catch (error) { setErr(error) } finally { setBusy(false) }
  }
  const clear = async () => {
    setBusy(true); setErr(null); setOk('')
    try { await api.workTeamSetAiKeys({ apiKey: '' }); setOk('Your keys were removed. You are back on the platform AI.'); load() }
    catch (error) { setErr(error) } finally { setBusy(false) }
  }

  const cur = company && company.companyAi
  return (
    <div>
      <div className="wka-panel">
        <h2>Current AI</h2>
        {cur
          ? <p className="desc">Running on <b>{cur.providerId || 'your provider'}</b>, key <code className="wka-mono">{cur.keyMasked}</code>, model {cur.chatModel || 'default'}. {cur.owner === 'company' ? 'These are your own keys, so usage bills to your provider account.' : 'These keys were set for you by the WorkCoPilot team.'}</p>
          : <p className="desc">No company keys set. Your company runs on the WorkCoPilot platform AI.</p>}
      </div>
      <div className="wka-panel">
        <h2>Use your own keys <Help text="Switch WorkCoPilot to your provider. Usage is then billed to your account, not ours. The key is stored securely and never shown back in full." /></h2>
        <div className="wka-formgrid">
          <div className="wka-field"><label>Provider</label><input className="wka-input" value={form.providerId} placeholder="gemini, openai, groq..." onChange={(e) => setForm({ ...form, providerId: e.target.value })} /></div>
          <div className="wka-field"><label>API key</label><input className="wka-input" type="password" value={form.apiKey} placeholder="paste your provider API key" autoComplete="new-password" onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
          <div className="wka-field"><label>Chat model <span className="hint">optional</span></label><input className="wka-input" value={form.chatModel} placeholder="e.g. gpt-4o-mini" onChange={(e) => setForm({ ...form, chatModel: e.target.value })} /></div>
          <div className="wka-field"><label>Vision model <span className="hint">reads the screen</span></label><input className="wka-input" value={form.visionModel} placeholder="e.g. gpt-4o, gemini-1.5-flash" onChange={(e) => setForm({ ...form, visionModel: e.target.value })} /></div>
        </div>
        {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
        {err && <ErrorBox error={err} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {cur && cur.owner === 'company' && <button type="button" className="wka-btn" disabled={busy} onClick={clear}>Remove my keys</button>}
          <button type="button" className="wka-btn primary" disabled={busy || !form.apiKey.trim()} onClick={save}>{busy ? <Spinning /> : <KeyRound size={14} />} Use my keys</button>
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
          <div><span>Seats</span><b>{company && company.seats > 0 ? `${company.userCount} of ${company.seats}` : `${company ? company.userCount : 0} (no limit)`}</b></div>
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
      case 'sso': return <SsoSection />
      case 'ai': return <AiSection />
      case 'governance': return <GovernanceSection companyId={viewer && viewer.companyId} />
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
`
