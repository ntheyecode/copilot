// Billing: the Stripe configuration for WorkCoPilot, set from the console so a
// superadmin never has to touch the environment. Two secrets (the secret key
// and the webhook signing secret) are write-only: they are never shown back, and
// leaving a field blank keeps whatever is stored. The three price ids and the
// optional publishable key are plain text and can be edited or cleared.
//
// UX: once a configuration is saved it collapses to a read-only summary with an
// Edit button; the form only appears when adding or editing. A Test connection
// button validates the stored keys against Stripe live.
//
// Nothing here ever displays a stored secret value (SUPREME RULE III style: the
// state is surfaced plainly as configured / not configured, never leaked).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, CreditCard, Link2, Copy, Check, X, Zap, AlertTriangle, Activity } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { useT } from '../../../i18n/index.jsx'
import { Loading, ErrorBox, Spinning, SavedTag, StepUpPrompt, isLockError, RecRow, EditToggle, StateRow } from './_shared.jsx'

// One line of the saved record: the shared RecRow (same collapse-to-record look
// as every other saved setting in the console) with a small status dot in front
// of the value so set / not-set still reads at a glance.
function SummaryRow({ label, value, ok, neutral }) {
  const color = neutral ? 'var(--wka-faint)' : (ok ? 'var(--wka-emerald)' : 'var(--wka-red)')
  return (
    <RecRow label={label} value={(
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} aria-hidden="true" />
        <span className="wka-mono" style={{ overflowWrap: 'anywhere' }}>{value}</span>
      </span>
    )} />
  )
}

