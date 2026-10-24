// Companies (tenancy): the superadmin onboards a company end to end - full
// profile, per-tier license allocation, admin seats, license mode, SSO
// provisioning, AI source and price overrides - then manages its people (by
// email for SSO), SSO config, corporate AI keys, extra hours, billing and the
// data-redaction policy. Everything a company needs to go live lives here.
import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Building2, ShieldCheck, Shield, Loader2, ChevronRight, ChevronDown, UserPlus, KeyRound, Check, Mail, Clock, Receipt, Copy, Trash2, AlertTriangle, ShieldOff } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, EmptyState, useReasonModal, ReasonModal as SharedReasonModal } from './_shared.jsx'

// Friendly labels for every OpenID Connect provider the backend accepts. The
// engine is generic OIDC, so the list can grow without code changes.
const SSO_PROVIDERS = [
  ['google', 'Google', 'https://accounts.google.com'],
  ['microsoft', 'Microsoft (Entra ID)', 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0'],
  ['okta', 'Okta', 'https://YOUR_ORG.okta.com'],
  ['auth0', 'Auth0', 'https://YOUR_TENANT.us.auth0.com'],
  ['onelogin', 'OneLogin', 'https://YOUR_ORG.onelogin.com/oidc/2'],
  ['ping', 'Ping Identity (PingOne)', 'https://auth.pingone.com/ENV_ID/as'],
  ['jumpcloud', 'JumpCloud', 'https://oauth.id.jumpcloud.com/'],
  ['keycloak', 'Keycloak', 'https://YOUR_HOST/realms/YOUR_REALM'],
  ['cognito', 'AWS Cognito', 'https://cognito-idp.REGION.amazonaws.com/POOL_ID'],
  ['azuread_b2c', 'Microsoft Entra B2C', 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/v2.0'],
  ['authentik', 'Authentik', 'https://YOUR_HOST/application/o/SLUG/'],
  ['duo', 'Duo', 'https://sso.YOUR_ORG.duosecurity.com/oidc/CLIENT'],
  ['centrify', 'Centrify', 'https://YOUR_TENANT.my.centrify.com/OIDC'],
  ['oidc', 'Other (any OpenID Connect)', 'https://your-identity-provider/...'],
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
    } catch (e) { setMsg(e.message || 'Could not save the SSO settings.') } finally { setBusy(false) }
  }

  return (
    <div className="co-sso">
      <button className="co-sso-head" onClick={() => setOpen((v) => !v)}>
        <KeyRound size={15} /><span>Single sign-on</span>
        <span className={`co-sso-state ${connected ? 'on' : ''}`}>{connected ? <><Check size={12} /> Connected ({company.sso.provider})</> : 'Not connected'}</span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open && (
        <div className="co-sso-body">
          <div className="co-sso-row"><label>Provider</label>
            <select className="wka-input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {SSO_PROVIDERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <div className="co-sso-row"><label>Issuer URL</label><input className="wka-input" placeholder={SSO_HINT[form.provider]} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
          <div className="co-sso-hint">Example for this provider: {SSO_HINT[form.provider]}</div>
          <div className="co-sso-row"><label>Client ID</label><input className="wka-input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
          <div className="co-sso-row"><label>Client secret</label><input className="wka-input" type="password" placeholder={hasSecret ? 'Stored. Leave blank to keep it.' : 'Paste the secret'} value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
          <div className="co-sso-row"><label>Email domain</label><input className="wka-input" placeholder="example.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          <div className="co-sso-hint">Users who enter this domain on the sign-in page are sent to this provider.</div>
          <div className="co-sso-redirect">Register this redirect URI in your provider: <CopyLine value={redirectUri} /></div>
          {msg && <div className="co-msg">{msg}</div>}
          {done && <div className="co-sso-ok"><Check size={13} /> Saved.</div>}
          <button className="wka-btn primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="spin" /> : (connected ? 'Update SSO' : 'Connect SSO')}</button>
        </div>
      )}
    </div>
  )
}

// Company roles the console can assign. Executive = read-only productivity dashboard.
const ROLE_OPTIONS = [['member', 'Member'], ['company_admin', 'Company admin'], ['executive', 'Executive (productivity dashboard, read-only)']]
const ROLE_CHIP = { company_admin: 'Admin', executive: 'Executive' }
const roleOptions = () => ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)

// White-label logo: an uploaded image read as a data URL (server caps ~300 KB).
// Rendered only ever as an <img src>, never as HTML.
const LOGO_MAX_BYTES = 300 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
function LogoField({ value, onChange, original }) {
  const [err, setErr] = useState('')
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (!LOGO_TYPES.includes(f.type)) { setErr('Please choose a PNG, JPG, GIF, WebP or SVG image.'); return }
    if (f.size > LOGO_MAX_BYTES) { setErr(`That image is ${Math.round(f.size / 1024)} KB. The limit is about 300 KB, please use a smaller file.`); return }
    const r = new FileReader()
    r.onload = () => { setErr(''); onChange(String(r.result || '')) }
    r.onerror = () => setErr('Could not read that file. Try another image.')
    r.readAsDataURL(f)
  }
  return (
    <div className="co-logo">
      <div className="co-logo-prev">{value ? <img src={value} alt="Company logo preview" /> : <span className="co-dim">No logo</span>}</div>
      <div className="co-logo-act">
        <label className="wka-btn sm"><input type="file" accept={LOGO_TYPES.join(',')} onChange={pick} style={{ display: 'none' }} />{value ? 'Replace logo' : 'Upload logo'}</label>
        {value ? <button type="button" className="wka-btn sm ghost" onClick={() => { setErr(''); onChange('') }}>Remove logo</button> : null}
        {original && value !== original ? <button type="button" className="wka-btn sm ghost" onClick={() => { setErr(''); onChange(original) }}>Undo</button> : null}
        <div className="co-dim">PNG, JPG, GIF, WebP or SVG, up to about 300 KB.</div>
        {err && <div className="co-msg" style={{ marginBottom: 0 }}>{err}</div>}
      </div>
    </div>
  )
}

