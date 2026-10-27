// Pricing: bound to GET /api/work/pricing, saved via POST /api/work/admin/pricing
// (superadmin-only). Fields mirror the store pricing shape exactly:
//   { currency, plans:{lite,basic,advanced,premium}, hour:{...}, image:{...},
//     imageMinBulk, replans:{...},
//     hoursMonthly:{...} (included guided hours per calendar MONTH),
//     hoursExpiry:{ mode:'forfeit'|'carryforward', carryCapHours:number|null },
//     imagesPerDay:{...} }
// The plan model (server/plan_allowance.js): each person has ONE monthly hours
// pool renewed on the first of the month; a change to hoursMonthly reaches every
// live pool at once as a delta. Hours are the only usage limit: there is NO
// per-day task cap any more (a person may keep a few tasks open at once, a fixed
// product rule, not pricing). The retired dailyHours / tasksPerExtraHour / tasks
// keys are never sent (the server rejects the first two with a 400 and ignores
// the last).
//
// UX: pricing always has values (the server seeds defaults), so after loading -
// and after a successful save - the whole editor COLLAPSES to one compact record
// summary (plus the plans-at-a-glance ladder) with an Edit button; editing
// reopens all the panels plus Save/Cancel. Cancel reverts the form to the
// last-saved values. Non-superadmins only ever see the record (no Edit button).
import React, { useEffect, useState, useCallback } from 'react'
import { Save, Lock, Info, X, CalendarClock } from 'lucide-react'
import { workAdminApi } from '../workAdminApi.js'
import { Loading, ErrorBox, Spinning, SavedTag, RecRow, EditToggle } from './_shared.jsx'
import PricingGlance from './PricingGlance.jsx'
import { useT } from '../../../i18n/index.jsx'

const TIERS = ['lite', 'basic', 'advanced', 'premium']
const MONTH_END_MODES = ['forfeit', 'carryforward']
// Validation ranges mirror server/store.js setWorkPricing exactly (one source of
// truth for the numbers; the form only pre-checks so Save is never a dead click).
const HOURS_MONTH_MAX = 744      // 31 days x 24 h
const CARRY_CAP_MAX = 100000
const COUNT_MAX = 1000

