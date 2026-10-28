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
  FileText, Download, Activity, Globe, Upload, Brain, X, Blocks, Camera, BookOpen, Gauge,
  Network, Briefcase,
} from 'lucide-react'
import { api } from '../../api.js'
import { useT } from '../../i18n/index.jsx'
import SupportTickets from '../../components/SupportTickets.jsx'
import PreferencesPanel from '../../components/PreferencesPanel.jsx'
import CompanyBrain from './sections/CompanyBrain.jsx'
import UsageLimits from './sections/UsageLimits.jsx'
import BrainSecurity from './sections/BrainSecurity.jsx'
import PolicyRules from './sections/PolicyRules.jsx'
import HelpCompany from './sections/HelpCompany.jsx'
import CompanyPoolCard from './sections/CompanyPoolCard.jsx'
import GuidanceDepth from './sections/GuidanceDepth.jsx'
import Customers from './sections/Customers.jsx'
import { DEPTH_CHOICE_CSS } from './sections/DepthChoice.jsx'
import { WORKADMIN_CSS } from './workadmin.css.js'
import { Loading, ErrorBox, EmptyState, Spinning, SavedTag, RecRow, EditToggle, useReasonModal } from './sections/_shared.jsx'
import { Meter, VIZ_CSS } from './sections/_viz.jsx'
import { AiSourceChoice, AI_SOURCE_CHOICE_CSS } from './sections/AiSourceChoice.jsx'
import { aiSetupOf } from '../../shared/ai_source_options.js'
import { COMPANY_ROLE_OPTIONS, WORK_FLOW_OPTIONS, normalizeFlow } from '../../shared/work_roles_options.js'
import * as SSO from '../../shared/sso_guide.js'
import { OIDC_PROVIDER_LABELS as SSO_PROVIDER_LABELS, OIDC_PROVIDER_IDS as SSO_PROVIDER_ORDER } from '../../shared/oidc_providers.js'

// Destructive confirms use the shared promise-style useReasonModal from
// sections/_shared.jsx (single source - SUPREME RULE II; the local copy was deleted).

const TIERS = [{ id: 'basic', name: 'Basic' }, { id: 'advanced', name: 'Advanced' }, { id: 'premium', name: 'Premium' }]
// Role + work-flow labels resolve through the ONE registry (src/shared/
// work_roles_options.js: ids, order and i18n keys), so adding a role lands in
// one place and every select, badge and the app shell agree (SUPREME RULE II).
// Plan names Basic/Advanced/Premium are brand terms and stay literal.
const ROLE_LABEL = Object.fromEntries(COMPANY_ROLE_OPTIONS.map((o) => [o.id, o.labelKey]))
// OIDC provider labels + order come from the single registry (src/shared/
// oidc_providers.js), imported above as SSO_PROVIDER_LABELS / SSO_PROVIDER_ORDER.
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return isNaN(d) ? '-' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
const fmtDT = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const fmtMins = (secs) => { const m = Math.round((Number(secs) || 0) / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); const r = m % 60; return r ? `${h}h ${r}m` : `${h}h` }

// Small inline help: an info icon with a native tooltip. Keeps each control
// self-explanatory without a popover library.
function Help({ text }) {
  return <span className="wca-help" tabIndex={0} title={text} aria-label={text}><Info size={13} /></span>
}

// label/title/sub are i18n keys; the shell and nav resolve them with t().
const SECTIONS = [
  { id: 'overview', label: 'companyAdmin.nav.overview', icon: LayoutDashboard, title: 'companyAdmin.sections.overview.title', sub: 'companyAdmin.sections.overview.sub' },
  { id: 'team', label: 'companyAdmin.nav.team', icon: Users, title: 'companyAdmin.sections.team.title', sub: 'companyAdmin.sections.team.sub' },
  { id: 'customers', label: 'companyAdmin.nav.customers', icon: Briefcase, title: 'companyAdmin.sections.customers.title', sub: 'companyAdmin.sections.customers.sub' },
  { id: 'usage', label: 'companyAdmin.nav.usage', icon: Gauge, title: 'companyAdmin.sections.usage.title', sub: 'companyAdmin.sections.usage.sub' },
  { id: 'depth', label: 'companyAdmin.nav.depth', icon: Network, title: 'companyAdmin.sections.depth.title', sub: 'companyAdmin.sections.depth.sub' },
  { id: 'sso', label: 'companyAdmin.nav.sso', icon: KeyRound, title: 'companyAdmin.sections.sso.title', sub: 'companyAdmin.sections.sso.sub' },
  { id: 'ai', label: 'companyAdmin.nav.ai', icon: Cpu, title: 'companyAdmin.sections.ai.title', sub: 'companyAdmin.sections.ai.sub' },
  { id: 'billing', label: 'companyAdmin.nav.billing', icon: Receipt, title: 'companyAdmin.sections.billing.title', sub: 'companyAdmin.sections.billing.sub' },
  { id: 'governance', label: 'companyAdmin.nav.governance', icon: ShieldCheck, title: 'companyAdmin.sections.governance.title', sub: 'companyAdmin.sections.governance.sub' },
  { id: 'brain', label: 'companyAdmin.nav.brain', icon: Brain, title: 'companyAdmin.sections.brain.title', sub: 'companyAdmin.sections.brain.sub' },
  { id: 'brainsecurity', label: 'companyAdmin.nav.brainsecurity', icon: Lock, title: 'companyAdmin.sections.brainsecurity.title', sub: 'companyAdmin.sections.brainsecurity.sub' },
  { id: 'alerts', label: 'companyAdmin.nav.alerts', icon: ShieldAlert, title: 'companyAdmin.sections.alerts.title', sub: 'companyAdmin.sections.alerts.sub' },
  { id: 'integrations', label: 'companyAdmin.nav.integrations', icon: Globe, title: 'companyAdmin.sections.integrations.title', sub: 'companyAdmin.sections.integrations.sub' },
  { id: 'sessions', label: 'companyAdmin.nav.sessions', icon: Activity, title: 'companyAdmin.sections.sessions.title', sub: 'companyAdmin.sections.sessions.sub' },
  { id: 'tickets', label: 'companyAdmin.nav.tickets', icon: LifeBuoy, title: 'companyAdmin.sections.tickets.title', sub: 'companyAdmin.sections.tickets.sub' },
  { id: 'help', label: 'companyAdmin.nav.help', icon: BookOpen, title: 'companyAdmin.sections.help.title', sub: 'companyAdmin.sections.help.sub' },
  { id: 'activity', label: 'companyAdmin.nav.activity', icon: ListChecks, title: 'companyAdmin.sections.activity.title', sub: 'companyAdmin.sections.activity.sub' },
  { id: 'settings', label: 'companyAdmin.nav.settings', icon: SettingsIcon, title: 'companyAdmin.sections.settings.title', sub: 'companyAdmin.sections.settings.sub' },
]

// ===========================================================================
// Overview
// ===========================================================================
// Authorization attestation: the company admin affirms their organization
// authorizes WorkCoPilot use on its systems (addresses "browser access does not
// establish corporate authorization"). Self-contained: fetches + posts its own
// state. Prompted when missing; shows who + when once affirmed. Not a hard gate.
function AuthorizationCard() {
  const t = useT()
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
        <h2><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />{t('companyAdmin.overview.authOnFile.title')}</h2>
        <p className="desc">{t('companyAdmin.overview.authOnFile.recorded')}{a.byName ? t.rich('companyAdmin.overview.authOnFile.by', { name: a.byName }) : ''}{a.at ? t('companyAdmin.overview.authOnFile.on', { date: fmtDate(a.at) }) : ''}{t('companyAdmin.overview.authOnFile.tail')}</p>
      </div>
    )
  }
  return (
    <div className="wka-panel" style={{ borderColor: 'rgba(255,179,92,0.5)' }}>
      <h2><ShieldAlert size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-amber)' }} />{t('companyAdmin.overview.authConfirm.title')}</h2>
      <p className="desc">{t('companyAdmin.overview.authConfirm.desc')}</p>
      {st.error ? <div style={{ marginBottom: 12 }}><ErrorBox error={st.error} /></div> : null}
      <button type="button" className="wka-btn primary" disabled={saving} onClick={affirm}>{saving ? <Spinning /> : <Check size={14} />} {t('companyAdmin.overview.authConfirm.button')}</button>
    </div>
  )
}