export default function Billing({ isSuperAdmin }) {
  const t = useT()
  const [state, setState] = useState({ loading: true, error: null, billing: null, webhookUrl: '', envFallback: null })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [stepUp, setStepUp] = useState(false)   // authenticator re-auth before saving secret keys
  const [copied, setCopied] = useState(false)
  // Test connection
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testErr, setTestErr] = useState(null)
  // Form fields. Secrets start blank (write-only); blank on save keeps stored.
  const [form, setForm] = useState({ secretKey: '', webhookSecret: '', priceLite: '', priceBasic: '', priceAdvanced: '', pricePremium: '', priceLiteAnnual: '', priceBasicAnnual: '', priceAdvancedAnnual: '', pricePremiumAnnual: '', publishableKey: '', enabled: true })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.getBilling()
      const b = data.billing || {}
      setState({ loading: false, error: null, billing: b, webhookUrl: data.webhookUrl || '', envFallback: data.envFallback || null, offCode: data.offByEdition ? (data.offCode || 'generic') : null })
      setForm({
        secretKey: '', webhookSecret: '',
        priceLite: b.priceLite || '', priceBasic: b.priceBasic || '', priceAdvanced: b.priceAdvanced || '', pricePremium: b.pricePremium || '',
        priceLiteAnnual: b.priceLiteAnnual || '', priceBasicAnnual: b.priceBasicAnnual || '', priceAdvancedAnnual: b.priceAdvancedAnnual || '', pricePremiumAnnual: b.pricePremiumAnnual || '',
        publishableKey: b.publishableKey || '', enabled: b.enabled !== false,
      })
      // Collapse to the summary when something is already configured; open the
      // form on a first-time (empty) configuration.
      const env = data.envFallback || {}
      const configured = !!(b.hasSecretKey || env.secretKey || (b.priceBasic && b.priceAdvanced && b.pricePremium))
      setEditing(!configured)
    } catch (error) { setState((s) => ({ ...s, loading: false, error })) }
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!isSuperAdmin || saving) return
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      // Only send secrets when the operator actually typed one (blank = keep).
      const patch = {
        priceLite: form.priceLite, priceBasic: form.priceBasic, priceAdvanced: form.priceAdvanced, pricePremium: form.pricePremium,
        priceLiteAnnual: form.priceLiteAnnual, priceBasicAnnual: form.priceBasicAnnual, priceAdvancedAnnual: form.priceAdvancedAnnual, pricePremiumAnnual: form.pricePremiumAnnual,
        publishableKey: form.publishableKey, enabled: !!form.enabled,
      }
      if (form.secretKey.trim()) patch.secretKey = form.secretKey.trim()
      if (form.webhookSecret.trim()) patch.webhookSecret = form.webhookSecret.trim()
      const data = await workAdminApi.setBilling(patch)
      const b = data.billing || {}
      setState((s) => ({ ...s, billing: b }))
      setForm((f) => ({ ...f, secretKey: '', webhookSecret: '' }))   // clear the write-only fields
      setTestResult(null); setTestErr(null)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
      setEditing(false)   // collapse back to the summary after a save
    } catch (error) { if (isLockError(error)) { setStepUp(true) } else { setSaveError(error) } }
    finally { setSaving(false) }
  }

  // Switch the ACTIVE mode (live <-> test). Each mode has its own keys + price
  // ids, entered separately. Switching reloads so the form shows that mode's values.
  const switchMode = async (m) => {
    if (!isSuperAdmin) return
    setSaveError(null); setTestResult(null); setTestErr(null)
    try { await workAdminApi.setBilling({ mode: m }); await load() }
    catch (error) { setSaveError(error) }
  }

  const test = async () => {
    if (testing) return
    setTesting(true); setTestErr(null); setTestResult(null)
    try {
      const r = await workAdminApi.testBilling()
      if (r && r.ok === false && r.error) setTestErr(new Error(r.error))
      setTestResult(r)
    } catch (error) { setTestErr(error) }
    finally { setTesting(false) }
  }

  const copyWebhook = async () => {
    try { await navigator.clipboard.writeText(state.webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }

  if (state.loading) return <Loading label={t('billingAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const b = state.billing || {}
  const env = state.envFallback || {}
  const secretSet = !!b.hasSecretKey || !!env.secretKey
  const webhookSet = !!b.hasWebhookSecret || !!env.webhookSecret
  const pricesSet = !!(b.priceBasic && b.priceAdvanced && b.pricePremium)
  const ready = secretSet && pricesSet && b.enabled !== false

  const money = (n, cur) => {
    if (n == null) return ''
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(n) }
    catch { return `$${n}` }
  }
  const PLAN_ROWS = [['lite', t('billingAdmin.plans.lite')], ['basic', t('billingAdmin.plans.basic')], ['advanced', t('billingAdmin.plans.advanced')], ['premium', t('billingAdmin.plans.premium')]]

  return (
    <div>
      {stepUp ? <StepUpPrompt verify={workAdminApi.verifyAiStepUp} label={t('billingAdmin.stepUpLabel')} onUnlocked={() => { setStepUp(false); save() }} onCancel={() => setStepUp(false)} /> : null}
      {!isSuperAdmin ? <div className="wka-note"><Lock size={14} /> {t('billingAdmin.readOnlyNote')}</div> : null}
      {/* This edition has no Stripe: the server says why (offCode), worded here. */}
      {state.offCode ? (
        <div className="wka-note" role="status" data-billing-off={state.offCode}>
          <Lock size={14} /> <b>{t('billingAdmin.offByEdition.title')}</b>{' '}
          {t(['license', 'invoiced'].includes(state.offCode) ? `billingAdmin.offByEdition.${state.offCode}` : 'billingAdmin.offByEdition.generic')}
        </div>
      ) : null}

      <div className="wka-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0 }}><CreditCard size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('billingAdmin.config.title')}</h2>
          {!editing ? <EditToggle editing={editing} disabled={!isSuperAdmin} onEdit={() => { setTestResult(null); setTestErr(null); setEditing(true) }} /> : null}
        </div>
        <p className="desc">{editing
          ? t('billingAdmin.config.descEditing')
          : t('billingAdmin.config.descSaved')}</p>

        {(() => {
          const mode = (b && b.mode) || 'live'
          const isTest = mode === 'test'
          const C = isTest ? 'var(--wka-amber)' : 'var(--wka-emerald)'
          const seg = (active) => ({ flex: 1, textAlign: 'center', padding: '8px 0', font: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: isSuperAdmin ? 'pointer' : 'default', borderRadius: 8, border: 'none', background: active ? C : 'transparent', color: active ? '#fff' : 'var(--wka-muted)', transition: 'all .12s' })
          return (
            <div style={{ padding: '12px 14px', marginBottom: 16, borderRadius: 12, border: `2px solid ${C}`, background: `color-mix(in srgb, ${C} 6%, transparent)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C }}>{t('billingAdmin.mode.heading', { mode: isTest ? t('billingAdmin.mode.testLabel') : t('billingAdmin.mode.liveLabel') })}</span>
                {isSuperAdmin && (
                  <div style={{ display: 'flex', gap: 3, background: 'var(--wka-bg-2)', borderRadius: 10, padding: 3, minWidth: 180 }}>
                    <button type="button" style={seg(!isTest)} onClick={() => !isTest || switchMode('live')}>{t('billingAdmin.mode.liveButton')}</button>
                    <button type="button" style={seg(isTest)} onClick={() => isTest || switchMode('test')}>{t('billingAdmin.mode.testButton')}</button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--wka-muted)', marginTop: 7 }}>
                {t.rich('billingAdmin.mode.switchNote', { mode: isTest ? t('billingAdmin.mode.testWord') : t('billingAdmin.mode.liveWord') })}
              </div>
            </div>
          )
        })()}

        {!editing ? (
          <>
            <div className="wka-record" style={{ maxWidth: 640 }}>
              <SummaryRow label={t('billingAdmin.summary.secretKey')} value={secretSet ? t('billingAdmin.summary.setHidden') : t('billingAdmin.summary.notSet')} ok={secretSet} />
              <SummaryRow label={t('billingAdmin.summary.webhookSecret')} value={webhookSet ? t('billingAdmin.summary.setHidden') : t('billingAdmin.summary.notSet')} ok={webhookSet} />
              <SummaryRow label={t('billingAdmin.summary.litePlan')} value={b.priceLite || t('billingAdmin.summary.notSet')} ok={!!b.priceLite} />
              <SummaryRow label={t('billingAdmin.summary.basicPlan')} value={b.priceBasic || t('billingAdmin.summary.notSet')} ok={!!b.priceBasic} />
              <SummaryRow label={t('billingAdmin.summary.advancedPlan')} value={b.priceAdvanced || t('billingAdmin.summary.notSet')} ok={!!b.priceAdvanced} />
              <SummaryRow label={t('billingAdmin.summary.premiumPlan')} value={b.pricePremium || t('billingAdmin.summary.notSet')} ok={!!b.pricePremium} />
              <SummaryRow label={t('billingAdmin.summary.annual')} value={b.annualReady ? t('billingAdmin.summary.annualLive') : t('billingAdmin.summary.annualNotSet')} ok={!!b.annualReady} neutral={!b.annualReady} />
              <SummaryRow label={t('billingAdmin.summary.publishableKey')} value={b.publishableKey || t('billingAdmin.summary.notSetOptional')} ok={!!b.publishableKey} neutral={!b.publishableKey} />
              <SummaryRow label={t('billingAdmin.summary.billing')} value={b.enabled !== false ? t('billingAdmin.summary.on') : t('billingAdmin.summary.off')} ok={b.enabled !== false} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button type="button" className="wka-btn" disabled={!secretSet || testing} onClick={test}>
                {testing ? <Spinning /> : <Zap size={14} />} {t('billingAdmin.summary.testConnection')}
              </button>
              <SavedTag show={saved} />
            </div>

            {testErr ? <div style={{ marginTop: 14 }}><ErrorBox error={testErr} /></div> : null}
            {testResult && !testErr ? (
              <div style={{ marginTop: 16, border: `1px solid color-mix(in srgb, ${testResult.ok ? 'var(--wka-emerald)' : 'var(--wka-amber)'} 35%, transparent)`, background: `color-mix(in srgb, ${testResult.ok ? 'var(--wka-emerald)' : 'var(--wka-amber)'} 6%, transparent)`, borderRadius: 12, padding: '14px 16px', maxWidth: 640 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, marginBottom: 10 }}>
                  {testResult.ok ? <CheckCircle2 size={17} style={{ color: 'var(--wka-emerald)' }} /> : <AlertTriangle size={17} style={{ color: 'var(--wka-amber)' }} />}
                  {testResult.ok ? t('billingAdmin.test.okTitle') : t('billingAdmin.test.incompleteTitle')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--wka-muted)', marginBottom: 10 }}>
                  {t.rich('billingAdmin.test.account', { account: testResult.account || t('billingAdmin.test.unknown') }, { b: (c) => <b style={{ color: 'var(--wka-text)' }}>{c}</b> })}
                  {' · '}<span style={{ color: testResult.livemode ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>{testResult.livemode ? t('billingAdmin.test.liveMode') : t('billingAdmin.test.testMode')}</span>
                  {' · '}{t('billingAdmin.test.webhookSecret', { state: testResult.webhookSet ? t('billingAdmin.test.set') : t('billingAdmin.test.missing') })}
                </div>
                {PLAN_ROWS.map(([id, name]) => {
                  const p = (testResult.plans && testResult.plans[id]) || {}
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
                      {p.ok ? <CheckCircle2 size={15} style={{ color: 'var(--wka-emerald)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--wka-red)', flexShrink: 0 }} />}
                      <b>{name}</b>
                      <span style={{ color: 'var(--wka-muted)' }}>
                        {p.ok ? `${money(p.amount, p.currency)} / ${p.interval}` : (p.error || t('billingAdmin.test.notSet'))}
                      </span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 0 2px', marginTop: 6, borderTop: '1px solid var(--wka-line-2)' }}>
                  {testResult.annualReady ? <CheckCircle2 size={15} style={{ color: 'var(--wka-emerald)' }} /> : <AlertTriangle size={15} style={{ color: 'var(--wka-amber)' }} />}
                  <b>{t('billingAdmin.test.annualTitle')}</b>
                  <span style={{ color: 'var(--wka-muted)' }}>{testResult.annualReady ? t('billingAdmin.test.annualReady') : t('billingAdmin.test.annualNotReady')}</span>
                </div>
                {PLAN_ROWS.map(([id, name]) => {
                  const a = (testResult.annualPlans && testResult.annualPlans[id]) || {}
                  if (!a.set) return null
                  return (
                    <div key={'a' + id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '3px 0 3px 22px' }}>
                      {a.ok ? <CheckCircle2 size={14} style={{ color: 'var(--wka-emerald)', flexShrink: 0 }} /> : <XCircle size={14} style={{ color: 'var(--wka-red)', flexShrink: 0 }} />}
                      <span style={{ color: 'var(--wka-muted)' }}>{t('billingAdmin.test.planAnnual', { name })} {a.ok ? `${money(a.amount, a.currency)} / ${a.interval}` : (a.error || t('billingAdmin.test.notSet'))}</span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
              <div className="wka-field">
                <label>{t('billingAdmin.form.secretKey')} {secretSet ? <span style={{ color: 'var(--wka-emerald)' }}>{t('billingAdmin.form.set')}</span> : <span style={{ color: 'var(--wka-red)' }}>{t('billingAdmin.form.notSet')}</span>}</label>
                <input className="wka-input" type="password" autoComplete="off" placeholder={secretSet ? t('billingAdmin.form.secretKeySetPlaceholder') : t('billingAdmin.form.secretKeyPlaceholder')}
                  value={form.secretKey} onChange={set('secretKey')} disabled={!isSuperAdmin} />
                <span className="hint">{t('billingAdmin.form.secretKeyHint')}</span>
              </div>

              <div className="wka-field">
                <label>{t('billingAdmin.form.webhookSecret')} {webhookSet ? <span style={{ color: 'var(--wka-emerald)' }}>{t('billingAdmin.form.set')}</span> : <span style={{ color: 'var(--wka-red)' }}>{t('billingAdmin.form.notSet')}</span>}</label>
                <input className="wka-input" type="password" autoComplete="off" placeholder={webhookSet ? t('billingAdmin.form.webhookSetPlaceholder') : t('billingAdmin.form.webhookPlaceholder')}
                  value={form.webhookSecret} onChange={set('webhookSecret')} disabled={!isSuperAdmin} />
                <span className="hint">{t('billingAdmin.form.webhookHint')}</span>
              </div>

              <div className="wka-field">
                <label>{t('billingAdmin.form.litePlanId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.planIdPlaceholder')} value={form.priceLite} onChange={set('priceLite')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.basicPlanId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.planIdPlaceholder')} value={form.priceBasic} onChange={set('priceBasic')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.advancedPlanId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.planIdPlaceholder')} value={form.priceAdvanced} onChange={set('priceAdvanced')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.premiumPlanId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.planIdPlaceholder')} value={form.pricePremium} onChange={set('pricePremium')} disabled={!isSuperAdmin} />
              </div>

              <p className="desc" style={{ marginTop: 4 }}>{t('billingAdmin.form.annualDesc')}</p>
              <div className="wka-field">
                <label>{t('billingAdmin.form.litePlanAnnualId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.annualIdPlaceholder')} value={form.priceLiteAnnual} onChange={set('priceLiteAnnual')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.basicPlanAnnualId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.annualIdPlaceholder')} value={form.priceBasicAnnual} onChange={set('priceBasicAnnual')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.advancedPlanAnnualId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.annualIdPlaceholder')} value={form.priceAdvancedAnnual} onChange={set('priceAdvancedAnnual')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>{t('billingAdmin.form.premiumPlanAnnualId')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.annualIdPlaceholder')} value={form.pricePremiumAnnual} onChange={set('pricePremiumAnnual')} disabled={!isSuperAdmin} />
              </div>

              <div className="wka-field">
                <label>{t('billingAdmin.form.publishableKey')}</label>
                <input className="wka-input" placeholder={t('billingAdmin.form.publishableKeyPlaceholder')} value={form.publishableKey} onChange={set('publishableKey')} disabled={!isSuperAdmin} />
                <span className="hint">{t('billingAdmin.form.publishableKeyHint')}</span>
              </div>

              <div className={`wka-toggle${form.enabled ? ' on' : ''}${!isSuperAdmin ? ' disabled' : ''}`} onClick={() => isSuperAdmin && setForm((f) => ({ ...f, enabled: !f.enabled }))} role="switch" aria-checked={form.enabled}>
                <span className="track"><span className="knob" /></span>
                <span style={{ fontWeight: 600 }}>{form.enabled ? t('billingAdmin.form.billingOn') : t('billingAdmin.form.billingOff')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="wka-btn primary" disabled={!isSuperAdmin || saving} onClick={save}>
                  {saving ? <Spinning /> : null} {t('billingAdmin.form.save')}
                </button>
                {(secretSet || pricesSet) && (
                  <button type="button" className="wka-btn ghost" disabled={saving} onClick={() => { setSaveError(null); load() }}><X size={14} /> {t('billingAdmin.form.cancel')}</button>
                )}
                <SavedTag show={saved} />
              </div>
              {saveError ? <ErrorBox error={saveError} /> : null}
            </div>
          </>
        )}
      </div>

      <div className="wka-panel">
        <h2><Link2 size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('billingAdmin.webhook.title')}</h2>
        <p className="desc">{t('billingAdmin.webhook.desc')}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <code className="wka-mono" style={{ background: 'var(--wka-bg-2)', border: '1px solid var(--wka-line)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{state.webhookUrl}</code>
          <button type="button" className="wka-btn sm ghost" onClick={copyWebhook}>{copied ? <><Check size={13} /> {t('billingAdmin.webhook.copied')}</> : <><Copy size={13} /> {t('billingAdmin.webhook.copy')}</>}</button>
        </div>
      </div>

      <div className="wka-panel">
        <h2><Activity size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />{t('billingAdmin.state.title')}</h2>
        <p className="desc">{t('billingAdmin.state.desc')}</p>
        <StateRow ok={secretSet} label={secretSet ? t('billingAdmin.state.secretSet') : t('billingAdmin.state.secretMissing')} detail={secretSet ? (b.hasSecretKey ? t('billingAdmin.state.storedInConsole') : t('billingAdmin.state.fromEnv')) : t('billingAdmin.state.secretAdd')} />
        <StateRow ok={webhookSet} label={webhookSet ? t('billingAdmin.state.webhookSet') : t('billingAdmin.state.webhookMissing')} detail={webhookSet ? (b.hasWebhookSecret ? t('billingAdmin.state.storedInConsole') : t('billingAdmin.state.fromEnv')) : t('billingAdmin.state.webhookAdd')} />
        <StateRow ok={pricesSet} label={pricesSet ? t('billingAdmin.state.pricesSet') : t('billingAdmin.state.pricesIncomplete')} detail={pricesSet ? t('billingAdmin.state.pricesMapped') : t('billingAdmin.state.pricesAdd')} />
        <StateRow ok={ready} label={ready ? t('billingAdmin.state.ready') : t('billingAdmin.state.notReady')} detail={ready ? t('billingAdmin.state.readyDetail') : t('billingAdmin.state.notReadyDetail')} />
      </div>
    </div>
  )
}
