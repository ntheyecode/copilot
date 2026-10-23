// Pricing: bound to GET /api/work/pricing, saved via POST /api/work/admin/pricing
// (superadmin-only). Fields mirror the store pricing shape exactly:
//   { currency, plans:{basic,advanced,premium}, hour:{...}, image:{...}, imageMinBulk }
// The Premium daily image cap (5/day) is a fixed product rule, not part of the
// stored pricing object, so it is shown read-only rather than as a control that
// could not actually save.
import React, { useEffect, useState, useCallback } from 'react'
import { Save, Lock, Info } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag } from './_shared.jsx'

const TIERS = ['basic', 'advanced', 'premium']
const PREMIUM_DAILY_IMAGE_CAP = 5

function num(v) { const n = Number(v); return isFinite(n) ? n : NaN }

export default function Pricing({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const p = await workAdminApi.getPricing()
      setForm({
        currency: p.currency || 'usd',
        plans: { ...p.plans },
        hour: { ...p.hour },
        image: { ...p.image },
        imageMinBulk: p.imageMinBulk,
        tasks: { ...(p.tasks || {}) },
        replans: { ...(p.replans || {}) },
      })
      setState({ loading: false, error: null })
    } catch (error) { setState({ loading: false, error }) }
  }, [])

  useEffect(() => { load() }, [load])

  const setField = (group, tier, value) => {
    setSaved(false)
    setForm((f) => ({ ...f, [group]: { ...f[group], [tier]: value } }))
  }
  const setTop = (key, value) => { setSaved(false); setForm((f) => ({ ...f, [key]: value })) }

  const invalid = (() => {
    if (!form) return true
    const groups = ['plans', 'hour', 'image']
    for (const g of groups) for (const t of TIERS) { const n = num(form[g][t]); if (isNaN(n) || n < 0) return true }
    const mb = num(form.imageMinBulk); if (isNaN(mb) || mb < 1) return true
    for (const t of TIERS) { const n = num(form.tasks[t]); if (isNaN(n) || n < 0 || !Number.isInteger(n) || n > 1000) return true }
    for (const t of TIERS) { const n = num((form.replans || {})[t]); if (isNaN(n) || n < 0 || !Number.isInteger(n) || n > 1000) return true }
    return false
  })()

  const save = async () => {
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const patch = {
        currency: form.currency,
        plans: Object.fromEntries(TIERS.map((t) => [t, num(form.plans[t])])),
        hour: Object.fromEntries(TIERS.map((t) => [t, num(form.hour[t])])),
        image: Object.fromEntries(TIERS.map((t) => [t, num(form.image[t])])),
        imageMinBulk: num(form.imageMinBulk),
        tasks: Object.fromEntries(TIERS.map((t) => [t, num(form.tasks[t])])),
        replans: Object.fromEntries(TIERS.map((t) => [t, num((form.replans || {})[t])])),
      }
      const p = await workAdminApi.setPricing(patch)
      setForm({ currency: p.currency, plans: { ...p.plans }, hour: { ...p.hour }, image: { ...p.image }, imageMinBulk: p.imageMinBulk, tasks: { ...(p.tasks || {}) }, replans: { ...(p.replans || {}) } })
      setSaved(true)
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  if (state.loading) return <Loading label="Loading pricing" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!form) return null

  const disabled = !isSuperAdmin
  const Money = ({ group, tier }) => (
    <div className="wka-field">
      <label>{tier.charAt(0).toUpperCase() + tier.slice(1)}</label>
      <div className="wka-inline-money">
        <span className="sym">$</span>
        <input className="wka-input" type="number" min="0" step="0.01" disabled={disabled}
          value={form[group][tier]} onChange={(e) => setField(group, tier, e.target.value)} />
      </div>
    </div>
  )

  return (
    <div>
      {disabled ? <div className="wka-note"><Lock size={14} /> Editing pricing requires superadmin access. Values below are read-only for you.</div> : null}

      <div className="wka-panel">
        <h2>Monthly plan price</h2>
        <p className="desc">What each tier costs per month. Basic 2h/day, Advanced 4h/day, Premium 6h/day of real guiding time.</p>
        <div className="wka-grid">{TIERS.map((t) => <Money key={t} group="plans" tier={t} />)}</div>
      </div>

      <div className="wka-panel">
        <h2>Daily task limit, per tier</h2>
        <p className="desc">Maximum guided tasks (sessions) a user can start per day. Users must finish the current task before starting a new one, and spend their minutes inside each task. Resets 11:59 PM ET. Corporate (company) accounts are unlimited.</p>
        <div className="wka-grid">{TIERS.map((t) => (
          <div className="wka-field" key={t}>
            <label>{t.charAt(0).toUpperCase() + t.slice(1)}</label>
            <input className="wka-input" type="number" min="0" step="1" disabled={disabled}
              value={form.tasks[t] == null ? '' : form.tasks[t]} onChange={(e) => setField('tasks', t, e.target.value)} />
            <span className="hint">tasks per day</span>
          </div>
        ))}
          <div className="wka-field">
            <label>Corporate</label>
            <input className="wka-input" value="Unlimited" readOnly disabled />
            <span className="hint">Company accounts have no daily task cap.</span>
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Re-plans per task, per tier</h2>
        <p className="desc">How many times a user can re-plan a single task. A re-plan only re-adapts the steps to new information &mdash; it never changes the original request, so it is not a backdoor to a new task. Counts per task (not per day). Corporate (company) accounts are unlimited.</p>
        <div className="wka-grid">{TIERS.map((t) => (
          <div className="wka-field" key={t}>
            <label>{t.charAt(0).toUpperCase() + t.slice(1)}</label>
            <input className="wka-input" type="number" min="0" step="1" disabled={disabled}
              value={(form.replans || {})[t] == null ? '' : form.replans[t]} onChange={(e) => setField('replans', t, e.target.value)} />
            <span className="hint">re-plans per task</span>
          </div>
        ))}
          <div className="wka-field">
            <label>Corporate</label>
            <input className="wka-input" value="Unlimited" readOnly disabled />
            <span className="hint">Company accounts have no re-plan cap.</span>
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Extra hour, per tier</h2>
        <p className="desc">Price of one additional hour beyond the daily allowance. Purchased hours never expire.</p>
        <div className="wka-grid">{TIERS.map((t) => <Money key={t} group="hour" tier={t} />)}</div>
      </div>

      <div className="wka-panel">
        <h2>Image generation, per tier</h2>
        <p className="desc">Price per generated image. Purchased image credits never expire.</p>
        <div className="wka-grid">{TIERS.map((t) => <Money key={t} group="image" tier={t} />)}</div>
        <div className="wka-grid" style={{ marginTop: 16 }}>
          <div className="wka-field">
            <label>Bulk minimum (images)</label>
            <input className="wka-input" type="number" min="1" step="1" disabled={disabled}
              value={form.imageMinBulk} onChange={(e) => setTop('imageMinBulk', e.target.value)} />
            <span className="hint">Smallest image bundle a user can buy.</span>
          </div>
          <div className="wka-field">
            <label>Premium daily image cap</label>
            <input className="wka-input" value={`${PREMIUM_DAILY_IMAGE_CAP} per day`} readOnly disabled />
            <span className="hint">Fixed product rule, not part of editable pricing.</span>
          </div>
          <div className="wka-field">
            <label>Currency</label>
            <input className="wka-input" value={String(form.currency || 'usd').toUpperCase()} disabled={disabled}
              onChange={(e) => setTop('currency', e.target.value.toLowerCase())} />
          </div>
        </div>
      </div>

      {saveError ? <div style={{ marginBottom: 14 }}><ErrorBox error={saveError} /></div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" className="wka-btn primary" disabled={disabled || saving || invalid} onClick={save}>
          {saving ? <Spinning /> : <Save size={15} />} Save pricing
        </button>
        <SavedTag show={saved} />
        {invalid && !disabled ? <span style={{ color: 'var(--wka-amber)', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Info size={13} /> All prices must be zero or more; bulk minimum at least 1.</span> : null}
      </div>
    </div>
  )
}