const WEB_RE = /^https?:\/\/\S+$/i

// Edit an existing company's branding (logo + website) and contact (address, phone).
// Empty logo clears it server-side; profile is merged server-side.
function BrandingPanel({ company, onSaved }) {
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
    if (w && !WEB_RE.test(w)) { setOk(false); setMsg('Website must start with https:// (or http://).'); return }
    setBusy(true); setMsg(''); setOk(false)
    try {
      await workAdminApi.updateCompany(company.id, { logo, profile: { website: w, address: f.address.trim(), phone: f.phone.trim() } })
      setOk(true); onSaved && onSaved()
    } catch (e) { setMsg(e.message || 'Could not save the branding.') } finally { setBusy(false) }
  }
  return (
    <div className="co-block">
      <div className="co-block-t">Branding and contact <span className="co-dim">&middot; shown on this company&rsquo;s dashboard</span></div>
      <LogoField value={logo} onChange={setLogo} original={cur} />
      <div className="co-grid" style={{ marginTop: 10 }}>
        <L label="Website"><input className="wka-input" placeholder="https://example.com" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></L>
        <L label="Address"><input className="wka-input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></L>
        <L label="Phone"><input className="wka-input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></L>
      </div>
      {msg && <div className="co-msg">{msg}</div>}
      {ok && <div className="co-sso-ok"><Check size={13} /> Saved.</div>}
      <button className="wka-btn sm primary" disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="spin" /> : 'Save branding'}</button>
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
    if (busy || !form.name.trim()) { setMsg('Company name is required.'); return }
    if ((form.profile.website || '').trim() && !WEB_RE.test(form.profile.website.trim())) { setMsg('Website must start with https:// (or http://).'); return }
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
    catch (e) { setMsg(e.message || 'Could not create the company.') } finally { setBusy(false) }
  }

  const loadDetail = async (id) => {
    try {
      // The license summary failing used to be swallowed (the whole Licenses
      // block silently vanished). Surface it so the operator can act on it.
      const [d, l] = await Promise.all([
        workAdminApi.company(id),
        workAdminApi.companyLicenses(id).catch((e) => { setMsg(`Licenses could not be loaded: ${e.message || 'request failed'}`); return null }),
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
  const saveAiKeys = async (id) => { try { await workAdminApi.companyAiKeys(id, aiForm[id] || {}); setAiForm((f) => ({ ...f, [id]: {} })); refreshDetail(id); setMsg('Corporate AI keys saved.') } catch (e) { setMsg(e.message) } }
  const clearAiKeys = async (id) => {
    // Clearing a company's AI keys takes their AI down, so capture a reason (logged).
    const reason = await askReason({ title: 'Clear this company\'s AI keys?', detail: 'WorkCoPilot stops running on their keys. If their AI source is "company keys", guidance is paused for them until keys are set again.', confirmLabel: 'Clear AI keys' })
    if (!reason || reason.length < 3) return
    try { await workAdminApi.companyAiKeys(id, { apiKey: '', reason }); refreshDetail(id); setMsg('AI keys cleared.') } catch (e) { setMsg(e.message) }
  }

  // Per-company web-search (Tavily) key. Independent of the AI source: when set,
  // the company's live web learning runs on their own key (their data + billing).
  const [wsForm, setWsForm] = useState({})
  const setWsField = (id, k, v) => setWsForm((f) => ({ ...f, [id]: { ...(f[id] || {}), [k]: v } }))
  const saveWebSearch = async (id) => { const key = (wsForm[id]?.apiKey || '').trim(); if (!key) return; try { await workAdminApi.companyWebSearch(id, key, 'tavily'); setWsForm((f) => ({ ...f, [id]: {} })); refreshDetail(id); setMsg('Company web-search key saved.') } catch (e) { setMsg(e.message) } }
  const clearWebSearch = async (id) => { try { await workAdminApi.companyWebSearch(id, '', 'tavily'); refreshDetail(id); setMsg('Company web-search key cleared.') } catch (e) { setMsg(e.message) } }

  // Members: add by email (SSO) or username+password, set tier, grant hours, remove.
  const [mForm, setMForm] = useState({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic', mode: 'email', free: false })
  const addMember = async (companyId) => {
    setBusy(true); setMsg('')
    try {
      if (mForm.mode === 'email') {
        if (!mForm.email.includes('@')) { setMsg('Enter a valid work email.'); setBusy(false); return }
        await workAdminApi.addCompanyMember(companyId, { email: mForm.email.trim(), displayName: mForm.displayName.trim(), companyRole: mForm.companyRole, tier: mForm.tier })
      } else {
        if (!mForm.username.trim()) { setMsg('Enter a username.'); setBusy(false); return }
        if (!mForm.email.includes('@')) { setMsg('Enter an email so the person gets a set-password link.'); setBusy(false); return }
        // Password optional - the person sets their own via the emailed link.
        await workAdminApi.createUser({ username: mForm.username.trim(), email: mForm.email.trim(), ...(mForm.password ? { password: mForm.password } : {}), companyId, companyRole: mForm.companyRole, tier: mForm.tier, free: mForm.free })
      }
      setMForm({ email: '', displayName: '', username: '', password: '', companyRole: 'member', tier: 'basic', mode: mForm.mode, free: false }); refreshDetail(companyId)
    } catch (e) { setMsg(e.message || 'Could not add the person.') } finally { setBusy(false) }
  }
  const setUserTier = async (u, companyId, tier) => { try { await workAdminApi.setTier(u.id, tier); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }
  const grantUserHours = async (u, companyId) => { const h = window.prompt(`Add how many hours for ${u.username}?`, '1'); if (h == null) return; try { await workAdminApi.grantHours(u.id, Number(h) || 0); refreshDetail(companyId); setMsg(`Added ${h} hours to ${u.username}.`) } catch (e) { setMsg(e.message) } }
  const removeMember = async (u, companyId) => { const reason = await askReason({ title: `Remove ${u.username} from the company?`, detail: 'They lose access right away.', confirmLabel: 'Confirm remove' }); if (!reason || reason.length < 3) return; try { await workAdminApi.removeCompanyMember(companyId, u.id, reason); refreshDetail(companyId) } catch (e) { setMsg(e.message) } }
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
      setSeatEdit((s) => ({ ...s, [id]: undefined })); refreshDetail(id); setMsg('Licenses updated.')
    } catch (err) { setMsg(err.message) }
  }
  const addPool = async (id) => { const h = window.prompt('Add how many hours to the company minute pool?', '10'); if (h == null) return; try { await workAdminApi.poolMinutes(id, Math.round((Number(h) || 0) * 60)); refreshDetail(id); setMsg(`Added ${h} hours to the pool.`) } catch (e) { setMsg(e.message) } }

  // Pricing overrides.
  const [priceForm, setPriceForm] = useState({})
  const savePricing = async (id) => {
    const p = priceForm[id] || {}
    const pricing = {
      plans: { ...(p.pBasic ? { basic: Number(p.pBasic) } : {}), ...(p.pAdvanced ? { advanced: Number(p.pAdvanced) } : {}), ...(p.pPremium ? { premium: Number(p.pPremium) } : {}) },
      hour: { ...(p.hBasic ? { basic: Number(p.hBasic) } : {}), ...(p.hAdvanced ? { advanced: Number(p.hAdvanced) } : {}), ...(p.hPremium ? { premium: Number(p.hPremium) } : {}) },
    }
    try { await workAdminApi.setCompanyPricing(id, pricing); refreshDetail(id); setMsg('Pricing overrides saved.') } catch (e) { setMsg(e.message) }
  }

  // Billing.
  const loadBill = async (id) => { try { setBill(await workAdminApi.companyBilling(id)) } catch (e) { setMsg(e.message) } }
  const addBillItem = async (id) => { const desc = window.prompt('Line item description (e.g. Extra 10 hours):'); if (!desc) return; const amt = window.prompt('Amount (USD):', '0'); if (amt == null) return; try { await workAdminApi.addBillingItem(id, { type: 'adjustment', description: desc, qty: 1, unitAmount: Number(amt) || 0 }); loadBill(id) } catch (e) { setMsg(e.message) } }
  const removeBillItem = async (id, itemId) => { const reason = await askReason({ title: 'Remove this billing line item?', detail: 'The line is taken off the company bill.', confirmLabel: 'Confirm remove' }); if (!reason || reason.length < 3) return; try { await workAdminApi.removeBillingItem(id, itemId, reason); loadBill(id) } catch (e) { setMsg(e.message) } }

  // Disable (reversible) or delete (hard) a whole company. Disable uses the local
  // reason prompt; delete uses the shared modal because it needs the extra
  // "also delete members" choice. Both are reason-gated + logged server-side.
  const toggleCompanyDisabled = async (co) => {
    const disabling = !co.disabled
    const reason = await askReason({
      title: disabling ? `Disable ${co.name}?` : `Re-enable ${co.name}?`,
      detail: disabling ? 'Every member is signed out and blocked from the service until you re-enable the company.' : 'Members can sign in and use the service again.',
      confirmLabel: disabling ? 'Disable company' : 'Enable company',
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

  if (state.loading) return <Loading label="Loading companies" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const P = (k, v) => setForm((f) => ({ ...f, profile: { ...f.profile, [k]: v } }))
  const T = (k, v) => setForm((f) => ({ ...f, byTier: { ...f.byTier, [k]: v.replace(/[^0-9]/g, '') } }))

  return (
    <div className="wka-panel">
      <style>{CSS}</style>
      {reasonModal}
      {delCompany ? (
        <SharedReasonModal
          title={`Delete ${delCompany.name}`}
          message="Permanently delete this company. This cannot be undone."
          confirmLabel="Delete company"
          busy={delBusy} error={delErr}
          extra={(
            <label className="wka-check" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
              <input type="checkbox" checked={delMembers} onChange={(e) => setDelMembers(e.target.checked)} />
              Also delete all member accounts (otherwise they are detached to standalone)
            </label>
          )}
          onConfirm={confirmDeleteCompany}
          onCancel={() => { if (!delBusy) { setDelCompany(null); setDelMembers(false) } }}
        />
      ) : null}
      <div className="co-head">
        <p className="desc">Onboard a company with its full profile, licenses, SSO and AI, then manage its people, hours and billing. Everything is scoped per company.</p>
        {isSuperAdmin && <button className="wka-btn primary" onClick={() => setShowNew((v) => !v)}><Plus size={15} /> New company</button>}
      </div>

      {showNew && (
        <div className="co-new">
          <div className="co-sec">Company</div>
          <div className="co-grid">
            <L label="Company name"><input className="wka-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></L>
            <L label="Plan (default tier)"><select className="wka-input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="basic">Basic</option><option value="advanced">Advanced</option><option value="premium">Premium</option></select></L>
            <L label="AI source" hint="Company = they bring their own AI keys (then required). Platform = we provide."><select className="wka-input" value={form.aiSource} onChange={(e) => setForm({ ...form, aiSource: e.target.value })}><option value="">Select…</option><option value="platform">Platform keys (we provide)</option><option value="company">Company keys (they add)</option></select></L>
          </div>
          <div className="co-sec">Branding</div>
          <div className="co-grid">
            <L label="Logo"><LogoField value={form.logo} onChange={(v) => setForm((f) => ({ ...f, logo: v }))} /></L>
            <L label="Website"><input className="wka-input" placeholder="https://example.com" value={form.profile.website} onChange={(e) => P('website', e.target.value)} /></L>
          </div>
          <div className="co-sec">Contact and address</div>
          <div className="co-grid">
            <L label="Contact person"><input className="wka-input" value={form.profile.contactPerson} onChange={(e) => P('contactPerson', e.target.value)} /></L>
            <L label="Email"><input className="wka-input" value={form.profile.email} onChange={(e) => P('email', e.target.value)} /></L>
            <L label="Billing email"><input className="wka-input" value={form.profile.billingEmail} onChange={(e) => P('billingEmail', e.target.value)} /></L>
            <L label="Phone"><input className="wka-input" value={form.profile.phone} onChange={(e) => P('phone', e.target.value)} /></L>
            <L label="Address"><input className="wka-input" value={form.profile.address} onChange={(e) => P('address', e.target.value)} /></L>
            <L label="City"><input className="wka-input" value={form.profile.city} onChange={(e) => P('city', e.target.value)} /></L>
            <L label="State / region"><input className="wka-input" value={form.profile.state} onChange={(e) => P('state', e.target.value)} /></L>
            <L label="Country"><input className="wka-input" value={form.profile.country} onChange={(e) => P('country', e.target.value)} /></L>
            <L label="Postal code"><input className="wka-input" value={form.profile.postalCode} onChange={(e) => P('postalCode', e.target.value)} /></L>
          </div>
          <div className="co-sec">Licenses</div>
          <div className="co-grid">
            <L label="Basic licenses"><input className="wka-input" value={form.byTier.basic} onChange={(e) => T('basic', e.target.value)} /></L>
            <L label="Advanced licenses"><input className="wka-input" value={form.byTier.advanced} onChange={(e) => T('advanced', e.target.value)} /></L>
            <L label="Premium licenses"><input className="wka-input" value={form.byTier.premium} onChange={(e) => T('premium', e.target.value)} /></L>
            <L label="Admin seats" hint="Separate pool. Admins do not consume user licenses. Admin seats are billed at each admin's plan tier. 0 = no limit."><input className="wka-input" value={form.adminSeats} onChange={(e) => setForm({ ...form, adminSeats: e.target.value.replace(/[^0-9]/g, '') })} /></L>
            <L label="License mode" hint="Locked = only you change the roster. Flexible = the company admin manages it."><select className="wka-input" value={form.licenseMode} onChange={(e) => setForm({ ...form, licenseMode: e.target.value })}><option value="locked">Locked (we manage)</option><option value="flexible">Flexible (company manages)</option></select></L>
            <L label="SSO provisioning" hint="Explicit = only people you add by email can sign in. Auto = anyone in the domain is created on first sign-in."><select className="wka-input" value={form.ssoProvisioning} onChange={(e) => setForm({ ...form, ssoProvisioning: e.target.value })}><option value="explicit">Explicit (invite-only)</option><option value="auto">Auto (open to domain)</option></select></L>
          </div>
          <div className="co-foot">
            <label className="co-chk"><input type="checkbox" checked={form.scrub} onChange={(e) => setForm({ ...form, scrub: e.target.checked })} /> Data redaction on by default</label>
            <span className="co-total">Total user licenses: <b>{seatTotal}</b>{seatTotal === 0 ? <span className="co-dim" style={{ marginLeft: 8 }}>(none entered = no user license limit; admin seats {Number(form.adminSeats) > 0 ? form.adminSeats : 'no limit'})</span> : null}</span>
            <button className="wka-btn primary" disabled={busy} onClick={createCompany}>{busy ? <Loader2 size={14} className="spin" /> : 'Create company'}</button>
          </div>
        </div>
      )}
      {msg && <div className="co-msg">{msg}</div>}

      {state.companies.length === 0 ? <EmptyState title="No companies yet" detail="Create one to onboard a company admin and users." />
        : (
          <div className="co-list">
            {state.companies.map((c) => (
              <div key={c.id} className="co-row">
                <button className="co-row-head" onClick={() => openCompany(c.id)}>
                  {openId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="co-ic"><Building2 size={16} /></span>
                  <span className="co-name">{c.name}</span>
                  <span className={`wka-badge ${c.plan}`}>{c.plan}</span>
                  {c.disabled ? <span className="wka-badge" style={{ background: '#f6dcd9', color: '#c0392b' }}>Disabled</span> : null}
                  <span className="co-meta">{c.memberCount != null ? c.memberCount : c.userCount} users &middot; {c.adminCount} admin{c.aiReady === false ? <span className="co-warn"><AlertTriangle size={12} /> AI not ready</span> : null}</span>
                  <span className={`co-scrub ${c.scrub ? 'on' : ''}`}>{c.scrub ? <><ShieldCheck size={13} /> Redaction on</> : <><Shield size={13} /> Redaction off</>}</span>
                </button>
                {openId === c.id && (
                  <div className="co-detail">
                    {!detail ? <Loading label="Loading company" /> : (
                      <>
                        <div className="co-detail-top">
                          <div>Plan <b>{detail.company.plan}</b> &middot; Mode <b>{detail.company.licenseMode}</b> &middot; SSO <b>{detail.company.ssoProvisioning === 'auto' ? 'open domain' : 'invite-only'}</b> {detail.company.sso && detail.company.sso.connected ? <>({detail.company.sso.provider})</> : ''} &middot; AI <b style={{ color: detail.company.aiReady ? 'var(--wka-emerald)' : 'var(--wka-amber)' }}>{detail.company.aiReady ? 'ready' : 'not ready'}</b></div>
                          {isSuperAdmin && (
                            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                              <button className="wka-btn sm" onClick={() => toggleCompanyScrub(c)}>{c.scrub ? 'Turn redaction off' : 'Turn redaction on'}</button>
                              <button className="wka-btn sm" onClick={() => toggleCompanyDisabled(detail.company)} style={detail.company.disabled ? { color: 'var(--wka-emerald)' } : undefined}>
                                {detail.company.disabled ? <><ShieldCheck size={13} /> Enable company</> : <><ShieldOff size={13} /> Disable company</>}
                              </button>
                              <button className="wka-btn sm" style={{ color: '#c0392b' }} onClick={() => { setDelErr(null); setDelMembers(false); setDelCompany(detail.company) }}>
                                <Trash2 size={13} /> Delete company
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
                            <label className="co-inline">AI source
                              <select className="wka-input" style={{ width: 'auto' }} value={detail.company.aiSource || ''} onChange={(e) => patchCompany(c.id, { aiSource: e.target.value || null })}>
                                <option value="">Select…</option><option value="platform">Platform keys</option><option value="company">Company keys</option>
                              </select>
                            </label>
                            {detail.company.aiReady === false && <span className="co-amber"><AlertTriangle size={13} /> {detail.company.aiReason}</span>}
                            <button className={`co-toggle ${detail.company.imageGen ? 'on' : ''}`} onClick={() => patchCompany(c.id, { imageGen: !detail.company.imageGen })}>Image gen: {detail.company.imageGen ? 'On' : 'Off'}</button>
                          </div>
                        )}

                        {isSuperAdmin && detail.company.aiSource === 'company' && (
                          <div className="co-block">
                            <div className="co-block-t">Corporate AI keys {detail.company.companyAi ? <span className="co-dim">· {detail.company.companyAi.providerId} · {detail.company.companyAi.keyMasked}</span> : <span className="co-amber">· none set</span>}</div>
                            <div className="co-inline-wrap">
                              <input className="wka-input" placeholder="provider (gemini/openai/groq)" value={(aiForm[c.id]?.providerId) || ''} onChange={(e) => setAiField(c.id, 'providerId', e.target.value)} style={{ width: 190 }} />
                              <input className="wka-input" type="password" autoComplete="new-password" placeholder="API key" value={(aiForm[c.id]?.apiKey) || ''} onChange={(e) => setAiField(c.id, 'apiKey', e.target.value)} style={{ width: 210 }} />
                              <input className="wka-input" placeholder="chat model" value={(aiForm[c.id]?.chatModel) || ''} onChange={(e) => setAiField(c.id, 'chatModel', e.target.value)} style={{ width: 140 }} />
                              <input className="wka-input" placeholder="vision model" value={(aiForm[c.id]?.visionModel) || ''} onChange={(e) => setAiField(c.id, 'visionModel', e.target.value)} style={{ width: 140 }} />
                              <button className="wka-btn sm" onClick={() => saveAiKeys(c.id)}>Save keys</button>
                              {detail.company.companyAi && <button className="wka-btn sm ghost" onClick={() => clearAiKeys(c.id)}>Clear</button>}
                            </div>
                          </div>
                        )}

                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t">Web search key {detail.company.webSearchConfigured ? <span className="co-dim">· {(detail.company.webSearch && detail.company.webSearch.provider) || 'tavily'} · {detail.company.webSearch && detail.company.webSearch.keyMasked}</span> : <span className="co-amber">· none set</span>}</div>
                            <div className="co-dim" style={{ marginBottom: 2 }}>When set, this company&rsquo;s live web learning runs on their own key (their data boundary and billing).</div>
                            <div className="co-inline-wrap">
                              <input className="wka-input" type="password" autoComplete="new-password" placeholder="Tavily API key" value={(wsForm[c.id]?.apiKey) || ''} onChange={(e) => setWsField(c.id, 'apiKey', e.target.value)} style={{ width: 240 }} />
                              <button className="wka-btn sm" onClick={() => saveWebSearch(c.id)}>Save key</button>
                              {detail.company.webSearchConfigured && <button className="wka-btn sm ghost" onClick={() => clearWebSearch(c.id)}>Clear</button>}
                            </div>
                          </div>
                        )}

                        {/* Licenses */}
                        {isSuperAdmin && lic && (
                          <div className="co-block">
                            <div className="co-block-t">Licenses {lic.seatsByTier ? '(per tier)' : '(total pool)'}</div>
                            {lic.tierUsage ? (
                              <div className="co-tiers">
                                {['basic', 'advanced', 'premium'].map((t) => {
                                  const tu = lic.tierUsage[t]; const ed = seatEdit[c.id]
                                  return <div key={t} className="co-tier"><span className="co-tier-n">{t}</span>{ed ? <input className="wka-input co-seat-in" value={ed[t]} onChange={(e) => setSeatEdit((s) => ({ ...s, [c.id]: { ...s[c.id], [t]: e.target.value.replace(/[^0-9]/g, '') } }))} /> : <b>{tu.used} / {tu.allocated}</b>}<span className="co-dim">{ed ? 'allocated' : `${tu.left} free`}</span></div>
                                })}
                                <div className="co-tier"><span className="co-tier-n">admin</span>{seatEdit[c.id] ? <input className="wka-input co-seat-in" value={seatEdit[c.id].adminSeats} onChange={(e) => setSeatEdit((s) => ({ ...s, [c.id]: { ...s[c.id], adminSeats: e.target.value.replace(/[^0-9]/g, '') } }))} /> : <b>{lic.adminSeatsUsed} / {lic.adminSeats}</b>}<span className="co-dim">seats</span></div>
                              </div>
                            ) : <div className="co-dim">Total user seats: {lic.userSeatsUsed} of {lic.userSeats || 'no limit'} · admin {lic.adminSeatsUsed} of {lic.adminSeats}</div>}
                            <div className="co-inline-wrap">
                              {seatEdit[c.id]
                                ? <><button className="wka-btn sm primary" onClick={() => saveSeats(c.id)}>Save licenses</button><button className="wka-btn sm ghost" onClick={() => setSeatEdit((s) => ({ ...s, [c.id]: undefined }))}>Cancel</button></>
                                : <button className="wka-btn sm ghost" onClick={() => setSeatEdit((s) => ({ ...s, [c.id]: { basic: (lic.seatsByTier?.basic) || 0, advanced: (lic.seatsByTier?.advanced) || 0, premium: (lic.seatsByTier?.premium) || 0, adminSeats: lic.adminSeats } }))}>Edit licenses</button>}
                              <select className="wka-input" style={{ width: 'auto' }} value={detail.company.licenseMode} onChange={(e) => patchCompany(c.id, { licenseMode: e.target.value })}><option value="locked">Locked</option><option value="flexible">Flexible</option></select>
                              <select className="wka-input" style={{ width: 'auto' }} value={detail.company.ssoProvisioning} onChange={(e) => patchCompany(c.id, { ssoProvisioning: e.target.value })}><option value="explicit">Invite-only</option><option value="auto">Open domain</option></select>
                              <span className="co-inline"><Clock size={13} /> Pool: <b>{fmtMins(lic.poolSeconds)}</b> <button className="wka-btn sm ghost" onClick={() => addPool(c.id)}>Add hours</button></span>
                            </div>
                          </div>
                        )}

                        {/* People */}
                        <div className="co-block-t">People</div>
                        <table className="wka-table co-users">
                          <thead><tr><th>Person</th><th>Role</th><th>Plan</th><th>Used today</th><th>Redaction</th><th></th></tr></thead>
                          <tbody>
                            {detail.users.length === 0 && <tr><td colSpan={6} className="co-empty">No people yet.</td></tr>}
                            {detail.users.map((u) => {
                              const mu = lic && (lic.members || []).find((m) => String(m.id) === String(u.id))
                              return (
                                <tr key={u.id}>
                                  <td>{u.displayName || u.username}<div className="co-dim">{u.ssoEmail || u.username}</div></td>
                                  <td>{ROLE_CHIP[u.companyRole] ? <span className="wka-chip ok">{ROLE_CHIP[u.companyRole]}</span> : 'Member'}</td>
                                  <td><select className="wka-input" style={{ width: 'auto', padding: '3px 6px' }} value={u.tier || 'basic'} onChange={(e) => setUserTier(u, c.id, e.target.value)}><option value="basic">Basic</option><option value="advanced">Advanced</option><option value="premium">Premium</option></select></td>
                                  <td className="co-dim">{mu ? `${fmtMins(mu.usage.usedSeconds)} / ${fmtMins(mu.usage.dailySeconds)}` : '-'}</td>
                                  <td>{isSuperAdmin ? <button className={`co-toggle ${u.scrub ? 'on' : ''}`} onClick={() => toggleUserScrub(u, c.id)}>{u.scrub ? 'On' : 'Off'}</button> : (u.scrub ? 'On' : 'Off')}</td>
                                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <button className="wka-btn sm ghost" title="Add hours" onClick={() => grantUserHours(u, c.id)}><Clock size={12} /></button>
                                    <button className="wka-btn sm ghost" title="Free access" onClick={() => toggleUserFree(u, c.id)} style={{ color: isFree(u) ? 'var(--wka-emerald)' : undefined }}>{isFree(u) ? 'Free' : '$'}</button>
                                    <button className="wka-btn sm ghost" title="Remove" onClick={() => removeMember(u, c.id)}><Trash2 size={12} /></button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        <div className="co-adduser">
                          <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
                            <button className={`wka-btn sm${mForm.mode === 'email' ? ' primary' : ''}`} onClick={() => setMForm({ ...mForm, mode: 'email' })}><Mail size={12} /> Email</button>
                            <button className={`wka-btn sm${mForm.mode === 'password' ? ' primary' : ''}`} onClick={() => setMForm({ ...mForm, mode: 'password' })}><KeyRound size={12} /> Password</button>
                          </div>
                          {mForm.mode === 'email'
                            ? <><input className="wka-input" placeholder="work email" value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /><input className="wka-input" placeholder="name (optional)" value={mForm.displayName} onChange={(e) => setMForm({ ...mForm, displayName: e.target.value })} /></>
                            : <><input className="wka-input" placeholder="username" value={mForm.username} onChange={(e) => setMForm({ ...mForm, username: e.target.value })} /><input className="wka-input" type="email" placeholder="email (sends set-password link)" value={mForm.email} onChange={(e) => setMForm({ ...mForm, email: e.target.value })} /><input className="wka-input" type="password" placeholder="password (optional)" value={mForm.password} onChange={(e) => setMForm({ ...mForm, password: e.target.value })} /></>}
                          <select className="wka-input" value={mForm.companyRole} onChange={(e) => setMForm({ ...mForm, companyRole: e.target.value })}>{roleOptions()}</select>
                          <select className="wka-input" value={mForm.tier} onChange={(e) => setMForm({ ...mForm, tier: e.target.value })}><option value="basic">Basic</option><option value="advanced">Advanced</option><option value="premium">Premium</option></select>
                          <button className="wka-btn primary" disabled={busy} onClick={() => addMember(c.id)}>{busy ? <Loader2 size={14} className="spin" /> : <><UserPlus size={13} /> Add</>}</button>
                        </div>

                        {/* Pricing */}
                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t">Price overrides <span className="co-dim">· blank keeps the global price</span></div>
                            <div className="co-inline-wrap">
                              <span className="co-dim">Plan/mo:</span>
                              {['Basic', 'Advanced', 'Premium'].map((t) => <input key={t} className="wka-input co-price-in" placeholder={t} value={(priceForm[c.id]?.[`p${t}`]) || ''} onChange={(e) => setPriceForm((f) => ({ ...f, [c.id]: { ...f[c.id], [`p${t}`]: e.target.value.replace(/[^0-9.]/g, '') } }))} />)}
                              <span className="co-dim">Hour:</span>
                              {['Basic', 'Advanced', 'Premium'].map((t) => <input key={t} className="wka-input co-price-in" placeholder={t} value={(priceForm[c.id]?.[`h${t}`]) || ''} onChange={(e) => setPriceForm((f) => ({ ...f, [c.id]: { ...f[c.id], [`h${t}`]: e.target.value.replace(/[^0-9.]/g, '') } }))} />)}
                              <button className="wka-btn sm" onClick={() => savePricing(c.id)}>Save pricing</button>
                            </div>
                            {detail.company.pricing && <div className="co-dim">Current: plans {money(detail.company.pricing.plans.basic)}/{money(detail.company.pricing.plans.advanced)}/{money(detail.company.pricing.plans.premium)} · hour {money(detail.company.pricing.hour.basic)}/{money(detail.company.pricing.hour.advanced)}/{money(detail.company.pricing.hour.premium)}</div>}
                          </div>
                        )}

                        {/* Billing */}
                        {isSuperAdmin && (
                          <div className="co-block">
                            <div className="co-block-t"><Receipt size={14} /> Billing
                              <button className="wka-btn sm ghost" style={{ marginLeft: 8 }} onClick={() => loadBill(c.id)}>Load statement</button>
                              {bill && <a className="wka-btn sm ghost" href={workAdminApi.invoiceUrl(c.id)} target="_blank" rel="noreferrer">Download invoice PDF</a>}
                              {bill && <button className="wka-btn sm ghost" onClick={() => addBillItem(c.id)}>Add line item</button>}
                            </div>
                            {bill && (
                              <table className="wka-table">
                                <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
                                <tbody>
                                  {[...(bill.seatLines || []), ...(bill.ledger || [])].map((l, i) => (
                                    <tr key={l.id || i}><td>{l.description || l.type}</td><td style={{ textAlign: 'right' }}>{l.qty}</td><td style={{ textAlign: 'right' }}>{money(l.amount)}</td><td style={{ textAlign: 'right' }}>{l.id && l.id.startsWith('bi') ? <button className="wka-btn sm ghost" onClick={() => removeBillItem(c.id, l.id)}><Trash2 size={11} /></button> : null}</td></tr>
                                  ))}
                                </tbody>
                                <tfoot><tr><td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(bill.total)}</td><td /></tr></tfoot>
                              </table>
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
  )
}

function L({ label, hint, children }) {
  return <label className="co-l"><span>{label}{hint ? <span className="co-l-h" title={hint}> ?</span> : null}</span>{children}</label>
}

const CSS = `
.co-logo{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.co-logo-prev{width:96px;height:64px;border:1px dashed var(--wka-line);border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--wka-panel);overflow:hidden;font-size:12px}
.co-logo-prev img{max-width:100%;max-height:100%;object-fit:contain}
.co-logo-act{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.co-logo-act label.wka-btn{cursor:pointer}
.co-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
.co-new{margin-bottom:14px;padding:16px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-bg-2)}
.co-sec{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--wka-faint);margin:6px 0 8px}
.co-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 14px;margin-bottom:12px}
.co-l{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--wka-muted)}
.co-l-h{color:var(--wka-cyan);cursor:help;font-weight:700}
.co-foot{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--wka-line)}
.co-total{font-size:13px;color:var(--wka-muted)}
.co-chk{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--wka-muted)}
.co-msg{color:var(--wka-red);font-size:13px;margin-bottom:12px}
.co-list{display:flex;flex-direction:column;gap:10px}
.co-row{border:1px solid var(--wka-line);border-radius:12px;overflow:hidden;background:var(--wka-panel)}
.co-row-head{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:none;border:none;cursor:pointer;font:inherit;color:var(--wka-text);text-align:left}
.co-row-head:hover{background:var(--wka-panel-2)}
.co-ic{display:inline-flex;color:var(--wka-cyan)}
.co-name{font-weight:700;font-size:15px}
.co-meta{color:var(--wka-muted);font-size:12.5px;margin-left:auto;display:inline-flex;align-items:center;gap:8px}
.co-warn{display:inline-flex;align-items:center;gap:4px;color:var(--wka-amber);font-weight:700}
.co-scrub{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:3px 10px}
.co-scrub.on{color:var(--wka-emerald);border-color:rgba(10,157,102,.4);background:rgba(10,157,102,.08)}
.co-detail{border-top:1px solid var(--wka-line);padding:16px;background:var(--wka-bg-2)}
.co-detail-top{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:var(--wka-muted);margin-bottom:12px}
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
.co-toggle{font:inherit;font-size:12px;font-weight:700;border-radius:7px;padding:4px 12px;cursor:pointer;border:1px solid var(--wka-line-2);background:var(--wka-panel);color:var(--wka-muted)}
.co-toggle.on{color:var(--wka-emerald);border-color:rgba(10,157,102,.4);background:rgba(10,157,102,.1)}
.co-adduser{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--wka-line)}
.co-copy{display:inline-flex;align-items:center;gap:7px}
.co-copy code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--wka-text);word-break:break-all}
.spin{animation:co-spin 1s linear infinite}@keyframes co-spin{to{transform:rotate(360deg)}}
.co-sso{margin-top:14px;border-top:1px solid var(--wka-line);padding-top:12px}
.co-sso-head{width:100%;display:flex;align-items:center;gap:9px;background:none;border:none;cursor:pointer;font:inherit;font-weight:700;font-size:13.5px;color:var(--wka-text);padding:4px 0}
.co-sso-head svg{color:var(--wka-cyan)}
.co-sso-state{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:3px 10px}
.co-sso-state.on{color:var(--wka-emerald);border-color:rgba(10,157,102,.4);background:rgba(10,157,102,.08)}
.co-sso-body{display:flex;flex-direction:column;gap:9px;padding:14px;margin-top:10px;border:1px solid var(--wka-line);border-radius:12px;background:var(--wka-panel)}
.co-sso-row{display:flex;align-items:center;gap:10px}
.co-sso-row label{width:120px;flex:none;font-size:12.5px;color:var(--wka-muted)}
.co-sso-row .wka-input{flex:1}
.co-sso-hint{font-size:11.5px;color:var(--wka-faint);margin:-4px 0 2px 130px}
.co-sso-redirect{font-size:12px;color:var(--wka-muted);background:var(--wka-bg-2);border:1px solid var(--wka-line);border-radius:9px;padding:9px 11px}
.co-sso-ok{display:inline-flex;align-items:center;gap:6px;color:var(--wka-emerald);font-size:12.5px;font-weight:700}
@media(max-width:720px){.co-meta{margin-left:0;width:100%}.co-adduser{flex-direction:column;align-items:stretch}.co-sso-row{flex-direction:column;align-items:stretch}.co-sso-row label{width:auto}.co-sso-hint{margin-left:0}}
`
