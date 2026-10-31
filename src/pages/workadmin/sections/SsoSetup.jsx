// Company console: single sign-on setup. One screen, three guided tabs:
//   OpenID Connect  the existing OIDC connection (sso.js)
//   SAML 2.0        service provider values to copy, IdP metadata or manual
//                   entry, certificates with expiry (saml_sso.js)
//   SCIM            the base URL and company-scoped provisioning tokens (scim.js)
// plus a test sign-in that runs the real flow and reports what WOULD happen
// (nobody is signed in, nothing is created). Every value the admin has to
// paste somewhere has a copy button; every string comes from i18n
// (ssoSetup.* and the existing companyAdmin.sso.*). Brand names come from the
// one identity provider catalog (server/idp_catalog.js).
import React, { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Info, KeyRound, Lock, ShieldCheck, Trash2, Play, RefreshCw, AlertTriangle, Users, FileCode2 } from 'lucide-react'
import { api } from '../../../api.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, Spinning, SavedTag, RecRow, EmptyState, useReasonModal } from './_shared.jsx'
import { OIDC_PROVIDERS, SAML_PROVIDERS, IDP_LABELS, oidcIssuerExample } from '../../../shared/oidc_providers.js'
import { useEditionView } from '../../../edition/useCaps.js'
import ScimGroupRoles from './ScimGroupRoles.jsx'   // SCIM tab: group -> role / grant mappings

const TABS = ['oidc', 'saml', 'scim']
const fmtWhen = (s) => { try { return new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
const fmtDay = (s) => { try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' } }

function CopyValue({ label, value, testid }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked: the value stays selectable */ } }
  return (
    <div className="sso-copy" data-testid={testid}>
      <div className="sso-copy-l">{label}</div>
      <div className="sso-copy-v">
        <code className="wka-mono">{value}</code>
        <button type="button" className="wka-btn sm ghost" onClick={copy} aria-label={t('ssoSetup.copyAria', { label })}>{copied ? <Check size={13} /> : <Copy size={13} />} <span>{copied ? t('companyAdmin.common.copied') : t('companyAdmin.common.copy')}</span></button>
      </div>
    </div>
  )
}

function Steps({ prefix }) {
  const t = useT()
  return (
    <ol className="sso-steps">
      {['step1', 'step2', 'step3', 'step4'].map((k, i) => <li key={k}><span className="sso-n">{i + 1}</span><span>{t(`${prefix}.${k}`)}</span></li>)}
    </ol>
  )
}

export default function SsoSetup({ company }) {
  const t = useT()
  // The "not the social buttons" note only makes sense where social buttons exist.
  const { socialLogin } = useEditionView()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [tab, setTab] = useState(null)
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: !s.data, error: null }))
    return api.workCompanySsoOverview()
      .then((data) => {
        setState({ loading: false, error: null, data })
        setTab((cur) => cur || (data.saml && data.saml.status && data.saml.status.connected ? 'saml' : (data.oidc && data.oidc.status && data.oidc.status.connected ? 'oidc' : 'saml')))
      })
      .catch((error) => setState({ loading: false, error, data: null }))
  }, [])
  useEffect(() => { load() }, [load])

  if (state.loading) return <Loading label={t('companyAdmin.sso.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  const d = state.data
  const oidcOn = !!(d.oidc.status && d.oidc.status.connected)
  const samlOn = !!(d.saml.status && d.saml.status.connected)
  const scimOn = (d.scim.tokens || []).some((x) => x.status === 'active')
  const inviteOnly = d.provisioning !== 'auto'
  const tabState = { oidc: oidcOn, saml: samlOn, scim: scimOn }

  return (
    <div className="sso" data-testid="sso-setup">
      <style>{SSO_CSS}</style>
      {socialLogin ? <div className="wka-note"><Info size={14} /> <span style={{ minWidth: 0 }}>{t('companyAdmin.sso.notSocial')}</span></div> : null}
      <div className={`wka-note${d.ssoRequired ? '' : ' sso-quiet'}`} data-testid="sso-required-note"><Lock size={14} /> <span style={{ minWidth: 0 }}>{d.ssoRequired ? t('ssoSetup.status.requiredHelp') : t('ssoSetup.status.optional')}</span></div>
      <div className="wka-note" style={{ color: inviteOnly ? 'var(--wka-amber)' : undefined }}><Users size={14} /> <span style={{ minWidth: 0 }}>{inviteOnly ? t.rich('companyAdmin.sso.inviteNote') : t('ssoSetup.autoNote')}</span></div>

      <div className="sso-tabs" role="tablist" aria-label={t('ssoSetup.tabsAria')}>
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" id={`sso-tab-${id}`} aria-selected={tab === id} aria-controls={`sso-panel-${id}`} className={`sso-tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} data-testid={`sso-tab-${id}`}>
            <span className="sso-tab-l">{t(`ssoSetup.tabs.${id}`)}</span>
            <span className={`sso-pill${tabState[id] ? ' ok' : ''}`}>{tabState[id] ? <><Check size={11} /> {t('ssoSetup.status.connected')}</> : t('ssoSetup.status.notConnected')}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`sso-panel-${tab}`} aria-labelledby={`sso-tab-${tab}`}>
        {tab === 'oidc' ? <OidcPanel data={d} onSaved={load} /> : null}
        {tab === 'saml' ? <SamlPanel data={d} onSaved={load} /> : null}
        {tab === 'scim' ? <ScimPanel data={d} onChanged={load} /> : null}
        {tab === 'scim' ? <ScimGroupRoles /> : null}
        {tab === 'oidc' || tab === 'saml' ? <TestCard protocol={tab} connected={tab === 'oidc' ? oidcOn : samlOn} companyId={d.companyId} last={d.lastTest} onRefresh={load} /> : null}
      </div>
    </div>
  )
}

