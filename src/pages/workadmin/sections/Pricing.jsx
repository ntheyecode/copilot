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
import { useT } from '../../../i18n/index.jsx'

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
    tasksPerExtraHour: p.tasksPerExtraHour,
  }
}

export default function Pricing({ isSuperAdmin }) {
  const t = useT()
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
    const tph = num(form.tasksPerExtraHour); if (isNaN(tph) || tph < 0 || !Number.isInteger(tph) || tph > 100) return true
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
        tasksPerExtraHour: num(form.tasksPerExtraHour),
      }
      const p = await workAdminApi.setPricing(patch)
      const f = formFrom(p)
      setForm(f); setBaseline(f); setEditing(false)   // collapse back to the record
      setSaved(true)
    } catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  const cancel = () => { setForm(baseline); setSaveError(null); setSaved(false); setEditing(false) }

  if (state.loading) return <Loading label={t('pricingAdmin.loading')} />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />
  if (!form) return null

  const disabled = !isSuperAdmin
  const cur = String(form.currency || 'usd').toUpperCase()
  const money = (v) => { const n = num(v); return isNaN(n) ? '-' : `$${n}` }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const Money = ({ group, tier }) => (
    <div className="wka-field">
      <label>{t('pricingAdmin.tiers.' + tier)}</label>
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
        {disabled ? <div className="wka-note"><Lock size={14} /> {t('pricingAdmin.superadminNote')}</div> : null}
        <div className="wka-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 style={{ margin: 0 }}>{t('pricingAdmin.record.title')}</h2>
            <EditToggle editing={editing} disabled={disabled} onEdit={() => { setForm(baseline); setEditing(true); setSaveError(null) }} />
          </div>
          <p className="desc">{t('pricingAdmin.record.desc')} {disabled ? '' : t('pricingAdmin.record.descEdit')}</p>
          <div className="wka-record">
            <RecRow label={t('pricingAdmin.record.currency')} value={cur} />
            {TIERS.map((tier) => (
              <RecRow key={tier} label={t('pricingAdmin.tiers.' + tier)} value={t('pricingAdmin.record.tierSummary', { price: money(form.plans[tier]), hours: (form.dailyHours || {})[tier] == null ? '-' : form.dailyHours[tier], tasks: form.tasks[tier] == null ? '-' : form.tasks[tier], replans: (form.replans || {})[tier] == null ? '-' : form.replans[tier], extraHr: money(form.hour[tier]), image: money(form.image[tier]) })} />
            ))}
            <RecRow label={t('pricingAdmin.record.corporate')} value={t('pricingAdmin.record.corporateValue')} />
            <RecRow label={t('pricingAdmin.record.bulkMin')} value={t('pricingAdmin.record.bulkMinValue', { count: form.imageMinBulk })} />
            <RecRow label={t('pricingAdmin.record.bonusTasks')} value={t.n('pricingAdmin.record.bonusTasksValue', form.tasksPerExtraHour, { count: form.tasksPerExtraHour == null ? '-' : form.tasksPerExtraHour })} />
            <RecRow label={t('pricingAdmin.record.freeImages')} value={TIERS.map((tier) => `${t('pricingAdmin.tiers.' + tier)} ${(form.imagesPerDay || {})[tier] == null ? '-' : form.imagesPerDay[tier]}`).join('  ·  ')} />
          </div>
          <SavedTag show={saved} />
        </div>
      </div>
    )
  }

  // ---- Edit view: all the panels + Save / Cancel ----
  return (
    <div>
      {disabled ? <div className="wka-note"><Lock size={14} /> {t('pricingAdmin.superadminNote')}</div> : null}

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.monthly.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.monthly.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => <Money key={tier} group="plans" tier={tier} />)}</div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.dailyHours.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.dailyHours.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" max="24" step="0.25" disabled={disabled}
              value={(form.dailyHours || {})[tier] == null ? '' : form.dailyHours[tier]} onChange={(e) => setField('dailyHours', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.dailyHours.hint')}</span>
          </div>
        ))}</div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.dailyTasks.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.dailyTasks.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" step="1" disabled={disabled}
              value={form.tasks[tier] == null ? '' : form.tasks[tier]} onChange={(e) => setField('tasks', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.dailyTasks.hint')}</span>
          </div>
        ))}
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.corporate')}</label>
            <input className="wka-input" value={t('pricingAdmin.edit.unlimited')} readOnly disabled />
            <span className="hint">{t('pricingAdmin.edit.noDailyTaskCap')}</span>
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.replans.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.replans.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" step="1" disabled={disabled}
              value={(form.replans || {})[tier] == null ? '' : form.replans[tier]} onChange={(e) => setField('replans', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.replans.hint')}</span>
          </div>
        ))}
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.corporate')}</label>
            <input className="wka-input" value={t('pricingAdmin.edit.unlimited')} readOnly disabled />
            <span className="hint">{t('pricingAdmin.edit.noReplanCap')}</span>
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.extraHour.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.extraHour.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => <Money key={tier} group="hour" tier={tier} />)}</div>
        <div className="wka-grid" style={{ marginTop: 16 }}>
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.extraHour.bonusLabel')}</label>
            <input className="wka-input" type="number" min="0" max="100" step="1" disabled={disabled}
              value={form.tasksPerExtraHour == null ? '' : form.tasksPerExtraHour} onChange={(e) => setTop('tasksPerExtraHour', e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.extraHour.bonusHint')}</span>
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.image.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.image.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => <Money key={tier} group="image" tier={tier} />)}</div>
        <div className="wka-grid" style={{ marginTop: 16 }}>
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.image.bulkLabel')}</label>
            <input className="wka-input" type="number" min="1" step="1" disabled={disabled}
              value={form.imageMinBulk} onChange={(e) => setTop('imageMinBulk', e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.image.bulkHint')}</span>
          </div>
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.currency')}</label>
            <input className="wka-input" value={cur} disabled={disabled}
              onChange={(e) => setTop('currency', e.target.value.toLowerCase())} />
          </div>
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.freeImages.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.freeImages.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" max="1000" step="1" disabled={disabled}
              value={(form.imagesPerDay || {})[tier] == null ? '' : form.imagesPerDay[tier]} onChange={(e) => setField('imagesPerDay', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.freeImages.hint')}</span>
          </div>
        ))}</div>
      </div>

      {saveError ? <div style={{ marginBottom: 14 }}><ErrorBox error={saveError} /></div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" className="wka-btn primary" disabled={disabled || saving || invalid} onClick={save}>
          {saving ? <Spinning /> : <Save size={15} />} {t('pricingAdmin.edit.save')}
        </button>
        <button type="button" className="wka-btn ghost" disabled={saving} onClick={cancel}><X size={14} /> {t('pricingAdmin.edit.cancel')}</button>
        <SavedTag show={saved} />
        {invalid && !disabled ? <span style={{ color: 'var(--wka-amber)', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Info size={13} /> {t('pricingAdmin.edit.invalid')}</span> : null}
      </div>
    </div>
  )
}
