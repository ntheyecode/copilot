// LinkNotes: PRICING. Hero, the monthly/annual toggle (annual only when the
// API says annualReady, the same rule as the product), the four plan cards,
// what every plan includes, what grows with the plan, good to know, the final
// CTA. Numbers come from the live model; the labelled list-price fallback
// shows only when the API cannot be reached. ?plan=<id> (from the live widget)
// ribbons that plan "Recommended for you" and scrolls to it. Strings:
// indiv.pricing.* plus the shared pricing.* lines the cards reuse.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Clock3, BrainCircuit, Sparkles, Info, RefreshCw } from 'lucide-react'
import IndivShell, { SectionHead } from '../IndivShell.jsx'
import FinalBand from '../FinalBand.jsx'
import PlanCards from '../PlanCards.jsx'
import { usePricing } from '../usePricing.js'
import { START } from '../links.js'
import { PLAN_IDS } from '../../../pricingModel.js'
import useSeo from '../../../useSeo.js'
import { indivSeo } from '../seo_pages.js'   // the one SEO table the prerender reads too
import { useT } from '../../../i18n/index.jsx'

const TIER_ICONS = [Clock3, BrainCircuit, Sparkles]

export default function Pricing() {
  const t = useT()
  useSeo(indivSeo(t, 'pricing'))
  const { model, loading, fallback, reload } = usePricing()
  const [sp] = useSearchParams()
  const recId = (sp.get('plan') || '').toLowerCase()
  const rec = PLAN_IDS.includes(recId) ? recId : ''
  const [cycle, setCycle] = useState(sp.get('cycle') === 'annual' ? 'annual' : 'monthly')
  const annualReady = !!(model && model.annualReady)
  const annual = cycle === 'annual' && annualReady
  useEffect(() => {
    if (!rec) return undefined
    const go = () => { try { const el = document.getElementById(`lnp-${rec}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* ignore */ } }
    const id = setTimeout(go, 400)
    return () => clearTimeout(id)
  }, [rec])
  const tiers = t('indiv.pricing.tiers') || []
  return (
    <IndivShell current="pricing" revealKey={loading}>
      <style>{CSS}</style>
      <section className="ln-sec grid lnpr-hero" aria-labelledby="lnpr-h1">
        <div className="ln-wrap lnpr-hero-in">
          <div className="ln-eyebrow">{t('indiv.pricing.hero.eyebrow')}</div>
          <h1 id="lnpr-h1">{t.rich('indiv.pricing.hero.h1')}</h1>
          <p className="lnpr-lead">{t('indiv.pricing.hero.p')}</p>
          {annualReady && (
            <div className="lnpr-toggle" role="tablist" aria-label={t('indiv.pricing.toggle.aria')}>
              <button type="button" role="tab" aria-selected={cycle === 'monthly'} className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>{t('indiv.pricing.toggle.monthly')}</button>
              <button type="button" role="tab" aria-selected={cycle === 'annual'} className={cycle === 'annual' ? 'on' : ''} onClick={() => setCycle('annual')}>{t('indiv.pricing.toggle.annual')} <i>{t('indiv.pricing.toggle.save')}</i></button>
            </div>
          )}
          {fallback && <p className="lnpr-fallback" role="status"><Info size={14} aria-hidden /> {t('pricing.listPrices')} <button type="button" className="lnpr-retry" onClick={reload}><RefreshCw size={13} aria-hidden /> {t('pricing.retry')}</button></p>}
        </div>
      </section>

      <section className="ln-wrap lnpr-plans" aria-label={t('pricing.plansAria')}>
        <PlanCards model={model} loading={loading} annual={annual} recommended={rec} />
        <p className="lnpr-fine">{t('indiv.pricing.fine')} <a href="/workcopilot/refund">{t('indiv.pricing.refund')}</a></p>
      </section>

      <section className="ln-sec tint" aria-labelledby="lnpr-incl">
        <div className="ln-wrap ln-band">
          <div data-reveal>
            <h2 id="lnpr-incl">{t.rich('indiv.pricing.includedH2')}</h2>
            <ul className="ln-checks lnpr-incl">{(t('indiv.pricing.included') || []).map((s) => <li key={s}><span className="ln-tick"><Check size={13} aria-hidden /></span> {s}</li>)}</ul>
          </div>
          <div className="ln-band-visual">
            <h3 className="lnpr-tiers-h">{t('indiv.pricing.tiersH2')}</h3>
            <div className="lnpr-tiers">
              {tiers.map((x, i) => { const Ic = TIER_ICONS[i] || Check; return (
                <div className="ln-card lnpr-tier" key={x.t} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className={'ln-ic ' + (i === 1 ? 'ink' : i === 2 ? 'lime' : '')}><Ic size={18} aria-hidden /></span>
                  <div><h3>{x.t}</h3><p>{x.d}</p></div>
                </div>
              ) })}
            </div>
          </div>
        </div>
      </section>

      <section className="ln-sec" aria-labelledby="lnpr-notes">
        <div className="ln-wrap">
          <SectionHead t={t} id="lnpr-notes" h2="indiv.pricing.notesH2" />
          <div className="ln-grid c4">
            {(t('indiv.pricing.notes') || []).map((n, i) => <article className="ln-card" key={n.t} data-reveal style={{ transitionDelay: `${i * 40}ms` }}><span className="ln-num">{String(i + 1).padStart(2, '0')}</span><h3>{n.t}</h3><p>{n.d}</p></article>)}
          </div>
        </div>
      </section>

      <FinalBand t={t} id="lnpr-final" h2="indiv.pricing.cta.h2" p="indiv.pricing.cta.p" primary="indiv.common.choosePlan" primaryHref={START + '#lnp-advanced'} />
    </IndivShell>
  )
}

const CSS = `
.lnpr-hero{padding-block:56px 40px}
.lnpr-hero-in{text-align:center;display:flex;flex-direction:column;align-items:center}
.lnpr-hero .ln-eyebrow{justify-content:center}
.lnpr-lead{font-size:18px;margin:18px auto 0;max-width:56ch}
.lnpr-toggle{display:inline-flex;margin-top:28px;padding:4px;border-radius:999px;background:#fff;border:1.5px solid var(--ln-ink)}
.lnpr-toggle button{border:0;background:transparent;color:var(--ln-ink-2);font:inherit;font-weight:700;font-size:14px;height:38px;padding:0 18px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.lnpr-toggle button.on{background:var(--ln-ink);color:#fff}
.lnpr-toggle i{font-style:normal;font-family:var(--ln-mono);font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--ln-lime);color:var(--ln-ink)}
.lnpr-fallback{margin-top:18px;display:inline-flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ln-amber-ink);padding:8px 14px;border-radius:999px;background:var(--ln-amber-soft);border:1.5px solid var(--ln-amber)}
.lnpr-retry{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--ln-ink);font:inherit;font-weight:700;cursor:pointer;text-decoration:underline}
.lnpr-plans{padding-block:28px 64px}
.lnpr-fine{margin-top:34px;text-align:center;font-size:13px;color:var(--ln-ink-3)}
.lnpr-fine a{text-decoration:underline;color:var(--ln-ink-2)}
.lnpr-incl{margin-top:24px}
.lnpr-incl li{font-size:16.5px}
.ln .lnpr-tiers-h{font-family:var(--ln-mono);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ln-ink-3);margin-bottom:12px}
.lnpr-tiers{display:flex;flex-direction:column;gap:12px}
.lnpr-tier{display:flex;gap:14px;align-items:flex-start;padding:18px}
.lnpr-tier h3{margin-top:0;font-size:16.5px}
.lnpr-tier p{margin-top:4px}
@media (max-width:640px){.lnpr-hero{padding-block:36px 28px}.lnpr-toggle{width:100%}.lnpr-toggle button{flex:1 1 auto;justify-content:center;padding:0 10px}}
`
