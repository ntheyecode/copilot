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
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  LayoutDashboard, Users, ShieldCheck, Cpu, LifeBuoy, ListChecks, Settings as SettingsIcon,
  Loader2, ShieldAlert, LogOut, Plus, Trash2, Check, Info, KeyRound, Lock, AlertTriangle,
  Building2, UserCog, RefreshCw, Receipt, Copy, Clock, Mail, ChevronDown, ChevronRight,
  FileText, Download, Activity, Globe, Upload, Brain, X, Blocks,
} from 'lucide-react'
import { api } from '../../api.js'
import SupportTickets from '../../components/SupportTickets.jsx'
import CompanyBrain from './sections/CompanyBrain.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
import { Loading, ErrorBox, EmptyState, Spinning, SavedTag, RecRow, EditToggle, useReasonModal } from './sections/_shared.jsx'
import * as SSO from '../../shared/sso_guide.js'

// Destructive confirms use the shared promise-style useReasonModal from
// sections/_shared.jsx (single source - SUPREME RULE II; the local copy was deleted).

const TIERS = [{ id: 'basic', name: 'Basic' }, { id: 'advanced', name: 'Advanced' }, { id: 'premium', name: 'Premium' }]
const ROLE_LABEL = { company_admin: 'Company admin', member: 'Member', executive: 'Executive' }
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
  { id: 'brain', label: 'Company Brain', icon: Brain, title: 'Company Brain', sub: 'What is in your company\'s private knowledge store. Documents are added from the desktop app, scrubbed on the device first; here you can see them and remove any.' },
  { id: 'alerts', label: 'Alerts', icon: ShieldAlert, title: 'Security alerts', sub: 'When one of your people enters sensitive data (PII / PHI), it is redacted on their device before anything is sent, and you are told who, where and what kind - never the values themselves.' },
  { id: 'integrations', label: 'SOC / SIEM', icon: Globe, title: 'SOC / SIEM integrations', sub: 'Relay security alerts automatically into your SIEM, SOAR, chat and observability tools. Only alert metadata is ever sent - the kind and count of what was redacted plus who and where - never the values.' },
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
  const [baseline, setBaseline] = useState('0')   // last-saved value, for Cancel
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const [purged, setPurged] = useState(null)
  const load = useCallback(() => {
    api.workTeamRetention().then((d) => { const v = String(d.retentionDays ?? 0); setDays(v); setBaseline(v); setEditing(false); setLoaded(true) }).catch((e) => { setErr(e); setLoaded(true) })
  }, [])
  useEffect(() => { load() }, [load])
  const save = async () => {
    if (saving) return
    const n = Number(days)
    setSaving(true); setErr(null); setSaved(false); setPurged(null)
    try { const r = await api.workTeamSetRetention(n); const v = String(r.retentionDays); setDays(v); setBaseline(v); setPurged(r.purged || 0); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2400) }
    catch (e) { setErr(e) } finally { setSaving(false) }
  }
  const cancel = () => { setDays(baseline); setErr(null); setSaved(false); setEditing(false) }
  if (!loaded) return null
  const n = Number(days)
  const recLabel = Number(baseline) > 0 ? `${baseline} day${Number(baseline) === 1 ? '' : 's'}` : 'Keep forever (no automatic deletion)'
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Data retention</h2>
        {!editing ? <EditToggle editing={editing} onEdit={() => { setDays(baseline); setEditing(true); setErr(null) }} /> : null}
      </div>
      <p className="desc">Automatically delete your company's sessions (and their milestone screenshots and audit log) older than this many days. <b>0 keeps them forever.</b> You control this for your company; people can still delete their own sessions anytime. Applied on an hourly sweep.</p>
      {!editing ? (
        <>
          <div className="wka-record"><RecRow label="Retention window" value={recLabel} /></div>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <SavedTag show={saved} />
        </>
      ) : (
        <>
          <div className="wka-field" style={{ maxWidth: 260 }}>
            <label>Retention window (days)</label>
            <input className="wka-input" type="number" min="0" max="3650" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
            <span className="hint">{n > 0 ? `Sessions older than ${n} day${n === 1 ? '' : 's'} are purged.` : 'Keep forever (no automatic deletion).'}</span>
          </div>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button type="button" className="wka-btn primary" disabled={saving || !Number.isInteger(n) || n < 0 || n > 3650} onClick={save}>{saving ? <Spinning /> : null} Save retention</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> Cancel</button>
            <SavedTag show={saved} />
            {purged != null && purged > 0 ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>Purged {purged} session{purged === 1 ? '' : 's'} now.</span> : null}
          </div>
        </>
      )}
    </div>
  )
}

