// Pricing: bound to GET /api/work/pricing, saved via POST /api/work/admin/pricing
// (superadmin-only). Fields mirror the store pricing shape exactly:
//   { currency, plans:{basic,advanced,premium}, hour:{...}, image:{...}, imageMinBulk }
// The Premium daily image cap (5/day) is a fixed product rule, not part of the
// stored pricing object, so it is shown read-only rather than as a control that
// could not actually save.
//
// UX: pricing always has values (the server seeds defaults), so after loading -
// and after a successful save - the whole editor COLLAPSES to one compact record
// summary with an Edit button; editing reopens all the panels plus Save/Cancel.
// Cancel reverts the form to the last-saved values. Non-superadmins only ever see
// the record (no Edit button).
import React, { useEffect, useState, useCallback } from 'react'
import { Save, Lock, Info, X } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, RecRow, EditToggle } from './_shared.jsx'

const TIERS = ['lite', 'basic', 'advanced', 'premium']

function num(v) { const n = Number(v); return isFinite(n) ? n : NaN }
// Normalize a pricing payload from the server into the editable form shape.
function formFrom(p) {
  return {
    currency: p.currency || 'usd',
    plans: { ...p.plans },
    hour: { ...p.hour },
    image: { ...p.image },
    imageMinBulk: p.imageMinBulk,
    tasks: { ...(p.tasks || {}) },
    replans: { ...(p.replans || {}) },
    dailyHours: { ...(p.dailyHours || {}) },
    imagesPerDay: { ...(p.imagesPerDay || {}) },
  }
}

