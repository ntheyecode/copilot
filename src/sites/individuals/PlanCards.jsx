// The four plan cards (Lite to Premium) for the individuals site, used by the
// home teaser and the pricing page. Every number comes from the live pricing
// model; a value the API lacks is left out, never invented. The Start button
// carries the plan (and an annual pick) into the existing subscribe flow
// (/workcopilot/signup?plan=<id>&cycle=annual), the same hand-off the product
// already uses, so checkout is the real Stripe checkout.
import { ArrowRight, Check, Lock } from 'lucide-react'
import { useT } from '../../i18n/index.jsx'
import HoursBadge, { HOURS_BADGE_CSS } from '../../components/HoursBadge.jsx'
import { PLAN_IDS, money, hours, annualMonthlyRate, annualTotal, planHoursShare, planExpiryLine } from '../../pricingModel.js'

const PLAN_NAME = { lite: 'Lite', basic: 'Basic', advanced: 'Advanced', premium: 'Premium' }
const POPULAR = 'advanced'

export function startHref(id, annual) { return `/workcopilot/signup?plan=${id}${annual ? '&cycle=annual' : ''}` }

export default function PlanCards({ model, loading, annual = false, recommended = '', compact = false }) {
  const t = useT()
  const rate = (p) => (annual ? annualMonthlyRate(p) : p)
  return (
    <div className={'ivp-grid' + (compact ? ' compact' : '')}>
      <style>{HOURS_BADGE_CSS}{CSS}</style>
      {PLAN_IDS.map((id) => {
        const price = loading || !model ? null : model.plans[id]
        const h = loading || !model ? null : model.hoursMonthly[id]
        const meta = t(`pricing.plans.${id}`) || {}
        const isRec = recommended === id
        const isPop = !recommended && id === POPULAR
        return (
          <article key={id} id={`ivp-${id}`} className={'ivp-card' + (isPop || isRec ? ' lift' : '')} data-reveal aria-label={PLAN_NAME[id]}>
            {(isPop || isRec) && <span className="ivp-ribbon">{isRec ? t('indiv.pricing.recommended') : t('indiv.pricing.popular')}</span>}
            <div className="ivp-top">
              <h3>{PLAN_NAME[id]}</h3>
              <p className="ivp-value">{meta.value}</p>
            </div>
            <div className="ivp-badge">
              <HoursBadge size={compact ? 'sm' : 'md'} hours={h == null ? null : hours(h)} share={loading ? null : planHoursShare(model, id)} unit={t('pricing.badgeUnit')} sub={t('indiv.pricing.hoursSub')} loadingLabel={t('pricing.loading')} />
            </div>
            <div className={'ivp-price' + (loading ? ' skel' : '')} aria-busy={loading || undefined}>
              {loading || price == null ? <span className="ivp-skel" aria-label={t('pricing.loading')} /> : <><b>{money(rate(price))}</b><span>{t('indiv.common.perMonth')}</span></>}
            </div>
            <div className="ivp-cycle">
              {annual && price != null && !loading
                ? <><s>{money(price)}{t('indiv.common.perMonth')}</s> {t('home.pricing.billedAnnually')} &middot; {money(annualTotal(price))}{t('common.perYear')}</>
                : t('pricing.billedMonthly')}
            </div>
            {!compact && (
              <ul className="ivp-lines">
                {meta.highlight && <li><Check size={15} aria-hidden /> {meta.highlight}</li>}
                {model && <li><Check size={15} aria-hidden /> {planExpiryLine(model, t)}</li>}
                {model && model.hour[id] != null && <li><Check size={15} aria-hidden /> {t('pricing.extraHour', { price: money(model.hour[id]) })}</li>}
              </ul>
            )}
            <a className={'iv-btn ' + (isPop || isRec ? 'primary' : 'ghost')} href={startHref(id, annual)}>{t('indiv.common.start', { plan: PLAN_NAME[id] })} <ArrowRight size={15} aria-hidden className="iv-arrow" /></a>
            {!compact && <div className="ivp-secure"><Lock size={12} aria-hidden /> {t('indiv.pricing.secure')}</div>}
          </article>
        )
      })}
    </div>
  )
}

const CSS = `
.ivp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:stretch}
/* the badge reads the site tokens (its own rule sets defaults on .hbg itself, so this must target .hbg) */
.ivp-grid .hbg{--hbg-a:var(--iv-mint);--hbg-b:var(--iv-sky);--hbg-ink:var(--iv-ink);--hbg-mut:var(--iv-ink-2);--hbg-track:var(--iv-line);--hbg-disc:var(--iv-paper-2)}
.ivp-card{position:relative;display:flex;flex-direction:column;gap:12px;background:var(--iv-paper-2);border:1px solid var(--iv-line);border-radius:var(--iv-r);padding:24px 22px;box-shadow:var(--iv-shadow)}
.ivp-card.lift{border-color:var(--iv-mint);box-shadow:0 24px 60px -30px rgba(14,159,110,.45),var(--iv-shadow)}
.ivp-ribbon{position:absolute;top:-13px;inset-inline-start:22px;height:26px;padding:0 12px;border-radius:999px;background:var(--iv-mint);color:#fff;font-size:12px;font-weight:800;letter-spacing:.04em;display:inline-flex;align-items:center;white-space:nowrap}
[data-theme='dark'] .ivp-ribbon{color:#0c3a28}
.ivp-top h3{font-size:22px}
.ivp-value{font-size:14px;min-height:2.9em}
.ivp-badge{display:flex;justify-content:center;padding-block:4px}
.ivp-price{display:flex;align-items:baseline;gap:4px;min-height:44px}
.ivp-price b{font-family:var(--iv-display);font-size:38px;line-height:1;letter-spacing:-.03em;color:var(--iv-ink)}
.ivp-price span{font-size:15px;color:var(--iv-ink-3);font-weight:600}
.ivp-skel{display:inline-block;width:92px;height:34px;border-radius:9px;background:linear-gradient(90deg,var(--iv-paper-3),var(--iv-line),var(--iv-paper-3));background-size:200% 100%;animation:ivp-sh 1.2s linear infinite}
@keyframes ivp-sh{to{background-position:-200% 0}}
.ivp-cycle{font-size:13px;color:var(--iv-ink-3);min-height:1.4em}
.ivp-cycle s{opacity:.7}
.ivp-lines{list-style:none;margin:4px 0 6px;padding:0;display:flex;flex-direction:column;gap:8px;flex:1 0 auto}
.ivp-lines li{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--iv-ink);line-height:1.4}
.ivp-lines li svg{flex:0 0 auto;margin-top:3px;color:var(--iv-mint-ink)}
.ivp-card .iv-btn{width:100%;margin-top:auto}
.ivp-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--iv-ink-3)}
.ivp-grid.compact .ivp-card{padding:20px 18px;gap:8px}
.ivp-grid.compact .ivp-value{display:none}
.ivp-grid.compact .ivp-price b{font-size:30px}
@media (prefers-reduced-motion:reduce){.ivp-skel{animation:none}}
@media (max-width:1040px){.ivp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.ivp-grid{grid-template-columns:1fr}}
`