// ---- OpenID Connect ----------------------------------------------------------
function OidcPanel({ data, onSaved }) {
  const t = useT()
  const s = data.oidc.status
  const connected = !!(s && s.connected)
  const fromStatus = () => ({ provider: (s && s.provider) || 'google', issuer: (s && s.issuer) || '', clientId: (s && s.clientId) || '', clientSecret: '', domain: (s && s.domain) || '' })
  const [form, setForm] = useState(fromStatus)
  const [editing, setEditing] = useState(!connected)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const save = async () => {
    setBusy(true); setErr(null)
    try { await api.workCompanySetSso(form); setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 2500); onSaved() }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel">
      <h2 className="sso-h"><KeyRound size={16} /> {t('ssoSetup.oidc.title')}</h2>
      <Steps prefix="ssoSetup.oidc" />
      <div className="sso-sp">
        <div className="sso-sp-h">{t('ssoSetup.copyHint')}</div>
        <CopyValue label={t('ssoSetup.oidc.redirectUri')} value={data.oidc.redirectUri} testid="sso-oidc-redirect" />
      </div>
      {!editing ? (
        <>
          <div className="wka-record">
            <RecRow label={t('companyAdmin.sso.provider')} value={IDP_LABELS[s && s.provider] || (s && s.provider) || '-'} />
            <RecRow label={t('companyAdmin.sso.emailDomain')} value={(s && s.domain) || '-'} />
            <RecRow label={t('companyAdmin.sso.issuerUrl')} value={(s && s.issuer) || '-'} />
            <RecRow label={t('companyAdmin.sso.clientId')} value={(s && s.clientId) || '-'} />
            <RecRow label={t('companyAdmin.sso.clientSecret')} value={s && s.hasSecret ? t('companyAdmin.sso.secretSet') : t('companyAdmin.sso.secretNotSet')} />
          </div>
          <div className="sso-actions">
            <button type="button" className="wka-btn" onClick={() => { setForm(fromStatus()); setEditing(true) }}>{t('ssoSetup.edit')}</button>
            <SavedTag show={saved} />
          </div>
        </>
      ) : (
        <>
          <div className="wka-formgrid">
            <div className="wka-field"><label htmlFor="oidc-provider">{t('companyAdmin.sso.provider')}</label>
              <select id="oidc-provider" className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                {OIDC_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="wka-field"><label htmlFor="oidc-domain">{t('companyAdmin.sso.emailDomain')}</label><input id="oidc-domain" className="wka-input" value={form.domain} placeholder="acme.com" onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
            <div className="wka-field"><label htmlFor="oidc-issuer">{t('companyAdmin.sso.issuerUrl')}</label><input id="oidc-issuer" className="wka-input" value={form.issuer} placeholder={oidcIssuerExample(form.provider)} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
            <div className="wka-field"><label htmlFor="oidc-client">{t('companyAdmin.sso.clientId')}</label><input id="oidc-client" className="wka-input" value={form.clientId} placeholder={t('companyAdmin.sso.fromProvider')} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></div>
            <div className="wka-field"><label htmlFor="oidc-secret">{t('companyAdmin.sso.clientSecret')}</label><input id="oidc-secret" className="wka-input" type="password" autoComplete="new-password" value={form.clientSecret} placeholder={connected ? t('companyAdmin.sso.leaveBlankKeep') : t('companyAdmin.sso.fromProvider')} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></div>
          </div>
          <div className="sso-actions">
            <button type="button" className="wka-btn primary" disabled={busy} onClick={save}>{busy ? <Spinning /> : <ShieldCheck size={14} />} {t('companyAdmin.sso.save')}</button>
            {connected ? <button type="button" className="wka-btn ghost" disabled={busy} onClick={() => setEditing(false)}>{t('companyAdmin.common.cancel')}</button> : null}
          </div>
          {err ? <div style={{ marginTop: 12 }}><ErrorBox error={err} /></div> : null}
        </>
      )}
    </div>
  )
}