export default function Pricing({ isSuperAdmin }) {
  const [state, setState] = useState({ loading: true, error: null })
  const [form, setForm] = useState(null)
  const [baseline, setBaseline] = useState(null)   // last-saved values, for Cancel
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setState({ loading: true, error: null })
    try {
      const p = await workAdminApi.getPricing()
      const f = formFrom(p)
      setForm(f); setBaseline(f); setEditing(false)   // start collapsed on the record
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
    for (const t of TIERS) { const n = num((form.dailyHours || {})[t]); if (isNaN(n) || n < 0 || n > 24) return true }
    for (const t of TIERS) { const n = num((form.imagesPerDay || {})[t]); if (isNaN(n) || n < 0 || !Number.isInteger(n) || n > 1000) return true }
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
        dailyHours: Object.fromEntries(TIERS.map((t) => [t, num((form.dailyHours || {})[t])])),
        imagesPerDay: Object.fromEntries(TIERS.map((t) => [t, num((form.imagesPerDay || {})[t])])),
      }
      const p = await workAdminApi.setPricing(patch)
      const f = formFrom(p)
      setForm(f); setBaseline(f); setEditing(false)   // collapse back to the record
      setSaved(true)
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  const cancel = () => { setForm(baseline); setSaveError(null); setSaved(false); setEditing(false) }

  if (state.loading) return <Loading label="Loading pricing" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!form) return null

  const disabled = !isSuperAdmin
  const cur = String(form.currency || 'usd').toUpperCase()
  const money = (v) => { const n = num(v); return isNaN(n) ? '-' : `$${n}` }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const Money = ({ group, tier }) => (
    <div className="wka-field">
      <label>{cap(tier)}</label>
      <div className="wka-inline-money">
        <span className="sym">$</span>
        <input className="wka-input" type="number" min="0" step="0.01" disabled={disabled}
          value={form[group][tier]} onChange={(e) => setField(group, tier, e.target.value)} />
      </div>
    </div>
  )

  // ---- Collapsed record view: one compact summary of every key value ----
  if (!editing) {
    return (
      <div>
        {disabled ? <div className="wka-note"><Lock size={14} /> Editing pricing requires superadmin access. Values below are read-only for you.</div> : null}
        <div className="wka-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0 }}>Pricing</h2>
            <EditToggle editing={editing} disabled={disabled} onEdit={() => { setForm(baseline); setEditing(true); setSaveError(null) }} />
          </div>
          <p className="desc">What each tier costs and the per-tier limits. {disabled ? '' : 'Click Edit to change any of it.'}</p>
          <div className="wka-record">
            <RecRow label="Currency" value={cur} />
            {TIERS.map((t) => (
              <RecRow key={t} label={cap(t)} value={`${money(form.plans[t])}/mo  ·  ${(form.dailyHours || {})[t] == null ? '-' : form.dailyHours[t]} hrs/day  ·  ${form.tasks[t] == null ? '-' : form.tasks[t]} tasks/day  ·  ${(form.replans || {})[t] == null ? '-' : form.replans[t]} re-plans  ·  ${money(form.hour[t])}/extra hr  ·  ${money(form.image[t])}/image`} />
            ))}
            <RecRow label="Corporate" value="Unlimited tasks and re-plans" />
            <RecRow label="Bulk minimum" value={`${form.imageMinBulk} images`} />
            <RecRow label="Free images per day" value={TIERS.map((t) => `${cap(t)} ${(form.imagesPerDay || {})[t] == null ? '-' : form.imagesPerDay[t]}`).join('  ·  ')} />
          </div>
          <SavedTag show={saved} />
        </div>
      </div>
    )
  }

  // ---- Edit view: all the panels + Save / Cancel ----
  return (
    <div>
      {disabled ? <div className="wka-note"><Lock size={14} /> Editing pricing requires superadmin access. Values below are read-only for you.</div> : null}

      <div className="wka-panel">
        <h2>Monthly plan price</h2>
        <p className="desc">What each tier costs per month. The daily guiding hours each tier includes are set below.</p>
        <div className="wka-grid">{TIERS.map((t) => <Money key={t} group="plans" tier={t} />)}</div>
      </div>

      <div className="wka-panel">
        <h2>Daily included hours, per tier</h2>
        <p className="desc">How many hours of real guiding time each tier includes per day (the "bucket"). This is the daily allowance; extra hours beyond it are billed at the per-tier rate below. A change here applies to every user immediately. Fractional hours are allowed (e.g. 1.5). Resets 11:59 PM ET.</p>
        <div className="wka-grid">{TIERS.map((t) => (
          <div className="wka-field" key={t}>
            <label>{cap(t)}</label>
            <input className="wka-input" type="number" min="0" max="24" step="0.25" disabled={disabled}
              value={(form.dailyHours || {})[t] == null ? '' : form.dailyHours[t]} onChange={(e) => setField('dailyHours', t, e.target.value)} />
            <span className="hint">hours per day</span>
          </div>
        ))}</div>
      </div>

      <div className="wka-panel">
        <h2>Daily task limit, per tier</h2>
        <p className="desc">Maximum guided tasks (sessions) a user can start per day. Users must finish the current task before starting a new one, and spend their minutes inside each task. Resets 11:59 PM ET. Corporate (company) accounts are unlimited.</p>
        <div className="wka-grid">{TIERS.map((t) => (
          <div className="wka-field" key={t}>
            <label>{cap(t)}</label>
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
            <label>{cap(t)}</label>
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
            <label>Currency</label>
            <input className="wka-input" value={cur} disabled={disabled}
              onChange={(e) => setTop('currency', e.target.value.toLowerCase())} />
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>Free images per day, per tier</h2>
        <p className="desc">How many images each tier may generate for free per day (0 = none). Beyond this daily allowance, images are billed at the per-tier price above. A change here applies to every user immediately. Resets 11:59 PM ET.</p>
        <div className="wka-grid">{TIERS.map((t) => (
          <div className="wka-field" key={t}>
            <label>{cap(t)}</label>
            <input className="wka-input" type="number" min="0" max="1000" step="1" disabled={disabled}
              value={(form.imagesPerDay || {})[t] == null ? '' : form.imagesPerDay[t]} onChange={(e) => setField('imagesPerDay', t, e.target.value)} />
            <span className="hint">free images per day</span>
          </div>
        ))}</div>
      </div>

      {saveError ? <div style={{ marginBottom: 14 }}><ErrorBox error={saveError} /></div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" className="wka-btn primary" disabled={disabled || saving || invalid} onClick={save}>
          {saving ? <Spinning /> : <Save size={15} />} Save pricing
        </button>
        <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> Cancel</button>
        <SavedTag show={saved} />
        {invalid && !disabled ? <span style={{ color: 'var(--wka-amber)', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Info size={13} /> All prices must be zero or more; bulk minimum at least 1.</span> : null}
      </div>
    </div>
  )
}
