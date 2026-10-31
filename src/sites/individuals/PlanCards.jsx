// The four plan cards (Lite to Premium) for the LinkNotes site, used by the
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
    <div className={'lnp-grid' + (compact ? ' compact' : '')}>
      <style>{HOURS_BADGE_CSS}{CSS}</style>
      {PLAN_IDS.map((id) => {
        const price = loading || !model ? null : model.plans[id]
        const h = loading || !model ? null : model.hoursMonthly[id]
        const meta = t(`pricing.plans.${id}`) || {}
        const isRec = recommended === id
        const isPop = !recommended && id === POPULAR
        return (
          <article key={id} id={`lnp-${id}`} className={'lnp-card' + (isPop || isRec ? ' lift' : '')} data-reveal aria-label={PLAN_NAME[id]}>
            {(isPop || isRec) && <span className="lnp-ribbon">{isRec ? t('indiv.pricing.recommended') : t('indiv.pricing.popular')}</span>}
            <div className="lnp-top">
              <h3>{PLAN_NAME[id]}</h3>
              <p className="lnp-value">{meta.value}</p>
            </div>
            <div className="lnp-badge">
              <HoursBadge size={compact ? 'sm' : 'md'} hours={h == null ? null : hours(h)} share={loading ? null : planHoursShare(model, id)} unit={t('pricing.badgeUnit')} sub={t('indiv.pricing.hoursSub')} loadingLabel={t('pricing.loading')} />
            </div>
            <div className={'lnp-price' + (loading ? ' skel' : '')} aria-busy={loading || undefined}>
              {loading || price == null ? <span className="lnp-skel" aria-label={t('pricing.loading')} /> : <><b>{money(rate(price))}</b><span>{t('indiv.common.perMonth')}</span></>}
            </div>
            <div className="lnp-cycle">
              {annual && price != null && !loading
                ? <><s>{money(price)}{t('indiv.common.perMonth')}</s> {t('home.pricing.billedAnnually')} &middot; {money(annualTotal(price))}{t('common.perYear')}</>
                : t('pricing.billedMonthly')}
            </div>
            {!compact && (
              <ul className="lnp-lines">
                {meta.highlight && <li><Check size={15} aria-hidden /> {meta.highlight}</li>}
                {model && <li><Check size={15} aria-hidden /> {planExpiryLine(model, t)}</li>}
                {model && model.hour[id] != null && <li><Check size={15} aria-hidden /> {t('pricing.extraHour', { price: money(model.hour[id]) })}</li>}
              </ul>
            )}
            <a className={'ln-btn ' + (isPop || isRec ? 'primary' : 'ghost')} href={startHref(id, annual)}>{t('indiv.common.start', { plan: PLAN_NAME[id] })} <ArrowRight size={15} aria-hidden className="ln-arrow" /></a>
            {!compact && <div className="lnp-secure"><Lock size={12} aria-hidden /> {t('indiv.pricing.secure')}</div>}
          </article>
        )
      })}
    </div>
  )
}

const CSS = `
.lnp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;align-items:stretch}
/* the badge reads the site tokens (its own rule sets defaults on .hbg itself, so this must target .hbg) */
.lnp-grid .hbg{--hbg-a:var(--ln-violet);--hbg-b:var(--ln-violet-2);--hbg-ink:var(--ln-ink);--hbg-mut:var(--ln-ink-2);--hbg-track:var(--ln-line);--hbg-disc:#fff}
.lnp-card{position:relative;display:flex;flex-direction:column;gap:12px;background:#fff;border:1.5px solid var(--ln-line-2);border-radius:var(--ln-r);padding:26px 22px}
.lnp-card.lift{border-color:var(--ln-ink);box-shadow:8px 8px 0 var(--ln-lime)}
.lnp-ribbon{position:absolute;top:-14px;inset-inline-start:20px;height:28px;padding:0 12px;border-radius:999px;background:var(--ln-ink);color:var(--ln-lime);font-family:var(--ln-mono);font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;display:inline-flex;align-items:center;white-space:nowrap;max-width:calc(100% - 40px);overflow:hidden;text-overflow:ellipsis}
.lnp-top h3{font-size:24px;letter-spacing:-.03em}
.lnp-value{font-size:14px;min-height:2.9em}
.lnp-badge{display:flex;justify-content:center;padding-block:4px}
.lnp-price{display:flex;align-items:baseline;gap:4px;min-height:46px}
.lnp-price b{font-family:var(--ln-display);font-size:40px;line-height:1;letter-spacing:-.045em;color:var(--ln-ink);font-weight:800}
.lnp-price span{font-size:15px;color:var(--ln-ink-3);font-weight:600}
.lnp-skel{display:inline-block;width:92px;height:34px;border-radius:9px;background:linear-gradient(90deg,var(--ln-bg-3),var(--ln-line),var(--ln-bg-3));background-size:200% 100%;animation:lnp-sh 1.2s linear infinite}
@keyframes lnp-sh{to{background-position:-200% 0}}
.lnp-cycle{font-size:13px;color:var(--ln-ink-3);min-height:1.4em}
.lnp-cycle s{opacity:.7}
.lnp-lines{list-style:none;margin:4px 0 6px;padding:0;display:flex;flex-direction:column;gap:9px;flex:1 0 auto}
.lnp-lines li{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--ln-ink);line-height:1.4}
.lnp-lines li svg{flex:0 0 auto;margin-top:3px;color:var(--ln-violet)}
.lnp-card .ln-btn{width:100%;margin-top:auto}
.lnp-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--ln-ink-3)}
.lnp-grid.compact .lnp-card{padding:20px 18px;gap:8px}
.lnp-grid.compact .lnp-value{display:none}
.lnp-grid.compact .lnp-price b{font-size:32px}
@media (prefers-reduced-motion:reduce){.lnp-skel{animation:none}}
@media (max-width:1040px){.lnp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.lnp-grid{grid-template-columns:1fr}}
`
