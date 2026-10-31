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
// Each plan sits on its own soft tint (the reference's pricing rhythm).
const TINT = { lite: 't-sage', basic: 't-sky', advanced: 't-lav', premium: 't-peach' }

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
          <article key={id} id={`lnp-${id}`} className={'lnp-card ' + TINT[id] + (isPop || isRec ? ' lift' : '')} data-reveal aria-label={PLAN_NAME[id]}>
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
                {meta.highlight && <li><span className="ln-tick"><Check size={13} aria-hidden /></span> {meta.highlight}</li>}
                {model && <li><span className="ln-tick"><Check size={13} aria-hidden /></span> {planExpiryLine(model, t)}</li>}
                {model && model.hour[id] != null && <li><span className="ln-tick"><Check size={13} aria-hidden /></span> {t('pricing.extraHour', { price: money(model.hour[id]) })}</li>}
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

// Each card on its soft tint, the highlighted plan with a violet ring and the
// white, slightly tilted "Most chosen" pill; violet circled ticks on the lines.
const CSS = `
.lnp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;align-items:stretch}
/* the badge reads the site tokens (its own rule sets defaults on .hbg itself, so this must target .hbg) */
.lnp-grid .hbg{--hbg-a:var(--ln-violet);--hbg-b:var(--ln-violet-2);--hbg-ink:var(--ln-ink);--hbg-mut:var(--ln-ink-2);--hbg-track:rgba(255,255,255,.9);--hbg-disc:#fff}
.lnp-card{position:relative;display:flex;flex-direction:column;gap:12px;background:var(--ln-bg-2);border:1px solid transparent;border-radius:var(--ln-r);padding:28px 24px;transition:transform .2s,box-shadow .2s}
.lnp-card.t-sage{background:var(--ln-sage)}
.lnp-card.t-sky{background:var(--ln-sky)}
.lnp-card.t-lav{background:var(--ln-lav)}
.lnp-card.t-peach{background:var(--ln-peach)}
.lnp-card:hover{transform:translateY(-4px);box-shadow:var(--ln-shadow-2)}
.lnp-card.lift{box-shadow:0 0 0 2px var(--ln-violet),0 16px 40px -14px rgba(91,61,245,.45)}
.lnp-ribbon{position:absolute;top:-15px;inset-inline-end:18px;height:30px;padding:0 14px;border-radius:999px;background:#fff;color:var(--ln-violet-ink);font-family:var(--ln-display);font-size:13px;font-weight:700;display:inline-flex;align-items:center;white-space:nowrap;max-width:calc(100% - 36px);overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 20px -6px rgba(20,18,43,.3);transform:rotate(-3deg)}
[dir="rtl"] .lnp-ribbon{transform:rotate(3deg)}
.lnp-top h3{font-size:26px;letter-spacing:-.02em}
.lnp-value{font-size:14.5px;min-height:2.9em}
.lnp-badge{display:flex;justify-content:center;padding-block:4px}
.lnp-price{display:flex;align-items:baseline;gap:4px;min-height:46px}
.lnp-price b{font-family:var(--ln-display);font-size:42px;line-height:1;letter-spacing:-.03em;color:var(--ln-ink);font-weight:800}
.lnp-price span{font-size:15px;color:var(--ln-ink-3);font-weight:600}
.lnp-skel{display:inline-block;width:92px;height:34px;border-radius:9px;background:linear-gradient(90deg,rgba(255,255,255,.5),#fff,rgba(255,255,255,.5));background-size:200% 100%;animation:lnp-sh 1.2s linear infinite}
@keyframes lnp-sh{to{background-position:-200% 0}}
.lnp-cycle{font-size:13px;color:var(--ln-ink-3);min-height:1.4em}
.lnp-cycle s{opacity:.7}
.lnp-lines{list-style:none;margin:6px 0 8px;padding:0;display:flex;flex-direction:column;gap:10px;flex:1 0 auto}
.lnp-lines li{display:flex;gap:9px;align-items:flex-start;font-size:14.5px;color:var(--ln-ink);line-height:1.45}
.lnp-lines li .ln-tick{width:22px;height:22px;margin-top:0}
.lnp-card .ln-btn{width:100%;margin-top:auto}
.lnp-card .ln-btn.ghost{background:#fff;border-color:#fff}
.lnp-card .ln-btn.ghost:hover{border-color:var(--ln-violet)}
.lnp-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;color:var(--ln-ink-3)}
.lnp-grid.compact .lnp-card{padding:22px 20px;gap:8px}
.lnp-grid.compact .lnp-value{display:none}
.lnp-grid.compact .lnp-price b{font-size:34px}
@media (prefers-reduced-motion:reduce){.lnp-skel{animation:none}.lnp-card{transition:none}.lnp-card:hover{transform:none}}
@media (max-width:1040px){.lnp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.lnp-grid{grid-template-columns:1fr}}
`