// Company-set data retention: the company admin owns their window (the platform
// does not control it). 0 = keep forever (default). Self-contained.
function CompanyRetentionCard() {
  const t = useT()
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
  const recLabel = Number(baseline) > 0 ? t.n('companyAdmin.retention.days', Number(baseline)) : t('companyAdmin.retention.keepForever')
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.retention.title')}</h2>
        {!editing ? <EditToggle editing={editing} onEdit={() => { setDays(baseline); setEditing(true); setErr(null) }} /> : null}
      </div>
      <p className="desc">{t.rich('companyAdmin.retention.desc')}</p>
      {!editing ? (
        <>
          <div className="wka-record"><RecRow label={t('companyAdmin.retention.windowLabel')} value={recLabel} /></div>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <SavedTag show={saved} />
        </>
      ) : (
        <>
          <div className="wka-field" style={{ maxWidth: 260 }}>
            <label>{t('companyAdmin.retention.windowDays')}</label>
            <input className="wka-input" type="number" min="0" max="3650" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
            <span className="hint">{n > 0 ? t.n('companyAdmin.retention.purgeHint', n) : t('companyAdmin.retention.keepForeverDot')}</span>
          </div>
          {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button type="button" className="wka-btn primary" disabled={saving || !Number.isInteger(n) || n < 0 || n > 3650} onClick={save}>{saving ? <Spinning /> : null} {t('companyAdmin.retention.save')}</button>
            <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('companyAdmin.common.cancel')}</button>
            <SavedTag show={saved} />
            {purged != null && purged > 0 ? <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t.n('companyAdmin.retention.purged', purged)}</span> : null}
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
  const t = useT()
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
    if (reason.length < 3) { setErr(new Error(t('companyAdmin.kb.reasonRequired'))); return }
    setBusy(true); setErr(null); setDone(null)
    try {
      const r = await api.workTeamClearLearnings(reason)
      setCount(0); setClearReason(''); setConfirmClear(false)
      flash(t.n('companyAdmin.kb.cleared', r.cleared ?? 0))
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const doRestore = async () => {
    if (busy || !file) return
    if (restoreMode === 'replace' && restoreReason.trim().length < 3) {
      setErr(new Error(t('companyAdmin.kb.replaceReasonRequired'))); return
    }
    setBusy(true); setErr(null); setDone(null)
    try {
      const text = await file.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { throw new Error(t('companyAdmin.kb.invalidJson')) }
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.learnings) ? parsed.learnings : (Array.isArray(parsed.kb) ? parsed.kb : null))
      if (!arr) throw new Error(t('companyAdmin.kb.noLearnings'))
      const r = await api.workTeamImportLearnings(arr, restoreMode, restoreReason.trim() || undefined)
      setCount(r.count ?? arr.length)
      setFile(null); setRestoreReason(''); if (fileRef.current) fileRef.current.value = ''
      flash(t.n('companyAdmin.kb.restored', r.imported ?? arr.length, { mode: restoreMode }) + (restoreMode === 'replace' ? t('companyAdmin.kb.loggedSuffix') : ''))
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (!loaded) return null
  return (
    <div className="wka-panel">
      <h2><Brain size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.kb.title')}</h2>
      <p className="desc">
        {t('companyAdmin.kb.desc')}
      </p>
      <div className="wka-field" style={{ maxWidth: 360 }}>
        <label>{t('companyAdmin.kb.entriesStored')}</label>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wka-text)' }}>{count}</div>
        <span className="hint">{t('companyAdmin.kb.entriesHint')}</span>
      </div>

      {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-cyan)' }}><Check size={14} /> {done}</div> : null}

      {/* Backup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="wka-btn" href={api.workTeamLearningsExportUrl()} download={`workcopilot-kb-backup.json`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> {t('companyAdmin.kb.downloadBackup')}
        </a>
        <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t('companyAdmin.kb.downloadNote')}</span>
      </div>

      {/* Restore */}
      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label><Upload size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t('companyAdmin.kb.restoreLabel')}</label>
          <input ref={fileRef} className="wka-input" type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          <span className="hint">{t('companyAdmin.kb.restoreHint')}</span>
        </div>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label>{t('companyAdmin.kb.mode')}</label>
          <select className="wka-input" value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
            <option value="merge">{t('companyAdmin.kb.modeMerge')}</option>
            <option value="replace">{t('companyAdmin.kb.modeReplace')}</option>
          </select>
        </div>
        {restoreMode === 'replace' && (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label>{t('companyAdmin.kb.restoreReasonLabel')}</label>
            <textarea className="wka-input" rows={2} value={restoreReason} onChange={(e) => setRestoreReason(e.target.value)} placeholder={t('companyAdmin.kb.restoreReasonPh')} />
          </div>
        )}
        <button type="button" className="wka-btn primary" disabled={busy || !file} onClick={doRestore}>{busy ? <Spinning /> : <Upload size={14} />} {t('companyAdmin.kb.restoreBtn')}</button>
      </div>

      {/* Clear */}
      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        {!confirmClear ? (
          <button type="button" className="wka-btn danger" disabled={busy || !count} onClick={() => { setConfirmClear(true); setErr(null) }}>
            <Trash2 size={14} /> {t('companyAdmin.kb.clearBtn')}
          </button>
        ) : (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t('companyAdmin.kb.clearConfirmLabel', { count })}</label>
            <textarea className="wka-input" rows={2} value={clearReason} onChange={(e) => setClearReason(e.target.value)} placeholder={t('companyAdmin.kb.clearReasonPh')} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="wka-btn danger" disabled={busy} onClick={doClear}>{busy ? <Spinning /> : <Trash2 size={14} />} {t('companyAdmin.kb.confirmClear')}</button>
              <button type="button" className="wka-btn" disabled={busy} onClick={() => { setConfirmClear(false); setClearReason(''); setErr(null) }}>{t('companyAdmin.common.cancel')}</button>
            </div>
            <span className="hint">{t('companyAdmin.kb.clearHint')}</span>
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
  const t = useT()
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
    if (reason.length < 3) { setErr(new Error(t('companyAdmin.skills.reasonRequired'))); return }
    setBusy(true); setErr(null); setDone(null)
    try {
      const r = await api.workTeamSkillsClear(reason)
      setCount(0); setClearReason(''); setConfirmClear(false)
      flash(t.n('companyAdmin.skills.cleared', (r && r.cleared === 1) ? 1 : 2, { count: (r && r.cleared != null) ? r.cleared : t('companyAdmin.skills.all') }))
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const doRestore = async () => {
    if (busy || !file) return
    setBusy(true); setErr(null); setDone(null)
    try {
      const text = await file.text()
      let parsed
      try { parsed = JSON.parse(text) } catch { throw new Error(t('companyAdmin.kb.invalidJson')) }
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.skills) ? parsed.skills : null)
      if (!arr) throw new Error(t('companyAdmin.skills.noSkills'))
      const r = await api.workTeamSkillsImport(arr, restoreMode === 'replace')
      setCount(r && r.count != null ? r.count : arr.length)
      setFile(null); if (fileRef.current) fileRef.current.value = ''
      flash(t.n('companyAdmin.skills.reuploaded', (r && r.imported === 1) ? 1 : 2, { count: (r && r.imported != null) ? r.imported : arr.length, mode: restoreMode }) + (restoreMode === 'replace' ? t('companyAdmin.kb.loggedSuffix') : ''))
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (!loaded) return null
  return (
    <div className="wka-panel">
      <h2><Blocks size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-emerald)' }} />{t('companyAdmin.skills.title')}</h2>
      <p className="desc">
        {t('companyAdmin.skills.desc')}
      </p>
      <div className="wka-field" style={{ maxWidth: 360 }}>
        <label>{t('companyAdmin.skills.stored')}</label>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--wka-text)' }}>{count}</div>
        <span className="hint">{t('companyAdmin.skills.storedHint')}</span>
      </div>

      {err ? <div style={{ margin: '10px 0' }}><ErrorBox error={err} /></div> : null}
      {done ? <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {done}</div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="wka-btn" href={api.workTeamSkillsExportUrl()} download="workcopilot-skills-backup.json" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> {t('companyAdmin.skills.download')}
        </a>
        <span style={{ fontSize: 12, color: 'var(--wka-muted)' }}>{t('companyAdmin.skills.downloadNote')}</span>
      </div>

      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label><Upload size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t('companyAdmin.skills.reuploadLabel')}</label>
          <input ref={fileRef} className="wka-input" type="file" accept="application/json,.json" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
          <span className="hint">{t('companyAdmin.skills.reuploadHint')}</span>
        </div>
        <div className="wka-field" style={{ maxWidth: 420 }}>
          <label>{t('companyAdmin.kb.mode')}</label>
          <select className="wka-input" value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)}>
            <option value="merge">{t('companyAdmin.skills.modeMerge')}</option>
            <option value="replace">{t('companyAdmin.skills.modeReplace')}</option>
          </select>
        </div>
        <button type="button" className="wka-btn primary" disabled={busy || !file} onClick={doRestore}>{busy ? <Spinning /> : <Upload size={14} />} {t('companyAdmin.skills.reuploadBtn')}</button>
      </div>

      <div style={{ borderTop: '1px solid var(--wka-line)', marginTop: 16, paddingTop: 14 }}>
        {!confirmClear ? (
          <button type="button" className="wka-btn danger" disabled={busy || !count} onClick={() => { setConfirmClear(true); setErr(null) }}>
            <Trash2 size={14} /> {t('companyAdmin.skills.clearBtn')}
          </button>
        ) : (
          <div className="wka-field" style={{ maxWidth: 420 }}>
            <label style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />{t('companyAdmin.skills.clearConfirmLabel', { count })}</label>
            <textarea className="wka-input" rows={2} value={clearReason} onChange={(e) => setClearReason(e.target.value)} placeholder={t('companyAdmin.skills.clearReasonPh')} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="wka-btn danger" disabled={busy} onClick={doClear}>{busy ? <Spinning /> : <Trash2 size={14} />} {t('companyAdmin.kb.confirmClear')}</button>
              <button type="button" className="wka-btn" disabled={busy} onClick={() => { setConfirmClear(false); setClearReason(''); setErr(null) }}>{t('companyAdmin.common.cancel')}</button>
            </div>
            <span className="hint">{t('companyAdmin.kb.clearHint')}</span>
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
  const t = useT()
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
      <h2><Download size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.deploy.title')}</h2>
      <p className="desc">{t('companyAdmin.deploy.desc')}</p>
      {msi === undefined ? <Loading label={t('companyAdmin.deploy.checking')} />
        : !msi || !msi.available ? (
          <div className="wka-note"><Info size={14} /> {t('companyAdmin.deploy.notPublished')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <a className="wka-btn primary" href="/api/work/app/msi" download><Download size={14} /> {t('companyAdmin.deploy.downloadMsi')}</a>
              <span className="wka-badge active">{msi.version ? `v${msi.version} · ` : ''}COE Security LLC</span>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--wka-faint)' }}>{t('companyAdmin.deploy.silentInstall')}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 6, maxWidth: 560 }}>
              <code className="wka-mono" style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--wka-line)', background: 'var(--wka-panel-2)', fontSize: 12.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>{cmd}</code>
              <button type="button" className="wka-btn sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('companyAdmin.common.copied') : t('companyAdmin.common.copy')}</button>
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--wka-muted)', lineHeight: 1.55 }}>
              <div>{t.rich('companyAdmin.deploy.gpo')}</div>
              <div>{t.rich('companyAdmin.deploy.sccm')} <code className="wka-mono">msiexec /x WorkCoPilot-Setup.msi /qn</code>.</div>
              <div style={{ marginTop: 6, color: 'var(--wka-faint)' }}>{t('companyAdmin.deploy.unattended')}</div>
            </div>
          </>
        )}
    </div>
  )
}

