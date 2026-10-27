// "Plans at a glance" for the collapsed Pricing record: one row per tier with
// the monthly price, the included guided hours per month as a bar (relative to
// the most generous tier) and the guided tasks per day. Pure presentation over
// the saved pricing form; the editor stays the single place values change.
import React from 'react'
import { BarList, VIZ_CSS } from './_viz.jsx'
import { useT } from '../../../i18n/index.jsx'

const TIERS = ['lite', 'basic', 'advanced', 'premium']
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export default function PricingGlance({ form, money }) {
  const t = useT()
  const items = TIERS.map((tier) => ({
    key: tier,
    label: t('pricingAdmin.tiers.' + tier),
    sub: `${money(form.plans[tier])}${t('pricingAdmin.record.perMonthShort')}`,
    value: num((form.hoursMonthly || {})[tier]),
    valueLabel: t('pricingAdmin.record.glanceLine', { hours: num((form.hoursMonthly || {})[tier]), tasks: form.tasks[tier] == null ? '-' : form.tasks[tier] }),
  }))
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--wka-line)' }}>
      <style>{VIZ_CSS}</style>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--wka-faint)', marginBottom: 10 }}>{t('pricingAdmin.record.glanceTitle')}</div>
      <BarList items={items} ariaLabel={t('pricingAdmin.record.glanceTitle')} />
      <div style={{ fontSize: 11.5, color: 'var(--wka-faint)', marginTop: 8 }}>{t('pricingAdmin.record.glanceFoot')}</div>
    </div>
  )
}
