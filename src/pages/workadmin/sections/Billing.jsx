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
import { Lock, CheckCircle2, XCircle, CreditCard, Link2, Copy, Check, Pencil, Zap, AlertTriangle } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag } from './_shared.jsx'

function StateRow({ ok, label, detail }) {
  const Icon = ok ? CheckCircle2 : XCircle
  const color = ok ? 'var(--wka-emerald)' : 'var(--wka-red)'
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--wka-line)' }}>
      <Icon size={18} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ color: 'var(--wka-muted)', fontSize: 12 }}>{detail}</div>
      </div>
    </div>
  )
}

// One line of the saved summary: a label on the left, the value (or a masked
// "Set") on the right, with a small status dot.
function SummaryRow({ label, value, ok, neutral }) {
  const color = neutral ? 'var(--wka-faint)' : (ok ? 'var(--wka-emerald)' : 'var(--wka-red)')
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--wka-line)' }}>
      <span style={{ color: 'var(--wka-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span className="wka-mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{value}</span>
      </span>
    </div>
  )
}

export default function Billing({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, billing: null, webhookUrl: '', envFallback: null })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  // Test connection
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testErr, setTestErr] = useState(null)
  // Form fields. Secrets start blank (write-only); blank on save keeps stored.
  const [form, setForm] = useState({ secretKey: '', webhookSecret: '', priceBasic: '', priceAdvanced: '', pricePremium: '', priceBasicAnnual: '', priceAdvancedAnnual: '', pricePremiumAnnual: '', publishableKey: '', enabled: true })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.getBilling()
      const b = data.billing || {}
      setState({ loading: false, error: null, billing: b, webhookUrl: data.webhookUrl || '', envFallback: data.envFallback || null })
      setForm({
        secretKey: '', webhookSecret: '',
        priceBasic: b.priceBasic || '', priceAdvanced: b.priceAdvanced || '', pricePremium: b.pricePremium || '',
        priceBasicAnnual: b.priceBasicAnnual || '', priceAdvancedAnnual: b.priceAdvancedAnnual || '', pricePremiumAnnual: b.pricePremiumAnnual || '',
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
        priceBasic: form.priceBasic, priceAdvanced: form.priceAdvanced, pricePremium: form.pricePremium,
        priceBasicAnnual: form.priceBasicAnnual, priceAdvancedAnnual: form.priceAdvancedAnnual, pricePremiumAnnual: form.pricePremiumAnnual,
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
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
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

  if (state.loading) return <Loading label="Loading billing configuration" />
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
  const PLAN_ROWS = [['basic', 'Basic'], ['advanced', 'Advanced'], ['premium', 'Premium']]

  return (
    <div>
      {!isSuperAdmin ? <div className="wka-note"><Lock size={14} /> Only a superadmin can change the billing configuration. The current state is shown below.</div> : null}

      <div className="wka-panel">
        <h2><CreditCard size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Stripe configuration</h2>

        {!editing ? (
          <>
            <p className="desc">Your Stripe keys and plan ids are saved. Secrets are never shown back. Use Test connection to confirm they work, or Edit to change them.</p>
            <div style={{ maxWidth: 640 }}>
              <SummaryRow label="Secret key" value={secretSet ? 'Set, hidden' : 'Not set'} ok={secretSet} />
              <SummaryRow label="Webhook signing secret" value={webhookSet ? 'Set, hidden' : 'Not set'} ok={webhookSet} />
              <SummaryRow label="Basic plan" value={b.priceBasic || 'Not set'} ok={!!b.priceBasic} />
              <SummaryRow label="Advanced plan" value={b.priceAdvanced || 'Not set'} ok={!!b.priceAdvanced} />
              <SummaryRow label="Premium plan" value={b.pricePremium || 'Not set'} ok={!!b.pricePremium} />
              <SummaryRow label="Annual billing (20% off)" value={b.annualReady ? 'Live, all three annual ids set' : 'Not set up (annual picks route to sign-up)'} ok={!!b.annualReady} neutral={!b.annualReady} />
              <SummaryRow label="Publishable key" value={b.publishableKey || 'Not set (optional)'} ok={!!b.publishableKey} neutral={!b.publishableKey} />
              <SummaryRow label="Billing" value={b.enabled !== false ? 'On' : 'Off'} ok={b.enabled !== false} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <button type="button" className="wka-btn primary" disabled={!isSuperAdmin} onClick={() => { setTestResult(null); setTestErr(null); setEditing(true) }}>
                <Pencil size={14} /> Edit configuration
              </button>
              <button type="button" className="wka-btn" disabled={!secretSet || testing} onClick={test}>
                {testing ? <Spinning /> : <Zap size={14} />} Test connection
              </button>
              <SavedTag show={saved} />
            </div>

            {testErr ? <div style={{ marginTop: 14 }}><ErrorBox error={testErr} /></div> : null}
            {testResult && !testErr ? (
              <div style={{ marginTop: 16, border: `1px solid ${testResult.ok ? 'rgba(10,157,102,.35)' : 'rgba(181,121,15,.35)'}`, background: testResult.ok ? 'rgba(10,157,102,.06)' : 'rgba(181,121,15,.06)', borderRadius: 12, padding: '14px 16px', maxWidth: 640 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, marginBottom: 10 }}>
                  {testResult.ok ? <CheckCircle2 size={17} style={{ color: 'var(--wka-emerald)' }} /> : <AlertTriangle size={17} style={{ color: 'var(--wka-amber)' }} />}
                  {testResult.ok ? 'Connected to Stripe. Checkout is ready.' : 'Connected, but something is incomplete.'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--wka-muted)', marginBottom: 10 }}>
                  Account: <b style={{ color: 'var(--wka-text)' }}>{testResult.account || 'unknown'}</b>
                  {' · '}<span style={{ color: testResult.livemode ? 'var(--wka-emerald)' : 'var(--wka-amber)', fontWeight: 600 }}>{testResult.livemode ? 'LIVE mode' : 'TEST mode'}</span>
                  {' · '}Webhook secret {testResult.webhookSet ? 'set' : 'missing'}
                </div>
                {PLAN_ROWS.map(([id, name]) => {
                  const p = (testResult.plans && testResult.plans[id]) || {}
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
                      {p.ok ? <CheckCircle2 size={15} style={{ color: 'var(--wka-emerald)', flexShrink: 0 }} /> : <XCircle size={15} style={{ color: 'var(--wka-red)', flexShrink: 0 }} />}
                      <b>{name}</b>
                      <span style={{ color: 'var(--wka-muted)' }}>
                        {p.ok ? `${money(p.amount, p.currency)} / ${p.interval}` : (p.error || 'not set')}
                      </span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 0 2px', marginTop: 6, borderTop: '1px solid var(--wka-line-2)' }}>
                  {testResult.annualReady ? <CheckCircle2 size={15} style={{ color: 'var(--wka-emerald)' }} /> : <AlertTriangle size={15} style={{ color: 'var(--wka-amber)' }} />}
                  <b>Annual (20% off)</b>
                  <span style={{ color: 'var(--wka-muted)' }}>{testResult.annualReady ? 'all three yearly prices valid, annual checkout live' : 'not fully set up, annual picks route to sign-up'}</span>
                </div>
                {PLAN_ROWS.map(([id, name]) => {
                  const a = (testResult.annualPlans && testResult.annualPlans[id]) || {}
                  if (!a.set) return null
                  return (
                    <div key={'a' + id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '3px 0 3px 22px' }}>
                      {a.ok ? <CheckCircle2 size={14} style={{ color: 'var(--wka-emerald)', flexShrink: 0 }} /> : <XCircle size={14} style={{ color: 'var(--wka-red)', flexShrink: 0 }} />}
                      <span style={{ color: 'var(--wka-muted)' }}>{name} annual: {a.ok ? `${money(a.amount, a.currency)} / ${a.interval}` : (a.error || 'not set')}</span>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="desc">Paste your Stripe keys and the three plan ids here. Each plan takes a price id (price_...) or a product id (prod_...), whichever you copy from Stripe. The secret key and webhook secret are write-only: once saved they are never shown again, and leaving them blank keeps the stored value. Values set here take priority over environment variables.</p>

            <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
              <div className="wka-field">
                <label>Secret key {secretSet ? <span style={{ color: 'var(--wka-emerald)' }}>(set)</span> : <span style={{ color: 'var(--wka-red)' }}>(not set)</span>}</label>
                <input className="wka-input" type="password" autoComplete="off" placeholder={secretSet ? 'Set. Type a new key to replace it.' : 'sk_live_... or sk_test_...'}
                  value={form.secretKey} onChange={set('secretKey')} disabled={!isSuperAdmin} />
                <span className="hint">Server side only. Never leaves the server and is never shown back.</span>
              </div>

              <div className="wka-field">
                <label>Webhook signing secret {webhookSet ? <span style={{ color: 'var(--wka-emerald)' }}>(set)</span> : <span style={{ color: 'var(--wka-red)' }}>(not set)</span>}</label>
                <input className="wka-input" type="password" autoComplete="off" placeholder={webhookSet ? 'Set. Type a new secret to replace it.' : 'whsec_...'}
                  value={form.webhookSecret} onChange={set('webhookSecret')} disabled={!isSuperAdmin} />
                <span className="hint">From the webhook endpoint you create in Stripe (see below).</span>
              </div>

              <div className="wka-field">
                <label>Basic plan price or product id</label>
                <input className="wka-input" placeholder="price_... or prod_..." value={form.priceBasic} onChange={set('priceBasic')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>Advanced plan price or product id</label>
                <input className="wka-input" placeholder="price_... or prod_..." value={form.priceAdvanced} onChange={set('priceAdvanced')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>Premium plan price or product id</label>
                <input className="wka-input" placeholder="price_... or prod_..." value={form.pricePremium} onChange={set('pricePremium')} disabled={!isSuperAdmin} />
              </div>

              <p className="desc" style={{ marginTop: 4 }}>Annual plan ids (optional, 20% off). Create a yearly recurring price (interval = year) for each plan in Stripe and paste its id here. Annual checkout only goes live when all three are set; until then an annual pick on the site shows the discounted price and routes to sign-up.</p>
              <div className="wka-field">
                <label>Basic plan, annual price or product id</label>
                <input className="wka-input" placeholder="price_... (yearly)" value={form.priceBasicAnnual} onChange={set('priceBasicAnnual')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>Advanced plan, annual price or product id</label>
                <input className="wka-input" placeholder="price_... (yearly)" value={form.priceAdvancedAnnual} onChange={set('priceAdvancedAnnual')} disabled={!isSuperAdmin} />
              </div>
              <div className="wka-field">
                <label>Premium plan, annual price or product id</label>
                <input className="wka-input" placeholder="price_... (yearly)" value={form.pricePremiumAnnual} onChange={set('pricePremiumAnnual')} disabled={!isSuperAdmin} />
              </div>

              <div className="wka-field">
                <label>Publishable key (optional)</label>
                <input className="wka-input" placeholder="pk_live_... or pk_test_..." value={form.publishableKey} onChange={set('publishableKey')} disabled={!isSuperAdmin} />
                <span className="hint">Not required for Checkout. Stored for any future in-page card form.</span>
              </div>

              <div className={`wka-toggle${form.enabled ? ' on' : ''}${!isSuperAdmin ? ' disabled' : ''}`} onClick={() => isSuperAdmin && setForm((f) => ({ ...f, enabled: !f.enabled }))} role="switch" aria-checked={form.enabled}>
                <span className="track"><span className="knob" /></span>
                <span style={{ fontWeight: 600 }}>{form.enabled ? 'Billing on: the stored keys are used' : 'Billing off: the stored keys are ignored (env vars, if set, still apply)'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="wka-btn primary" disabled={!isSuperAdmin || saving} onClick={save}>
                  {saving ? <Spinning /> : null} Save configuration
                </button>
                {(secretSet || pricesSet) && (
                  <button type="button" className="wka-btn ghost" disabled={saving} onClick={() => { setSaveError(null); load() }}>Cancel</button>
                )}
                <SavedTag show={saved} />
              </div>
              {saveError ? <ErrorBox error={saveError} /> : null}
            </div>
          </>
        )}
      </div>

      <div className="wka-panel">
        <h2><Link2 size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Webhook endpoint</h2>
        <p className="desc">In the Stripe dashboard, add a webhook endpoint pointing at the URL below and subscribe it to checkout.session.completed, customer.subscription.updated, customer.subscription.deleted and invoice.payment_failed. Then paste its signing secret above.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <code className="wka-mono" style={{ background: 'var(--wka-bg-2)', border: '1px solid var(--wka-line)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{state.webhookUrl}</code>
          <button type="button" className="wka-btn sm ghost" onClick={copyWebhook}>{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Live state</h2>
        <p className="desc">Whether WorkCoPilot can take payments right now.</p>
        <StateRow ok={secretSet} label={secretSet ? 'Secret key is set' : 'No secret key'} detail={secretSet ? (b.hasSecretKey ? 'Stored in the console.' : 'Provided by an environment variable.') : 'Add a Stripe secret key so checkout can run.'} />
        <StateRow ok={webhookSet} label={webhookSet ? 'Webhook secret is set' : 'No webhook secret'} detail={webhookSet ? (b.hasWebhookSecret ? 'Stored in the console.' : 'Provided by an environment variable.') : 'Webhook events will be acknowledged but not processed until this is set.'} />
        <StateRow ok={pricesSet} label={pricesSet ? 'All three plan price ids are set' : 'Plan price ids are incomplete'} detail={pricesSet ? 'Basic, Advanced and Premium are mapped.' : 'Set the Basic, Advanced and Premium price ids so each plan can be purchased.'} />
        <StateRow ok={ready} label={ready ? 'Billing is ready' : 'Billing is not ready yet'} detail={ready ? 'Users can subscribe and the subscription gate is active.' : 'Until a secret key and all three price ids are set (and billing is on), the service runs without the paywall.'} />
      </div>
    </div>
  )
}