// Company knowledge base: the learnings WorkCoPilot has accumulated for this
// company (treated as current, overriding older model memory). The company
// admin can back it up, restore it, and clear it. Every destructive action
// (replace-on-restore, clear) captures a reason and is logged to the audit
// trail (platform-wide rule: destructive actions need a reason + a log entry).
function KnowledgeBaseCard() {
  const [count, setCount] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  // clear
  const [clearReason, setClearReason] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  // restore
  const [file, setFile] = useState(null)
  const [restoreMode, setRestoreMode] = useState('merge') // 'merge' | 'replace'
  const [restoreReason, setRestoreReason] = useState('')
  const fileRef = useRef(null)

  const load = useCallback(() => {
    api.workTeamLearnings().then((d) => { setCount(d.count ?? 0); setLoaded(true) }).catch((e) => { setErr(e); setLoaded(true) })
  }, [])
  useEffect(() => { load() }, [load])

  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }

  const doClear = async () => {
    if (busy) return
    const reason = clearReason.trim()
    if (reason.length < 3) { setErr(new Error('A reason is required to clear the knowledge base.')); return }
    setBusy(true); setErr(null); setDone(null)
    try {
      const r = await api.workTeamClearLearnings(reason)
      setCount(0); setClearReason(''); setConfirmClear(false)
      flash(`Cleared ${r.cleared ?? 0} entr${(r.cleared === 1) ? 'y' : 'ies'}. Logged to the audit trail.`)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const doRestore = async () => {
    if (busy || !file) return
    if (restoreMode === 'replace' && restoreReason.trim().length < 3) {
      setErr(new Error('Replacing the current knowledge base is destructive - a reason is required.')); return
    }
    setBusy(true); setErr(null); setDone(null)
    try {
      const text = await file.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { throw new Error('That file is not valid JSON. Upload a backup exported from this page.') }
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.learnings) ? parsed.learnings : (Array.isArray(parsed.kb) ? parsed.kb : null))
      if (!arr) throw new Error('No learnings found in that file. Expected a JSON array (or { learnings: [...] }).')
      const r = await api.workTeamImportLearnings(arr, restoreMode, restoreReason.trim() || undefined)
      setCount(r.count ?? arr.length)
      setFile(null); setRestoreReason(''); if (fileRef.current) fileRef.current.value = ''
      flash(`Restored ${r.imported ?? arr.length} entr${(r.imported === 1) ? 'y' : 'ies'} (${restoreMode}).${restoreMode === 'replace' ? ' Logged to the audit trail.' : ''}`)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (!loaded) return null
  return (
    <div className="wka-panel">
      <h2><Brain size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Knowledge base</h2>
      <p className="desc">
        WorkCoPilot keeps a private, company-scoped knowledge base: the up-to-date facts it has learned while guiding your team, treated as current so guidance does not drift to stale model memory. It stays inside your company. You can back it up, restore from a backup, or clear it.
      </p>
      <div className="wka-field" style={{ maxWidth: 360 }}>
        <label>Entries stored</label>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wka-text)' }}>{count}</div>
        <span className="hint">Private to your company. Redacted of secrets and personal data on the way in.</span>
      </div>

      {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-cyan)' }}><Check size={14} /> {done}</div> : null}

      {/* Backup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="wka-btn" href={api.workTeamLearningsExportUrl()} download={`workcopilot-kb-backup.json`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Download backup (JSON)
        </a>
        <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>A snapshot you can store off-platform and restore later.</span>
      </div>

      {/* Restore */}
      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label><Upload size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Restore from a backup</label>
          <input ref={fileRef} className="wka-input" type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          <span className="hint">Upload a backup file exported above.</span>
        </div>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label>Mode</label>
          <select className="wka-input" value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
            <option value="merge">Merge - add these entries, keep existing (safe)</option>
            <option value="replace">Replace - wipe current, then import (destructive)</option>
          </select>
        </div>
        {restoreMode === 'replace' && (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label>Reason (required - this replaces the current knowledge base)</label>
            <textarea className="wka-input" rows={2} value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} placeholder="e.g. Restoring last week's backup after an accidental clear" />
          </div>
        )}
        <button type="button" className="wka-btn primary" disabled={busy || !file} onClick={doRestore}>{busy ? <Spinning /> : <Upload size={14} />} Restore backup</button>
      </div>

      {/* Clear */}
      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        {!confirmClear ? (
          <button type="button" className="wka-btn danger" disabled={busy || !count} onClick={() => { setConfirmClear(true); setErr(null) }}>
            <Trash2 size={14} /> Clear knowledge base
          </button>
        ) : (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />This permanently deletes all {count} entries. Reason required.</label>
            <textarea className="wka-input" rows={2} value={clearReason} onChange={(e) => setClearReason(e.target.value)} placeholder="e.g. Rebuilding the knowledge base from scratch for a new engagement" />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="wka-btn danger" disabled={busy} onClick={doClear}>{busy ? <Spinning /> : <Trash2 size={14} />} Confirm clear</button>
              <button type="button" className="wka-btn" disabled={busy} onClick={() => { setConfirmClear(false); setClearReason(''); setErr(null) }}>Cancel</button>
            </div>
            <span className="hint">We recommend downloading a backup first. This action is logged to your audit trail.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Company skills: the playbooks / SOPs / skills members add to align guidance
// with how the company works. Parallel to the knowledge-base card: download a
// JSON backup, re-upload (merge or replace), or clear - with replace and clear
// reason-gated and logged (platform-wide destructive-action rule). Private to
// the company; never used to train the platform.
function SkillsBackupCard() {
  const [count, setCount] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [clearReason, setClearReason] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [file, setFile] = useState(null)
  const [restoreMode, setRestoreMode] = useState('merge') // 'merge' | 'replace'
  const fileRef = useRef(null)

  const load = useCallback(() => {
    api.workSkills().then((d) => { setCount(((d && d.skills) || []).length); setLoaded(true) }).catch((e) => { setErr(e); setLoaded(true) })
  }, [])
  useEffect(() => { load() }, [load])
  const flash = (msg) => { setDone(msg); setTimeout(() => setDone(null), 3200) }

  const doClear = async () => {
    if (busy) return
    const reason = clearReason.trim()
    if (reason.length < 3) { setErr(new Error('A reason is required to clear the company skills.')); return }
    setBusy(true); setErr(null); setDone(null)
    try {
      const r = await api.workTeamSkillsClear(reason)
      setCount(0); setClearReason(''); setConfirmClear(false)
      flash(`Cleared ${r && r.cleared != null ? r.cleared : 'all'} skill${r && r.cleared === 1 ? '' : 's'}. Logged to the audit trail.`)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const doRestore = async () => {
    if (busy || !file) return
    setBusy(true); setErr(null); setDone(null)
    try {
      const text = await file.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { throw new Error('That file is not valid JSON. Upload a backup exported from this page.') }
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.skills) ? parsed.skills : null)
      if (!arr) throw new Error('No skills found in that file. Expected a JSON array (or { skills: [...] }).')
      const r = await api.workTeamSkillsImport(arr, restoreMode === 'replace')
      setCount(r && r.count != null ? r.count : arr.length)
      setFile(null); if (fileRef.current) fileRef.current.value = ''
      flash(`Re-uploaded ${r && r.imported != null ? r.imported : arr.length} skill${(r && r.imported === 1) ? '' : 's'} (${restoreMode}).${restoreMode === 'replace' ? ' Logged to the audit trail.' : ''}`)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (!loaded) return null
  return (
    <div className="wka-panel">
      <h2><Blocks size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />Company skills</h2>
      <p className="desc">
        Skills are the playbooks, SOPs and skills your people add (from any AI) so guidance aligns with your tools, standards and terminology. They are private to your company and are never used to train the platform. Download a backup, re-upload it, or clear them.
      </p>
      <div className="wka-field" style={{ maxWidth: 360 }}>
        <label>Skills stored</label>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wka-text)' }}>{count}</div>
        <span className="hint">Shared across your company. Members add and remove their own from the dashboard.</span>
      </div>

      {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {done}</div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="wka-btn" href={api.workTeamSkillsExportUrl()} download="workcopilot-skills-backup.json" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Download skills (JSON)
        </a>
        <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>Your copy, to keep off-platform or move elsewhere.</span>
      </div>

      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label><Upload size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Re-upload skills</label>
          <input ref={fileRef} className="wka-input" type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          <span className="hint">Upload a skills file exported above.</span>
        </div>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label>Mode</label>
          <select className="wka-input" value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
            <option value="merge">Merge - add these skills, keep existing (safe)</option>
            <option value="replace">Replace - wipe current, then import (destructive)</option>
          </select>
        </div>
        <button type="button" className="wka-btn primary" disabled={busy || !file} onClick={doRestore}>{busy ? <Spinning /> : <Upload size={14} />} Re-upload</button>
      </div>

      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        {!confirmClear ? (
          <button type="button" className="wka-btn danger" disabled={busy || !count} onClick={() => { setConfirmClear(true); setErr(null) }}>
            <Trash2 size={14} /> Clear company skills
          </button>
        ) : (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />This permanently deletes all {count} skills. Reason required.</label>
            <textarea className="wka-input" rows={2} value={clearReason} onChange={(e) => setClearReason(e.target.value)} placeholder="e.g. Replacing the playbooks after the process overhaul" />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="wka-btn danger" disabled={busy} onClick={doClear}>{busy ? <Spinning /> : <Trash2 size={14} />} Confirm clear</button>
              <button type="button" className="wka-btn" disabled={busy} onClick={() => { setConfirmClear(false); setClearReason(''); setErr(null) }}>Cancel</button>
            </div>
            <span className="hint">We recommend downloading a backup first. This action is logged to your audit trail.</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Enterprise deployment: the signed, per-machine MSI for IT to push across the
// network, plus the silent-install command. Company-admin only (the MSI download
// endpoint is gated to company admins/superadmin; this card simply surfaces it).
function EnterpriseDeployCard() {
  const [msi, setMsi] = useState(undefined)   // undefined=loading, null=not available/not permitted
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let alive = true
    api.workAppStatus().then((s) => { if (alive) setMsi((s && s.msi) || null) }).catch(() => { if (alive) setMsi(null) })
    return () => { alive = false }
  }, [])
  const cmd = (msi && msi.silentCommand) || 'msiexec /i WorkCoPilot-Setup.msi /qn /norestart'
  const copy = async () => { try { await navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }
  return (
    <div className="wka-panel">
      <h2><Download size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Enterprise deployment (MSI)</h2>
      <p className="desc">A signed, per-machine Windows Installer for pushing WorkCoPilot across your network with Group Policy, SCCM, or Intune. Only your company admins can download it.</p>
      {msi === undefined ? <Loading label="Checking the installer" />
        : !msi || !msi.available ? (
          <div className="wka-note"><Info size={14} /> The MSI is not published yet. Your EXE and the signed MSI are produced together; check back shortly or contact support.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <a className="wka-btn primary" href="/api/work/app/msi" download><Download size={14} /> Download MSI (signed, per-machine)</a>
              <span className="wka-badge active">{msi.version ? `v${msi.version} · ` : ''}COE Security LLC</span>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--wka-faint)' }}>Silent install (run as admin / SYSTEM)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 6, maxWidth: 560 }}>
              <code className="wka-mono" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--wka-line)', background: 'var(--wka-panel-2)', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>{cmd}</code>
              <button type="button" className="wka-btn sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--wka-muted)', lineHeight: 1.55 }}>
              <div><b>Group Policy:</b> assign the MSI under Computer Configuration → Software Settings → Software installation; it installs per-machine at startup.</div>
              <div><b>SCCM / Intune:</b> import as a line-of-business app using the command above. Uninstall: <code className="wka-mono">msiexec /x WorkCoPilot-Setup.msi /qn</code>.</div>
              <div style={{ marginTop: 6, color: 'var(--wka-faint)' }}>Installs to Program Files for all users and does not auto-launch, so it is safe to deploy unattended.</div>
            </div>
          </>
        )}
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
      <KnowledgeBaseCard />
      <SkillsBackupCard />
      <EnterpriseDeployCard />

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
      const email = form.email.trim().toLowerCase()
      if (!username) { setErr(new Error('Enter a username.')); return }
      if (!email.includes('@')) { setErr(new Error('Enter the person\'s email so they can set their own password.')); return }
      setBusy(true)
      try {
        // Password is optional: leave it blank and the person sets their own via
        // the emailed set-password link (recommended). A password typed here is
        // honored, but the link is still emailed.
        await api.workCompanyCreateUser({ username, email, ...(form.password ? { password: form.password } : {}), companyRole: form.companyRole, tier: form.tier })
        setOk(`Added ${username}. A set-password link was emailed to ${email}.`); setForm({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic' }); setAdding(false); load()
      } catch (error) { setErr(error) } finally { setBusy(false) }
    }
  }
  const patchUser = async (m, patch) => {
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyUpdateUser(m.id, patch); setOk(`Updated ${m.displayName || m.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const [askReason, reasonModal] = useReasonModal()
  const removeUser = async (m) => {
    const reason = await askReason({
      title: `Remove ${m.displayName || m.username} from the company?`,
      detail: 'They lose access right away. This can be undone by support.',
      confirmLabel: 'Confirm remove',
    })
    if (!reason || reason.length < 3) return
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyRemoveUser(m.id, reason); setOk(`Removed ${m.displayName || m.username}.`); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const resetMfa = async (m) => {
    const reason = await askReason({
      title: `Reset two-factor for ${m.displayName || m.username}?`,
      detail: 'They will be signed out and asked to set up their authenticator again on next sign-in. Use this when someone loses their phone.',
      confirmLabel: 'Reset authenticator',
    })
    if (!reason || reason.length < 3) return
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyResetUserMfa(m.id, reason); setOk(`Reset two-factor for ${m.displayName || m.username}.`); load() }
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
      {reasonModal}
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
            : <p className="desc">For a person without SSO. They get a set-password link by email and choose their own password. A temporary password here is optional.</p>}
          <div className="wka-formgrid">
            {mode === 'email' ? (
              <>
                <div className="wka-field"><label>Work email</label><input className="wka-input" value={form.email} maxLength={160} autoComplete="off" placeholder="alex@yourcompany.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="wka-field"><label>Name <span className="hint">optional</span></label><input className="wka-input" value={form.displayName} maxLength={80} placeholder="e.g. Alex Morgan" onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div className="wka-field"><label>Username</label><input className="wka-input" value={form.username} maxLength={60} autoComplete="off" placeholder="e.g. alex" onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div className="wka-field"><label>Email <Help text="The person gets a set-password link at this address, so they choose their own password. Required." /></label><input className="wka-input" type="email" value={form.email} maxLength={160} autoComplete="off" placeholder="alex@yourcompany.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="wka-field"><label>Temporary password <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>(optional)</span></label><input className="wka-input" type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder="leave blank - they set it from the email" onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </>
            )}
            <div className="wka-field"><label>Role <Help text="Members just use WorkCoPilot. Executives get the read-only productivity dashboard. Company admins can manage this console (a separate seat pool)." /></label>
              <select className="wka-select" value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
                <option value="member">Member</option><option value="executive">Executive (productivity dashboard, read-only)</option><option value="company_admin">Company admin</option>
              </select>
            </div>
            <div className="wka-field"><label>Plan <Help text="Each plan includes a daily guiding-time allowance set by the WorkCoPilot team. Your company's per-plan license count is enforced." /></label>
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
                  <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Used today</th><th>Extra</th><th>2FA</th><th></th></tr></thead>
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
                              <option value="member">Member</option><option value="executive">Executive (read-only)</option><option value="company_admin">Company admin</option>
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
                          <td style={{ fontSize: 12 }}>
                            {m.mfaEnabled
                              ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: 'var(--wka-accent)' }}><Check size={13} /> On</span>
                              : <span style={{ color: 'var(--wka-amber)' }}>Not set up</span>}
                            {m.mfaEnabled ? <button type="button" className="wka-btn sm ghost" title="Reset authenticator (lost phone)" disabled={rowBusy === m.id} onClick={() => resetMfa(m)} style={{ marginLeft: 6 }}><KeyRound size={12} /></button> : null}
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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [guideOpen, setGuideOpen] = useState(true)
  const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}${SSO.SSO_CALLBACK_PATH}` : SSO.SSO_CALLBACK_URL

  const formFromSso = (s) => ({ provider: (s && s.provider) || 'google', issuer: (s && s.issuer) || '', clientId: (s && s.clientId) || '', clientSecret: '', domain: (s && s.domain) || '' })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workCompanyGetSso()
      .then((r) => { const s = r.sso || null; setState({ loading: false, error: null, sso: s }); setForm((f) => ({ ...f, ...formFromSso(s) })); setEditing(!(s && s.connected)) })   // connected -> start on the record; not connected -> open the form
      .catch((error) => setState({ loading: false, error, sso: null }))
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setSaveErr(null); setSaved(false)
    try { await api.workCompanySetSso(form); setSaved(true); setForm((f) => ({ ...f, clientSecret: '' })); setEditing(false); setTimeout(() => setSaved(false), 2500); load() }
    catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }
  const cancel = () => { setForm(formFromSso(state.sso)); setSaveErr(null); setSaved(false); setEditing(false) }

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{connected ? 'SSO is connected' : 'Connect single sign-on'} {connected ? <span className="wka-badge active" style={{ marginLeft: 6 }}>{SSO_PROVIDER_LABELS[state.sso.provider] || state.sso.provider}</span> : null}</h2>
          {!editing ? <EditToggle editing={editing} onEdit={() => { setForm(formFromSso(state.sso)); setEditing(true); setSaveErr(null) }} /> : null}
        </div>
        <p className="desc">Your people sign in with your identity provider. WorkCoPilot works with any OpenID Connect provider; pick yours below.</p>
        {!editing ? (
          <>
            <div className="wka-record">
              <RecRow label="Provider" value={SSO_PROVIDER_LABELS[state.sso && state.sso.provider] || (state.sso && state.sso.provider) || '-'} />
              <RecRow label="Email domain" value={(state.sso && state.sso.domain) || '-'} />
              <RecRow label="Issuer URL" value={(state.sso && state.sso.issuer) || '-'} />
              <RecRow label="Client ID" value={(state.sso && state.sso.clientId) || '-'} />
              <RecRow label="Client secret" value={state.sso && state.sso.connected ? '•••••••• (set)' : 'not set'} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
            <SavedTag show={saved} />
          </>
        ) : (
          <>
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
              {connected ? <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> Cancel</button> : null}
              <SavedTag show={saved} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
          </>
        )}
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
  // Removing company AI / web-search keys takes the company's AI (partly) down,
  // so each goes through the shared reason-gated danger confirm (logged).
  const [askReason, reasonModal] = useReasonModal()
  const load = useCallback(() => { api.workTeamAi().then((c) => setCompany(c || null)).catch((e) => setErr(e)) }, [])
  useEffect(() => { load() }, [load])

  const saveWs = async (clear) => {
    const key = clear ? '' : wsKey.trim()
    if (!clear && !key) return
    let reason
    if (clear) {
      reason = await askReason({ title: 'Remove your web-search key?', detail: 'Live web learning stops running on your key. Guidance is no longer grounded in the latest web sources until a key is set again.', confirmLabel: 'Remove key' })
      if (!reason || reason.length < 3) return
    }
    setWsBusy(true); setWsErr(null); setWsOk('')
    try { await api.workTeamSetWebSearch(key, 'tavily', reason); setWsKey(''); setWsOk(clear ? 'Web-search key removed.' : 'Web-search key saved.'); load() }
    catch (error) { setWsErr(error) } finally { setWsBusy(false) }
  }

  const save = async () => {
    if (!form.apiKey.trim()) return
    setBusy(true); setErr(null); setOk('')
    try { await api.workTeamSetAiKeys(form); setOk('Saved. WorkCoPilot now runs on your keys.'); setForm({ providerId: '', apiKey: '' }); load() }
    catch (error) { setErr(error) } finally { setBusy(false) }
  }
  const clear = async () => {
    const reason = await askReason({ title: 'Remove your company AI keys?', detail: 'WorkCoPilot stops running on your keys. If your AI source is "company keys", guidance is paused for your whole team until keys are set again.', confirmLabel: 'Remove my keys' })
    if (!reason || reason.length < 3) return
    setBusy(true); setErr(null); setOk('')
    try {
      // Say what ACTUALLY happened: the server restores the AI source the
      // WorkCoPilot team chose before your keys were added. If that choice was
      // "company keys", AI is unavailable until keys are set again (never a
      // silent switch to platform keys).
      const c = await api.workTeamSetAiKeys({ apiKey: '', reason })
      if (c && c.aiReady) setOk('Your keys were removed. Your company is back on the WorkCoPilot platform AI.')
      else setOk('Your keys were removed. Your company is set to run on its own AI keys, so guidance is paused until you add keys again or the WorkCoPilot team switches you to the platform AI.')
      load()
    } catch (error) { setErr(error) } finally { setBusy(false) }
  }

  const cur = company && company.companyAi
  return (
    <div>
      {reasonModal}
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
  const [baseline, setBaseline] = useState(null)   // last-saved policy, for Cancel
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  // A policy is "configured" (start collapsed) once armed, saved, or given any
  // frameworks/words/fields. A brand-new blank policy opens in the form.
  const isConfigured = (pol) => !!(pol && (pol.version > 0 || pol.armed || (pol.frameworks || []).length || (pol.blockWords || []).length || (pol.customFields || []).length))

  const load = useCallback(() => {
    if (!companyId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workPolicy(companyId)
      .then((r) => {
        const pol = r.policy || {}
        setState({ loading: false, error: null, policy: pol, presets: r.presets || {}, labels: r.labels || {}, categories: r.categories || [] })
        setBaseline(pol)
        setEditing(!pol.locked && !isConfigured(pol))   // locked or already-configured -> start on the record
      })
      .catch((error) => setState((s) => ({ ...s, loading: false, error })))
  }, [companyId])
  useEffect(() => { load() }, [load])

  const p = state.policy
  const locked = !!(p && p.locked)
  const ro = locked // read-only for a company admin when a superadmin locked it
  const patchPolicy = (patch) => setState((s) => ({ ...s, policy: { ...s.policy, ...patch } }))
  const setCat = (cat, action) => setState((s) => ({ ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), [cat]: action } } }))
  // Click a framework to toggle it: ON seeds its sensible category defaults and
  // selects it; clicking an already-selected framework deselects it (mirrors the
  // superadmin Governance toggle). Category actions it seeded are left as-is.
  const applyPreset = (key) => {
    setState((s) => {
      const cur = s.policy.frameworks || []
      if (cur.includes(key)) return { ...s, policy: { ...s.policy, frameworks: cur.filter((k) => k !== key) } }
      const preset = s.presets[key] || {}
      return { ...s, policy: { ...s.policy, categories: { ...(s.policy.categories || {}), ...preset }, frameworks: [...cur, key] } }
    })
  }
  const save = async () => {
    if (ro || saving || !p) return
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const r = await api.workSetPolicy({
        companyId, categories: p.categories || {}, blockWords: p.blockWords || [], frameworks: p.frameworks || [],
        customFields: (p.customFields || []).filter((f) => f && String(f.label || '').trim() && String(f.pattern || '').trim()),
        mode: p.mode || 'scrub', armed: !!p.armed,
      })
      setState((s) => ({ ...s, policy: r.policy })); setBaseline(r.policy); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }
  const cancel = () => { setState((s) => ({ ...s, policy: baseline })); setSaveErr(null); setSaved(false); setEditing(false) }

  if (state.loading) return <Loading label="Loading policy" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!p) return <EmptyState title="No policy" />

  if (!editing) {
    // ---- Collapsed policy record (armed/locked status stays visible) ----
    return (
      <div>
        {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> This policy is locked by the WorkCoPilot team. Open a support ticket to change it.</div>}
        <div className="wka-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />Data governance policy</h2>
            <EditToggle editing={editing} disabled={ro} onEdit={() => { setState((s) => ({ ...s, policy: baseline })); setEditing(true); setSaveErr(null) }} />
          </div>
          <p className="desc">The saved DLP policy for your company. {ro ? 'It is locked by the WorkCoPilot team.' : 'Click Edit to change what leaves the device.'}</p>
          <div className="wka-record">
            <RecRow label="Status" value={
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: p.armed ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>{p.armed ? 'Armed (enforced on every call)' : 'Not armed'}</span>
                <span style={{ color: 'var(--wka-faint)' }}>·</span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{p.locked ? <><Lock size={12} /> Locked</> : 'Unlocked'}</span>
              </span>
            } />
            <RecRow label="Mode" value={p.mode === 'tokenize' ? 'Tokenize (rebuilt on-device)' : 'Scrub (removed before sending)'} />
            <RecRow label="Frameworks" value={(p.frameworks || []).length ? (p.frameworks || []).map((k) => k.toUpperCase().replace(/_/g, ' ')).join(', ') : 'None'} />
            <RecRow label="Category rules" value={`${Object.keys(p.categories || {}).length} set`} />
            <RecRow label="Block words" value={`${(p.blockWords || []).length}`} />
            <RecRow label="Custom fields" value={`${(p.customFields || []).length}`} />
            <RecRow label="Version" value={`${p.version || 0}`} />
          </div>
          <SavedTag show={saved} />
        </div>
      </div>
    )
  }

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
          <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> Cancel</button>
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
// Human labels for the unified activity + audit timeline. Session/doc events come
// from the user activity feed; the rest are destructive admin actions merged in.
const ACTIVITY_LABELS = {
  session_deleted: 'Deleted a session',
  doc_deleted: 'Deleted a document',
  member_removed: 'Removed a member',
  billing_item_removed: 'Removed a billing item',
  kb_clear: 'Cleared the knowledge base',
  kb_restore_replace: 'Restored (replaced) the knowledge base',
  pii_redacted: 'Entered sensitive data (redacted on device)',
}

// ===========================================================================
// Security alerts: the pii_redacted entries of the company activity feed, as a
// focused view. Each alert carries WHO (name, email, role), WHERE (session,
// call), WHAT (PII categories + counts only - the backend never sends values)
// and WHEN. Newest first. The Activity view keeps every event, unchanged.
// ===========================================================================
const ALERTS_SEEN_KEY = 'wca.alerts.seen'
const isAlert = (a) => a && a.type === 'pii_redacted'
const alertTime = (a) => { const t = new Date(a && a.at).getTime(); return Number.isFinite(t) ? t : 0 }
const readAlertsSeen = () => { try { return Number(localStorage.getItem(ALERTS_SEEN_KEY)) || 0 } catch { return 0 } }
const writeAlertsSeen = (t) => { try { localStorage.setItem(ALERTS_SEEN_KEY, String(t)) } catch { /* ignore */ } }
const CALL_LABEL = { plan: 'planning a task', ask: 'asking a question', result: 'getting a result', compose: 'writing a document' }

function AlertsSection({ onSeen }) {
  const [state, setState] = useState({ loading: true, error: null, items: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamActivity()
      .then((r) => {
        const items = ((r && r.activity) || []).filter(isAlert).sort((a, b) => alertTime(b) - alertTime(a))
        setState({ loading: false, error: null, items })
        const newest = items.length ? alertTime(items[0]) : Date.now()
        writeAlertsSeen(Math.max(newest, readAlertsSeen()))
        if (onSeen) onSeen()
      })
      .catch((error) => setState({ loading: false, error, items: [] }))
  }, [onSeen])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label="Loading alerts" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title="No alerts" detail="When a member enters sensitive data, it is redacted on their device and an alert appears here with who, where and what kind." />
  return (
    <div className="wka-panel">
      <div className="wca-alerts-head">
        <h2><ShieldAlert size={16} /> {state.items.length} {state.items.length === 1 ? 'alert' : 'alerts'}</h2>
        <span className="wca-alerts-note"><ShieldCheck size={13} /> Values were redacted on the device before submission. Only the kind and count are shown here.</span>
      </div>
      <div className="wca-alerts">
        {state.items.map((a, i) => {
          const who = a.displayName || a.username || 'A member'
          const title = (a.sessionTitle && !/^Session \d/.test(a.sessionTitle)) ? a.sessionTitle : (a.sessionTitle || 'Untitled session')
          return (
            <article key={a.id || `${a.sessionId || 's'}-${a.at || i}`} className="wca-alert" aria-label={`Sensitive data alert for ${who}`}>
              <span className="wca-alert-ic"><AlertTriangle size={16} /></span>
              <div className="wca-alert-body">
                <div className="wca-alert-line">
                  <b>{who}</b>{a.email ? <span className="wca-alert-mail">({a.email})</span> : null}
                  {a.companyRole ? <span className="wka-chip wca-alert-role">{ROLE_LABEL[a.companyRole] || a.companyRole}</span> : null}
                  {' '}entered sensitive data{a.categories ? <> (<b className="wca-alert-cat">{a.categories}</b>)</> : null} in <q>{title}</q> via {CALL_LABEL[a.call] || a.call || 'a request'}. Redacted on their device before submission.
                </div>
                <div className="wca-alert-meta">
                  <span><Clock size={12} /> {fmtDT(a.at)}</span>
                  {Number.isFinite(Number(a.redactedTotal)) && Number(a.redactedTotal) > 0 ? <span>{a.redactedTotal} {Number(a.redactedTotal) === 1 ? 'item' : 'items'} redacted</span> : null}
                  {a.sessionId ? <a className="wca-alert-link" href={api.workAuditUrl(a.sessionId)} download>Audit log</a> : null}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

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
            {state.items.map((a) => {
              const what = ACTIVITY_LABELS[a.type] || (a.admin ? (a.type || 'Admin action').replace(/_/g, ' ') : 'Activity')
              const detail = a.admin
                ? (a.detail || '')
                : (a.type === 'doc_deleted' ? (a.name || 'A document') : ((a.title && !/^Session \d/.test(a.title)) ? a.title : (a.goal || 'Untitled')))
              return (
                <tr key={a.id}>
                  <td>{a.displayName || a.username || 'A user'}</td>
                  <td>{what}</td>
                  <td style={{ color: 'var(--wka-muted)' }}>{detail}{a.reason ? ` - "${a.reason}"` : ''}</td>
                  <td style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{fmtDT(a.at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ===========================================================================
// SOC / SIEM integrations: connectors that relay security alerts (metadata
// only) into the company's own tools. The catalog comes from the server and
// drives the add/edit form; secret fields are WRITE-ONLY (the server blanks
// them on read; sending '' keeps the stored value). Test sends a sample alert.
// Delete is reason-logged (owner standing rule) via the shared ReasonModal.
// ===========================================================================
const INT_GROUP_ORDER = ['SIEM', 'SOAR', 'Chat', 'Observability', 'Generic']
const groupOf = (g) => (g && INT_GROUP_ORDER.find((x) => x.toLowerCase() === String(g).toLowerCase())) || g || 'Other'
const fmtRelay = (it) => {
  if (!it || !it.lastRelayAt) return { tone: 'none', text: 'Not tested yet' }
  const when = fmtDT(it.lastRelayAt)
  return it.lastRelayOk
    ? { tone: 'ok', text: `Delivered ${when}` }
    : { tone: 'bad', text: `Failed ${when}${it.lastRelayError ? `: ${it.lastRelayError}` : ''}` }
}

function IntegrationForm({ connector, initial, onSave, onCancel, busy, error }) {
  const [config, setConfig] = useState(() => {
    const c = {}
    for (const f of connector.fields || []) c[f.key] = (initial && initial.config && !f.secret && initial.config[f.key] != null) ? String(initial.config[f.key]) : ''
    return c
  })
  const [enabled, setEnabled] = useState(initial ? initial.enabled !== false : true)
  const editing = !!(initial && initial.id)
  const submit = (e) => { e && e.preventDefault(); onSave({ id: initial && initial.id, type: connector.id, config, enabled }) }
  return (
    <form className="wca-int-form" onSubmit={submit} aria-label={`${editing ? 'Edit' : 'Add'} ${connector.label}`} aria-busy={busy}>
      <div className="wca-int-form-head"><b>{editing ? 'Edit' : 'Add'} {connector.label}</b><span className="wka-chip">{groupOf(connector.group)}</span></div>
      <div className="wca-int-fields">
        {(connector.fields || []).map((f) => (
          <label key={f.key} className="wca-int-field">
            <span>{f.label}{f.secret ? <em className="wca-int-secret">write-only</em> : null}</span>
            <input className="wka-input" type={f.secret ? 'password' : 'text'} value={config[f.key] || ''} autoComplete={f.secret ? 'new-password' : 'off'}
              placeholder={f.secret && editing ? 'Stored. Leave blank to keep the current value' : (f.placeholder || '')}
              onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))} />
          </label>
        ))}
      </div>
      <label className="wca-int-toggle"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> <span>Enabled: relay new alerts to this connector</span></label>
      {error ? <ErrorBox error={error} /> : null}
      <div className="wca-int-actions">
        <button type="button" className="wka-btn sm ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="wka-btn sm primary" disabled={busy}>{busy ? <Spinning /> : <Check size={14} />} {editing ? 'Save changes' : 'Add connector'}</button>
      </div>
    </form>
  )
}

function IntegrationsSection() {
  const [state, setState] = useState({ loading: true, error: null, catalog: [], items: [] })
  const [adding, setAdding] = useState(null)      // connector (catalog entry) being added
  const [editing, setEditing] = useState(null)    // existing item being edited
  const [saveBusy, setSaveBusy] = useState(false); const [saveErr, setSaveErr] = useState(null)
  const [testing, setTesting] = useState({})      // id -> { busy, result }
  const [askReason, reasonModal] = useReasonModal()
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([api.workCompanyIntegrationsCatalog(), api.workCompanyIntegrations()])
      .then(([cat, list]) => setState({ loading: false, error: null, catalog: Array.isArray(cat) ? cat : (cat && cat.catalog) || [], items: Array.isArray(list) ? list : (list && list.integrations) || [] }))
      .catch((error) => setState({ loading: false, error, catalog: [], items: [] }))
  }, [])
  useEffect(() => { load() }, [load])
  const byId = useMemo(() => Object.fromEntries((state.catalog || []).map((c) => [c.id, c])), [state.catalog])
  const groups = useMemo(() => {
    const m = {}
    for (const c of state.catalog || []) { const g = groupOf(c.group); (m[g] = m[g] || []).push(c) }
    const order = [...INT_GROUP_ORDER, ...Object.keys(m).filter((g) => !INT_GROUP_ORDER.includes(g))]
    return order.filter((g) => m[g] && m[g].length).map((g) => ({ group: g, connectors: m[g] }))
  }, [state.catalog])

  const save = async (body) => {
    setSaveBusy(true); setSaveErr(null)
    try { await api.workCompanyIntegrationSave(body); setAdding(null); setEditing(null); load() }
    catch (error) { setSaveErr(error) } finally { setSaveBusy(false) }
  }
  const toggle = async (it) => {
    // Secrets are sent as '' so the server keeps the stored values.
    const c = byId[it.type]; const config = {}
    for (const f of (c && c.fields) || []) config[f.key] = f.secret ? '' : ((it.config && it.config[f.key]) || '')
    try { await api.workCompanyIntegrationSave({ id: it.id, type: it.type, config, enabled: !it.enabled }); load() } catch (error) { setState((s) => ({ ...s, error })) }
  }
  const test = async (it) => {
    setTesting((t) => ({ ...t, [it.id]: { busy: true } }))
    try { const r = await api.workCompanyIntegrationTest(it.id); setTesting((t) => ({ ...t, [it.id]: { busy: false, result: r && r.ok ? { ok: true } : { ok: false, error: (r && r.error) || 'The connector did not accept the test alert.' } } })) }
    catch (error) { setTesting((t) => ({ ...t, [it.id]: { busy: false, result: { ok: false, error: error.message || 'Test failed' } } })) }
    load()
  }
  const remove = async (it) => {
    const label = (byId[it.type] && byId[it.type].label) || it.type
    const reason = await askReason({ title: `Remove ${label}?`, detail: 'Alerts will no longer be relayed to this connector. This is recorded in the audit trail.', confirmLabel: 'Remove connector' })
    if (!reason) return
    try { await api.workCompanyIntegrationDelete(it.id, reason); load() } catch (error) { setState((s) => ({ ...s, error })) }
  }

  if (state.loading) return <Loading label="Loading integrations" />
  if (state.error && !state.catalog.length) return <ErrorBox error={state.error} onRetry={load} />
  return (
    <>
      {reasonModal}
      <div className="wca-int-note"><ShieldCheck size={15} /><span><b>Only alert metadata leaves WorkCoPilot.</b> A relayed alert carries the kind and count of what was redacted (for example "email x1, card x1"), who (name, email, role), the task and the time. The actual values were redacted on the member's device and are never stored or sent.</span></div>
      {state.error ? <ErrorBox error={state.error} onRetry={load} /> : null}

      <div className="wka-panel">
        <h2>Connected</h2>
        {!state.items.length ? <p className="desc">No connectors yet. Add one below to start relaying alerts.</p> : (
          <div className="wca-int-list">
            {state.items.map((it) => {
              const c = byId[it.type] || { label: it.type, group: 'Other', fields: [] }
              const relay = fmtRelay(it); const t = testing[it.id] || {}
              return (
                <div key={it.id} className={`wca-int-item${it.enabled ? '' : ' off'}`}>
                  <div className="wca-int-item-head">
                    <span className={`wca-int-dot ${it.enabled ? 'on' : ''}`} aria-hidden="true" />
                    <b>{c.label}</b><span className="wka-chip">{groupOf(c.group)}</span>
                    <span className={`wca-int-relay ${relay.tone}`} title={relay.text}>{relay.text}</span>
                    <div className="wca-int-item-actions">
                      <label className="wca-int-toggle sm"><input type="checkbox" checked={!!it.enabled} onChange={() => toggle(it)} /> <span>{it.enabled ? 'Enabled' : 'Disabled'}</span></label>
                      <button type="button" className="wka-btn sm" onClick={() => test(it)} disabled={t.busy}>{t.busy ? <Spinning /> : <RefreshCw size={13} />} Test</button>
                      <button type="button" className="wka-btn sm ghost" onClick={() => { setAdding(null); setEditing(editing && editing.id === it.id ? null : it) }}>{editing && editing.id === it.id ? 'Close' : 'Edit'}</button>
                      <button type="button" className="wka-btn sm ghost danger" onClick={() => remove(it)} title="Remove this connector"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {t.result ? <div className={`wca-int-test ${t.result.ok ? 'ok' : 'bad'}`}>{t.result.ok ? <><Check size={13} /> Sample alert delivered. Check your tool for it.</> : <><AlertTriangle size={13} /> {t.result.error}</>}</div> : null}
                  {editing && editing.id === it.id && c.fields ? <IntegrationForm connector={c} initial={it} onSave={save} onCancel={() => setEditing(null)} busy={saveBusy} error={saveErr} /> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="wka-panel">
        <h2>Add a connector</h2>
        <p className="desc">Pick where alerts should go. You can connect more than one.</p>
        {groups.map(({ group, connectors }) => (
          <div key={group} className="wca-int-group">
            <div className="wca-int-group-k">{group}</div>
            <div className="wca-int-grid">
              {connectors.map((c) => (
                <button key={c.id} type="button" className={`wca-int-card${adding && adding.id === c.id ? ' on' : ''}`} onClick={() => { setEditing(null); setSaveErr(null); setAdding(adding && adding.id === c.id ? null : c) }} aria-pressed={adding && adding.id === c.id}>
                  <span className="wca-int-card-ic"><Globe size={15} /></span><span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {adding ? <IntegrationForm key={adding.id} connector={adding} initial={null} onSave={save} onCancel={() => setAdding(null)} busy={saveBusy} error={saveErr} /> : null}
      </div>
    </>
  )
}

// ===========================================================================
// Member sessions (oversight): a company admin can pull the report + audit log
// of any of their people's sessions, completed or in progress.
// ===========================================================================
function SessionsSection() {
  const [state, setState] = useState({ loading: true, error: null, items: null })
  const [filter, setFilter] = useState('all')   // all | active | ended
  const [fw, setFw] = useState('')               // selected framework focus ('' = all)
  const [frameworks, setFrameworks] = useState([])
  const [emailing, setEmailing] = useState(null) // session id currently sending
  const [emailMsg, setEmailMsg] = useState(null) // { id, ok, text }
  const [emailFor, setEmailFor] = useState(null) // session id whose inline email box is open
  const [emailTo, setEmailTo] = useState('')
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workCompanySessions().then((r) => setState({ loading: false, error: null, items: r.sessions || [] })).catch((error) => setState({ loading: false, error, items: [] }))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { api.workComplianceFrameworks().then((r) => setFrameworks(r.frameworks || [])).catch(() => setFrameworks([])) }, [])
  const openEmail = (id) => { setEmailFor((cur) => cur === id ? null : id); setEmailTo(''); setEmailMsg(null) }
  const sendEmail = async (id) => {
    const to = emailTo.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { setEmailMsg({ id, ok: false, text: 'Enter a valid email address.' }); return }
    setEmailing(id); setEmailMsg(null)
    try { const r = await api.workComplianceEmail(id, { to, ...(fw ? { framework: fw } : {}) }); setEmailMsg({ id, ok: true, text: `Sent to ${r.to}.` }); setEmailFor(null); setEmailTo('') }
    catch (e) { setEmailMsg({ id, ok: false, text: (e && e.message) || 'Could not send.' }) }
    finally { setEmailing(null) }
  }
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
          <select className="wka-select" value={fw} onChange={(e) => setFw(e.target.value)} style={{ height: 32 }} title="Focus the compliance report on one framework (default covers all)">
            <option value="">Compliance: all frameworks</option>
            {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button className="wka-btn sm ghost" onClick={load} title="Refresh"><RefreshCw size={13} /> Refresh</button>
        </div>
      </div>
      <p style={{ color: 'var(--wka-muted)', fontSize: 13, marginTop: 6 }}>For any task, pull a <b>compliance report</b> (the controls applied, how each was satisfied, and the evidence), the full session report, or the audit log (exactly what was sent to the AI). Scoped to your company only. Download any of them now, or email the compliance report to any address.</p>
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
                  <a className="wka-btn sm" href={api.workComplianceUrl(s.id, true, fw)} target="_blank" rel="noopener noreferrer" title={`Download the compliance report (${fw ? frameworks.find((f) => f.id === fw)?.name || 'framework' : 'all frameworks'}): controls, responses and evidence for this task (PDF)`}><ShieldCheck size={13} /> Compliance</a>
                  <button className="wka-btn sm ghost" onClick={() => openEmail(s.id)} disabled={emailing === s.id} aria-expanded={emailFor === s.id} title="Email the compliance report (PDF attached)" style={{ marginLeft: 6 }}>{emailing === s.id ? <Loader2 size={13} className="spin" /> : <Mail size={13} />} Email</button>
                  <a className="wka-btn sm ghost" href={api.workReportUrl(s.id, true)} target="_blank" rel="noopener noreferrer" title="Download the session report (PDF)" style={{ marginLeft: 6 }}><Download size={13} /> Report</a>
                  <a className="wka-btn sm ghost" href={api.workAuditUrl(s.id)} target="_blank" rel="noopener noreferrer" title="Download the audit log (exactly what was sent to the AI)" style={{ marginLeft: 6 }}><FileText size={13} /> Log</a>
                  {emailFor === s.id && (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 8, verticalAlign: 'middle' }}>
                      <input className="wka-input" type="email" style={{ width: 200, padding: '5px 8px' }} placeholder="name@company.com" value={emailTo} autoFocus
                        onChange={(e) => setEmailTo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendEmail(s.id) }} />
                      <button className="wka-btn sm primary" onClick={() => sendEmail(s.id)} disabled={emailing === s.id}>{emailing === s.id ? <Loader2 size={13} className="spin" /> : 'Send'}</button>
                      <button className="wka-btn sm ghost" onClick={() => { setEmailFor(null); setEmailTo('') }}>Cancel</button>
                    </span>
                  )}
                  {emailMsg && emailMsg.id === s.id && <span style={{ marginLeft: 8, fontSize: 12, color: emailMsg.ok ? '#16a34a' : '#b45309' }}>{emailMsg.text}</span>}
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
  const [editingProfile, setEditingProfile] = useState(!(viewer && viewer.displayName))   // name already set -> start on the record
  const [pBusy, setPBusy] = useState(false); const [pOk, setPOk] = useState(false); const [pErr, setPErr] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false); const [pwOk, setPwOk] = useState(false); const [pwErr, setPwErr] = useState(null)

  const saveProfile = async () => {
    setPBusy(true); setPErr(null); setPOk(false)
    try { const r = await api.workSetProfile({ displayName }); if (onProfile) onProfile(r.user); setEditingProfile(false); setPOk(true); setTimeout(() => setPOk(false), 2500) }
    catch (error) { setPErr(error) } finally { setPBusy(false) }
  }
  const cancelProfile = () => { setDisplayName((viewer && viewer.displayName) || ''); setPErr(null); setPOk(false); setEditingProfile(false) }
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}>Your profile</h2>
          {!editingProfile ? <EditToggle editing={editingProfile} onEdit={() => { setDisplayName((viewer && viewer.displayName) || ''); setEditingProfile(true); setPErr(null) }} /> : null}
        </div>
        <p className="desc">The name shown to your team. Your username is <b>{viewer ? viewer.username : ''}</b>.</p>
        {!editingProfile ? (
          <>
            <div className="wka-record"><RecRow label="Display name" value={(viewer && viewer.displayName) || '(not set)'} /></div>
            {pErr && <ErrorBox error={pErr} />}
            <SavedTag show={pOk} />
          </>
        ) : (
          <>
            <div className="wka-field" style={{ maxWidth: 420, marginBottom: 14 }}><label>Display name</label><input className="wka-input" value={displayName} maxLength={80} placeholder="e.g. Alex Morgan" onChange={(e) => setDisplayName(e.target.value)} /></div>
            {pErr && <ErrorBox error={pErr} />}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" className="wka-btn primary" disabled={pBusy} onClick={saveProfile}>{pBusy ? <Spinning /> : <Check size={14} />} Save</button><button type="button" className="wka-btn ghost" disabled={pBusy} onClick={cancelProfile}><X size={14} /> Cancel</button><SavedTag show={pOk} /></div>
          </>
        )}
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

  // Unread security-alert badge for the nav: alerts newer than the last time the
  // Alerts section was opened (localStorage stamp). Loaded once the gate is ready.
  const [alertBadge, setAlertBadge] = useState(0)
  const refreshAlertBadge = useCallback(() => {
    api.workTeamActivity().then((r) => {
      const seen = readAlertsSeen()
      setAlertBadge(((r && r.activity) || []).filter((a) => isAlert(a) && alertTime(a) > seen).length)
    }).catch(() => { /* badge is best-effort */ })
  }, [])
  useEffect(() => { if (gate === 'ready') refreshAlertBadge() }, [gate, refreshAlertBadge])
  const alertsSeen = useCallback(() => setAlertBadge(0), [])

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
      case 'brain': return <CompanyBrain />
      case 'sessions': return <SessionsSection />
      case 'tickets': return <SupportTickets mode="user" />
      case 'activity': return <ActivitySection />
      case 'alerts': return <AlertsSection onSeen={alertsSeen} />
      case 'integrations': return <IntegrationsSection />
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
                {s.id === 'alerts' && alertBadge > 0 && <span className="wca-badge" aria-label={`${alertBadge} new ${alertBadge === 1 ? 'alert' : 'alerts'}`}>{alertBadge > 99 ? '99+' : alertBadge}</span>}
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
.wka .spin { animation: wka-spin 0.8s linear infinite; }
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
/* Security alerts: amber, scannable, newest first. Uses the console's own
   --wka-amber token (single source); only the tints are derived here. */
.wka { --wca-amber-soft:color-mix(in srgb, var(--wka-amber) 12%, transparent); --wca-amber-line:color-mix(in srgb, var(--wka-amber) 36%, transparent); }
.wca-badge { margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:999px; display:inline-grid; place-items:center; font-size:11px; font-weight:800; font-variant-numeric:tabular-nums; color:#1a1200; background:var(--wka-amber); box-shadow:0 0 0 2px var(--wca-amber-soft); animation:wca-badge-in .3s cubic-bezier(.3,1.3,.5,1) both; }
@keyframes wca-badge-in { from { transform:scale(.6); opacity:0; } to { transform:none; opacity:1; } }
.wca-alerts-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.wca-alerts-head h2 { display:inline-flex; align-items:center; gap:8px; margin:0; }
.wca-alerts-head h2 svg { color:var(--wka-amber); }
.wca-alerts-note { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:var(--wka-muted); }
.wca-alerts-note svg { color:var(--wka-emerald); flex:none; }
.wca-alerts { display:flex; flex-direction:column; gap:10px; }
.wca-alert { position:relative; display:flex; gap:12px; align-items:flex-start; padding:12px 14px 12px 16px; border-radius:13px; background:var(--wca-amber-soft); border:1px solid var(--wca-amber-line); overflow:hidden; animation:wca-alert-in .3s cubic-bezier(.2,.8,.2,1) both; }
.wca-alert::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--wka-amber); }
.wca-alert-ic { width:32px; height:32px; border-radius:10px; flex:none; display:grid; place-items:center; background:var(--wka-bg-2); color:var(--wka-amber); border:1px solid var(--wca-amber-line); }
.wca-alert-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; }
.wca-alert-line { font-size:13.5px; line-height:1.55; color:var(--wka-text); overflow-wrap:anywhere; }
.wca-alert-line b { font-weight:700; }
.wca-alert-mail { margin-left:5px; color:var(--wka-muted); }
.wca-alert-role { margin:0 6px 0 8px; vertical-align:middle; }
.wca-alert-cat { color:var(--wka-amber); }
.wca-alert-line q { quotes:'\\201C' '\\201D'; font-style:italic; }
.wca-alert-meta { display:flex; align-items:center; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--wka-faint); }
.wca-alert-meta span { display:inline-flex; align-items:center; gap:5px; }
.wca-alert-link { color:var(--wka-accent); font-weight:600; text-decoration:underline; text-underline-offset:3px; }
@keyframes wca-alert-in { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { .wca-alert, .wca-badge { animation:none; } }
/* SOC / SIEM integrations */
.wca-int-note { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:12px; background:color-mix(in srgb, var(--wka-emerald) 10%, transparent); border:1px solid color-mix(in srgb, var(--wka-emerald) 32%, transparent); font-size:13px; line-height:1.55; color:var(--wka-text); margin-bottom:14px; }
.wca-int-note svg { color:var(--wka-emerald); flex:none; margin-top:2px; }
.wca-int-list { display:flex; flex-direction:column; gap:10px; }
.wca-int-item { border:1px solid var(--wka-line); border-radius:12px; background:var(--wka-bg-2); padding:10px 12px; display:flex; flex-direction:column; gap:8px; }
.wca-int-item.off { opacity:.72; }
.wca-int-item-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.wca-int-item-head b { font-size:14px; }
.wca-int-dot { width:9px; height:9px; border-radius:50%; background:var(--wka-faint); flex:none; }
.wca-int-dot.on { background:var(--wka-emerald); box-shadow:0 0 0 3px color-mix(in srgb, var(--wka-emerald) 25%, transparent); }
.wca-int-relay { font-size:12px; color:var(--wka-faint); max-width:46ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wca-int-relay.ok { color:var(--wka-emerald); }
.wca-int-relay.bad { color:var(--wka-red); }
.wca-int-item-actions { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.wca-int-toggle { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--wka-text); cursor:pointer; }
.wca-int-toggle.sm { font-size:12px; color:var(--wka-muted); }
.wca-int-toggle input { accent-color:var(--wka-emerald); width:16px; height:16px; }
.wca-int-test { display:flex; align-items:center; gap:7px; font-size:12.5px; padding:8px 10px; border-radius:9px; }
.wca-int-test.ok { color:var(--wka-emerald); background:color-mix(in srgb, var(--wka-emerald) 10%, transparent); }
.wca-int-test.bad { color:var(--wka-red); background:color-mix(in srgb, var(--wka-red) 10%, transparent); }
.wca-int-group { margin-top:14px; }
.wca-int-group-k { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--wka-faint); margin-bottom:8px; }
.wca-int-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px, 1fr)); gap:8px; }
.wca-int-card { display:flex; align-items:center; gap:9px; padding:10px 12px; border-radius:11px; border:1px solid var(--wka-line); background:var(--wka-bg-2); color:var(--wka-text); font:inherit; font-size:13px; font-weight:600; cursor:pointer; text-align:left; transition:border-color .15s, background .15s, box-shadow .15s; }
.wca-int-card:hover { border-color:var(--wka-accent); }
.wca-int-card.on { border-color:var(--wka-emerald); background:color-mix(in srgb, var(--wka-emerald) 10%, transparent); box-shadow:0 0 0 1px color-mix(in srgb, var(--wka-emerald) 35%, transparent) inset; }
.wca-int-card-ic { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:var(--wka-panel); color:var(--wka-accent); border:1px solid var(--wka-line); flex:none; }
.wca-int-form { margin-top:14px; padding:14px; border-radius:12px; border:1px solid var(--wka-line); background:var(--wka-panel); display:flex; flex-direction:column; gap:12px; }
.wca-int-form-head { display:flex; align-items:center; gap:10px; font-size:14px; }
.wca-int-fields { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px 14px; }
.wca-int-field { display:flex; flex-direction:column; gap:5px; font-size:12.5px; color:var(--wka-muted); }
.wca-int-field input { width:100%; }
.wca-int-secret { font-style:normal; margin-left:6px; font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--wka-amber); }
.wca-int-actions { display:flex; justify-content:flex-end; gap:8px; }
.wka-btn.danger { color:var(--wka-red); }
`