function OverviewSection({ company, onOpen }) {
  const t = useT()
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

  if (state.loading) return <Loading label={t('companyAdmin.overview.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const lic = state.lic || {}
  const d = state.cons
  const userLabel = lic.userSeats > 0 ? t('companyAdmin.overview.seatsOf', { used: lic.userSeatsUsed, total: lic.userSeats }) : `${lic.userSeatsUsed || 0}`
  const adminLabel = lic.adminSeats > 0 ? t('companyAdmin.overview.seatsOf', { used: lic.adminSeatsUsed, total: lic.adminSeats }) : `${lic.adminSeatsUsed || 0}`
  const aiReady = company ? company.aiReady : undefined

  // Seat meters: only where a limit exists (an unlimited pool has no honest bar).
  const seatMeter = (used, total) => (total > 0
    ? <div style={{ marginTop: 8 }}><Meter value={used || 0} max={total} thin tone={(used || 0) >= total ? 'warn' : 'accent'} ariaLabel={t('companyPlan.seats.meterAria', { used: used || 0, total })} /></div>
    : null)

  return (
    <div>
      <style>{VIZ_CSS}</style>
      <div className="wka-cards">
        <div className="wka-card">
          <div className="k"><Users size={15} /> {t('companyAdmin.overview.userLicenses')}</div>
          <div className="v">{userLabel}</div>
          {seatMeter(lic.userSeatsUsed, lic.userSeats)}
          <div className="foot">{lic.userSeatsLeft == null ? t('companyAdmin.overview.noLimitSet') : t('companyAdmin.overview.left', { n: lic.userSeatsLeft })}</div>
        </div>
        <div className="wka-card">
          <div className="k"><UserCog size={15} /> {t('companyAdmin.overview.adminSeats')}</div>
          <div className="v">{adminLabel}</div>
          {seatMeter(lic.adminSeatsUsed, lic.adminSeats)}
          <div className="foot">{lic.adminSeatsLeft == null ? t('companyAdmin.overview.noLimitSet') : t('companyAdmin.overview.left', { n: lic.adminSeatsLeft })}</div>
        </div>
        <div className="wka-card">
          <div className="k"><Clock size={15} /> {t('companyAdmin.overview.minutePool')}</div>
          <div className="v">{fmtMins(lic.poolSeconds)}</div>
          <div className="foot">{t('companyAdmin.overview.sharedBackup')}</div>
        </div>
        <div className="wka-card accent">
          <div className="k"><Cpu size={15} /> {t('companyAdmin.overview.guidedSessions')}</div>
          <div className="v">{d ? (d.sessionCount || 0) : '-'}</div>
          <div className="foot">{d ? t('companyAdmin.overview.totalForCompany') : t('companyAdmin.overview.noDataYet')}</div>
        </div>
      </div>

      {company && aiReady === false && (
        <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><AlertTriangle size={14} /> {company.aiReason || t('companyAdmin.overview.aiNotConfigured')} {company.aiSource === 'company' ? <button type="button" className="wka-btn sm ghost" style={{ marginLeft: 6 }} onClick={() => onOpen && onOpen('ai')}>{t('companyAdmin.overview.aiSetKeys')}</button> : ''}</div>
      )}

      <CompanyPoolCard onOpen={onOpen} />
      <AuthorizationCard />
      <CompanyRetentionCard />
      <KnowledgeBaseCard />
      <SkillsBackupCard />
      <EnterpriseDeployCard />

      {lic.tierUsage && (
        <div className="wka-panel">
          <h2>{t('companyAdmin.overview.licensesByPlan')} <Help text={t('companyAdmin.overview.licensesByPlanHelp')} /></h2>
          <div className="wka-cards" style={{ marginBottom: 0 }}>
            {TIERS.map((tier) => {
              const tu = lic.tierUsage[tier.id] || { allocated: 0, used: 0, left: 0 }
              return (
                <div key={tier.id} className="wka-card">
                  <div className="k">{tier.name}</div>
                  <div className="v">{t('companyAdmin.overview.seatsOf', { used: tu.used, total: tu.allocated })}</div>
                  {seatMeter(tu.used, tu.allocated)}
                  <div className="foot">{t('companyAdmin.overview.available', { n: tu.left })}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="wka-panel">
        <h2>{t('companyAdmin.overview.companyTitle')}</h2>
        <p className="desc">{t('companyAdmin.overview.companyDesc', { name: company ? company.name : t('companyAdmin.overview.yourCompany') })}</p>
        <div className="wca-kv">
          <div><span>{t('companyAdmin.overview.kvName')}</span><b>{company ? company.name : '-'}</b></div>
          <div><span>{t('companyAdmin.overview.kvLicenseMode')}</span><b style={{ textTransform: 'capitalize' }}>{(company && company.licenseMode) || 'locked'}</b></div>
          <div><span>{t('companyAdmin.overview.kvSignIn')}</span><b>{company && company.ssoProvisioning === 'auto' ? t('companyAdmin.overview.signInOpen') : t('companyAdmin.overview.signInInvite')}</b></div>
          <div><span>{t('companyAdmin.overview.kvAiSource')}</span><b>{company && company.aiSource === 'company' ? t('companyAdmin.overview.aiSourceOwn') : company && company.aiSource === 'platform' ? t('companyAdmin.overview.aiSourcePlatform') : t('companyAdmin.overview.aiSourceNotSet')}</b></div>
          <div><span>{t('companyAdmin.overview.kvAiStatus')}</span><b style={{ color: aiReady ? 'var(--wka-emerald)' : 'var(--wka-amber)' }}>{aiReady ? t('companyAdmin.overview.aiReady') : t('companyAdmin.overview.aiNotReady')}</b></div>
          <div><span>{t('companyAdmin.overview.kvSso')}</span><b>{company && company.sso && company.sso.connected ? t('companyAdmin.overview.ssoConnected', { provider: company.sso.provider }) : t('companyAdmin.overview.ssoNotConnected')}</b></div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.overview.peopleUsage')} <Help text={t('companyAdmin.overview.peopleUsageHelp')} /></h2>
        {!lic.members || !lic.members.length ? <EmptyState title={t('companyAdmin.overview.noPeople')} detail={t('companyAdmin.overview.noPeopleDetail')} />
          : (
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>{t('companyAdmin.overview.thPerson')}</th><th>{t('companyAdmin.overview.thRole')}</th><th>{t('companyAdmin.overview.thPlan')}</th><th>{t('companyAdmin.overview.thUsedToday')}</th><th>{t('companyAdmin.overview.thExtraMinutes')}</th><th>{t('companyAdmin.overview.thLicense')}</th></tr></thead>
                <tbody>
                  {lic.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.displayName || m.username}{m.email ? <div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{m.email}</div> : null}</td>
                      <td>{t(ROLE_LABEL[m.companyRole] || 'companyAdmin.roles.member')}</td>
                      <td><span className={`wka-badge ${m.tier}`}>{m.tier}</span></td>
                      {/* Consumed today from every source; the only denominator is this
                          person's own daily ceiling (pool-based companies), never a tier bucket. */}
                      <td title={m.usage.dailySeconds != null ? t('companyPlan.usedTodayCeiling') : undefined}>{fmtMins(m.usage.usedSeconds)} {m.usage.dailySeconds != null ? <span style={{ color: 'var(--wka-faint)' }}>/ {fmtMins(m.usage.dailySeconds)}</span> : null}</td>
                      <td>{m.usage.purchasedSeconds ? fmtMins(m.usage.purchasedSeconds) : '-'}</td>
                      <td>{m.licensed ? <span className="wka-chip ok">{t('companyAdmin.overview.statusActive')}</span> : <span className="wka-chip" style={{ color: 'var(--wka-amber)' }}>{t('companyAdmin.overview.statusNoSeat')}</span>}</td>
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
  const t = useT()
  const [company, setCompanyLocal] = useState(null)
  const [members, setMembers] = useState(null)      // from the license summary (has usage)
  const [pool, setPool] = useState(0)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState('')
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState('email')          // 'email' (SSO) | 'password' (non-SSO)
  const EMPTY_FORM = { email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic', workFlow: 'independent' }
  const [form, setForm] = useState(EMPTY_FORM)
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
        // The license summary carries usage; the user list carries each person's
        // work flow (worker / independent / mixed). Merge by id, ONE row per person.
        const flowOf = new Map((r.users || []).map((u) => [String(u.id), normalizeFlow(u.workFlow)]))
        setMembers((lic.members || []).map((m) => ({ ...m, workFlow: flowOf.get(String(m.id)) || 'independent' })))
        setPool(lic.poolSeconds || 0)
        // Default the add mode to email when SSO is connected, else password.
        setMode(co && co.sso && co.sso.connected ? 'email' : 'password')
      })
      .catch((error) => { setErr(error); setMembers([]) })
  }, [onCompany])
  useEffect(() => { load() }, [load])

  const locked = !!(company && company.licenseMode === 'locked')

  // The create route takes role + plan; the work flow is set through the SAME
  // member-update route the row selects use (one writer for the flow). Create
  // answers `user` (password account) or `{ user }` (SSO account).
  const applyFlow = async (created) => {
    const u = created && (created.user || created)
    if (u && u.id && form.workFlow !== 'independent') await api.workCompanyUpdateUser(u.id, { workFlow: form.workFlow })
  }
  const create = async () => {
    setErr(null); setOk('')
    if (mode === 'email') {
      const email = form.email.trim().toLowerCase()
      if (!email.includes('@')) { setErr(new Error(t('companyAdmin.team.errWorkEmail'))); return }
      setBusy(true)
      try {
        const created = await api.workCompanyCreateUser({ email, displayName: form.displayName.trim(), companyRole: form.companyRole, tier: form.tier })
        await applyFlow(created)
        setOk(t('companyAdmin.team.addedSso', { email })); setForm(EMPTY_FORM); setAdding(false); load()
      } catch (error) { setErr(error) } finally { setBusy(false) }
    } else {
      const username = form.username.trim()
      const email = form.email.trim().toLowerCase()
      if (!username) { setErr(new Error(t('companyAdmin.team.errUsername'))); return }
      if (!email.includes('@')) { setErr(new Error(t('companyAdmin.team.errEmailForPassword'))); return }
      setBusy(true)
      try {
        // Password is optional: leave it blank and the person sets their own via
        // the emailed set-password link (recommended). A password typed here is
        // honored, but the link is still emailed.
        const created = await api.workCompanyCreateUser({ username, email, ...(form.password ? { password: form.password } : {}), companyRole: form.companyRole, tier: form.tier })
        await applyFlow(created)
        setOk(t('companyAdmin.team.addedPassword', { username, email })); setForm(EMPTY_FORM); setAdding(false); load()
      } catch (error) { setErr(error) } finally { setBusy(false) }
    }
  }
  const patchUser = async (m, patch) => {
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyUpdateUser(m.id, patch); setOk(t('companyAdmin.team.updated', { name: m.displayName || m.username })); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const [askReason, reasonModal] = useReasonModal()
  const removeUser = async (m) => {
    const reason = await askReason({
      title: t('companyAdmin.team.removeTitle', { name: m.displayName || m.username }),
      detail: t('companyAdmin.team.removeDetail'),
      confirmLabel: t('companyAdmin.team.removeConfirm'),
    })
    if (!reason || reason.length < 3) return
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyRemoveUser(m.id, reason); setOk(t('companyAdmin.team.removed', { name: m.displayName || m.username })); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const resetMfa = async (m) => {
    const reason = await askReason({
      title: t('companyAdmin.team.resetMfaTitle', { name: m.displayName || m.username }),
      detail: t('companyAdmin.team.resetMfaDetail'),
      confirmLabel: t('companyAdmin.team.resetMfaConfirm'),
    })
    if (!reason || reason.length < 3) return
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyResetUserMfa(m.id, reason); setOk(t('companyAdmin.team.resetMfaDone', { name: m.displayName || m.username })); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }
  const allocate = async (m) => {
    const mins = Number(allocMin) || 0
    if (mins <= 0) { setErr(new Error(t('companyAdmin.team.errMinutes'))); return }
    setRowBusy(m.id); setErr(null); setOk('')
    try { await api.workCompanyAllocateMinutes(m.id, mins); setOk(t('companyAdmin.team.gaveMinutes', { mins, name: m.displayName || m.username })); setAllocFor(''); setAllocMin(''); load() }
    catch (error) { setErr(error) } finally { setRowBusy('') }
  }

  return (
    <div>
      {reasonModal}
      {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> {t('companyAdmin.team.lockedNote')}</div>}
      <div className="wka-toolbar">
        <button type="button" className="wka-btn primary" disabled={locked} title={locked ? t('companyAdmin.team.rosterManaged') : ''} onClick={() => { setErr(null); setOk(''); setAdding((v) => !v) }}><Plus size={14} /> {t('companyAdmin.team.addPerson')}</button>
        <button type="button" className="wka-btn sm ghost" onClick={load}><RefreshCw size={13} /> {t('companyAdmin.team.refresh')}</button>
        <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('companyAdmin.team.minutePool')} <b style={{ color: 'var(--wka-text)' }}>{fmtMins(pool)}</b></span>
      </div>

      {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
      {err && <ErrorBox error={err} />}

      {adding && !locked && (
        <div className="wka-panel">
          <h2>{t('companyAdmin.team.addTitle')}</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" className={`wka-btn sm${mode === 'email' ? ' primary' : ''}`} onClick={() => setMode('email')}><Mail size={13} /> {t('companyAdmin.team.byEmail')}</button>
            <button type="button" className={`wka-btn sm${mode === 'password' ? ' primary' : ''}`} onClick={() => setMode('password')}><KeyRound size={13} /> {t('companyAdmin.team.byPassword')}</button>
          </div>
          {mode === 'email'
            ? <p className="desc">{t('companyAdmin.team.descEmail')}</p>
            : <p className="desc">{t('companyAdmin.team.descPassword')}</p>}
          <div className="wka-formgrid">
            {mode === 'email' ? (
              <>
                <div className="wka-field"><label>{t('companyAdmin.team.workEmail')}</label><input className="wka-input" value={form.email} maxLength={160} autoComplete="off" placeholder="alex@yourcompany.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="wka-field"><label>{t('companyAdmin.team.name')} <span className="hint">{t('companyAdmin.team.optional')}</span></label><input className="wka-input" value={form.displayName} maxLength={80} placeholder={t('companyAdmin.team.namePh')} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div className="wka-field"><label>{t('companyAdmin.team.username')}</label><input className="wka-input" value={form.username} maxLength={60} autoComplete="off" placeholder={t('companyAdmin.team.usernamePh')} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div className="wka-field"><label>{t('companyAdmin.team.email')} <Help text={t('companyAdmin.team.emailHelp')} /></label><input className="wka-input" type="email" value={form.email} maxLength={160} autoComplete="off" placeholder="alex@yourcompany.com" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="wka-field"><label>{t('companyAdmin.team.tempPassword')} <span style={{ fontWeight: 400, color: 'var(--wka-faint)' }}>{t('companyAdmin.team.optionalParen')}</span></label><input className="wka-input" type="text" value={form.password} maxLength={120} autoComplete="new-password" placeholder={t('companyAdmin.team.tempPasswordPh')} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </>
            )}
            <div className="wka-field"><label>{t('companyAdmin.team.role')} <Help text={t('companyAdmin.team.roleHelp')} /></label>
              <select className="wka-select" value={form.companyRole} onChange={(e) => setForm({ ...form, companyRole: e.target.value })}>
                {COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
              </select>
            </div>
            <div className="wka-field"><label>{t('companyAdmin.team.flow')} <Help text={t('companyAdmin.team.flowHelp')} /></label>
              <select className="wka-select" value={form.workFlow} onChange={(e) => setForm({ ...form, workFlow: e.target.value })}>
                {WORK_FLOW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: 'var(--wka-faint)', marginTop: 4 }}>{t((WORK_FLOW_OPTIONS.find((o) => o.id === form.workFlow) || WORK_FLOW_OPTIONS[0]).helpKey)}</div>
            </div>
            <div className="wka-field"><label>{t('companyAdmin.team.plan')} <Help text={t('companyAdmin.team.planHelp')} /></label>
              <select className="wka-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                {TIERS.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="wka-btn" onClick={() => setAdding(false)}>{t('companyAdmin.common.cancel')}</button>
            <button type="button" className="wka-btn primary" disabled={busy} onClick={create}>{busy ? <Spinning /> : <Plus size={14} />} {t('companyAdmin.team.addPerson')}</button>
          </div>
        </div>
      )}

      <div className="wka-panel">
        <h2>{t('companyAdmin.team.peopleTitle')} <Help text={t('companyAdmin.team.peopleHelp')} /></h2>
        {members == null ? <Loading label={t('companyAdmin.team.loading')} />
          : members.length === 0 ? <EmptyState title={t('companyAdmin.overview.noPeople')} detail={t('companyAdmin.team.noPeopleDetail')} />
            : (
              <div className="wka-table-wrap">
                <table className="wka-table">
                  <thead><tr><th>{t('companyAdmin.overview.thPerson')}</th><th>{t('companyAdmin.overview.thRole')}</th><th>{t('companyAdmin.team.thFlow')}</th><th>{t('companyAdmin.overview.thPlan')}</th><th>{t('companyAdmin.overview.thUsedToday')}</th><th>{t('companyAdmin.team.thExtra')}</th><th>{t('companyAdmin.team.th2fa')}</th><th></th></tr></thead>
                  <tbody>
                    {members.map((m) => {
                      const self = String(m.id) === String(meId)
                      return (
                        <tr key={m.id}>
                          <td>{m.displayName || m.username}<div style={{ fontSize: 11, color: 'var(--wka-faint)' }}>{m.email || m.username}{self ? t('companyAdmin.team.youSuffix') : ''}</div></td>
                          <td>
                            <select className="wka-select" value={m.companyRole || 'member'} disabled={self || rowBusy === m.id}
                              title={self ? t('companyAdmin.team.cannotChangeOwnRole') : ''}
                              onChange={(e) => patchUser(m, { companyRole: e.target.value })}>
                              {COMPANY_ROLE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="wka-select" value={m.workFlow || 'independent'} disabled={rowBusy === m.id} title={t('companyAdmin.team.flowHelp')} aria-label={t('companyAdmin.team.flow')}
                              onChange={(e) => patchUser(m, { workFlow: e.target.value })}>
                              {WORK_FLOW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{t(o.labelKey)}</option>)}
                            </select>
                          </td>
                          <td>
                            <select className="wka-select" value={m.tier || 'basic'} disabled={rowBusy === m.id} onChange={(e) => patchUser(m, { tier: e.target.value })}>
                              {TIERS.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
                            </select>
                          </td>
                          <td style={{ fontSize: 12.5 }} title={m.usage.dailySeconds != null ? t('companyPlan.usedTodayCeiling') : undefined}>{fmtMins(m.usage.usedSeconds)} {m.usage.dailySeconds != null ? <span style={{ color: 'var(--wka-faint)' }}>/ {fmtMins(m.usage.dailySeconds)}</span> : null}</td>
                          <td style={{ fontSize: 12.5 }}>
                            {allocFor === m.id
                              ? <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                                  <input className="wka-input" style={{ width: 64, padding: '4px 6px' }} value={allocMin} placeholder={t('companyAdmin.team.minPh')} onChange={(e) => setAllocMin(e.target.value.replace(/[^0-9]/g, ''))} />
                                  <button className="wka-btn sm primary" disabled={rowBusy === m.id} onClick={() => allocate(m)}>{t('companyAdmin.team.give')}</button>
                                  <button className="wka-btn sm ghost" onClick={() => { setAllocFor(''); setAllocMin('') }}>x</button>
                                </span>
                              : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{m.usage.purchasedSeconds ? fmtMins(m.usage.purchasedSeconds) : '-'}<button className="wka-btn sm ghost" title={t('companyAdmin.team.giveMinutesTitle')} disabled={pool <= 0} onClick={() => { setAllocFor(m.id); setAllocMin('') }}><Clock size={12} /></button></span>}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {m.mfaEnabled
                              ? <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: 'var(--wka-accent)' }}><Check size={13} /> {t('companyAdmin.team.mfaOn')}</span>
                              : <span style={{ color: 'var(--wka-amber)' }}>{t('companyAdmin.team.mfaNotSet')}</span>}
                            {m.mfaEnabled ? <button type="button" className="wka-btn sm ghost" title={t('companyAdmin.team.resetMfaTitleShort')} disabled={rowBusy === m.id} onClick={() => resetMfa(m)} style={{ marginLeft: 6 }}><KeyRound size={12} /></button> : null}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {rowBusy === m.id ? <Spinning /> : <button type="button" className="wka-btn sm ghost" disabled={self || locked} title={locked ? t('companyAdmin.team.rosterManagedShort') : self ? t('companyAdmin.team.cannotRemoveSelf') : t('companyAdmin.team.removeFromCompany')} onClick={() => removeUser(m)}><Trash2 size={13} /></button>}
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
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }
  return (
    <span className="wca-copy">
      <code className="wka-mono">{value}</code>
      <button type="button" className="wka-btn sm ghost" onClick={copy} title={t('companyAdmin.common.copy')}>{copied ? <Check size={12} /> : <Copy size={12} />}</button>
    </span>
  )
}

function SsoSection({ company }) {
  const t = useT()
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

  if (state.loading) return <Loading label={t('companyAdmin.sso.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const connected = state.sso && state.sso.connected
  const guide = (SSO.SSO_PROVIDERS || []).find((p) => p.id === form.provider) || null
  const issuerHint = guide ? guide.issuer : 'https://your-identity-provider/...'

  return (
    <div>
      {/* Owner confusion 2026-10-27: the provider list (Google, Microsoft, ...)
          read like the public social sign-in buttons. Say up front what this is. */}
      <div className="wka-note"><Info size={14} /> {t('companyAdmin.sso.notSocial')}</div>
      <div className="wka-note"><Info size={14} /> {t('companyAdmin.sso.registerCallback')} <CopyField value={callbackUrl} /></div>
      <div className="wka-note" style={{ color: inviteOnly ? 'var(--wka-amber)' : undefined }}><Lock size={14} />
        {/* .wka-note is a flex row: rich text with inline <b> must sit in ONE
            child, or each text run becomes its own flex item and the sentence
            stacks into a column (seen 2026-10-27 at 1280px). */}
        <span style={{ minWidth: 0 }}>{inviteOnly
          ? <>{t.rich('companyAdmin.sso.inviteNote')}</>
          : <>{t.rich('companyAdmin.sso.openPre')}{state.sso && state.sso.domain ? <b>@{state.sso.domain}</b> : t('companyAdmin.sso.yourEmailDomain')}{t('companyAdmin.sso.openPost')}</>}</span>
      </div>
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{connected ? t('companyAdmin.sso.isConnected') : t('companyAdmin.sso.connect')} {connected ? <span className="wka-badge active" style={{ marginLeft: 6 }}>{SSO_PROVIDER_LABELS[state.sso.provider] || state.sso.provider}</span> : null}</h2>
          {!editing ? <EditToggle editing={editing} onEdit={() => { setForm(formFromSso(state.sso)); setEditing(true); setSaveErr(null) }} /> : null}
        </div>
        <p className="desc">{t('companyAdmin.sso.desc')}</p>
        {!editing ? (
          <>
            <div className="wka-record">
              <RecRow label={t('companyAdmin.sso.provider')} value={SSO_PROVIDER_LABELS[state.sso && state.sso.provider] || (state.sso && state.sso.provider) || '-'} />
              <RecRow label={t('companyAdmin.sso.emailDomain')} value={(state.sso && state.sso.domain) || '-'} />
              <RecRow label={t('companyAdmin.sso.issuerUrl')} value={(state.sso && state.sso.issuer) || '-'} />
              <RecRow label={t('companyAdmin.sso.clientId')} value={(state.sso && state.sso.clientId) || '-'} />
              <RecRow label={t('companyAdmin.sso.clientSecret')} value={state.sso && state.sso.connected ? t('companyAdmin.sso.secretSet') : t('companyAdmin.sso.secretNotSet')} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
            <SavedTag show={saved} />
          </>
        ) : (
          <>
            <div className="wka-formgrid">
              <div className="wka-field"><label>{t('companyAdmin.sso.provider')}</label>
                <select className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                  {SSO_PROVIDER_ORDER.map((id) => <option key={id} value={id}>{SSO_PROVIDER_LABELS[id]}</option>)}
                </select>
              </div>
              <div className="wka-field"><label>{t('companyAdmin.sso.emailDomain')} <Help text={t('companyAdmin.sso.emailDomainHelp')} /></label><input className="wka-input" value={form.domain} placeholder="acme.com" onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
              <div className="wka-field"><label>{t('companyAdmin.sso.issuerUrl')} <Help text={guide ? guide.issuerNote : t('companyAdmin.sso.issuerHelpFallback')} /></label><input className="wka-input" value={form.issuer} placeholder={issuerHint} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
              <div className="wka-field"><label>{t('companyAdmin.sso.clientId')}</label><input className="wka-input" value={form.clientId} placeholder={t('companyAdmin.sso.fromProvider')} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
              <div className="wka-field"><label>{t('companyAdmin.sso.clientSecret')} <Help text={t('companyAdmin.sso.clientSecretHelp')} /></label><input className="wka-input" type="password" value={form.clientSecret} placeholder={connected ? t('companyAdmin.sso.leaveBlankKeep') : t('companyAdmin.sso.fromProvider')} autoComplete="new-password" onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="button" className="wka-btn primary" disabled={saving} onClick={save}>{saving ? <Spinning /> : <ShieldCheck size={14} />} {t('companyAdmin.sso.save')}</button>
              {connected ? <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('companyAdmin.common.cancel')}</button> : null}
              <SavedTag show={saved} />
            </div>
            {saveErr ? <div style={{ marginTop: 12 }}><ErrorBox error={saveErr} /></div> : null}
          </>
        )}
      </div>

      <div className="wka-panel">
        <button type="button" className="wca-guide-head" onClick={() => setGuideOpen((v) => !v)}>
          {guideOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h2 style={{ margin: 0 }}>{t('companyAdmin.sso.setupGuide')}{guide ? t('companyAdmin.sso.setupGuideFor', { name: guide.name }) : ''}</h2>
        </button>
        {guideOpen && (
          <div className="wca-guide">
            {(SSO.SSO_OVERVIEW || []).map((t, i) => <p key={i} className="desc">{t}</p>)}

            <h3>{SSO.SSO_ROLES.title}</h3>
            <ul className="wca-guide-list">{SSO.SSO_ROLES.points.map(([t, d], i) => <li key={i}><b>{t}.</b> {d}</li>)}</ul>

            <h3>{t('companyAdmin.sso.registerRedirect')}</h3>
            {(SSO.SSO_REDIRECT_NOTE || []).map((txt, i) => <p key={i} className="desc">{txt}</p>)}
            <CopyField value={callbackUrl} />

            {guide ? (
              <>
                <h3>{t('companyAdmin.sso.stepByStepIn', { name: guide.name })}</h3>
                <p className="desc">{t('companyAdmin.sso.console')} <a href={guide.console} target="_blank" rel="noreferrer">{guide.console}</a>{t('companyAdmin.sso.issuerToEnter')} <code className="wka-mono">{guide.issuer}</code>. {guide.issuerNote}</p>
                <ol className="wca-guide-steps">{guide.steps.map(([txt, d], i) => <li key={i}><b>{txt}.</b> {d}</li>)}</ol>
                <div className="wca-scenario"><b>{guide.scenario.title}</b><p>{guide.scenario.body}</p></div>
              </>
            ) : (
              <>
                <h3>{t('companyAdmin.sso.stepByStep')}</h3>
                <p className="desc">{t('companyAdmin.sso.stepByStepDesc')}</p>
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
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, bill: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamBilling().then((bill) => setState({ loading: false, error: null, bill })).catch((error) => setState({ loading: false, error, bill: null }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label={t('companyAdmin.billing.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const b = state.bill || {}
  const lines = [...(b.seatLines || []), ...(b.ledger || [])]
  const cur = (b.currency || 'usd').toUpperCase()
  return (
    <div>
      <div className="wka-note"><Info size={14} /> {t('companyAdmin.billing.note')}</div>
      <div className="wka-panel">
        <h2>{t('companyAdmin.billing.statementFor', { name: b.name })}</h2>
        {!lines.length ? <EmptyState title={t('companyAdmin.billing.noCharges')} detail={t('companyAdmin.billing.noChargesDetail')} />
          : (
            <div className="wka-table-wrap">
              <table className="wka-table">
                <thead><tr><th>{t('companyAdmin.billing.thDescription')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thQty')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thUnit')}</th><th style={{ textAlign: 'right' }}>{t('companyAdmin.billing.thAmount')}</th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id || i}><td>{l.description || l.type}</td><td style={{ textAlign: 'right' }}>{l.qty != null ? l.qty : ''}</td><td style={{ textAlign: 'right' }}>{l.unitAmount != null ? money(l.unitAmount) : ''}</td><td style={{ textAlign: 'right' }}>{money(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} style={{ textAlign: 'right', color: 'var(--wka-muted)' }}>{t('companyAdmin.billing.recurring')}</td><td style={{ textAlign: 'right' }}>{money(b.recurringTotal)}</td></tr>
                  <tr><td colSpan={3} style={{ textAlign: 'right', color: 'var(--wka-muted)' }}>{t('companyAdmin.billing.extras')}</td><td style={{ textAlign: 'right' }}>{money(b.extrasTotal)}</td></tr>
                  <tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>{t('companyAdmin.billing.total', { cur })}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(b.total)}</td></tr>
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
  const t = useT()
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
      reason = await askReason({ title: t('companyAdmin.ai.removeWsTitle'), detail: t('companyAdmin.ai.removeWsDetail'), confirmLabel: t('companyAdmin.ai.removeWsConfirm') })
      if (!reason || reason.length < 3) return
    }
    setWsBusy(true); setWsErr(null); setWsOk('')
    try { await api.workTeamSetWebSearch(key, 'tavily', reason); setWsKey(''); setWsOk(clear ? t('companyAdmin.ai.wsRemoved') : t('companyAdmin.ai.wsSaved')); load() }
    catch (error) { setWsErr(error) } finally { setWsBusy(false) }
  }

  const save = async () => {
    if (!form.apiKey.trim()) return
    setBusy(true); setErr(null); setOk('')
    try { await api.workTeamSetAiKeys(form); setOk(t('companyAdmin.ai.savedRunsOnKeys')); setForm({ providerId: '', apiKey: '' }); load() }
    catch (error) { setErr(error) } finally { setBusy(false) }
  }
  const clear = async () => {
    const reason = await askReason({ title: t('companyAdmin.ai.removeKeysTitle'), detail: t('companyAdmin.ai.removeKeysDetail'), confirmLabel: t('companyAdmin.ai.removeKeysConfirm') })
    if (!reason || reason.length < 3) return
    setBusy(true); setErr(null); setOk('')
    try {
      // Say what ACTUALLY happened: the server restores the AI source the
      // WorkCoPilot team chose before your keys were added. If that choice was
      // "company keys", AI is unavailable until keys are set again (never a
      // silent switch to platform keys).
      const c = await api.workTeamSetAiKeys({ apiKey: '', reason })
      if (c && c.aiReady) setOk(t('companyAdmin.ai.keysRemovedPlatform'))
      else setOk(t('companyAdmin.ai.keysRemovedPaused'))
      load()
    } catch (error) { setErr(error) } finally { setBusy(false) }
  }

  const cur = company && company.companyAi
  // Which of the three setups this company is on (one registry, RULE II). A
  // company admin can act on option 1 only (enter their own key, below); moving
  // onto the team-entered or shared platform keys is the WorkCoPilot team's call,
  // so those two stay visible but locked with the reason. Picking option 1 just
  // moves focus to the key field; the switch itself happens when a key is saved.
  const setup = aiSetupOf(company)
  const providerRef = useRef(null)
  return (
    <div>
      {reasonModal}
      <div className="wka-panel">
        <AiSourceChoice name="wca-ai" voice="company" value={setup || ''} company={company} lockedIds={['managed', 'platform']} onChange={(id) => { if (id === 'client' && providerRef.current) providerRef.current.focus() }} />
        {cur
          ? <p className="desc" style={{ margin: '12px 0 0' }}>{t('companyAdmin.ai.keyPrefix')} <code className="wka-mono">{cur.keyMasked}</code> {t('companyAdmin.ai.isSet')} {cur.owner === 'company' ? t('companyAdmin.ai.ownerOwn') : t('companyAdmin.ai.ownerTeam')}</p>
          : (setup && setup !== 'platform' ? <div className="wka-note" style={{ color: 'var(--wka-amber)', marginTop: 12 }}><AlertTriangle size={14} /> {t('companyAdmin.ai.pausedNoKey')}</div> : null)}
      </div>
      <div className="wka-panel">
        <h2>{t('companyAdmin.ai.useOwnKeys')} <Help text={t('companyAdmin.ai.useOwnKeysHelp')} /></h2>
        <div className="wka-formgrid">
          <div className="wka-field"><label>{t('companyAdmin.ai.provider')}</label><input ref={providerRef} className="wka-input" value={form.providerId} placeholder={t('companyAdmin.ai.providerPh')} onChange={(e) => setForm({ ...form, providerId: e.target.value })} /></div>
          <div className="wka-field"><label>{t('companyAdmin.ai.apiKey')}</label><input className="wka-input" type="password" value={form.apiKey} placeholder={t('companyAdmin.ai.apiKeyPh')} autoComplete="new-password" onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
        </div>
        {ok && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {ok}</div>}
        {err && <ErrorBox error={err} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {cur && cur.owner === 'company' && <button type="button" className="wka-btn" disabled={busy} onClick={clear}>{t('companyAdmin.ai.removeMyKeys')}</button>}
          <button type="button" className="wka-btn primary" disabled={busy || !form.apiKey.trim()} onClick={save}>{busy ? <Spinning /> : <KeyRound size={14} />} {t('companyAdmin.ai.useMyKeys')}</button>
        </div>
      </div>

      <div className="wka-panel">
        <h2><Globe size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.ai.liveWeb')} <Help text={t('companyAdmin.ai.liveWebHelp')} /></h2>
        <p className="desc">{t('companyAdmin.ai.liveWebDesc')}</p>
        {company && company.webSearchConfigured
          ? <p className="desc">{t('companyAdmin.ai.configuredOn')} <b>{(company.webSearch && company.webSearch.provider) || 'tavily'}</b>{t('companyAdmin.ai.keyWord')} <code className="wka-mono">{company.webSearch && company.webSearch.keyMasked}</code>{company.webSearch && company.webSearch.setAt ? t('companyAdmin.ai.setDate', { date: fmtDate(company.webSearch.setAt) }) : ''}.</p>
          : <p className="desc">{t('companyAdmin.ai.noWebKey')}</p>}
        <div className="wka-field" style={{ maxWidth: 420, margin: '4px 0 12px' }}>
          <label>{t('companyAdmin.ai.tavilyKey')}</label>
          <input className="wka-input" type="password" autoComplete="new-password" value={wsKey} placeholder={t('companyAdmin.ai.tavilyKeyPh')} onChange={(e) => setWsKey(e.target.value)} />
        </div>
        {wsOk && <div className="wka-note" style={{ color: 'var(--wka-emerald)' }}><Check size={14} /> {wsOk}</div>}
        {wsErr && <ErrorBox error={wsErr} />}
        <div style={{ display: 'flex', gap: 10 }}>
          {company && company.webSearchConfigured && <button type="button" className="wka-btn" disabled={wsBusy} onClick={() => saveWs(true)}>{t('companyAdmin.ai.removeKey')}</button>}
          <button type="button" className="wka-btn primary" disabled={wsBusy || !wsKey.trim()} onClick={() => saveWs(false)}>{wsBusy ? <Spinning /> : <KeyRound size={14} />} {t('companyAdmin.ai.saveKey')}</button>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Company-level screenshot-capture policy. A company admin decides whether their
// company's users' reports AND session logs keep milestone screenshots. Default
// ON; mirrors the company-vs-individual governance pattern on the server
// (workUserReportShotsOn). Self-contained card: reads the value from the company
// payload, saves through the shared admin client, and syncs the parent so the
// value stays correct across tab switches. Never fails silently (SUPREME RULE
// III): a save error is surfaced and the toggle reverts to the real state.
function ReportShotsCard({ company, onCompany }) {
  const t = useT()
  const loaded = !!(company && Object.prototype.hasOwnProperty.call(company, 'reportShots'))
  const [on, setOn] = useState(loaded ? company.reportShots !== false : true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const companyVal = loaded ? company.reportShots !== false : null
  useEffect(() => { if (loaded) setOn(companyVal) }, [loaded, companyVal])

  const apply = async (next) => {
    if (saving || next === on) return
    setSaving(true); setErr(null); setSaved(false)
    const prev = on
    setOn(next)   // optimistic
    try {
      const r = await api.workCompanySetReportShots(next)
      const val = !!(r && r.reportShots !== false)
      setOn(val)
      if (onCompany && company) onCompany({ ...company, reportShots: val })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setOn(prev); setErr(error) } finally { setSaving(false) }
  }

  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h2 style={{ margin: 0 }}><Camera size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.shots.title')}</h2>
          <p className="desc" style={{ marginBottom: 0 }}>{t('companyAdmin.shots.desc')}</p>
        </div>
        <div style={{ display: 'inline-flex', gap: 8, flexShrink: 0 }} role="group" aria-label={t('companyAdmin.shots.groupAria')}>
          <button type="button" className={`wka-btn sm${on ? ' primary' : ''}`} disabled={saving || !loaded} aria-pressed={on} onClick={() => apply(true)}>{saving && on ? <Spinning /> : <Check size={14} />} {t('companyAdmin.shots.on')}</button>
          <button type="button" className={`wka-btn sm${!on ? ' primary' : ''}`} disabled={saving || !loaded} aria-pressed={!on} onClick={() => apply(false)}>{saving && !on ? <Spinning /> : <X size={14} />} {t('companyAdmin.shots.off')}</button>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        {!loaded ? <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('companyAdmin.shots.loadingSetting')}</span>
          : <span style={{ fontSize: 12.5, color: on ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>
            {on ? t('companyAdmin.shots.onDetail') : t('companyAdmin.shots.offDetail')}
          </span>}
        <SavedTag show={saved} />
        {err ? <div className="wka-note" style={{ color: 'var(--wka-red)', marginTop: 8 }}><AlertTriangle size={14} /> {(err && err.message) || t('companyAdmin.shots.changeError')}</div> : null}
      </div>
    </div>
  )
}

// Governance (DLP) - company scoped, read-only when a superadmin has locked it
// ===========================================================================
const GOV_ACTIONS = ['send', 'mask', 'withhold', 'tokenize']
// Action labels resolve through i18n keys (wrapped with t() at the call site).
const GOV_ACTION_LABEL = { send: 'companyAdmin.gov.actionSend', mask: 'companyAdmin.gov.actionMask', withhold: 'companyAdmin.gov.actionWithhold', tokenize: 'companyAdmin.gov.actionTokenize' }
function GovernanceSection({ companyId }) {
  const t = useT()
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
        guidanceRules: (p.guidanceRules || []).filter((r) => r && String(r.pattern || '').trim()),
        policyDocs: p.policyDocs || [],
        mode: p.mode || 'scrub', armed: !!p.armed,
      })
      setState((s) => ({ ...s, policy: r.policy })); setBaseline(r.policy); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (error) { setSaveErr(error) } finally { setSaving(false) }
  }
  const cancel = () => { setState((s) => ({ ...s, policy: baseline })); setSaveErr(null); setSaved(false); setEditing(false) }

  if (state.loading) return <Loading label={t('companyAdmin.gov.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!p) return <EmptyState title={t('companyAdmin.gov.noPolicy')} />

  if (!editing) {
    // ---- Collapsed policy record (armed/locked status stays visible) ----
    return (
      <div>
        {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> {t('companyAdmin.gov.lockedNote')}</div>}
        <div className="wka-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0 }}><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companyAdmin.gov.policyTitle')}</h2>
            <EditToggle editing={editing} disabled={ro} onEdit={() => { setState((s) => ({ ...s, policy: baseline })); setEditing(true); setSaveErr(null) }} />
          </div>
          <p className="desc">{t('companyAdmin.gov.savedDesc')} {ro ? t('companyAdmin.gov.lockedByTeam') : t('companyAdmin.gov.clickEdit')}</p>
          <div className="wka-record">
            <RecRow label={t('companyAdmin.gov.status')} value={
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: p.armed ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>{p.armed ? t('companyAdmin.gov.armed') : t('companyAdmin.gov.notArmed')}</span>
                <span style={{ color: 'var(--wka-faint)' }}>·</span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>{p.locked ? <><Lock size={12} /> {t('companyAdmin.gov.lockedWord')}</> : t('companyAdmin.gov.unlocked')}</span>
              </span>
            } />
            <RecRow label={t('companyAdmin.gov.mode')} value={p.mode === 'tokenize' ? t('companyAdmin.gov.modeTokenizeRecord') : t('companyAdmin.gov.modeScrubRecord')} />
            <RecRow label={t('companyAdmin.gov.frameworks')} value={(p.frameworks || []).length ? (p.frameworks || []).map((k) => k.toUpperCase().replace(/_/g, ' ')).join(', ') : t('companyAdmin.gov.none')} />
            <RecRow label={t('companyAdmin.gov.categoryRules')} value={t('companyAdmin.gov.nSet', { n: Object.keys(p.categories || {}).length })} />
            <RecRow label={t('companyAdmin.gov.blockWordsLabel')} value={`${(p.blockWords || []).length}`} />
            <RecRow label={t('companyAdmin.gov.customFieldsLabel')} value={`${(p.customFields || []).length}`} />
            <RecRow label={t('companyAdmin.gov.practiceRules')} value={`${(p.guidanceRules || []).length}${(p.guidanceRules || []).length ? t('companyAdmin.gov.forbidRequire', { forbid: (p.guidanceRules || []).filter((r) => r.kind !== 'require').length, require: (p.guidanceRules || []).filter((r) => r.kind === 'require').length }) : ''}`} />
            <RecRow label={t('companyAdmin.gov.version')} value={`${p.version || 0}`} />
          </div>
          <SavedTag show={saved} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {locked && <div className="wka-note" style={{ color: 'var(--wka-amber)' }}><Lock size={14} /> {t('companyAdmin.gov.lockedNote')}</div>}
      <div className="wka-panel">
        <h2>{t('companyAdmin.gov.frameworksTitle')} <Help text={t('companyAdmin.gov.frameworksHelp')} /></h2>
        <p className="desc">{t('companyAdmin.gov.frameworksDesc')}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(state.presets).map((k) => (
            <button key={k} type="button" className={`wka-btn sm${(p.frameworks || []).includes(k) ? ' primary' : ''}`} disabled={ro} onClick={() => applyPreset(k)} title={state.labels[k] || k}>{k.toUpperCase().replace(/_/g, ' ')}</button>
          ))}
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.gov.byCategoryTitle')}</h2>
        <p className="desc">{t('companyAdmin.gov.byCategoryDesc')}</p>
        <div className="wka-table-wrap">
          <table className="wka-table">
            <thead><tr><th>{t('companyAdmin.gov.thCategory')}</th><th>{t('companyAdmin.gov.thAction')}</th></tr></thead>
            <tbody>
              {state.categories.map((cat) => (
                <tr key={cat}><td style={{ textTransform: 'capitalize' }}>{cat}</td>
                  <td><select className="wka-select" value={(p.categories || {})[cat] || 'withhold'} disabled={ro} onChange={(e) => setCat(cat, e.target.value)}>
                    {GOV_ACTIONS.map((a) => <option key={a} value={a}>{t(GOV_ACTION_LABEL[a])}</option>)}
                  </select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.gov.neverSendTitle')}</h2>
        <p className="desc">{t('companyAdmin.gov.neverSendDesc')}</p>
        <textarea className="wka-input" style={{ width: '100%', minHeight: 92, resize: 'vertical' }} disabled={ro}
          value={(p.blockWords || []).join('\n')}
          onChange={(e) => patchPolicy({ blockWords: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
          placeholder={t('companyAdmin.gov.blockWordsPh')} />
        {(p.blockWords || []).length > 0 && (
          <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--wka-amber)', display: 'flex', gap: 8 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {t('companyAdmin.gov.blockWordsWarn')}
          </div>
        )}
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.gov.customFieldsTitle')} <Help text={t('companyAdmin.gov.customFieldsHelp')} /></h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(p.customFields || []).map((f, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto auto', gap: 8, alignItems: 'center' }}>
              <input className="wka-input" placeholder={t('companyAdmin.gov.cfLabelPh')} disabled={ro} value={f.label || ''} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], label: e.target.value }; patchPolicy({ customFields: cf }) }} />
              <input className="wka-input" placeholder={t('companyAdmin.gov.cfPatternPh')} disabled={ro} value={f.pattern || ''} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], pattern: e.target.value }; patchPolicy({ customFields: cf }) }} />
              <select className="wka-select" disabled={ro} value={f.action || 'redact'} onChange={(e) => { const cf = [...(p.customFields || [])]; cf[i] = { ...cf[i], action: e.target.value }; patchPolicy({ customFields: cf }) }}>
                <option value="redact">{t('companyAdmin.gov.cfRedact')}</option><option value="block">{t('companyAdmin.gov.cfBlock')}</option>
              </select>
              <button type="button" className="wka-btn sm ghost" disabled={ro} title={t('companyAdmin.common.remove')} onClick={() => patchPolicy({ customFields: (p.customFields || []).filter((_, k) => k !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="wka-btn sm" style={{ marginTop: 10 }} disabled={ro} onClick={() => patchPolicy({ customFields: [...(p.customFields || []), { label: '', pattern: '', action: 'redact' }] })}><Plus size={13} /> {t('companyAdmin.gov.addCustomField')}</button>
      </div>

      <PolicyRules
        rules={p.guidanceRules || []}
        docs={p.policyDocs || []}
        readOnly={ro}
        armed={!!p.armed}
        extract={(body) => api.workExtractPolicyRules({ ...body, companyId })}
        onChange={({ guidanceRules, policyDocs }) => patchPolicy({ guidanceRules, policyDocs })}
      />

      <div className="wka-panel">
        <h2>{t('companyAdmin.gov.modeStatusTitle')}</h2>
        <div className="wka-field" style={{ marginBottom: 16, maxWidth: 560 }}>
          <label>{t('companyAdmin.gov.howHandled')}</label>
          <select className="wka-select" value={p.mode || 'scrub'} disabled={ro} onChange={(e) => patchPolicy({ mode: e.target.value })}>
            <option value="scrub">{t('companyAdmin.gov.modeScrubOption')}</option>
            <option value="tokenize">{t('companyAdmin.gov.modeTokenizeOption')}</option>
          </select>
        </div>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={!!p.armed} disabled={ro} onChange={(e) => patchPolicy({ armed: e.target.checked })} /> {t('companyAdmin.gov.armed')}</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18 }}>
          <button type="button" className="wka-btn primary" disabled={ro || saving} onClick={save}>{saving ? <Spinning /> : <ShieldCheck size={14} />} {t('companyAdmin.gov.savePolicy')}</button>
          <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('companyAdmin.common.cancel')}</button>
          <SavedTag show={saved} />
          <span style={{ fontSize: 12, color: 'var(--wka-faint)' }}>{t('companyAdmin.gov.versionLower', { n: p.version || 0 })}</span>
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
// i18n keys; resolved with t() at the call site.
const ACTIVITY_LABELS = {
  session_deleted: 'companyAdmin.activity.labels.session_deleted',
  doc_deleted: 'companyAdmin.activity.labels.doc_deleted',
  member_removed: 'companyAdmin.activity.labels.member_removed',
  billing_item_removed: 'companyAdmin.activity.labels.billing_item_removed',
  kb_clear: 'companyAdmin.activity.labels.kb_clear',
  kb_restore_replace: 'companyAdmin.activity.labels.kb_restore_replace',
  pii_redacted: 'companyAdmin.activity.labels.pii_redacted',
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
// i18n keys; resolved with t() at the call site.
const CALL_LABEL = { plan: 'companyAdmin.alerts.callPlan', ask: 'companyAdmin.alerts.callAsk', result: 'companyAdmin.alerts.callResult', compose: 'companyAdmin.alerts.callCompose' }

function AlertsSection({ onSeen }) {
  const t = useT()
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
  if (state.loading) return <Loading label={t('companyAdmin.alerts.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title={t('companyAdmin.alerts.noAlerts')} detail={t('companyAdmin.alerts.noAlertsDetail')} />
  return (
    <div className="wka-panel">
      <div className="wca-alerts-head">
        <h2><ShieldAlert size={16} /> {t.n('companyAdmin.alerts.count', state.items.length)}</h2>
        <span className="wca-alerts-note"><ShieldCheck size={13} /> {t('companyAdmin.alerts.redactedNote')}</span>
      </div>
      <div className="wca-alerts">
        {state.items.map((a, i) => {
          const who = a.displayName || a.username || t('companyAdmin.alerts.aMember')
          const title = (a.sessionTitle && !/^Session \d/.test(a.sessionTitle)) ? a.sessionTitle : (a.sessionTitle || t('companyAdmin.alerts.untitledSession'))
          return (
            <article key={a.id || `${a.sessionId || 's'}-${a.at || i}`} className="wca-alert" aria-label={t('companyAdmin.alerts.alertAria', { who })}>
              <span className="wca-alert-ic"><AlertTriangle size={16} /></span>
              <div className="wca-alert-body">
                <div className="wca-alert-line">
                  <b>{who}</b>{a.email ? <span className="wca-alert-mail">({a.email})</span> : null}
                  {a.companyRole ? <span className="wka-chip wca-alert-role">{t(ROLE_LABEL[a.companyRole] || a.companyRole)}</span> : null}
                  {' '}{t('companyAdmin.alerts.entered')}{a.categories ? <> (<b className="wca-alert-cat">{a.categories}</b>)</> : null} {t('companyAdmin.alerts.in')} <q>{title}</q> {t('companyAdmin.alerts.via')} {t(CALL_LABEL[a.call] || a.call || 'companyAdmin.alerts.callFallback')}{t('companyAdmin.alerts.redactedTail')}
                </div>
                <div className="wca-alert-meta">
                  <span><Clock size={12} /> {fmtDT(a.at)}</span>
                  {Number.isFinite(Number(a.redactedTotal)) && Number(a.redactedTotal) > 0 ? <span>{t.n('companyAdmin.alerts.itemsRedacted', Number(a.redactedTotal))}</span> : null}
                  {a.sessionId ? <a className="wca-alert-link" href={api.workAuditUrl(a.sessionId)} download>{t('companyAdmin.alerts.auditLog')}</a> : null}
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
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, items: null })
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    api.workTeamActivity().then((r) => setState({ loading: false, error: null, items: r.activity || [] })).catch((error) => setState({ loading: false, error, items: [] }))
  }, [])
  useEffect(() => { load() }, [load])
  if (state.loading) return <Loading label={t('companyAdmin.activity.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title={t('companyAdmin.activity.noActivity')} detail={t('companyAdmin.activity.noActivityDetail')} />
  return (
    <div className="wka-panel">
      <h2>{t('companyAdmin.activity.recent')}</h2>
      <div className="wka-table-wrap">
        <table className="wka-table">
          <thead><tr><th>{t('companyAdmin.activity.thWho')}</th><th>{t('companyAdmin.activity.thWhat')}</th><th>{t('companyAdmin.activity.thDetails')}</th><th>{t('companyAdmin.activity.thWhen')}</th></tr></thead>
          <tbody>
            {state.items.map((a) => {
              const what = ACTIVITY_LABELS[a.type] ? t(ACTIVITY_LABELS[a.type]) : (a.admin ? (a.type || t('companyAdmin.activity.adminAction')).replace(/_/g, ' ') : t('companyAdmin.activity.activity'))
              const detail = a.admin
                ? (a.detail || '')
                : (a.type === 'doc_deleted' ? (a.name || t('companyAdmin.activity.aDocument')) : ((a.title && !/^Session \d/.test(a.title)) ? a.title : (a.goal || t('companyAdmin.activity.untitled'))))
              return (
                <tr key={a.id}>
                  <td>{a.displayName || a.username || t('companyAdmin.activity.aUser')}</td>
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
const fmtRelay = (it, t) => {
  if (!it || !it.lastRelayAt) return { tone: 'none', text: t('companyAdmin.integrations.notTested') }
  const when = fmtDT(it.lastRelayAt)
  return it.lastRelayOk
    ? { tone: 'ok', text: t('companyAdmin.integrations.delivered', { when }) }
    : { tone: 'bad', text: t('companyAdmin.integrations.failed', { when }) + (it.lastRelayError ? `: ${it.lastRelayError}` : '') }
}

function IntegrationForm({ connector, initial, onSave, onCancel, busy, error }) {
  const t = useT()
  const [config, setConfig] = useState(() => {
    const c = {}
    for (const f of connector.fields || []) c[f.key] = (initial && initial.config && !f.secret && initial.config[f.key] != null) ? String(initial.config[f.key]) : ''
    return c
  })
  const [enabled, setEnabled] = useState(initial ? initial.enabled !== false : true)
  const editing = !!(initial && initial.id)
  const submit = (e) => { e && e.preventDefault(); onSave({ id: initial && initial.id, type: connector.id, config, enabled }) }
  return (
    <form className="wca-int-form" onSubmit={submit} aria-label={t(editing ? 'companyAdmin.integrations.editX' : 'companyAdmin.integrations.addX', { label: connector.label })} aria-busy={busy}>
      <div className="wca-int-form-head"><b>{editing ? t('companyAdmin.integrations.edit') : t('companyAdmin.integrations.add')} {connector.label}</b><span className="wka-chip">{groupOf(connector.group)}</span></div>
      <div className="wca-int-fields">
        {(connector.fields || []).map((f) => (
          <label key={f.key} className="wca-int-field">
            <span>{f.label}{f.secret ? <em className="wca-int-secret">{t('companyAdmin.integrations.writeOnly')}</em> : null}</span>
            <input className="wka-input" type={f.secret ? 'password' : 'text'} value={config[f.key] || ''} autoComplete={f.secret ? 'new-password' : 'off'}
              placeholder={f.secret && editing ? t('companyAdmin.integrations.storedPlaceholder') : (f.placeholder || '')}
              onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))} />
          </label>
        ))}
      </div>
      <label className="wca-int-toggle"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> <span>{t('companyAdmin.integrations.toggleEnabled')}</span></label>
      {error ? <ErrorBox error={error} /> : null}
      <div className="wca-int-actions">
        <button type="button" className="wka-btn sm ghost" onClick={onCancel} disabled={busy}>{t('companyAdmin.common.cancel')}</button>
        <button type="submit" className="wka-btn sm primary" disabled={busy}>{busy ? <Spinning /> : <Check size={14} />} {editing ? t('companyAdmin.integrations.saveChanges') : t('companyAdmin.integrations.addConnector')}</button>
      </div>
    </form>
  )
}

function IntegrationsSection() {
  const t = useT()
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
    setTesting((prev) => ({ ...prev, [it.id]: { busy: true } }))
    try { const r = await api.workCompanyIntegrationTest(it.id); setTesting((prev) => ({ ...prev, [it.id]: { busy: false, result: r && r.ok ? { ok: true } : { ok: false, error: (r && r.error) || t('companyAdmin.integrations.notAccepted') } } })) }
    catch (error) { setTesting((prev) => ({ ...prev, [it.id]: { busy: false, result: { ok: false, error: error.message || t('companyAdmin.integrations.testFailed') } } })) }
    load()
  }
  const remove = async (it) => {
    const label = (byId[it.type] && byId[it.type].label) || it.type
    const reason = await askReason({ title: t('companyAdmin.integrations.removeTitle', { label }), detail: t('companyAdmin.integrations.removeDetail'), confirmLabel: t('companyAdmin.integrations.removeConfirm') })
    if (!reason) return
    try { await api.workCompanyIntegrationDelete(it.id, reason); load() } catch (error) { setState((s) => ({ ...s, error })) }
  }

  if (state.loading) return <Loading label={t('companyAdmin.integrations.loading')} />
  if (state.error && !state.catalog.length) return <ErrorBox error={state.error} onRetry={load} />
  return (
    <>
      {reasonModal}
      <div className="wca-int-note"><ShieldCheck size={15} /><span>{t.rich('companyAdmin.integrations.metadataNote')}</span></div>
      {state.error ? <ErrorBox error={state.error} onRetry={load} /> : null}

      <div className="wka-panel">
        <h2>{t('companyAdmin.integrations.connected')}</h2>
        {!state.items.length ? <p className="desc">{t('companyAdmin.integrations.noConnectors')}</p> : (
          <div className="wca-int-list">
            {state.items.map((it) => {
              const c = byId[it.type] || { label: it.type, group: 'Other', fields: [] }
              const relay = fmtRelay(it, t); const tst = testing[it.id] || {}
              return (
                <div key={it.id} className={`wca-int-item${it.enabled ? '' : ' off'}`}>
                  <div className="wca-int-item-head">
                    <span className={`wca-int-dot ${it.enabled ? 'on' : ''}`} aria-hidden="true" />
                    <b>{c.label}</b><span className="wka-chip">{groupOf(c.group)}</span>
                    <span className={`wca-int-relay ${relay.tone}`} title={relay.text}>{relay.text}</span>
                    <div className="wca-int-item-actions">
                      <label className="wca-int-toggle sm"><input type="checkbox" checked={!!it.enabled} onChange={() => toggle(it)} /> <span>{it.enabled ? t('companyAdmin.integrations.enabled') : t('companyAdmin.integrations.disabled')}</span></label>
                      <button type="button" className="wka-btn sm" onClick={() => test(it)} disabled={tst.busy}>{tst.busy ? <Spinning /> : <RefreshCw size={13} />} {t('companyAdmin.integrations.test')}</button>
                      <button type="button" className="wka-btn sm ghost" onClick={() => { setAdding(null); setEditing(editing && editing.id === it.id ? null : it) }}>{editing && editing.id === it.id ? t('companyAdmin.integrations.close') : t('companyAdmin.integrations.edit')}</button>
                      <button type="button" className="wka-btn sm ghost danger" onClick={() => remove(it)} title={t('companyAdmin.integrations.removeThis')}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {tst.result ? <div className={`wca-int-test ${tst.result.ok ? 'ok' : 'bad'}`}>{tst.result.ok ? <><Check size={13} /> {t('companyAdmin.integrations.sampleDelivered')}</> : <><AlertTriangle size={13} /> {tst.result.error}</>}</div> : null}
                  {editing && editing.id === it.id && c.fields ? <IntegrationForm connector={c} initial={it} onSave={save} onCancel={() => setEditing(null)} busy={saveBusy} error={saveErr} /> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.integrations.addTitle')}</h2>
        <p className="desc">{t('companyAdmin.integrations.addDesc')}</p>
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
  const t = useT()
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { setEmailMsg({ id, ok: false, text: t('companyAdmin.sessions.enterValidEmail') }); return }
    setEmailing(id); setEmailMsg(null)
    try { const r = await api.workComplianceEmail(id, { to, ...(fw ? { framework: fw } : {}) }); setEmailMsg({ id, ok: true, text: t('companyAdmin.sessions.sentTo', { to: r.to }) }); setEmailFor(null); setEmailTo('') }
    catch (e) { setEmailMsg({ id, ok: false, text: (e && e.message) || t('companyAdmin.sessions.couldNotSend') }) }
    finally { setEmailing(null) }
  }
  if (state.loading) return <Loading label={t('companyAdmin.sessions.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!state.items || !state.items.length) return <EmptyState title={t('companyAdmin.sessions.noSessions')} detail={t('companyAdmin.sessions.noSessionsDetail')} />
  const items = state.items.filter((s) => filter === 'all' || (filter === 'active' ? s.status !== 'ended' : s.status === 'ended'))
  const chip = (s) => s.status === 'ended'
    ? <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}><Check size={12} style={{ verticalAlign: '-1px' }} /> {t('companyAdmin.sessions.completed')}</span>
    : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wka-accent, #2563eb)' }}><Clock size={12} style={{ verticalAlign: '-1px' }} /> {t('companyAdmin.sessions.inProgress')}</span>
  return (
    <div className="wka-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>{t('companyAdmin.sessions.title')}</h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select className="wka-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: 32 }}>
            <option value="all">{t('companyAdmin.sessions.filterAll')}</option>
            <option value="active">{t('companyAdmin.sessions.inProgress')}</option>
            <option value="ended">{t('companyAdmin.sessions.completed')}</option>
          </select>
          <select className="wka-select" value={fw} onChange={(e) => setFw(e.target.value)} style={{ height: 32 }} title={t('companyAdmin.sessions.focusFramework')}>
            <option value="">{t('companyAdmin.sessions.complianceAll')}</option>
            {frameworks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button className="wka-btn sm ghost" onClick={load} title={t('companyAdmin.sessions.refreshTitle')}><RefreshCw size={13} /> {t('companyAdmin.team.refresh')}</button>
        </div>
      </div>
      <p style={{ color: 'var(--wka-muted)', fontSize: 13, marginTop: 6 }}>{t.rich('companyAdmin.sessions.intro')}</p>
      <div className="wka-table-wrap" style={{ marginTop: 8 }}>
        <table className="wka-table">
          <thead><tr><th>{t('companyAdmin.sessions.thWho')}</th><th>{t('companyAdmin.sessions.thTask')}</th><th>{t('companyAdmin.sessions.thStatus')}</th><th>{t('companyAdmin.sessions.thProgress')}</th><th>{t('companyAdmin.sessions.thUpdated')}</th><th>{t('companyAdmin.sessions.thPull')}</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.user || t('companyAdmin.sessions.aUser')}</td>
                <td style={{ color: 'var(--wka-muted)' }}>{(s.title && !/^Session \d/.test(s.title)) ? s.title : (s.goal || t('companyAdmin.sessions.untitled'))}</td>
                <td>{chip(s)}</td>
                <td style={{ color: 'var(--wka-faint)', fontSize: 12 }}>{s.steps ? t('companyAdmin.sessions.progressSteps', { done: s.done, steps: s.steps }) : '-'}</td>
                <td style={{ color: 'var(--wka-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(s.lastActivityAt || s.startedAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a className="wka-btn sm" href={api.workComplianceUrl(s.id, true, fw)} target="_blank" rel="noopener noreferrer" title={t('companyAdmin.sessions.complianceTitle', { scope: fw ? (frameworks.find((f) => f.id === fw)?.name || t('companyAdmin.sessions.framework')) : t('companyAdmin.sessions.allFrameworks') })}><ShieldCheck size={13} /> {t('companyAdmin.sessions.compliance')}</a>
                  <button className="wka-btn sm ghost" onClick={() => openEmail(s.id)} disabled={emailing === s.id} aria-expanded={emailFor === s.id} title={t('companyAdmin.sessions.emailTitle')} style={{ marginLeft: 6 }}>{emailing === s.id ? <Loader2 size={13} className="spin" /> : <Mail size={13} />} {t('companyAdmin.sessions.email')}</button>
                  <a className="wka-btn sm ghost" href={api.workReportUrl(s.id, true)} target="_blank" rel="noopener noreferrer" title={t('companyAdmin.sessions.reportTitle')} style={{ marginLeft: 6 }}><Download size={13} /> {t('companyAdmin.sessions.report')}</a>
                  <a className="wka-btn sm ghost" href={api.workAuditUrl(s.id)} target="_blank" rel="noopener noreferrer" title={t('companyAdmin.sessions.logTitle')} style={{ marginLeft: 6 }}><FileText size={13} /> {t('companyAdmin.sessions.log')}</a>
                  {emailFor === s.id && (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 8, verticalAlign: 'middle' }}>
                      <input className="wka-input" type="email" style={{ width: 200, padding: '5px 8px' }} placeholder="name@company.com" value={emailTo} autoFocus
                        onChange={(e) => setEmailTo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendEmail(s.id) }} />
                      <button className="wka-btn sm primary" onClick={() => sendEmail(s.id)} disabled={emailing === s.id}>{emailing === s.id ? <Loader2 size={13} className="spin" /> : t('companyAdmin.sessions.send')}</button>
                      <button className="wka-btn sm ghost" onClick={() => { setEmailFor(null); setEmailTo('') }}>{t('companyAdmin.common.cancel')}</button>
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
  const t = useT()
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
    if (!pw.current || !pw.next) { setPwErr(new Error(t('companyAdmin.settings.errPwBoth'))); return }
    if (pw.next.length < 6) { setPwErr(new Error(t('companyAdmin.settings.errPwShort'))); return }
    if (pw.next !== pw.confirm) { setPwErr(new Error(t('companyAdmin.settings.errPwMismatch'))); return }
    setPwBusy(true)
    try { await api.workChangePassword(pw.current, pw.next); setPwOk(true); setPw({ current: '', next: '', confirm: '' }); setTimeout(() => setPwOk(false), 2500) }
    catch (error) { setPwErr(error) } finally { setPwBusy(false) }
  }

  return (
    <div>
      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}>{t('companyAdmin.settings.profileTitle')}</h2>
          {!editingProfile ? <EditToggle editing={editingProfile} onEdit={() => { setDisplayName((viewer && viewer.displayName) || ''); setEditingProfile(true); setPErr(null) }} /> : null}
        </div>
        <p className="desc">{t.rich('companyAdmin.settings.profileDesc', { username: viewer ? viewer.username : '' })}</p>
        {!editingProfile ? (
          <>
            <div className="wka-record"><RecRow label={t('companyAdmin.settings.displayName')} value={(viewer && viewer.displayName) || t('companyAdmin.settings.notSet')} /></div>
            {pErr && <ErrorBox error={pErr} />}
            <SavedTag show={pOk} />
          </>
        ) : (
          <>
            <div className="wka-field" style={{ maxWidth: 420, marginBottom: 14 }}><label>{t('companyAdmin.settings.displayName')}</label><input className="wka-input" value={displayName} maxLength={80} placeholder={t('companyAdmin.team.namePh')} onChange={(e) => setDisplayName(e.target.value)} /></div>
            {pErr && <ErrorBox error={pErr} />}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" className="wka-btn primary" disabled={pBusy} onClick={saveProfile}>{pBusy ? <Spinning /> : <Check size={14} />} {t('companyAdmin.settings.save')}</button><button type="button" className="wka-btn ghost" disabled={pBusy} onClick={cancelProfile}><X size={14} /> {t('companyAdmin.common.cancel')}</button><SavedTag show={pOk} /></div>
          </>
        )}
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.settings.appearance')}</h2>
        <p className="desc">{t.rich('companyAdmin.settings.appearanceDesc')}</p>
        <PreferencesPanel variant="wka" />
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.settings.changePassword')}</h2>
        <p className="desc">{t('companyAdmin.settings.changePasswordDesc')}</p>
        <div className="wka-formgrid" style={{ maxWidth: 640 }}>
          <div className="wka-field"><label>{t('companyAdmin.settings.currentPassword')}</label><input className="wka-input" type="password" value={pw.current} autoComplete="current-password" onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div></div>
          <div className="wka-field"><label>{t('companyAdmin.settings.newPassword')}</label><input className="wka-input" type="password" value={pw.next} autoComplete="new-password" onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          <div className="wka-field"><label>{t('companyAdmin.settings.confirmPassword')}</label><input className="wka-input" type="password" value={pw.confirm} autoComplete="new-password" onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
        </div>
        {pwErr && <ErrorBox error={pwErr} />}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><button type="button" className="wka-btn primary" disabled={pwBusy} onClick={changePassword}>{pwBusy ? <Spinning /> : <KeyRound size={14} />} {t('companyAdmin.settings.changePasswordBtn')}</button><SavedTag show={pwOk} /></div>
      </div>

      <div className="wka-panel">
        <h2>{t('companyAdmin.settings.companyTitle')}</h2>
        <p className="desc">{t('companyAdmin.settings.companyDesc')}</p>
        <div className="wca-kv">
          <div><span>{t('companyAdmin.settings.kvName')}</span><b>{company ? company.name : '-'}</b></div>
          <div><span>{t('companyAdmin.settings.kvPlan')}</span><b style={{ textTransform: 'capitalize' }}>{company ? company.plan : '-'}</b></div>
          {/* User seats count MEMBERS only (admins have their own pool); showing
              userCount (members + admins) against the member seat total read as
              "3 of 2" for a company that was within its licenses. */}
          <div><span>{t('companyAdmin.settings.kvUserLicenses')}</span><b>{company && company.seats > 0 ? t('companyAdmin.overview.seatsOf', { used: company.memberCount != null ? company.memberCount : company.userCount, total: company.seats }) : t('companyAdmin.settings.noLimit', { n: company ? (company.memberCount != null ? company.memberCount : company.userCount) : 0 })}</b></div>
          <div><span>{t('companyAdmin.settings.kvAdminSeats')}</span><b>{company && company.adminSeats > 0 ? t('companyAdmin.overview.seatsOf', { used: company.adminCount || 0, total: company.adminSeats }) : t('companyAdmin.settings.noLimit', { n: company ? (company.adminCount || 0) : 0 })}</b></div>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Shell
// ===========================================================================
export default function WorkCompanyAdmin() {
  const t = useT()
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
    <div className="wka wd-tokens"><style>{WORKADMIN_CSS}{WCA_CSS}{AI_SOURCE_CHOICE_CSS}{DEPTH_CHOICE_CSS}</style>
      <div className="wka-gate"><div className="box">{icon}<h2>{title}</h2><p>{body}</p>{action}</div></div>
    </div>
  )
  if (gate === 'loading') return <Gate icon={<Loader2 size={26} style={{ animation: 'wka-spin 0.8s linear infinite', color: 'var(--wka-accent)', marginBottom: 12 }} />} title={t('companyAdmin.gate.checkingTitle')} body={t('companyAdmin.gate.checkingBody')} />
  if (gate === 'signedout') return <Gate icon={<ShieldAlert size={30} />} title={t('companyAdmin.gate.signInTitle')} body={t('companyAdmin.gate.signInBody')} action={<a className="wka-btn primary" style={{ marginTop: 16 }} href="/workcopilot">{t('companyAdmin.gate.goToSignIn')}</a>} />
  if (gate === 'superadmin') return <Gate icon={<ShieldCheck size={30} style={{ color: 'var(--wka-emerald)' }} />} title={t('companyAdmin.gate.useAdminTitle')} body={t('companyAdmin.gate.useAdminBody')} action={<a className="wka-btn primary" style={{ marginTop: 16 }} href="/work/admin">{t('companyAdmin.gate.openAdmin')}</a>} />
  if (gate === 'denied') return <Gate icon={<ShieldAlert size={30} />} title={t('companyAdmin.gate.deniedTitle')} body={t('companyAdmin.gate.deniedBody')} action={<a className="wka-btn" style={{ marginTop: 16 }} href="/work">{t('companyAdmin.gate.backToWork')}</a>} />
  if (gate === 'error') return <Gate icon={<ShieldAlert size={30} style={{ color: 'var(--wka-red)' }} />} title={t('companyAdmin.gate.errorTitle')} body={(gateError && gateError.message) || t('companyAdmin.gate.errorBody')} action={<button type="button" className="wka-btn primary" style={{ marginTop: 16 }} onClick={checkAccess}>{t('companyAdmin.gate.tryAgain')}</button>} />

  const renderSection = () => {
    switch (active) {
      case 'team': return <TeamSection meId={viewer && viewer.id} onCompany={setCompany} />
      case 'usage': return <UsageLimits />
      case 'depth': return <GuidanceDepth onOpen={setActive} />
      case 'customers': return <Customers />
      case 'sso': return <SsoSection company={company} />
      case 'ai': return <AiSection />
      case 'billing': return <BillingSection />
      case 'governance': return (<><ReportShotsCard company={company} onCompany={setCompany} /><GovernanceSection companyId={viewer && viewer.companyId} /></>)
      case 'brain': return <CompanyBrain />
      case 'brainsecurity': return <BrainSecurity />
      case 'sessions': return <SessionsSection />
      case 'tickets': return <SupportTickets mode="user" />
      case 'help': return <HelpCompany onOpen={setActive} />
      case 'activity': return <ActivitySection />
      case 'alerts': return <AlertsSection onSeen={alertsSeen} />
      case 'integrations': return <IntegrationsSection />
      case 'settings': return <SettingsSection viewer={viewer} company={company} onProfile={(u) => setViewer(u)} />
      case 'overview':
      default: return <OverviewSection company={company} onOpen={setActive} />
    }
  }

  return (
    <div className="wka wd-tokens"><style>{WORKADMIN_CSS}{WCA_CSS}{AI_SOURCE_CHOICE_CSS}{DEPTH_CHOICE_CSS}</style>
      <header className="wka-top">
        <span className="wka-dot" aria-hidden="true" />
        <div className="wka-brand"><b>WorkCoPilot</b><span>{t('companyAdmin.shell.companyAdmin')}</span></div>
        <div className="wka-top-right">
          {company ? <span className="wka-chip">{company.name}</span> : null}
          {viewer ? <span className="wka-chip ok">{viewer.displayName || viewer.username}</span> : null}
          <button type="button" className="wka-btn sm ghost" onClick={signOut} title={t('companyAdmin.shell.signOut')}><LogOut size={14} /> {t('companyAdmin.shell.signOut')}</button>
        </div>
      </header>
      <div className="wka-body">
        <nav className="wka-nav">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.id} className={`wka-nav-item${active === s.id ? ' active' : ''}`} role="button" tabIndex={0}
                onClick={() => setActive(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s.id) } }}>
                <Icon size={17} /><span className="label">{t(s.label)}</span>
                {s.id === 'alerts' && alertBadge > 0 && <span className="wca-badge" aria-label={t.n('companyAdmin.shell.newAlerts', alertBadge)}>{alertBadge > 99 ? '99+' : alertBadge}</span>}
              </div>
            )
          })}
          <div className="wka-nav-foot">{t('companyAdmin.shell.navFoot', { name: company ? company.name : t('companyAdmin.overview.yourCompany') })}</div>
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
/* No local .wka-btn.danger override: the shared console rule (workadmin.css.js,
   white label on the red fill) is the single source. A color-only override here
   painted red text on the red fill, so every danger confirm in this console
   (clear knowledge base / skills, archive customer) rendered with no legible label. */
`
