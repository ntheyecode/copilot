// Companies (tenancy): the superadmin onboards a company end to end - full
// profile, per-tier license allocation, admin seats, license mode, SSO
// provisioning, AI source and price overrides - then manages its people (by
// email for SSO), SSO config, corporate AI keys, extra hours, billing and the
// data-redaction policy. Everything a company needs to go live lives here.
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Building2, ShieldCheck, Shield, ChevronRight, ChevronDown, UserPlus, KeyRound, Check, Mail, Clock, Receipt, Copy, Trash2, AlertTriangle, ShieldOff, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, Spinning, useReasonModal, ReasonModal as SharedReasonModal } from './_shared.jsx'
import { useT } from '../../../i18n/index.jsx'

// Friendly labels for every OpenID Connect provider the backend accepts. The
// engine is generic OIDC, so the list can grow without code changes.
const SSO_PROVIDERS = [
  ['google', 'companiesAdmin.sso.providers.google', 'https://accounts.google.com'],
  ['microsoft', 'companiesAdmin.sso.providers.microsoft', 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0'],
  ['okta', 'companiesAdmin.sso.providers.okta', 'https://YOUR_ORG.okta.com'],
  ['auth0', 'companiesAdmin.sso.providers.auth0', 'https://YOUR_TENANT.us.auth0.com'],
  ['onelogin', 'companiesAdmin.sso.providers.onelogin', 'https://YOUR_ORG.onelogin.com/oidc/2'],
  ['ping', 'companiesAdmin.sso.providers.ping', 'https://auth.pingone.com/ENV_ID/as'],
  ['jumpcloud', 'companiesAdmin.sso.providers.jumpcloud', 'https://oauth.id.jumpcloud.com/'],
  ['keycloak', 'companiesAdmin.sso.providers.keycloak', 'https://YOUR_HOST/realms/YOUR_REALM'],
  ['cognito', 'companiesAdmin.sso.providers.cognito', 'https://cognito-idp.REGION.amazonaws.com/POOL_ID'],
  ['azuread_b2c', 'companiesAdmin.sso.providers.azuread_b2c', 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/v2.0'],
  ['authentik', 'companiesAdmin.sso.providers.authentik', 'https://YOUR_HOST/application/o/SLUG/'],
  ['duo', 'companiesAdmin.sso.providers.duo', 'https://sso.YOUR_ORG.duosecurity.com/oidc/CLIENT'],
  ['centrify', 'companiesAdmin.sso.providers.centrify', 'https://YOUR_TENANT.my.centrify.com/OIDC'],
  ['oidc', 'companiesAdmin.sso.providers.oidc', 'https://your-identity-provider/...'],
]
const SSO_HINT = Object.fromEntries(SSO_PROVIDERS.map(([id, , hint]) => [id, hint]))

// Destructive confirms use the shared promise-style useReasonModal from
// _shared.jsx (single source - SUPREME RULE II; the local copy was deleted).

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`
const fmtMins = (secs) => { const m = Math.round((Number(secs) || 0) / 60); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); const r = m % 60; return r ? `${h}h ${r}m` : `${h}h` }

function CopyLine({ value }) {
  const [c, setC] = useState(false)
  return <span className="co-copy"><code>{value}</code><button className="wka-btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(value); setC(true); setTimeout(() => setC(false), 1600) } catch { /* blocked */ } }}>{c ? <Check size={12} /> : <Copy size={12} />}</button></span>
}

// Connect SSO for one company. The client secret is write-only.
function SsoPanel({ company, onSaved }) {
  const t = useT()
  const connected = !!(company.sso && company.sso.connected)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ provider: (company.sso && company.sso.provider) || 'google', issuer: '', clientId: '', clientSecret: '', domain: (company.sso && company.sso.domain) || '' })
  const [hasSecret, setHasSecret] = useState(connected)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)
  const redirectUri = (typeof window !== 'undefined' ? window.location.origin : 'https://admireveda.com') + '/api/work/sso/callback'

  useEffect(() => {
    if (!open) return
    let alive = true
    workAdminApi.companySso(company.id).then((d) => {
      if (!alive || !d || !d.sso) return
      const s = d.sso
      setHasSecret(!!s.hasSecret)
      setForm((f) => ({ ...f, provider: s.provider || f.provider, issuer: s.issuer || '', clientId: s.clientId || '', domain: s.domain || '' }))
    }).catch(() => {})
    return () => { alive = false }
  }, [open, company.id])

  const save = async () => {
    if (busy) return
    setBusy(true); setMsg(''); setDone(false)
    try {
      await workAdminApi.setCompanySso(company.id, form)
      setForm((f) => ({ ...f, clientSecret: '' })); setHasSecret(true); setDone(true)
      onSaved && onSaved()
    } catch (e) { setMsg(e.message || t('companiesAdmin.sso.saveFailed')) } finally { setBusy(false) }
  }

  return (
    <div className="co-sso">
      <button className="co-sso-head" onClick={() => setOpen((v) => !v)}>
        <KeyRound size={15} /><span>{t('companiesAdmin.sso.title')}</span>
        <span className={`co-sso-state ${connected ? 'on' : ''}`}>{connected ? <><Check size={12} /> {t('companiesAdmin.sso.connected', { provider: company.sso.provider })}</> : t('companiesAdmin.sso.notConnected')}</span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="co-sso-body">
          <div className="co-sso-row"><label>{t('companiesAdmin.sso.provider')}</label>
            <select className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {SSO_PROVIDERS.map(([id, labelKey]) => <option key={id} value={id}>{t(labelKey)}</option>)}
            </select>
          </div>
          <div className="co-sso-row"><label>{t('companiesAdmin.sso.issuerUrl')}</label><input className="wka-input" placeholder={SSO_HINT[form.provider]} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
          <div className="co-sso-hint">{t('companiesAdmin.sso.exampleHint', { hint: SSO_HINT[form.provider] })}</div>
          <div className="co-sso-row"><label>{t('companiesAdmin.sso.clientId')}</label><input className="wka-input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
          <div className="co-sso-row"><label>{t('companiesAdmin.sso.clientSecret')}</label><input className="wka-input" type="password" placeholder={hasSecret ? t('companiesAdmin.sso.secretStored') : t('companiesAdmin.sso.secretPaste')} value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
          <div className="co-sso-row"><label>{t('companiesAdmin.sso.emailDomain')}</label><input className="wka-input" placeholder="example.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          <div className="co-sso-hint">{t('companiesAdmin.sso.domainHint')}</div>
          <div className="co-sso-redirect">{t('companiesAdmin.sso.redirectHint')}<CopyLine value={redirectUri} /></div>
          {msg && <div className="co-msg">{msg}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="wka-btn primary" disabled={busy} onClick={save}>{busy ? <Spinning /> : <KeyRound size={14} />} {connected ? t('companiesAdmin.sso.update') : t('companiesAdmin.sso.connect')}</button>
            {done && <span className="wka-saved"><Check size={14} /> {t('companiesAdmin.saved')}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Company roles the console can assign. Executive = read-only productivity dashboard.
const ROLE_OPTIONS = [['member', 'companiesAdmin.roles.member'], ['company_admin', 'companiesAdmin.roles.company_admin'], ['executive', 'companiesAdmin.roles.executive']]
const ROLE_CHIP = { company_admin: 'companiesAdmin.roleChip.company_admin', executive: 'companiesAdmin.roleChip.executive' }
const roleOptions = (t) => ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)

// White-label logo: an uploaded image read as a data URL (server caps ~300 KB).
// Rendered only ever as an <img src>, never as HTML.
const LOGO_MAX_BYTES = 300 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
function LogoField({ value, onChange, original }) {
  const t = useT()
  const [err, setErr] = useState('')
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!LOGO_TYPES.includes(f.type)) { setErr(t('companiesAdmin.logo.badType')); return }
    if (f.size > LOGO_MAX_BYTES) { setErr(t('companiesAdmin.logo.tooBig', { kb: Math.round(f.size / 1024) })); return }
    const r = new FileReader()
    r.onload = () => { setErr(''); onChange(String(r.result || '')) }
    r.onerror = () => setErr(t('companiesAdmin.logo.readFailed'))
    r.readAsDataURL(f)
  }
  return (
    <div className="co-logo">
      <div className="co-logo-prev">{value ? <img src={value} alt={t('companiesAdmin.logo.previewAlt')} /> : <span className="co-dim">{t('companiesAdmin.logo.none')}</span>}</div>
      <div className="co-logo-act">
        <label className="wka-btn sm"><input type="file" accept={LOGO_TYPES.join(',')} onChange={pick} style={{ display: 'none' }} />{value ? t('companiesAdmin.logo.replace') : t('companiesAdmin.logo.upload')}</label>
        {value ? <button type="button" className="wka-btn sm ghost" onClick={() => { setErr(''); onChange('') }}>{t('companiesAdmin.logo.remove')}</button> : null}
        {original && value !== original ? <button type="button" className="wka-btn sm ghost" onClick={() => { setErr(''); onChange(original) }}>{t('companiesAdmin.logo.undo')}</button> : null}
        <div className="co-dim">{t('companiesAdmin.logo.hint')}</div>
        {err && <div className="co-msg" style={{ marginBottom: 0 }}>{err}</div>}
      </div>
    </div>
  )
}

const WEB_RE = /^https?:\/\/\S+$/i

// Edit an existing company's branding (logo + website) and contact (address, phone).
// Empty logo clears it server-side; profile is merged server-side.
function BrandingPanel({ company, onSaved }) {
  const t = useT()
  const cur = company.logo || ''
  const pr = company.profile || {}
  const [logo, setLogo] = useState(cur)
  const [f, setF] = useState({ website: pr.website || '', address: pr.address || '', phone: pr.phone || '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const save = async () => {
    if (busy) return
    const w = f.website.trim()
    if (w && !WEB_RE.test(w)) { setOk(false); setMsg(t('companiesAdmin.branding.websiteInvalid')); return }
    setBusy(true); setMsg(''); setOk(false)
    try {
      await workAdminApi.updateCompany(company.id, { logo, profile: { website: w, address: f.address.trim(), phone: f.phone.trim() } })
      setOk(true); onSaved && onSaved()
    } catch (e) { setMsg(e.message || t('companiesAdmin.branding.saveFailed')) } finally { setBusy(false) }
  }
  return (
    <div className="co-block">
      <div className="co-block-t">{t('companiesAdmin.branding.title')} <span className="co-dim">&middot; {t('companiesAdmin.branding.titleSub')}</span></div>
      <LogoField value={logo} onChange={setLogo} original={cur} />
      <div className="wka-grid co-grid" style={{ marginTop: 10 }}>
        <L label={t('companiesAdmin.branding.website')}><input className="wka-input" placeholder="https://example.com" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></L>
        <L label={t('companiesAdmin.branding.address')}><input className="wka-input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></L>
        <L label={t('companiesAdmin.branding.phone')}><input className="wka-input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></L>
      </div>
      {msg && <div className="co-msg">{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="wka-btn sm primary" disabled={busy} onClick={save}>{busy ? <Spinning /> : null} {t('companiesAdmin.branding.save')}</button>
        {ok && <span className="wka-saved"><Check size={14} /> {t('companiesAdmin.saved')}</span>}
      </div>
    </div>
  )
}

const BLANK_NEW = {
  name: '', plan: 'basic', aiSource: '', scrub: false, logo: '',
  adminSeats: 2, licenseMode: 'locked', ssoProvisioning: 'explicit',
  byTier: { basic: '', advanced: '', premium: '' },
  profile: { contactPerson: '', email: '', billingEmail: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', website: '' },
}

export default function Companies({ isSuperAdmin }) {
  const t = useT()
  // Stored codes (plan / tier / license mode) are displayed through their
  // localized label when one exists, else the raw code as before.
  const codeLabel = (code) => (t.has(`companiesAdmin.codes.${code}`) ? t(`companiesAdmin.codes.${code}`) : code)
  const [state, setState] = useState({ loading: true, error: null, companies: [] })
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(BLANK_NEW)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [lic, setLic] = useState(null)
  const [bill, setBill] = useState(null)
  const [askReason, reasonModal] = useReasonModal()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [delCompany, setDelCompany] = useState(null) // company pending hard-delete
  const [delMembers, setDelMembers] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState(null)

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try { const d = await workAdminApi.companies(); setState({ loading: false, error: null, companies: d.companies || [] }) }
    catch (e) { setState({ loading: false, error: e, companies: [] }) }
  }, [])
  useEffect(() => { load() }, [load])

  const seatTotal = (Number(form.byTier.basic) || 0) + (Number(form.byTier.advanced) || 0) + (Number(form.byTier.premium) || 0)

  const createCompany = async () => {
    if (busy || !form.name.trim()) { setMsg(t('companiesAdmin.errors.nameRequired')); return }
    if ((form.profile.website || '').trim() && !WEB_RE.test(form.profile.website.trim())) { setMsg(t('companiesAdmin.branding.websiteInvalid')); return }
    setBusy(true); setMsg('')
    const byTier = { basic: Number(form.byTier.basic) || 0, advanced: Number(form.byTier.advanced) || 0, premium: Number(form.byTier.premium) || 0 }
    const body = {
      name: form.name, plan: form.plan, scrub: form.scrub,
      adminSeats: Number(form.adminSeats) || 0, licenseMode: form.licenseMode, ssoProvisioning: form.ssoProvisioning,
      profile: form.profile,
      ...(form.logo ? { logo: form.logo } : {}),
      ...(seatTotal > 0 ? { seatsByTier: byTier } : {}),
      ...(form.aiSource ? { aiSource: form.aiSource } : {}),
    }
    try { await workAdminApi.createCompany(body); setForm(BLANK_NEW); setShowNew(false); await load() }
    catch (e) { setMsg(e.message || t('companiesAdmin.errors.createFailed')) } finally { setBusy(false) }
  }

  const loadDetail = async (id) => {
    try {
      // The license summary failing used to be swallowed (the whole Licenses
      // block silently vanished). Surface it so the operator can act on it.
      const [d, l] = await Promise.all([
        workAdminApi.company(id),
        workAdminApi.companyLicenses(id).catch((e) => { setMsg(t('companiesAdmin.errors.licensesLoadFailed', { reason: e.message || t('companiesAdmin.errors.requestFailed') })); return null }),
      ])
      setDetail(d); setLic(l)
    } catch (e) { setMsg(e.message) }
  }
  const openCompany = async (id) => {
    if (openId === id) { setOpenId(null); setDetail(null); setLic(null); setBill(null); return }
    setOpenId(id); setDetail(null); setLic(null); setBill(null); setMsg('')
    loadDetail(id)
  }
  const refreshDetail = async (id) => { await loadDetail(id); load() }
  const patchCompany = async (id, patch) => { if (!isSuperAdmin) return; try { await workAdminApi.updateCompany(id, patch); refreshDetail(id) } catch (e) { setMsg(e.message) } }
  const toggleCompanyScrub = async (c) => { if (!isSuperAdmin) return; try { await workAdminApi.companyScrub(c.id, !c.scrub); refreshDetail(c.id) } catch (e) { setMsg(e.message) } }

  // Corporate AI keys.
  const [aiForm, setAiForm] = useState({})
  const setAiField = (id, k, v) => setAiForm((f) => ({ ...f, [id]: { ...(f[id] || {}), [k]: v } }))
  const saveAiKeys = async (id) => { try { await workAdminApi.companyAiKeys(id, aiForm[id] || {}); setAiForm((f) => ({ ...f, [id]: {} })); refreshDetail(id); setMsg(t('companiesAdmin.toasts.aiKeysSaved')) } catch (e) { setMsg(e.message) } }
  const clearAiKeys = async (id) => {
    // Clearing a company's AI keys takes their AI down, so capture a reason (logged).
    const reason = await askReason({ title: t('companiesAdmin.confirm.clearAiTitle'), detail: t('companiesAdmin.confirm.clearAiDetail'), confirmLabel: t('companiesAdmin.confirm.clearAiLabel') })
    if (!reason || reason.length < 3) return
    try { await workAdminApi.companyAiKeys(id, { apiKey: '', reason }); refreshDetail(id); setMsg(t('companiesAdmin.toasts.aiKeysCleared')) } catch (e) { setMsg(e.message) }
  }

  // Per-company web-search (Tavily) key. Independent of the AI source: when set,
  // the company's live web learning runs on their own key (their data + billing).
  const [wsForm, setWsForm] = useState({})
  const setWsField = (id, k, v) => setWsForm((f) => ({ ...f, [id]: { ...(f[id] || {}), [k]: v } }))
  const saveWebSearch = async (id) => { const key = (wsForm[id]?.apiKey || '').trim(); if (!key) return; try { await workAdminApi.companyWebSearch(id, key, 'tavily'); setWsForm((f) => ({ ...f, [id]: {} })); refreshDetail(id); setMsg(t('companiesAdmin.toasts.webSearchSaved')) } catch (e) { setMsg(e.message) } }
  const clearWebSearch = async (id) => { try { await workAdminApi.companyWebSearch(id, '', 'tavily'); refreshDetail(id); setMsg(t('companiesAdmin.toasts.webSearchCleared')) } catch (e) { setMsg(e.message) } }

  // Members: add by email (SSO) or username+password, set tier, grant hours, remove.
  const [mForm, setMForm] = useState({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic', mode: 'email', free: false })
  const addMember = async (companyId) => {
    setBusy(true); setMsg('')
    try {
      if (mForm.mode === 'email') {
        if (!mForm.email.includes('@')) { setMsg(t('companiesAdmin.errors.validEmail')); setBusy(false); return }
        await workAdminApi.addCompanyMember(companyId, { email: mForm.email.trim(), displayName: mForm.displayName.trim(), companyRole: mForm.companyRole, tier: mForm.tier })
      } else {
        if (!mForm.username.trim()) { setMsg(t('companiesAdmin.errors.username')); setBusy(false); return }
        if (!mForm.email.includes('@')) { setMsg(t('companiesAdmin.errors.emailForLink')); setBusy(false); return }
        // Password optional - the person sets their own via the emailed link.
        await workAdminApi.createUser({ username: mForm.username.trim(), email: mForm.email.trim(), ...(mForm.password ? { password: mForm.password } : {}), companyId, companyRole: mForm.companyRole, tier: mForm.tier, free: mForm.free })
      }
      setMForm({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic', mode: mForm.mode, free: false }); refreshDetail(companyId)
    } catch (e) { setMsg(e.message || t('companiesAdmin.errors.addPersonFailed')) } finally { setBusy(false) }
  }
  const setUserTier = async (u, companyId, tier) => { try { await workAdminApi.setTier(u.id, tier); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }
  const grantUserHours = async (u, companyId) => { const h = window.prompt(t('companiesAdmin.prompts.hoursForUser', { username: u.username }), '1'); if (h == null) return; try { await workAdminApi.grantHours(u.id, Number(h) || 0); refreshDetail(companyId); setMsg(t('companiesAdmin.toasts.hoursAddedUser', { h, username: u.username })) } catch (e) { setMsg(e.message) } }
  const removeMember = async (u, companyId) => { const reason = await askReason({ title: t('companiesAdmin.confirm.removeMemberTitle', { username: u.username }), detail: t('companiesAdmin.confirm.removeMemberDetail'), confirmLabel: t('companiesAdmin.confirm.confirmRemove') }); if (!reason || reason.length < 3) return; try { await workAdminApi.removeCompanyMember(companyId, u.id, reason); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }
  const toggleUserScrub = async (u, companyId) => { if (!isSuperAdmin) return; try { await workAdminApi.userScrub(u.id, !u.scrub); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }
  const isFree = (u) => u.subscription && u.subscription.status === 'comp'
  const toggleUserFree = async (u, companyId) => { if (!isSuperAdmin) return; try { await workAdminApi.userFreeAccess(u.id, !isFree(u)); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }

  // Seat allocation + pool minutes.
  const [seatEdit, setSeatEdit] = useState({})
  const saveSeats = async (id) => {
    const e = seatEdit[id] || {}
    const byTier = { basic: Number(e.basic) || 0, advanced: Number(e.advanced) || 0, premium: Number(e.premium) || 0 }
    const total = byTier.basic + byTier.advanced + byTier.premium
    // A company on the single total pool whose form was left at zeros is NOT
    // being converted to "no licenses of any tier"; send null so it stays on the
    // total pool (the server guards this too; this keeps the intent explicit).
    const perTierNow = !!(lic && lic.seatsByTier)
    try {
      await workAdminApi.updateCompany(id, { seatsByTier: (!perTierNow && total === 0) ? null : byTier, adminSeats: Number(e.adminSeats) || 0 })
      setSeatEdit((s) => ({ ...s, [id]: undefined })); refreshDetail(id); setMsg(t('companiesAdmin.toasts.licensesUpdated'))
    } catch (err) { setMsg(err.message) }
  }
  const addPool = async (id) => { const h = window.prompt(t('companiesAdmin.prompts.hoursForPool'), '10'); if (h == null) return; try { await workAdminApi.poolMinutes(id, Math.round((Number(h) || 0) * 60)); refreshDetail(id); setMsg(t('companiesAdmin.toasts.hoursAddedPool', { h })) } catch (e) { setMsg(e.message) } }

  // Pricing overrides.
  const [priceForm, setPriceForm] = useState({})
  const savePricing = async (id) => {
    const p = priceForm[id] || {}
    const pricing = {
      plans: { ...(p.pBasic ? { basic: Number(p.pBasic) } : {}), ...(p.pAdvanced ? { advanced: Number(p.pAdvanced) } : {}), ...(p.pPremium ? { premium: Number(p.pPremium) } : {}) },
      hour: { ...(p.hBasic ? { basic: Number(p.hBasic) } : {}), ...(p.hAdvanced ? { advanced: Number(p.hAdvanced) } : {}), ...(p.hPremium ? { premium: Number(p.hPremium) } : {}) },
    }
    try { await workAdminApi.setCompanyPricing(id, pricing); refreshDetail(id); setMsg(t('companiesAdmin.toasts.pricingSaved')) } catch (e) { setMsg(e.message) }
  }

  // Billing.
  const loadBill = async (id) => { try { setBill(await workAdminApi.companyBilling(id)) } catch (e) { setMsg(e.message) } }
  const addBillItem = async (id) => { const desc = window.prompt(t('companiesAdmin.prompts.billDescription')); if (!desc) return; const amt = window.prompt(t('companiesAdmin.prompts.billAmount'), '0'); if (amt == null) return; try { await workAdminApi.addBillingItem(id, { type: 'adjustment', description: desc, qty: 1, unitAmount: Number(amt) || 0 }); loadBill(id) } catch (e) { setMsg(e.message) } }
  const removeBillItem = async (id, itemId) => { const reason = await askReason({ title: t('companiesAdmin.confirm.removeBillTitle'), detail: t('companiesAdmin.confirm.removeBillDetail'), confirmLabel: t('companiesAdmin.confirm.confirmRemove') }); if (!reason || reason.length < 3) return; try { await workAdminApi.removeBillingItem(id, itemId, reason); loadBill(id) } catch (e) { setMsg(e.message) } }

  // Disable (reversible) or delete (hard) a whole company. Disable uses the local
  // reason prompt; delete uses the shared modal because it needs the extra
  // "also delete members" choice. Both are reason-gated + logged server-side.
  const toggleCompanyDisabled = async (co) => {
    const disabling = !co.disabled
    const reason = await askReason({
      title: disabling ? t('companiesAdmin.confirm.disableTitle', { name: co.name }) : t('companiesAdmin.confirm.enableTitle', { name: co.name }),
      detail: disabling ? t('companiesAdmin.confirm.disableDetail') : t('companiesAdmin.confirm.enableDetail'),
      confirmLabel: disabling ? t('companiesAdmin.confirm.disableLabel') : t('companiesAdmin.confirm.enableLabel'),
    })
    if (!reason || reason.length < 3) return
    try { await workAdminApi.disableCompany(co.id, disabling, reason); await load(); if (openId === co.id) refreshDetail(co.id) }
    catch (e) { setMsg(e.message) }
  }
  const confirmDeleteCompany = async (reason) => {
    setDelBusy(true); setDelErr(null)
    try {
      await workAdminApi.deleteCompany(delCompany.id, reason, delMembers)
      const wasOpen = openId === delCompany.id
      setDelCompany(null); setDelMembers(false)
      if (wasOpen) { setOpenId(null); setDetail(null); setLic(null); setBill(null) }
      await load()
    } catch (e) { setDelErr(e) } finally { setDelBusy(false) }
  }

  if (state.loading) return <Loading label={t('companiesAdmin.loadingCompanies')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const P = (k, v) => setForm((f) => ({ ...f, profile: { ...f.profile, [k]: v } }))
  const T = (k, v) => setForm((f) => ({ ...f, byTier: { ...f.byTier, [k]: v.replace(/[^0-9]/g, '') } }))

  return (
    <div>
      <style>{CSS}</style>
      {reasonModal}
      {delCompany ? (
        <SharedReasonModal
          title={t('companiesAdmin.confirm.deleteTitle', { name: delCompany.name })}
          message={t('companiesAdmin.confirm.deleteMessage')}
          confirmLabel={t('companiesAdmin.confirm.deleteLabel')}
          busy={delBusy} error={delErr}
          extra={(
            <label className="wka-check" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={delMembers} onChange={(e) => setDelMembers(e.target.checked)} />
              {t('companiesAdmin.confirm.deleteMembers')}
            </label>
          )}
          onConfirm={confirmDeleteCompany}
          onCancel={() => { if (!delBusy) { setDelCompany(null); setDelMembers(false) } }}
        />
      ) : null}
      {showNew && isSuperAdmin && (
        <div className="wka-panel">
          <h2><Plus size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companiesAdmin.create.title')}</h2>
          <p className="desc">{t('companiesAdmin.create.desc')}</p>
          <div className="co-sec">{t('companiesAdmin.create.secCompany')}</div>
          <div className="wka-grid co-grid">
            <L label={t('companiesAdmin.create.name')}><input className="wka-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></L>
            <L label={t('companiesAdmin.create.plan')}><select className="wka-select" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="basic">{t('companiesAdmin.plans.basic')}</option><option value="advanced">{t('companiesAdmin.plans.advanced')}</option><option value="premium">{t('companiesAdmin.plans.premium')}</option></select></L>
            <L label={t('companiesAdmin.create.aiSource')} hint={t('companiesAdmin.create.aiSourceHint')}><select className="wka-select" value={form.aiSource} onChange={(e) => setForm({ ...form, aiSource: e.target.value })}><option value="">{t('companiesAdmin.create.select')}</option><option value="platform">{t('companiesAdmin.create.aiPlatform')}</option><option value="company">{t('companiesAdmin.create.aiCompany')}</option></select></L>
          </div>
          <div className="co-sec">{t('companiesAdmin.create.secBranding')}</div>
          <div className="wka-grid co-grid">
            <L label={t('companiesAdmin.create.logo')}><LogoField value={form.logo} onChange={(v) => setForm((f) => ({ ...f, logo: v }))} /></L>
            <L label={t('companiesAdmin.create.website')}><input className="wka-input" placeholder="https://example.com" value={form.profile.website} onChange={(e) => P('website', e.target.value)} /></L>
          </div>
          <div className="co-sec">{t('companiesAdmin.create.secContact')}</div>
          <div className="wka-grid co-grid">
            <L label={t('companiesAdmin.create.contactPerson')}><input className="wka-input" value={form.profile.contactPerson} onChange={(e) => P('contactPerson', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.email')}><input className="wka-input" value={form.profile.email} onChange={(e) => P('email', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.billingEmail')}><input className="wka-input" value={form.profile.billingEmail} onChange={(e) => P('billingEmail', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.phone')}><input className="wka-input" value={form.profile.phone} onChange={(e) => P('phone', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.address')}><input className="wka-input" value={form.profile.address} onChange={(e) => P('address', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.city')}><input className="wka-input" value={form.profile.city} onChange={(e) => P('city', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.state')}><input className="wka-input" value={form.profile.state} onChange={(e) => P('state', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.country')}><input className="wka-input" value={form.profile.country} onChange={(e) => P('country', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.postalCode')}><input className="wka-input" value={form.profile.postalCode} onChange={(e) => P('postalCode', e.target.value)} /></L>
          </div>
          <div className="co-sec">{t('companiesAdmin.create.secLicenses')}</div>
          <div className="wka-grid co-grid">
            <L label={t('companiesAdmin.create.basicLicenses')}><input className="wka-input" value={form.byTier.basic} onChange={(e) => T('basic', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.advancedLicenses')}><input className="wka-input" value={form.byTier.advanced} onChange={(e) => T('advanced', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.premiumLicenses')}><input className="wka-input" value={form.byTier.premium} onChange={(e) => T('premium', e.target.value)} /></L>
            <L label={t('companiesAdmin.create.adminSeats')} hint={t('companiesAdmin.create.adminSeatsHint')}><input className="wka-input" value={form.adminSeats} onChange={(e) => setForm({ ...form, adminSeats: e.target.value.replace(/[^0-9]/g, '') })} /></L>
            <L label={t('companiesAdmin.create.licenseMode')} hint={t('companiesAdmin.create.licenseModeHint')}><select className="wka-select" value={form.licenseMode} onChange={(e) => setForm({ ...form, licenseMode: e.target.value })}><option value="locked">{t('companiesAdmin.create.lockedOpt')}</option><option value="flexible">{t('companiesAdmin.create.flexibleOpt')}</option></select></L>
            <L label={t('companiesAdmin.create.ssoProvisioning')} hint={t('companiesAdmin.create.ssoProvisioningHint')}><select className="wka-select" value={form.ssoProvisioning} onChange={(e) => setForm({ ...form, ssoProvisioning: e.target.value })}><option value="explicit">{t('companiesAdmin.create.explicitOpt')}</option><option value="auto">{t('companiesAdmin.create.autoOpt')}</option></select></L>
          </div>
          <div className="co-foot">
            <label className="wka-check"><input type="checkbox" checked={form.scrub} onChange={(e) => setForm({ ...form, scrub: e.target.checked })} /> {t('companiesAdmin.create.scrubDefault')}</label>
            <span className="co-total">{t('companiesAdmin.create.totalLicenses')}<b>{seatTotal}</b>{seatTotal === 0 ? <span className="co-dim" style={{ marginLeft: 8 }}>{t('companiesAdmin.create.totalNone', { adminSeats: Number(form.adminSeats) > 0 ? form.adminSeats : t('companiesAdmin.noLimit') })}</span> : null}</span>
            <span className="wka-spacer" />
            <button type="button" className="wka-btn primary" disabled={busy} onClick={createCompany}>{busy ? <Spinning /> : <Plus size={14} />} {t('companiesAdmin.create.submit')}</button>
            <button type="button" className="wka-btn ghost" disabled={busy} onClick={() => { setShowNew(false); setMsg('') }}><X size={14} /> {t('companiesAdmin.cancel')}</button>
          </div>
        </div>
      )}

      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}><Building2 size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-cyan)' }} />{t('companiesAdmin.list.title')} <span className="co-count">{state.companies.length}</span></h2>
          {isSuperAdmin && <button type="button" className="wka-btn sm primary" onClick={() => setShowNew((v) => !v)} aria-expanded={showNew}><Plus size={14} /> {t('companiesAdmin.list.newCompany')}</button>}
        </div>
        <p className="desc">{t('companiesAdmin.list.desc')}</p>
        {msg && <div className="co-msg">{msg}</div>}

      {state.companies.length === 0 ? <EmptyState title={t('companiesAdmin.list.emptyTitle')} detail={t('companiesAdmin.list.emptyDetail')} />
        : (
          <div className="co-list">
            {state.companies.map((c) => (
              <div key={c.id} className="co-row">
                <button className="co-row-head" onClick={() => openCompany(c.id)}>
                  {openId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="co-ic"><Building2 size={16} /></span>
                  <span className="co-name">{c.name}</span>
                  <span className={`wka-badge ${c.plan}`}>{codeLabel(c.plan)}</span>
                  {c.disabled ? <span className="wka-badge disabled">{t('companiesAdmin.list.disabled')}</span> : null}
                  <span className="co-meta">{t('companiesAdmin.list.users', { n: c.memberCount != null ? c.memberCount : c.userCount })} &middot; {t('companiesAdmin.list.admins', { n: c.adminCount })}{c.aiReady === false ? <span className="co-warn"><AlertTriangle size={12} /> {t('companiesAdmin.list.aiNotReady')}</span> : null}</span>
                  <span className={`co-scrub ${c.scrub ? 'on' : ''}`}>{c.scrub ? <><ShieldCheck size={13} /> {t('companiesAdmin.list.redactionOn')}</> : <><Shield size={13} /> {t('companiesAdmin.list.redactionOff')}</>}</span>
                </button>
                {openId === c.id && (
                  <div className="co-detail">
                    {!detail ? <Loading label={t('companiesAdmin.loadingCompany')} /> : (
                      <>
                        <div className="co-detail-top">
                          <div>{t('companiesAdmin.detail.plan')} <b>{codeLabel(detail.company.plan)}</b> &middot; {t('companiesAdmin.detail.mode')} <b>{codeLabel(detail.company.licenseMode)}</b> &middot; {t('companiesAdmin.detail.sso')} <b>{detail.company.ssoProvisioning === 'auto' ? t('companiesAdmin.detail.openDomain') : t('companiesAdmin.detail.inviteOnly')}</b> {detail.company.sso && detail.company.sso.connected ? <>({detail.company.sso.provider})</> : ''} &middot; {t('companiesAdmin.detail.ai')} <b style={{ color: detail.company.aiReady ? 'var(--wka-emerald)' : 'var(--wka-amber)' }}>{detail.company.aiReady ? t('companiesAdmin.detail.ready') : t('companiesAdmin.detail.notReady')}</b></div>
                          {isSuperAdmin && (
                            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                              <button className="wka-btn sm" onClick={() => toggleCompanyScrub(c)}>{c.scrub ? t('companiesAdmin.detail.redactionOff') : t('companiesAdmin.detail.redactionOn')}</button>
                              <button className="wka-btn sm" onClick={() => toggleCompanyDisabled(detail.company)} style={detail.company.disabled ? { color: 'var(--wka-emerald)' } : undefined}>
                                {detail.company.disabled ? <><ShieldCheck size={13} /> {t('companiesAdmin.detail.enable')}</> : <><ShieldOff size={13} /> {t('companiesAdmin.detail.disable')}</>}
                              </button>
                              <button type="button" className="wka-btn sm ghost" style={{ color: 'var(--wka-red)' }} onClick={() => { setDelErr(null); setDelMembers(false); setDelCompany(detail.company) }}>
                                <Trash2 size={13} /> {t('companiesAdmin.detail.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                        {detail.company.profile && (detail.company.profile.contactPerson || detail.company.profile.city) ? (
                          <div className="co-profile">{[detail.company.profile.contactPerson, detail.company.profile.email, detail.company.profile.phone, [detail.company.profile.city, detail.company.profile.state, detail.company.profile.country].filter(Boolean).join(', ')].filter(Boolean).join('  ·  ')}</div>
                        ) : null}

                        {isSuperAdmin && <BrandingPanel key={`${c.id}:${(detail.company.logo || '').length}:${(detail.company.profile && detail.company.profile.website) || ''}`} company={detail.company} onSaved={() => refreshDetail(c.id)} />}

                        {isSuperAdmin && (
                          <div className="co-detail-top" style={{ gap: 14, flexWrap: 'wrap' }}>
                            <label className="co-inline">{t('companiesAdmin.detail.aiSource')}
                              <select className="wka-select" value={detail.company.aiSource || ''} onChange={(e) => patchCompany(c.id, { aiSource: e.target.value || null })}>
                                <option value="">{t('companiesAdmin.detail.select')}</option><option value="platform">{t('companiesAdmin.detail.platformKeys')}</option><option value="company">{t('companiesAdmin.detail.companyKeys')}</option>
                              </select>
                            </label>
                            {detail.company.aiReady === false && <span className="co-amber"><AlertTriangle size={13} /> {detail.company.aiReason}</span>}
                            <button className={`co-toggle ${detail.company.imageGen ? 'on' : ''}`} onClick={() => patchCompany(c.id, { imageGen: !detail.company.imageGen })}>{t('companiesAdmin.detail.imageGen')}{detail.company.imageGen ? t('companiesAdmin.on') : t('companiesAdmin.off')}</button>
                          </div>
                        )}

                        {isSuperAdmin && detail.company.aiSource === 'company' && (
                          <div className="co-block">
                            <div className="co-block-t">{t('companiesAdmin.aiKeys.title')} {detail.company.companyAi ? <span className="co-dim">· {detail.company.companyAi.providerId} · {detail.company.companyAi.keyMasked}</span> : <span className="co-amber">· {t('companiesAdmin.aiKeys.noneSet')}</span>}</div>
                            <div className="co-inline-wrap">
                              <input className="wka-input" placeholder={t('companiesAdmin.aiKeys.providerPlaceholder')} value={(aiForm[c.id]?.providerId) || ''} onChange={(e) => setAiField(c.id, 'providerId', e.target.value)} style={{ width: 190 }} />
                              <input className="wka-input" type="password" autoComplete="new-password" placeholder={t('companiesAdmin.aiKeys.apiKeyPlaceholder')} value={(aiForm[c.id]?.apiKey) || ''} onChange={(e) => setAiField(c.id, 'apiKey', e.target.value)} style={{ width: 210 }} />
                              <input className="wka-input" placeholder={t('companiesAdmin.aiKeys.chatModelPlaceholder')} value={(aiForm[c.id]?.chatModel) || ''} onChange={(e) => setAiField(c.id, 'chatModel', e.target.value)} style={{ width: 140 }} />
                              <input className="wka-input" placeholder={t('companiesAdmin.aiKeys.visionModelPlaceholder')} value={(aiForm[c.id]?.visionModel) || ''} onChange={(e) => setAiField(c.id, 'visionModel', e.target.value)} style={{ width: 140 }} />
                              <button className="wka-btn sm" onClick={() => saveAiKeys(c.id)}>{t('companiesAdmin.aiKeys.save')}</button>
                              {detail.company.companyAi && <button className="wka-btn sm ghost" onClick={() => clearAiKeys(c.id)}>{t('companiesAdmin.clear')}</button>}
                            </div>
                          </div>
                        )}

                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t">{t('companiesAdmin.webSearch.title')} {detail.company.webSearchConfigured ? <span className="co-dim">· {(detail.company.webSearch && detail.company.webSearch.provider) || 'tavily'} · {detail.company.webSearch && detail.company.webSearch.keyMasked}</span> : <span className="co-amber">· {t('companiesAdmin.webSearch.noneSet')}</span>}</div>
                            <div className="co-dim" style={{ marginBottom: 2 }}>{t('companiesAdmin.webSearch.hint')}</div>
                            <div className="co-inline-wrap">
                              <input className="wka-input" type="password" autoComplete="new-password" placeholder={t('companiesAdmin.webSearch.keyPlaceholder')} value={(wsForm[c.id]?.apiKey) || ''} onChange={(e) => setWsField(c.id, 'apiKey', e.target.value)} style={{ width: 240 }} />
                              <button className="wka-btn sm" onClick={() => saveWebSearch(c.id)}>{t('companiesAdmin.webSearch.save')}</button>
                              {detail.company.webSearchConfigured && <button className="wka-btn sm ghost" onClick={() => clearWebSearch(c.id)}>{t('companiesAdmin.clear')}</button>}
                            </div>
                          </div>
                        )}

                        {/* Licenses */}
                        {isSuperAdmin && lic && (
                          <div className="co-block">
                            <div className="co-block-t">{t('companiesAdmin.licenses.title')} {lic.seatsByTier ? t('companiesAdmin.licenses.perTier') : t('companiesAdmin.licenses.totalPool')}</div>
                            {lic.tierUsage ? (
                              <div className="co-tiers">
                                {['basic', 'advanced', 'premium'].map((tier) => {
                                  const tu = lic.tierUsage[tier]; const ed = seatEdit[c.id]
                                  return <div key={tier} className="co-tier"><span className="co-tier-n">{codeLabel(tier)}</span>{ed ? <input className="wka-input co-seat-in" value={ed[tier]} onChange={(e) => setSeatEdit((s) => ({ ...s, [c.id]: { ...s[c.id], [tier]: e.target.value.replace(/[^0-9]/g, '') } }))} /> : <b>{tu.used} / {tu.allocated}</b>}<span className="co-dim">{ed ? t('companiesAdmin.licenses.allocated') : t('companiesAdmin.licenses.free', { n: tu.left })}</span></div>
                                })}
                                <div className="co-tier"><span className="co-tier-n">{t('companiesAdmin.licenses.admin')}</span>{seatEdit[c.id] ? <input className="wka-input co-seat-in" value={seatEdit[c.id].adminSeats} onChange={(e) => setSeatEdit((s) => ({ ...s, [c.id]: { ...s[c.id], adminSeats: e.target.value.replace(/[^0-9]/g, '') } }))} /> : <b>{lic.adminSeatsUsed} / {lic.adminSeats}</b>}<span className="co-dim">{t('companiesAdmin.licenses.seats')}</span></div>
                              </div>
                            ) : <div className="co-dim">{t('companiesAdmin.licenses.totalSeats', { used: lic.userSeatsUsed, total: lic.userSeats || t('companiesAdmin.noLimit'), adminUsed: lic.adminSeatsUsed, adminTotal: lic.adminSeats })}</div>}
                            <div className="co-inline-wrap">
                              {seatEdit[c.id]
                                ? <><button className="wka-btn sm primary" onClick={() => saveSeats(c.id)}>{t('companiesAdmin.licenses.save')}</button><button className="wka-btn sm ghost" onClick={() => setSeatEdit((s) => ({ ...s, [c.id]: undefined }))}>{t('companiesAdmin.cancel')}</button></>
                                : <button className="wka-btn sm ghost" onClick={() => setSeatEdit((s) => ({ ...s, [c.id]: { basic: (lic.seatsByTier?.basic) || 0, advanced: (lic.seatsByTier?.advanced) || 0, premium: (lic.seatsByTier?.premium) || 0, adminSeats: lic.adminSeats } }))}>{t('companiesAdmin.licenses.edit')}</button>}
                              <select className="wka-select" value={detail.company.licenseMode} onChange={(e) => patchCompany(c.id, { licenseMode: e.target.value })}><option value="locked">{t('companiesAdmin.licenses.locked')}</option><option value="flexible">{t('companiesAdmin.licenses.flexible')}</option></select>
                              <select className="wka-select" value={detail.company.ssoProvisioning} onChange={(e) => patchCompany(c.id, { ssoProvisioning: e.target.value })}><option value="explicit">{t('companiesAdmin.licenses.inviteOnly')}</option><option value="auto">{t('companiesAdmin.licenses.openDomain')}</option></select>
                              <span className="co-inline"><Clock size={13} /> {t('companiesAdmin.licenses.pool')}<b>{fmtMins(lic.poolSeconds)}</b> <button className="wka-btn sm ghost" onClick={() => addPool(c.id)}>{t('companiesAdmin.licenses.addHours')}</button></span>
                            </div>
                          </div>
                        )}

                        {/* People */}
                        <div className="co-block-t">{t('companiesAdmin.people.title')}</div>
                        <div className="wka-table-wrap" style={{ marginBottom: 12 }}>
                        <table className="wka-table co-users">
                          <thead><tr><th>{t('companiesAdmin.people.person')}</th><th>{t('companiesAdmin.people.role')}</th><th>{t('companiesAdmin.people.plan')}</th><th>{t('companiesAdmin.people.usedToday')}</th><th>{t('companiesAdmin.people.redaction')}</th><th></th></tr></thead>
                          <tbody>
                            {detail.users.length === 0 && <tr><td colSpan={6} className="co-empty">{t('companiesAdmin.people.empty')}</td></tr>}
                            {detail.users.map((u) => {
                              const mu = lic && (lic.members || []).find((m) => String(m.id) === String(u.id))
                              return (
                                <tr key={u.id}>
                                  <td>{u.displayName || u.username}<div className="co-dim">{u.ssoEmail || u.username}</div></td>
                                  <td>{ROLE_CHIP[u.companyRole] ? <span className="wka-chip ok">{t(ROLE_CHIP[u.companyRole])}</span> : t('companiesAdmin.people.member')}</td>
                                  <td><select className="wka-select" value={u.tier || 'basic'} onChange={(e) => setUserTier(u, c.id, e.target.value)}><option value="basic">{t('companiesAdmin.plans.basic')}</option><option value="advanced">{t('companiesAdmin.plans.advanced')}</option><option value="premium">{t('companiesAdmin.plans.premium')}</option></select></td>
                                  <td className="co-dim">{mu ? `${fmtMins(mu.usage.usedSeconds)} / ${fmtMins(mu.usage.dailySeconds)}` : '-'}</td>
                                  <td>{isSuperAdmin ? <button className={`co-toggle ${u.scrub ? 'on' : ''}`} onClick={() => toggleUserScrub(u, c.id)}>{u.scrub ? t('companiesAdmin.on') : t('companiesAdmin.off')}</button> : (u.scrub ? t('companiesAdmin.on') : t('companiesAdmin.off'))}</td>
                                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <button className="wka-btn sm ghost" title={t('companiesAdmin.people.addHours')} onClick={() => grantUserHours(u, c.id)}><Clock size={12} /></button>
                                    <button className="wka-btn sm ghost" title={t('companiesAdmin.people.freeAccess')} onClick={() => toggleUserFree(u, c.id)} style={{ color: isFree(u) ? 'var(--wka-emerald)' : undefined }}>{isFree(u) ? t('companiesAdmin.people.free') : '$'}</button>
                                    <button className="wka-btn sm ghost" title={t('companiesAdmin.people.remove')} onClick={() => removeMember(u, c.id)}><Trash2 size={12} /></button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        </div>
                        <div className="co-adduser">
                          <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
                            <button className={`wka-btn sm${mForm.mode === 'email' ? ' primary' : ''}`} onClick={() => setMForm({ ...mForm, mode: 'email' })}><Mail size={12} /> {t('companiesAdmin.people.modeEmail')}</button>
                            <button className={`wka-btn sm${mForm.mode === 'password' ? ' primary' : ''}`} onClick={() => setMForm({ ...mForm, mode: 'password' })}><KeyRound size={12} /> {t('companiesAdmin.people.modePassword')}</button>
                          </div>
                          {mForm.mode === 'email'
                            ? <><input className="wka-input" placeholder={t('companiesAdmin.people.workEmail')} value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /><input className="wka-input" placeholder={t('companiesAdmin.people.nameOptional')} value={mForm.displayName} onChange={(e) => setMForm({ ...mForm, displayName: e.target.value })} /></>
                            : <><input className="wka-input" placeholder={t('companiesAdmin.people.username')} value={mForm.username} onChange={(e) => setMForm({ ...mForm, username: e.target.value })} /><input className="wka-input" type="email" placeholder={t('companiesAdmin.people.emailLink')} value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /><input className="wka-input" type="password" placeholder={t('companiesAdmin.people.passwordOptional')} value={mForm.password} onChange={(e) => setMForm({ ...mForm, password: e.target.value })} /></>}
                          <select className="wka-select" value={mForm.companyRole} onChange={(e) => setMForm({ ...mForm, companyRole: e.target.value })}>{roleOptions(t)}</select>
                          <select className="wka-select" value={mForm.tier} onChange={(e) => setMForm({ ...mForm, tier: e.target.value })}><option value="basic">{t('companiesAdmin.plans.basic')}</option><option value="advanced">{t('companiesAdmin.plans.advanced')}</option><option value="premium">{t('companiesAdmin.plans.premium')}</option></select>
                          <button type="button" className="wka-btn primary" disabled={busy} onClick={() => addMember(c.id)}>{busy ? <Spinning /> : <UserPlus size={14} />} {t('companiesAdmin.people.add')}</button>
                        </div>

                        {/* Pricing */}
                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t">{t('companiesAdmin.pricing.title')} <span className="co-dim">· {t('companiesAdmin.pricing.titleSub')}</span></div>
                            <div className="co-inline-wrap">
                              <span className="co-dim">{t('companiesAdmin.pricing.planMo')}</span>
                              {['Basic', 'Advanced', 'Premium'].map((tr) => <input key={tr} className="wka-input co-price-in" placeholder={t(`companiesAdmin.plans.${tr.toLowerCase()}`)} value={(priceForm[c.id]?.[`p${tr}`]) || ''} onChange={(e) => setPriceForm((f) => ({ ...f, [c.id]: { ...f[c.id], [`p${tr}`]: e.target.value.replace(/[^0-9.]/g, '') } }))} />)}
                              <span className="co-dim">{t('companiesAdmin.pricing.hour')}</span>
                              {['Basic', 'Advanced', 'Premium'].map((tr) => <input key={tr} className="wka-input co-price-in" placeholder={t(`companiesAdmin.plans.${tr.toLowerCase()}`)} value={(priceForm[c.id]?.[`h${tr}`]) || ''} onChange={(e) => setPriceForm((f) => ({ ...f, [c.id]: { ...f[c.id], [`h${tr}`]: e.target.value.replace(/[^0-9.]/g, '') } }))} />)}
                              <button className="wka-btn sm" onClick={() => savePricing(c.id)}>{t('companiesAdmin.pricing.save')}</button>
                            </div>
                            {detail.company.pricing && <div className="co-dim">{t('companiesAdmin.pricing.current', { pb: money(detail.company.pricing.plans.basic), pa: money(detail.company.pricing.plans.advanced), pp: money(detail.company.pricing.plans.premium), hb: money(detail.company.pricing.hour.basic), ha: money(detail.company.pricing.hour.advanced), hp: money(detail.company.pricing.hour.premium) })}</div>}
                          </div>
                        )}

                        {/* Billing */}
                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t"><Receipt size={14} /> {t('companiesAdmin.billing.title')}
                              <button className="wka-btn sm ghost" style={{ marginLeft: 8 }} onClick={() => loadBill(c.id)}>{t('companiesAdmin.billing.load')}</button>
                              {bill && <a className="wka-btn sm ghost" href={workAdminApi.invoiceUrl(c.id)} target="_blank" rel="noreferrer">{t('companiesAdmin.billing.download')}</a>}
                              {bill && <button className="wka-btn sm ghost" onClick={() => addBillItem(c.id)}>{t('companiesAdmin.billing.addItem')}</button>}
                            </div>
                            {bill && (
                              <div className="wka-table-wrap">
                              <table className="wka-table">
                                <thead><tr><th>{t('companiesAdmin.billing.description')}</th><th style={{ textAlign: 'right' }}>{t('companiesAdmin.billing.qty')}</th><th style={{ textAlign: 'right' }}>{t('companiesAdmin.billing.amount')}</th><th></th></tr></thead>
                                <tbody>
                                  {[...(bill.seatLines || []), ...(bill.ledger || [])].map((l, i) => (
                                    <tr key={l.id || i}><td>{l.description || l.type}</td><td style={{ textAlign: 'right' }}>{l.qty}</td><td style={{ textAlign: 'right' }}>{money(l.amount)}</td><td style={{ textAlign: 'right' }}>{l.id && l.id.startsWith('bi') ? <button className="wka-btn sm ghost" onClick={() => removeBillItem(c.id, l.id)}><Trash2 size={11} /></button> : null}</td></tr>
                                  ))}
                                </tbody>
                                <tfoot><tr><td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>{t('companiesAdmin.billing.total')}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(bill.total)}</td><td /></tr></tfoot>
                              </table>
                              </div>
                            )}
                          </div>
                        )}

                        {isSuperAdmin && <SsoPanel company={detail.company} onSaved={() => refreshDetail(c.id)} />}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// A labelled field on the console's wka-field grid (the label wraps the control
// so clicking the caption focuses it). `hint` renders the shared "?" help cue.
function L({ label, hint, children }) {
  return <label className="wka-field co-l"><span className="co-l-cap">{label}{hint ? <span className="co-l-h" title={hint} aria-label={hint}> ?</span> : null}</span>{children}</label>
}

const CSS = `
.co-logo{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.co-logo-prev{width:96px;height:64px;border:1px dashed var(--wka-line);border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--wka-panel);overflow:hidden;font-size:12px}
.co-logo-prev img{max-width:100%;max-height:100%;object-fit:contain}
.co-logo-act{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.co-logo-act label.wka-btn{cursor:pointer}
.co-count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;margin-left:8px;border-radius:999px;font-size:11.5px;font-weight:700;font-family:var(--wka-font-body);color:var(--wka-accent-ink);background:var(--wka-accent-soft);vertical-align:middle}
.co-sec{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--wka-faint);margin:6px 0 8px}
/* wka-grid is the console form grid; this only adds the stack spacing between sections. */
.co-grid{margin-bottom:14px}
.co-l{cursor:default}
.co-l-cap{font-size:12px;color:var(--wka-muted)}
.co-l-h{color:var(--wka-accent);cursor:help;font-weight:700}
.co-foot{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--wka-line)}
.co-total{font-size:13px;color:var(--wka-muted)}
/* Inline validation / action message: the console's error box look (single source). */
.co-msg{display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb, var(--wka-red) 35%, transparent);background:color-mix(in srgb, var(--wka-red) 7%, transparent);color:var(--wka-red);border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:12px;overflow-wrap:anywhere}
.co-list{display:flex;flex-direction:column;gap:10px}
.co-row{border:1px solid var(--wka-line);border-radius:12px;overflow:hidden;background:var(--wka-panel)}
.co-row-head{width:100%;display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;padding:14px 16px;background:none;border:none;cursor:pointer;font:inherit;color:var(--wka-text);text-align:left}
.co-row-head:hover{background:var(--wka-panel-2)}
.co-row-head:focus-visible{outline:2px solid var(--wka-accent);outline-offset:-2px}
.co-row-head>svg{flex:none}
.co-ic{display:inline-flex;color:var(--wka-accent);flex:none}
.co-name{font-weight:700;font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.co-meta{color:var(--wka-muted);font-size:12.5px;margin-left:auto;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.co-warn{display:inline-flex;align-items:center;gap:4px;color:var(--wka-amber);font-weight:700}
.co-scrub{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:3px 10px;white-space:nowrap;flex:none}
.co-scrub.on{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent);background:color-mix(in srgb, var(--wka-emerald) 8%, transparent)}
.co-detail{border-top:1px solid var(--wka-line);padding:16px;background:var(--wka-bg-2)}
.co-detail-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--wka-muted);margin-bottom:12px}
.co-profile{font-size:12.5px;color:var(--wka-muted);margin:-4px 0 12px;padding-bottom:10px;border-bottom:1px dashed var(--wka-line)}
.co-inline{display:inline-flex;align-items:center;gap:7px;font-size:13px}
.co-inline-wrap{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.co-amber{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--wka-amber)}
.co-dim{color:var(--wka-faint);font-size:12px}
.co-block{margin:12px 0;padding:12px 14px;border:1px solid var(--wka-line);border-radius:10px;background:var(--wka-panel)}
.co-block-t{font-size:12.5px;font-weight:700;color:var(--wka-text);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.co-tiers{display:flex;gap:10px;flex-wrap:wrap}
.co-tier{display:flex;flex-direction:column;gap:2px;align-items:flex-start;min-width:84px;padding:8px 10px;border:1px solid var(--wka-line);border-radius:8px}
.co-tier-n{font-size:11px;text-transform:capitalize;color:var(--wka-faint)}
.co-tier b{font-size:15px}
.co-seat-in{width:56px;padding:3px 6px}
.co-price-in{width:66px;padding:4px 6px}
.co-users{width:100%;margin-bottom:12px}
.co-empty{color:var(--wka-faint);text-align:center;padding:14px}
.co-toggle{font:inherit;font-size:12px;font-weight:700;border-radius:7px;padding:4px 12px;cursor:pointer;border:1px solid var(--wka-line-2);background:var(--wka-panel);color:var(--wka-muted);white-space:nowrap}
.co-toggle.on{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent);background:color-mix(in srgb, var(--wka-emerald) 10%, transparent)}
.co-adduser{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--wka-line)}
.co-adduser .wka-input{flex:1 1 160px;min-width:0}
.co-copy{display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap}
.co-copy code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--wka-text);word-break:break-all}
.co-sso{margin-top:14px;border-top:1px solid var(--wka-line);padding-top:12px}
.co-sso-head{width:100%;display:flex;align-items:center;gap:9px;flex-wrap:wrap;background:none;border:none;cursor:pointer;font:inherit;font-weight:700;font-size:13.5px;color:var(--wka-text);padding:4px 0}
.co-sso-head svg{color:var(--wka-accent);flex:none}
.co-sso-state{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:3px 10px;white-space:nowrap}
.co-sso-state.on{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent);background:color-mix(in srgb, var(--wka-emerald) 8%, transparent)}
.co-sso-body{display:flex;flex-direction:column;gap:9px;padding:14px;margin-top:10px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-panel)}
.co-sso-row{display:flex;align-items:center;gap:10px}
.co-sso-row label{width:120px;flex:none;font-size:12.5px;color:var(--wka-muted)}
.co-sso-row .wka-input,.co-sso-row .wka-select{flex:1;min-width:0}
.co-sso-hint{font-size:11.5px;color:var(--wka-faint);margin:-4px 0 2px 130px}
.co-sso-redirect{font-size:12px;color:var(--wka-muted);background:var(--wka-bg-2);border:1px solid var(--wka-line);border-radius:9px;padding:9px 11px;overflow-wrap:anywhere}
@media(max-width:720px){.co-meta{margin-left:0;width:100%;white-space:normal}.co-adduser{flex-direction:column;align-items:stretch}.co-sso-row{flex-direction:column;align-items:stretch}.co-sso-row label{width:auto}.co-sso-hint{margin-left:0}}
`