// ---- SAML 2.0 ------------------------------------------------------------------
function SamlPanel({ data, onSaved }) {
  const t = useT()
  const s = data.saml.status
  const sp = data.saml.sp
  const connected = !!(s && s.connected)
  const [mode, setMode] = useState('metadata')
  const [form, setForm] = useState({ provider: (s && s.provider) || 'saml', domain: (s && s.domain) || '', metadataXml: '', idpEntityId: (s && s.idpEntityId) || '', idpSsoUrl: (s && s.idpSsoUrl) || '', idpCert: '', emailAttribute: (s && s.emailAttribute) || '', nameAttribute: (s && s.nameAttribute) || '' })
  const [editing, setEditing] = useState(!connected)
  const [parsed, setParsed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const [askReason, reasonModal] = useReasonModal()
  const read = async () => {
    setBusy(true); setErr(null); setParsed(null)
    try { setParsed(await api.workCompanySamlParse({ metadataXml: form.metadataXml })) } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const save = async () => {
    setBusy(true); setErr(null)
    const body = { provider: form.provider, domain: form.domain, emailAttribute: form.emailAttribute, nameAttribute: form.nameAttribute }
    if (mode === 'metadata' && form.metadataXml.trim()) body.metadataXml = form.metadataXml
    else Object.assign(body, { idpEntityId: form.idpEntityId, idpSsoUrl: form.idpSsoUrl, idpCert: form.idpCert })
    try { await api.workCompanySetSaml(body); setSaved(true); setEditing(false); setParsed(null); setForm((f) => ({ ...f, metadataXml: '', idpCert: '' })); setTimeout(() => setSaved(false), 2500); onSaved() }
    catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const remove = async () => {
    const reason = await askReason({ title: t('ssoSetup.saml.remove'), detail: t('ssoSetup.saml.removeConfirm'), confirmLabel: t('ssoSetup.saml.remove') })
    if (!reason) return
    setBusy(true); setErr(null)
    try { await api.workCompanyClearSaml(); onSaved() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <div className="wka-panel">
      {reasonModal}
      <h2 className="sso-h"><FileCode2 size={16} /> {t('ssoSetup.saml.title')}</h2>
      <Steps prefix="ssoSetup.saml" />
      <div className="sso-sp" data-testid="sso-saml-sp">
        <div className="sso-sp-h">{t('ssoSetup.copyHint')}</div>
        <CopyValue label={t('ssoSetup.saml.acsUrl')} value={sp.acsUrl} testid="sso-saml-acs" />
        <CopyValue label={t('ssoSetup.saml.entityId')} value={sp.entityId} testid="sso-saml-entity" />
        <CopyValue label={t('ssoSetup.saml.metadataUrl')} value={sp.metadataUrl} />
        <CopyValue label={t('ssoSetup.saml.loginUrl')} value={sp.loginUrl} />
        <div className="sso-kv"><span>{t('ssoSetup.saml.nameId')}</span><b>{t('ssoSetup.saml.nameIdValue')}</b></div>
        <p className="sso-fine">{t('ssoSetup.saml.attrsDesc')}</p>
        <p className="sso-fine">{t('ssoSetup.saml.signed')}</p>
      </div>
      <h3 className="sso-h3">{t('ssoSetup.saml.idpTitle')}</h3>
      {!editing && s ? (
        <>
          <div className="wka-record">
            <RecRow label={t('companyAdmin.sso.provider')} value={IDP_LABELS[s.provider] || s.provider} />
            <RecRow label={t('companyAdmin.sso.emailDomain')} value={s.domain || '-'} />
            <RecRow label={t('ssoSetup.saml.idpEntityId')} value={s.idpEntityId} />
            <RecRow label={t('ssoSetup.saml.idpSsoUrl')} value={s.idpSsoUrl} />
            {(s.certs || []).map((c, i) => <RecRow key={c.fingerprint} label={`${t('ssoSetup.saml.cert')} ${i + 1}`} value={<span className={c.expired ? 'sso-bad' : ''}>{c.expired ? t('ssoSetup.saml.certExpired', { date: fmtDay(c.notAfter) }) : t('ssoSetup.saml.certExpires', { date: fmtDay(c.notAfter) })}</span>} />)}
          </div>
          <div className="sso-actions">
            <button type="button" className="wka-btn" onClick={() => setEditing(true)}>{t('ssoSetup.edit')}</button>
            <button type="button" className="wka-btn ghost danger" disabled={busy} onClick={remove}><Trash2 size={14} /> {t('ssoSetup.saml.remove')}</button>
            <SavedTag show={saved} />
          </div>
        </>
      ) : (
        <>
          <div className="sso-seg" role="radiogroup" aria-label={t('ssoSetup.saml.idpTitle')}>
            {['metadata', 'manual'].map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} className={`sso-seg-b${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{t(`ssoSetup.saml.mode.${m}`)}</button>)}
          </div>
          <div className="wka-formgrid">
            <div className="wka-field"><label htmlFor="saml-provider">{t('companyAdmin.sso.provider')}</label>
              <select id="saml-provider" className="wka-select" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                {SAML_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="wka-field"><label htmlFor="saml-domain">{t('companyAdmin.sso.emailDomain')}</label><input id="saml-domain" className="wka-input" value={form.domain} placeholder="acme.com" onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          </div>
          {mode === 'metadata' ? (
            <div className="wka-field sso-wide"><label htmlFor="saml-md">{t('ssoSetup.saml.metadataXml')}</label>
              <textarea id="saml-md" className="wka-input sso-ta" rows={6} spellCheck={false} value={form.metadataXml} onChange={(e) => { setForm({ ...form, metadataXml: e.target.value }); setParsed(null) }} data-testid="saml-metadata" />
              <div className="sso-hint">{t('ssoSetup.saml.metadataHelp')}</div>
              <div><button type="button" className="wka-btn sm" disabled={busy || !form.metadataXml.trim()} onClick={read}>{t('ssoSetup.saml.read')}</button></div>
              {parsed ? (
                <div className="sso-found" data-testid="saml-parsed">
                  <div><Check size={13} /> {t('ssoSetup.saml.found', { entity: parsed.idpEntityId })}</div>
                  <div className="sso-dim">{parsed.idpSsoUrl}</div>
                  {(parsed.certs || []).map((c) => <div key={c.fingerprint} className={c.expired ? 'sso-bad' : 'sso-dim'}>{c.expired ? t('ssoSetup.saml.certExpired', { date: fmtDay(c.notAfter) }) : t('ssoSetup.saml.certExpires', { date: fmtDay(c.notAfter) })}</div>)}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="wka-formgrid">
              <div className="wka-field"><label htmlFor="saml-entity">{t('ssoSetup.saml.idpEntityId')}</label><input id="saml-entity" className="wka-input" value={form.idpEntityId} onChange={(e) => setForm({ ...form, idpEntityId: e.target.value })} /></div>
              <div className="wka-field"><label htmlFor="saml-sso">{t('ssoSetup.saml.idpSsoUrl')}</label><input id="saml-sso" className="wka-input" value={form.idpSsoUrl} onChange={(e) => setForm({ ...form, idpSsoUrl: e.target.value })} /></div>
              <div className="wka-field sso-wide"><label htmlFor="saml-cert">{t('ssoSetup.saml.idpCert')}</label>
                <textarea id="saml-cert" className="wka-input sso-ta" rows={5} spellCheck={false} value={form.idpCert} placeholder="-----BEGIN CERTIFICATE-----" onChange={(e) => setForm({ ...form, idpCert: e.target.value })} />
                <div className="sso-hint">{s && (s.certs || []).length ? t('ssoSetup.saml.certsKept', { n: s.certs.length }) : t('ssoSetup.saml.idpCertHelp')}</div>
              </div>
            </div>
          )}
          <div className="wka-formgrid">
            <div className="wka-field"><label htmlFor="saml-email-attr">{t('ssoSetup.saml.emailAttribute')}</label><input id="saml-email-attr" className="wka-input" value={form.emailAttribute} onChange={(e) => setForm({ ...form, emailAttribute: e.target.value })} /></div>
            <div className="wka-field"><label htmlFor="saml-name-attr">{t('ssoSetup.saml.nameAttribute')}</label><input id="saml-name-attr" className="wka-input" value={form.nameAttribute} onChange={(e) => setForm({ ...form, nameAttribute: e.target.value })} /></div>
          </div>
          <div className="sso-actions">
            <button type="button" className="wka-btn primary" disabled={busy} onClick={save} data-testid="saml-save">{busy ? <Spinning /> : <ShieldCheck size={14} />} {t('ssoSetup.saml.save')}</button>
            {connected ? <button type="button" className="wka-btn ghost" disabled={busy} onClick={() => setEditing(false)}>{t('companyAdmin.common.cancel')}</button> : null}
          </div>
          {err ? <div style={{ marginTop: 12 }}><ErrorBox error={err} /></div> : null}
        </>
      )}
    </div>
  )
}

// ---- SCIM ------------------------------------------------------------------------
function ScimPanel({ data, onChanged }) {
  const t = useT()
  const [name, setName] = useState('')
  const [mfa, setMfa] = useState('')
  const [needMfa, setNeedMfa] = useState(false)
  const [secret, setSecret] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [askReason, reasonModal] = useReasonModal()
  const tokens = data.scim.tokens || []
  const create = async () => {
    setBusy(true); setErr(null); setSecret(null)
    try {
      const r = await api.workCompanyCreateScimToken({ name, mfaToken: mfa || undefined })
      setSecret(r.secret); setName(''); setMfa(''); setNeedMfa(false); onChanged()
    } catch (e) {
      if (e && e.status === 401 && e.data && /STEP_UP/.test(String(e.data.code || ''))) setNeedMfa(true)
      setErr(e)
    } finally { setBusy(false) }
  }
  const revoke = async (id) => {
    const reason = await askReason({ title: t('ssoSetup.scim.revoke'), detail: t('ssoSetup.scim.revokeConfirm'), confirmLabel: t('ssoSetup.scim.revoke') })
    if (!reason) return
    try { await api.workCompanyRevokeScimToken(id); onChanged() } catch (e) { setErr(e) }
  }
  return (
    <div className="wka-panel">
      {reasonModal}
      <h2 className="sso-h"><Users size={16} /> {t('ssoSetup.scim.title')}</h2>
      <p className="desc">{t('ssoSetup.scim.desc')}</p>
      <Steps prefix="ssoSetup.scim" />
      <div className="sso-sp">
        <div className="sso-sp-h">{t('ssoSetup.copyHint')}</div>
        <CopyValue label={t('ssoSetup.scim.baseUrl')} value={data.scim.baseUrl} testid="sso-scim-base" />
        <div className="sso-kv"><span>{t('ssoSetup.scim.authHeader')}</span><b>{t('ssoSetup.scim.authValue')}</b></div>
        <p className="sso-fine">{t('ssoSetup.scim.supports')}</p>
      </div>
      <h3 className="sso-h3">{t('ssoSetup.scim.tokens')}</h3>
      {secret ? (
        <div className="sso-secret" data-testid="scim-secret">
          <div className="sso-secret-h"><AlertTriangle size={14} /> {t('ssoSetup.scim.created')}</div>
          <CopyValue label={t('ssoSetup.scim.tokenLabel')} value={secret} />
        </div>
      ) : null}
      {!tokens.length ? <EmptyState title={t('ssoSetup.scim.none')} /> : (
        <div className="sso-tokens">
          {tokens.map((k) => (
            <div key={k.id} className="sso-token">
              <div className="sso-token-main">
                <b>{k.name || k.prefix}</b>
                <span className="sso-dim"><code className="wka-mono">{k.prefix}_...{k.last4}</code></span>
                <span className="sso-dim">{k.lastUsedAt ? t('ssoSetup.scim.lastUsed', { when: fmtWhen(k.lastUsedAt) }) : t('ssoSetup.scim.neverUsed')}</span>
              </div>
              <span className={`sso-pill${k.status === 'active' ? ' ok' : ''}`}>{k.status === 'active' ? t('ssoSetup.scim.active') : t('ssoSetup.scim.revoked')}</span>
              {k.status === 'active' ? <button type="button" className="wka-btn sm ghost danger" onClick={() => revoke(k.id)}>{t('ssoSetup.scim.revoke')}</button> : null}
            </div>
          ))}
        </div>
      )}
      <div className="sso-create">
        <div className="wka-field"><label htmlFor="scim-name">{t('ssoSetup.scim.name')}</label><input id="scim-name" className="wka-input" value={name} placeholder={t('ssoSetup.scim.namePlaceholder')} onChange={(e) => setName(e.target.value)} /></div>
        {needMfa ? <div className="wka-field"><label htmlFor="scim-mfa">{t('ssoSetup.scim.mfa')}</label><input id="scim-mfa" className="wka-input" inputMode="numeric" autoComplete="one-time-code" value={mfa} onChange={(e) => setMfa(e.target.value)} /></div> : null}
        <button type="button" className="wka-btn primary" disabled={busy} onClick={create} data-testid="scim-create">{busy ? <Spinning /> : <KeyRound size={14} />} {t('ssoSetup.scim.create')}</button>
      </div>
      {err ? <div style={{ marginTop: 12 }}><ErrorBox error={err} /></div> : null}
    </div>
  )
}

// ---- Test sign-in -------------------------------------------------------------------
function TestCard({ protocol, connected, companyId, last, onRefresh }) {
  const t = useT()
  const start = () => {
    const path = protocol === 'saml' ? `/api/work/sso/saml/${encodeURIComponent(companyId)}/login?test=1` : `/api/work/sso/${encodeURIComponent(companyId)}/start?test=1`
    window.location.assign(path)
  }
  const mine = last && last.protocol === protocol ? last : null
  return (
    <div className="wka-panel" data-testid="sso-test">
      <h2 className="sso-h"><Play size={16} /> {t('ssoSetup.test.title')}</h2>
      <p className="desc">{t('ssoSetup.test.desc')}</p>
      <div className="sso-actions">
        <button type="button" className="wka-btn primary" disabled={!connected} onClick={start}><Play size={14} /> {t('ssoSetup.test.run')}</button>
        <button type="button" className="wka-btn ghost" onClick={onRefresh}><RefreshCw size={14} /> {t('ssoSetup.test.refresh')}</button>
      </div>
      {!connected ? <p className="sso-fine">{t('ssoSetup.test.needSave')}</p> : null}
      {mine ? (
        <div className={`sso-result ${mine.ok && mine.outcome !== 'refused' ? 'ok' : 'bad'}`} data-testid="sso-test-result">
          <div className="sso-result-h">{mine.ok ? <Check size={14} /> : <AlertTriangle size={14} />} <b>{mine.ok ? t('ssoSetup.test.ok') : t('ssoSetup.test.failed')}</b> <span className="sso-dim">{fmtWhen(mine.at)}</span></div>
          {mine.email ? <div className="sso-kv"><span>{t('ssoSetup.test.email')}</span><b>{mine.email}</b></div> : null}
          {mine.displayName ? <div className="sso-kv"><span>{t('ssoSetup.test.name')}</span><b>{mine.displayName}</b></div> : null}
          <div className="sso-out">{mine.outcome === 'existing' ? t('ssoSetup.test.outcome.existing', { account: mine.account || mine.email })
            : mine.outcome === 'would_create' ? t('ssoSetup.test.outcome.wouldCreate', { email: mine.email })
              : mine.outcome === 'refused' ? t('ssoSetup.test.outcome.refused', { reason: mine.reason || '' })
                : t('ssoSetup.test.outcome.failed', { reason: mine.reason || '' })}</div>
        </div>
      ) : null}
    </div>
  )
}

// Scoped (sso-), on the wka tokens so light and dark follow the console theme.
// Nothing can overflow: long values wrap anywhere, rows stack below 720px.
const SSO_CSS = `
.sso .sso-quiet{color:var(--wka-muted)}
.sso-tabs{display:flex;gap:8px;margin:14px 0 12px;flex-wrap:wrap}
.sso-tab{display:inline-flex;align-items:center;gap:8px;min-width:0;padding:9px 12px;border-radius:11px;border:1px solid var(--wka-line);background:var(--wka-panel);color:var(--wka-text);font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}
.sso-tab.on{border-color:var(--wka-accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--wka-accent) 18%, transparent)}
.sso-tab-l{white-space:nowrap}
.sso-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--wka-faint);border:1px solid var(--wka-line-2);border-radius:999px;padding:2px 8px;white-space:nowrap;flex-shrink:0}
.sso-pill.ok{color:var(--wka-emerald);border-color:color-mix(in srgb, var(--wka-emerald) 40%, transparent);background:color-mix(in srgb, var(--wka-emerald) 8%, transparent)}
.sso-h{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.sso-h svg{color:var(--wka-accent);flex-shrink:0}
.sso-h3{font-size:14px;margin:18px 0 10px}
.sso-steps{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px}
.sso-steps li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--wka-text);min-width:0}
.sso-steps li span:last-child{min-width:0;overflow-wrap:anywhere}
.sso-n{flex-shrink:0;width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;font-size:12px;font-weight:800;color:var(--wka-accent);background:color-mix(in srgb, var(--wka-accent) 12%, transparent)}
.sso-sp{border:1px solid var(--wka-line);border-radius:12px;padding:12px 14px;background:var(--wka-bg-2);display:grid;gap:10px;margin-bottom:6px}
.sso-sp-h{font-size:12.5px;font-weight:700;color:var(--wka-muted)}
.sso-copy{display:grid;gap:4px;min-width:0}
.sso-copy-l{font-size:12px;color:var(--wka-muted)}
.sso-copy-v{display:flex;align-items:center;gap:8px;min-width:0}
.sso-copy-v code{flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-all;font-size:12.5px;padding:7px 9px;border-radius:8px;border:1px solid var(--wka-line);background:var(--wka-panel)}
.sso-copy-v .wka-btn{flex-shrink:0;white-space:nowrap}
.sso-kv{display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px;min-width:0}
.sso-kv span{color:var(--wka-muted)}
.sso-kv b{min-width:0;overflow-wrap:anywhere}
.sso-fine{font-size:12px;color:var(--wka-muted);margin:0;line-height:1.5}
.sso-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}
.sso-seg{display:inline-flex;border:1px solid var(--wka-line);border-radius:10px;overflow:hidden;margin-bottom:12px}
.sso-seg-b{background:transparent;border:0;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;color:var(--wka-muted);cursor:pointer;white-space:nowrap}
.sso-seg-b.on{background:color-mix(in srgb, var(--wka-accent) 12%, transparent);color:var(--wka-text)}
.sso-wide{grid-column:1/-1;display:grid;gap:6px;margin-bottom:12px}
.sso-ta{width:100%;min-height:96px;resize:vertical;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;box-sizing:border-box}
.sso-hint{font-size:11.5px;color:var(--wka-faint)}
.sso-found{border:1px solid color-mix(in srgb, var(--wka-emerald) 40%, transparent);border-radius:10px;padding:9px 11px;display:grid;gap:3px;font-size:12.5px;min-width:0;overflow-wrap:anywhere}
.sso-dim{color:var(--wka-muted);font-size:12px;min-width:0;overflow-wrap:anywhere}
.sso-bad{color:var(--wka-red)}
.sso-secret{border:1px solid var(--wka-amber);border-radius:12px;padding:12px 14px;margin-bottom:12px;display:grid;gap:8px}
.sso-secret-h{display:flex;gap:6px;align-items:center;font-weight:700;font-size:13px;color:var(--wka-amber)}
.sso-tokens{display:grid;gap:8px}
.sso-token{display:flex;align-items:center;gap:10px;border:1px solid var(--wka-line);border-radius:11px;padding:10px 12px;min-width:0;flex-wrap:wrap}
.sso-token-main{display:grid;gap:2px;flex:1;min-width:0}
.sso-token-main b{overflow-wrap:anywhere}
.sso-create{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:12px}
.sso-create .wka-field{flex:1;min-width:180px;margin:0}
.sso-result{border-radius:12px;padding:12px 14px;margin-top:12px;display:grid;gap:6px;border:1px solid var(--wka-line)}
.sso-result.ok{border-color:color-mix(in srgb, var(--wka-emerald) 45%, transparent)}
.sso-result.bad{border-color:color-mix(in srgb, var(--wka-amber) 55%, transparent)}
.sso-result-h{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.sso-out{font-size:13px;overflow-wrap:anywhere}
.sso .wka-btn.danger{color:var(--wka-red)}
@media (max-width:720px){.sso-tab{flex:1 1 100%;justify-content:space-between}.sso-create{flex-direction:column;align-items:stretch}}
`
