// The selected plan, one compact row, with an inline "Change plan" picker
// (plan list + monthly/annual). Before an account exists the choice is kept in
// the URL/localStorage intent; once the server knows the account it is saved
// there (POST /onboarding/plan) so no later screen depends on the browser.
import { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import { api } from '../../api.js'
import { PLAN_IDS, priceLine, money, saveIntent } from './planIntent.js'

export default function PlanSummary({ state, intent, onIntent, onState, hasAccount = false }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pricing = state && state.pricing
  const annualReady = !!(state && state.annualReady)
  const plan = (hasAccount && state && state.plan) || intent.plan || ''
  const rawCycle = (hasAccount && state && state.cycle) || intent.cycle || 'monthly'
  // Annual is only offered when its Stripe prices are wired (annualReady). An
  // annual pick on a deployment without them falls back to monthly VISIBLY (the
  // note below), never silently charged a different amount.
  const annualFallback = rawCycle === 'annual' && !annualReady
  const cycle = annualFallback ? 'monthly' : rawCycle
  const name = plan ? t(`onboarding.plan.names.${plan}`) : ''
  useEffect(() => {
    if (!annualFallback || !plan) return
    saveIntent({ plan, cycle: 'monthly' })
    onIntent && onIntent({ plan, cycle: 'monthly' })
    if (hasAccount) api.onboardingPlan(plan, 'monthly').then((r) => onState && onState(r)).catch(() => {})
  }, [annualFallback, plan, hasAccount])   // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (p, c) => {
    const next = { plan: p, cycle: c }
    saveIntent(next)
    onIntent && onIntent(next)
    if (hasAccount) {
      setBusy(true)
      try { const r = await api.onboardingPlan(p, c); onState && onState(r) } catch { /* the state refresh picks it up */ } finally { setBusy(false) }
    }
  }
  const pickerId = 'ob-picker'

  return (
    <section className="ob-plan" aria-label={t('onboarding.plan.selected')}>
      <div className="ob-plan-row">
        <div className="ob-plan-main">
          <div className="ob-plan-k">{plan ? t('onboarding.plan.selected') : t('onboarding.plan.none')}</div>
          {plan
            ? <div className="ob-plan-n">{name} <span className="ob-plan-c">{cycle === 'annual' ? t('onboarding.plan.annual') : t('onboarding.plan.monthly')}</span></div>
            : <div className="ob-plan-n ob-plan-n-muted">{t('onboarding.plan.choose')}</div>}
          {plan && <div className="ob-plan-p">{priceLine(t, pricing, plan, cycle)}</div>}
        </div>
        <button type="button" className="ob-link ob-plan-change" aria-expanded={open} aria-controls={pickerId} onClick={() => setOpen((v) => !v)}>
          {open ? t('onboarding.plan.done') : (plan ? t('onboarding.plan.change') : t('onboarding.plan.choose'))}
          <ChevronDown size={14} aria-hidden="true" className={`ob-chev${open ? ' up' : ''}`} />
        </button>
      </div>
      {open && (
        <div id={pickerId} className="ob-picker" aria-busy={busy}>
          <div className="ob-seg" role="radiogroup" aria-label={t('onboarding.plan.cycleAria')}>
            {['monthly', 'annual'].map((c) => {
              const dis = c === 'annual' && !annualReady
              return (
                <button key={c} type="button" role="radio" aria-checked={cycle === c} className={`ob-seg-b${cycle === c ? ' on' : ''}`} disabled={dis || busy} title={dis ? t('onboarding.plan.annualUnavailable') : undefined} onClick={() => plan ? choose(plan, c) : (onIntent && onIntent({ plan, cycle: c }))}>
                  {t(`onboarding.plan.${c}`)}{c === 'annual' && !dis && <em>{t('onboarding.plan.annualSave')}</em>}
                </button>
              )
            })}
          </div>
          <ul className="ob-plans" role="radiogroup" aria-label={t('onboarding.plan.pickerAria')}>
            {PLAN_IDS.map((p) => {
              const list = pricing && pricing.plans && pricing.plans[p] != null ? Number(pricing.plans[p]) : null
              const shown = list == null ? '' : money(cycle === 'annual' ? Math.round(list * 0.8) : list)
              const on = p === plan
              return (
                <li key={p}>
                  <button type="button" role="radio" aria-checked={on} className={`ob-plan-opt${on ? ' on' : ''}`} disabled={busy} onClick={() => choose(p, cycle)}>
                    <span className="ob-plan-opt-n">{t(`onboarding.plan.names.${p}`)}</span>
                    <span className="ob-plan-opt-p">{shown && <>{shown}<small>/mo</small></>}</span>
                    <span className="ob-plan-opt-i" aria-hidden="true">{on && <Check size={14} />}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {annualFallback && <p className="ob-note">{t('onboarding.plan.annualUnavailable')}</p>}
        </div>
      )}
    </section>
  )
}