function num(v) { const n = Number(v); return isFinite(n) ? n : NaN }
const isCount = (v) => { const n = num(v); return !isNaN(n) && Number.isInteger(n) && n >= 0 && n <= COUNT_MAX }
// Normalize a pricing payload from the server into the editable form shape.
function formFrom(p) {
  const ex = (p.hoursExpiry && typeof p.hoursExpiry === 'object') ? p.hoursExpiry : {}
  return {
    currency: p.currency || 'usd',
    plans: { ...p.plans },
    hour: { ...p.hour },
    image: { ...p.image },
    imageMinBulk: p.imageMinBulk,
    replans: { ...(p.replans || {}) },
    hoursMonthly: { ...(p.hoursMonthly || {}) },
    hoursExpiry: { mode: MONTH_END_MODES.includes(ex.mode) ? ex.mode : 'forfeit', carryCapHours: ex.carryCapHours == null ? '' : String(ex.carryCapHours) },
    imagesPerDay: { ...(p.imagesPerDay || {}) },
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
  const setExpiry = (key, value) => { setSaved(false); setForm((f) => ({ ...f, hoursExpiry: { ...f.hoursExpiry, [key]: value } })) }

  const carry = !!form && form.hoursExpiry.mode === 'carryforward'
  const invalid = (() => {
    if (!form) return true
    const groups = ['plans', 'hour', 'image']
    for (const g of groups) for (const tier of TIERS) { const n = num(form[g][tier]); if (isNaN(n) || n < 0) return true }
    const mb = num(form.imageMinBulk); if (isNaN(mb) || mb < 1) return true
    for (const tier of TIERS) if (!isCount((form.replans || {})[tier])) return true
    for (const tier of TIERS) { const n = num((form.hoursMonthly || {})[tier]); if (isNaN(n) || n < 0 || n > HOURS_MONTH_MAX) return true }
    for (const tier of TIERS) if (!isCount((form.imagesPerDay || {})[tier])) return true
    if (carry && String(form.hoursExpiry.carryCapHours).trim() !== '') { const c = num(form.hoursExpiry.carryCapHours); if (isNaN(c) || c < 0 || c > CARRY_CAP_MAX) return true }
    return false
  })()

  const save = async () => {
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const cap = String(form.hoursExpiry.carryCapHours).trim()
      const patch = {
        currency: form.currency,
        plans: Object.fromEntries(TIERS.map((tier) => [tier, num(form.plans[tier])])),
        hour: Object.fromEntries(TIERS.map((tier) => [tier, num(form.hour[tier])])),
        image: Object.fromEntries(TIERS.map((tier) => [tier, num(form.image[tier])])),
        imageMinBulk: num(form.imageMinBulk),
        replans: Object.fromEntries(TIERS.map((tier) => [tier, num((form.replans || {})[tier])])),
        hoursMonthly: Object.fromEntries(TIERS.map((tier) => [tier, num((form.hoursMonthly || {})[tier])])),
        // The cap only means something when hours carry forward; forfeit sends null.
        hoursExpiry: { mode: form.hoursExpiry.mode, carryCapHours: carry && cap !== '' ? num(cap) : null },
        imagesPerDay: Object.fromEntries(TIERS.map((tier) => [tier, num((form.imagesPerDay || {})[tier])])),
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
  const hoursVal = (tier) => { const n = num((form.hoursMonthly || {})[tier]); return isNaN(n) ? '-' : n }

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

  // What happens to unused plan hours at month end, as one honest record line.
  const monthEndValue = form.hoursExpiry.mode === 'carryforward'
    ? (String(form.hoursExpiry.carryCapHours).trim() === '' ? t('pricingAdmin.record.monthEndCarryNoCap') : t('pricingAdmin.record.monthEndCarry', { cap: form.hoursExpiry.carryCapHours }))
    : t('pricingAdmin.record.monthEndForfeit')

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
              <RecRow key={tier} label={t('pricingAdmin.tiers.' + tier)} value={t('pricingAdmin.record.tierSummary', { price: money(form.plans[tier]), hours: hoursVal(tier), replans: (form.replans || {})[tier] == null ? '-' : form.replans[tier], extraHr: money(form.hour[tier]), image: money(form.image[tier]) })} />
            ))}
            <RecRow label={t('pricingAdmin.record.monthEnd')} value={monthEndValue} />
            <RecRow label={t('pricingAdmin.record.corporate')} value={t('pricingAdmin.record.corporateValue')} />
            <RecRow label={t('pricingAdmin.record.bulkMin')} value={t('pricingAdmin.record.bulkMinValue', { count: form.imageMinBulk })} />
            <RecRow label={t('pricingAdmin.record.freeImages')} value={TIERS.map((tier) => `${t('pricingAdmin.tiers.' + tier)} ${(form.imagesPerDay || {})[tier] == null ? '-' : form.imagesPerDay[tier]}`).join('  ·  ')} />
          </div>
          <PricingGlance form={form} money={money} />
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
        <h2>{t('pricingAdmin.edit.monthlyHours.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.monthlyHours.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" max={HOURS_MONTH_MAX} step="0.5" disabled={disabled}
              value={(form.hoursMonthly || {})[tier] == null ? '' : form.hoursMonthly[tier]} onChange={(e) => setField('hoursMonthly', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.monthlyHours.hint')}</span>
          </div>
        ))}</div>
      </div>

      <div className="wka-panel">
        <h2><CalendarClock size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--wka-accent)' }} />{t('pricingAdmin.edit.monthEnd.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.monthEnd.desc')}</p>
        <div className="wka-grid">
          <div className="wka-field">
            <label>{t('pricingAdmin.edit.monthEnd.mode')}</label>
            <select className="wka-select" value={form.hoursExpiry.mode} disabled={disabled} onChange={(e) => setExpiry('mode', e.target.value)}>
              <option value="forfeit">{t('pricingAdmin.edit.monthEnd.forfeit')}</option>
              <option value="carryforward">{t('pricingAdmin.edit.monthEnd.carryforward')}</option>
            </select>
            <span className="hint">{t('pricingAdmin.edit.monthEnd.modeHint')}</span>
          </div>
          {carry ? (
            <div className="wka-field">
              <label>{t('pricingAdmin.edit.monthEnd.cap')}</label>
              <input className="wka-input" type="number" min="0" max={CARRY_CAP_MAX} step="1" disabled={disabled} placeholder={t('pricingAdmin.edit.monthEnd.noCap')}
                value={form.hoursExpiry.carryCapHours} onChange={(e) => setExpiry('carryCapHours', e.target.value)} />
              <span className="hint">{t('pricingAdmin.edit.monthEnd.capHint')}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="wka-panel">
        <h2>{t('pricingAdmin.edit.replans.title')}</h2>
        <p className="desc">{t('pricingAdmin.edit.replans.desc')}</p>
        <div className="wka-grid">{TIERS.map((tier) => (
          <div className="wka-field" key={tier}>
            <label>{t('pricingAdmin.tiers.' + tier)}</label>
            <input className="wka-input" type="number" min="0" max={COUNT_MAX} step="1" disabled={disabled}
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
            <input className="wka-input" type="number" min="0" max={COUNT_MAX} step="1" disabled={disabled}
              value={(form.imagesPerDay || {})[tier] == null ? '' : form.imagesPerDay[tier]} onChange={(e) => setField('imagesPerDay', tier, e.target.value)} />
            <span className="hint">{t('pricingAdmin.edit.freeImages.hint')}</span>
          </div>
        ))}</div>
      </div>

      {saveError ? <div style={{ marginBottom: 14 }}><ErrorBox error={saveError} /></div> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
