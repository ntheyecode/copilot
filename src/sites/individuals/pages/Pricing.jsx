// Individuals site: PRICING. Hero, the monthly/annual toggle (annual only when
// the API says annualReady, the same rule as the product), the four plan
// cards, what every plan includes, what grows with the plan, good to know, the
// final CTA. Numbers come from the live model; the labelled list-price
// fallback shows only when the API cannot be reached. ?plan=<id> (from the
// live check) ribbons that plan "Recommended for you" and scrolls to it.
// Strings: indiv.pricing.* plus the shared pricing.* lines the cards reuse.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Clock3, FileText, Sparkles, Info, RefreshCw } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import PlanCards from '../PlanCards.jsx'
import { usePricing } from '../usePricing.js'
import { START } from '../IndivHeader.jsx'
import { PLAN_IDS } from '../../../pricingModel.js'
import useSeo from '../../../useSeo.js'
import { useT } from '../../../i18n/index.jsx'

const TIER_ICONS = [Clock3, FileText, Sparkles]

export default function Pricing() {
  const t = useT()
  useSeo({ title: t('indiv.pricing.seo.title'), description: t('indiv.pricing.seo.description'), path: '/workcopilot/pricing' })
  const { model, loading, fallback, reload } = usePricing()
  const [sp] = useSearchParams()
  const recId = (sp.get('plan') || '').toLowerCase()
  const rec = PLAN_IDS.includes(recId) ? recId : ''
  const [cycle, setCycle] = useState(sp.get('cycle') === 'annual' ? 'annual' : 'monthly')
  const annualReady = !!(model && model.annualReady)
  const annual = cycle === 'annual' && annualReady
  useEffect(() => {
    if (!rec) return undefined
    const go = () => { try { const el = document.getElementById(`ivp-${rec}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* ignore */ } }
    const id = setTimeout(go, 400)
    return () => clearTimeout(id)
  }, [rec])
  const tiers = t('indiv.pricing.tiers') || []
  return (
    <IndivShell current="pricing" revealKey={loading}>
      <style>{CSS}</style>
      <section className="iv-wrap ivpr-hero" aria-labelledby="ivpr-h1">
        <div className="iv-eyebrow">{t('indiv.pricing.hero.eyebrow')}</div>
        <h1 id="ivpr-h1">{t.rich('indiv.pricing.hero.h1')}</h1>
        <p className="ivpr-lead">{t('indiv.pricing.hero.p')}</p>
        {annualReady && (
          <div className="ivpr-toggle" role="tablist" aria-label={t('indiv.pricing.toggle.aria')}>
            <button type="button" role="tab" aria-selected={cycle === 'monthly'} className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>{t('indiv.pricing.toggle.monthly')}</button>
            <button type="button" role="tab" aria-selected={cycle === 'annual'} className={cycle === 'annual' ? 'on' : ''} onClick={() => setCycle('annual')}>{t('indiv.pricing.toggle.annual')} <i>{t('indiv.pricing.toggle.save')}</i></button>
          </div>
        )}
        {fallback && <p className="ivpr-fallback" role="status"><Info size={14} aria-hidden /> {t('pricing.listPrices')} <button type="button" className="ivpr-retry" onClick={reload}><RefreshCw size={13} aria-hidden /> {t('pricing.retry')}</button></p>}
      </section>

      <section className="iv-wrap ivpr-plans" aria-label={t('pricing.plansAria')}>
        <PlanCards model={model} loading={loading} annual={annual} recommended={rec} />
        <p className="ivpr-fine">{t('indiv.pricing.fine')} <a href="/workcopilot/refund">{t('indiv.pricing.refund')}</a></p>
      </section>

      <section className="iv-sec alt" aria-labelledby="ivpr-incl">
        <div className="iv-wrap iv-band">
          <div data-reveal>
            <h2 id="ivpr-incl">{t.rich('indiv.pricing.includedH2')}</h2>
            <ul className="iv-checks ivpr-incl">{(t('indiv.pricing.included') || []).map((s) => <li key={s}><Check size={17} aria-hidden /> {s}</li>)}</ul>
          </div>
          <div className="iv-band-visual">
            <div className="ivpr-tiers">
              {tiers.map((x, i) => { const Ic = TIER_ICONS[i] || Check; return (
                <div className="iv-card flat ivpr-tier" key={x.t} data-reveal>
                  <span className="iv-ic"><Ic size={18} aria-hidden /></span>
                  <div><h3>{x.t}</h3><p>{x.d}</p></div>
                </div>
              ) })}
            </div>
          </div>
        </div>
      </section>

      <section className="iv-sec" aria-labelledby="ivpr-notes">
        <div className="iv-wrap">
          <SectionHead t={t} id="ivpr-notes" h2="indiv.pricing.notesH2" />
          <div className="iv-grid c4">
            {(t('indiv.pricing.notes') || []).map((n) => <article className="iv-card flat" key={n.t} data-reveal><h3>{n.t}</h3><p>{n.d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="iv-sec tight"><div className="iv-wrap"><div className="iv-final" data-reveal>
        <h2>{t.rich('indiv.pricing.cta.h2')}</h2><p>{t('indiv.pricing.cta.p')}</p>
        <div className="iv-ctas"><a className="iv-btn primary" href={START + '#ivp-advanced'}>{t('indiv.common.choosePlan')} <ArrowRight size={16} aria-hidden className="iv-arrow" /></a></div>
      </div></div></section>
    </IndivShell>
  )
}

const CSS = `
.ivpr-hero{padding-block:56px 34px;text-align:center;display:flex;flex-direction:column;align-items:center}
.ivpr-hero .iv-eyebrow{justify-content:center}
.ivpr-lead{font-size:17.5px;margin:16px auto 0;max-width:56ch}
.ivpr-toggle{display:inline-flex;margin-top:26px;padding:4px;border-radius:999px;background:var(--iv-paper-2);border:1px solid var(--iv-line-2)}
.ivpr-toggle button{border:0;background:transparent;color:var(--iv-ink-2);font:inherit;font-weight:700;font-size:14px;height:38px;padding:0 18px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.ivpr-toggle button.on{background:var(--iv-ink);color:var(--iv-paper)}
.ivpr-toggle i{font-style:normal;font-size:11.5px;font-weight:800;padding:2px 7px;border-radius:999px;background:var(--iv-mint-soft);color:var(--iv-mint-ink)}
.ivpr-toggle button.on i{background:rgba(255,255,255,.15);color:inherit}
.ivpr-fallback{margin-top:18px;display:inline-flex;align-items:center;gap:8px;font-size:13.5px;color:var(--iv-ink-2);padding:8px 14px;border-radius:999px;background:var(--iv-sun)}
.ivpr-retry{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--iv-ink);font:inherit;font-weight:700;cursor:pointer;text-decoration:underline}
.ivpr-plans{padding-block:24px 56px}
.ivpr-fine{margin-top:22px;text-align:center;font-size:13px;color:var(--iv-ink-3)}
.ivpr-fine a{text-decoration:underline;color:var(--iv-ink-2)}
.ivpr-incl{margin-top:22px}
.ivpr-incl li{font-size:16.5px}
.ivpr-tiers{display:flex;flex-direction:column;gap:12px}
.ivpr-tier{display:flex;gap:14px;align-items:flex-start;padding:18px}
.ivpr-tier h3{margin-top:0;font-size:16.5px}
.ivpr-tier p{margin-top:4px}
@media (max-width:640px){.ivpr-hero{padding-block:40px 24px}.ivpr-toggle{width:100%}.ivpr-toggle button{flex:1 1 auto;justify-content:center;padding:0 10px}}
`
