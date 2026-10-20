// Billing: the Stripe configuration for WorkCoPilot, set from the console so a
// superadmin never has to touch the environment. Two secrets (the secret key
// and the webhook signing secret) are write-only: they are never shown back, and
// leaving a field blank keeps whatever is stored. The three price ids and the
// optional publishable key are plain text and can be edited or cleared.
//
// Nothing here ever displays a stored secret value (SUPREME RULE III style: the
// state is surfaced plainly as configured / not configured, never leaked).
import React, { useEffect, useState, useCallback } from 'react'
import { Lock, CheckCircle2, XCircle, CreditCard, Link2, Copy, Check } from 'lucide-react'
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

export default function Billing({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null, billing: null, webhookUrl: '', envFallback: null })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  // Form fields. Secrets start blank (write-only); blank on save keeps stored.
  const [form, setForm] = useState({ secretKey: '', webhookSecret: '', priceBasic: '', priceAdvanced: '', pricePremium: '', publishableKey: '', enabled: true })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await workAdminApi.getBilling()
      const b = data.billing || {}
      setState({ loading: false, error: null, billing: b, webhookUrl: data.webhookUrl || '', envFallback: data.envFallback || null })
      setForm({
        secretKey: '', webhookSecret: '',
        priceBasic: b.priceBasic || '', priceAdvanced: b.priceAdvanced || '', pricePremium: b.pricePremium || '',
        publishableKey: b.publishableKey || '', enabled: b.enabled !== false,
      })
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
        publishableKey: form.publishableKey, enabled: !!form.enabled,
      }
      if (form.secretKey.trim()) patch.secretKey = form.secretKey.trim()
      if (form.webhookSecret.trim()) patch.webhookSecret = form.webhookSecret.trim()
      const data = await workAdminApi.setBilling(patch)
      const b = data.billing || {}
      setState((s) => ({ ...s, billing: b }))
      setForm((f) => ({ ...f, secretKey: '', webhookSecret: '' }))   // clear the write-only fields
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
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

  return (
    <div>
      {!isSuperAdmin ? <div className="wka-note"><Lock size={14} /> Only a superadmin can change the billing configuration. The current state is shown below.</div> : null}

      <div className="wka-panel">
        <h2><CreditCard size={15} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--wka-cyan)' }} />Stripe configuration</h2>
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
          <div className="wka-field">
            <label>Publishable key (optional)</label>
            <input className="wka-input" placeholder="pk_live_... or pk_test_..." value={form.publishableKey} onChange={set('publishableKey')} disabled={!isSuperAdmin} />
            <span className="hint">Not required for Checkout. Stored for any future in-page card form.</span>
          </div>

          <div className={`wka-toggle${form.enabled ? ' on' : ''}${!isSuperAdmin ? ' disabled' : ''}`} onClick={() => isSuperAdmin && setForm((f) => ({ ...f, enabled: !f.enabled }))} role="switch" aria-checked={form.enabled}>
            <span className="track"><span className="knob" /></span>
            <span style={{ fontWeight: 600 }}>{form.enabled ? 'Billing on: the stored keys are used' : 'Billing off: the stored keys are ignored (env vars, if set, still apply)'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="wka-btn primary" disabled={!isSuperAdmin || saving} onClick={save}>
              {saving ? <Spinning /> : null} Save configuration
            </button>
            <SavedTag show={saved} />
          </div>
          {saveError ? <ErrorBox error={saveError} /> : null}
        </div>
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
