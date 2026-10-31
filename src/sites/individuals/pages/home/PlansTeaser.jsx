// Home PLANS: pay for guided time, the compact plan cards with live numbers
// and the link to the pricing page. Strings: indiv.home.plans.*.
import { ArrowRight } from 'lucide-react'
import PlanCards from '../../PlanCards.jsx'

export default function PlansTeaser({ t, model, loading }) {
  return (
    <section className="ln-sec" aria-labelledby="lnhm-plans">
      <style>{CSS}</style>
      <div className="ln-wrap">
        <div className="lnhm-plans-head" data-reveal>
          <div>
            <div className="ln-eyebrow">{t('indiv.home.plans.eyebrow')}</div>
            <h2 id="lnhm-plans">{t.rich('indiv.home.plans.h2')}</h2>
            <p>{t('indiv.home.plans.p')}</p>
          </div>
          <a className="ln-btn primary" href="/workcopilot/pricing">{t('indiv.home.plans.cta')} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
        </div>
        <PlanCards model={model} loading={loading} compact />
      </div>
    </section>
  )
}

const CSS = `
.lnhm-plans-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:40px;flex-wrap:wrap}
.lnhm-plans-head>div{max-width:640px}
.lnhm-plans-head p{margin-top:14px;font-size:17.5px}
.lnhm-plans-head .ln-btn{flex:0 0 auto;margin-bottom:6px}
@media (max-width:640px){.lnhm-plans-head .ln-btn{width:100%}}
`
